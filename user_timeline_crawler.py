# user_timeline_crawler.py
"""Crawler timeline utenti: scarica i post recenti degli account già noti per
densificare la rete di diffusione.

Valore chiave: la timeline utente (/api/v1/accounts/:id/statuses) include i
BOOST fatti dall'utente — la direzione di amplificazione che la raccolta per
hashtag non vede. Filtro: si salvano i reblog (sempre: portano archi) e i post
originali con hashtag già noti (topic_hashtags) e lingua ammessa.

Uso:
    python user_timeline_crawler.py              # account connessi, 2 pagine
    python user_timeline_crawler.py --pages 3    # più storia per account
    python user_timeline_crawler.py --all        # anche account isolati

Riprendibile: processa solo account con timeline_crawled_at IS NULL."""
import logging
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import requests

from credentials import get_optional_token
from http_client import rate_limited_get
from post_collector import ALLOWED_LANGUAGES
from progress import ProgressTracker
from storage import (
    get_connection,
    init_schema,
    known_hashtags,
    list_accounts_to_crawl,
    mark_timeline_crawled,
    upsert_status,
)

logger = logging.getLogger(__name__)

MAX_CONSECUTIVE_ERRORS = 5


def keep_status(status: dict, hashtag_set: set[str]) -> bool:
    """Un post di timeline si tiene se è un reblog (arco di diffusione) oppure
    se è on-topic (hashtag già noto) e in lingua ammessa."""
    if status.get("reblog"):
        return True
    if status.get("language") not in ALLOWED_LANGUAGES:
        return False
    return any(tag["name"].lower() in hashtag_set for tag in status.get("tags", []))


def crawl_account(
    conn, domain: str, token: str | None, account_id: int, mastodon_id: str,
    hashtag_set: set[str], max_pages: int, instance_id: int,
) -> int:
    """Scarica e filtra la timeline di un account. Ritorna i post salvati.
    Un 404 (account cancellato/spostato) marca comunque l'account."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    url = f"https://{domain}/api/v1/accounts/{mastodon_id}/statuses"

    saved = 0
    max_id = None
    try:
        for _ in range(max_pages):
            params: dict = {"limit": 40}
            if max_id:
                params["max_id"] = max_id
            response = rate_limited_get(url, headers=headers, params=params)
            statuses = response.json()
            if not statuses:
                break
            for status in statuses:
                if keep_status(status, hashtag_set):
                    upsert_status(conn, instance_id, status, source="user_timeline")
                    saved += 1
            max_id = statuses[-1]["id"]
    except requests.exceptions.HTTPError as exc:
        if getattr(exc.response, "status_code", None) != 404:
            raise
        logger.info("Account %s su %s non trovato (404), marco e proseguo", mastodon_id, domain)

    mark_timeline_crawled(conn, account_id)
    return saved


def _process_domain(
    database_url: str, domain: str, rows: list[tuple], hashtag_set: set[str],
    max_pages: int, tracker: ProgressTracker | None = None,
) -> None:
    """Worker per istanza: connessione propria, circuit breaker, errori non bloccanti."""
    conn = get_connection(database_url)
    token = get_optional_token(domain)

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM instances WHERE domain = %s", (domain,))
        instance_id = cur.fetchone()[0]

    done = saved = consecutive_errors = 0
    try:
        for account_id, mastodon_id, _ in rows:
            try:
                saved += crawl_account(
                    conn, domain, token, account_id, mastodon_id,
                    hashtag_set, max_pages, instance_id,
                )
                done += 1
                consecutive_errors = 0
            except requests.exceptions.RequestException as exc:
                consecutive_errors += 1
                logger.warning("Account %s su %s: errore, salto: %s", mastodon_id, domain, exc)
                if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                    logger.warning(
                        "Istanza %s: %d errori consecutivi, abbandono per questo run",
                        domain, consecutive_errors,
                    )
                    break
            finally:
                if tracker:
                    tracker.advance(domain)
        if tracker:
            remaining = len(rows) - done - consecutive_errors
            if remaining > 0:
                tracker.advance(domain, remaining)
        logger.info("Istanza %s: %d/%d account, %d post salvati", domain, done, len(rows), saved)
    finally:
        conn.close()


def run_crawler(
    database_url: str, max_pages: int = 2, include_isolated: bool = False,
    max_workers: int = 24,
) -> None:
    conn = get_connection(database_url)
    init_schema(conn)
    hashtag_set = known_hashtags(conn)
    rows = list_accounts_to_crawl(conn, include_isolated=include_isolated)
    conn.close()

    by_domain: dict[str, list[tuple]] = defaultdict(list)
    for row in rows:
        by_domain[row[2]].append(row)

    logger.info(
        "Da scaricare: %d account su %d istanze (%d hashtag di filtro)",
        len(rows), len(by_domain), len(hashtag_set),
    )

    tracker = ProgressTracker()
    for domain, domain_rows in by_domain.items():
        tracker.register(domain, len(domain_rows))
    tracker.start()

    try:
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = [
                pool.submit(_process_domain, database_url, domain, domain_rows,
                            hashtag_set, max_pages, tracker)
                for domain, domain_rows in by_domain.items()
            ]
            for future in futures:
                future.result()
    finally:
        tracker.stop()


if __name__ == "__main__":
    import argparse
    import os

    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages", type=int, default=2)
    parser.add_argument("--all", action="store_true", help="anche account isolati")
    args = parser.parse_args()
    run_crawler(os.environ["DATABASE_URL"], max_pages=args.pages, include_isolated=args.all)

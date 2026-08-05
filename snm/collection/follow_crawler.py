# follow_crawler.py
"""Crawler relazioni follow: scarica followers/following degli account già in
db per densificare il grafo con la rete sociale (oltre alla rete di diffusione
boost/reply/mention già raccolta). Pipeline separata, non collegata a
pipeline.py né a interaction_enrichment.py.

Ogni follower/following scoperto viene inserito come nuovo account (crescita
del corpus accettata): l'arco viene salvato comunque, anche se l'account
associato non è mai stato raccolto per tema/hashtag.

Uso: python -m snm.collection.follow_crawler   (legge DATABASE_URL da .env)
Riprendibile: processa solo account con followers_crawled_at o
following_crawled_at NULL; un nuovo account scoperto riparte da NULL, quindi
un rilancio futuro dello script lo processa a sua volta (nessuna ricorsione
automatica dentro una singola run)."""
import logging
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv

from snm.config import get_optional_token
from snm.collection.http_client import rate_limited_get
from snm.collection.progress import ProgressTracker
from snm.storage.db import (
    get_connection,
    get_or_create_instance_id,
    init_schema,
    insert_follow,
    list_accounts_for_follow_crawl,
    mark_followers_crawled,
    mark_following_crawled,
    upsert_account,
)

load_dotenv()

logger = logging.getLogger(__name__)

MAX_CONSECUTIVE_ERRORS = 5

# Status tollerati: 404/410 = account cancellato/spostato, 401/403 = istanza in
# modalità sicura (DISALLOW_UNAUTHENTICATED_API_ACCESS) senza token nostro.
TOLERATED_STATUSES = {401, 403, 404, 410}

DEFAULT_MAX_PAGES = 50


def _crawl_direction(
    conn, domain: str, token: str | None, account_id: int, mastodon_id: str, direction: str,
    max_pages: int = DEFAULT_MAX_PAGES,
) -> int:
    """Pagina /api/v1/accounts/:id/followers o /following (header Link:
    rel="next"), fino a max_pages pagine o alla prima pagina vuota. Ogni
    account scoperto viene upsertato sotto l'istanza INTERROGATA (domain) —
    l'id Mastodon in questa risposta è locale a quell'istanza, non a quella
    remota nell'acct dell'account scoperto. Un 401/403/404/410 (accesso
    negato o account cancellato/spostato) chiude silenziosamente la
    paginazione. Il link 'next' viene seguito solo se punta allo stesso host
    interrogato, per non rispedire il token altrove."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    url = f"https://{domain}/api/v1/accounts/{mastodon_id}/{direction}"
    params: dict = {"limit": 80}
    saved = 0
    instance_id = get_or_create_instance_id(conn, domain)
    try:
        for _ in range(max_pages):
            response = rate_limited_get(url, headers=headers, params=params)
            accounts = response.json()
            if not accounts:
                break
            for account_json in accounts:
                disc_account_id = upsert_account(conn, instance_id, account_json)
                if direction == "followers":
                    insert_follow(conn, disc_account_id, account_id)
                else:
                    insert_follow(conn, account_id, disc_account_id)
                saved += 1
            next_link = response.links.get("next")
            if not next_link:
                break
            next_url = next_link["url"]
            if urlparse(next_url).netloc != domain:
                logger.warning(
                    "Account %s su %s: link 'next' punta a un host diverso (%s), fermo la paginazione",
                    mastodon_id, domain, next_url,
                )
                break
            url = next_url
            params = {}  # l'URL 'next' include già i query param
    except requests.exceptions.HTTPError as exc:
        status = getattr(exc.response, "status_code", None)
        if status not in TOLERATED_STATUSES:
            raise
        logger.info("Account %s su %s: %s non accessibile (%s), salto", mastodon_id, domain, direction, status)
    return saved


def crawl_account_relations(
    conn, domain: str, token: str | None, account_id: int, mastodon_id: str,
    need_followers: bool, need_following: bool, max_pages: int = DEFAULT_MAX_PAGES,
) -> int:
    """Scarica le direzioni mancanti per un account e marca il relativo
    progresso. Ritorna il numero di relazioni salvate."""
    saved = 0
    if need_followers:
        saved += _crawl_direction(conn, domain, token, account_id, mastodon_id, "followers", max_pages=max_pages)
        mark_followers_crawled(conn, account_id)
    if need_following:
        saved += _crawl_direction(conn, domain, token, account_id, mastodon_id, "following", max_pages=max_pages)
        mark_following_crawled(conn, account_id)
    return saved


def _process_domain(
    database_url: str, domain: str, rows: list[tuple], tracker: ProgressTracker | None = None,
    max_pages: int = DEFAULT_MAX_PAGES,
) -> None:
    """Worker per istanza: connessione propria, circuit breaker, errori non
    bloccanti. rows: (account_id, mastodon_id, domain, need_followers, need_following)."""
    conn = get_connection(database_url)
    token = get_optional_token(domain)

    done = saved = consecutive_errors = 0
    try:
        for account_id, mastodon_id, _, need_followers, need_following in rows:
            try:
                saved += crawl_account_relations(
                    conn, domain, token, account_id, mastodon_id, need_followers, need_following,
                    max_pages=max_pages,
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
        logger.info("Istanza %s: %d/%d account, %d relazioni salvate", domain, done, len(rows), saved)
    finally:
        conn.close()


def run_follow_crawl(
    database_url: str, max_workers: int = 24, max_pages: int = DEFAULT_MAX_PAGES,
    limit: int | None = None, before=None,
) -> None:
    """Raggruppa i target per istanza e li lavora in parallelo (rate limit
    Mastodon è per server: istanze diverse non si pestano)."""
    conn = get_connection(database_url)
    init_schema(conn)
    rows = list_accounts_for_follow_crawl(conn, limit=limit, before=before)
    conn.close()

    by_domain: dict[str, list[tuple]] = defaultdict(list)
    for row in rows:
        by_domain[row[2]].append(row)

    logger.info("Da scaricare: %d account su %d istanze", len(rows), len(by_domain))

    tracker = ProgressTracker()
    for domain, domain_rows in by_domain.items():
        tracker.register(domain, len(domain_rows))
    tracker.start()

    try:
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = [
                pool.submit(
                    _process_domain, database_url, domain, domain_rows,
                    tracker=tracker, max_pages=max_pages,
                )
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
    parser = argparse.ArgumentParser(description="Crawler relazioni follow/follower")
    parser.add_argument(
        "--max-pages", type=int, default=DEFAULT_MAX_PAGES,
        help=f"Numero massimo di pagine per direzione (default: {DEFAULT_MAX_PAGES})",
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Limita il numero di account processati in questa run (default: nessun limite)",
    )
    parser.add_argument(
        "--before", type=str, default=None,
        help=(
            "Data ISO (es. 2026-08-02): processa solo account scoperti PRIMA di "
            "questa data, escludendo i follower/following scoperti da run "
            "precedenti di questo stesso crawler (evita di allargare lo scope "
            "in un resume mirato al set di partenza)."
        ),
    )
    args = parser.parse_args()
    run_follow_crawl(
        os.environ["DATABASE_URL"], max_pages=args.max_pages, limit=args.limit, before=args.before,
    )

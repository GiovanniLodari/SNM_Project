# follow_crawler.py
"""Crawler relazioni follow: scarica followers/following degli account già in
db per densificare il grafo con la rete sociale (oltre alla rete di diffusione
boost/reply/mention già raccolta). Pipeline separata, non collegata a
pipeline.py né a interaction_enrichment.py.

Ogni follower/following scoperto viene inserito come nuovo account (crescita
del corpus accettata): l'arco viene salvato comunque, anche se l'account
associato non è mai stato raccolto per tema/hashtag.

Uso: python -m snm.collection.follow_crawler   (legge DATABASE_URL)
Riprendibile: processa solo account con followers_crawled_at o
following_crawled_at NULL; un nuovo account scoperto riparte da NULL, quindi
un rilancio futuro dello script lo processa a sua volta (nessuna ricorsione
automatica dentro una singola run)."""
import logging
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import requests

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

logger = logging.getLogger(__name__)

MAX_CONSECUTIVE_ERRORS = 5


def _account_domain(account_json: dict, queried_domain: str) -> str:
    """L'acct Mastodon è 'username' per account locali all'istanza
    interrogata, 'username@dominio' per account remoti."""
    acct = account_json["acct"]
    return acct.split("@", 1)[1] if "@" in acct else queried_domain


def _crawl_direction(
    conn, domain: str, token: str | None, account_id: int, mastodon_id: str, direction: str,
) -> int:
    """Pagina /api/v1/accounts/:id/followers o /following (header Link:
    rel="next"). Ogni account restituito viene upsertato (nuova istanza se
    serve) e l'arco follow salvato nella direzione corretta. Un 404 (account
    cancellato/spostato) chiude silenziosamente la paginazione."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    url = f"https://{domain}/api/v1/accounts/{mastodon_id}/{direction}"
    params: dict = {"limit": 80}
    saved = 0
    try:
        while url:
            response = rate_limited_get(url, headers=headers, params=params)
            for account_json in response.json():
                disc_domain = _account_domain(account_json, domain)
                disc_instance_id = get_or_create_instance_id(conn, disc_domain)
                disc_account_id = upsert_account(conn, disc_instance_id, account_json)
                if direction == "followers":
                    insert_follow(conn, disc_account_id, account_id)
                else:
                    insert_follow(conn, account_id, disc_account_id)
                saved += 1
            next_link = response.links.get("next")
            url = next_link["url"] if next_link else None
            params = {}  # l'URL 'next' include già i query param
    except requests.exceptions.HTTPError as exc:
        if getattr(exc.response, "status_code", None) != 404:
            raise
        logger.info("Account %s su %s: %s non trovato (404), salto", mastodon_id, domain, direction)
    return saved


def crawl_account_relations(
    conn, domain: str, token: str | None, account_id: int, mastodon_id: str,
    need_followers: bool, need_following: bool,
) -> int:
    """Scarica le direzioni mancanti per un account e marca il relativo
    progresso. Ritorna il numero di relazioni salvate."""
    saved = 0
    if need_followers:
        saved += _crawl_direction(conn, domain, token, account_id, mastodon_id, "followers")
        mark_followers_crawled(conn, account_id)
    if need_following:
        saved += _crawl_direction(conn, domain, token, account_id, mastodon_id, "following")
        mark_following_crawled(conn, account_id)
    return saved


def _process_domain(
    database_url: str, domain: str, rows: list[tuple], tracker: ProgressTracker | None = None,
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


def run_follow_crawl(database_url: str, max_workers: int = 24) -> None:
    """Raggruppa i target per istanza e li lavora in parallelo (rate limit
    Mastodon è per server: istanze diverse non si pestano)."""
    conn = get_connection(database_url)
    init_schema(conn)
    rows = list_accounts_for_follow_crawl(conn)
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
                pool.submit(_process_domain, database_url, domain, domain_rows, tracker)
                for domain, domain_rows in by_domain.items()
            ]
            for future in futures:
                future.result()
    finally:
        tracker.stop()


if __name__ == "__main__":
    import os

    logging.basicConfig(level=logging.INFO)
    run_follow_crawl(os.environ["DATABASE_URL"])

# interaction_enrichment.py
"""Arricchimento interazioni: per ogni post con boost/reply dichiarati recupera
chi ha boostato (/statuses/:id/reblogged_by -> tabella reblogs) e il thread di
risposte (/statuses/:id/context -> righe statuses con arco reply). Serve a
costruire la rete di diffusione per l'influence maximization.

Uso: python interaction_enrichment.py  (legge DATABASE_URL)
Riprendibile: processa solo i post con enriched_at IS NULL."""
import logging
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import requests

from credentials import get_optional_token
from http_client import rate_limited_get
from progress import ProgressTracker
from storage import (
    get_connection,
    init_schema,
    insert_reblog,
    list_statuses_to_enrich,
    mark_deleted,
    mark_enriched,
    upsert_account,
    upsert_status,
)

logger = logging.getLogger(__name__)


def enrich_status(conn, domain: str, token: str | None, row: tuple, refresh: bool = False) -> None:
    """Arricchisce un singolo post: boosters in reblogs, reply in statuses.
    Un 404 (post cancellato) marca comunque il post come processato.
    Con refresh=True ri-scarica prima il post per aggiornare raw e contatori
    (i contatori salvati sono stantii: servono quelli freschi per decidere
    quali endpoint chiamare — interazioni tardive su post vecchi)."""
    status_id, mastodon_id, instance_id, _, reblogs_count, replies_count = row
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    try:
        if refresh:
            response = rate_limited_get(
                f"https://{domain}/api/v1/statuses/{mastodon_id}",
                headers=headers,
                params={},
            )
            fresh = response.json()
            upsert_status(conn, instance_id, fresh)
            reblogs_count = int(fresh.get("reblogs_count") or 0)
            replies_count = int(fresh.get("replies_count") or 0)

        if reblogs_count > 0:
            # ponytail: una sola pagina limit=80 (massimo API); post con >80 boost
            # troncati — paginazione via header Link se servirà completezza.
            response = rate_limited_get(
                f"https://{domain}/api/v1/statuses/{mastodon_id}/reblogged_by",
                headers=headers,
                params={"limit": 80},
            )
            for account_json in response.json():
                booster_id = upsert_account(conn, instance_id, account_json)
                insert_reblog(conn, status_id, booster_id)

        if replies_count > 0:
            response = rate_limited_get(
                f"https://{domain}/api/v1/statuses/{mastodon_id}/context",
                headers=headers,
                params={},
            )
            context = response.json()
            # ancestors prima dei descendants: il thread a monte va inserito
            # per primo così gli archi in_reply_to_id si risolvono in ordine.
            for thread_json in context.get("ancestors", []) + context.get("descendants", []):
                upsert_status(conn, instance_id, thread_json)
    except requests.exceptions.HTTPError as exc:
        if getattr(exc.response, "status_code", None) != 404:
            raise
        logger.info("Post %s su %s cancellato (404), marco e proseguo", mastodon_id, domain)
        mark_deleted(conn, status_id)

    mark_enriched(conn, status_id)


MAX_CONSECUTIVE_ERRORS = 5


def _process_domain(
    database_url: str, domain: str, rows: list[tuple], refresh: bool = False,
    tracker: ProgressTracker | None = None,
) -> None:
    """Worker per istanza: connessione DB propria, errori per-post non bloccanti.
    Circuit breaker: dopo MAX_CONSECUTIVE_ERRORS errori di fila l'istanza è
    considerata giù e viene abbandonata per questo run — i post non marcati
    verranno ripresi dal run successivo."""
    conn = get_connection(database_url)
    token = get_optional_token(domain)
    done = 0
    consecutive_errors = 0
    try:
        for row in rows:
            try:
                enrich_status(conn, domain, token, row, refresh=refresh)
                done += 1
                consecutive_errors = 0
                if tracker:
                    tracker.advance(domain)
            except requests.exceptions.RequestException as exc:
                consecutive_errors += 1
                if tracker:
                    tracker.advance(domain)
                logger.warning("Post %s su %s: errore, salto: %s", row[1], domain, exc)
                if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                    logger.warning(
                        "Istanza %s: %d errori consecutivi, abbandono per questo run",
                        domain, consecutive_errors,
                    )
                    break
        if tracker:
            # dopo un abbandono (circuit breaker) i post restanti vanno comunque
            # contati come chiusi per questo run, o il progresso resta appeso
            remaining = len(rows) - done - consecutive_errors
            if remaining > 0:
                tracker.advance(domain, remaining)
        logger.info("Istanza %s: arricchiti %d/%d post", domain, done, len(rows))
    finally:
        conn.close()


def run_enrichment(
    database_url: str, max_workers: int = 24, refresh_older_than_days: int | None = None
) -> None:
    """Raggruppa i post target per istanza e li lavora in parallelo
    (rate limit Mastodon per server: istanze diverse non si pestano).
    Con refresh_older_than_days riprocessa anche i post arricchiti più di
    N giorni fa, ri-scaricandoli per avere contatori freschi."""
    refresh = refresh_older_than_days is not None
    conn = get_connection(database_url)
    init_schema(conn)
    rows = list_statuses_to_enrich(conn, refresh_older_than_days=refresh_older_than_days)
    conn.close()

    by_domain: dict[str, list[tuple]] = defaultdict(list)
    for row in rows:
        by_domain[row[3]].append(row)

    logger.info("Da arricchire: %d post su %d istanze (refresh=%s)", len(rows), len(by_domain), refresh)

    tracker = ProgressTracker()
    for domain, domain_rows in by_domain.items():
        tracker.register(domain, len(domain_rows))
    tracker.start()

    try:
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = [
                pool.submit(_process_domain, database_url, domain, domain_rows, refresh, tracker)
                for domain, domain_rows in by_domain.items()
            ]
            for future in futures:
                future.result()
    finally:
        tracker.stop()


if __name__ == "__main__":
    import os
    import sys

    logging.basicConfig(level=logging.INFO)
    days = None
    if "--refresh" in sys.argv:
        idx = sys.argv.index("--refresh")
        days = int(sys.argv[idx + 1]) if len(sys.argv) > idx + 1 else 0
    run_enrichment(os.environ["DATABASE_URL"], refresh_older_than_days=days)

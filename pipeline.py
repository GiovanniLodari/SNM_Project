import logging
import threading
from concurrent.futures import ThreadPoolExecutor

import requests

from credentials import check_tokens, get_optional_token
from hashtag_discovery import discover_hashtags
from instance_blacklist import load_blacklist
from instance_discovery import find_popular_instances
from instance_registration import register_on_instance
from post_collector import collect_posts
from progress import ProgressTracker
from storage import (
    get_connection,
    get_since_cursor,
    init_schema,
    record_collection_run,
    record_topic_hashtags,
    upsert_instance,
    upsert_status,
    upsert_topic,
)
from topics import load_topics

logger = logging.getLogger(__name__)

# Il rate limit Mastodon è per server: istanze diverse hanno quote indipendenti,
# quindi lavorarle in parallelo non aumenta il carico sul singolo server.
# Le scritture su .env e blacklist dai worker vanno però serializzate.
_registration_lock = threading.Lock()


def run_pipeline(
    topics_path: str,
    database_url: str,
    instance_limit: int = 5,
    max_pages: int = 10,
    max_hashtags: int = 20,
    max_workers: int = 24,
) -> None:
    """Orchestrazione end-to-end in due fasi. Discovery: per ogni topic, unione
    delle istanze popolari su tutte le query (alias) → lista job (topic, istanza).
    Dispatch: job raggruppati per dominio, un pool globale di max_workers thread,
    un worker per dominio che smaltisce in sequenza tutti i suoi topic — mai due
    richieste concorrenti alla stessa istanza (quota rate-limit per server),
    nessuna attesa tra topic. Raccolta incrementale: riparte dal cursore
    since_id dell'ultimo run per (istanza, hashtag). Senza token si accede in
    anonimo. Le istanze non raggiungibili non bloccano: si logga e si continua."""
    topics = load_topics(topics_path)
    conn = get_connection(database_url)
    init_schema(conn)

    jobs_by_domain: dict[str, list[tuple]] = {}
    for topic in topics:
        topic_id = upsert_topic(conn, topic.name)
        for instance in _union_instances(topic.queries, instance_limit):
            jobs_by_domain.setdefault(instance.domain, []).append((topic, topic_id, instance))
    conn.close()

    _, missing = check_tokens(list(jobs_by_domain))
    if missing:
        logger.info("Istanze senza token, accesso anonimo: %s", missing)

    tracker = ProgressTracker()
    for domain, jobs in jobs_by_domain.items():
        tracker.register(domain, len(jobs))
    tracker.start()

    try:
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = [
                pool.submit(
                    _process_domain_jobs, database_url, domain, jobs, max_pages, max_hashtags, tracker
                )
                for domain, jobs in jobs_by_domain.items()
            ]
            for future in futures:
                future.result()
    finally:
        tracker.stop()


def _process_domain_jobs(
    database_url: str, domain: str, jobs: list[tuple], max_pages: int, max_hashtags: int,
    tracker: ProgressTracker | None = None,
) -> None:
    """Worker per dominio: smaltisce in sequenza tutti i job (topic) della
    stessa istanza. Connessione DB propria (psycopg2 non condivisibile tra
    thread). Gli errori API non propagano: si logga, si tenta la registrazione
    se il blocco è auth, e si passa al job successivo."""
    conn = get_connection(database_url)
    token = get_optional_token(domain)
    try:
        for topic, topic_id, instance in jobs:
            try:
                instance_id = upsert_instance(conn, domain, instance.active_users, topic_id)

                hashtags = _union_hashtags(topic.queries, domain, token)[:max_hashtags]
                record_topic_hashtags(
                    conn, topic_id, instance_id, [(h.name, h.uses_last_week) for h in hashtags]
                )

                for hashtag_info in hashtags:
                    since_id = get_since_cursor(conn, instance_id, hashtag_info.name)
                    posts, newest_seen_id = collect_posts(
                        hashtag_info.name, domain, token, max_pages=max_pages, since_id=since_id
                    )
                    for status_json in posts:
                        upsert_status(conn, instance_id, status_json)

                    # se il run non ha visto nulla, ripropaga il cursore precedente
                    record_collection_run(
                        conn, topic_id, instance_id, hashtag_info.name,
                        newest_seen_id or since_id, len(posts),
                    )
            except requests.exceptions.RequestException as exc:
                logger.warning(
                    "Istanza %s non raggiungibile o errore API per topic '%s', salto: %s",
                    domain, topic.name, exc,
                )
                _maybe_register(domain, exc)
            finally:
                if tracker:
                    tracker.advance(domain)
    finally:
        conn.close()


def _maybe_register(domain: str, exc: requests.exceptions.RequestException) -> None:
    """Su 401/422 (API anonima disabilitata) invia la domanda di iscrizione
    all'istanza: il token salvato in .env si attiva dopo conferma email e
    approvazione admin, quindi l'istanza verrà raccolta dai run successivi.
    Istanze con registrazioni chiuse finiscono in blacklist. Il lock
    serializza le scritture concorrenti su .env e blacklist dai worker."""
    response = getattr(exc, "response", None)
    if response is None or response.status_code not in (401, 422):
        return
    try:
        with _registration_lock:
            register_on_instance(domain)
    except requests.exceptions.RequestException as reg_exc:
        logger.warning("Registrazione su %s fallita: %s", domain, reg_exc)


def _union_instances(queries: list[str], limit: int) -> list:
    """Unione delle istanze trovate da tutte le query, dedup per dominio,
    escluse quelle in blacklist (API bloccata e registrazioni chiuse),
    ordinate per utenti attivi decrescenti, tagliate a limit."""
    blacklist = load_blacklist()
    by_domain = {}
    for query in queries:
        for inst in find_popular_instances(query, limit=limit):
            if inst.domain not in blacklist and inst.domain not in by_domain:
                by_domain[inst.domain] = inst
    ranked = sorted(by_domain.values(), key=lambda i: i.active_users, reverse=True)
    return ranked[:limit]


def _union_hashtags(queries: list[str], domain: str, token: str | None) -> list:
    """Unione degli hashtag trovati da tutte le query sull'istanza, dedup
    case-insensitive sul nome (a parità tiene uses_last_week massimo),
    ordinati per uso decrescente."""
    best = {}
    for query in queries:
        for tag in discover_hashtags(query, domain, token, min_count=5):
            key = tag.name.lower()
            if key not in best or tag.uses_last_week > best[key].uses_last_week:
                best[key] = tag
    return sorted(best.values(), key=lambda h: h.uses_last_week, reverse=True)


if __name__ == "__main__":
    import os

    logging.basicConfig(level=logging.INFO)
    run_pipeline("topic_list.txt", os.environ["DATABASE_URL"])

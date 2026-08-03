"""Esporta i dati di raccolta (topics/instances/accounts/statuses e relazioni)
in uno zip di file JSONL con chiavi naturali, per condividerli con i colleghi.

Escluso da questo export (fuori scope, vedi design doc
2026-08-03-db-sync-design.md): ai_labels, fact_checks (gated),
collection_runs (bookkeeping interno), statuses.veracity (derivato dal
fact-check, gated).

psycopg2 decodifica automaticamente le colonne JSONB in dict/list Python -
nessuna configurazione necessaria per leggere `raw`.

Nota: tre timestamp di audit vengono esportati ma non hanno un parametro
corrispondente lato import, quindi in fase di import le righe ricevono il
default now() del DB invece del valore originale del collega:
instances.discovered_at, reblogs.fetched_at, follows.fetched_at. Accettato
come non bloccante: nessuno dei tre partecipa a chiave naturale, FK,
decisione di merge o analisi a valle."""
import datetime as dt
import json
import zipfile

import psycopg2.extensions

_BATCH_SIZE = 1000


def _json_default(value):
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    raise TypeError(f"Non serializzabile in JSON: {type(value)}")


def _write_jsonl_rows(zf: zipfile.ZipFile, name: str, rows) -> int:
    count = 0
    # force_zip64: statuses.jsonl da solo puo' superare il limite ~2-4GB del
    # formato ZIP classico su corpus reale (1.8M+ status con raw JSON) -
    # senza questo flag zf.open() fallisce con "File size too large" solo a
    # fine scrittura della singola voce (osservato in produzione 2026-08-03).
    with zf.open(name, "w", force_zip64=True) as f:
        for row in rows:
            f.write((json.dumps(row, default=_json_default) + "\n").encode("utf-8"))
            count += 1
    return count


def _export_topics(conn, zf) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT name FROM topics ORDER BY id")
        rows = ({"name": name} for (name,) in cur.fetchall())
        return _write_jsonl_rows(zf, "topics.jsonl", rows)


def _export_instances(conn, zf) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT i.domain, t.name, i.active_users, i.discovered_at
            FROM instances i
            LEFT JOIN topics t ON t.id = i.discovered_via_topic_id
            ORDER BY i.id
            """
        )
        rows = (
            {"domain": domain, "discovered_via_topic": topic_name,
             "active_users": active_users, "discovered_at": discovered_at}
            for domain, topic_name, active_users, discovered_at in cur.fetchall()
        )
        return _write_jsonl_rows(zf, "instances.jsonl", rows)


def _export_accounts(conn, zf) -> int:
    with conn.cursor(name="export_accounts") as cur:
        cur.itersize = _BATCH_SIZE
        cur.execute(
            """
            SELECT i.domain, a.mastodon_id, a.acct, a.username, a.bot, a.raw,
                   a.fetched_at, a.followers_crawled_at, a.following_crawled_at,
                   a.timeline_crawled_at
            FROM accounts a JOIN instances i ON i.id = a.instance_id
            ORDER BY a.id
            """
        )
        rows = (
            {
                "instance_domain": domain, "mastodon_id": mastodon_id, "acct": acct,
                "username": username, "bot": bot, "raw": raw, "fetched_at": fetched_at,
                "followers_crawled_at": followers_crawled_at,
                "following_crawled_at": following_crawled_at,
                "timeline_crawled_at": timeline_crawled_at,
            }
            for domain, mastodon_id, acct, username, bot, raw, fetched_at,
                followers_crawled_at, following_crawled_at, timeline_crawled_at in cur
        )
        return _write_jsonl_rows(zf, "accounts.jsonl", rows)


def _status_row(record):
    (domain, mastodon_id, acc_domain, acc_mastodon_id, content, language,
     created_at, reblog_domain, reblog_mastodon_id, in_reply_to_mastodon_id,
     reply_domain, reply_mastodon_id, raw, fetched_at, enriched_at, source,
     deleted_at) = record
    return {
        "instance_domain": domain, "mastodon_id": mastodon_id,
        "account_ref": {"instance_domain": acc_domain, "mastodon_id": acc_mastodon_id},
        "content": content, "language": language, "created_at": created_at,
        "reblog_of_ref": (
            {"instance_domain": reblog_domain, "mastodon_id": reblog_mastodon_id}
            if reblog_mastodon_id is not None else None
        ),
        "in_reply_to_mastodon_id": in_reply_to_mastodon_id,
        "in_reply_to_ref": (
            {"instance_domain": reply_domain, "mastodon_id": reply_mastodon_id}
            if reply_mastodon_id is not None else None
        ),
        "raw": raw, "fetched_at": fetched_at, "enriched_at": enriched_at,
        "source": source, "deleted_at": deleted_at,
    }


def _export_statuses(conn, zf) -> int:
    with conn.cursor(name="export_statuses") as cur:
        cur.itersize = _BATCH_SIZE
        cur.execute(
            """
            SELECT i.domain, s.mastodon_id,
                   ai.domain, acc.mastodon_id,
                   s.content, s.language, s.created_at,
                   ri.domain, rs.mastodon_id,
                   s.in_reply_to_mastodon_id,
                   pi.domain, ps.mastodon_id,
                   s.raw, s.fetched_at, s.enriched_at, s.source, s.deleted_at
            FROM statuses s
            JOIN instances i ON i.id = s.instance_id
            JOIN accounts acc ON acc.id = s.account_id
            JOIN instances ai ON ai.id = acc.instance_id
            LEFT JOIN statuses rs ON rs.id = s.reblog_of_id
            LEFT JOIN instances ri ON ri.id = rs.instance_id
            LEFT JOIN statuses ps ON ps.id = s.in_reply_to_id
            LEFT JOIN instances pi ON pi.id = ps.instance_id
            ORDER BY s.id
            """
        )
        rows = (_status_row(record) for record in cur)
        return _write_jsonl_rows(zf, "statuses.jsonl", rows)


def _export_status_hashtags(conn, zf) -> int:
    with conn.cursor(name="export_status_hashtags") as cur:
        cur.itersize = _BATCH_SIZE
        cur.execute(
            """
            SELECT i.domain, s.mastodon_id, sh.hashtag
            FROM status_hashtags sh
            JOIN statuses s ON s.id = sh.status_id
            JOIN instances i ON i.id = s.instance_id
            ORDER BY sh.status_id
            """
        )
        rows = (
            {"status_ref": {"instance_domain": domain, "mastodon_id": mastodon_id}, "hashtag": hashtag}
            for domain, mastodon_id, hashtag in cur
        )
        return _write_jsonl_rows(zf, "status_hashtags.jsonl", rows)


def _export_mentions(conn, zf) -> int:
    with conn.cursor(name="export_mentions") as cur:
        cur.itersize = _BATCH_SIZE
        cur.execute(
            """
            SELECT i.domain, s.mastodon_id, m.mentioned_acct
            FROM mentions m
            JOIN statuses s ON s.id = m.status_id
            JOIN instances i ON i.id = s.instance_id
            ORDER BY m.status_id
            """
        )
        rows = (
            {"status_ref": {"instance_domain": domain, "mastodon_id": mastodon_id},
             "mentioned_acct": mentioned_acct}
            for domain, mastodon_id, mentioned_acct in cur
        )
        return _write_jsonl_rows(zf, "mentions.jsonl", rows)


def _export_topic_hashtags(conn, zf) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT t.name, i.domain, th.hashtag, th.usage_count, th.discovered_at
            FROM topic_hashtags th
            JOIN topics t ON t.id = th.topic_id
            JOIN instances i ON i.id = th.instance_id
            ORDER BY t.id, i.id
            """
        )
        rows = (
            {"topic_name": topic_name, "instance_domain": domain, "hashtag": hashtag,
             "usage_count": usage_count, "discovered_at": discovered_at}
            for topic_name, domain, hashtag, usage_count, discovered_at in cur.fetchall()
        )
        return _write_jsonl_rows(zf, "topic_hashtags.jsonl", rows)


def _export_reblogs(conn, zf) -> int:
    with conn.cursor(name="export_reblogs") as cur:
        cur.itersize = _BATCH_SIZE
        cur.execute(
            """
            SELECT si.domain, s.mastodon_id, bi.domain, b.mastodon_id, r.fetched_at
            FROM reblogs r
            JOIN statuses s ON s.id = r.status_id
            JOIN instances si ON si.id = s.instance_id
            JOIN accounts b ON b.id = r.booster_account_id
            JOIN instances bi ON bi.id = b.instance_id
            ORDER BY r.status_id, r.booster_account_id
            """
        )
        rows = (
            {
                "status_ref": {"instance_domain": s_domain, "mastodon_id": s_mastodon_id},
                "booster_account_ref": {"instance_domain": b_domain, "mastodon_id": b_mastodon_id},
                "fetched_at": fetched_at,
            }
            for s_domain, s_mastodon_id, b_domain, b_mastodon_id, fetched_at in cur
        )
        return _write_jsonl_rows(zf, "reblogs.jsonl", rows)


def _export_follows(conn, zf) -> int:
    with conn.cursor(name="export_follows") as cur:
        cur.itersize = _BATCH_SIZE
        cur.execute(
            """
            SELECT fi.domain, f.mastodon_id, ti.domain, t.mastodon_id, fo.fetched_at
            FROM follows fo
            JOIN accounts f ON f.id = fo.follower_account_id
            JOIN instances fi ON fi.id = f.instance_id
            JOIN accounts t ON t.id = fo.followed_account_id
            JOIN instances ti ON ti.id = t.instance_id
            ORDER BY fo.follower_account_id, fo.followed_account_id
            """
        )
        rows = (
            {
                "follower_ref": {"instance_domain": f_domain, "mastodon_id": f_mastodon_id},
                "followed_ref": {"instance_domain": t_domain, "mastodon_id": t_mastodon_id},
                "fetched_at": fetched_at,
            }
            for f_domain, f_mastodon_id, t_domain, t_mastodon_id, fetched_at in cur
        )
        return _write_jsonl_rows(zf, "follows.jsonl", rows)


def export_to_zip(conn: psycopg2.extensions.connection, output_path: str) -> dict[str, int]:
    """Esporta tutte le tabelle di raccolta in uno zip di JSONL a output_path.
    Ritorna il conteggio righe scritte per tabella. Sola lettura: non
    modifica il DB, chiude la transazione con rollback a fine funzione.
    Stampa il progresso tabella per tabella (letto dal supervisore pipeline
    per mostrare l'avanzamento nella webapp)."""
    steps = [
        ("topics", _export_topics),
        ("instances", _export_instances),
        ("accounts", _export_accounts),
        ("statuses", _export_statuses),
        ("status_hashtags", _export_status_hashtags),
        ("mentions", _export_mentions),
        ("topic_hashtags", _export_topic_hashtags),
        ("reblogs", _export_reblogs),
        ("follows", _export_follows),
    ]
    counts = {}
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, (name, export_fn) in enumerate(steps, start=1):
            print(f"({i}/{len(steps)}) esporto {name}...")
            counts[name] = export_fn(conn, zf)
            print(f"({i}/{len(steps)}) {name}: {counts[name]} righe")
    conn.rollback()
    return counts


if __name__ == "__main__":
    import os
    import sys

    from dotenv import load_dotenv

    from snm.storage.db import get_connection

    load_dotenv()
    if len(sys.argv) != 2:
        print("Uso: python -m snm.analysis.db_export output.zip")
        sys.exit(1)

    connection = get_connection(os.environ["DATABASE_URL"])
    result = export_to_zip(connection, sys.argv[1])
    connection.close()
    print(f"fatto: {sum(result.values())} righe totali -> {sys.argv[1]}")

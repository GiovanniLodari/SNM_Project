"""Importa in questo DB i dati esportati da export_to_zip di un collega
(snm/analysis/db_export.py), senza mai sovrascrivere righe gia' presenti -
solo integra cio' che manca (vedi design doc 2026-08-03-db-sync-design.md).

Ordine di elaborazione (rispetta le dipendenze FK): topics -> instances ->
accounts -> statuses -> status_hashtags/mentions/topic_hashtags/reblogs/follows.
I riferimenti (account_ref, status_ref, ecc.) si risolvono con un dizionario
in memoria popolato via via, dato che l'export garantisce che l'originale di
un reblog/reply precede sempre il suo riferimento nel file (ordinato per id
crescente, stesso invariante di upsert_status)."""
import json
import zipfile

from snm.storage.db import insert_follow, insert_reblog
from snm.storage.db_import import (
    import_get_or_create_account,
    import_get_or_create_instance,
    import_get_or_create_status,
    import_get_or_create_topic,
    import_mention,
    import_status_hashtag,
    import_topic_hashtag,
)


def _read_jsonl(zf: zipfile.ZipFile, name: str):
    with zf.open(name) as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def import_from_zip(conn, input_path: str) -> dict[str, dict[str, int]]:
    """Importa tutte le tabelle da un file esportato da export_to_zip.
    Ritorna, per tabella, {"new": N, "existing": M}."""
    counts: dict[str, dict[str, int]] = {}
    topic_ids: dict[str, int] = {}
    instance_ids: dict[str, int] = {}
    account_ids: dict[tuple[str, str], int] = {}
    status_ids: dict[tuple[str, str], int] = {}

    def account_id_for(ref) -> int:
        return account_ids[(ref["instance_domain"], ref["mastodon_id"])]

    def status_id_for(ref):
        if ref is None:
            return None
        return status_ids.get((ref["instance_domain"], ref["mastodon_id"]))

    with zipfile.ZipFile(input_path) as zf:
        n_total = n_new = 0
        for row in _read_jsonl(zf, "topics.jsonl"):
            n_total += 1
            topic_id, is_new = import_get_or_create_topic(conn, row["name"])
            topic_ids[row["name"]] = topic_id
            n_new += is_new
        counts["topics"] = {"new": n_new, "existing": n_total - n_new}

        n_total = n_new = 0
        for row in _read_jsonl(zf, "instances.jsonl"):
            n_total += 1
            discovered_via_topic_id = topic_ids.get(row["discovered_via_topic"])
            instance_id, is_new = import_get_or_create_instance(
                conn, row["domain"], row["active_users"], discovered_via_topic_id,
            )
            instance_ids[row["domain"]] = instance_id
            n_new += is_new
        counts["instances"] = {"new": n_new, "existing": n_total - n_new}

        n_total = n_new = 0
        for row in _read_jsonl(zf, "accounts.jsonl"):
            n_total += 1
            instance_id = instance_ids[row["instance_domain"]]
            account_id, is_new = import_get_or_create_account(
                conn, instance_id, row["mastodon_id"], row["acct"], row["username"],
                row["bot"], row["raw"], row["fetched_at"], row["followers_crawled_at"],
                row["following_crawled_at"], row["timeline_crawled_at"],
            )
            account_ids[(row["instance_domain"], row["mastodon_id"])] = account_id
            n_new += is_new
        counts["accounts"] = {"new": n_new, "existing": n_total - n_new}

        n_total = n_new = 0
        for row in _read_jsonl(zf, "statuses.jsonl"):
            n_total += 1
            instance_id = instance_ids[row["instance_domain"]]
            status_id, is_new = import_get_or_create_status(
                conn, instance_id, row["mastodon_id"],
                account_id_for(row["account_ref"]),
                row["content"], row["language"], row["created_at"],
                status_id_for(row["reblog_of_ref"]),
                row["in_reply_to_mastodon_id"],
                status_id_for(row["in_reply_to_ref"]),
                row["raw"], row["fetched_at"], row["enriched_at"],
                row["source"], row["deleted_at"],
            )
            status_ids[(row["instance_domain"], row["mastodon_id"])] = status_id
            n_new += is_new
        counts["statuses"] = {"new": n_new, "existing": n_total - n_new}

        n_total = n_new = 0
        for row in _read_jsonl(zf, "status_hashtags.jsonl"):
            n_total += 1
            status_id = status_id_for(row["status_ref"])
            n_new += import_status_hashtag(conn, status_id, row["hashtag"])
        counts["status_hashtags"] = {"new": n_new, "existing": n_total - n_new}

        n_total = n_new = 0
        for row in _read_jsonl(zf, "mentions.jsonl"):
            n_total += 1
            status_id = status_id_for(row["status_ref"])
            n_new += import_mention(conn, status_id, row["mentioned_acct"])
        counts["mentions"] = {"new": n_new, "existing": n_total - n_new}

        n_total = n_new = 0
        for row in _read_jsonl(zf, "topic_hashtags.jsonl"):
            n_total += 1
            topic_id = topic_ids[row["topic_name"]]
            instance_id = instance_ids[row["instance_domain"]]
            n_new += import_topic_hashtag(
                conn, topic_id, instance_id, row["hashtag"], row["usage_count"], row["discovered_at"],
            )
        counts["topic_hashtags"] = {"new": n_new, "existing": n_total - n_new}

        n_total = n_new = 0
        for row in _read_jsonl(zf, "reblogs.jsonl"):
            n_total += 1
            status_id = status_id_for(row["status_ref"])
            booster_id = account_id_for(row["booster_account_ref"])
            n_new += insert_reblog(conn, status_id, booster_id)
        counts["reblogs"] = {"new": n_new, "existing": n_total - n_new}

        n_total = n_new = 0
        for row in _read_jsonl(zf, "follows.jsonl"):
            n_total += 1
            follower_id = account_id_for(row["follower_ref"])
            followed_id = account_id_for(row["followed_ref"])
            n_new += insert_follow(conn, follower_id, followed_id)
        counts["follows"] = {"new": n_new, "existing": n_total - n_new}

    return counts


if __name__ == "__main__":
    import os
    import sys

    from dotenv import load_dotenv

    from snm.storage.db import get_connection, init_schema

    load_dotenv()
    if len(sys.argv) != 2:
        print("Uso: python -m snm.analysis.run_db_import input.zip")
        sys.exit(1)

    connection = get_connection(os.environ["DATABASE_URL"])
    init_schema(connection)
    result = import_from_zip(connection, sys.argv[1])
    connection.close()
    for table, table_counts in result.items():
        print(f"{table}: {table_counts['new']} nuove, {table_counts['existing']} gia' presenti")

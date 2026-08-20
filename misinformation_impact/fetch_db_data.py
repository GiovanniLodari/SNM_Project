"""Estrae dal DB i dati necessari all'analisi misinformation impact:
  - post → autore (account_id)
  - boost count per post (diffusione reale)

Salva due file JSONL in misinformation_impact/data/ così le analisi
successive girano offline senza accesso al DB.

Uso:
    python -m misinformation_impact.fetch_db_data
    python -m misinformation_impact.fetch_db_data --fact-check ../fact_check_report.csv
"""
import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

OUT_DIR = Path(__file__).parent / "data"

POST_AUTHOR_QUERY = """
    SELECT id, account_id
    FROM statuses
    WHERE id = ANY(%s) AND deleted_at IS NULL
"""

BOOST_COUNT_QUERY = """
    SELECT status_id, count(*) AS boost_count
    FROM reblogs
    WHERE status_id = ANY(%s)
    GROUP BY status_id
"""

# Stessa logica di canonicalization di snm/graph/builder.py:
# account duplicati (stesso acct@dominio su istanze diverse) vengono fusi
# nel nodo con il min(account_id). Serve per risolvere il mismatch tra
# l'account_id raw dei post e il nodo canonico nel grafo.
CANON_QUERY = """
    SELECT a.id,
           CASE WHEN a.acct LIKE '%@%' THEN a.acct
                ELSE a.acct || '@' || ai.domain END AS canon_acct
    FROM accounts a
    JOIN instances ai ON ai.id = a.instance_id
    WHERE a.id = ANY(%s)
"""

CANON_ALL_QUERY = """
    SELECT a.id,
           CASE WHEN a.acct LIKE '%@%' THEN a.acct
                ELSE a.acct || '@' || ai.domain END AS canon_acct
    FROM accounts a
    JOIN instances ai ON ai.id = a.instance_id
"""


def get_connection(database_url: str):
    try:
        import psycopg
        return psycopg.connect(database_url)
    except ImportError:
        import psycopg2
        return psycopg2.connect(database_url)


def load_post_ids(fact_check_path: Path) -> list[int]:
    import csv
    ids = []
    with fact_check_path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            ids.append(int(row["id"]))
    return ids


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fact-check", default="../fact_check_report.csv",
                        help="CSV fact-check da cui leggere gli ID post")
    args = parser.parse_args()

    fact_check_path = Path(__file__).parent / args.fact_check
    ids = load_post_ids(fact_check_path)
    print(f"ID post da cercare: {len(ids)}")

    database_url = os.environ["DATABASE_URL"]
    conn = get_connection(database_url)

    OUT_DIR.mkdir(exist_ok=True)

    # post → autore
    with conn.cursor() as cur:
        cur.execute(POST_AUTHOR_QUERY, (ids,))
        rows = cur.fetchall()
    out_authors = OUT_DIR / "post_authors.jsonl"
    with out_authors.open("w", encoding="utf-8") as f:
        for post_id, account_id in rows:
            f.write(json.dumps({"post_id": post_id, "account_id": account_id}) + "\n")
    print(f"post_authors.jsonl: {len(rows)} righe -> {out_authors}")

    # boost per post
    with conn.cursor() as cur:
        cur.execute(BOOST_COUNT_QUERY, (ids,))
        rows = cur.fetchall()
    out_boosts = OUT_DIR / "post_boosts.jsonl"
    with out_boosts.open("w", encoding="utf-8") as f:
        for status_id, boost_count in rows:
            f.write(json.dumps({"post_id": status_id, "boost_count": int(boost_count)}) + "\n")
    print(f"post_boosts.jsonl:  {len(rows)} righe -> {out_boosts}")

    # canonicalization: account_id originale → canonical_node_id (min del gruppo)
    # necessario perché il grafo fonde account duplicati (stessa persona su più istanze)
    print("Costruisco mappa canonicalization account_id → nodo grafo...")
    with conn.cursor() as cur:
        cur.execute(CANON_ALL_QUERY)
        all_accounts = cur.fetchall()

    from collections import defaultdict
    groups: dict[str, list[int]] = defaultdict(list)
    for account_id, canon_acct in all_accounts:
        groups[canon_acct].append(account_id)

    canon_id_of: dict[int, int] = {}
    for members in groups.values():
        rep = min(members)
        for account_id in members:
            canon_id_of[account_id] = rep

    # salva i mapping per gli account autori dei post appena estratti
    out_authors_path = OUT_DIR / "post_authors.jsonl"
    needed_accounts: set[int] = set()
    with out_authors_path.open(encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            needed_accounts.add(r["account_id"])

    out_canon = OUT_DIR / "account_canonical.jsonl"
    mapped = 0
    with out_canon.open("w", encoding="utf-8") as f:
        for account_id in needed_accounts:
            canonical = canon_id_of.get(account_id, account_id)
            f.write(json.dumps({"account_id": account_id, "canonical_id": canonical}) + "\n")
            if canonical != account_id:
                mapped += 1
    print(f"account_canonical.jsonl: {len(needed_accounts)} account, {mapped} remappati -> {out_canon}")

    conn.close()


if __name__ == "__main__":
    main()

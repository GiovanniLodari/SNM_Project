"""Importazione batch ultra-veloce da C:\\Users\\paolo\\Downloads\\DB verso PostgreSQL.

Rispetta rigorosamente lo schema e le chiavi esterne PostgreSQL:
1. topics
2. instances
3. accounts
4. statuses
5. follows & hashtags & mentions & reblogs
"""
import os
import sys
import json
import time
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from pathlib import Path

from snm.storage.viste import aggiorna_viste

load_dotenv(override=True)

DB_URL = os.environ["DATABASE_URL"]
# Cartella dei .jsonl da importare. Varia per macchina: si imposta con la
# variabile d'ambiente JSONL_DIR, altrimenti si usa imports/ nella root.
JSONL_DIR = os.environ.get("JSONL_DIR", str(Path(__file__).resolve().parent / "imports"))

BATCH_SIZE = 5000


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def read_jsonl(filename):
    path = os.path.join(JSONL_DIR, filename)
    if not os.path.exists(path):
        log(f"File non trovato: {path}")
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def run_fast_import():
    log("Connessione a PostgreSQL...")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    log("=== FASE 1: TOPICS ===")
    topic_ids = {}
    for row in read_jsonl("topics.jsonl"):
        cur.execute("INSERT INTO topics (name) VALUES (%s) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id", (row["name"],))
        topic_ids[row["name"]] = cur.fetchone()[0]
    conn.commit()
    log(f"Topics caricati: {len(topic_ids)}")

    log("=== FASE 2: INSTANCES ===")
    instance_ids = {}
    for row in read_jsonl("instances.jsonl"):
        disc_topic = topic_ids.get(row.get("discovered_via_topic"))
        cur.execute(
            """
            INSERT INTO instances (domain, active_users, discovered_via_topic_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (domain) DO UPDATE SET active_users=EXCLUDED.active_users
            RETURNING id
            """,
            (row["domain"], row.get("active_users"), disc_topic),
        )
        instance_ids[row["domain"]] = cur.fetchone()[0]
    conn.commit()
    log(f"Instances caricate: {len(instance_ids)}")

    log("=== FASE 3: ACCOUNTS ===")
    account_ids = {}
    acc_batch = []
    count_acc = 0

    for row in read_jsonl("accounts.jsonl"):
        inst_domain = row["instance_domain"]
        inst_id = instance_ids.get(inst_domain)
        if not inst_id:
            cur.execute("INSERT INTO instances (domain) VALUES (%s) ON CONFLICT (domain) DO UPDATE SET domain=EXCLUDED.domain RETURNING id", (inst_domain,))
            inst_id = cur.fetchone()[0]
            instance_ids[inst_domain] = inst_id

        m_id = row["mastodon_id"]
        acct = row.get("acct", "")
        username = row.get("username", "")
        bot = bool(row.get("bot", False))
        raw = json.dumps(row.get("raw", {}))
        fetched_at = row.get("fetched_at")
        followers_crawled = row.get("followers_crawled_at")
        following_crawled = row.get("following_crawled_at")
        timeline_crawled = row.get("timeline_crawled_at")

        acc_batch.append((inst_id, m_id, acct, username, bot, raw, fetched_at, followers_crawled, following_crawled, timeline_crawled))
        count_acc += 1

        if len(acc_batch) >= BATCH_SIZE:
            psycopg2.extras.execute_values(
                cur,
                """
                INSERT INTO accounts (instance_id, mastodon_id, acct, username, bot, raw, fetched_at, followers_crawled_at, following_crawled_at, timeline_crawled_at)
                VALUES %s
                ON CONFLICT (instance_id, mastodon_id) DO NOTHING
                """,
                acc_batch,
                template="(%s, %s, %s, %s, %s, %s::jsonb, COALESCE(%s::timestamptz, now()), %s::timestamptz, %s::timestamptz, %s::timestamptz)",
            )
            conn.commit()
            acc_batch.clear()
            if count_acc % 20000 == 0:
                log(f"Accounts inseriti/processati: {count_acc}...")

    if acc_batch:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO accounts (instance_id, mastodon_id, acct, username, bot, raw, fetched_at, followers_crawled_at, following_crawled_at, timeline_crawled_at)
            VALUES %s
            ON CONFLICT (instance_id, mastodon_id) DO NOTHING
            """,
            acc_batch,
            template="(%s, %s, %s, %s, %s, %s::jsonb, COALESCE(%s::timestamptz, now()), %s::timestamptz, %s::timestamptz, %s::timestamptz)",
        )
        conn.commit()
        acc_batch.clear()

    log(f"Caricamento Account completato! {count_acc} account elaborati.")

    log("Costruzione Mappa ID Accounts in memoria per le Foreign Keys...")
    cur.execute("SELECT id, instance_id, mastodon_id FROM accounts")
    cur2 = conn.cursor()
    cur2.execute("SELECT id, domain FROM instances")
    domain_by_inst_id = dict(cur2.fetchall())
    cur2.close()

    for acc_db_id, inst_db_id, m_id in cur.fetchall():
        d_name = domain_by_inst_id.get(inst_db_id)
        if d_name:
            account_ids[(d_name, m_id)] = acc_db_id

    log(f"Mappa account in memoria: {len(account_ids)} voci.")

    log("=== FASE 4: STATUSES ===")
    status_batch = []
    count_st = 0

    for row in read_jsonl("statuses.jsonl"):
        inst_domain = row["instance_domain"]
        inst_id = instance_ids.get(inst_domain)
        if not inst_id:
            continue

        acc_ref = row.get("account_ref")
        acc_id = None
        if acc_ref:
            acc_id = account_ids.get((acc_ref["instance_domain"], acc_ref["mastodon_id"]))

        if not acc_id:
            continue

        m_id = row["mastodon_id"]
        content = row.get("content")
        lang = row.get("language")
        created_at = row.get("created_at")
        in_reply_m_id = row.get("in_reply_to_mastodon_id")
        raw = json.dumps(row.get("raw", {}))
        fetched_at = row.get("fetched_at")
        enriched_at = row.get("enriched_at")
        source = row.get("source", "crawler")
        deleted_at = row.get("deleted_at")

        status_batch.append((
            inst_id, m_id, acc_id, content, lang, created_at,
            in_reply_m_id, raw, fetched_at, enriched_at, source, deleted_at
        ))
        count_st += 1

        if len(status_batch) >= BATCH_SIZE:
            psycopg2.extras.execute_values(
                cur,
                """
                INSERT INTO statuses (instance_id, mastodon_id, account_id, content, language, created_at, in_reply_to_mastodon_id, raw, fetched_at, enriched_at, source, deleted_at)
                VALUES %s
                ON CONFLICT (instance_id, mastodon_id) DO NOTHING
                """,
                status_batch,
                template="(%s, %s, %s, %s, %s, %s::timestamptz, %s, %s::jsonb, COALESCE(%s::timestamptz, now()), %s::timestamptz, %s, %s::timestamptz)",
            )
            conn.commit()
            status_batch.clear()
            if count_st % 50000 == 0:
                log(f"Statuses inseriti/processati: {count_st}...")

    if status_batch:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO statuses (instance_id, mastodon_id, account_id, content, language, created_at, in_reply_to_mastodon_id, raw, fetched_at, enriched_at, source, deleted_at)
            VALUES %s
            ON CONFLICT (instance_id, mastodon_id) DO NOTHING
            """,
            status_batch,
            template="(%s, %s, %s, %s, %s, %s::timestamptz, %s, %s::jsonb, COALESCE(%s::timestamptz, now()), %s::timestamptz, %s, %s::timestamptz)",
        )
        conn.commit()
        status_batch.clear()

    log(f"Caricamento Statuses completato! {count_st} post elaborati.")

    log("=== FASE 5: FOLLOWS ===")
    follow_batch = []
    count_fol = 0

    for row in read_jsonl("follows.jsonl"):
        f_ref = row.get("follower_ref")
        t_ref = row.get("followed_ref")
        if not f_ref or not t_ref:
            continue

        f_id = account_ids.get((f_ref["instance_domain"], f_ref["mastodon_id"]))
        t_id = account_ids.get((t_ref["instance_domain"], t_ref["mastodon_id"]))

        if f_id and t_id:
            follow_batch.append((f_id, t_id))
            count_fol += 1

        if len(follow_batch) >= BATCH_SIZE:
            psycopg2.extras.execute_values(
                cur,
                """
                INSERT INTO follows (follower_account_id, followed_account_id)
                VALUES %s
                ON CONFLICT (follower_account_id, followed_account_id) DO NOTHING
                """,
                follow_batch,
            )
            conn.commit()
            follow_batch.clear()
            if count_fol % 100000 == 0:
                log(f"Follows inseriti/processati: {count_fol}...")

    if follow_batch:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO follows (follower_account_id, followed_account_id)
            VALUES %s
            ON CONFLICT (follower_account_id, followed_account_id) DO NOTHING
            """,
            follow_batch,
        )
        conn.commit()
        follow_batch.clear()

    log(f"Caricamento Follows completato! {count_fol} connessioni del grafo caricate.")

    # I riepiloghi che aprono i capitoli sono viste materializzate: appena
    # importato un corpus nuovo sono ferme ai numeri di prima, quindi
    # l'interfaccia mostrerebbe le cifre del corpus precedente. Va fatto qui e
    # non lasciato all'operatore: e' proprio dopo un'importazione che nessuno si
    # ricorda di un passaggio in piu'.
    log("Aggiornamento dei riepiloghi (viste materializzate)...")
    tempi = aggiorna_viste(conn)
    log(f"Riepiloghi aggiornati in {sum(tempi.values()):.1f} s.")

    conn.close()
    log("--- IMPORTAZIONE COMPLETA CON SUCCESSO! ---")


if __name__ == "__main__":
    run_fast_import()

"""Funzioni di import per il merge di dati tra DB Postgres/SQLite diversi (colleghi).

A differenza delle upsert_* di db.py (che sovrascrivono raw ad ogni ri-fetch,
pensate per il crawler live), queste NON toccano mai una riga gia' esistente:
in caso di conflitto sulla chiave naturale ritornano l'id esistente senza
modificare alcuna colonna di contenuto ne' i marcatori di progresso locali
(followers_crawled_at, ecc.). Il bool ritornato indica se la riga e' stata
inserita ora (True) o esisteva gia' (False), usato per il riepilogo import.
"""
import psycopg2.extras


def import_get_or_create_topic(conn, name: str) -> tuple[int, bool]:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM topics WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            return row[0], False

        cur.execute(
            """
            INSERT INTO topics (name) VALUES (%s)
            RETURNING id
            """,
            (name,),
        )
        topic_id = cur.fetchone()[0]
    conn.commit()
    return topic_id, True


def import_get_or_create_instance(
    conn, domain: str, active_users: int | None, discovered_via_topic_id: int | None
) -> tuple[int, bool]:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM instances WHERE domain = %s", (domain,))
        row = cur.fetchone()
        if row:
            return row[0], False

        cur.execute(
            """
            INSERT INTO instances (domain, active_users, discovered_via_topic_id)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (domain, active_users, discovered_via_topic_id),
        )
        instance_id = cur.fetchone()[0]
    conn.commit()
    return instance_id, True


def import_get_or_create_account(
    conn, instance_id: int, mastodon_id: str, acct: str, username: str, bot: bool,
    raw: dict, fetched_at, followers_crawled_at, following_crawled_at, timeline_crawled_at,
) -> tuple[int, bool]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM accounts WHERE instance_id = %s AND mastodon_id = %s",
            (instance_id, mastodon_id),
        )
        row = cur.fetchone()
        if row:
            return row[0], False

        cur.execute(
            """
            INSERT INTO accounts (
                instance_id, mastodon_id, acct, username, bot, raw, fetched_at,
                followers_crawled_at, following_crawled_at, timeline_crawled_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, COALESCE(%s, now()), %s, %s, %s)
            RETURNING id
            """,
            (
                instance_id, mastodon_id, acct, username, bot,
                psycopg2.extras.Json(raw), fetched_at,
                followers_crawled_at, following_crawled_at, timeline_crawled_at,
            ),
        )
        account_id = cur.fetchone()[0]
    conn.commit()
    return account_id, True


def import_get_or_create_status(
    conn, instance_id: int, mastodon_id: str, account_id: int, content: str | None,
    language: str | None, created_at, reblog_of_id: int | None,
    in_reply_to_mastodon_id: str | None, in_reply_to_id: int | None, raw: dict,
    fetched_at, enriched_at, source: str, deleted_at,
) -> tuple[int, bool]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM statuses WHERE instance_id = %s AND mastodon_id = %s",
            (instance_id, mastodon_id),
        )
        row = cur.fetchone()
        if row:
            return row[0], False

        cur.execute(
            """
            INSERT INTO statuses (
                instance_id, mastodon_id, account_id, content, language, created_at,
                reblog_of_id, in_reply_to_mastodon_id, in_reply_to_id, raw, fetched_at,
                enriched_at, source, deleted_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, now()), %s, %s, %s)
            RETURNING id
            """,
            (
                instance_id, mastodon_id, account_id, content, language, created_at,
                reblog_of_id, in_reply_to_mastodon_id, in_reply_to_id,
                psycopg2.extras.Json(raw), fetched_at, enriched_at, source, deleted_at,
            ),
        )
        status_id = cur.fetchone()[0]
    conn.commit()
    return status_id, True


def import_status_hashtag(conn, status_id: int, hashtag: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM status_hashtags WHERE status_id = %s AND hashtag = %s",
            (status_id, hashtag),
        )
        if cur.fetchone():
            return False
        cur.execute(
            "INSERT INTO status_hashtags (status_id, hashtag) VALUES (%s, %s)",
            (status_id, hashtag),
        )
    conn.commit()
    return True


def import_mention(conn, status_id: int, mentioned_acct: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM mentions WHERE status_id = %s AND mentioned_acct = %s",
            (status_id, mentioned_acct),
        )
        if cur.fetchone():
            return False
        cur.execute(
            "INSERT INTO mentions (status_id, mentioned_acct) VALUES (%s, %s)",
            (status_id, mentioned_acct),
        )
    conn.commit()
    return True


def import_topic_hashtag(
    conn, topic_id: int, instance_id: int, hashtag: str, usage_count: int, discovered_at,
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM topic_hashtags WHERE topic_id = %s AND instance_id = %s AND hashtag = %s",
            (topic_id, instance_id, hashtag),
        )
        if cur.fetchone():
            return False
        cur.execute(
            """
            INSERT INTO topic_hashtags (topic_id, instance_id, hashtag, usage_count, discovered_at)
            VALUES (%s, %s, %s, %s, COALESCE(%s, now()))
            """,
            (topic_id, instance_id, hashtag, usage_count, discovered_at),
        )
    conn.commit()
    return True

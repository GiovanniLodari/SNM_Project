from pathlib import Path

import psycopg2
import psycopg2.extensions
import psycopg2.extras

SCHEMA_PATH = Path(__file__).parent / "db" / "schema.sql"


def get_connection(database_url: str) -> psycopg2.extensions.connection:
    return psycopg2.connect(database_url)


def init_schema(conn: psycopg2.extensions.connection) -> None:
    """Crea le tabelle se non esistono già (idempotente)."""
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()


def upsert_topic(conn: psycopg2.extensions.connection, name: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO topics (name) VALUES (%s)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """,
            (name,),
        )
        (topic_id,) = cur.fetchone()
    conn.commit()
    return topic_id


def upsert_instance(
    conn: psycopg2.extensions.connection,
    domain: str,
    active_users: int,
    discovered_via_topic_id: int | None,
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO instances (domain, active_users, discovered_via_topic_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (domain) DO UPDATE SET active_users = EXCLUDED.active_users
            RETURNING id
            """,
            (domain, active_users, discovered_via_topic_id),
        )
        (instance_id,) = cur.fetchone()
    conn.commit()
    return instance_id


def upsert_account(conn: psycopg2.extensions.connection, instance_id: int, account_json: dict) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO accounts (instance_id, mastodon_id, acct, username, bot, raw)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (instance_id, mastodon_id) DO UPDATE SET raw = EXCLUDED.raw
            RETURNING id
            """,
            (
                instance_id,
                account_json["id"],
                account_json["acct"],
                account_json["username"],
                account_json.get("bot", False),
                psycopg2.extras.Json(account_json),
            ),
        )
        (account_id,) = cur.fetchone()
    conn.commit()
    return account_id


def _find_status_id_by_mastodon_id(conn, instance_id: int, mastodon_id: str) -> int | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM statuses WHERE instance_id = %s AND mastodon_id = %s",
            (instance_id, mastodon_id),
        )
        row = cur.fetchone()
    return row[0] if row else None


def upsert_status(
    conn: psycopg2.extensions.connection,
    instance_id: int,
    status_json: dict,
    source: str = "hashtag",
) -> int:
    """Inserisce (o aggiorna) uno status. Se è un reblog, inserisce prima ricorsivamente
    lo status originale e collega reblog_of_id. Popola hashtag e mention associati.
    Il source indica la provenienza; in caso di post già presente il source
    originale non viene sovrascritto."""
    reblog_of_id = None
    if status_json.get("reblog"):
        reblog_of_id = upsert_status(conn, instance_id, status_json["reblog"], source=source)

    account_id = upsert_account(conn, instance_id, status_json["account"])

    in_reply_to_mastodon_id = status_json.get("in_reply_to_id")
    in_reply_to_id = None
    if in_reply_to_mastodon_id:
        in_reply_to_id = _find_status_id_by_mastodon_id(conn, instance_id, in_reply_to_mastodon_id)

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO statuses (
                instance_id, mastodon_id, account_id, content, language, created_at,
                reblog_of_id, in_reply_to_mastodon_id, in_reply_to_id, raw, source
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (instance_id, mastodon_id) DO UPDATE SET raw = EXCLUDED.raw
            RETURNING id
            """,
            (
                instance_id,
                status_json["id"],
                account_id,
                status_json.get("content", ""),
                status_json.get("language"),
                status_json.get("created_at"),
                reblog_of_id,
                in_reply_to_mastodon_id,
                in_reply_to_id,
                psycopg2.extras.Json(status_json),
                source,
            ),
        )
        (status_id,) = cur.fetchone()

        for tag in status_json.get("tags", []):
            cur.execute(
                """
                INSERT INTO status_hashtags (status_id, hashtag) VALUES (%s, %s)
                ON CONFLICT (status_id, hashtag) DO NOTHING
                """,
                (status_id, tag["name"].lower()),
            )

        for mention in status_json.get("mentions", []):
            cur.execute(
                """
                INSERT INTO mentions (status_id, mentioned_acct) VALUES (%s, %s)
                ON CONFLICT (status_id, mentioned_acct) DO NOTHING
                """,
                (status_id, mention["acct"]),
            )
    conn.commit()
    return status_id


def insert_reblog(
    conn: psycopg2.extensions.connection, status_id: int, booster_account_id: int
) -> None:
    """Registra l'arco 'booster ha boostato status' (idempotente)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO reblogs (status_id, booster_account_id) VALUES (%s, %s)
            ON CONFLICT (status_id, booster_account_id) DO NOTHING
            """,
            (status_id, booster_account_id),
        )
    conn.commit()


def mark_enriched(conn: psycopg2.extensions.connection, status_id: int) -> None:
    """Marca lo status come processato dall'arricchimento interazioni."""
    with conn.cursor() as cur:
        cur.execute("UPDATE statuses SET enriched_at = now() WHERE id = %s", (status_id,))
    conn.commit()


def mark_deleted(conn: psycopg2.extensions.connection, status_id: int) -> None:
    """Marca lo status come cancellato sull'istanza di origine (visto 404)."""
    with conn.cursor() as cur:
        cur.execute("UPDATE statuses SET deleted_at = now() WHERE id = %s", (status_id,))
    conn.commit()


def list_statuses_to_enrich(
    conn: psycopg2.extensions.connection, refresh_older_than_days: int | None = None
) -> list[tuple]:
    """Post con interazioni dichiarate non ancora arricchiti, con l'istanza di
    provenienza. Con refresh_older_than_days include anche i post già arricchiti
    più di N giorni fa (ri-arricchimento: cattura interazioni tardive). I post
    cancellati (deleted_at) sono esclusi. Righe: (status_id, mastodon_id,
    instance_id, domain, reblogs_count, replies_count)."""
    refresh_clause = ""
    params: tuple = ()
    if refresh_older_than_days is not None:
        refresh_clause = "OR s.enriched_at < now() - make_interval(days => %s)"
        params = (refresh_older_than_days,)

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT s.id, s.mastodon_id, s.instance_id, i.domain,
                   COALESCE((s.raw->>'reblogs_count')::int, 0),
                   COALESCE((s.raw->>'replies_count')::int, 0)
            FROM statuses s JOIN instances i ON i.id = s.instance_id
            WHERE s.deleted_at IS NULL
              AND (s.enriched_at IS NULL {refresh_clause})
              AND (COALESCE((s.raw->>'reblogs_count')::int, 0) > 0
                   OR COALESCE((s.raw->>'replies_count')::int, 0) > 0)
            ORDER BY i.domain, s.id
            """,
            params,
        )
        return cur.fetchall()


def record_topic_hashtags(
    conn: psycopg2.extensions.connection,
    topic_id: int,
    instance_id: int,
    hashtags: list[tuple[str, int]],
) -> None:
    """Sostituisce gli hashtag scoperti per (topic, istanza) con la lista fornita."""
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM topic_hashtags WHERE topic_id = %s AND instance_id = %s",
            (topic_id, instance_id),
        )
        for hashtag, usage_count in hashtags:
            cur.execute(
                """
                INSERT INTO topic_hashtags (topic_id, instance_id, hashtag, usage_count)
                VALUES (%s, %s, %s, %s)
                """,
                (topic_id, instance_id, hashtag, usage_count),
            )
    conn.commit()


def list_accounts_to_crawl(
    conn: psycopg2.extensions.connection, include_isolated: bool = False
) -> list[tuple]:
    """Account con timeline non ancora scaricata, con l'istanza di provenienza.
    Default: solo account connessi (compaiono in reblogs, reply o mention) —
    sono quelli che densificano la rete. Righe: (account_id, mastodon_id, domain)."""
    connected_filter = """
        AND (
            EXISTS (SELECT 1 FROM reblogs r WHERE r.booster_account_id = a.id)
            OR EXISTS (SELECT 1 FROM reblogs r JOIN statuses s ON s.id = r.status_id
                       WHERE s.account_id = a.id)
            OR EXISTS (SELECT 1 FROM statuses s WHERE s.account_id = a.id
                       AND s.in_reply_to_id IS NOT NULL)
            OR EXISTS (SELECT 1 FROM statuses p JOIN statuses c ON c.in_reply_to_id = p.id
                       WHERE p.account_id = a.id)
            OR EXISTS (SELECT 1 FROM mentions m WHERE m.mentioned_acct = a.acct)
        )
    """
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT a.id, a.mastodon_id, i.domain
            FROM accounts a JOIN instances i ON i.id = a.instance_id
            WHERE a.timeline_crawled_at IS NULL
            {"" if include_isolated else connected_filter}
            ORDER BY i.domain, a.id
            """
        )
        return cur.fetchall()


def mark_timeline_crawled(conn: psycopg2.extensions.connection, account_id: int) -> None:
    """Marca l'account come processato dal crawler timeline."""
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE accounts SET timeline_crawled_at = now() WHERE id = %s", (account_id,)
        )
    conn.commit()


def known_hashtags(conn: psycopg2.extensions.connection) -> set[str]:
    """Hashtag già scoperti dalla pipeline (lowercase), per filtrare le timeline."""
    with conn.cursor() as cur:
        cur.execute("SELECT DISTINCT lower(hashtag) FROM topic_hashtags")
        return {row[0] for row in cur.fetchall()}


def get_since_cursor(
    conn: psycopg2.extensions.connection, instance_id: int, hashtag: str
) -> str | None:
    """Ultimo cursore non nullo per (istanza, hashtag): id del post più recente
    visto dai run precedenti, da passare come since_id per la raccolta
    incrementale. None se mai raccolto."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT max_id_cursor FROM collection_runs
            WHERE instance_id = %s AND hashtag = %s AND max_id_cursor IS NOT NULL
            ORDER BY started_at DESC LIMIT 1
            """,
            (instance_id, hashtag),
        )
        row = cur.fetchone()
    return row[0] if row else None


def record_collection_run(
    conn: psycopg2.extensions.connection,
    topic_id: int,
    instance_id: int,
    hashtag: str,
    max_id_cursor: str | None,
    posts_collected: int,
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO collection_runs (topic_id, instance_id, hashtag, max_id_cursor, posts_collected, finished_at)
            VALUES (%s, %s, %s, %s, %s, now())
            RETURNING id
            """,
            (topic_id, instance_id, hashtag, max_id_cursor, posts_collected),
        )
        (run_id,) = cur.fetchone()
    conn.commit()
    return run_id

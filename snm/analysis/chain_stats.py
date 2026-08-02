# chain_stats.py
"""Distribuzione completa delle lunghezze di catena (1..max).

Catena = albero di post radicato in un post senza genitore; collegamento
post->post = reply (in_reply_to_id) o reblog (reblog_of_id). Lunghezza =
profondita' massima dell'albero (1 = post senza interazioni a valle).
I post cancellati sono esclusi.

Uso: python chain_stats.py  (legge DATABASE_URL)
"""
import os
from dotenv import load_dotenv

load_dotenv()
from snm.storage.db import get_connection

CHAIN_QUERY = """
    WITH RECURSIVE chain AS (
        SELECT id, id AS root, 1 AS depth
        FROM statuses
        WHERE COALESCE(in_reply_to_id, reblog_of_id) IS NULL
          AND deleted_at IS NULL
        UNION ALL
        SELECT s.id, c.root, c.depth + 1
        FROM statuses s
        JOIN chain c ON COALESCE(s.in_reply_to_id, s.reblog_of_id) = c.id
        WHERE s.deleted_at IS NULL
    ),
    per_root AS (
        SELECT root, max(depth) AS depth, count(*) AS membri
        FROM chain GROUP BY root
    )
    SELECT depth, count(*) AS catene, sum(membri) AS post_coinvolti
    FROM per_root GROUP BY depth ORDER BY depth
"""


def main() -> None:
    conn = get_connection(os.environ["DATABASE_URL"])
    with conn.cursor() as cur:
        cur.execute(CHAIN_QUERY)
        rows = cur.fetchall()
    conn.close()

    total_chains = sum(r[1] for r in rows)
    total_posts = sum(r[2] for r in rows)

    print(f"{'lunghezza':>9} | {'catene':>8} | {'%':>6} | {'post coinvolti':>14}")
    print("-" * 48)
    for depth, chains, posts in rows:
        print(f"{depth:>9} | {chains:>8} | {100 * chains / total_chains:>5.1f}% | {posts:>14}")
    print("-" * 48)
    print(f"{'totale':>9} | {total_chains:>8} |        | {total_posts:>14}")
    print(f"\nlunghezza massima: {rows[-1][0]}")
    media = sum(d * c for d, c, _ in rows) / total_chains
    print(f"lunghezza media (incluse catene da 1): {media:.2f}")
    multi = sum(c for d, c, _ in rows if d >= 2)
    print(f"catene con almeno 2 livelli: {multi} ({100 * multi / total_chains:.1f}%)")


if __name__ == "__main__":
    main()

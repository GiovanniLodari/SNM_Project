import psycopg2.extensions


def count_posts(conn: psycopg2.extensions.connection) -> int:
    """Post non cancellati (stesso filtro usato altrove nel progetto)."""
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM statuses WHERE deleted_at IS NULL")
        (n,) = cur.fetchone()
    return n


def count_follows(conn: psycopg2.extensions.connection) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM follows")
        (n,) = cur.fetchone()
    return n

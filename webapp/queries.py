import psycopg2.extensions

from snm.analysis.export_texts import clean_html


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


_POST_SELECT = """
    SELECT s.id, s.language, s.content, s.created_at, a.acct, a.bot, i.domain
    FROM statuses s
    JOIN accounts a ON a.id = s.account_id
    JOIN instances i ON i.id = s.instance_id
    WHERE s.deleted_at IS NULL
"""


def _row_to_post(row) -> dict:
    status_id, language, content, created_at, acct, bot, domain = row
    return {
        "id": status_id,
        "language": language,
        "content": clean_html(content or ""),
        "created_at": created_at,
        "acct": acct,
        "bot": bot,
        "domain": domain,
    }


def list_posts(
    conn: psycopg2.extensions.connection, langs: list[str] | None, offset: int, limit: int,
) -> list[dict]:
    lang_clause = "AND s.language = ANY(%s)" if langs else ""
    params: tuple = (langs, limit, offset) if langs else (limit, offset)
    with conn.cursor() as cur:
        cur.execute(
            f"{_POST_SELECT} {lang_clause} ORDER BY s.id LIMIT %s OFFSET %s",
            params,
        )
        return [_row_to_post(row) for row in cur.fetchall()]


def distinct_languages(conn: psycopg2.extensions.connection) -> list[str]:
    """Lingue distinte tra i post non cancellati, per popolare le checkbox
    filtro lingua nella webapp (evita di dover indovinare il codice lingua
    esatto - es. 'it' non 'ita')."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT language FROM statuses "
            "WHERE deleted_at IS NULL AND language IS NOT NULL ORDER BY language"
        )
        return [row[0] for row in cur.fetchall()]




def get_post(conn: psycopg2.extensions.connection, post_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(f"{_POST_SELECT} AND s.id = %s", (post_id,))
        row = cur.fetchone()
    return _row_to_post(row) if row else None


def get_posts_by_ids(conn: psycopg2.extensions.connection, ids: list[int]) -> dict[int, dict]:
    if not ids:
        return {}
    with conn.cursor() as cur:
        cur.execute(f"{_POST_SELECT} AND s.id = ANY(%s)", (ids,))
        rows = cur.fetchall()
    return {row[0]: _row_to_post(row) for row in rows}


def status_ids_matching_content(
    conn: psycopg2.extensions.connection, term: str,
) -> set[int]:
    """Id degli status il cui contenuto contiene `term` (senza distinzione di
    maiuscole).

    Serve a filtrare *prima* di paginare. L'alternativa - scaricare i contenuti
    di tutte le righe candidate e cercare in Python - non e' praticabile: gli
    id da passare sarebbero decine di migliaia e su SQLite `= ANY(%s)` viene
    espanso in un `IN (?, ?, ...)` che sfonda il limite di parametri. Qui la
    query ha un solo parametro e il confronto lo fa il database.

    I metacaratteri LIKE nel termine sono neutralizzati con ESCAPE, altrimenti
    una ricerca di '_' o '%' scritta dall'utente si comporterebbe da jolly.
    """
    if not term.strip():
        return set()
    pattern = term.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    with conn.cursor() as cur:
        cur.execute(
            "SELECT s.id FROM statuses s "
            "WHERE s.deleted_at IS NULL AND lower(s.content) LIKE %s ESCAPE '\\'",
            (f"%{pattern}%",),
        )
        return {row[0] for row in cur.fetchall()}


def count_accounts_by_bot(conn: psycopg2.extensions.connection) -> dict[bool, int]:
    with conn.cursor() as cur:
        cur.execute("SELECT bot, COUNT(*) FROM accounts GROUP BY bot")
        rows = cur.fetchall()
    counts = {False: 0, True: 0}
    counts.update(dict(rows))
    return counts


def get_account_ids_for_statuses(
    conn: psycopg2.extensions.connection, status_ids: list[int],
) -> dict[int, int]:
    if not status_ids:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, account_id FROM statuses WHERE id = ANY(%s) AND deleted_at IS NULL", (status_ids,),
        )
        return dict(cur.fetchall())


def get_account_bot_flags(
    conn: psycopg2.extensions.connection, account_ids: list[int],
) -> dict[int, bool]:
    if not account_ids:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, bot FROM accounts WHERE id = ANY(%s)", (account_ids,),
        )
        return dict(cur.fetchall())

import heapq
import threading
import time
from statistics import median

import psycopg2.extensions

from snm.analysis.export_texts import clean_html
from snm.storage.viste import vista_popolata

_distinct_langs_cache: tuple[float, list[str]] = (0.0, [])
_distinct_langs_lock = threading.Lock()


def _righe_da_vista(conn, vista: str, sql: str, params: tuple = ()) -> list | None:
    """Righe lette da una vista materializzata, o `None` se non e' leggibile.

    `None` e non una lista vuota: "la vista non c'e'" e "la vista dice zero" sono
    due cose diverse, e chi chiama deve poter ricadere sulla query dal vivo nel
    primo caso e fidarsi dello zero nel secondo. Confonderle mostrerebbe zero
    post su un corpus da 1,8 milioni, che e' il modo peggiore di essere lenti.

    Una vista non e' leggibile in tre casi, tutti legittimi: siamo su SQLite, il
    database e' nuovo e nessuno ha ancora chiamato `aggiorna_viste`, oppure lo
    schema e' stato appena aggiornato e le viste esistono `WITH NO DATA`.
    """
    if not vista_popolata(conn, vista):
        return None
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def count_posts(conn: psycopg2.extensions.connection) -> int:
    """Post non cancellati (stesso filtro usato altrove nel progetto)."""
    righe = _righe_da_vista(conn, "mv_corpus_totali", "SELECT posts_total FROM mv_corpus_totali")
    if righe:
        return righe[0][0]
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

_POST_COUNT = """
    SELECT COUNT(*)
    FROM statuses s
    JOIN accounts a ON a.id = s.account_id
    WHERE s.deleted_at IS NULL
"""

# Ordinamenti ammessi per l'elenco dei post. E' una mappa chiusa e non una
# stringa che arriva dalla richiesta: l'ORDER BY non puo' essere parametrizzato
# da psycopg2, quindi interpolarvi un valore dell'utente sarebbe injection.
# `created_at` puo' essere NULL sui post importati senza data: NULLS LAST li
# tiene in coda invece di farli comparire in cima come se fossero i piu'
# recenti.
POST_ORDERS: dict[str, str] = {
    "archivio": "s.id ASC",
    "recenti": "s.created_at DESC NULLS LAST, s.id DESC",
    "vecchi": "s.created_at ASC NULLS LAST, s.id ASC",
}
DEFAULT_POST_ORDER = "archivio"

# Chi ha scritto il post: entrambe le voci filtrano su accounts.bot, che e' la
# dichiarazione del profilo - non il giudizio di un rilevatore.
POST_AUTHORS = ("tutti", "bot", "umani")


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


def _escape_like(term: str) -> str:
    """Neutralizza i metacaratteri di LIKE. Va usato con ESCAPE '\\': senza,
    una ricerca di "100%" corrisponderebbe a qualunque testo."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _post_filters(
    langs: list[str] | None, search: str | None, author: str | None,
) -> tuple[str, list]:
    """Clausole AND e parametri comuni all'elenco e al conteggio dei post.

    Elenco e conteggio devono filtrare in modo identico, altrimenti il totale
    mostrato accanto ai risultati non e' il totale di quei risultati: da qui
    l'unico punto in cui i filtri sono scritti.
    """
    clauses: list[str] = []
    params: list = []

    if langs:
        clauses.append("s.language = ANY(%s)")
        params.append(langs)

    term = (search or "").strip()
    if term:
        # Il contenuto in tabella e' ancora HTML (viene ripulito in lettura, da
        # `_row_to_post`): la ricerca puo' quindi agganciare anche il markup.
        # E' il comportamento che il resto del progetto ha gia', e restringerlo
        # richiederebbe un indice sul testo ripulito.
        clauses.append("s.content ILIKE %s ESCAPE '\\'")
        params.append(f"%{_escape_like(term)}%")

    if author in ("bot", "umani"):
        clauses.append("a.bot = %s")
        params.append(author == "bot")

    return ("".join(f" AND {c}" for c in clauses), params)


def list_posts(
    conn: psycopg2.extensions.connection,
    langs: list[str] | None,
    offset: int,
    limit: int,
    search: str | None = None,
    author: str | None = None,
    order: str | None = None,
) -> list[dict]:
    where, params = _post_filters(langs, search, author)
    order_by = POST_ORDERS.get(order or DEFAULT_POST_ORDER, POST_ORDERS[DEFAULT_POST_ORDER])
    with conn.cursor() as cur:
        cur.execute(
            f"{_POST_SELECT} {where} ORDER BY {order_by} LIMIT %s OFFSET %s",
            (*params, limit, offset),
        )
        return [_row_to_post(row) for row in cur.fetchall()]


def count_posts_matching(
    conn: psycopg2.extensions.connection,
    langs: list[str] | None,
    search: str | None = None,
    author: str | None = None,
) -> int:
    """Quanti post soddisfano i filtri, non solo quelli della pagina corrente."""
    where, params = _post_filters(langs, search, author)
    # Senza filtri il totale dei risultati e' il totale del corpus, che la vista
    # dei riepiloghi ha gia'. E' il caso piu' frequente - la prima apertura
    # dell'archivio non filtra nulla - e costava un secondo di scansione per
    # riscoprire un numero noto. Con dei filtri si conta davvero: nessuna vista
    # puo' anticipare una ricerca a testo libero.
    if not where:
        return count_posts(conn)
    with conn.cursor() as cur:
        cur.execute(f"{_POST_COUNT} {where}", tuple(params))
        (n,) = cur.fetchone()
    return n


def distinct_languages(conn: psycopg2.extensions.connection) -> list[str]:
    """Lingue distinte tra i post non cancellati, per popolare le checkbox
    filtro lingua nella webapp. Risultato memorizzato in cache per 300 secondi."""
    global _distinct_langs_cache
    now = time.monotonic()
    with _distinct_langs_lock:
        ts, cached = _distinct_langs_cache
        if cached and (now - ts) < 300:
            return list(cached)
    righe = _righe_da_vista(
        conn, "mv_corpus_lingue", "SELECT language FROM mv_corpus_lingue ORDER BY language",
    )
    if righe is None:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT language FROM statuses "
                "WHERE deleted_at IS NULL AND language IS NOT NULL ORDER BY language"
            )
            righe = cur.fetchall()
    langs = [row[0] for row in righe]
    with _distinct_langs_lock:
        _distinct_langs_cache = (now, langs)
    return langs


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
    rows = _righe_da_vista(conn, "mv_accounts_per_bot", "SELECT bot, accounts FROM mv_accounts_per_bot")
    if rows is None:
        with conn.cursor() as cur:
            cur.execute("SELECT bot, COUNT(*) FROM accounts GROUP BY bot")
            rows = cur.fetchall()
    counts = {False: 0, True: 0}
    counts.update({bool(bot): n for bot, n in rows})
    return counts


def get_all_active_status_account_mappings(conn: psycopg2.extensions.connection) -> dict[int, int]:
    """Mappatura id status -> account_id per tutti i post attivi nel database."""
    with conn.cursor() as cur:
        cur.execute("SELECT id, account_id FROM statuses WHERE deleted_at IS NULL")
        return dict(cur.fetchall())


def get_account_ids_for_statuses(
    conn: psycopg2.extensions.connection, status_ids: list[int],
) -> dict[int, int]:
    if not status_ids:
        return {}
    if len(status_ids) > 5000:
        all_map = get_all_active_status_account_mappings(conn)
        sid_set = set(status_ids)
        return {sid: aid for sid, aid in all_map.items() if sid in sid_set}
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, account_id FROM statuses WHERE id = ANY(%s) AND deleted_at IS NULL", (status_ids,),
        )
        return dict(cur.fetchall())


def count_posts_by_bot(conn: psycopg2.extensions.connection) -> dict[bool, int]:
    """Post non cancellati divisi per dichiarazione bot dell'autore."""
    rows = _righe_da_vista(conn, "mv_posts_per_bot", "SELECT bot, posts FROM mv_posts_per_bot")
    if rows is None:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT a.bot, COUNT(*) FROM statuses s "
                "JOIN accounts a ON a.id = s.account_id "
                "WHERE s.deleted_at IS NULL GROUP BY a.bot"
            )
            rows = cur.fetchall()
    counts = {False: 0, True: 0}
    counts.update({bool(bot): n for bot, n in rows})
    return counts


# Quante voci mostrare nelle classifiche (lingue, istanze, account). Oltre la
# decina la coda e' fatta di valori troppo piccoli per essere confrontati a
# occhio, e la tabella smette di dire qualcosa.
TOP_LINGUE = 10
TOP_ISTANZE = 12
TOP_ACCOUNT = 10


def corpus_composition(conn: psycopg2.extensions.connection) -> dict:
    """Di che cosa e' fatto il corpus: volumi, arco temporale, lingue, istanze.

    Serve all'apertura del capitolo sul corpus, dove la domanda non e' "quali
    post ci sono" ma "che materiale e' questo": senza queste cifre l'elenco dei
    post e' una finestra su qualcosa di cui non si conosce la forma.
    """
    # Ogni blocco prova la propria vista e ricade sulla query dal vivo se manca:
    # indipendentemente, non in blocco, cosi' un aggiornamento interrotto a metà
    # fa comunque risparmiare le viste che ha fatto in tempo a ricalcolare.
    #
    # L'ORDER BY e il LIMIT restano qui e non nella vista: ordinare un centinaio
    # di righe costa nulla, e una vista che porta solo le prime dieci lingue
    # renderebbe impossibile cambiare TOP_LINGUE senza ricalcolarla.
    totali = _righe_da_vista(
        conn, "mv_corpus_totali",
        """SELECT posts_total, authors_total, instances_total,
                  first_post_at, last_post_at, posts_senza_lingua
           FROM mv_corpus_totali""",
    )
    lingue_righe = _righe_da_vista(
        conn, "mv_corpus_lingue",
        "SELECT language, posts FROM mv_corpus_lingue ORDER BY posts DESC, language LIMIT %s",
        (TOP_LINGUE,),
    )
    istanze_righe = _righe_da_vista(
        conn, "mv_corpus_istanze",
        """SELECT domain, posts, accounts, bot_posts FROM mv_corpus_istanze
           ORDER BY posts DESC, domain LIMIT %s""",
        (TOP_ISTANZE,),
    )

    with conn.cursor() as cur:
        if totali:
            posts, autori, istanze, primo, ultimo, senza_lingua = totali[0]
        else:
            cur.execute(
                """
                SELECT COUNT(*),
                       COUNT(DISTINCT s.account_id),
                       COUNT(DISTINCT s.instance_id),
                       MIN(s.created_at),
                       MAX(s.created_at),
                       COUNT(*) FILTER (WHERE s.language IS NULL)
                FROM statuses s
                WHERE s.deleted_at IS NULL
                """
            )
            posts, autori, istanze, primo, ultimo, senza_lingua = cur.fetchone()

        if lingue_righe is None:
            cur.execute(
                """
                SELECT s.language, COUNT(*)
                FROM statuses s
                WHERE s.deleted_at IS NULL AND s.language IS NOT NULL
                GROUP BY s.language
                ORDER BY COUNT(*) DESC, s.language
                LIMIT %s
                """,
                (TOP_LINGUE,),
            )
            lingue_righe = cur.fetchall()

        if istanze_righe is None:
            cur.execute(
                """
                SELECT i.domain,
                       COUNT(*) AS posts,
                       COUNT(DISTINCT s.account_id) AS accounts,
                       COUNT(*) FILTER (WHERE a.bot) AS bot_posts
                FROM statuses s
                JOIN instances i ON i.id = s.instance_id
                JOIN accounts a ON a.id = s.account_id
                WHERE s.deleted_at IS NULL
                GROUP BY i.domain
                ORDER BY posts DESC, i.domain
                LIMIT %s
                """,
                (TOP_ISTANZE,),
            )
            istanze_righe = cur.fetchall()

    lingue = [{"lang": lang, "posts": n} for lang, n in lingue_righe]
    domini = [
        {"domain": domain, "posts": posts_n, "accounts": acc_n, "bot_posts": bot_n}
        for domain, posts_n, acc_n, bot_n in istanze_righe
    ]

    per_bot = count_posts_by_bot(conn)

    return {
        "posts_total": posts,
        "authors_total": autori,
        "instances_total": istanze,
        "first_post_at": primo,
        "last_post_at": ultimo,
        "posts_bot": per_bot[True],
        "posts_human": per_bot[False],
        "posts_senza_lingua": senza_lingua,
        "lingue": lingue,
        "istanze": domini,
    }


# I contatori del profilo Mastodon vivono dentro `accounts.raw`, che e' JSONB
# non validato: il campo puo' mancare, essere null o non essere un numero. Il
# CASE e' cio' che permette il cast senza far fallire l'intera query su una
# riga malformata, e a differenza di un filtro nella WHERE garantisce che il
# cast non venga mai valutato su un valore che non passa il controllo.
_FOLLOWERS_NUM = "(a.raw->>'followers_count') ~ '^[0-9]+$'"
_FOLLOWERS_CAST = "(a.raw->>'followers_count')::bigint"
_FOLLOWERS = f"CASE WHEN {_FOLLOWERS_NUM} THEN {_FOLLOWERS_CAST} END"

# Tetto di plausibilita' per i follower dichiarati.
#
# Il campo lo scrive l'istanza remota e nessuno lo verifica: nei dati reali
# compaiono profili che ne dichiarano oltre otto miliardi - piu' della
# popolazione mondiale - e altri fermi esatti a 2147483647, che e' il massimo di
# un intero a 32 bit, cioe' un guasto e non una misura. Lasciarli passare
# metterebbe in cima alla classifica dei "piu' seguiti" proprio i profili di cui
# il dato non vale nulla, e sposterebbe il massimo di ordini di grandezza.
#
# Dieci milioni e' comodamente sopra qualunque account reale del Fediverso, che
# nel suo insieme conta utenti nell'ordine delle decine di milioni: taglia i
# valori impossibili senza toccare quelli soltanto grandi. Gli scartati vengono
# contati e dichiarati, non fatti sparire in silenzio.
MAX_FOLLOWERS_PLAUSIBILI = 10_000_000


def accounts_population(conn: psycopg2.extensions.connection) -> dict:
    """Popolazione degli account: dove stanno, quanti pubblicano, quanto pesano.

    I follower vengono dal profilo dichiarato all'istanza (`accounts.raw`), non
    dagli archi di follow raccolti: sono due misure diverse e la seconda copre
    solo la porzione di rete che il crawler ha percorso.
    """
    istanze_righe = _righe_da_vista(
        conn, "mv_accounts_istanze",
        """SELECT domain, accounts, bot_accounts FROM mv_accounts_istanze
           ORDER BY accounts DESC, domain LIMIT %s""",
        (TOP_ISTANZE,),
    )
    con_post_righe = _righe_da_vista(
        conn, "mv_accounts_con_post", "SELECT accounts_con_post FROM mv_accounts_con_post",
    )

    with conn.cursor() as cur:
        if istanze_righe is None:
            cur.execute(
                """
                SELECT i.domain,
                       COUNT(*) AS accounts,
                       COUNT(*) FILTER (WHERE a.bot) AS bot_accounts
                FROM accounts a
                JOIN instances i ON i.id = a.instance_id
                GROUP BY i.domain
                ORDER BY accounts DESC, i.domain
                LIMIT %s
                """,
                (TOP_ISTANZE,),
            )
            istanze_righe = cur.fetchall()

        if con_post_righe:
            (con_post,) = con_post_righe[0]
        else:
            cur.execute(
                "SELECT COUNT(DISTINCT account_id) FROM statuses WHERE deleted_at IS NULL"
            )
            (con_post,) = cur.fetchone()

    istanze = [
        {"domain": domain, "accounts": n, "bot_accounts": bot_n}
        for domain, n, bot_n in istanze_righe
    ]

    follower_per_bot, candidati = _statistiche_follower(conn)
    piu_seguiti = _classifica_piu_seguiti(conn, candidati)

    # Entrambe le categorie esistono sempre, anche vuote: `_statistiche_follower`
    # parte da un dizionario con tutte e due le chiavi, cosi' una categoria senza
    # dati arriva al frontend come zero account e mediana nulla invece che come
    # campo mancante.
    return {
        "accounts_con_post": con_post,
        "istanze": istanze,
        "followers_bot": follower_per_bot[True],
        "followers_human": follower_per_bot[False],
        "piu_seguiti": piu_seguiti,
    }


# Quanti account tenere come candidati alla classifica dei piu' seguiti. Piu'
# dei dieci mostrati, perche' lo stesso profilo remoto e' archiviato una volta
# per ogni istanza da cui il crawler lo incontra e i doppioni si riconoscono
# solo dopo, quando si hanno gli handle.
_CANDIDATI_PIU_SEGUITI = 60


def _statistiche_follower(
    conn: psycopg2.extensions.connection,
) -> tuple[dict[bool, dict], list[int]]:
    """Statistiche sui follower dichiarati, in un unico passaggio sulla tabella.

    Restituisce le cifre per categoria e gli id dei candidati alla classifica.

    Estrarre `followers_count` da `raw` significa leggere un documento JSONB per
    ogni account - su 660 mila profili sono una decina di secondi - quindi va
    fatto una volta sola. Prima erano due interrogazioni separate, e la mediana
    ne aggiungeva altri trenta: `percentile_cont` ordina l'intera colonna, e con
    la memoria di lavoro predefinita quell'ordinamento finisce su disco. In
    memoria, sulle stesse cifre, costa una frazione di secondo.
    """
    valori: dict[bool, list[int]] = {False: [], True: []}
    scartati: dict[bool, int] = {False: 0, True: 0}
    # Heap dei candidati: (follower, id). Il minimo in cima e' quello da
    # sostituire, cosi' la scansione non tiene in memoria l'intera colonna
    # ordinata per trovarne i primi sessanta.
    candidati: list[tuple[int, int]] = []

    # La vista porta `followers` gia' estratto e castato: la scansione legge
    # righe strette invece di aprire 660 mila documenti JSONB, che era la voce
    # piu' costosa dell'intera applicazione. La logica qui sotto - tetto di
    # plausibilita', mediana, heap dei candidati - non cambia di una riga: la
    # vista sostituisce la *sorgente*, non il calcolo, cosi' le cifre restano
    # identiche a quelle che il progetto ha sempre mostrato.
    ha_vista = vista_popolata(conn, "mv_account_followers")
    sorgente = (
        "SELECT account_id, bot, followers FROM mv_account_followers"
        if ha_vista
        else f"SELECT a.id, a.bot, {_FOLLOWERS} AS followers FROM accounts a"
    )

    with conn.cursor() as cur:
        cur.execute(sorgente)
        for account_id, bot, followers in cur:
            if followers is None:
                continue
            categoria = bool(bot)
            if followers > MAX_FOLLOWERS_PLAUSIBILI:
                scartati[categoria] += 1
                continue
            valori[categoria].append(followers)
            if len(candidati) < _CANDIDATI_PIU_SEGUITI:
                heapq.heappush(candidati, (followers, account_id))
            elif followers > candidati[0][0]:
                heapq.heapreplace(candidati, (followers, account_id))

    statistiche = {
        categoria: {
            "accounts": len(numeri),
            "mediana": median(numeri) if numeri else None,
            "massimo": max(numeri) if numeri else None,
            "scartati": scartati[categoria],
        }
        for categoria, numeri in valori.items()
    }
    ordinati = sorted(candidati, reverse=True)
    return statistiche, [account_id for _, account_id in ordinati]


def _classifica_piu_seguiti(
    conn: psycopg2.extensions.connection, candidati: list[int],
) -> list[dict]:
    """I profili piu' seguiti, uno per handle.

    I candidati arrivano gia' ordinati e sono poche decine: qui si recuperano i
    loro dati anagrafici - una lettura per chiave primaria - e si scartano i
    doppioni. Senza questo passaggio la classifica mostrava tre volte lo stesso
    account, che occupava tre posizioni su dieci con un solo nome.
    """
    if not candidati:
        return []

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT a.id, a.acct, a.bot, i.domain, {_FOLLOWERS} AS followers
            FROM accounts a
            JOIN instances i ON i.id = a.instance_id
            WHERE a.id = ANY(%s)
            """,
            (candidati,),
        )
        per_id = {row[0]: row for row in cur.fetchall()}

    visti: set[str] = set()
    classifica: list[dict] = []
    for account_id in candidati:
        riga = per_id.get(account_id)
        if riga is None:
            continue
        _, acct, bot, domain, followers = riga
        if acct in visti:
            continue
        visti.add(acct)
        classifica.append({
            "id": account_id,
            "acct": acct,
            "bot": bool(bot),
            "domain": domain,
            "followers": followers,
        })
        if len(classifica) == TOP_ACCOUNT:
            break
    return classifica


def get_accounts_by_ids(
    conn: psycopg2.extensions.connection, account_ids: list[int],
) -> dict[int, dict]:
    """Anagrafica degli account indicati, per dare un nome alle classifiche
    costruite altrove sui soli id."""
    if not account_ids:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            f"""
            WITH profili AS (
                SELECT a.id, a.acct, a.bot, i.domain, {_FOLLOWERS} AS followers,
                       (SELECT COUNT(*) FROM statuses s
                         WHERE s.account_id = a.id AND s.deleted_at IS NULL) AS posts
                FROM accounts a
                JOIN instances i ON i.id = a.instance_id
                WHERE a.id = ANY(%s)
            )
            SELECT id, acct, bot, domain,
                   -- Oltre il tetto il dato e' dichiarato assente, non grande:
                   -- vedi MAX_FOLLOWERS_PLAUSIBILI.
                   CASE WHEN followers <= %s THEN followers END AS followers,
                   posts
            FROM profili
            """,
            (account_ids, MAX_FOLLOWERS_PLAUSIBILI),
        )
        return {
            row[0]: {
                "id": row[0],
                "acct": row[1],
                "bot": bool(row[2]),
                "domain": row[3],
                "followers": row[4],
                "posts": row[5],
            }
            for row in cur.fetchall()
        }


def get_account_bot_flags(
    conn: psycopg2.extensions.connection, account_ids: list[int],
) -> dict[int, bool]:
    if not account_ids:
        return {}
    if len(account_ids) > 5000:
        with conn.cursor() as cur:
            cur.execute("SELECT id, bot FROM accounts")
            all_bots = dict(cur.fetchall())
            aid_set = set(account_ids)
            return {aid: all_bots[aid] for aid in aid_set if aid in all_bots}
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, bot FROM accounts WHERE id = ANY(%s)", (account_ids,),
        )
        return dict(cur.fetchall())

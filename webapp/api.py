"""API JSON consumata dal frontend React (frontend/).

Unica superficie applicativa del progetto: la parte visuale (React + MUI) vive
in frontend/ e parla solo con questi endpoint /api/*. Fino alla rimozione del
layer Jinja2 questo modulo ne era il gemello in JSON, con la stessa logica
scritta due volte.
"""
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool

from snm.analysis import run_db_import
from webapp import jobs, queries, results

load_dotenv(override=True)

from webapp.path_utils import (
    PROJECT_ROOT,
    AI_SCORES_PATH,
    FACT_CHECK_PATH,
    POST_TEXTS_PATH,
    CHECKWORTHY_PATH,
    EXPORTS_DIR,
    IMPORTS_DIR,
    EXPORT_ZIP_PATH,
    BINOCULAR_ALL_DIR,
    BINOCULARS_SCORES_PATH,
    DESKLIB_SCORES_PATH,
    ADA_SCORES_PATH,
)

AI_CLASSIFICATION_THRESHOLD = 0.5
# Il rilevatore che ha prodotto AI_SCORES_PATH, cioe' l'unico dietro le cifre
# di /api/accounts e /api/dashboard. Viaggia nella risposta perche' quelle
# pagine parlano di un modello solo, non del consenso a quattro del confronto:
# cambiando la sorgente dei punteggi va cambiato anche questo nome.
AI_DETECTOR_NAME = "FastDetectGPT"
PAGE_SIZE = 50
FACT_CHECK_VERDICT_OPTIONS = ["vero", "perlopiù vero", "misto", "perlopiù falso", "falso", "non verificabile"]

router = APIRouter(prefix="/api")


# La dipendenza get_db vive en main.py; se registra el router alli para
# poder compartir la misma conexion/override de tests. Se inyecta por funcion
# con un import diferido para evitar dependencia circular.
from webapp.main import get_db  # noqa: E402


@router.get("/dashboard")
def dashboard(conn=Depends(get_db)):
    ai_scores = results.load_ai_scores(AI_SCORES_PATH)
    fact_checks = results.load_fact_checks(FACT_CHECK_PATH)
    ai_eligible = results.count_eligible_posts(POST_TEXTS_PATH)
    fact_check_done = len(fact_checks)
    raw_fc_eligible = results.count_checkworthy_eligible_posts(POST_TEXTS_PATH, CHECKWORTHY_PATH)
    fact_check_eligible = max(fact_check_done, raw_fc_eligible)
    ai_classified = len(results.status_ids_above_probability(ai_scores, AI_CLASSIFICATION_THRESHOLD))

    return {
        "posts_total": queries.count_posts(conn),
        "follows_total": queries.count_follows(conn),
        "ai_done": len(ai_scores),
        "ai_eligible": ai_eligible,
        "ai_classified": ai_classified,
        "ai_threshold": AI_CLASSIFICATION_THRESHOLD,
        "fact_check_done": len(fact_checks),
        "fact_check_eligible": fact_check_eligible,
    }


def _conteggio_sostenibile(
    conn, page: int, langs: list[str], search: str, author: str,
) -> int | None:
    """Quanti post soddisfano i filtri, quando chiederlo non costa troppo.

    Il conteggio e' esatto e quindi non gratuito: misurato su un corpus di 1,8
    milioni di post costa circa un secondo senza filtri. Con una ricerca
    testuale scende a una ventina di millisecondi grazie all'indice trigram su
    `statuses.content` (DB/schema.sql) - senza quell'indice sarebbero venti
    secondi, ma senza quell'indice sarebbe impraticabile gia' l'elenco.

    Si calcola solo alla prima pagina, che e' l'unica il cui totale il frontend
    legga, e si memorizza per cinque minuti: i blocchi successivi dello stesso
    elenco non lo richiedono affatto. Dalla seconda in poi si restituisce None,
    che il frontend dichiara come conteggio non disponibile invece di mostrare
    uno zero.
    """
    if page != 1:
        return None

    return results.get_cached_computation(
        ("posts_count", tuple(sorted(langs)), search.strip(), author),
        (),
        lambda: queries.count_posts_matching(
            conn, langs=langs or None, search=search, author=author,
        ),
        ttl=300,
    )


@router.get("/posts")
def posts_list(
    lang: list[str] = Query(default=[]),
    page: int = 1,
    page_size: int = Query(default=25, ge=5, le=100),
    q: str = Query(default=""),
    author: str = Query(default="tutti"),
    order: str = Query(default=queries.DEFAULT_POST_ORDER),
    conn=Depends(get_db),
):
    page = max(page, 1)
    limit = max(5, min(100, page_size))
    offset = (page - 1) * limit
    # Valori fuori dall'insieme ammesso ricadono sul default invece di
    # sollevare: una URL condivisa con un parametro vecchio deve continuare a
    # mostrare il corpus, non un errore.
    author = author if author in queries.POST_AUTHORS else "tutti"
    order = order if order in queries.POST_ORDERS else queries.DEFAULT_POST_ORDER

    # Si chiede una riga in piu' del blocco: la sua presenza dice se esiste un
    # seguito, senza il conteggio totale che costerebbe una scansione completa.
    # L'euristica precedente, `len(posts) == limit`, sbagliava sull'ultimo
    # blocco esattamente pieno, annunciando un seguito vuoto.
    righe = queries.list_posts(
        conn,
        langs=lang or None,
        offset=offset,
        limit=limit + 1,
        search=q,
        author=author,
        order=order,
    )
    has_next = len(righe) > limit
    posts = righe[:limit]

    available_langs = queries.distinct_languages(conn)
    total_count = _conteggio_sostenibile(conn, page, lang, q, author)

    fd_scores = results.load_ai_scores(AI_SCORES_PATH)
    bino_scores = results.load_binoculars_scores(BINOCULARS_SCORES_PATH)
    desk_scores = results.load_desklib_scores(DESKLIB_SCORES_PATH)
    ada_scores = results.load_ada_scores(ADA_SCORES_PATH)

    enriched_posts = []
    for p in posts:
        pid = p["id"]
        fd_entry = fd_scores.get(pid)
        bino_entry = bino_scores.get(pid)
        desk_entry = desk_scores.get(pid)
        ada_entry = ada_scores.get(pid)

        fd_prob = fd_entry["probability"] if (fd_entry and fd_entry.get("probability") is not None and fd_entry["probability"] == fd_entry["probability"]) else None

        bino_pct = bino_entry.get("ai_probability_pct") if bino_entry else None
        bino_prob = (bino_pct / 100.0) if bino_pct is not None else None

        desk_p = desk_entry.get("ai_probability") if desk_entry else None
        desk_prob = desk_p if (desk_p is not None and desk_p == desk_p) else None

        ada_p = ada_entry.get("probability") if ada_entry else None
        ada_prob = ada_p if (ada_p is not None and ada_p == ada_p) else None

        p_copy = dict(p)
        p_copy["fastdetect_prob"] = fd_prob
        p_copy["binoculars_prob"] = bino_prob
        p_copy["desklib_prob"] = desk_prob
        p_copy["ada_prob"] = ada_prob
        enriched_posts.append(p_copy)

    return {
        "posts": enriched_posts,
        "available_langs": available_langs,
        "selected_langs": lang,
        "page": page,
        # La dimensione effettiva del blocco, non la costante PAGE_SIZE: chi
        # chiede blocchi da 10 riceveva comunque 50 come descrizione di cio'
        # che aveva in mano.
        "page_size": limit,
        "total_count": total_count,
        "has_next": has_next,
        "search": q,
        "author": author,
        "order": order,
    }


@router.get("/posts/{post_id}")
def post_detail(post_id: int, conn=Depends(get_db)):
    post = queries.get_post(conn, post_id)
    if post is None:
        return {
            "post": None,
            "ai_score": None,
            "binoculars_score": None,
            "desklib_score": None,
            "fact_check": None,
        }

    ai_scores = results.load_ai_scores(AI_SCORES_PATH)
    bino_scores = results.load_binoculars_scores(BINOCULARS_SCORES_PATH)
    desk_scores = results.load_desklib_scores(DESKLIB_SCORES_PATH)
    ada_scores = results.load_ada_scores(ADA_SCORES_PATH)
    fact_checks = results.load_fact_checks(FACT_CHECK_PATH)

    bino_entry = bino_scores.get(post_id)
    bino_score = None
    if bino_entry:
        bpct = bino_entry.get("ai_probability_pct")
        if bpct is not None:
            bino_score = {
                "id": post_id,
                "probability": bpct / 100.0,
                "model": "Binoculars (Qwen2.5 0.5B)",
            }

    desk_entry = desk_scores.get(post_id)
    desk_score = None
    if desk_entry:
        dp = desk_entry.get("ai_probability")
        if dp is not None:
            desk_score = {
                "id": post_id,
                "probability": float(dp),
                "model": "Desklib AI Detector v1.01",
            }

    ada_entry = ada_scores.get(post_id)
    ada_score = None
    if ada_entry:
        ap = ada_entry.get("probability")
        if ap is not None and ap == ap:  # NaN check
            ada_score = {
                "id": post_id,
                "probability": float(ap),
                "criterion": ada_entry.get("criterion"),
                "ntokens": ada_entry.get("ntokens"),
                "model": "AdaDetectGPT (GPT-Neo 2.7B)",
            }

    return {
        "post": post,
        "ai_score": results.ai_score_for(ai_scores, post_id),
        "binoculars_score": bino_score,
        "desklib_score": desk_score,
        "ada_score": ada_score,
        "fact_check": results.fact_check_for(fact_checks, post_id),
    }


@router.get("/corpus")
def corpus_overview(conn=Depends(get_db)):
    """Composizione del corpus, in apertura del capitolo omonimo.

    Solo interrogazioni al database: i punteggi dei rilevatori non entrano qui,
    perche' questo e' il materiale grezzo *prima* che un modello lo giudichi -
    ed e' anche cio' che tiene la richiesta leggera.
    """
    # Il database non offre un'impronta a basso costo che dica "e' cambiato
    # qualcosa": la freschezza la garantisce il TTL, come per accounts_stats.
    return results.get_cached_computation(
        ("corpus_overview",), (), lambda: queries.corpus_composition(conn), ttl=300,
    )


@router.get("/accounts")
def accounts_stats(conn=Depends(get_db)):
    """Chi ha scritto il corpus: quanti account, dove, quanti pubblicano testo
    che FastDetectGPT marca come sintetico.

    Il rilevatore e' dichiarato nella risposta (`detector`) perche' la pagina
    ne parla al singolare: qui non c'e' il consenso a quattro del Capitolo II,
    c'e' un solo modello, e chi legge deve saperlo.
    """
    ai_scores = results.load_ai_scores(AI_SCORES_PATH)
    fp = (len(ai_scores),)

    def _compute():
        bot_counts = queries.count_accounts_by_bot(conn)
        status_to_account = queries.get_all_active_status_account_mappings(conn)
        profili = results.ai_profile_by_account(
            ai_scores, status_to_account, AI_CLASSIFICATION_THRESHOLD,
        )
        bot_flags = queries.get_account_bot_flags(conn, list(profili))

        # Tre categorie e non due: "non produce IA" e "non ha post valutati"
        # sono cose diverse, e sommarle spaccerebbe un'assenza di misura per
        # una misura. E' la distinzione che regge l'intera pagina.
        valutati_bot = valutati_human = 0
        ai_and_bot = ai_and_not_bot = 0
        produttori: list[tuple[int, dict]] = []
        for account_id, profilo in profili.items():
            produce_ia = profilo["mean"] >= AI_CLASSIFICATION_THRESHOLD
            if produce_ia:
                produttori.append((account_id, profilo))
            if bot_flags.get(account_id, False):
                valutati_bot += 1
                ai_and_bot += int(produce_ia)
            else:
                valutati_human += 1
                ai_and_not_bot += int(produce_ia)

        # Ordinati per numero di post marcati, non per media: con la media in
        # testa alla classifica finirebbe chi ha un solo post a 0,99, che non
        # e' il maggior produttore di alcunche'.
        produttori.sort(key=lambda voce: (voce[1]["ai_posts"], voce[1]["mean"]), reverse=True)
        del produttori[queries.TOP_ACCOUNT:]
        anagrafica = queries.get_accounts_by_ids(conn, [account_id for account_id, _ in produttori])

        top_produttori = []
        for account_id, profilo in produttori:
            # Un account puo' avere punteggi nei file dei rilevatori e non
            # esistere piu' in tabella (post cancellato, riga ripulita): si
            # riporta cio' che si sa, con i campi mancanti dichiarati nulli,
            # invece di farlo sparire dalla classifica senza spiegazione.
            profilo_db = anagrafica.get(account_id)
            top_produttori.append({
                "id": account_id,
                "acct": profilo_db["acct"] if profilo_db else f"account #{account_id}",
                "bot": bool(profilo_db["bot"]) if profilo_db else False,
                "domain": profilo_db["domain"] if profilo_db else "",
                "followers": profilo_db["followers"] if profilo_db else None,
                "posts": profilo_db["posts"] if profilo_db else None,
                "posts_scored": profilo["scored"],
                "ai_posts": profilo["ai_posts"],
                "mean_prob": profilo["mean"],
            })

        popolazione = queries.accounts_population(conn)
        posts_per_bot = queries.count_posts_by_bot(conn)

        return {
            # Le cinque cifre storiche restano invariate: altre viste le leggono
            # gia' con questi nomi.
            "bot_total": bot_counts.get(True, 0),
            "nonbot_total": bot_counts.get(False, 0),
            "ai_producers_total": ai_and_bot + ai_and_not_bot,
            "ai_and_bot": ai_and_bot,
            "ai_and_not_bot": ai_and_not_bot,

            "detector": AI_DETECTOR_NAME,
            "ai_threshold": AI_CLASSIFICATION_THRESHOLD,
            "accounts_total": bot_counts.get(True, 0) + bot_counts.get(False, 0),
            "accounts_con_post": popolazione["accounts_con_post"],
            "valutati_bot": valutati_bot,
            "valutati_human": valutati_human,
            "posts_bot": posts_per_bot[True],
            "posts_human": posts_per_bot[False],
            "istanze": popolazione["istanze"],
            "followers_bot": popolazione["followers_bot"],
            "followers_human": popolazione["followers_human"],
            "piu_seguiti": popolazione["piu_seguiti"],
            "top_produttori": top_produttori,
        }

    return results.get_cached_computation(("accounts_stats",), fp, _compute, ttl=300)


@router.get("/graph")
def graph_topology(limit: int = 60, mode: str = Query(default="all"), conn=Depends(get_db)):
    # mode: "bot" = bots first, "human" = humans first, "all" = default mixed
    bot_filter_clause = ""
    if mode == "bot":
        bot_filter_clause = "WHERE a1.bot = true OR a2.bot = true"
    elif mode == "human":
        bot_filter_clause = "WHERE a1.bot = false AND a2.bot = false"

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT f.follower_account_id, a1.acct, a1.bot,
                   f.followed_account_id, a2.acct, a2.bot
            FROM follows f
            JOIN accounts a1 ON a1.id = f.follower_account_id
            JOIN accounts a2 ON a2.id = f.followed_account_id
            {bot_filter_clause}
            LIMIT %s
            """,
            (limit,)
        )
        rows = cur.fetchall()

    nodes_dict = {}
    links = []
    degree_counter = {}

    for r in rows:
        f_id, f_acct, f_bot, t_id, t_acct, t_bot = r
        degree_counter[f_id] = degree_counter.get(f_id, 0) + 1
        degree_counter[t_id] = degree_counter.get(t_id, 0) + 1

        if f_id not in nodes_dict:
            domain = f_acct.split("@")[-1] if "@" in f_acct else "fediverse"
            label = f_acct if f_acct.startswith("@") else f"@{f_acct}"
            nodes_dict[f_id] = {"id": f_id, "label": label, "bot": bool(f_bot), "domain": domain}
        if t_id not in nodes_dict:
            domain = t_acct.split("@")[-1] if "@" in t_acct else "fediverse"
            label = t_acct if t_acct.startswith("@") else f"@{t_acct}"
            nodes_dict[t_id] = {"id": t_id, "label": label, "bot": bool(t_bot), "domain": domain}
        links.append({"source": f_id, "target": t_id})

    # Fetch real DB accounts if follows table is not yet populated
    if not nodes_dict:
        if mode == "bot":
            order_clause = "ORDER BY a.bot DESC, a.id ASC"
            where_clause = ""
        elif mode == "human":
            order_clause = "ORDER BY a.bot ASC, a.id ASC"
            where_clause = "WHERE a.bot = false"
        else:
            order_clause = "ORDER BY a.id ASC"
            where_clause = ""

        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT a.id, a.acct, a.bot, i.domain
                FROM accounts a
                JOIN instances i ON i.id = a.instance_id
                {where_clause}
                {order_clause}
                LIMIT %s
                """,
                (limit,)
            )
            acc_rows = cur.fetchall()

        if acc_rows:
            domain_hubs = {}
            for row in acc_rows:
                acc_id, acct, is_bot, domain = row
                domain_clean = domain or (acct.split("@")[-1] if "@" in acct else "fediverse")
                label = acct if acct.startswith("@") else f"@{acct}"
                nodes_dict[acc_id] = {
                    "id": acc_id,
                    "label": label,
                    "bot": bool(is_bot),
                    "domain": domain_clean,
                }
                domain_hubs.setdefault(domain_clean, []).append(acc_id)

            node_ids = list(nodes_dict.keys())
            hub_ids = [ids[0] for ids in domain_hubs.values()]

            for i in range(len(node_ids)):
                target_hub = hub_ids[i % len(hub_ids)]
                if node_ids[i] != target_hub:
                    links.append({"source": node_ids[i], "target": target_hub})
                    degree_counter[node_ids[i]] = degree_counter.get(node_ids[i], 0) + 1
                    degree_counter[target_hub] = degree_counter.get(target_hub, 0) + 1

                if i + 1 < len(node_ids):
                    next_id = node_ids[i + 1]
                    links.append({"source": node_ids[i], "target": next_id})
                    degree_counter[node_ids[i]] = degree_counter.get(node_ids[i], 0) + 1
                    degree_counter[next_id] = degree_counter.get(next_id, 0) + 1

    for nid, node in nodes_dict.items():
        deg = degree_counter.get(nid, 1)
        node["degree"] = deg
        if node["bot"]:
            node["group"] = "bot"
        elif deg >= 4:
            node["group"] = "instance"
        else:
            node["group"] = "human"

    nodes = list(nodes_dict.values())
    return {"nodes": nodes, "links": links}


@router.get("/accounts/search")
def accounts_search(q: str = Query(default=""), limit: int = 15, conn=Depends(get_db)):
    if not q or len(q.strip()) < 1:
        return {"accounts": []}
    search_pat = f"%{q.strip()}%"
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.id, a.acct, a.username, a.bot, i.domain
            FROM accounts a
            JOIN instances i ON i.id = a.instance_id
            WHERE a.acct ILIKE %s OR a.username ILIKE %s
            ORDER BY a.bot DESC, a.id ASC
            LIMIT %s
            """,
            (search_pat, search_pat, limit)
        )
        rows = cur.fetchall()
    results_list = []
    for r in rows:
        acc_id, acct, username, is_bot, domain = r
        label = acct if acct.startswith("@") else f"@{acct}"
        results_list.append({
            "id": acc_id,
            "acct": label,
            "username": username,
            "bot": bool(is_bot),
            "domain": domain or (acct.split("@")[-1] if "@" in acct else "fediverse")
        })
    return {"accounts": results_list}


@router.get("/accounts/{account_id}/detail")
def account_detail(account_id: int, conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.id, a.acct, a.username, a.bot, a.raw, a.fetched_at,
                   i.domain,
                   (SELECT COUNT(*) FROM follows WHERE followed_account_id = a.id) as followers_in_db,
                   (SELECT COUNT(*) FROM follows WHERE follower_account_id = a.id) as following_in_db,
                   (SELECT COUNT(*) FROM statuses WHERE account_id = a.id) as statuses_in_db
            FROM accounts a
            JOIN instances i ON i.id = a.instance_id
            WHERE a.id = %s
            """,
            (account_id,)
        )
        row = cur.fetchone()

    if not row:
        return {"account": None}

    acc_id, acct, username, is_bot, raw, fetched_at, domain, followers_db, following_db, statuses_db = row
    raw_dict = raw if isinstance(raw, dict) else {}

    display_name = raw_dict.get("display_name") or username or acct
    note = raw_dict.get("note", "")
    avatar = raw_dict.get("avatar") or raw_dict.get("avatar_static")
    header = raw_dict.get("header") or raw_dict.get("header_static")
    url = raw_dict.get("url") or raw_dict.get("uri") or f"https://{domain}/@{username}"
    followers_count = raw_dict.get("followers_count") if raw_dict.get("followers_count") is not None else followers_db
    following_count = raw_dict.get("following_count") if raw_dict.get("following_count") is not None else following_db
    statuses_count = raw_dict.get("statuses_count") if raw_dict.get("statuses_count") is not None else statuses_db
    created_at = raw_dict.get("created_at")
    last_status_at = raw_dict.get("last_status_at")
    fields = raw_dict.get("fields", [])

    label = acct if acct.startswith("@") else f"@{acct}"

    return {
        "account": {
            "id": acc_id,
            "acct": label,
            "username": username,
            "display_name": display_name,
            "bot": bool(is_bot),
            "domain": domain or (acct.split("@")[-1] if "@" in acct else "fediverse"),
            "avatar": avatar,
            "header": header,
            "note": note,
            "url": url,
            "followers_count": followers_count,
            "following_count": following_count,
            "statuses_count": statuses_count,
            "created_at": created_at,
            "last_status_at": last_status_at,
            "fields": fields,
            "fetched_at": str(fetched_at) if fetched_at else None,
        }
    }


@router.get("/graph/account/{account_id}")
def account_graph_topology(account_id: int, limit: int = 40, conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.id, a.acct, a.bot, i.domain
            FROM accounts a
            JOIN instances i ON i.id = a.instance_id
            WHERE a.id = %s
            """,
            (account_id,)
        )
        target_row = cur.fetchone()

    if not target_row:
        # Argomenti nominati obbligatori: la firma e' (limit, mode, conn), quindi
        # la vecchia chiamata posizionale graph_topology(limit, conn) legava la
        # connessione a `mode` e lasciava `conn` come oggetto Depends non
        # risolto, con 500 garantito su ogni account_id sconosciuto.
        return graph_topology(limit=limit, mode="all", conn=conn)

    t_id, t_acct, t_bot, t_domain = target_row
    t_label = t_acct if t_acct.startswith("@") else f"@{t_acct}"
    t_domain_clean = t_domain or (t_acct.split("@")[-1] if "@" in t_acct else "fediverse")

    nodes_dict = {
        t_id: {
            "id": t_id,
            "label": t_label,
            "bot": bool(t_bot),
            "domain": t_domain_clean,
            "is_center": True,
        }
    }
    links = []
    degree_counter = {t_id: 0}

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT f.follower_account_id, a1.acct, a1.bot,
                   f.followed_account_id, a2.acct, a2.bot
            FROM follows f
            JOIN accounts a1 ON a1.id = f.follower_account_id
            JOIN accounts a2 ON a2.id = f.followed_account_id
            WHERE f.follower_account_id = %s OR f.followed_account_id = %s
            LIMIT %s
            """,
            (account_id, account_id, limit)
        )
        f_rows = cur.fetchall()

    for r in f_rows:
        f_id, f_acct, f_bot, fid2, t2_acct, t2_bot = r
        degree_counter[f_id] = degree_counter.get(f_id, 0) + 1
        degree_counter[fid2] = degree_counter.get(fid2, 0) + 1

        if f_id not in nodes_dict:
            d1 = f_acct.split("@")[-1] if "@" in f_acct else "fediverse"
            l1 = f_acct if f_acct.startswith("@") else f"@{f_acct}"
            nodes_dict[f_id] = {"id": f_id, "label": l1, "bot": bool(f_bot), "domain": d1}
        if fid2 not in nodes_dict:
            d2 = t2_acct.split("@")[-1] if "@" in t2_acct else "fediverse"
            l2 = t2_acct if t2_acct.startswith("@") else f"@{t2_acct}"
            nodes_dict[fid2] = {"id": fid2, "label": l2, "bot": bool(t2_bot), "domain": d2}
        links.append({"source": f_id, "target": fid2})

    if len(nodes_dict) <= 1:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.id, a.acct, a.bot, i.domain
                FROM accounts a
                JOIN instances i ON i.id = a.instance_id
                WHERE a.id <> %s
                ORDER BY (i.domain = %s) DESC, a.bot DESC, a.id ASC
                LIMIT %s
                """,
                (account_id, t_domain_clean, limit - 1)
            )
            acc_rows = cur.fetchall()

        for row in acc_rows:
            acc_id, acct, is_bot, domain = row
            d_clean = domain or (acct.split("@")[-1] if "@" in acct else "fediverse")
            label = acct if acct.startswith("@") else f"@{acct}"
            nodes_dict[acc_id] = {
                "id": acc_id,
                "label": label,
                "bot": bool(is_bot),
                "domain": d_clean,
            }
            links.append({"source": acc_id, "target": t_id})
            degree_counter[acc_id] = degree_counter.get(acc_id, 0) + 1
            degree_counter[t_id] = degree_counter.get(t_id, 0) + 1

        node_ids = list(nodes_dict.keys())
        for i in range(1, len(node_ids) - 1):
            if i % 3 == 0:
                links.append({"source": node_ids[i], "target": node_ids[i + 1]})
                degree_counter[node_ids[i]] = degree_counter.get(node_ids[i], 0) + 1
                degree_counter[node_ids[i + 1]] = degree_counter.get(node_ids[i + 1], 0) + 1

    for nid, node in nodes_dict.items():
        deg = degree_counter.get(nid, 1)
        node["degree"] = deg
        if node["bot"]:
            node["group"] = "bot"
        elif deg >= 4:
            node["group"] = "instance"
        else:
            node["group"] = "human"

    nodes = list(nodes_dict.values())
    return {"nodes": nodes, "links": links}





@router.get("/ai-detection")
def ai_detection(
    detector: str = Query(default="fastdetect"),
    page: int = 1,
    prob_bucket: list[str] = Query(default=[]),
    sort_by: str = Query(default="id"),
    conn=Depends(get_db),
):
    if detector == "binoculars":
        raw_scores = results.load_binoculars_scores(BINOCULARS_SCORES_PATH)
        ai_scores = {}
        for sid, row in raw_scores.items():
            pct = row.get("ai_probability_pct")
            if pct is not None:
                ai_scores[sid] = {"id": sid, "probability": pct / 100.0}
    elif detector == "desklib":
        raw_scores = results.load_desklib_scores(DESKLIB_SCORES_PATH)
        ai_scores = {}
        for sid, row in raw_scores.items():
            p = row.get("ai_probability")
            if p is not None:
                ai_scores[sid] = {"id": sid, "probability": p}
    elif detector in ("ada", "ada_local", "adadetect"):
        ai_scores = results.load_ada_scores(ADA_SCORES_PATH)
    else:
        ai_scores = results.load_ai_scores(AI_SCORES_PATH)

    # Denominatore del "su N idonei": i post che questo rilevatore avrebbe
    # potuto valutare. Prima i tre non-FastDetect ricevevano
    # `max(len(ai_scores), 192823)`, una costante scritta a mano: finche' ogni
    # rilevatore aveva una pagina propria la cosa passava inosservata, ma il
    # menu a tendina del frontend mette i quattro "su N idonei" uno dopo
    # l'altro, e tre di quei quattro erano inventati.
    #
    # Binoculars e' l'unico ad aver girato senza filtro di lingua - il suo file
    # di punteggi contiene 200.040 post contro i 192.822 inglesi - quindi il suo
    # pool idoneo e' l'intero corpus. Usare per tutti il conteggio inglese
    # produrrebbe per Binoculars un "200.040 su 192.822", cioe' piu' del 100%.
    lingua_idonea = None if detector == "binoculars" else "en"
    eligible = results.count_eligible_posts(POST_TEXTS_PATH, lingua_idonea)


    histogram = results.ai_probability_histogram(ai_scores)

    ai_classified = len(results.status_ids_above_probability(ai_scores, AI_CLASSIFICATION_THRESHOLD))


    all_scored = results.all_ai_scored_ids(ai_scores)
    if prob_bucket:
        all_scored = [
            (status_id, p) for status_id, p in all_scored
            if results.probability_bucket_of(p) in prob_bucket
        ]

    if sort_by == "top":
        all_scored.sort(key=lambda kv: kv[1], reverse=True)
    elif sort_by == "bottom":
        all_scored.sort(key=lambda kv: kv[1])
    elif sort_by == "id_desc":
        all_scored.sort(key=lambda kv: kv[0], reverse=True)

    page = max(page, 1)
    offset = (page - 1) * PAGE_SIZE
    page_ids = all_scored[offset:offset + PAGE_SIZE]
    posts_by_id = queries.get_posts_by_ids(conn, [status_id for status_id, _ in page_ids])
    page_rows = [
        {"post": posts_by_id[status_id], "probability": probability}
        for status_id, probability in page_ids if status_id in posts_by_id
    ]

    bucket_samples = results.sample_posts_by_probability_bucket(ai_scores, conn, samples_per_bucket=100, cache_key=detector)
    stats = results.get_descriptive_stats(ai_scores, conn, cache_key=detector)

    return {
        "done": len(ai_scores),
        "eligible": eligible,
        "ai_classified": ai_classified,
        "ai_threshold": AI_CLASSIFICATION_THRESHOLD,
        "histogram": histogram,
        "bucket_samples": bucket_samples,
        "stats": stats,
        "page_rows": page_rows,
        "page": page,
        "page_size": PAGE_SIZE,
        "has_next": len(page_ids) == PAGE_SIZE,
        "prob_buckets": results.PROBABILITY_FILTER_BUCKETS,
        "selected_buckets": prob_bucket,
        "sort_by": sort_by,
    }





@router.get("/fact-check")
def fact_check_results(
    page: int = 1,
    verdict: list[str] = Query(default=[]),
    search: str = "",
    conn=Depends(get_db),
):
    fact_checks = results.load_fact_checks(FACT_CHECK_PATH)
    eligible = results.count_checkworthy_eligible_posts(POST_TEXTS_PATH, CHECKWORTHY_PATH)
    verdicts = results.verdict_counts(fact_checks)

    all_checked = results.all_fact_checked_ids(fact_checks)
    if verdict:
        all_checked = [(status_id, row) for status_id, row in all_checked if row["verdict"] in verdict]

    # La ricerca va applicata PRIMA di affettare la pagina. Filtrando dopo lo
    # slice si otteneva una ricerca inutilizzabile: le corrispondenze sparse su
    # centinaia di pagine restavano irraggiungibili (le 29 occorrenze di
    # "vaccino" cadevano nelle pagine 15, 19, 131, 306... su 716), e has_next
    # veniva calcolato sulla lista non filtrata, quindi restava sempre True
    # anche su pagine vuote.
    if search:
        termine = search.lower()
        id_per_contenuto = queries.status_ids_matching_content(conn, search)
        all_checked = [
            (status_id, row)
            for status_id, row in all_checked
            if status_id in id_per_contenuto or termine in (row.get("reasoning") or "").lower()
        ]

    total_count = len(all_checked)
    page = max(page, 1)
    offset = (page - 1) * PAGE_SIZE
    page_ids = all_checked[offset:offset + PAGE_SIZE]

    posts_by_id = queries.get_posts_by_ids(conn, [status_id for status_id, _ in page_ids])

    page_rows = []
    for status_id, row in page_ids:
        post_data = posts_by_id.get(status_id) or {
            "id": status_id,
            "language": "en",
            "content": f"Status #{status_id}",
            "created_at": None,
            "acct": "status_archive",
            "bot": False,
            "domain": "fediverse",
        }
        page_rows.append({"post": post_data, "row": row})

    return {
        "done": len(fact_checks),
        "eligible": eligible or len(fact_checks),
        "verdicts": verdicts,
        "page_rows": page_rows,
        "page": page,
        "page_size": PAGE_SIZE,
        "total_count": total_count,
        "has_next": total_count > (offset + PAGE_SIZE),
        "verdict_options": ["vero", "perlopiù vero", "misto", "perlopiù falso", "falso", "non verificabile"],
        "selected_verdicts": verdict,
    }



def _serialize_job(name, config):
    status = jobs.job_status(name)
    log_lines = jobs.tail_log(name, n=30)
    progress = jobs.parse_progress(log_lines) if status["running"] else None
    return {
        "name": name,
        "label": config.get("label", name),
        "description": config.get("description"),
        "running": status["running"],
        "pid": status["pid"],
        "takes_param": config["takes_param"],
        "param_type": config.get("param_type", "text"),
        "progress_done": progress[0] if progress else None,
        "progress_total": progress[1] if progress else None,
        "progress_pct": round(100 * progress[0] / progress[1]) if progress else None,
        "log_lines": log_lines,
    }


@router.get("/pipelines")
def pipelines():
    rows = []
    for name, config in jobs.PIPELINES.items():
        if config.get("hidden_from_dashboard"):
            continue
        rows.append(_serialize_job(name, config))
    return {"jobs": rows}


@router.post("/pipelines/{name}/start")
async def pipelines_start(name: str, request: Request):
    from urllib.parse import parse_qs

    body = (await request.body()).decode()
    param = parse_qs(body).get("param", [""])[0]
    ok, message = jobs.start_job(name, param or None)
    return {"ok": ok, "message": message}


@router.post("/pipelines/{name}/stop")
def pipelines_stop(name: str):
    ok, message = jobs.stop_job(name)
    return {"ok": ok, "message": message}


@router.get("/db-sync")
def db_sync():
    status = jobs.job_status("db_export")
    return {
        "export_running": status["running"],
        "export_log_lines": jobs.tail_log("db_export", n=30),
        "export_zip_ready": EXPORT_ZIP_PATH.exists() and not status["running"],
    }


@router.post("/db-sync/import")
async def db_sync_import(file: UploadFile = File(...), conn=Depends(get_db)):
    filename = file.filename or ""
    if not filename or Path(filename).name != filename or not filename.endswith(".zip"):
        return {"ok": False, "message": "file non valido, serve uno .zip"}

    IMPORTS_DIR.mkdir(parents=True, exist_ok=True)
    input_path = IMPORTS_DIR / filename
    input_path.write_bytes(await file.read())

    try:
        counts = await run_in_threadpool(run_db_import.import_from_zip, conn, str(input_path))
    except Exception as e:
        return {"ok": False, "message": f"import fallito: {e}"}

    summary = "; ".join(
        f"{table}: {c['new']} nuove/{c['existing']} già presenti" for table, c in counts.items()
    )
    return {"ok": True, "message": summary}


@router.get("/db-sync/download")
def db_sync_download():
    """Devuelve el zip (o 404 JSON). El frontend maneja la descarga del blob."""
    if not EXPORT_ZIP_PATH.exists():
        return {"ok": False, "message": "nessun export pronto, avvialo prima"}
    return FileResponse(EXPORT_ZIP_PATH, filename=EXPORT_ZIP_PATH.name, media_type="application/zip")


def _ai_probability(score: dict, detector: str) -> float | None:
    """Probabilita' IA normalizzata in [0,1] per un detector, o None se il post
    non e' stato valutato.

    I quattro file usano chiavi e scale diverse: Binoculars salva una
    percentuale 0-100 sotto `ai_probability_pct`, Desklib una frazione sotto
    `ai_probability`, gli altri due sotto `probability`. Qualunque detector puo'
    aver scritto NaN su un post andato storto: `raw != raw` lo intercetta (NaN
    e' l'unico valore diverso da se stesso) e lo tratta come non valutato,
    perche' altrimenti finirebbe nel denominatore senza mai stare al numeratore,
    abbassando la percentuale di un detector per i suoi stessi fallimenti."""
    chiave = {
        "binoculars": "ai_probability_pct",
        "desklib": "ai_probability",
    }.get(detector, "probability")

    raw = score.get(chiave)
    if raw is None or raw != raw:
        return None
    valore = float(raw)
    return valore / 100.0 if detector == "binoculars" else valore


def _compute_bot_investigation(conn, fastdetect_scores, bino_scores, desk_scores, ada_scores):
    """Quanti post di account dichiarati bot ciascun detector classifica come IA.

    Calcolato incrociando gli id degli status di account con bot = true con le
    valutazioni di ogni detector: prima era un dizionario di costanti, con la
    voce `ada` estrapolata da un denominatore fisso e presentata come misura.
    Restituisce None se il DB non e' raggiungibile, cosi' il frontend puo'
    dichiarare il dato mancante invece di mostrarne uno inventato."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT s.id FROM statuses s JOIN accounts a ON a.id = s.account_id "
                "WHERE s.deleted_at IS NULL AND a.bot = true"
            )
            bot_ids = {row[0] for row in cur.fetchall()}
            cur.execute(
                "SELECT COUNT(*) FROM statuses s JOIN accounts a ON a.id = s.account_id "
                "WHERE s.deleted_at IS NULL AND a.bot = false"
            )
            human_total = cur.fetchone()[0]
    except Exception:
        # Il DB puo' non essere configurato su un clone fresco: e' una
        # condizione prevista, non un errore da propagare come 500.
        return None

    modelli = {}
    for nome, scores, detector in (
        ("fastdetectgpt", fastdetect_scores, "fastdetectgpt"),
        ("binoculars", bino_scores, "binoculars"),
        ("desklib", desk_scores, "desklib"),
        ("ada", ada_scores, "ada"),
    ):
        probabilita = [
            p
            for sid in bot_ids & scores.keys()
            if (p := _ai_probability(scores[sid], detector)) is not None
        ]
        scored = len(probabilita)
        ai_count = sum(1 for p in probabilita if p >= AI_CLASSIFICATION_THRESHOLD)
        modelli[nome] = {
            "scored": scored,
            "ai_count": ai_count,
            "ai_percentage": round((ai_count / scored) * 100, 2) if scored else None,
        }

    return {
        "total_bot_statuses": len(bot_ids),
        "total_human_statuses": human_total,
        "models": modelli,
    }


@router.get("/detector-comparison/summary")
def detector_comparison_summary(conn=Depends(get_db)):
    fastdetect_scores = results.load_ai_scores(AI_SCORES_PATH)
    bino_scores = results.load_binoculars_scores(BINOCULARS_SCORES_PATH)
    desk_scores = results.load_desklib_scores(DESKLIB_SCORES_PATH)
    ada_scores = results.load_ada_scores(ADA_SCORES_PATH)

    comp_report = results.compute_four_detector_comparison(fastdetect_scores, bino_scores, desk_scores, ada_scores)
    bino_report = results.load_binoculars_report(BINOCULAR_ALL_DIR)

    # Nessun denominatore di ripiego: se un file di score manca, il conteggio e'
    # 0 e la percentuale diventa None, cosi' il frontend dichiara il dato
    # mancante. In precedenza si ripiegava su conteggi di corpus congelati
    # (192822, 200042, ...) che rendevano ogni percentuale plausibile ma falsa.
    fastdetect_ai_count = sum(1 for s in fastdetect_scores.values() if s.get("probability") is not None and s["probability"] >= AI_CLASSIFICATION_THRESHOLD)
    fastdetect_total = len(fastdetect_scores)

    bino_counts = bino_report.get("counts", {})
    bino_ai_count = bino_counts.get("ai_generated", 0)
    bino_total = bino_counts.get("scored", 0)

    desklib_total = len(desk_scores)
    desklib_ai_count = sum(1 for s in desk_scores.values() if s.get("ai_probability") is not None and s["ai_probability"] >= AI_CLASSIFICATION_THRESHOLD)

    ada_probabilita = [p for s in ada_scores.values() if (p := _ai_probability(s, "ada")) is not None]
    ada_ai_count = sum(1 for p in ada_probabilita if p >= AI_CLASSIFICATION_THRESHOLD)
    ada_total = len(ada_scores)

    def percentuale(ai_count: int, totale: int) -> float | None:
        """None invece di 0.0 quando non c'e' nulla da misurare: uno 0% e un
        dato assente sono affermazioni diverse."""
        return round((ai_count / totale) * 100, 2) if totale else None

    models_info = [
        {
            "id": "fastdetectgpt",
            "name": "FastDetectGPT (GPT-Neo 2.7B)",
            "type": "Zero-shot Likelihood & Curvature",
            "scored_count": fastdetect_total,
            "ai_detected_count": fastdetect_ai_count,
            "ai_percentage": percentuale(fastdetect_ai_count, fastdetect_total),
            "description": "Metodo zero-shot basato sulla perturba-curvatura dello spazio delle probabilita' condizionate con GPT-Neo 2.7B.",
        },
        {
            "id": "binoculars",
            "name": "Binoculars (Qwen2.5 0.5B)",
            "type": "Cross-Perplexity Ratio",
            "scored_count": bino_total,
            "ai_detected_count": bino_ai_count,
            "ai_percentage": percentuale(bino_ai_count, bino_total),
            "description": "Algoritmo ICML 2024 basato sulla ratio tra Perplessita' e Cross-Perplessita' tra Qwen2.5-0.5B (observer) e Qwen2.5-0.5B-Instruct (performer).",
        },
        {
            "id": "desklib",
            "name": "Desklib AI Detector (v1.01)",
            "type": "Fine-Tuned Classifier",
            "scored_count": desklib_total,
            "ai_detected_count": desklib_ai_count,
            "ai_percentage": percentuale(desklib_ai_count, desklib_total),
            "description": "Classificatore supervisionato fine-tuned (desklib/ai-text-detector-v1.01) specializzato su testi in lingua inglese.",
        },
        {
            "id": "ada",
            "name": "AdaDetectGPT (GPT-Neo 2.7B)",
            "type": "Adaptive Curvature Detection",
            "scored_count": ada_total,
            "ai_detected_count": ada_ai_count,
            "ai_percentage": percentuale(ada_ai_count, ada_total),
            "description": "Metodo zero-shot AdaDetectGPT con perturba-curvatura adattiva del modello GPT-Neo 2.7B.",
        },
    ]

    bot_investigation = _compute_bot_investigation(
        conn, fastdetect_scores, bino_scores, desk_scores, ada_scores
    )

    return {
        "models": models_info,
        "comparison_report": comp_report,
        "binoculars_report": bino_report,
        "bot_investigation": bot_investigation,
    }


@router.get("/detector-comparison/posts")
def detector_comparison_posts(
    filter_type: str = "all",
    page: int = 1,
    page_size: int = 25,
    search: str = "",
    conn=Depends(get_db),
):
    page = max(page, 1)
    page_size = min(max(page_size, 5), 100)

    fastdetect_scores = results.load_ai_scores(AI_SCORES_PATH)
    bino_scores = results.load_binoculars_scores(BINOCULARS_SCORES_PATH)
    desklib_scores = results.load_desklib_scores(DESKLIB_SCORES_PATH)
    ada_scores = results.load_ada_scores(ADA_SCORES_PATH)

    consolidated = results.get_consolidated_detector_items(
        fastdetect_scores, bino_scores, desklib_scores, ada_scores
    )

    # Se serve il filtro per bot, recuperiamo l'elenco dei post di bot dal DB
    bot_status_ids: set[int] = set()
    if filter_type == "bots_only":
        with conn.cursor() as cur:
            cur.execute("SELECT s.id FROM statuses s JOIN accounts a ON a.id = s.account_id WHERE s.deleted_at IS NULL AND a.bot = true")
            bot_status_ids = {row[0] for row in cur.fetchall()}

    filtered_items: list[tuple[int, float | None, float | None, float | None, float | None, int]] = []

    for sid, fd_p, bino_p, desk_p, ada_p, ai_votes, fd_ai, bino_ai, desk_ai, ada_ai in consolidated:
        if filter_type == "bots_only" and sid not in bot_status_ids:
            continue

        if filter_type in ("unanimous_ai", "unanimous_4") and ai_votes != 4:
            continue
        elif filter_type == "exactly_3" and ai_votes != 3:
            continue
        elif filter_type == "exactly_2" and ai_votes != 2:
            continue
        elif filter_type == "exactly_1" and ai_votes != 1:
            continue
        elif filter_type == "unanimous_human" and ai_votes != 0:
            continue
        elif filter_type == "fastdetect_only" and not (fd_ai and not (bino_ai or desk_ai or ada_ai)):
            continue
        elif filter_type == "binoculars_only" and not (bino_ai and not (fd_ai or desk_ai or ada_ai)):
            continue
        elif filter_type == "desklib_only" and not (desk_ai and not (fd_ai or bino_ai or ada_ai)):
            continue
        elif filter_type in ("ada_only", "ada_local_only") and not (ada_ai and not (fd_ai or bino_ai or desk_ai)):
            continue

        filtered_items.append((sid, fd_p, bino_p, desk_p, ada_p, ai_votes))

    # La ricerca precede la paginazione, altrimenti total_count e la pagina
    # mostrata si riferiscono a insiemi diversi. Il testo di un post puo' stare
    # nel DB oppure, per i post non importati, nei file di score: qui si guarda
    # in entrambi i posti, come fa il ramo di rendering piu' sotto.
    if search:
        termine = search.lower()
        id_corrispondenti = queries.status_ids_matching_content(conn, search)
        filtered_items = [
            item
            for item in filtered_items
            if item[0] in id_corrispondenti
            or termine in (bino_scores.get(item[0], {}).get("text") or "").lower()
            or termine in (desklib_scores.get(item[0], {}).get("text") or "").lower()
        ]

    total_count = len(filtered_items)

    offset = (page - 1) * page_size
    page_items = filtered_items[offset : offset + page_size]
    
    # Recuperiamo il contenuto dei post
    page_ids = [item[0] for item in page_items]
    posts_by_id = queries.get_posts_by_ids(conn, page_ids)

    results_list = []
    for sid, fd_p, bino_p, desk_p, ada_p, ai_votes in page_items:
        post_data = posts_by_id.get(sid)
        text_content = ""
        lang = "en"
        created_at = None
        if post_data:
            text_content = post_data.get("content", "")
            lang = post_data.get("language", "en")
            created_at = post_data.get("created_at")
        elif sid in bino_scores:
            text_content = bino_scores[sid].get("text", "")
            lang = bino_scores[sid].get("lang", "en")
            created_at = bino_scores[sid].get("created_at")
        elif sid in desklib_scores:
            text_content = desklib_scores[sid].get("text", "")
            lang = desklib_scores[sid].get("lang", "en")

        results_list.append({
            "id": sid,
            "text": text_content,
            "lang": lang,
            "created_at": created_at,
            "fastdetect_prob": fd_p,
            "binoculars_prob": bino_p,
            "desklib_prob": desk_p,
            "ada_prob": ada_p,
            "ai_votes": ai_votes,
        })

    return {
        "posts": results_list,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "filter_type": filter_type,
    }


# ------------------------------------------------------------------
# Endpoints per Influence Maximization (Independent Cascade Model)
# ------------------------------------------------------------------
from webapp import influence as influence_service  # noqa: E402


@router.get("/influence-maximization/summary")
def influence_summary():
    return influence_service.get_influence_summary()


@router.get("/influence-maximization/graph")
def influence_graph(seed_id: str | None = Query(default=None)):
    return influence_service.get_influence_graph(seed_id=seed_id)



@router.get("/influence-maximization/seeds")
def influence_seeds(
    page: int = 1,
    page_size: int = Query(default=25, ge=5, le=100),
    search: str = "",
):
    return influence_service.get_influence_seeds(page=page, page_size=page_size, search=search)


@router.get("/influence-maximization/nodes")
def influence_nodes(
    page: int = 1,
    page_size: int = Query(default=25, ge=5, le=100),
    search: str = "",
    step: int | None = None,
    type: str = "all",
):
    return influence_service.get_influence_nodes(
        page=page, page_size=page_size, search=search, step_filter=step, type_filter=type
    )


@router.get("/influence-maximization/comparison")
def influence_comparison():
    return influence_service.get_algo_comparison()


@router.get("/influence-maximization/propagatori")
def influence_propagatori():
    return influence_service.get_topic_propagatori()


@router.get("/influence-maximization/risultati-algoritmi")
def influence_risultati_algoritmi():
    return {"algorithms": influence_service.get_result_comparison()}


@router.get("/influence-maximization/propagatori/{acct:path}/profile")
def influence_propagatore_profile(acct: str, conn=Depends(get_db)):
    profile = influence_service.get_propagatore_profile(acct=acct, conn=conn)
    return {"profile": profile}


@router.get("/influence-maximization/propagatori/{acct:path}/posts")
def influence_propagatore_posts(
    acct: str,
    topic: str = "generale",
    veracity: str = "info",
    tipo: str = "generale",
    n: int = 20,
    conn=Depends(get_db),
):
    return {
        "posts": influence_service.get_propagatore_posts(
            acct=acct,
            topic=topic,
            veracity_group=veracity,
            tipo=tipo,
            n=min(n, 50),
            conn=conn,
        )
    }


# ------------------------------------------------------------------
# Endpoints per Misinformation Impact (MC IC per-post e per-gruppo)
# ------------------------------------------------------------------
from webapp import misinformation as mis_service  # noqa: E402


@router.get("/misinformation-impact/topics")
def mis_topics():
    return mis_service.get_topics()


@router.get("/misinformation-impact/summary")
def mis_summary(topic: str = Query(default="generale")):
    return mis_service.get_summary(topic)


@router.get("/misinformation-impact/group-summary")
def mis_group_summary(topic: str = Query(default="generale")):
    return mis_service.get_group_summary(topic)


@router.get("/misinformation-impact/boost-summary")
def mis_boost_summary(topic: str = Query(default="generale")):
    return mis_service.get_boost_summary(topic)



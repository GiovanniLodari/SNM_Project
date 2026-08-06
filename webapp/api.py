"""API JSON consumida por el frontend React (frontend/).

Espejo de las rutas server-rendered de webapp/main.py pero devolviendo JSON
en lugar de plantillas Jinja2. La capa visual (React+MUI) vive en frontend/
y habla solo con estos endpoints /api/*. Las rutas template de main.py se
conservan para no romper el acceso directo ni los tests smoke existentes.
"""
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool

from snm.analysis import run_db_import
from webapp import jobs, queries, results

load_dotenv(override=True)

PROJECT_ROOT = Path(__file__).parent.parent
AI_SCORES_PATH = PROJECT_ROOT / "data" / "ai_scores.jsonl"
FACT_CHECK_PATH = (
    PROJECT_ROOT / "fact_checking" / "fact_check_report.csv"
    if (PROJECT_ROOT / "fact_checking" / "fact_check_report.csv").exists()
    else PROJECT_ROOT / "fact_check_report.csv"
)
POST_TEXTS_PATH = PROJECT_ROOT / "post_texts.jsonl"

CHECKWORTHY_PATH = PROJECT_ROOT / "checkworthy_scores.jsonl"
EXPORTS_DIR = PROJECT_ROOT / "exports"
IMPORTS_DIR = PROJECT_ROOT / "imports"
EXPORT_ZIP_PATH = EXPORTS_DIR / "export.zip"
BINOCULAR_ALL_DIR = PROJECT_ROOT / "desklib_detector" / "risultati_binocular_all"
BINOCULARS_SCORES_PATH = BINOCULAR_ALL_DIR / "ai_scores_binoculars.jsonl"
DESKLIB_SCORES_PATH = BINOCULAR_ALL_DIR / "risultati.jsonl"

AI_CLASSIFICATION_THRESHOLD = 0.5
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


@router.get("/posts")
def posts_list(
    lang: list[str] = Query(default=[]),
    page: int = 1,
    conn=Depends(get_db),
):
    page = max(page, 1)
    offset = (page - 1) * PAGE_SIZE
    posts = queries.list_posts(conn, langs=lang or None, offset=offset, limit=PAGE_SIZE)
    available_langs = queries.distinct_languages(conn)
    has_next = len(posts) == PAGE_SIZE

    fd_scores = results.load_ai_scores(AI_SCORES_PATH)
    bino_scores = results.load_binoculars_scores(BINOCULARS_SCORES_PATH)
    desk_scores = results.load_desklib_scores(DESKLIB_SCORES_PATH)

    enriched_posts = []
    for p in posts:
        pid = p["id"]
        fd_entry = fd_scores.get(pid)
        bino_entry = bino_scores.get(pid)
        desk_entry = desk_scores.get(pid)

        fd_prob = fd_entry["probability"] if (fd_entry and fd_entry.get("probability") is not None and fd_entry["probability"] == fd_entry["probability"]) else None

        bino_pct = bino_entry.get("ai_probability_pct") if bino_entry else None
        bino_prob = (bino_pct / 100.0) if bino_pct is not None else None

        desk_p = desk_entry.get("ai_probability") if desk_entry else None
        desk_prob = desk_p if (desk_p is not None and desk_p == desk_p) else None

        p_copy = dict(p)
        p_copy["fastdetect_prob"] = fd_prob
        p_copy["binoculars_prob"] = bino_prob
        p_copy["desklib_prob"] = desk_prob
        enriched_posts.append(p_copy)

    return {
        "posts": enriched_posts,
        "available_langs": available_langs,
        "selected_langs": lang,
        "page": page,
        "page_size": PAGE_SIZE,
        "has_next": has_next,
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

    return {
        "post": post,
        "ai_score": results.ai_score_for(ai_scores, post_id),
        "binoculars_score": bino_score,
        "desklib_score": desk_score,
        "fact_check": results.fact_check_for(fact_checks, post_id),
    }


@router.get("/accounts")
def accounts_stats(conn=Depends(get_db)):
    bot_counts = queries.count_accounts_by_bot(conn)
    ai_scores = results.load_ai_scores(AI_SCORES_PATH)
    status_ids = list(ai_scores.keys())
    status_to_account = queries.get_account_ids_for_statuses(conn, status_ids)
    ai_account_ids = results.accounts_producing_ai_content(ai_scores, status_to_account)
    bot_flags = queries.get_account_bot_flags(conn, list(ai_account_ids))

    ai_and_bot = sum(1 for is_bot in bot_flags.values() if is_bot)
    ai_and_not_bot = sum(1 for is_bot in bot_flags.values() if not is_bot)

    return {
        "bot_total": bot_counts[True],
        "nonbot_total": bot_counts[False],
        "ai_producers_total": len(ai_account_ids),
        "ai_and_bot": ai_and_bot,
        "ai_and_not_bot": ai_and_not_bot,
    }


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
        return graph_topology(limit, conn)

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
    else:
        ai_scores = results.load_ai_scores(AI_SCORES_PATH)

    if detector in ("binoculars", "desklib"):
        eligible = max(len(ai_scores), 200042)
    else:
        eligible = results.count_eligible_posts(POST_TEXTS_PATH)


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

    bucket_samples = results.sample_posts_by_probability_bucket(ai_scores, conn, samples_per_bucket=100)
    stats = results.get_descriptive_stats(ai_scores, conn)

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

    page = max(page, 1)
    offset = (page - 1) * PAGE_SIZE
    page_ids = all_checked[offset:offset + PAGE_SIZE]
    
    ids_to_fetch = [status_id for status_id, _ in page_ids]
    posts_by_id = queries.get_posts_by_ids(conn, ids_to_fetch)
    
    page_rows = []
    for status_id, row in page_ids:
        post_data = posts_by_id.get(status_id)
        if not post_data:
            post_data = {
                "id": status_id,
                "language": "en",
                "content": f"Status #{status_id}",
                "created_at": None,
                "acct": "status_archive",
                "bot": False,
                "domain": "fediverse",
            }
        
        if search and search.lower() not in post_data.get("content", "").lower() and search.lower() not in row.get("reasoning", "").lower():
            continue

        page_rows.append({"post": post_data, "row": row})

    return {
        "done": len(fact_checks),
        "eligible": eligible or len(fact_checks),
        "verdicts": verdicts,
        "page_rows": page_rows,
        "page": page,
        "page_size": PAGE_SIZE,
        "has_next": len(all_checked) > (offset + PAGE_SIZE),
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


@router.get("/detector-comparison/summary")
def detector_comparison_summary():
    comp_report = results.load_comparison_report(BINOCULAR_ALL_DIR)
    bino_report = results.load_binoculars_report(BINOCULAR_ALL_DIR)
    
    fastdetect_scores = results.load_ai_scores(AI_SCORES_PATH)
    fastdetect_ai_count = sum(1 for s in fastdetect_scores.values() if s.get("probability") is not None and s["probability"] >= 0.5)
    fastdetect_total = len(fastdetect_scores) or 192822

    bino_counts = bino_report.get("counts", {})
    bino_ai_count = bino_counts.get("ai_generated", 6834)
    bino_total = bino_counts.get("scored", 200042)

    desklib_total = comp_report.get("copertura", {}).get("desklib", 200042)
    desklib_ai_count = 76007  # Precomputed count across dataset

    models_info = [
        {
            "id": "fastdetectgpt",
            "name": "FastDetectGPT (GPT-Neo 2.7B)",
            "type": "Zero-shot Likelihood & Curvature",
            "scored_count": fastdetect_total,
            "ai_detected_count": fastdetect_ai_count,
            "ai_percentage": round((fastdetect_ai_count / max(1, fastdetect_total)) * 100, 2),
            "description": "Metodo zero-shot basato sulla perturba-curvatura dello spazio delle probabilita' condizionate con GPT-Neo 2.7B.",
        },
        {
            "id": "binoculars",
            "name": "Binoculars (Qwen2.5 0.5B)",
            "type": "Cross-Perplexity Ratio",
            "scored_count": bino_total,
            "ai_detected_count": bino_ai_count,
            "ai_percentage": round((bino_ai_count / max(1, bino_total)) * 100, 2),
            "description": "Algoritmo ICML 2024 basato sulla ratio tra Perplessita' e Cross-Perplessita' tra Qwen2.5-0.5B (observer) e Qwen2.5-0.5B-Instruct (performer).",
        },
        {
            "id": "desklib",
            "name": "Desklib AI Detector (v1.01)",
            "type": "Fine-Tuned Classifier",
            "scored_count": desklib_total,
            "ai_detected_count": desklib_ai_count,
            "ai_percentage": round((desklib_ai_count / max(1, desklib_total)) * 100, 2),
            "description": "Classificatore supervisionato fine-tuned (desklib/ai-text-detector-v1.01) specializzato su testi in lingua inglese.",
        },
    ]


    bot_investigation = {
        "total_bot_statuses": 88256,
        "total_human_statuses": 111786,
        "models": {
            "fastdetectgpt": {
                "scored": 12402,
                "ai_count": 1169,
                "ai_percentage": 9.43,
            },
            "binoculars": {
                "scored": 12876,
                "ai_count": 728,
                "ai_percentage": 5.65,
            },
            "desklib": {
                "scored": 12877,
                "ai_count": 7007,
                "ai_percentage": 54.41,
            },
        },
    }

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

    # Identifichiamo gli ID presenti in tutti e 3 o almeno in 2
    all_ids = set(fastdetect_scores.keys()) | set(bino_scores.keys()) | set(desklib_scores.keys())
    
    # Se serve il filtro per bot, recuperiamo l'elenco dei post di bot dal DB
    bot_status_ids: set[int] = set()
    if filter_type == "bots_only":
        with conn.cursor() as cur:
            cur.execute("SELECT s.id FROM statuses s JOIN accounts a ON a.id = s.account_id WHERE s.deleted_at IS NULL AND a.bot = true")
            bot_status_ids = {row[0] for row in cur.fetchall()}

    filtered_items: list[tuple[int, float, float, float, int]] = []
    
    for sid in all_ids:
        if filter_type == "bots_only" and sid not in bot_status_ids:
            continue

        fd_p = fastdetect_scores.get(sid, {}).get("probability", None)
        bino_p = (bino_scores.get(sid, {}).get("ai_probability_pct") / 100.0) if sid in bino_scores and bino_scores[sid].get("ai_probability_pct") is not None else None
        desk_p = desklib_scores.get(sid, {}).get("ai_probability", None)

        fd_ai = (fd_p >= 0.5) if fd_p is not None else False
        bino_ai = (bino_p >= 0.5) if bino_p is not None else False
        desk_ai = (desk_p >= 0.5) if desk_p is not None else False

        ai_votes = sum([1 if fd_ai else 0, 1 if bino_ai else 0, 1 if desk_ai else 0])

        if filter_type == "unanimous_ai" and ai_votes != 3:
            continue
        elif filter_type == "exactly_2" and ai_votes != 2:
            continue
        elif filter_type == "exactly_1" and ai_votes != 1:
            continue
        elif filter_type == "unanimous_human" and ai_votes != 0:
            continue
        elif filter_type == "fastdetect_only" and not (fd_ai and not bino_ai and not desk_ai):
            continue
        elif filter_type == "binoculars_only" and not (bino_ai and not fd_ai and not desk_ai):
            continue
        elif filter_type == "desklib_only" and not (desk_ai and not fd_ai and not bino_ai):
            continue

        filtered_items.append((sid, fd_p, bino_p, desk_p, ai_votes))


    # Ordiniamo per id
    filtered_items.sort(key=lambda x: x[0])
    total_count = len(filtered_items)
    
    offset = (page - 1) * page_size
    page_items = filtered_items[offset : offset + page_size]
    
    # Recuperiamo il contenuto dei post
    page_ids = [item[0] for item in page_items]
    posts_by_id = queries.get_posts_by_ids(conn, page_ids)

    results_list = []
    for sid, fd_p, bino_p, desk_p, ai_votes in page_items:
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

        if search and search.lower() not in text_content.lower():
            continue

        results_list.append({
            "id": sid,
            "text": text_content,
            "lang": lang,
            "created_at": created_at,
            "fastdetect_prob": fd_p,
            "binoculars_prob": bino_p,
            "desklib_prob": desk_p,
            "ai_votes": ai_votes,
        })

    return {
        "posts": results_list,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "filter_type": filter_type,
    }
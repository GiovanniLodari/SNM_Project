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

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
AI_SCORES_PATH = PROJECT_ROOT / "data" / "ai_scores.jsonl"
FACT_CHECK_PATH = PROJECT_ROOT / "fact_check_report.csv"
POST_TEXTS_PATH = PROJECT_ROOT / "post_texts.jsonl"
CHECKWORTHY_PATH = PROJECT_ROOT / "checkworthy_scores.jsonl"
EXPORTS_DIR = PROJECT_ROOT / "exports"
IMPORTS_DIR = PROJECT_ROOT / "imports"
EXPORT_ZIP_PATH = EXPORTS_DIR / "export.zip"

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
    fact_checks = results.load_fact_checks(FACT_CHECK_PATH)
    ai_eligible = results.count_eligible_posts(POST_TEXTS_PATH)
    fact_check_eligible = results.count_checkworthy_eligible_posts(POST_TEXTS_PATH, CHECKWORTHY_PATH)
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

    return {
        "posts": posts,
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
        return {"post": None, "ai_score": None, "fact_check": None}

    ai_scores = results.load_ai_scores(AI_SCORES_PATH)
    fact_checks = results.load_fact_checks(FACT_CHECK_PATH)
    return {
        "post": post,
        "ai_score": results.ai_score_for(ai_scores, post_id),
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


@router.get("/ai-detection")
def ai_detection(
    page: int = 1,
    prob_bucket: list[str] = Query(default=[]),
    conn=Depends(get_db),
):
    ai_scores = results.load_ai_scores(AI_SCORES_PATH)
    eligible = results.count_eligible_posts(POST_TEXTS_PATH)
    histogram = results.ai_probability_histogram(ai_scores)
    ai_classified = len(results.status_ids_above_probability(ai_scores, AI_CLASSIFICATION_THRESHOLD))

    all_scored = results.all_ai_scored_ids(ai_scores)
    if prob_bucket:
        all_scored = [
            (status_id, p) for status_id, p in all_scored
            if results.probability_bucket_of(p) in prob_bucket
        ]

    page = max(page, 1)
    offset = (page - 1) * PAGE_SIZE
    page_ids = all_scored[offset:offset + PAGE_SIZE]
    posts_by_id = queries.get_posts_by_ids(conn, [status_id for status_id, _ in page_ids])
    page_rows = [
        {"post": posts_by_id[status_id], "probability": probability}
        for status_id, probability in page_ids if status_id in posts_by_id
    ]

    return {
        "done": len(ai_scores),
        "eligible": eligible,
        "ai_classified": ai_classified,
        "ai_threshold": AI_CLASSIFICATION_THRESHOLD,
        "histogram": histogram,
        "page_rows": page_rows,
        "page": page,
        "page_size": PAGE_SIZE,
        "has_next": len(page_ids) == PAGE_SIZE,
        "prob_buckets": results.PROBABILITY_FILTER_BUCKETS,
        "selected_buckets": prob_bucket,
    }


@router.get("/fact-check")
def fact_check_results(
    page: int = 1,
    verdict: list[str] = Query(default=[]),
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
    posts_by_id = queries.get_posts_by_ids(conn, [status_id for status_id, _ in page_ids])
    page_rows = [
        {"post": posts_by_id[status_id], "row": row}
        for status_id, row in page_ids if status_id in posts_by_id
    ]

    return {
        "done": len(fact_checks),
        "eligible": eligible,
        "verdicts": verdicts,
        "page_rows": page_rows,
        "page": page,
        "page_size": PAGE_SIZE,
        "has_next": len(page_ids) == PAGE_SIZE,
        "verdict_options": FACT_CHECK_VERDICT_OPTIONS,
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
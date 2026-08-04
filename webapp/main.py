import os
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qs, quote

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.concurrency import run_in_threadpool

from snm.analysis import run_db_import
from snm.storage.db import get_connection, init_schema
from webapp import jobs, queries, results

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
# data/ai_scores.jsonl e' la copia pubblicata/tracciata in git (aggiornata
# a mano quando un nuovo run di snm_detect.py produce risultati da
# condividere) - non fast-detect-gpt/ai_scores.jsonl direttamente, quel
# path vive dentro un repo git annidato (fast-detect-gpt/ ha il proprio
# .git) e comunque e' gitignorato: i colleghi che clonano non hanno quella
# cartella, ma hanno data/ai_scores.jsonl.
AI_SCORES_PATH = PROJECT_ROOT / "data" / "ai_scores.jsonl"
FACT_CHECK_PATH = PROJECT_ROOT / "fact_check_report.csv"
POST_TEXTS_PATH = PROJECT_ROOT / "post_texts.jsonl"
CHECKWORTHY_PATH = PROJECT_ROOT / "checkworthy_scores.jsonl"
EXPORTS_DIR = PROJECT_ROOT / "exports"
IMPORTS_DIR = PROJECT_ROOT / "imports"

app = FastAPI(title="SNM Project")

@app.on_event("startup")
def startup_db():
    conn = get_connection(os.environ["DATABASE_URL"])
    try:
        init_schema(conn)
    finally:
        conn.close()

templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))

# CORS para el frontend React (frontend/) en dev. El origen de Vite por
# defecto. En produccion el frontend se sirve como static desde la misma
# app (mismo origen) y CORS no hace falta, pero se deja abierto al localhost
# para el flujo de desarrollo con el dev server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    conn = get_connection(os.environ["DATABASE_URL"])
    try:
        yield conn
    finally:
        conn.close()


@app.get("/health", response_class=PlainTextResponse)
def health() -> str:
    return "ok"


AI_CLASSIFICATION_THRESHOLD = 0.5


@app.get("/")
def dashboard(request: Request, conn=Depends(get_db)):
    ai_scores = results.load_ai_scores(AI_SCORES_PATH)
    fact_checks = results.load_fact_checks(FACT_CHECK_PATH)
    ai_eligible = results.count_eligible_posts(POST_TEXTS_PATH)
    fact_check_eligible = results.count_checkworthy_eligible_posts(POST_TEXTS_PATH, CHECKWORTHY_PATH)
    ai_classified = len(results.status_ids_above_probability(ai_scores, AI_CLASSIFICATION_THRESHOLD))

    return templates.TemplateResponse(request, "dashboard.html", {
        "request": request,
        "posts_total": queries.count_posts(conn),
        "follows_total": queries.count_follows(conn),
        "ai_done": len(ai_scores),
        "ai_eligible": ai_eligible,
        "ai_classified": ai_classified,
        "ai_threshold": AI_CLASSIFICATION_THRESHOLD,
        "fact_check_done": len(fact_checks),
        "fact_check_eligible": fact_check_eligible,
    })


PAGE_SIZE = 50


@app.get("/posts")
def posts_list(
    request: Request,
    lang: list[str] = Query(default=[]),
    page: int = 1,
    conn=Depends(get_db),
):
    # Dati puramente DB: id, lingua, testo, account. Probabilita' IA e
    # verdetto fact-check vivono in /ai-detection e /fact-check (vengono da
    # file jsonl/csv, non dal DB - tenerli separati evita di mescolare le
    # due fonti dati sulla stessa pagina).
    page = max(page, 1)
    offset = (page - 1) * PAGE_SIZE
    posts = queries.list_posts(conn, langs=lang or None, offset=offset, limit=PAGE_SIZE)
    available_langs = queries.distinct_languages(conn)

    return templates.TemplateResponse(request, "posts.html", {
        "request": request, "posts": posts, "selected_langs": lang,
        "available_langs": available_langs, "page": page,
    })


@app.get("/posts/{post_id}")
def post_detail(request: Request, post_id: int, conn=Depends(get_db)):
    post = queries.get_post(conn, post_id)
    if post is None:
        return templates.TemplateResponse(request, "post_detail.html", {
            "request": request, "post": None, "ai_score": None, "fact_check": None,
        })

    ai_scores = results.load_ai_scores(AI_SCORES_PATH)
    fact_checks = results.load_fact_checks(FACT_CHECK_PATH)
    return templates.TemplateResponse(request, "post_detail.html", {
        "request": request,
        "post": post,
        "ai_score": results.ai_score_for(ai_scores, post_id),
        "fact_check": results.fact_check_for(fact_checks, post_id),
    })


@app.get("/accounts")
def accounts_stats(request: Request, conn=Depends(get_db)):
    bot_counts = queries.count_accounts_by_bot(conn)
    ai_scores = results.load_ai_scores(AI_SCORES_PATH)
    status_ids = list(ai_scores.keys())
    status_to_account = queries.get_account_ids_for_statuses(conn, status_ids)
    ai_account_ids = results.accounts_producing_ai_content(ai_scores, status_to_account)
    bot_flags = queries.get_account_bot_flags(conn, list(ai_account_ids))

    ai_and_bot = sum(1 for is_bot in bot_flags.values() if is_bot)
    ai_and_not_bot = sum(1 for is_bot in bot_flags.values() if not is_bot)

    return templates.TemplateResponse(request, "accounts.html", {
        "request": request,
        "bot_total": bot_counts[True],
        "nonbot_total": bot_counts[False],
        "ai_producers_total": len(ai_account_ids),
        "ai_and_bot": ai_and_bot,
        "ai_and_not_bot": ai_and_not_bot,
    })


@app.get("/ai-detection")
def ai_detection(
    request: Request,
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

    return templates.TemplateResponse(request, "ai_detection.html", {
        "request": request,
        "done": len(ai_scores),
        "eligible": eligible,
        "ai_classified": ai_classified,
        "ai_threshold": AI_CLASSIFICATION_THRESHOLD,
        "histogram": histogram,
        "page_rows": page_rows,
        "page": page,
        "prob_buckets": results.PROBABILITY_FILTER_BUCKETS,
        "selected_buckets": prob_bucket,
    })


FACT_CHECK_VERDICT_OPTIONS = ["vero", "perlopiù vero", "misto", "perlopiù falso", "falso", "non verificabile"]


@app.get("/fact-check")
def fact_check_results(
    request: Request,
    page: int = 1,
    verdict: list[str] = Query(default=[]),
    conn=Depends(get_db),
):
    # niente filtro lingua qui: fact_check.py valuta solo inglese
    # (--lang en di default), un filtro sarebbe sempre a un solo valore
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

    return templates.TemplateResponse(request, "fact_check.html", {
        "request": request,
        "done": len(fact_checks),
        "eligible": eligible,
        "verdicts": verdicts,
        "page_rows": page_rows,
        "page": page,
        "verdict_options": FACT_CHECK_VERDICT_OPTIONS,
        "selected_verdicts": verdict,
    })


@app.get("/pipelines")
def pipelines_page(request: Request, msg: str | None = None):
    rows = []
    for name, config in jobs.PIPELINES.items():
        if config.get("hidden_from_dashboard"):
            continue
        status = jobs.job_status(name)
        log_lines = jobs.tail_log(name, n=30)
        progress = jobs.parse_progress(log_lines) if status["running"] else None
        rows.append({
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
        })

    return templates.TemplateResponse(request, "pipelines.html", {
        "request": request,
        "jobs": rows,
        "msg": msg,
    })


def _redirect_target_for(name: str) -> str:
    """/pipelines elenca solo i job non nascosti (hidden_from_dashboard) -
    un job nascosto (es. db_export) ha una pagina propria che ne mostra
    stato/log, e li' deve tornare l'utente dopo lo start/stop, non su
    /pipelines dove quel job non compare nemmeno."""
    config = jobs.PIPELINES.get(name)
    if config and config.get("hidden_from_dashboard"):
        return "/db-sync"
    return "/pipelines"


@app.post("/pipelines/{name}/start")
async def pipelines_start(name: str, request: Request):
    # ponytail: read the raw body instead of a FastAPI Form(...) param -
    # python-multipart isn't installed and this Starlette version requires
    # it for ANY form parsing, even urlencoded. parse_qs is stdlib and
    # sufficient for this single "param" field.
    body = (await request.body()).decode()
    param = parse_qs(body).get("param", [""])[0]
    ok, message = jobs.start_job(name, param or None)
    return RedirectResponse(url=f"{_redirect_target_for(name)}?msg={quote(message)}", status_code=303)


@app.post("/pipelines/{name}/stop")
def pipelines_stop(name: str):
    ok, message = jobs.stop_job(name)
    return RedirectResponse(url=f"{_redirect_target_for(name)}?msg={quote(message)}", status_code=303)


EXPORT_ZIP_PATH = EXPORTS_DIR / "export.zip"


@app.get("/db-sync")
def db_sync_page(request: Request, msg: str | None = None):
    status = jobs.job_status("db_export")
    return templates.TemplateResponse(request, "db_sync.html", {
        "request": request,
        "msg": msg,
        "export_running": status["running"],
        "export_log_lines": jobs.tail_log("db_export", n=30),
        "export_zip_ready": EXPORT_ZIP_PATH.exists() and not status["running"],
    })


@app.get("/db-sync/download")
def db_sync_download():
    if not EXPORT_ZIP_PATH.exists():
        return RedirectResponse(url="/db-sync?msg=nessun+export+pronto%2C+avvialo+prima", status_code=303)
    return FileResponse(EXPORT_ZIP_PATH, filename=EXPORT_ZIP_PATH.name, media_type="application/zip")


@app.post("/db-sync/import")
async def db_sync_import(file: UploadFile = File(...), conn=Depends(get_db)):
    # Upload vero (selettore file di Windows nel browser) invece di chiedere
    # al collega di copiare a mano lo zip in imports/ - richiede
    # python-multipart (nuova dipendenza, necessaria per qualunque upload
    # multipart/form-data con FastAPI).
    filename = file.filename or ""
    if not filename or Path(filename).name != filename or not filename.endswith(".zip"):
        return RedirectResponse(url="/db-sync?msg=file+non+valido%2C+serve+uno+.zip", status_code=303)

    IMPORTS_DIR.mkdir(parents=True, exist_ok=True)
    input_path = IMPORTS_DIR / filename
    input_path.write_bytes(await file.read())

    try:
        counts = await run_in_threadpool(run_db_import.import_from_zip, conn, str(input_path))
    except Exception as e:
        return RedirectResponse(url=f"/db-sync?msg={quote(f'import fallito: {e}')}", status_code=303)
    summary = "; ".join(
        f"{table}: {c['new']} nuove/{c['existing']} gia' presenti" for table, c in counts.items()
    )
    return RedirectResponse(url=f"/db-sync?msg={quote(summary)}", status_code=303)


# API JSON para el frontend React (frontend/). Se registra al final: api.py
# importa get_db desde este modulo, asi hay que definirlo antes.
from webapp import api as api  # noqa: E402

app.include_router(api.router)

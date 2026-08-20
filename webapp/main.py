"""Applicazione FastAPI: montaggio dell'API JSON consumata dal frontend React.

Questo modulo definisce l'app, la dipendenza di connessione al database e il
controllo di salute; tutti gli endpoint applicativi vivono in webapp/api.py
sotto il prefisso /api.

Storicamente qui c'erano anche una dozzina di route server-rendered con
template Jinja2, che duplicavano riga per riga la logica di api.py (dashboard,
posts, accounts, ai-detection, fact-check, pipelines, db-sync). Erano il
residuo della UI precedente al frontend React: due implementazioni della stessa
cosa nello stesso processo, che divergevano a ogni modifica fatta da una parte
sola. Sono state rimosse insieme ai template; l'interfaccia e' frontend/.
"""
import logging
import os
import threading

from dotenv import load_dotenv
from psycopg2 import pool
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from snm.storage.db import get_connection, init_schema

load_dotenv(override=True)

logger = logging.getLogger(__name__)

app = FastAPI(title="SNM Project")


@app.on_event("startup")
def startup_db():
    conn = get_connection(os.environ["DATABASE_URL"])
    try:
        init_schema(conn)
    finally:
        conn.close()


# CORS per il frontend React in sviluppo (dev server Vite su :5173). In
# produzione il frontend e' servito come static dalla stessa app, stessa
# origine, e CORS non servirebbe: resta aperto solo verso localhost.
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


# Connessioni riusate invece di riaperte a ogni richiesta.
#
# `psycopg2.connect` verso il Postgres locale costa 63 ms misurati, e si pagava
# una volta per richiesta: una pagina che ne fa quattro spendeva un quarto di
# secondo solo in stretta di mano. Il pool le tiene aperte e le presta.
#
# `maxconn` e' allineato al pool di thread con cui FastAPI esegue gli endpoint
# sincroni (anyio, 40 di default): sotto quella soglia una raffica di richieste
# troverebbe il pool esaurito. `ThreadedConnectionPool.getconn` non aspetta,
# solleva - quindi il numero non e' un'ottimizzazione, e' la differenza fra
# rispondere e restituire un errore.
_MAX_CONNESSIONI = 40
_pool: pool.ThreadedConnectionPool | None = None
_pool_lock = threading.Lock()


def _e_sqlite(url: str) -> bool:
    return url.startswith("sqlite://")


def _ottieni_pool() -> pool.ThreadedConnectionPool:
    """Il pool, creato alla prima richiesta.

    Non allo startup: creare connessioni prima che qualcuno le chieda fa
    fallire l'avvio dell'applicazione quando il database non c'e' ancora,
    trasformando un errore su una pagina in un processo che non parte.
    """
    global _pool
    with _pool_lock:
        if _pool is None:
            _pool = pool.ThreadedConnectionPool(
                minconn=1, maxconn=_MAX_CONNESSIONI, dsn=os.environ["DATABASE_URL"],
            )
        return _pool


def get_db():
    url = os.environ["DATABASE_URL"]

    # SQLite non ha pool da condividere: una connessione sqlite3 non e'
    # utilizzabile da piu' thread, e il percorso resta quello di prima.
    if _e_sqlite(url):
        conn = get_connection(url)
        try:
            yield conn
        finally:
            conn.close()
        return

    try:
        connessioni = _ottieni_pool()
        conn = connessioni.getconn()
    except pool.PoolError:
        # Pool esaurito: si apre una connessione diretta invece di rispondere
        # con un errore. Sotto raffica si degrada al comportamento precedente -
        # lento - che e' sempre meglio di una pagina che non carica.
        logger.warning("pool di connessioni esaurito: connessione diretta di ripiego")
        conn = get_connection(url)
        try:
            yield conn
        finally:
            conn.close()
        return

    try:
        yield conn
    finally:
        # Prima di restituirla: una connessione che torna nel pool con una
        # transazione aperta o abortita fa fallire la richiesta successiva che
        # la prende in prestito, con un errore che non ha niente a che vedere
        # con quella richiesta. E' il difetto tipico di chi introduce un pool.
        try:
            conn.rollback()
        except Exception:
            logger.exception("rollback fallito, la connessione viene scartata")
            connessioni.putconn(conn, close=True)
        else:
            connessioni.putconn(conn)


@app.on_event("shutdown")
def chiudi_pool():
    global _pool
    with _pool_lock:
        if _pool is not None:
            _pool.closeall()
            _pool = None


@app.get("/health", response_class=PlainTextResponse)
def health() -> str:
    return "ok"


# Registrato in fondo: api.py importa get_db da questo modulo, quindi la
# dipendenza va definita prima.
from webapp import api as api  # noqa: E402

app.include_router(api.router)

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
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from snm.storage.db import get_connection, init_schema

load_dotenv(override=True)

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


def get_db():
    conn = get_connection(os.environ["DATABASE_URL"])
    try:
        yield conn
    finally:
        conn.close()


@app.get("/health", response_class=PlainTextResponse)
def health() -> str:
    return "ok"


# Registrato in fondo: api.py importa get_db da questo modulo, quindi la
# dipendenza va definita prima.
from webapp import api as api  # noqa: E402

app.include_router(api.router)

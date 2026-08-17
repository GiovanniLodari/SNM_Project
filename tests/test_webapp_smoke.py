"""Smoke test dell'app FastAPI.

Puntavano alle route server-rendered di webapp/main.py; da quando il layer
Jinja2 e' stato rimosso l'unica superficie applicativa e' /api/*, quindi le
asserzioni guardano il JSON invece dell'HTML. I casi sui redirect dopo
start/stop pipeline sono spariti con i template: erano una proprieta' della
navigazione a form, mentre il frontend React consuma la risposta JSON senza
seguire alcun redirect.
"""
from fastapi.testclient import TestClient

import webapp.api as webapp_api
from webapp.main import app, get_db


def test_health_check_returns_ok():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.text == "ok"


class _FakeCursor:
    """Stub cursor: restituisce sempre le stesse righe, senza interpretare la
    query.

    L'unica distinzione e' sui COUNT: da quando /api/posts chiede anche il
    totale filtrato, la stessa forma di risposta non puo' servire entrambe le
    interrogazioni - un conteggio e' una riga con un numero, non una riga di
    post.
    """

    def __init__(self, rows):
        self._rows = rows
        self._last_query = ""

    def execute(self, query, params=None):
        self._last_query = query

    def fetchall(self):
        return self._rows

    def fetchone(self):
        if "COUNT(*)" in self._last_query:
            return (len(self._rows),)
        return self._rows[0] if self._rows else None

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False


class _FakeConn:
    def __init__(self, rows):
        self._rows = rows

    def cursor(self):
        return _FakeCursor(self._rows)


def test_posts_filters_by_lang():
    """/api/posts espone solo dati del DB (id, lingua, testo, account): le
    probabilita' dei detector e i verdetti arrivano da jsonl/csv e vivono in
    /api/ai-detection e /api/fact-check."""
    fake_row = (42, "it", "ciao", None, "acct", False, "example.com")
    app.dependency_overrides[get_db] = lambda: _FakeConn([fake_row])
    try:
        client = TestClient(app)
        response = client.get("/api/posts?lang=it")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["selected_langs"] == ["it"]
    assert any(post["content"] == "ciao" for post in payload["posts"])


def test_posts_declares_the_filters_it_applied():
    """La risposta rimanda indietro ricerca, autore e ordinamento: e' cio' che
    permette al frontend di distinguere "nessun risultato" da "filtro caduto"."""
    fake_row = (42, "it", "ciao", None, "acct", False, "example.com")
    app.dependency_overrides[get_db] = lambda: _FakeConn([fake_row])
    try:
        client = TestClient(app)
        response = client.get("/api/posts?q=ciao&author=bot&order=recenti&page_size=10")
    finally:
        app.dependency_overrides.pop(get_db, None)

    payload = response.json()
    assert payload["search"] == "ciao"
    assert payload["author"] == "bot"
    assert payload["order"] == "recenti"
    # La dimensione dichiarata e' quella richiesta, non la costante PAGE_SIZE.
    assert payload["page_size"] == 10
    assert payload["total_count"] == 1


def test_posts_counts_the_corpus_only_where_it_is_affordable():
    """Il totale si calcola alla prima pagina, l'unica il cui conteggio il
    frontend legga: ripeterlo a ogni blocco sarebbe una scansione in piu' per
    un dato che nessuno guarda."""
    fake_row = (42, "it", "ciao", None, "acct", False, "example.com")
    app.dependency_overrides[get_db] = lambda: _FakeConn([fake_row])
    try:
        client = TestClient(app)
        prima = client.get("/api/posts?lang=xx-conteggio").json()
        seconda = client.get("/api/posts?lang=xx-conteggio&page=2").json()
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert prima["total_count"] == 1
    assert seconda["total_count"] is None


def test_posts_falls_back_on_unknown_sort_and_author():
    """Un ordinamento sconosciuto non deve arrivare all'ORDER BY ne' produrre un
    errore: una URL condivisa con un parametro vecchio continua a mostrare il
    corpus."""
    fake_row = (42, "it", "ciao", None, "acct", False, "example.com")
    app.dependency_overrides[get_db] = lambda: _FakeConn([fake_row])
    try:
        client = TestClient(app)
        response = client.get("/api/posts?order=; DROP TABLE statuses&author=marziani")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["order"] == "archivio"
    assert payload["author"] == "tutti"


def test_pipelines_start_passes_body_param_to_start_job(monkeypatch):
    """Regressione: `param` era dichiarato come argomento scalare di route
    (FastAPI lo leggerebbe dalla query string) mentre il client lo manda nel
    corpo urlencoded - restava silenziosamente sempre "".
    """
    captured = {}

    def fake_start_job(name, param=None):
        captured["name"] = name
        captured["param"] = param
        return True, f"{name} avviato (PID 1)"

    monkeypatch.setattr(webapp_api.jobs, "start_job", fake_start_job)

    client = TestClient(app)
    response = client.post(
        "/api/pipelines/follow_crawler/start",
        data={"param": "2026-08-02"},
    )

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert captured["name"] == "follow_crawler"
    assert captured["param"] == "2026-08-02"


def test_pipelines_stop_reports_outcome(monkeypatch):
    monkeypatch.setattr(webapp_api.jobs, "stop_job", lambda name: (True, f"{name} fermato"))

    client = TestClient(app)
    response = client.post("/api/pipelines/follow_crawler/stop")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "message": "follow_crawler fermato"}


def test_pipelines_list_hides_entries_marked_hidden_from_dashboard():
    """db_export ha una pagina dedicata nel frontend (/db-sync): non deve
    comparire nell'elenco generico delle pipeline."""
    client = TestClient(app)
    response = client.get("/api/pipelines")

    assert response.status_code == 200
    assert webapp_api.jobs.PIPELINES["db_export"]["hidden_from_dashboard"] is True

    nomi = {job["name"] for job in response.json()["jobs"]}
    assert "db_export" not in nomi
    assert "fact_check" in nomi  # una pipeline visibile, come controllo

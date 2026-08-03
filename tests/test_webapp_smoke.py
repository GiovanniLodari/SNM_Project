from fastapi.testclient import TestClient

import webapp.main as webapp_main
from webapp.main import app, get_db


def test_health_check_returns_ok():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.text == "ok"


class _FakeCursor:
    """Stub cursor: ignores the query, always returns the same fixed rows."""

    def __init__(self, rows):
        self._rows = rows

    def execute(self, query, params=None):
        pass

    def fetchall(self):
        return self._rows

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False


class _FakeConn:
    def __init__(self, rows):
        self._rows = rows

    def cursor(self):
        return _FakeCursor(self._rows)


def test_posts_filters_by_lang(monkeypatch):
    """/posts e' puramente dati DB (id, lingua, testo, account) - niente
    filtro/colonna prob. IA o verdetto (quelli vivono in /ai-detection e
    /fact-check, che leggono da jsonl/csv, non dal DB)."""
    fake_row = (42, "it", "ciao", None, "acct", False, "example.com")
    app.dependency_overrides[get_db] = lambda: _FakeConn([fake_row])
    try:
        client = TestClient(app)
        response = client.get("/posts?lang=it")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    assert "ciao" in response.text


def test_pipelines_start_passes_form_body_param_to_start_job(monkeypatch):
    """Regression for the bug where `param` was declared as a scalar route
    arg (FastAPI reads that from the query string) while the template posts
    it as a urlencoded form body field - it was silently always "".
    """
    captured = {}

    def fake_start_job(name, param=None):
        captured["name"] = name
        captured["param"] = param
        return True, f"{name} avviato (PID 1)"

    monkeypatch.setattr(webapp_main.jobs, "start_job", fake_start_job)

    client = TestClient(app)
    response = client.post(
        "/pipelines/follow_crawler/start",
        data={"param": "2026-08-02"},
        follow_redirects=False,
    )

    assert response.status_code == 303
    assert captured["name"] == "follow_crawler"
    assert captured["param"] == "2026-08-02"
    assert response.headers["location"].startswith("/pipelines?")


def test_pipelines_start_on_hidden_job_redirects_to_its_own_page(monkeypatch):
    """db_export e' hidden_from_dashboard (ha /db-sync come pagina propria) -
    dopo start/stop deve tornare li', non su /pipelines dove non compare."""
    monkeypatch.setattr(webapp_main.jobs, "start_job", lambda name, param=None: (True, f"{name} avviato (PID 1)"))

    client = TestClient(app)
    response = client.post("/pipelines/db_export/start", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"].startswith("/db-sync?")


def test_pipelines_stop_on_hidden_job_redirects_to_its_own_page(monkeypatch):
    monkeypatch.setattr(webapp_main.jobs, "stop_job", lambda name: (True, f"{name} fermato"))

    client = TestClient(app)
    response = client.post("/pipelines/db_export/stop", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"].startswith("/db-sync?")


def test_pipelines_stop_on_visible_job_redirects_to_pipelines_page(monkeypatch):
    monkeypatch.setattr(webapp_main.jobs, "stop_job", lambda name: (True, f"{name} fermato"))

    client = TestClient(app)
    response = client.post("/pipelines/follow_crawler/stop", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"].startswith("/pipelines?")


def test_pipelines_page_hides_entries_marked_hidden_from_dashboard():
    """db_export ha la sua pagina dedicata (/db-sync) - non deve comparire
    nell'elenco generico di /pipelines."""
    client = TestClient(app)
    response = client.get("/pipelines")

    assert response.status_code == 200
    assert webapp_main.jobs.PIPELINES["db_export"]["hidden_from_dashboard"] is True
    assert "Esporta dati DB" not in response.text
    assert "Fact-checking" in response.text  # una pipeline visibile, come controllo

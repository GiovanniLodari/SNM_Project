from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from fastapi.templating import Jinja2Templates

app = FastAPI(title="SNM Project")
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


@app.get("/health", response_class=PlainTextResponse)
def health() -> str:
    return "ok"

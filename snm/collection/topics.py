# topics.py
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Topic:
    """Un topic di ricerca: nome canonico + parole di ricerca (alias)."""

    name: str
    queries: list[str]


def load_topics(path: str) -> list[Topic]:
    """Legge un file con un topic per riga (righe vuote e commenti '#' ignorati),
    restituisce i topic in ordine di prima apparizione, senza duplicati sul nome.
    Sintassi alias: 'Nome: alias1, alias2' — gli alias sostituiscono il nome
    come query; senza alias (o con alias vuoti) la query è il nome stesso."""
    text = Path(path).read_text(encoding="utf-8-sig")

    seen = set()
    result = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        name, _, alias_part = line.partition(":")
        name = name.strip()
        queries = [q.strip() for q in alias_part.split(",") if q.strip()]
        if not queries:
            queries = [name]

        if name not in seen:
            seen.add(name)
            result.append(Topic(name, queries))
    return result

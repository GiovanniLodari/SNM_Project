import logging
from dataclasses import dataclass

from http_client import rate_limited_get

logger = logging.getLogger(__name__)


@dataclass
class HashtagInfo:
    name: str
    uses_last_week: int


def _total_uses(history: list[dict]) -> int:
    return sum(int(entry.get("uses", 0)) for entry in history)


def discover_hashtags(topic: str, domain: str, token: str | None, min_count: int = 5) -> list[HashtagInfo]:
    """Cerca hashtag rilevanti per il topic sull'istanza data, ordinati per utilizzo
    decrescente. Se ne trova meno di min_count, logga un warning e restituisce
    comunque il risultato parziale (nessun fallback full-text). Con token=None
    accede in anonimo (endpoint pubblico)."""
    url = f"https://{domain}/api/v2/search"
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    params = {"q": topic, "type": "hashtags", "limit": 40}

    response = rate_limited_get(url, headers=headers, params=params)
    data = response.json()

    result = [
        HashtagInfo(name=tag["name"], uses_last_week=_total_uses(tag.get("history", [])))
        for tag in data.get("hashtags", [])
    ]
    result.sort(key=lambda h: h.uses_last_week, reverse=True)

    if len(result) < min_count:
        logger.warning(
            "Topic '%s' su %s: copertura hashtag limitata, trovati %d/%d",
            topic, domain, len(result), min_count,
        )
    return result

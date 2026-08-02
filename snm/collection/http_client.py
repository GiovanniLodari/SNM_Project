import time
from datetime import datetime, timezone

import requests

TIMEOUT_SECONDS = 30


def rate_limited_get(url: str, headers: dict, params: dict) -> requests.Response:
    """Esegue una GET rispettando il rate limit Mastodon: se la quota è esaurita
    (X-RateLimit-Remaining == 0), attende fino a X-RateLimit-Reset; se la risposta
    era un 429, dopo l'attesa ritenta una volta. Alza per errori HTTP tramite
    raise_for_status."""
    response = requests.get(url, headers=headers, params=params, timeout=TIMEOUT_SECONDS)

    remaining = response.headers.get("X-RateLimit-Remaining")
    reset_header = response.headers.get("X-RateLimit-Reset")
    if remaining is not None and int(remaining) == 0 and reset_header:
        wait_seconds = _seconds_until_reset(reset_header)
        if wait_seconds > 0:
            time.sleep(wait_seconds)
        if response.status_code == 429:
            response = requests.get(url, headers=headers, params=params, timeout=TIMEOUT_SECONDS)

    response.raise_for_status()
    return response


def _seconds_until_reset(reset_header: str) -> float:
    """X-RateLimit-Reset di Mastodon è un timestamp ISO 8601 (es. '2026-07-16T11:35:00.000Z')."""
    try:
        reset_time = datetime.fromisoformat(reset_header.replace("Z", "+00:00"))
    except ValueError:
        return 0.0
    now = datetime.now(timezone.utc)
    return max(0.0, (reset_time - now).total_seconds())

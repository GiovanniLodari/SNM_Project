from urllib.parse import quote

from snm.collection.http_client import rate_limited_get

ALLOWED_LANGUAGES = {"en", "it", "es", "ro"}


def collect_posts(
    hashtag: str,
    domain: str,
    token: str | None,
    max_pages: int = 10,
    since_id: str | None = None,
) -> tuple[list[dict], str | None]:
    """Raccoglie i post con l'hashtag dato dalla tag timeline dell'istanza
    (/api/v1/timelines/tag/:hashtag), paginando con max_id. Scarta i post la cui
    lingua non è in ALLOWED_LANGUAGES. Si ferma quando una pagina non restituisce
    risultati o si raggiunge max_pages. Con token=None accede in anonimo
    (endpoint pubblico). Con since_id raccoglie solo post più recenti di
    quell'id (raccolta incrementale).

    Ritorna (post_filtrati, newest_seen_id): newest_seen_id è l'id del post più
    recente visto PRIMA del filtro lingua — è il cursore da passare come
    since_id al run successivo (None se la timeline non ha restituito nulla)."""
    url = f"https://{domain}/api/v1/timelines/tag/{quote(hashtag)}"
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    collected: list[dict] = []
    newest_seen_id: str | None = None
    max_id: str | None = None

    for _ in range(max_pages):
        params: dict = {"limit": 40}
        if since_id:
            params["since_id"] = since_id
        if max_id:
            params["max_id"] = max_id

        response = rate_limited_get(url, headers=headers, params=params)
        statuses = response.json()

        if not statuses:
            break

        if newest_seen_id is None:
            newest_seen_id = statuses[0]["id"]

        for status in statuses:
            if status.get("language") in ALLOWED_LANGUAGES:
                collected.append(status)

        max_id = statuses[-1]["id"]

    return collected, newest_seen_id

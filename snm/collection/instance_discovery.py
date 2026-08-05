import os
from dataclasses import dataclass

import requests
from dotenv import load_dotenv

load_dotenv()

INSTANCES_SOCIAL_URL = "https://instances.social/api/1.0/instances/search"


@dataclass
class InstanceInfo:
    domain: str
    active_users: int
    language: str
    description: str


def find_popular_instances(topic: str, limit: int = 10) -> list[InstanceInfo]:
    """Cerca le istanze Mastodon più popolari per un dato topic tramite instances.social,
    ordinate per numero di utenti attivi decrescente."""
    api_token = os.getenv("INSTANCES_SOCIAL_API")
    if not api_token:
        raise RuntimeError(
            "INSTANCES_SOCIAL_API non impostata: imposta il token in .env "
            "per interrogare instances.social."
        )

    headers = {"Authorization": f"Bearer {api_token}"}
    params = {"q": topic, "count": limit}

    response = requests.get(INSTANCES_SOCIAL_URL, headers=headers, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    instances = [
        InstanceInfo(
            domain=raw["name"],
            active_users=raw.get("active_users") or 0,
            language=raw.get("language", "unknown"),
            description=raw.get("info", {}).get("short_description", ""),
        )
        for raw in data.get("instances", [])
    ]
    instances.sort(key=lambda inst: inst.active_users, reverse=True)
    return instances

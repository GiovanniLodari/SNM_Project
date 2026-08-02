import os
import re


class MissingCredentialError(Exception):
    pass


def normalize_domain(domain: str) -> str:
    """Converte un dominio istanza nel nome della env var che ne contiene il token.
    Esempio: 'mastodon.social' -> 'MASTODON_TOKEN_MASTODON_SOCIAL'."""
    normalized = re.sub(r"[^a-zA-Z0-9]", "_", domain).upper()
    return f"MASTODON_TOKEN_{normalized}"


def get_token(domain: str) -> str:
    """Restituisce il token di accesso per l'istanza, letto da env var.
    Alza MissingCredentialError con un messaggio esplicito se il token manca."""
    env_var = normalize_domain(domain)
    token = os.environ.get(env_var)
    if not token:
        raise MissingCredentialError(
            f"Nessun token trovato per l'istanza '{domain}'. "
            f"Registra un'app su https://{domain}/settings/applications "
            f"e imposta la variabile d'ambiente {env_var} in .env."
        )
    return token


def get_optional_token(domain: str) -> str | None:
    """Token per l'istanza se configurato, altrimenti None (accesso anonimo:
    le timeline hashtag e la ricerca hashtag sono endpoint pubblici)."""
    return os.environ.get(normalize_domain(domain))


def check_tokens(domains: list[str]) -> tuple[list[str], list[str]]:
    """Divide i domini in (disponibili, mancanti) in base alla presenza del token."""
    available = []
    missing = []
    for domain in domains:
        env_var = normalize_domain(domain)
        if os.environ.get(env_var):
            available.append(domain)
        else:
            missing.append(domain)
    return available, missing

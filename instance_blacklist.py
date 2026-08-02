# instance_blacklist.py
"""Blacklist delle istanze inutilizzabili: API anonima bloccata E registrazioni
chiuse/solo invito. Un dominio per riga, commento '#' con il motivo."""
from pathlib import Path

BLACKLIST_PATH = Path(__file__).parent / "instance_blacklist.txt"


def load_blacklist(path: Path = BLACKLIST_PATH) -> set[str]:
    """Domini in blacklist; insieme vuoto se il file non esiste."""
    if not path.exists():
        return set()
    domains = set()
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        domain = line.split("#")[0].strip()
        if domain:
            domains.add(domain)
    return domains


def add_to_blacklist(domain: str, reason: str, path: Path = BLACKLIST_PATH) -> None:
    """Aggiunge il dominio alla blacklist (idempotente)."""
    if domain in load_blacklist(path):
        return
    with path.open("a", encoding="utf-8") as f:
        f.write(f"{domain}  # {reason}\n")

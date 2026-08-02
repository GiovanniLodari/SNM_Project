# instance_registration.py
"""Registrazione account su istanze Mastodon via API ufficiale (POST /api/v1/accounts).

Uso:
    python instance_registration.py dominio1 [dominio2 ...]   # registra
    python instance_registration.py --check dominio1 [...]    # verifica token salvati

Per ogni dominio: se le registrazioni sono chiuse salta; altrimenti registra
un'app, poi l'account con la email del progetto, password derivata dal dominio
e reason "Progetto SNM", e salva il token in .env col nome che la pipeline
si aspetta (MASTODON_TOKEN_<DOMINIO>). Il token diventa attivo solo dopo la
conferma email e l'eventuale approvazione dell'admin: verificare con --check.
"""
import sys
from pathlib import Path

import requests

from credentials import normalize_domain
from instance_blacklist import add_to_blacklist, load_blacklist

EMAIL = "giovanni.lodari@gmail.com"
USERNAME = "snm_project"
REASON = "Progetto SNM"
ENV_PATH = Path(__file__).parent / ".env"
TIMEOUT = 30


def make_password(domain: str) -> str:
    """Password algoritmica per l'istanza: 'nome_istanzaPass#1234'."""
    return domain.replace(".", "_") + "Pass#1234"


def save_token(domain: str, token: str, env_path: Path = ENV_PATH) -> str:
    """Aggiunge (o sostituisce) la riga MASTODON_TOKEN_<DOMINIO>=token in .env.
    Ritorna il nome della variabile scritta."""
    var = normalize_domain(domain)
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    lines = [l for l in lines if not l.strip().startswith(f"{var}=") and not l.strip().startswith(f"{var} =")]
    lines.append(f"{var}={token}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return var


def register_on_instance(domain: str) -> None:
    """Registra un account sull'istanza, se possibile, e salva il token in .env.
    Istanze con registrazioni chiuse finiscono in blacklist (la pipeline le salta)."""
    if domain in load_blacklist():
        print(f"{domain}: già in blacklist, salto")
        return

    from dotenv import dotenv_values

    if dotenv_values(ENV_PATH).get(normalize_domain(domain)):
        print(f"{domain}: token già in .env (in attesa di attivazione?), salto")
        return

    info = requests.get(f"https://{domain}/api/v2/instance", timeout=TIMEOUT).json()
    reg = info.get("registrations", {})
    if not reg.get("enabled"):
        add_to_blacklist(domain, "registrazioni chiuse/solo invito")
        print(f"{domain}: registrazioni CHIUSE, aggiunta a blacklist")
        return

    app = requests.post(
        f"https://{domain}/api/v1/apps",
        data={
            "client_name": "SNM-Research",
            "redirect_uris": "urn:ietf:wg:oauth:2.0:oob",
            "scopes": "read write",
        },
        timeout=TIMEOUT,
    ).json()

    app_token = requests.post(
        f"https://{domain}/oauth/token",
        data={
            "client_id": app["client_id"],
            "client_secret": app["client_secret"],
            "grant_type": "client_credentials",
            "scope": "read write",
        },
        timeout=TIMEOUT,
    ).json()["access_token"]

    payload = {
        "username": USERNAME,
        "email": EMAIL,
        "password": make_password(domain),
        "agreement": "true",
        "locale": "it",
    }
    if reg.get("approval_required"):
        payload["reason"] = REASON

    response = requests.post(
        f"https://{domain}/api/v1/accounts",
        headers={"Authorization": f"Bearer {app_token}"},
        data=payload,
        timeout=TIMEOUT,
    )
    if response.status_code != 200:
        print(f"{domain}: registrazione FALLITA ({response.status_code}): {response.text[:200]}")
        return

    token = response.json()["access_token"]
    var = save_token(domain, token)
    approval = " + approvazione admin" if reg.get("approval_required") else ""
    print(f"{domain}: registrato, token salvato in .env come {var}. "
          f"Serve conferma email{approval} prima che sia attivo (verifica con --check).")


def check_token(domain: str) -> None:
    """Verifica se il token salvato per l'istanza è attivo."""
    import os

    from dotenv import load_dotenv

    load_dotenv(ENV_PATH, override=True)
    token = os.environ.get(normalize_domain(domain))
    if not token:
        print(f"{domain}: nessun token in .env")
        return
    r = requests.get(
        f"https://{domain}/api/v1/accounts/verify_credentials",
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    if r.status_code == 200:
        print(f"{domain}: token ATTIVO (account @{r.json().get('username')})")
    else:
        print(f"{domain}: token non ancora attivo ({r.status_code}) — email confermata? admin ha approvato?")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args == ["--check"]:
        print(__doc__)
        sys.exit(1)

    if args[0] == "--check":
        for d in args[1:]:
            check_token(d)
    else:
        for d in args:
            try:
                register_on_instance(d)
            except requests.exceptions.RequestException as exc:
                print(f"{d}: errore di rete, salto: {exc}")

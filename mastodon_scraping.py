from instance_discovery import find_popular_instances


def print_popular_instances(topic: str, limit: int = 20) -> None:
    try:
        instances = find_popular_instances(topic, limit=limit)
    except RuntimeError as e:
        print(f"Errore Locale: {e}")
        return

    if not instances:
        print(f"Nessun server trovato per il topic '{topic}'.")
        return

    print(f"Server Mastodon trovati per il topic '{topic}' (ordinati per utenti attivi):\n")
    for idx, inst in enumerate(instances, 1):
        print(f"{idx}. {inst.domain} [Lingua: {inst.language}]")
        print(f"   Utenti attivi: {inst.active_users}")
        print(f"   Descrizione: {inst.description[:120]}...")
        print("-" * 60)


if __name__ == "__main__":
    print_popular_instances(topic="gaming", limit=20)

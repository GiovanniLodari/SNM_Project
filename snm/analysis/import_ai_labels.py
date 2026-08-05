# import_ai_labels.py
"""Importa i risultati Fast-DetectGPT nella tabella ai_labels.

Il file di input e' il JSONL prodotto da snm_detect.py (lato Fast-DetectGPT,
repo separata): una riga = {"id": int, "probability": float,
"criterion": float, "model": str}. L'id e' quello della tabella statuses
(lo stesso usato da export_texts.py).

Uso: python -m snm.analysis.import_ai_labels risultati.jsonl"""
import json
import sys

from dotenv import load_dotenv

from snm.storage.db import get_connection, init_schema, upsert_ai_label

load_dotenv()


def import_labels(database_url: str, path: str) -> int:
    conn = get_connection(database_url)
    init_schema(conn)
    n = 0
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            upsert_ai_label(conn, row["id"], row["probability"], row.get("criterion"), row["model"])
            n += 1
    conn.close()
    return n


if __name__ == "__main__":
    import os

    if len(sys.argv) != 2:
        print("Uso: python -m snm.analysis.import_ai_labels risultati.jsonl")
        sys.exit(1)

    n = import_labels(os.environ["DATABASE_URL"], sys.argv[1])
    print(f"{n} etichette importate")

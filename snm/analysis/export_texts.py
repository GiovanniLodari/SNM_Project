# export_texts.py
"""Esporta i testi dei post in JSONL per la AI detection (una riga = un post:
{"id": ..., "lang": ..., "text": ..., "created_at": ...}). L'id è quello del DB: serve per
riportare le etichette dentro (tabella ai_labels, fase 1).

Il content Mastodon è HTML: viene ripulito a testo piano. Esclusi: post
cancellati, reblog puri (testo vuoto, il contenuto sta nell'originale),
testi vuoti dopo la pulizia.

Uso:
    python export_texts.py                  # solo corpus hashtag (curato, ~200k)
    python export_texts.py --all            # anche post da timeline utenti
    python export_texts.py --out file.jsonl
"""
import argparse
import html
import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv

from snm.storage.db import get_connection

load_dotenv()

TAG_RE = re.compile(r"<[^>]+>")


def clean_html(content: str) -> str:
    """HTML Mastodon -> testo piano: tag via, entita' decodificate, spazi normalizzati."""
    text = TAG_RE.sub(" ", content)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def export(database_url: str, out_path: Path, include_timeline: bool) -> int:
    conn = get_connection(database_url)
    source_filter = "" if include_timeline else "AND source = 'hashtag'"
    written = 0
    with conn.cursor(name="texts") as cur, out_path.open("w", encoding="utf-8") as f:
        cur.itersize = 5000
        cur.execute(
            f"""
            SELECT id, language, content, created_at FROM statuses
            WHERE deleted_at IS NULL
              AND reblog_of_id IS NULL
              AND content IS NOT NULL AND content <> ''
              {source_filter}
            """
        )
        for status_id, lang, content, created_at in cur:
            text = clean_html(content)
            if not text:
                continue
            f.write(json.dumps({
                "id": status_id, "lang": lang, "text": text,
                "created_at": created_at.isoformat() if created_at else None,
            }, ensure_ascii=False) + "\n")
            written += 1
    conn.close()
    return written


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="anche post da timeline utenti")
    parser.add_argument("--out", type=str, default="post_texts.jsonl")
    args = parser.parse_args()

    out = Path(args.out)
    n = export(os.environ["DATABASE_URL"], out, include_timeline=args.all)
    print(f"{n} post -> {out} ({out.stat().st_size / 1024 / 1024:.1f} MB)")

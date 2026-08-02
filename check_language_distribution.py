"""Distribuzione dei post per lingua (statuses.language), separata per scope:
corpus di analisi contenutistica (ALLOWED_LANGUAGES: en/it/es/ro) vs resto
della rete (reblog/thread raccolti per il grafo di diffusione, fuori scope
per AI detection/fact-checking — vedi db/schema.sql:77-80).

Uso: python check_language_distribution.py  (legge DATABASE_URL, scrive docs/figures/)
"""
import os
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from dotenv import load_dotenv

from post_collector import ALLOWED_LANGUAGES
from storage import get_connection

load_dotenv()

FIG_DIR = Path(__file__).parent / "docs" / "figures"


def plot_top_languages(conn, out_path: Path, top_n: int = 15) -> None:
    """Istogramma di TUTTE le lingue presenti in statuses, ordinate per numero
    di post decrescente; oltre le top_n vengono accorpate in un'unica barra
    "altre", per mostrare la coda lunga senza affollare l'asse x."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COALESCE(language, 'unknown'), COUNT(*)
            FROM statuses GROUP BY language ORDER BY COUNT(*) DESC
        """)
        rows = cur.fetchall()

    top, rest = rows[:top_n], rows[top_n:]
    labels = [lang for lang, _ in top]
    values = [count for _, count in top]
    colors = ["#4363d8" if lang in ALLOWED_LANGUAGES else "#999999" for lang, _ in top]
    if rest:
        labels.append(f"altre\n({len(rest)} lingue)")
        values.append(sum(count for _, count in rest))
        colors.append("#e6194b")

    plt.figure(figsize=(8, 4))
    plt.bar(labels, values, color=colors)
    plt.xlabel("lingua")
    plt.ylabel("numero di post")
    plt.title(f"Post per lingua (top {top_n}, {len(rows)} lingue totali)")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()


def main() -> None:
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    allowed = sorted(ALLOWED_LANGUAGES)

    conn = get_connection(os.environ["DATABASE_URL"])
    with conn.cursor() as cur:
        cur.execute("""
            SELECT language, COUNT(*)
            FROM statuses
            WHERE language = ANY(%s)
            GROUP BY language
            ORDER BY COUNT(*) DESC
        """, (allowed,))
        corpus_rows = cur.fetchall()

        cur.execute("""
            SELECT COUNT(*) FROM statuses WHERE language IS NULL OR NOT (language = ANY(%s))
        """, (allowed,))
        (rest_count,) = cur.fetchone()

        cur.execute("SELECT COUNT(*) FROM statuses WHERE language IS NULL")
        (null_count,) = cur.fetchone()

        cur.execute("""
            SELECT language, COUNT(*) FROM statuses
            WHERE language IS NOT NULL AND NOT (language = ANY(%s))
            GROUP BY language ORDER BY COUNT(*) DESC
        """, (allowed,))
        other_lang_rows = cur.fetchall()

        cur.execute("""
            SELECT source, COUNT(*) FILTER (WHERE language = ANY(%s)) AS in_corpus, COUNT(*)
            FROM statuses GROUP BY source ORDER BY source
        """, (allowed,))
        by_source = cur.fetchall()

    top_out = FIG_DIR / "language_distribution_top.png"
    plot_top_languages(conn, top_out)
    conn.close()
    print(f"figura (top lingue) salvata in {top_out}")

    corpus_total = sum(count for _, count in corpus_rows)
    total = corpus_total + rest_count

    print(f"corpus di analisi (ALLOWED_LANGUAGES = {allowed}):")
    print(f"{'lingua':10s} {'post':>8s} {'%':>6s}")
    for lang, count in corpus_rows:
        print(f"{lang:10s} {count:8d} {100 * count / corpus_total:5.1f}%")
    print(f"{'totale':10s} {corpus_total:8d}  ({100 * corpus_total / total:.1f}% di tutti i post in DB)")
    print(f"\nresto rete (reblog/thread, fuori scope contenutistico): {rest_count} post ({100 * rest_count / total:.1f}%)")
    print(f"  di cui senza lingua (NULL):        {null_count:8d} ({100 * null_count / rest_count:.1f}%)")
    print(f"  di cui altra lingua ({len(other_lang_rows)} lingue): {rest_count - null_count:8d} ({100 * (rest_count - null_count) / rest_count:.1f}%)")
    print(f"  top 10 altre lingue: {other_lang_rows[:10]}")

    print(f"\n{'source':15s} {'in corpus':>10s} {'totale':>10s} {'%':>6s}")
    for source, in_corpus, count in by_source:
        print(f"{source:15s} {in_corpus:10d} {count:10d} {100 * in_corpus / count:5.1f}%")

    labels = [lang for lang, _ in corpus_rows] + ["resto rete\n(reblog/thread)"]
    values = [count for _, count in corpus_rows] + [rest_count]
    colors = ["#4363d8"] * len(corpus_rows) + ["#999999"]

    plt.figure(figsize=(6, 4))
    plt.bar(labels, values, color=colors)
    plt.ylabel("numero di post")
    plt.title("Post per lingua: corpus di analisi vs resto rete")
    plt.tight_layout()
    out = FIG_DIR / "language_distribution.png"
    plt.savefig(out, dpi=150)
    plt.close()
    print(f"\nfigura salvata in {out}")


if __name__ == "__main__":
    main()

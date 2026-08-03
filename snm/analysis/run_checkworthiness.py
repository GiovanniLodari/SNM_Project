# run_checkworthiness.py
"""Fase 2 (pre-fact-check), pipeline separata e resumabile: calcola una
volta sola il punteggio di verificabilita' per ogni post e lo salva in un
file cache (checkworthy_scores.jsonl). Deterministico (stesso modello,
stesso testo -> stesso punteggio sempre), quindi non va ricalcolato ad ogni
run di fact_check.py - prima girava inline dentro fact_check.py e veniva
rifatto da zero ogni volta che quella pipeline si riavviava (~20-30 min
persi ad ogni restart su 200k post).

Punteggio calcolato per TUTTI i post (nessun filtro lingua): la lingua e'
un filtro che fact_check.py applica per conto suo, la verificabilita' del
testo e' una proprieta' indipendente dalla lingua (il modello e'
multilingua). Cosi' la cache resta valida anche se il filtro lingua di
fact_check.py cambia in futuro.

Uso: python -m snm.analysis.run_checkworthiness --input post_texts.jsonl --output checkworthy_scores.jsonl
"""
import argparse
import json
import math
from pathlib import Path

from snm.analysis.checkworthiness import DEFAULT_THRESHOLD, load_model, score_batch


def load_texts(input_path: Path) -> list[dict]:
    """Legge id+testo da post_texts.jsonl, nessun filtro lingua (vedi
    docstring del modulo)."""
    rows = []
    with input_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if not row.get("text", "").strip():
                continue
            rows.append(row)
    return rows


def load_done_ids(output_path: Path) -> set[int]:
    """Id gia' scorati in un run precedente (resume dopo crash/interruzione).
    Righe troncate/malformate dall'ultimo flush mancato vengono ignorate."""
    done: set[int] = set()
    if not output_path.exists():
        return done
    with output_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                done.add(json.loads(line)["id"])
            except (json.JSONDecodeError, KeyError):
                continue
    return done


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=str, required=True, help="JSONL prodotto da export_texts.py")
    parser.add_argument("--output", type=str, required=True, help="cache JSONL id->punteggio checkworthiness")
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD, help="soglia checkworthy (score >)")
    parser.add_argument("--batch-size", type=int, default=32, help="batch size per il forward pass del modello")
    args = parser.parse_args()

    out_path = Path(args.output)
    done_ids = load_done_ids(out_path)

    rows = load_texts(Path(args.input))
    if done_ids:
        rows = [r for r in rows if r["id"] not in done_ids]
        print(f"{len(done_ids)} post gia' scorati in {out_path} (run precedente), salto")

    if not rows:
        print("nessun post da scorare")
        return

    # Ordina per lunghezza testo: stesso motivo di filter_checkworthy in
    # checkworthiness.py (evita che un outlier lunghissimo forzi padding
    # quadratico su un intero batch - misurato 69% di spreco senza questo).
    rows.sort(key=lambda r: len(r.get("text", "")))
    print(f"{len(rows)} post da scorare (batch_size={args.batch_size})...")

    tokenizer, model = load_model()

    n_batches = math.ceil(len(rows) / args.batch_size)
    write_header_mode = "a" if done_ids else "w"
    with out_path.open(write_header_mode, encoding="utf-8") as out_f:
        done = 0
        for i in range(0, len(rows), args.batch_size):
            batch = rows[i:i + args.batch_size]
            scores = score_batch([r["text"] for r in batch], tokenizer, model, batch_size=args.batch_size)
            for row, score in zip(batch, scores):
                out_f.write(json.dumps({
                    "id": row["id"], "score": score, "checkworthy": score > args.threshold,
                }) + "\n")
            out_f.flush()
            done += len(batch)
            print(f"{done}/{len(rows)} (batch {i // args.batch_size + 1}/{n_batches})")

    print(f"fatto: {done}/{len(rows)} post scorati -> {out_path}")


if __name__ == "__main__":
    main()

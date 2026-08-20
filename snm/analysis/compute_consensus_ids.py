"""Calcola gli ID per cui tutti e 3 i detector concordano che il testo e' IA.

Uso:
    python -m snm.analysis.compute_consensus_ids \
        --fast  data/ai_scores_fast_detect.jsonl \
        --ada   data/ai_scores_ada_detect.jsonl \
        --bino  comparatore_detector/ai_scores_binoculars_corrected.jsonl \
        --out   consensus_ids.jsonl

Output: JSONL con {id, fast_prob, ada_prob, bino_prob} per ogni ID in consenso.
Gli score permettono di filtrare a posteriori (es. fast_prob > 0.8 AND ada_prob > 0.8).
Leggibile da fact_check.py tramite --ai-ids.
"""
import argparse
import json
from pathlib import Path


def load_scores_probability(path: Path) -> dict[int, float]:
    """Legge un JSONL con campo 'probability' (Fast-DetectGPT / AdaDetectGPT).
    Restituisce {id: probability} per tutti i record."""
    scores: dict[int, float] = {}
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            scores[int(row["id"])] = float(row.get("probability", 0))
    return scores


def load_scores_binoculars(path: Path) -> dict[int, float]:
    """Legge il JSONL di binoculars: usa 'probability' (0-1) se presente,
    altrimenti 'ai_probability_pct' / 100. Restituisce {id: probability}."""
    scores: dict[int, float] = {}
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            prob = row.get("probability")
            if prob is None:
                pct = row.get("ai_probability_pct")
                prob = (pct / 100.0) if pct is not None else 0.0
            scores[int(row["id"])] = float(prob)
    return scores


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fast", required=True, help="JSONL Fast-DetectGPT (data/ai_scores_fast_detect.jsonl)")
    parser.add_argument("--ada",  required=True, help="JSONL AdaDetectGPT  (data/ai_scores_ada_detect.jsonl)")
    parser.add_argument("--bino", required=True, help="JSONL Binoculars (Risultati_Binoculars/ai_scores_binoculars.jsonl)")
    parser.add_argument("--threshold", type=float, default=0.5, help="soglia probabilita' per tutti e 3 i detector (default 0.5)")
    parser.add_argument("--mode", choices=["union", "intersection"], default="intersection",
                        help="union: almeno 1 detector sopra soglia; intersection: tutti e 3 (default intersection)")
    parser.add_argument("--out", default="consensus_ids.jsonl", help="JSONL di output con id + 3 score")
    args = parser.parse_args()

    fast_scores = load_scores_probability(Path(args.fast))
    ada_scores  = load_scores_probability(Path(args.ada))
    bino_scores = load_scores_binoculars(Path(args.bino))

    thr = args.threshold
    fast_ai = {i for i, p in fast_scores.items() if p > thr}
    ada_ai  = {i for i, p in ada_scores.items()  if p > thr}
    bino_ai = {i for i, p in bino_scores.items() if p > thr}

    if args.mode == "union":
        consensus = fast_ai | ada_ai | bino_ai
    else:
        consensus = fast_ai & ada_ai & bino_ai

    print(f"Fast-DetectGPT AI (>{thr}): {len(fast_ai)}")
    print(f"AdaDetectGPT   AI (>{thr}): {len(ada_ai)}")
    print(f"Binoculars     AI (>{thr}): {len(bino_ai)}")
    print(f"Modalita': {args.mode} -> {len(consensus)} ID")

    out = Path(args.out)
    with out.open("w", encoding="utf-8") as f:
        for post_id in sorted(consensus):
            f.write(json.dumps({
                "id": post_id,
                "fast_prob": fast_scores.get(post_id),
                "ada_prob":  ada_scores.get(post_id),
                "bino_prob": bino_scores.get(post_id),
            }) + "\n")
    print(f"Scritto: {out}")


if __name__ == "__main__":
    main()

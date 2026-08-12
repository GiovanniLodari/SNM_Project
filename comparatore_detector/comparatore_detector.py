##!/usr/bin/env python3
# ============================================================
#  Path di default relativi alla root del progetto; sovrascrivibili a mano.
# ============================================================
_ROOT = Path(__file__).resolve().parent.parent
PATH_BINOCULARS = str(_ROOT / "binoculars" / "ai_scores_binoculars.jsonl")
PATH_DESKLIB    = str(_ROOT / "desklib_detector" / "risultati.jsonl")
PATH_GPTNEO     = str(_ROOT / "data" / "ai_scores.jsonl")

THRESHOLD = 0.5      # sopra questa probabilita' -> AI
OUTDIR    = "."      # cartella output (corrente)
# ============================================================

import json, urllib.request
from pathlib import Path
from collections import Counter

FIELD_BINOCULARS = "ai_probability_pct"
FIELD_GPTNEO     = "probability"
FIELDS_DESKLIB   = ("probability", "ai_probability", "prob", "score", "ai_probability_pct")


def load_lines(source):
    source = source.strip().strip('"').strip("'")
    if source.lower().startswith(("http://", "https://")):
        with urllib.request.urlopen(source) as r:
            return r.read().decode("utf-8", "replace").splitlines()
    with open(source, "r", encoding="utf-8") as f:
        return f.read().splitlines()


def read_jsonl(source, etichetta):
    records = {}
    for n, line in enumerate(load_lines(source), 1):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            print(f"[warn] {etichetta} riga {n}: JSON non valido, saltata")
            continue
        if "id" in obj:
            records[obj["id"]] = obj
    return records


def to_unit(v):
    if v is None:
        return None
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    return v / 100.0 if v > 1.0 else v


def prob_binoculars(o):
    v = o.get(FIELD_BINOCULARS)
    return float(v) / 100.0 if v is not None else None   # sempre percentuale


def prob_gptneo(o):
    v = o.get(FIELD_GPTNEO)
    return float(v) if v is not None else None


def prob_desklib(o):
    for k in FIELDS_DESKLIB:
        if k in o:
            return to_unit(o[k])
    return None


def is_ai(p, thr):
    return None if p is None else p > thr


def main():
    bino = read_jsonl(PATH_BINOCULARS, "binoculars")
    desk = read_jsonl(PATH_DESKLIB,    "desklib")
    gpt  = read_jsonl(PATH_GPTNEO,     "gpt-neo")
    print(f"Letti: binoculars={len(bino)}  desklib={len(desk)}  gpt-neo={len(gpt)}")

    outdir = Path(OUTDIR); outdir.mkdir(parents=True, exist_ok=True)
    thr = THRESHOLD

    # 1) binoculars corretto (probability 0-1)
    stem = Path(PATH_BINOCULARS.strip().strip('"').split("/")[-1]).stem or "binoculars"
    corrected_path = outdir / (stem + "_corrected.jsonl")
    with open(corrected_path, "w", encoding="utf-8") as f:
        for _id, obj in bino.items():
            new = dict(obj); new["probability"] = prob_binoculars(obj)
            f.write(json.dumps(new, ensure_ascii=False) + "\n")

    # 2) confronto per id
    all_ids = sorted(set(bino) | set(desk) | set(gpt))
    merged, ai_hist, pair = [], Counter(), Counter()
    full_agree = considered_full = 0

    for _id in all_ids:
        pb = prob_binoculars(bino[_id]) if _id in bino else None
        pd = prob_desklib(desk[_id])    if _id in desk else None
        pg = prob_gptneo(gpt[_id])      if _id in gpt  else None
        merged.append({"id": _id, "probability_binoculars": pb,
                       "probability_desklib": pd, "probability_gpt-neo": pg})

        lab = {"bino": is_ai(pb, thr), "desk": is_ai(pd, thr), "gpt": is_ai(pg, thr)}
        present = {k: v for k, v in lab.items() if v is not None}
        ai_hist[sum(1 for v in present.values() if v)] += 1
        for a, b in (("bino", "desk"), ("bino", "gpt"), ("desk", "gpt")):
            if lab[a] is not None and lab[b] is not None and lab[a] == lab[b]:
                pair[f"{a}-{b}"] += 1
        if len(present) == 3:
            considered_full += 1
            if len(set(present.values())) == 1:
                full_agree += 1

    report = {
        "soglia_ai": thr, "id_totali": len(all_ids),
        "id_presenti_in_tutti_e_3": considered_full,
        "conteggio_ai": {
            "ai_per_tutti_e_3": ai_hist.get(3, 0),
            "ai_per_esattamente_2": ai_hist.get(2, 0),
            "ai_per_esattamente_1": ai_hist.get(1, 0),
            "ai_per_nessuno": ai_hist.get(0, 0)},
        "accordo": {"tutti_e_3_stessa_etichetta": full_agree, "coppie": dict(pair)},
        "copertura": {"binoculars": len(bino), "desklib": len(desk), "gpt-neo": len(gpt)},
    }
    with open(outdir / "comparison_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    with open(outdir / "probabilities_merged.json", "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print("\nOutput scritti:")
    print(" -", corrected_path)
    print(" - comparison_report.json")
    print(" - probabilities_merged.json")
    print("\nReport:")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
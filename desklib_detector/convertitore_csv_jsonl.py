#!/usr/bin/env python3
# ============================================================
#  INCOLLA QUI I 2 PATH E PREMI RUN. NIENT'ALTRO.
# ============================================================
PATH_CSV = str(Path(__file__).resolve().parent / "risultati.csv")          # il csv da convertire
PATH_OUT = str(Path(__file__).resolve().parent / "risultati.jsonl")        # il jsonl in uscita
# ============================================================

import csv, json
from pathlib import Path

def clean(p):
    return p.strip().strip('"').strip("'")

def convert(src, dst):
    src, dst = clean(src), clean(dst)
    n = 0
    with open(src, "r", encoding="utf-8-sig", newline="") as fin, \
         open(dst, "w", encoding="utf-8") as fout:
        reader = csv.DictReader(fin)          # usa l'intestazione: id,lang,text,ai_probability
        for row in reader:
            obj = {}
            for k, v in row.items():
                if k is None or v is None:
                    continue
                key = k.strip()
                val = v.strip()
                if key == "id":
                    obj[key] = int(val) if val.lstrip("-").isdigit() else val
                elif key == "ai_probability":
                    try:
                        obj[key] = float(val)
                    except ValueError:
                        obj[key] = None
                else:
                    obj[key] = val
            fout.write(json.dumps(obj, ensure_ascii=False) + "\n")
            n += 1
    print(f"Convertite {n} righe -> {dst}")

if __name__ == "__main__":
    convert(PATH_CSV, PATH_OUT)
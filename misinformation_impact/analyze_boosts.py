"""Analisi boost osservati per gruppo (vero/falso × ai/human)."""
import csv
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA = Path(__file__).parent / "data"


def veracity_group(v: int) -> str:
    if v <= 1: return "vero"
    if v == 2: return "misto"
    if v <= 4: return "falso"
    return "non_verificabile"


posts = {}
with open(ROOT / "fact_check_report.csv", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        vg = veracity_group(int(row["veracity"]))
        if vg not in ("vero", "falso"):
            continue
        suffix = "ai" if row["ai_generated"].strip().lower() == "true" else "human"
        posts[int(row["id"])] = vg + "_" + suffix

boosts = {}
with open(DATA / "post_boosts.jsonl", encoding="utf-8") as f:
    for line in f:
        r = json.loads(line)
        boosts[r["post_id"]] = r["boost_count"]

groups: dict[str, list[int]] = {}
for pid, label in posts.items():
    groups.setdefault(label, []).append(boosts.get(pid, 0))

print(f"{'gruppo':15s}  {'n':>6}  {'mean':>7}  {'median':>7}  {'max':>5}  {'boostati':>8}  {'%boost':>7}")
for g in sorted(groups):
    vals = groups[g]
    nonzero = [v for v in vals if v > 0]
    pct = 100 * len(nonzero) / len(vals)
    mn = statistics.mean(vals)
    med = statistics.median(vals)
    std = statistics.stdev(vals) if len(vals) > 1 else 0.0
    print(f"{g:15s}  {len(vals):>6}  {mn:>7.3f}  {med:>7.1f}  {max(vals):>5}  {len(nonzero):>8}  {pct:>6.1f}%  std={std:.3f}")

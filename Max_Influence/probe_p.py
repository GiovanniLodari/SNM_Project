"""Stima p (probabilità che un candidato appaia in un RR-set casuale).
Usa i gruppi majority-vote da topic_propagators.py, cache CSR già presente.
Output: percentili p per ogni gruppo + stima num_rr con formula Chernoff.
"""
import pickle, sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from topic_propagators import (
    CSR_CACHE_PATH, FACT_CHECK_PATH, POST_AUTHORS_PATH, ACCOUNT_CANONICAL_PATH,
    load_group_members, sample_covers
)
import random

N_PROBE = 500
EPS = 0.1
DELTA = 0.05

print(f"[probe] carico cache CSR da {CSR_CACHE_PATH}")
with open(CSR_CACHE_PATH, "rb") as f:
    g = pickle.load(f)
n_nodes = len(g["node_ids"])
print(f"[probe] {n_nodes} nodi")

print("[probe] carico gruppi majority-vote...")
groups = load_group_members(g, FACT_CHECK_PATH, POST_AUTHORS_PATH, ACCOUNT_CANONICAL_PATH)
all_candidates = set().union(*groups.values())
print(f"[probe] candidati totali: {len(all_candidates)}")
for grp, members in groups.items():
    print(f"  {grp}: {len(members)}")

print(f"\n[probe] campiono {N_PROBE} RR-set...")
rng = random.Random(42)
covers = sample_covers(g, N_PROBE, all_candidates, rng, log_every=100)

print("\n=== Distribuzione p per gruppo (p = copertura/N_PROBE) ===")
import statistics
for grp, members in groups.items():
    ps = [len(covers.get(u, set())) / N_PROBE for u in members if u in covers]
    if not ps:
        print(f"  {grp}: nessun candidato in RR-set")
        continue
    ps.sort()
    p10 = ps[int(len(ps)*0.10)]
    p50 = ps[int(len(ps)*0.50)]
    p90 = ps[int(len(ps)*0.90)]
    print(f"  {grp:15s}  p10={p10:.4f}  p50={p50:.4f}  p90={p90:.4f}  (n={len(ps)})")

# Stima num_rr con Chernoff sul p50 globale
all_ps = sorted(len(covers.get(u, set())) / N_PROBE for u in all_candidates if u in covers)
if all_ps:
    p50_global = all_ps[len(all_ps)//2]
    p_min = all_ps[max(0, int(len(all_ps)*0.05))]  # p5 come worst-case pratico
    theta_p50 = math.ceil(3 * math.log(2/DELTA) / (p50_global * EPS**2))
    theta_p05 = math.ceil(3 * math.log(2/DELTA) / (p_min * EPS**2)) if p_min > 0 else float('inf')
    print(f"\n=== Stima num_rr (Chernoff, eps={EPS}, delta={DELTA}) ===")
    print(f"  p50 globale = {p50_global:.4f}  -> theta = {theta_p50}")
    print(f"  p05 globale = {p_min:.4f}  -> theta = {theta_p05}  (worst-case)")
    t_p50 = theta_p50 * 28.1 / 1000
    t_p05 = theta_p05 * 28.1 / 1000 if theta_p05 != float('inf') else float('inf')
    print(f"  Tempo stimato @28ms/set: p50={t_p50:.0f}s ({t_p50/60:.1f}min)  p05={t_p05:.0f}s ({t_p05/60:.1f}min)")

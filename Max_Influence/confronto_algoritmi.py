"""Confronto di algoritmi di influence maximization sullo STESSO problema.

Stesso grafo, stesse p_ic (Strada A), stesso snowball, stessi candidati IA, stesso k.
Cambia solo l'algoritmo di selezione dei seed. Confronta:
  - PMIA        (euristica veloce, alberi di influenza)   [da PMIA.py]
  - CELF++      (qualita' del greedy, Monte Carlo)          [celfpp.py]
  - SKIM        (sketch / RR-set)                           [skim.py]
  - degree      (baseline: candidati con out-degree maggiore)
  - pagerank    (baseline: candidati con PageRank maggiore)

Valutazione COMUNE e imparziale: spread reale via Monte Carlo IC (im_common).
Output: un JSON di confronto con, per ogni algoritmo, i seed scelti, lo spread
stimato, lo spread Monte Carlo e il tempo; le sovrapposizioni fra i seed set
(Jaccard) e quale algoritmo ottiene lo spread piu' alto.

Accanto servono: graph_builder.py, PMIA.py, celfpp.py, skim.py, im_common.py.
Uso: configura il blocco e lancia:  python confronto_algoritmi.py
"""
from __future__ import annotations

import argparse
import json
import random
import sys
import time
from itertools import combinations

import networkx as nx

import PMIA
import CELFpp
import SKIM
from IM_common import monte_carlo_spread


# =========================================================================== #
#  >>> CONFIGURA QUI <<<
# =========================================================================== #
GEXF   = r"graph-out/influence_graph.gexf"
LABELS = r"users_ai_vs_human.jsonl"

N_SUB   = 10000     # nodi del sottografo su cui confrontare (CELF++ e' lento: tienilo moderato)
K_SEED  = 1000     # seed da scegliere (fra i candidati IA del sottografo)
THETA   = 0.02     # soglia PMIA
NUM_RR  = 4000     # RR-set per SKIM
MC_RUNS_CELF = 100 # simulazioni Monte Carlo per il marginale di CELF++ (basso = piu' veloce)
EVAL_RUNS    = 500 # simulazioni Monte Carlo per la valutazione finale (comune a tutti)
SNOWBALL_STARTS = 8
RANDOM_SEED = 42
SKIP_CELFPP = False   # True per saltare CELF++ (utile se il sottografo e' grande)

LABEL_FIELD, POSITIVE_VALUE, ID_FIELD, MATCH_BY = "more_ai", "true", "acct", "acct"
OUT_JSON = r"confronto_algoritmi.json"
# =========================================================================== #


def degree_select(h, k, candidates):
    cand = [u for u in candidates if h.has_node(u)]
    cand.sort(key=lambda u: h.out_degree(u), reverse=True)
    return cand[:k], None


def pagerank_select(h, k, candidates):
    try:
        pr = nx.pagerank(h, weight="p_ic")
    except (ImportError, ModuleNotFoundError):
        # senza SciPy: uso l'in-degree pesato come proxy di PageRank
        pr = {n: 0.0 for n in h.nodes}
        for u, v, d in h.edges(data=True):
            pr[v] += d.get("p_ic", 0.0)
    cand = [u for u in candidates if h.has_node(u)]
    cand.sort(key=lambda u: pr.get(u, 0.0), reverse=True)
    return cand[:k], None


def compare_on_subgraph(h, candidates, k, args, rng):
    """Esegue tutti gli algoritmi sullo stesso sottografo e li valuta col Monte
    Carlo comune. Ritorna il dizionario di confronto."""
    cand = set(candidates) & set(h.nodes)
    algos = {}

    def run(name, fn):
        t0 = time.time()
        seeds, est = fn()
        dt = time.time() - t0
        mc = monte_carlo_spread(h, seeds, args.eval_runs, random.Random(args.random_seed))
        algos[name] = {"seeds": list(seeds), "n_seeds": len(seeds),
                       "est_spread": (round(est, 3) if est is not None else None),
                       "mc_spread": round(mc, 3), "time_s": round(dt, 2)}
        print(f"[{name:>8}] seed={len(seeds):>4} mc_spread={mc:>10.2f} "
              f"est={('%.2f' % est) if est is not None else '-':>10} tempo={dt:>6.1f}s",
              file=sys.stderr)

    run("PMIA", lambda: PMIA.pmia_select(h, k, cand, theta=args.theta))
    if not args.skip_celfpp:
        run("CELF++", lambda: CELFpp.celfpp_select(h, k, cand, mc_runs=args.mc_runs_celf,
                                                   rng=random.Random(args.random_seed)))
    run("SKIM", lambda: SKIM.skim_select(h, k, cand, num_rr=args.num_rr,
                                        rng=random.Random(args.random_seed)))
    run("degree", lambda: degree_select(h, k, cand))
    run("pagerank", lambda: pagerank_select(h, k, cand))

    # sovrapposizioni fra i seed set (Jaccard)
    overlap = {}
    for a, b in combinations(algos, 2):
        sa, sb = set(algos[a]["seeds"]), set(algos[b]["seeds"])
        u = len(sa | sb)
        overlap[f"{a}|{b}"] = round(len(sa & sb) / u, 4) if u else 0.0

    winner = max(algos, key=lambda a: algos[a]["mc_spread"]) if algos else None
    return {
        "subgraph": {"nodes": h.number_of_nodes(), "edges": h.number_of_edges(),
                     "candidates": len(cand)},
        "k": k, "eval_runs": args.eval_runs,
        "algorithms": algos,
        "seed_overlap_jaccard": overlap,
        "winner_by_mc_spread": winner,
    }


def main():
    p = argparse.ArgumentParser(description="Confronto algoritmi IM sullo stesso sottografo")
    p.add_argument("--gexf", default=GEXF)
    p.add_argument("--labels", default=LABELS)
    p.add_argument("--n-sub", type=int, default=N_SUB)
    p.add_argument("--k", type=int, default=K_SEED)
    p.add_argument("--theta", type=float, default=THETA)
    p.add_argument("--num-rr", type=int, default=NUM_RR)
    p.add_argument("--mc-runs-celf", type=int, default=MC_RUNS_CELF)
    p.add_argument("--eval-runs", type=int, default=EVAL_RUNS)
    p.add_argument("--snowball-starts", type=int, default=SNOWBALL_STARTS)
    p.add_argument("--random-seed", type=int, default=RANDOM_SEED)
    p.add_argument("--skip-celfpp", action="store_true", default=SKIP_CELFPP)
    p.add_argument("--label-field", default=LABEL_FIELD)
    p.add_argument("--positive-value", default=POSITIVE_VALUE)
    p.add_argument("--id-field", default=ID_FIELD)
    p.add_argument("--match-by", choices=["acct", "node_id"], default=MATCH_BY)
    p.add_argument("--out-json", default=OUT_JSON)
    args = p.parse_args()

    rng = random.Random(args.random_seed)
    g = PMIA.load_graph(args)
    print(f"[grafo intero] nodi={g.number_of_nodes()} archi={g.number_of_edges()}", file=sys.stderr)
    candidates = PMIA.resolve_candidates(g, args)
    if not candidates:
        sys.exit("Nessun candidato IA agganciato.")

    # UN sottografo, uguale per tutti gli algoritmi
    h = PMIA.sample_snowball(g, args.n_sub, candidates, rng, args.snowball_starts)
    print(f"[sottografo] nodi={h.number_of_nodes()} archi={h.number_of_edges()}", file=sys.stderr)

    result = compare_on_subgraph(h, candidates, args.k, args, rng)

    print("\n=== CONFRONTO ALGORITMI (stesso sottografo, k={}) ===".format(args.k))
    print(f"{'algoritmo':>10} {'seed':>5} {'spread MC':>11} {'stima':>10} {'tempo(s)':>9}")
    for name, a in sorted(result["algorithms"].items(), key=lambda x: -x[1]["mc_spread"]):
        est = ("%.2f" % a["est_spread"]) if a["est_spread"] is not None else "-"
        print(f"{name:>10} {a['n_seeds']:>5} {a['mc_spread']:>11.2f} {est:>10} {a['time_s']:>9.1f}")
    print(f"\n>> SPREAD PIU' ALTO (Monte Carlo): {result['winner_by_mc_spread']}")
    print("\nsovrapposizione seed (Jaccard):")
    for pair, val in result["seed_overlap_jaccard"].items():
        print(f"   {pair}: {val}")

    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\n[salvato] {args.out_json}", file=sys.stderr)


if __name__ == "__main__":
    main()
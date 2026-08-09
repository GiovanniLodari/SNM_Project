"""CELF++ (Goyal, Lu, Lakshmanan 2011) — selezione dei seed su Independent Cascade.

CELF++ e' un'ottimizzazione del greedy: sfrutta la sottomodularita' (valutazione
lazy) e una doppia contabilita' (mg1/mg2) per evitare ricalcoli. Restituisce lo
STESSO seed set del greedy classico, solo piu' in fretta. Lo spread e' stimato via
Monte Carlo (accurato ma costoso: usa sottografi/k/mc_runs moderati).

Firma identica agli altri selettori: select(h, k, candidates, ...) -> (seeds, spread).
"""
from __future__ import annotations

import heapq

from IM_common import monte_carlo_spread


def celfpp_select(h, k, candidates, spread_fn=None, mc_runs=200, rng=None):
    """Seleziona fino a k seed fra `candidates` (CELF++).
    spread_fn(seeds)->float: oracolo di spread. Se None, usa Monte Carlo IC."""
    cand = [u for u in candidates if h.has_node(u)]
    if not cand:
        return [], 0.0

    if spread_fn is None:
        import random
        _rng = rng or random.Random()

        def spread_fn(seeds):
            return monte_carlo_spread(h, seeds, mc_runs, _rng)

    memo = {}

    def sigma(S):
        key = frozenset(S)
        if key not in memo:
            memo[key] = spread_fn(list(S))
        return memo[key]

    rec = {}
    Q = []
    cur_best, cur_best_mg = None, -1.0
    for u in cand:
        mg1 = sigma([u])                       # S vuoto: sigma({u})-sigma(0)=sigma({u})
        prev_best = cur_best
        mg2 = mg1 if prev_best is None else sigma([prev_best, u]) - sigma([prev_best])
        rec[u] = {"mg1": mg1, "mg2": mg2, "prev_best": prev_best, "flag": 0}
        heapq.heappush(Q, (-mg1, u))
        if mg1 > cur_best_mg:
            cur_best_mg, cur_best = mg1, u

    S, order, spreadS, last_seed = set(), [], 0.0, None
    while len(S) < k and Q:
        _, u = Q[0]
        if u in S:
            heapq.heappop(Q)
            continue
        r = rec[u]
        if r["flag"] == len(S):
            heapq.heappop(Q)
            S.add(u); order.append(u)
            spreadS = sigma(S)
            last_seed = u
            cur_best, cur_best_mg = None, -1.0
            for ng, x in Q:
                if x not in S and -ng > cur_best_mg:
                    cur_best_mg, cur_best = -ng, x
            continue
        if r["prev_best"] == last_seed and last_seed is not None:
            r["mg1"] = r["mg2"]                # riuso: nessun ricalcolo
        else:
            r["mg1"] = sigma(S | {u}) - spreadS
            r["prev_best"] = cur_best
            if cur_best is not None:
                r["mg2"] = sigma(S | {cur_best, u}) - sigma(S | {cur_best})
            else:
                r["mg2"] = r["mg1"]
        r["flag"] = len(S)
        heapq.heapreplace(Q, (-r["mg1"], u))
    return order, spreadS
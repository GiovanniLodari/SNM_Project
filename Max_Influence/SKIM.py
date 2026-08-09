"""SKIM — Sketch-based Influence Maximization (famiglia RIS / reverse-reachable set,
Cohen et al. 2014; Borgs et al. 2014) su Independent Cascade.

Idea: si campionano molti "reverse-reachable set" (RR-set) — l'insieme dei nodi
che possono raggiungere un nodo bersaglio scelto a caso, sotto un campionamento
degli archi con probabilita' p_ic. Un nodo che copre molti RR-set influenza molti
nodi. La selezione dei seed e' un max-coverage greedy sui RR-set, ristretto ai
candidati. Lo spread stimato = n * (frazione di RR-set coperti).

E' l'implementazione efficiente e provabilmente accurata della famiglia sketch/SKIM.
(La variante bottom-k min-hash di SKIM ottimizza la memoria degli sketch; qui uso
la formulazione RR-set, piu' semplice da verificare, con lo stesso risultato.)

Firma: skim_select(h, k, candidates, num_rr, rng) -> (seeds, spread_stimato).
"""
from __future__ import annotations

import heapq
import random
from collections import defaultdict


def _random_rr_set(h, nodes, rng):
    """RR-set: parte da un bersaglio casuale e risale gli archi (predecessori)
    accettando ogni arco con prob. p_ic. Ritorna i nodi che raggiungono il bersaglio."""
    target = nodes[rng.randrange(len(nodes))]
    visited = {target}
    frontier = [target]
    while frontier:
        nxt = []
        for v in frontier:
            for u in h.predecessors(v):
                if u not in visited:
                    p = h[u][v].get("p_ic", 0.0)
                    if p > 0.0 and rng.random() < p:
                        visited.add(u)
                        nxt.append(u)
        frontier = nxt
    return visited


def skim_select(h, k, candidates, num_rr=2000, rng=None):
    rng = rng or random.Random()
    nodes = list(h.nodes)
    n = len(nodes)
    if n == 0:
        return [], 0.0
    cand = set(candidates) & set(nodes)

    # campiona i RR-set e mappa: candidato -> insieme di RR-set che copre
    covers = defaultdict(set)
    for i in range(num_rr):
        rr = _random_rr_set(h, nodes, rng)
        for node in rr:
            if node in cand:
                covers[node].add(i)

    # max-coverage greedy (lazy) ristretto ai candidati
    covered = set()
    seeds = []
    heap = [(-len(s), u) for u, s in covers.items()]
    heapq.heapify(heap)
    while len(seeds) < k and heap:
        neg, u = heapq.heappop(heap)
        if u in seeds:
            continue
        gain = len(covers[u] - covered)
        if heap and gain < -heap[0][0]:
            heapq.heappush(heap, (-gain, u))   # stantio: reinserisci col guadagno vero
            continue
        if gain == 0:
            break
        seeds.append(u)
        covered |= covers[u]

    est_spread = n * len(covered) / num_rr
    return seeds, est_spread
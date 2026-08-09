"""Funzioni comuni a tutti gli algoritmi di influence maximization (modello IC).

Tutte lavorano su un grafo networkx diretto `h` con l'attributo d'arco `p_ic`
(probabilita' di attivazione, Strada A / weighted cascade). Nessuna dipende dal
grafo intero: si passano il sottografo gia' campionato.
"""
from __future__ import annotations


def ic_reachable(h, seeds, rng):
    """Una realizzazione dell'Independent Cascade: ritorna l'insieme dei nodi
    attivati partendo da `seeds` (i seed inclusi)."""
    active = set(seeds)
    frontier = list(seeds)
    while frontier:
        nxt = []
        for u in frontier:
            for v in h.successors(u):
                if v not in active:
                    p = h[u][v].get("p_ic", 0.0)
                    if p > 0.0 and rng.random() < p:
                        active.add(v)
                        nxt.append(v)
        frontier = nxt
    return active


def monte_carlo_spread(h, seeds, runs, rng):
    """Spread atteso = numero medio di nodi attivati su `runs` realizzazioni IC.
    E' il METRO COMUNE e imparziale per confrontare i seed di algoritmi diversi."""
    seeds = list(seeds)
    if not seeds:
        return 0.0
    total = 0
    for _ in range(runs):
        total += len(ic_reachable(h, seeds, rng))
    return total / runs
"""Confronta Louvain (modularita', su grafo non diretto) e Infomap (map
equation, su grafo diretto pesato) sulla stessa proiezione utente->utente.

Criterio di confronto: flow-containment, ossia quanto peso diretto
(boost/reply/mention) resta dentro la stessa community. E' la metrica
rilevante per IM/IBM (community-aware seeding, moderatori sui bridge
inter-community), a differenza della modularita' che Infomap non ottimizza.

Uso: python compare_communities.py  (legge DATABASE_URL)
"""
import logging
import math
import os
from collections import Counter

import networkx as nx
from dotenv import load_dotenv
from infomap import Infomap, Options

from snm.graph.builder import build_user_graph, detect_communities_infomap as run_infomap
from snm.storage.db import get_connection

logger = logging.getLogger(__name__)

load_dotenv()


def run_louvain(undirected: nx.Graph) -> dict:
    communities = nx.community.louvain_communities(undirected, weight="weight", seed=42)
    return {n: i for i, comm in enumerate(communities) for n in comm}


def codelength_of(directed: nx.DiGraph, node_comm: dict) -> float:
    """Codelength (map equation) di una partizione ESTERNA (es. Louvain), valutata
    da Infomap senza ottimizzare (--no-infomap): stessa formula usata per lo score
    ottimo di run_infomap, quindi confrontabile bit-per-bit."""
    node_ids = {n: i for i, n in enumerate(directed.nodes)}
    im = Infomap("--directed --silent")
    for u, v, w in directed.edges(data="weight"):
        im.add_link(node_ids[u], node_ids[v], w)
    im.initial_partition = {node_ids[n]: c for n, c in node_comm.items() if n in node_ids}
    result = im.run(options=Options(no_infomap=True))
    return result.codelength


def normalized_mutual_info(a: dict, b: dict) -> float:
    """NMI tra due partizioni sugli stessi nodi (stdlib, no sklearn)."""
    nodes = list(a.keys())
    n = len(nodes)
    joint = Counter((a[x], b[x]) for x in nodes)
    ca = Counter(a[x] for x in nodes)
    cb = Counter(b[x] for x in nodes)

    def entropy(counts):
        return -sum((c / n) * math.log(c / n) for c in counts.values())

    ha, hb = entropy(ca), entropy(cb)
    mi = sum(
        (c / n) * math.log((c / n) / ((ca[i] / n) * (cb[j] / n)))
        for (i, j), c in joint.items()
    )
    return 2 * mi / (ha + hb) if (ha + hb) > 0 else 1.0


def flow_containment(directed: nx.DiGraph, node_comm: dict) -> float:
    total = intra = 0
    for u, v, w in directed.edges(data="weight"):
        total += w
        if node_comm.get(u) == node_comm.get(v):
            intra += w
    return 100 * intra / total if total else 0.0


def modularity_of(undirected: nx.Graph, node_comm: dict) -> float:
    comms = {}
    for n, c in node_comm.items():
        comms.setdefault(c, set()).add(n)
    return nx.community.modularity(undirected, comms.values(), weight="weight")


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    conn = get_connection(os.environ["DATABASE_URL"])
    logger.info("costruzione grafo dal DB...")
    g = build_user_graph(conn)
    conn.close()

    giant = max(nx.weakly_connected_components(g), key=len)
    directed = g.subgraph(giant).copy()
    undirected = directed.to_undirected()

    logger.info("Louvain...")
    louvain_comm = run_louvain(undirected)
    logger.info("Infomap...")
    infomap_comm, codelength = run_infomap(directed)

    logger.info("codelength della partizione Louvain, valutata da Infomap...")
    louvain_codelength = codelength_of(directed, louvain_comm)

    nmi = normalized_mutual_info(louvain_comm, infomap_comm)
    louvain_fc = flow_containment(directed, louvain_comm)
    infomap_fc = flow_containment(directed, infomap_comm)

    print("\n=== CONFRONTO LOUVAIN vs INFOMAP ===")
    print(f"nodi (componente gigante): {directed.number_of_nodes()}")
    print()
    print(f"Louvain  - community: {len(set(louvain_comm.values()))}"
          f" | modularita': {modularity_of(undirected, louvain_comm):.3f}"
          f" | flow-containment: {louvain_fc:.1f}%")
    print(f"Infomap  - community: {len(set(infomap_comm.values()))}"
          f" | codelength: {codelength:.4f} bit"
          f" | flow-containment: {infomap_fc:.1f}%")
    print()
    print("--- stessa formula (map equation), due partizioni: ---")
    print(f"codelength partizione Louvain:  {louvain_codelength:.4f} bit")
    print(f"codelength partizione Infomap:  {codelength:.4f} bit (ottimo per costruzione)")
    print()
    print(f"NMI (accordo tra le due partizioni): {nmi:.3f}")

    winner = "Infomap" if infomap_fc > louvain_fc else "Louvain"
    print(f"\nsu flow-containment (criterio piu' rilevante per IM/IBM): vince {winner}")
    winner_bits = "Infomap" if codelength < louvain_codelength else "Louvain"
    print(f"su codelength (compressione del flusso, stessa formula): vince {winner_bits}")


if __name__ == "__main__":
    main()

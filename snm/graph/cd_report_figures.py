"""Confronto Louvain / Leiden / Infomap sulla vista diffusione (boost+reply)
del grafo utente->utente, con figure per il report Fase 0
(docs/report_fase0.tex, sezione "community detection: perche' Infomap").

Vista diffusione (non il multi-relazione con mention): i mention sono un arco
debole/non di amplificazione, e su questo corpus sono gonfiati da collisioni
di acct string cross-istanza — su di essi Infomap collassa in una community
da 95.6% dei nodi (vedi graph_builder.py::_diffusion_view). Il confronto va
fatto sugli stessi archi su cui gira la pipeline in produzione.

Uso: python cd_report_figures.py  (legge DATABASE_URL, scrive docs/figures/)
"""
import logging
import os
from pathlib import Path

import igraph as ig
import leidenalg
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import networkx as nx
from dotenv import load_dotenv

from snm.graph.compare_communities import (
    codelength_of,
    flow_containment,
    modularity_of,
    normalized_mutual_info,
    run_louvain,
)
from snm.graph.builder import _diffusion_view, build_user_graph, detect_communities_infomap
from snm.storage.db import get_connection

load_dotenv()
logger = logging.getLogger(__name__)

FIG_DIR = Path(__file__).parent.parent.parent / "docs" / "figures"
COLORS = {"Louvain": "#4363d8", "Leiden": "#f58231", "Infomap": "#3cb44b"}


def run_leiden(undirected: nx.Graph) -> dict:
    """Leiden (RBConfiguration, risoluzione 1 = obiettivo modularity-like,
    stesso terreno di confronto di Louvain)."""
    nodes = list(undirected.nodes)
    idx = {n: i for i, n in enumerate(nodes)}
    g_ig = ig.Graph()
    g_ig.add_vertices(len(nodes))
    g_ig.add_edges([(idx[u], idx[v]) for u, v in undirected.edges])
    g_ig.es["weight"] = [undirected[u][v].get("weight", 1) for u, v in undirected.edges]

    partition = leidenalg.find_partition(
        g_ig, leidenalg.RBConfigurationVertexPartition, weights="weight", seed=42
    )
    return {nodes[i]: c for c, comm in enumerate(partition) for i in comm}


def _sizes(node_comm: dict) -> dict:
    sizes: dict = {}
    for c in node_comm.values():
        sizes[c] = sizes.get(c, 0) + 1
    return sizes


def expected_by_chance(node_comm: dict, n: int) -> float:
    return 100 * sum((s / n) ** 2 for s in _sizes(node_comm).values())


def largest_community_pct(node_comm: dict) -> float:
    sizes = _sizes(node_comm)
    return 100 * max(sizes.values()) / len(node_comm)


def community_size_series(node_comm: dict) -> list:
    return sorted(_sizes(node_comm).values(), reverse=True)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    FIG_DIR.mkdir(parents=True, exist_ok=True)

    conn = get_connection(os.environ["DATABASE_URL"])
    logger.info("costruzione grafo dal DB...")
    g = build_user_graph(conn)
    conn.close()

    giant = max(nx.weakly_connected_components(g), key=len)
    directed_giant = g.subgraph(giant)
    diffusion = _diffusion_view(directed_giant)
    undirected = diffusion.to_undirected()
    n = diffusion.number_of_nodes()

    logger.info("Louvain...")
    louvain_comm = run_louvain(undirected)
    logger.info("Leiden...")
    leiden_comm = run_leiden(undirected)
    logger.info("Infomap...")
    infomap_comm, infomap_codelength = detect_communities_infomap(diffusion)

    partitions = {"Louvain": louvain_comm, "Leiden": leiden_comm, "Infomap": infomap_comm}
    names = list(partitions.keys())

    logger.info("codelength (stessa formula, map equation) per ciascuna partizione...")
    codelengths = {
        name: infomap_codelength if name == "Infomap" else codelength_of(diffusion, comm)
        for name, comm in partitions.items()
    }

    metrics = {}
    for name, comm in partitions.items():
        metrics[name] = {
            "communities": len(set(comm.values())),
            "modularity": modularity_of(undirected, comm),
            "flow_containment": flow_containment(diffusion, comm),
            "expected_by_chance": expected_by_chance(comm, n),
            "largest_pct": largest_community_pct(comm),
            "codelength": codelengths[name],
        }
        logger.info("%s: %s", name, metrics[name])

    nmi = {
        "Louvain-Leiden": normalized_mutual_info(louvain_comm, leiden_comm),
        "Louvain-Infomap": normalized_mutual_info(louvain_comm, infomap_comm),
        "Leiden-Infomap": normalized_mutual_info(leiden_comm, infomap_comm),
    }
    logger.info("NMI: %s", nmi)

    # --- figura 1: codelength (map equation, stessa formula per tutte) ---
    plt.figure(figsize=(5, 4))
    plt.bar(names, [metrics[m]["codelength"] for m in names],
            color=[COLORS[m] for m in names])
    plt.ylabel("codelength (bit) — più basso = comprime meglio il flusso")
    plt.title("Compressione del flusso reale (map equation)")
    plt.tight_layout()
    plt.savefig(FIG_DIR / "cd_codelength.png", dpi=150)
    plt.close()

    # --- figura 2: containment osservato vs atteso per caso ---
    plt.figure(figsize=(6, 4))
    x = range(len(names))
    width = 0.35
    observed = [metrics[m]["flow_containment"] for m in names]
    expected = [metrics[m]["expected_by_chance"] for m in names]
    plt.bar([i - width / 2 for i in x], observed, width, label="osservato", color="#3cb44b")
    plt.bar([i + width / 2 for i in x], expected, width, label="atteso per caso", color="#e6194b")
    plt.xticks(list(x), names)
    plt.ylabel("% peso diretto (boost+reply) intra-community")
    plt.title("Flow-containment: reale vs atteso per caso")
    plt.legend()
    plt.tight_layout()
    plt.savefig(FIG_DIR / "cd_flow_containment.png", dpi=150)
    plt.close()

    # --- figura 3: distribuzione dimensioni community (rank-size, log) ---
    plt.figure(figsize=(6, 4))
    for name in names:
        sizes = community_size_series(partitions[name])
        plt.plot(range(1, len(sizes) + 1), sizes, label=f"{name} ({len(sizes)} community)",
                  color=COLORS[name])
    plt.yscale("log")
    plt.xlabel("rango community (dalla più grande)")
    plt.ylabel("dimensione (nodi, scala log)")
    plt.title("Distribuzione dimensioni community")
    plt.legend()
    plt.tight_layout()
    plt.savefig(FIG_DIR / "cd_size_distribution.png", dpi=150)
    plt.close()

    print("\n=== CONFRONTO LOUVAIN / LEIDEN / INFOMAP (vista diffusione boost+reply) ===")
    for name in names:
        m = metrics[name]
        print(f"{name:10s} community={m['communities']:5d}  Q={m['modularity']:.3f}  "
              f"containment={m['flow_containment']:.1f}% (atteso {m['expected_by_chance']:.1f}%)  "
              f"blob-max={m['largest_pct']:.1f}%  codelength={m['codelength']:.4f} bit")
    print(f"\nNMI: {nmi}")
    print(f"\nfigure salvate in {FIG_DIR}")


if __name__ == "__main__":
    main()

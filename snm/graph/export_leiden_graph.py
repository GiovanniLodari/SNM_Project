# export_leiden_graph.py
"""Esporta il grafo utente->utente per ispezione visuale (Gephi), community
Leiden come attributo nodo (calcolate sulla vista diffusione boost+reply,
componente gigante — stesso terreno di cd_report_figures.py).

Due file:
  user_graph_leiden_full.gexf     - tutti i nodi
  user_graph_leiden_filtered.gexf - esclusi i nodi in componenti (weak,
                                     multi-relazione) di dimensione <= 2

Uso: python export_leiden_graph.py  (legge DATABASE_URL, scrive graph-out/)
"""
import logging
import os
from pathlib import Path

import networkx as nx
from dotenv import load_dotenv

from snm.graph.cd_report_figures import run_leiden
from snm.graph.builder import OUT_DIR, _diffusion_view, build_user_graph, export_gexf
from snm.storage.db import get_connection

load_dotenv()
logger = logging.getLogger(__name__)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    OUT_DIR.mkdir(exist_ok=True)

    conn = get_connection(os.environ["DATABASE_URL"])
    logger.info("costruzione grafo dal DB...")
    g = build_user_graph(conn)
    conn.close()

    components = list(nx.weakly_connected_components(g))
    giant = max(components, key=len)
    directed_giant = g.subgraph(giant)
    diffusion = _diffusion_view(directed_giant)
    undirected = diffusion.to_undirected()

    logger.info("Leiden su vista diffusione (componente gigante, %d nodi)...", undirected.number_of_nodes())
    leiden_comm = run_leiden(undirected)
    nx.set_node_attributes(g, leiden_comm, "community")
    # nodi fuori dalla componente gigante (o senza archi boost+reply): nessuna
    # community Leiden calcolata per loro, li marco -1 per restare visualizzabili
    for n in g.nodes:
        if "community" not in g.nodes[n]:
            g.nodes[n]["community"] = -1

    full_out = OUT_DIR / "user_graph_leiden_full.gexf"
    export_gexf(g, full_out)
    logger.info("esportato %s (%d nodi, %d archi)", full_out, g.number_of_nodes(), g.number_of_edges())

    small_components = {n for c in components if len(c) <= 2 for n in c}
    filtered = g.subgraph(n for n in g.nodes if n not in small_components).copy()
    filtered_out = OUT_DIR / "user_graph_leiden_filtered.gexf"
    export_gexf(filtered, filtered_out)
    logger.info(
        "esportato %s (%d nodi, %d archi; esclusi %d nodi in %d componenti di dimensione <=2)",
        filtered_out, filtered.number_of_nodes(), filtered.number_of_edges(),
        len(small_components), sum(1 for c in components if len(c) <= 2),
    )


if __name__ == "__main__":
    main()

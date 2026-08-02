"""Verifica se la struttura a community trovata da Infomap sul grafo reale e'
genuina o spiegabile solo dalla sequenza di grado (rumore).

Perche' non basta la modularita': Infomap non la ottimizza, quindi applicare
la soglia Newman (Q>=0.3, tarata su Louvain) alla sua partizione non ha senso
teorico (vedi run 2026-07-21: Q crolla a 0.025 pur con flow-containment
98.7%). Il test corretto e nativo di Infomap e' il confronto contro un modello
nullo: si genera un grafo random con la STESSA sequenza di grado in/out e la
STESSA distribuzione di pesi (configuration model diretto), si misura quanto
Infomap comprime anche li'. Se il grafo reale comprime molto di piu' del
rumore strutturale atteso (z-score alto), la community structure e' genuina.

Metrica: relative_codelength_savings = 1 - L(partizione)/L(un solo modulo),
gia' calcolata da Infomap stesso — non e' una soglia inventata, e' la
quantita' con cui il map equation confronta la partizione trovata contro il
caso "nessuna struttura".

Uso: python infomap_significance.py [--n-null 5]
"""
import argparse
import logging
import os
import random
import statistics

import networkx as nx
from dotenv import load_dotenv
from infomap import Infomap

from graph_builder import build_user_graph
from storage import get_connection

load_dotenv()
logger = logging.getLogger(__name__)


def codelength_savings(directed: nx.DiGraph) -> float:
    node_ids = {n: i for i, n in enumerate(directed.nodes)}
    im = Infomap("--directed --silent")
    for u, v, w in directed.edges(data="weight"):
        im.add_link(node_ids[u], node_ids[v], w)
    result = im.run()
    return result.relative_codelength_savings


def null_model(directed: nx.DiGraph, seed: int) -> nx.DiGraph:
    """Configuration model diretto: approssima la sequenza di grado in/out del
    grafo reale (self-loop e multi-archi generati dallo stub-matching vengono
    scartati — su un grafo sparso di questa scala la perdita e' trascurabile),
    pesi originali riassegnati a caso sui nuovi archi (stessa distribuzione di
    pesi, topologia casuale)."""
    in_deg = [d for _, d in directed.in_degree()]
    out_deg = [d for _, d in directed.out_degree()]
    rand = nx.directed_configuration_model(in_deg, out_deg, seed=seed)
    rand = nx.DiGraph(rand)  # collassa multi-archi
    rand.remove_edges_from(nx.selfloop_edges(rand))

    weights = [w for _, _, w in directed.edges(data="weight")]
    rng = random.Random(seed)
    rng.shuffle(weights)
    for i, (u, v) in enumerate(rand.edges()):
        rand[u][v]["weight"] = weights[i % len(weights)]
    return rand


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n-null", type=int, default=5)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    conn = get_connection(os.environ["DATABASE_URL"])
    logger.info("costruzione grafo dal DB...")
    g = build_user_graph(conn)
    conn.close()

    giant = max(nx.weakly_connected_components(g), key=len)
    directed = g.subgraph(giant).copy()

    logger.info("Infomap sul grafo reale...")
    real_savings = codelength_savings(directed)

    null_savings = []
    for i in range(args.n_null):
        logger.info("modello nullo %d/%d...", i + 1, args.n_null)
        rand_g = null_model(directed, seed=i)
        null_savings.append(codelength_savings(rand_g))

    mean_null = statistics.mean(null_savings)
    std_null = statistics.pstdev(null_savings) if len(null_savings) > 1 else 0.0
    z = (real_savings - mean_null) / std_null if std_null > 0 else float("inf")

    print("\n=== SIGNIFICATIVITA' STRUTTURA A COMMUNITY (Infomap vs modello nullo) ===")
    print(f"relative_codelength_savings rete reale:   {real_savings:.4f}")
    print(f"relative_codelength_savings modello nullo (n={args.n_null}): "
          f"media {mean_null:.4f}, std {std_null:.4f}")
    print(f"valori nulli: {[round(v, 4) for v in null_savings]}")
    print(f"z-score: {z:.2f}")
    print("VERDETTO: struttura genuina (z > 3) -> IM/IBM" if z > 3
          else "VERDETTO: non distinguibile dal caso -> mean-field")


if __name__ == "__main__":
    main()

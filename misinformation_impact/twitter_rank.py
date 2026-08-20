"""TwitterRank topic-aware per nodo.

Per ogni topic t (derivato dagli attributi nodes del grafo):
  - Distribuzione topic: multi-hot normalizzata (o uniforme se nessun topic)
  - Matrice di transizione T_t[u→v] = w(u,v) * p(t|v) / Σ_j w(u,j)*p(t|j)
  - PageRank su T_t → TR(v, t) = importanza/soggezione di v per topic t

Output:
  data/topic_list.json        — lista ordinata dei topic canonici
  data/node_order.json        — mapping node_id_str → indice riga nella matrice
  data/twitter_rank.npz       — matrice (n_nodes, K) float32
"""
import json
import numpy as np
import scipy.sparse as sp
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_DIR = Path(__file__).parent / "data"

ALPHA = 0.85
MAX_ITER = 100
TOL = 1e-6
P0 = 0.05


def parse_topics(raw: str) -> list[str]:
    return [t.strip() for t in raw.split(",") if t.strip()]


def build_topic_dist(nodes_data: list[tuple], topic_index: dict[str, int]) -> np.ndarray:
    """Matrice (n, K) delle distribuzioni topic per nodo."""
    K = len(topic_index)
    n = len(nodes_data)
    dist = np.zeros((n, K), dtype=np.float32)
    for i, (_, attrs) in enumerate(nodes_data):
        raw = attrs.get("topics", "")
        if raw:
            topics = parse_topics(raw)
            valid = [topic_index[t] for t in topics if t in topic_index]
            if valid:
                for ti in valid:
                    dist[i, ti] = 1.0
                dist[i] /= dist[i].sum()
                continue
        dist[i] = 1.0 / K  # uniforme se nessun topic noto
    return dist


def compute_twitter_rank(
    edge_src: np.ndarray,
    edge_dst: np.ndarray,
    edge_w: np.ndarray,
    topic_dist: np.ndarray,
    alpha: float = ALPHA,
) -> np.ndarray:
    """Restituisce matrice TR (n, K)."""
    n, K = topic_dist.shape
    TR = np.zeros((n, K), dtype=np.float64)

    for t in range(K):
        p_t = topic_dist[:, t].astype(np.float64)

        # raw weight arco (u→v): w * p(t|v)
        raw = edge_w * p_t[edge_dst]

        # normalizzazione per riga (per nodo src)
        row_sum = np.zeros(n, dtype=np.float64)
        np.add.at(row_sum, edge_src, raw)

        denom = row_sum[edge_src]
        mask = denom > 0
        vals = np.where(mask, raw / np.where(mask, denom, 1.0), 0.0)

        # T_t: colonne = src (danno), righe = dst (ricevono)
        T = sp.csr_matrix((vals, (edge_dst, edge_src)), shape=(n, n))

        # gestione dangling: nodi senza uscite → ridistribuisci uniformemente
        dangling = np.where(row_sum == 0)[0]
        dangling_v = np.zeros(n)
        dangling_v[dangling] = 1.0

        pr = np.ones(n) / n
        for _ in range(MAX_ITER):
            dangling_contrib = dangling_v.dot(pr) / n
            pr_new = alpha * (T.dot(pr) + dangling_contrib) + (1 - alpha) / n
            if np.abs(pr_new - pr).sum() < TOL:
                break
            pr = pr_new

        TR[:, t] = pr
        print(f"  topic {t:2d}: converged  min={pr.min():.2e}  max={pr.max():.2e}")

    return TR


def main() -> None:
    import networkx as nx

    graph_path = ROOT / "Max_Influence" / "graph-out" / "influence_graph.gexf"
    print("Carico grafo...")
    g = nx.read_gexf(str(graph_path))
    print(f"  {g.number_of_nodes()} nodi, {g.number_of_edges()} archi")

    # topic canonici
    all_topics: set[str] = set()
    for _, attrs in g.nodes(data=True):
        raw = attrs.get("topics", "")
        if raw:
            for t in parse_topics(raw):
                all_topics.add(t)
    topic_list = sorted(all_topics)
    topic_index = {t: i for i, t in enumerate(topic_list)}
    K = len(topic_list)
    print(f"  {K} topic canonici")

    # ordine nodi
    nodes_data = list(g.nodes(data=True))
    node_order = {nid: i for i, (nid, _) in enumerate(nodes_data)}
    n = len(nodes_data)

    # distribuzioni topic per nodo
    print("Calcolo distribuzioni topic per nodo...")
    topic_dist = build_topic_dist(nodes_data, topic_index)
    covered = np.sum(topic_dist.max(axis=1) > 1.0 / K + 1e-6)
    print(f"  nodi con topic esplicito: {covered}/{n}")

    # edge arrays
    print("Costruisco edge arrays...")
    srcs, dsts, ws = [], [], []
    for u, v, d in g.edges(data=True):
        ui, vi = node_order.get(u), node_order.get(v)
        if ui is not None and vi is not None:
            srcs.append(ui)
            dsts.append(vi)
            ws.append(float(d.get("weight", 1.0)))
    edge_src = np.array(srcs, dtype=np.int32)
    edge_dst = np.array(dsts, dtype=np.int32)
    edge_w = np.array(ws, dtype=np.float64)
    print(f"  {len(edge_src)} archi validi")

    print("Calcolo TwitterRank per topic...")
    TR = compute_twitter_rank(edge_src, edge_dst, edge_w, topic_dist)

    DATA_DIR.mkdir(exist_ok=True)
    np.savez_compressed(DATA_DIR / "twitter_rank.npz", TR=TR.astype(np.float32))
    with (DATA_DIR / "topic_list.json").open("w", encoding="utf-8") as f:
        json.dump(topic_list, f, ensure_ascii=False, indent=2)
    with (DATA_DIR / "node_order.json").open("w", encoding="utf-8") as f:
        json.dump(node_order, f)
    print(f"Salvato: twitter_rank.npz ({n}×{K}), topic_list.json, node_order.json")


if __name__ == "__main__":
    main()

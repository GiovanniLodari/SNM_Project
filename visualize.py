# visualize.py
"""Genera una visualizzazione HTML interattiva di un sottografo del grafo
utente->utente (il grafo intero e' illeggibile: si filtra prima).

Uso:
    python visualize.py                     # top 300 nodi per grado pesato
    python visualize.py --top 500           # top N
    python visualize.py --topic Politics    # solo account attivi in un topic
    python visualize.py --community 3       # solo una community (id Louvain)

Legge graph-out/user_graph.gexf (prodotto da graph_builder.py) e scrive
graph-out/subgraph.html, apribile nel browser. Nodi colorati per community,
dimensione = grado pesato; tooltip con acct, follower, bot.
"""
import argparse
from pathlib import Path

import networkx as nx
from pyvis.network import Network

OUT_DIR = Path(__file__).parent / "graph-out"

PALETTE = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4",
    "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff",
]


def load_graph() -> nx.DiGraph:
    return nx.read_gexf(OUT_DIR / "user_graph.gexf")


def filter_subgraph(
    g: nx.DiGraph, top: int, topic: str | None, community: int | None
) -> nx.DiGraph:
    nodes = list(g.nodes)
    if topic:
        nodes = [n for n in nodes if topic.lower() in g.nodes[n].get("topics", "").lower()]
    if community is not None:
        nodes = [n for n in nodes if g.nodes[n].get("community") == community]

    strength = {n: sum(d["weight"] for _, _, d in g.edges(n, data=True)) for n in nodes}
    top_nodes = sorted(nodes, key=lambda n: strength[n], reverse=True)[:top]
    return g.subgraph(top_nodes)


def render(sub: nx.DiGraph, out_path: Path) -> None:
    net = Network(
        height="900px", width="100%", directed=True,
        bgcolor="#111111", font_color="#eeeeee", cdn_resources="in_line",
    )
    for n, data in sub.nodes(data=True):
        comm = data.get("community")
        color = PALETTE[comm % len(PALETTE)] if isinstance(comm, int) else "#999999"
        degree = sub.degree(n)
        title = (f"{data.get('acct', n)}\nfollower: {data.get('followers', '?')}"
                 f"\nbot: {data.get('bot')}\ncommunity: {comm}")
        net.add_node(
            n, label=data.get("acct", str(n))[:25], color=color,
            size=10 + 3 * degree ** 0.5, title=title,
        )
    for u, v, data in sub.edges(data=True):
        net.add_edge(u, v, value=data.get("weight", 1),
                     title=f"boost {data.get('w_boost', 0)}, reply {data.get('w_reply', 0)}, "
                           f"mention {data.get('w_mention', 0)}")
    net.toggle_physics(True)
    # write_html di pyvis usa l'encoding di default (cp1252 su Windows) e
    # esplode sugli emoji negli username: si scrive a mano in UTF-8.
    out_path.write_text(net.generate_html(), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--top", type=int, default=300)
    parser.add_argument("--topic", type=str, default=None)
    parser.add_argument("--community", type=int, default=None)
    args = parser.parse_args()

    g = load_graph()
    sub = filter_subgraph(g, args.top, args.topic, args.community)
    out = OUT_DIR / "subgraph.html"
    render(sub, out)
    print(f"{sub.number_of_nodes()} nodi, {sub.number_of_edges()} archi -> {out}")


if __name__ == "__main__":
    main()

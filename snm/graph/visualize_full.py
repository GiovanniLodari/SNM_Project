# visualize_full.py
"""Visualizzazione HTML del grafo COMPLETO su GPU (WebGL, libreria Cosmograph).

A differenza di visualize.py (pyvis, CPU, max ~1k nodi), qui il layout
force-directed gira sulla GPU del browser: 60k nodi e centinaia di migliaia di
archi sono gestibili. Richiede connessione internet all'apertura (libreria da CDN).

Uso:
    python visualize_full.py                 # grafo completo
    python visualize_full.py --no-mention    # solo boost+reply (piu' leggibile:
                                             # le mention sono l'87% degli archi)

Legge graph-out/user_graph.gexf, scrive graph-out/full_graph.html.
"""
import argparse
import json
from pathlib import Path

import networkx as nx

OUT_DIR = Path(__file__).parent.parent.parent / "graph-out"

PALETTE = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4",
    "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff",
    "#9a6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1",
]

TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>SNM - grafo diffusione</title>
<style>
  html, body {{ margin: 0; height: 100%; background: #111; overflow: hidden; }}
  canvas {{ width: 100vw; height: 100vh; display: block; }}
  #info {{ position: fixed; top: 8px; left: 8px; color: #eee;
          font: 13px sans-serif; background: #000a; padding: 6px 10px;
          border-radius: 6px; z-index: 10; }}
</style>
</head>
<body>
<div id="info">caricamento libreria GPU…</div>
<canvas id="graph"></canvas>
<script type="module">
import {{ Graph }} from "https://esm.sh/@cosmograph/cosmos@1.6.1";

const nodes = {nodes_json};
const links = {links_json};
const info = document.getElementById("info");

const graph = new Graph(document.getElementById("graph"), {{
  backgroundColor: "#111111",
  nodeColor: n => n.color,
  nodeSize: n => n.size,
  linkColor: "#44444455",
  linkWidth: 0.5,
  simulation: {{ repulsion: 0.5, gravity: 0.2, friction: 0.85, linkDistance: 5 }},
  events: {{
    onClick: n => {{
      info.textContent = n
        ? `${{n.acct}} — community ${{n.community}}, follower ${{n.followers}}`
        : "{n_nodes} nodi, {n_links} archi";
    }},
  }},
}});
graph.setData(nodes, links);
info.textContent = "{n_nodes} nodi, {n_links} archi — rotella: zoom, trascina: pan, click su nodo: dettagli";
</script>
</body>
</html>
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-mention", action="store_true",
                        help="escludi archi solo-mention (tiene boost+reply)")
    args = parser.parse_args()

    g = nx.read_gexf(OUT_DIR / "user_graph.gexf")

    links = []
    for u, v, d in g.edges(data=True):
        if args.no_mention and d.get("w_boost", 0) == 0 and d.get("w_reply", 0) == 0:
            continue
        links.append({"source": u, "target": v})

    used = {l["source"] for l in links} | {l["target"] for l in links}
    nodes = []
    for n, d in g.nodes(data=True):
        if n not in used:
            continue
        comm = d.get("community")
        degree = g.degree(n)
        nodes.append({
            "id": n,
            "acct": d.get("acct", str(n)),
            "community": comm,
            "followers": d.get("followers", 0),
            "color": PALETTE[comm % len(PALETTE)] if isinstance(comm, int) else "#888888",
            "size": 2 + degree ** 0.5,
        })

    html = TEMPLATE.format(
        n_nodes=len(nodes), n_links=len(links),
        nodes_json=json.dumps(nodes), links_json=json.dumps(links),
    )
    out = OUT_DIR / ("diffusion_graph.html" if args.no_mention else "full_graph.html")
    out.write_text(html, encoding="utf-8")
    print(f"{len(nodes)} nodi, {len(links)} archi -> {out}")


if __name__ == "__main__":
    main()

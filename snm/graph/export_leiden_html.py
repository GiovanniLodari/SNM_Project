# export_leiden_html.py
"""Visualizzazione HTML (WebGL, Cosmograph) dei due grafi con community Leiden
prodotti da export_leiden_graph.py. A differenza di visualize_full.py, la
simulazione force-directed si ferma da sola dopo pochi secondi (graph.pause())
invece di girare all'infinito: il layout si assesta e resta leggero per la GPU,
niente animazione continua in background.

Legge graph-out/user_graph_leiden_{full,filtered}.gexf, scrive
graph-out/leiden_{full,filtered}.html.

Uso: python export_leiden_html.py
"""
import json
from pathlib import Path

import networkx as nx

from snm.graph.builder import OUT_DIR

PALETTE = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4",
    "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff",
    "#9a6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1",
]

# la simulazione si ferma da sola dopo questo tempo (ms): layout leggero per
# la GPU dopo l'assestamento iniziale, niente animazione perenne.
SIM_STOP_MS = 6000

TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>SNM - {title}</title>
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
        : "{n_nodes} nodi, {n_links} archi — layout fermo";
    }},
  }},
}});
graph.setData(nodes, links);
info.textContent = "{n_nodes} nodi, {n_links} archi — rotella: zoom, trascina: pan, click su nodo: dettagli";

// ferma la simulazione dopo l'assestamento: niente animazione GPU continua
setTimeout(() => {{
  graph.pause();
  info.textContent += " (layout fermo)";
}}, {sim_stop_ms});
</script>
</body>
</html>
"""


def render(gexf_path: Path, out_path: Path, title: str) -> None:
    g = nx.read_gexf(gexf_path)

    links = [{"source": u, "target": v} for u, v in g.edges()]
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
            "color": PALETTE[comm % len(PALETTE)] if isinstance(comm, int) and comm >= 0 else "#888888",
            "size": 2 + degree ** 0.5,
        })

    html = TEMPLATE.format(
        title=title, n_nodes=len(nodes), n_links=len(links),
        nodes_json=json.dumps(nodes), links_json=json.dumps(links),
        sim_stop_ms=SIM_STOP_MS,
    )
    out_path.write_text(html, encoding="utf-8")
    print(f"{len(nodes)} nodi, {len(links)} archi -> {out_path}")


def main() -> None:
    render(OUT_DIR / "user_graph_leiden_full.gexf", OUT_DIR / "leiden_full.html",
           "grafo diffusione (Leiden, tutti i nodi)")
    render(OUT_DIR / "user_graph_leiden_filtered.gexf", OUT_DIR / "leiden_filtered.html",
           "grafo diffusione (Leiden, escluse catene <=2)")


if __name__ == "__main__":
    main()

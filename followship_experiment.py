# followship_experiment.py
"""
Esperimento alternativo: costruisce una rete di followship (chi segue chi)
basata sui following dei top account del database. Include sia i seed
sia tutti gli account seguiti (espansione ego-network) per generare una
struttura di grafo reale e altamente connessa.

Esporta:
  - graph-out/followship_experiment.gexf (per Gephi)
  - graph-out/followship_experiment.html (visualizzazione interattiva WebGL)
"""
import os
import re
import json
import logging
from pathlib import Path
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
import networkx as nx
from dotenv import load_dotenv
from infomap import Infomap

from storage import get_connection
from credentials import get_optional_token

# Configura log
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Carica configurazione
if os.path.exists(".env"):
    load_dotenv(".env")
elif os.path.exists("env"):
    load_dotenv("env")

DATABASE_URL = os.environ.get("DATABASE_URL")
OUT_DIR = Path(__file__).parent / "graph-out"

# Dimensioni per l'esperimento followship esteso
SAMPLE_SIZE = 50  # Numero di account "seed" di cui scaricare i following
MAX_FOLLOWINGS_PER_ACCOUNT = 80  # Limite di following da analizzare per account

PALETTE = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4",
    "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff",
    "#9a6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1",
]


def load_seed_accounts(conn) -> list[dict]:
    """
    Carica i top SAMPLE_SIZE account per numero di follower da usare come seed.
    """
    with conn.cursor() as cur:
        # Carica i seed (i top SAMPLE_SIZE per followers_count)
        cur.execute(
            """
            SELECT a.id, a.mastodon_id, a.acct, a.username, ai.domain,
                   COALESCE((a.raw->>'followers_count')::int, 0) AS followers
            FROM accounts a
            JOIN instances ai ON ai.id = a.instance_id
            ORDER BY followers DESC
            LIMIT %s
            """,
            (SAMPLE_SIZE,)
        )
        seed_rows = cur.fetchall()
        
        seed_accounts = []
        for aid, mid, acct, username, domain, followers in seed_rows:
            # Canonicalizzazione acct
            acct_canon = acct.lower()
            if "@" not in acct_canon:
                acct_canon = f"{acct_canon}@{domain.lower()}"
                
            seed_accounts.append({
                "id": aid,
                "mastodon_id": mid,
                "acct": acct_canon,
                "username": username,
                "domain": domain.lower(),
                "followers": followers
            })
            
    return seed_accounts


def lookup_home_id(domain: str, username: str) -> str | None:
    """
    Risolve lo username sul suo dominio di origine per ottenerne l'ID corretto su quell'istanza.
    """
    url = f"https://{domain}/api/v1/accounts/lookup"
    try:
        response = requests.get(url, params={"acct": username}, timeout=5)
        response.raise_for_status()
        return str(response.json().get("id"))
    except Exception as e:
        logger.debug(f"Lookup dell'account fallito per {username}@{domain}: {e}")
        return None


def fetch_following(domain: str, mastodon_id: str, token: str | None) -> list:
    """
    Interroga l'API di Mastodon per ottenere l'elenco di account seguiti.
    """
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    url = f"https://{domain}/api/v1/accounts/{mastodon_id}/following"
    params = {"limit": min(80, MAX_FOLLOWINGS_PER_ACCOUNT)}
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=6)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.debug(f"Impossibile recuperare following per {mastodon_id}@{domain}: {e}")
        return []


def process_seed_account(seed: dict, token: str | None) -> tuple[list, dict]:
    """
    Risolve l'ID remoto dell'account seed, ne scarica i following ed estrae attributi dei target.
    Ritorna:
      - edges: lista di tuple (seed_acct, followed_acct)
      - nodes_attr: dizionario followed_acct -> attributi (bot, followers, acct)
    """
    # Estrae username e home_domain dall'acct canonicalizzato
    parts = seed["acct"].split("@")
    home_username = parts[0]
    home_domain = parts[1]
    
    # 1. Risolve l'ID del seed sulla sua istanza di casa
    home_id = lookup_home_id(home_domain, home_username)
    if not home_id:
        logger.warning(f"Impossibile risolvere ID per {seed['acct']} su {home_domain}, provo ad usare l'ID in cache...")
        home_id = seed["mastodon_id"]
        home_domain = seed["domain"]  # fallback sul dominio di scraping
        
    # 2. Scarica i following dal server nativo
    following_list = fetch_following(home_domain, home_id, token)
    edges = []
    nodes_attr = {}
    
    for item in following_list:
        url = item.get("url")
        if not url:
            continue
            
        parsed_url = urlparse(url)
        followed_domain = parsed_url.netloc.lower()
        
        acct = item.get("acct")
        if "@" not in acct:
            acct = f"{acct}@{followed_domain}"
        else:
            acct = acct.lower()
            
        # Salva arco: il seed segue l'account target
        edges.append((seed["acct"], acct))
        nodes_attr[acct] = {
            "acct": acct,
            "bot": item.get("bot", False),
            "followers": int(item.get("followers_count") or 0),
            "domain": followed_domain
        }
        
    return edges, nodes_attr


def run_infomap(g: nx.DiGraph) -> dict:
    """
    Esegue Infomap sul grafo orientato per rilevare le community.
    """
    node_ids = {n: i for i, n in enumerate(g.nodes)}
    rev = {i: n for n, i in node_ids.items()}
    
    im = Infomap("--directed --silent")
    for i in node_ids.values():
        im.add_node(i)
    for u, v in g.edges():
        im.add_link(node_ids[u], node_ids[v], 1.0)
        
    result = im.run()
    return {rev[n.node_id]: n.module_id for n in result.tree() if n.is_leaf}


def generate_html(g: nx.DiGraph, out_path: Path) -> None:
    """
    Genera una pagina HTML interattiva Cosmograph per visualizzare il grafo.
    """
    links = [{"source": u, "target": v} for u, v in g.edges()]
    used_nodes = {l["source"] for l in links} | {l["target"] for l in links}
    
    nodes_data = []
    for n, d in g.nodes(data=True):
        if n not in used_nodes:
            continue
        comm = d.get("community", 0)
        degree = g.degree(n)
        nodes_data.append({
            "id": n,
            "acct": d.get("acct", str(n)),
            "community": comm,
            "followers": d.get("followers", 0),
            "color": PALETTE[comm % len(PALETTE)] if comm >= 0 else "#888888",
            "size": 2 + (degree ** 0.4) * 1.5,
        })

    html_template = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>SNM - Followship Graph (Ego-Expanded)</title>
<style>
  html, body { margin: 0; height: 100%; background: #111; overflow: hidden; }
  canvas { width: 100vw; height: 100vh; display: block; }
  #info { position: fixed; top: 8px; left: 8px; color: #eee;
          font: 13px sans-serif; background: #000a; padding: 6px 10px;
          border-radius: 6px; z-index: 10; }
</style>
</head>
<body>
<div id="info">Caricamento in corso...</div>
<canvas id="graph"></canvas>
<script type="module">
import { Graph } from "https://esm.sh/@cosmograph/cosmos@1.6.1";

const nodes = """ + json.dumps(nodes_data) + """;
const links = """ + json.dumps(links) + """;
const info = document.getElementById("info");

const graph = new Graph(document.getElementById("graph"), {
  backgroundColor: "#111111",
  nodeColor: n => n.color,
  nodeSize: n => n.size,
  linkColor: "#66666633",
  linkWidth: 0.5,
  simulation: { repulsion: 0.7, gravity: 0.25, friction: 0.82, linkDistance: 7 },
  events: {
    onClick: n => {
      info.textContent = n
        ? `${n.acct} — Community ${n.community}, Followers ${n.followers}`
        : `${nodes.length} nodi, ${links.length} archi - layout fisso`;
    },
  },
});
graph.setData(nodes, links);
info.textContent = `${nodes.length} nodi, ${links.length} archi. Rotella: zoom, Trascina: pan, Click su un nodo: dettagli`;

setTimeout(() => {
  graph.pause();
  info.textContent += " (layout consolidato)";
}, 6000);
</script>
</body>
</html>
"""
    out_path.write_text(html_template, encoding="utf-8")


def generate_cpu_html(g: nx.DiGraph, out_path: Path) -> None:
    """
    Genera una pagina HTML interattiva vis.js (Canvas 2D, CPU) per visualizzare il grafo.
    """
    nodes_data = []
    links = []
    
    # Per vis.js, gli archi usano "from" e "to"
    for u, v in g.edges():
        links.append({"from": u, "to": v})
        
    used_nodes = {l["from"] for l in links} | {l["to"] for l in links}
    
    for n, d in g.nodes(data=True):
        if n not in used_nodes:
            continue
        comm = d.get("community", 0)
        degree = g.degree(n)
        
        # tooltip HTML
        tooltip = f"<b>{d.get('acct', str(n))}</b><br>Community: {comm}<br>Followers: {d.get('followers', 0)}"
        
        nodes_data.append({
            "id": n,
            "title": tooltip,
            "color": PALETTE[comm % len(PALETTE)] if comm >= 0 else "#888888",
            "size": 8 + int((degree ** 0.5) * 4),
            "label": d.get("acct", str(n)).split("@")[0] if degree > 3 else ""
        })

    html_template = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>SNM - Followship Graph (Vis-Network CPU Fallback)</title>
<script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
<style>
  html, body { margin: 0; height: 100%; background: #111; overflow: hidden; }
  #network { width: 100vw; height: 100vh; display: block; }
  #info { position: fixed; top: 8px; left: 8px; color: #eee;
          font: 13px sans-serif; background: #000a; padding: 6px 10px;
          border-radius: 6px; z-index: 10; }
</style>
</head>
<body>
<div id="info">Caricamento e simulazione fisica... (Attendere la stabilizzazione)</div>
<div id="network"></div>
<script type="text/javascript">
const nodes = """ + json.dumps(nodes_data) + """;
const edges = """ + json.dumps(links) + """;
const info = document.getElementById("info");

const container = document.getElementById('network');
const data = { nodes: nodes, edges: edges };
const options = {
  nodes: {
    shape: 'dot',
    font: { size: 11, color: '#ffffff' }
  },
  edges: {
    width: 0.15,
    color: { color: '#666666', opacity: 0.2 },
    arrows: { to: { enabled: true, scaleFactor: 0.3 } },
    smooth: { type: 'continuous' }
  },
  physics: {
    stabilization: {
      iterations: 200,
      updateInterval: 50
    },
    barnesHut: {
      gravitationalConstant: -1800,
      centralGravity: 0.15,
      springLength: 90,
      springConstant: 0.05,
      damping: 0.09,
      avoidOverlap: 0.1
    }
  },
  interaction: {
    hideEdgesOnDrag: true,
    tooltipDelay: 150
  }
};

const network = new vis.Network(container, data, options);

network.once("stabilizationIterationsDone", function() {
  info.textContent = `${nodes.length} nodi, ${edges.length} archi. Rotella: zoom, Trascina: pan. Fisica disattivata per fluidità CPU.`;
  network.setOptions({ physics: false });
});
</script>
</body>
</html>
"""
    out_path.write_text(html_template, encoding="utf-8")


def main():
    if not DATABASE_URL:
        logger.error("DATABASE_URL non configurata.")
        print("\n[ERRORE] Per avviare lo script, specifica la stringa di connessione a Postgres/SQLite.\n")
        return

    try:
        conn = get_connection(DATABASE_URL)
    except Exception as e:
        logger.error(f"Connessione al database fallita: {e}")
        return

    logger.info("Caricamento account seed dal database...")
    seed_accounts = load_seed_accounts(conn)
    conn.close()

    logger.info(f"Selezionati {len(seed_accounts)} account seed con più follower per l'espansione.")

    # Mappa i domini corretti di origine per ottenere i relativi token se esistenti
    tokens = {}
    for seed in seed_accounts:
        parts = seed["acct"].split("@")
        home_domain = parts[1]
        if home_domain not in tokens:
            tokens[home_domain] = get_optional_token(home_domain)

    # Raccolta archi e nodi tramite API in parallelo
    all_edges = []
    all_nodes_attr = {}
    
    # Inizializza gli attributi per i nodi seed stessi
    for seed in seed_accounts:
        all_nodes_attr[seed["acct"]] = {
            "acct": seed["acct"],
            "bot": False,
            "followers": seed["followers"],
            "domain": seed["domain"]
        }

    logger.info("Avvio recupero relazioni di followship da API Mastodon (in parallelo)...")
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {}
        for seed in seed_accounts:
            parts = seed["acct"].split("@")
            home_domain = parts[1]
            futures[executor.submit(process_seed_account, seed, tokens[home_domain])] = seed
            
        for fut in as_completed(futures):
            seed = futures[fut]
            try:
                edges, nodes_attr = fut.result()
                all_edges.extend(edges)
                all_nodes_attr.update(nodes_attr)
                logger.info(f"Seed {seed['acct']}: recuperati {len(edges)} following")
            except Exception as e:
                logger.error(f"Errore nell'elaborazione di {seed['acct']}: {e}")

    logger.info(f"Raccolta completata! Trovati {len(all_edges)} archi di followship totali.")

    if not all_edges:
        logger.warning("Nessuna relazione di followship trovata. Il grafo è vuoto.")
        return

    # Costruzione grafo NetworkX
    g = nx.DiGraph()
    
    # Aggiungi tutti i nodi con attributi
    for node_acct, attr in all_nodes_attr.items():
        g.add_node(node_acct, **attr)

    # Aggiungi archi
    for u, v in all_edges:
        g.add_edge(u, v)

    # Rilevamento community con Infomap
    logger.info("Calcolo delle community via Infomap...")
    communities = run_infomap(g)
    nx.set_node_attributes(g, communities, "community")

    # Esportazione
    OUT_DIR.mkdir(exist_ok=True)
    
    gexf_path = OUT_DIR / "followship_experiment.gexf"
    nx.write_gexf(g, gexf_path)
    logger.info(f"Grafo di followship esportato in: {gexf_path}")

    html_path = OUT_DIR / "followship_experiment.html"
    generate_html(g, html_path)
    logger.info(f"Visualizzazione HTML generata in: {html_path}")
    
    cpu_html_path = OUT_DIR / "followship_experiment_cpu.html"
    generate_cpu_html(g, cpu_html_path)
    logger.info(f"Visualizzazione HTML (CPU fallback) generata in: {cpu_html_path}")
    
    print("\n=== COMPLETATO ===")
    print(f"Nodi: {g.number_of_nodes()}")
    print(f"Archi: {g.number_of_edges()}")
    print(f"Community trovate: {len(set(communities.values()))}")
    print(f"Visualizzazione HTML (WebGL GPU) creata con successo in {html_path}")
    print(f"Visualizzazione HTML (Canvas CPU) creata con successo in {cpu_html_path}\n")


if __name__ == "__main__":
    main()

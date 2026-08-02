# graph_builder.py
"""Costruisce dal DB il grafo di diffusione utente->utente, lo misura e lo
esporta per Gephi.

Arco A->B = "B ha amplificato/interagito con un post di A" (boost, reply,
mention). Community via Infomap (map equation, sfrutta la direzione degli
archi = flusso reale; sostituisce Louvain, vedi compare_communities.py per il
confronto). Il report include il gate metodologico: modularita' delle
community -> se alta conviene l'influence maximization, se bassa i modelli
epidemici mean-field.

Uso: python graph_builder.py  (legge DATABASE_URL; scrive graph-out/)
"""
import logging
import os
from collections import defaultdict
from pathlib import Path

import networkx as nx
from dotenv import load_dotenv
from infomap import Infomap

from snm.storage.db import get_connection

logger = logging.getLogger(__name__)

load_dotenv()

OUT_DIR = Path(__file__).parent.parent.parent / "graph-out"
# Soglia sul RAPPORTO tra flow-containment osservato e atteso per puro caso
# (stessa logica del termine nullo della modularita' — Sigma (dimensione
# community / N)^2 — generalizzata a una partizione che non ottimizza la
# modularita'). Non e' un numero preso in prestito: e' calibrata sul fattore
# di significativita' (z>3) validato una tantum con permutation test contro
# modello nullo a sequenza di grado fissata (infomap_significance.py,
# 2026-07-21: z=109 sul corpus reale, containment 98.7% vs atteso per caso).
GATE_SIGNIFICANCE_RATIO = 3

# I post cancellati restano nel DB ma sono esclusi dal grafo.
EDGE_QUERIES = {
    # booster B amplifica l'autore A del post: A -> B. Due sorgenti unite:
    # la tabella reblogs (da reblogged_by, senza timestamp) e i boost salvati
    # come post (reblog_of_id, dal crawler timeline, CON timestamp).
    # ponytail: lo stesso boost visto da entrambe le sorgenti conta doppio nel
    # peso (dedup impossibile senza l'id del post-boost in reblogs) — inflazione
    # marginale accettata.
    "boost": """
        SELECT src, dst, sum(w) AS w, min(first_ts) AS first_ts, max(last_ts) AS last_ts
        FROM (
            SELECT s.account_id AS src, r.booster_account_id AS dst,
                   count(*) AS w, NULL::timestamptz AS first_ts, NULL::timestamptz AS last_ts
            FROM reblogs r JOIN statuses s ON s.id = r.status_id
            WHERE s.deleted_at IS NULL AND s.account_id <> r.booster_account_id
            GROUP BY 1, 2
            UNION ALL
            SELECT orig.account_id AS src, rb.account_id AS dst,
                   count(*) AS w, min(rb.created_at) AS first_ts, max(rb.created_at) AS last_ts
            FROM statuses rb JOIN statuses orig ON orig.id = rb.reblog_of_id
            WHERE rb.deleted_at IS NULL AND orig.deleted_at IS NULL
              AND rb.account_id <> orig.account_id
            GROUP BY 1, 2
        ) t GROUP BY src, dst
    """,
    # chi risponde amplifica l'autore del post genitore: genitore -> figlio
    "reply": """
        SELECT p.account_id AS src, c.account_id AS dst,
               count(*) AS w, min(c.created_at) AS first_ts, max(c.created_at) AS last_ts
        FROM statuses c JOIN statuses p ON p.id = c.in_reply_to_id
        WHERE c.deleted_at IS NULL AND p.deleted_at IS NULL
          AND p.account_id <> c.account_id
        GROUP BY 1, 2
    """,
    # l'autore A menziona B: A -> B (arco debole, non di amplificazione).
    # acct Mastodon e' bare (senza dominio) per un account locale all'istanza
    # che risponde: due utenti locali con lo stesso username su istanze
    # diverse condividono altrimenti la stringa acct e collidono nel join.
    # Si canonicalizza acct -> "username@dominio" (dominio dell'istanza da
    # cui l'acct e' stato osservato) su entrambi i lati prima di confrontare
    # (nota 2026-07-20 su collisione mention, vedi _diffusion_view).
    "mention": """
        WITH m_canon AS (
            SELECT m.status_id, s.account_id AS src_account_id,
                   CASE WHEN m.mentioned_acct LIKE '%@%' THEN m.mentioned_acct
                        ELSE m.mentioned_acct || '@' || si.domain END AS canon_acct,
                   s.created_at
            FROM mentions m
            JOIN statuses s ON s.id = m.status_id
            JOIN instances si ON si.id = s.instance_id
            WHERE s.deleted_at IS NULL
        ),
        a_canon AS (
            SELECT a.id, a.instance_id,
                   CASE WHEN a.acct LIKE '%@%' THEN a.acct
                        ELSE a.acct || '@' || ai.domain END AS canon_acct
            FROM accounts a
            JOIN instances ai ON ai.id = a.instance_id
        )
        SELECT mc.src_account_id AS src, ac.id AS dst,
               count(*) AS w, min(mc.created_at) AS first_ts, max(mc.created_at) AS last_ts
        FROM m_canon mc
        JOIN a_canon ac ON ac.canon_acct = mc.canon_acct
        WHERE mc.src_account_id <> ac.id
        GROUP BY 1, 2
    """,
}

NODE_QUERY = """
    SELECT a.id, a.acct, a.bot,
           COALESCE((a.raw->>'followers_count')::int, 0) AS followers,
           ai.domain
    FROM accounts a
    JOIN instances ai ON ai.id = a.instance_id
"""

# topic dell'arco = topic dei post dell'autore src coinvolti; approssimazione a
# livello nodo (piu' economica): topic in cui l'account ha pubblicato.
ACCOUNT_TOPICS_QUERY = """
    SELECT s.account_id, array_agg(DISTINCT t.name)
    FROM status_hashtags sh
    JOIN topic_hashtags th ON lower(th.hashtag) = sh.hashtag
    JOIN topics t ON t.id = th.topic_id
    JOIN statuses s ON s.id = sh.status_id
    GROUP BY s.account_id
"""


def _canon_acct(acct: str, domain: str) -> str:
    """username@dominio-di-casa. Univoco per protocollo: due account diversi
    non possono avere la stessa stringa qualificata (lo username e' unico
    entro la sua istanza)."""
    return acct if "@" in acct else f"{acct}@{domain}"


def build_user_graph(conn) -> nx.DiGraph:
    """Proiezione utente->utente pesata, con attributi per tipo di arco.

    Un account reale puo' comparire in `accounts` come piu' righe: ogni
    istanza che l'ha osservato/cachato ne salva una copia locale con il
    proprio account_id. Prima di costruire nodi/archi, tutte le righe con lo
    stesso acct canonico vengono fuse in un solo nodo (id = il piu' piccolo
    account_id del gruppo) — altrimenti un hub reale con molte copie cache
    (osservato fino a 47x su questo corpus) viene visto come tanti nodi
    mediocri invece di uno solo con tutto il suo peso (nota 2026-07-22)."""
    g = nx.DiGraph()

    with conn.cursor() as cur:
        cur.execute(NODE_QUERY)
        rows = cur.fetchall()

        groups: dict[str, list[tuple]] = defaultdict(list)
        for account_id, acct, bot, followers, domain in rows:
            groups[_canon_acct(acct, domain)].append((account_id, bot, followers))

        canon_id_of: dict[int, int] = {}
        for canon_acct, members in groups.items():
            rep = min(m[0] for m in members)
            bot_any = any(m[1] for m in members)
            followers_max = max(m[2] for m in members)
            g.add_node(rep, acct=canon_acct, bot=bot_any, followers=followers_max)
            for account_id, _, _ in members:
                canon_id_of[account_id] = rep

        cur.execute(ACCOUNT_TOPICS_QUERY)
        for account_id, topic_names in cur.fetchall():
            node_id = canon_id_of.get(account_id, account_id)
            if g.has_node(node_id):
                existing = g.nodes[node_id].get("topics", "")
                merged = set(existing.split(",")) if existing else set()
                merged.update(topic_names)
                g.nodes[node_id]["topics"] = ",".join(sorted(merged))

        for edge_type, query in EDGE_QUERIES.items():
            cur.execute(query)
            for src, dst, w, first_ts, last_ts in cur.fetchall():
                src = canon_id_of.get(src, src)
                dst = canon_id_of.get(dst, dst)
                if src == dst:
                    continue  # stesso nodo dopo la fusione (es. due copie cache si sono "auto-boostate")
                w = int(w)  # sum() SQL arriva come Decimal: Infomap vuole numeri nativi
                if not g.has_edge(src, dst):
                    g.add_edge(src, dst, weight=0, w_boost=0, w_reply=0, w_mention=0)
                data = g[src][dst]
                data[f"w_{edge_type}"] += w
                data["weight"] += w
                if first_ts is not None:
                    prev = data.get("first_ts")
                    data["first_ts"] = min(first_ts, prev) if prev else first_ts
                if last_ts is not None:
                    prev = data.get("last_ts")
                    data["last_ts"] = max(last_ts, prev) if prev else last_ts

    return g


def detect_communities_infomap(directed: nx.DiGraph) -> tuple[dict, float]:
    """Community via Infomap (map equation): sfrutta la direzione degli archi
    (flusso reale). Ogni nodo viene aggiunto esplicitamente cosi' i nodi senza
    archi in questa vista finiscono comunque in una community (singleton)
    invece di sparire dal risultato."""
    node_ids = {n: i for i, n in enumerate(directed.nodes)}
    rev = {i: n for n, i in node_ids.items()}

    im = Infomap("--directed --silent")
    for i in node_ids.values():
        im.add_node(i)
    for u, v, w in directed.edges(data="weight"):
        im.add_link(node_ids[u], node_ids[v], w)
    result = im.run()

    node_comm = {rev[n.node_id]: n.module_id for n in result.tree() if n.is_leaf}
    return node_comm, result.codelength


def _diffusion_view(directed: nx.DiGraph) -> nx.DiGraph:
    """Vista boost+reply per la community detection: i mention restano esclusi
    perche' sono un arco debole/non di amplificazione (vedi commento su
    EDGE_QUERIES), indipendentemente dalla collisione di acct cross-istanza
    gia' corretta a monte (canonicalizzazione in EDGE_QUERIES["mention"],
    nota 2026-07-20/22). Con i mention ancora inclusi (dato pre-fix) Infomap
    collassava il 95.6% dei nodi in un'unica community (comportamento non
    osservato con Louvain, che per costruzione resiste a una community
    dominante); escludendoli, trova 434 community bilanciate (la piu' grande
    all'11%) — verificato 2026-07-21."""
    view = nx.DiGraph()
    view.add_nodes_from(directed.nodes)
    for u, v, d in directed.edges(data=True):
        w = d["w_boost"] + d["w_reply"]
        if w > 0:
            view.add_edge(u, v, weight=w)
    return view


def compute_report(g: nx.DiGraph) -> dict:
    """Metriche + gate metodologico. Salva la community come attributo nodo."""
    report: dict = {"nodes": g.number_of_nodes(), "edges": g.number_of_edges()}
    for t in ("boost", "reply", "mention"):
        report[f"edges_{t}"] = sum(1 for _, _, d in g.edges(data=True) if d[f"w_{t}"] > 0)

    connected = [n for n in g.nodes if g.degree(n) > 0]
    report["isolated_pct"] = 100 * (g.number_of_nodes() - len(connected)) / g.number_of_nodes()

    components = list(nx.weakly_connected_components(g))
    giant = max(components, key=len)
    report["components"] = len(components)
    report["giant_pct"] = 100 * len(giant) / g.number_of_nodes()

    # ramificazione: figli medi (out-degree) dei nodi non-foglia
    out_degrees = [d for _, d in g.out_degree() if d > 0]
    report["branching"] = sum(out_degrees) / len(out_degrees) if out_degrees else 0.0

    # community via Infomap sulla vista diffusione (boost+reply, solo
    # componente gigante — i mention sono esclusi, vedi _diffusion_view).
    # Modularita' e intra-edge ricalcolate sulla STESSA vista (non sul
    # multi-relazione con mention: confrontare containment su un edge set e
    # partizione trovata su un altro sarebbe di nuovo un errore di metrica).
    directed_giant = g.subgraph(giant)
    diffusion = _diffusion_view(directed_giant)
    undirected = diffusion.to_undirected()
    node_comm, codelength = detect_communities_infomap(diffusion)

    comms_by_id: dict = {}
    for n, c in node_comm.items():
        comms_by_id.setdefault(c, set()).add(n)
    communities = list(comms_by_id.values())
    report["communities"] = len(communities)
    report["modularity"] = nx.community.modularity(undirected, communities, weight="weight")
    report["codelength"] = codelength

    nx.set_node_attributes(g, node_comm, "community")

    intra = sum(
        1 for u, v in undirected.edges if node_comm.get(u) == node_comm.get(v)
    )
    report["intra_edge_pct"] = 100 * intra / undirected.number_of_edges()

    # containment atteso se le stesse dimensioni di community fossero
    # assegnate a caso (probabilita' che due nodi random cadano nella stessa
    # community, pesata per dimensione) — il termine nullo che la modularita'
    # userebbe, generalizzato a una partizione non modularity-maximizing.
    n_giant = directed_giant.number_of_nodes()
    expected_intra_pct = 100 * sum((len(c) / n_giant) ** 2 for c in communities)
    report["expected_intra_pct_by_chance"] = expected_intra_pct

    report["gate"] = (
        "IM/IBM (struttura a community forte)"
        if report["intra_edge_pct"] >= GATE_SIGNIFICANCE_RATIO * expected_intra_pct
        else "modelli epidemici mean-field (rete poco modulare)"
    )
    return report


def export_gexf(g: nx.DiGraph, path: Path) -> None:
    """Export per Gephi. I timestamp diventano stringhe (gexf non li supporta)."""
    h = g.copy()
    for _, _, data in h.edges(data=True):
        for key in ("first_ts", "last_ts"):
            if key in data:
                data[key] = data[key].isoformat()
    nx.write_gexf(h, path)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    conn = get_connection(os.environ["DATABASE_URL"])
    logger.info("costruzione grafo dal DB...")
    g = build_user_graph(conn)
    conn.close()

    logger.info("calcolo metriche e community...")
    report = compute_report(g)
    print("\n=== REPORT GRAFO UTENTE->UTENTE ===")
    print(f"nodi:                 {report['nodes']}")
    print(f"archi:                {report['edges']} "
          f"(boost {report['edges_boost']}, reply {report['edges_reply']}, mention {report['edges_mention']})")
    print(f"nodi isolati:         {report['isolated_pct']:.1f}%")
    print(f"componenti:           {report['components']} (gigante: {report['giant_pct']:.1f}% dei nodi)")
    print(f"ramificazione media:  {report['branching']:.2f}")
    print(f"community (Infomap):  {report['communities']}")
    print(f"modularita' Q:        {report['modularity']:.3f}")
    print(f"codelength:           {report['codelength']:.4f} bit")
    print(f"archi intra-comm.:    {report['intra_edge_pct']:.1f}% "
          f"(atteso per caso: {report['expected_intra_pct_by_chance']:.1f}%)")
    print(f"GATE metodologico:    {report['gate']}")

    OUT_DIR.mkdir(exist_ok=True)
    out = OUT_DIR / "user_graph.gexf"
    export_gexf(g, out)
    logger.info("esportato %s", out)


if __name__ == "__main__":
    main()

"""Costruisce dal DB un GRAFO DI INFLUENZA utente->utente, pesato, pronto per la
massimizzazione dell'influenza (influence maximization) in una fase successiva.

Arco A->B = "l'informazione/influenza di A raggiunge B". Quattro sorgenti, con
pesi distinti e gerarchia richiesta:  boost > follow (amicizia) > reply > mention.
  - boost   : B ha ricondiviso un post di A            -> A -> B
  - follow  : B segue A (i post di A arrivano a B)     -> A -> B   (followed -> follower)
  - reply   : B ha risposto a un post di A             -> A -> B   (genitore -> figlio)
  - mention : A ha citato B                            -> A -> B   (legame debole)

Ogni arco conserva i conteggi disaggregati (w_boost/w_follow/w_reply/w_mention),
un peso combinato `weight` secondo la gerarchia, un `weight_norm` log per Gephi e
un `p_influence` (modello weighted-cascade) direttamente utilizzabile per l'IM.

NB: la community detection e' stata rimossa (richiesta esplicita). Se serve il
gate metodologico, vedi la versione precedente.

Uso: python graph_builder.py  (legge DATABASE_URL; scrive graph-out/influence_graph.gexf)
"""
import logging
import math
import os
from collections import defaultdict
from pathlib import Path

import networkx as nx

logger = logging.getLogger(__name__)

# cartella di output accanto allo script (prima era .parent.parent.parent,
# che con lo script spostato puntava fuori dal progetto)
OUT_DIR = Path(__file__).parent / "graph-out"

# --------------------------------------------------------------------------- #
#  Gerarchia dei pesi per tipo di arco (richiesta: boost > follow > reply > mention)
#  E' il peso PER-INTERAZIONE: un boost "vale" 1.0, un follow 0.7, una reply 0.4,
#  una mention 0.1. Sono valori di partenza coerenti con l'ordine richiesto e
#  facilmente tarabili: cambiando questi numeri cambi l'importanza relativa dei
#  canali nell'influence maximization a valle.
# --------------------------------------------------------------------------- #
EDGE_TYPE_WEIGHT = {
    "boost":   1.0,
    "follow":  0.7,
    "reply":   0.4,
    "mention": 0.1,
}

# --------------------------------------------------------------------------- #
#  Query SQL (invariate rispetto alla versione originale, che lo schema conferma)
# --------------------------------------------------------------------------- #
EDGE_QUERIES = {
    # booster B amplifica l'autore A del post: A -> B. Due sorgenti unite:
    # reblogs (da reblogged_by, senza timestamp) e i boost salvati come post
    # (reblog_of_id, CON timestamp). Lo stesso boost visto da entrambe conta
    # doppio nel peso (dedup impossibile senza l'id del post-boost): inflazione
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
    # l'autore A menziona B: A -> B (arco debole). acct Mastodon canonicalizzato
    # a "username@dominio" su entrambi i lati per evitare collisioni cross-istanza.
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
           COALESCE((a.raw->>'followers_count')::bigint, 0) AS followers,
           ai.domain
    FROM accounts a
    JOIN instances ai ON ai.id = a.instance_id
"""

ACCOUNT_TOPICS_QUERY = """
    SELECT s.account_id, array_agg(DISTINCT t.name)
    FROM status_hashtags sh
    JOIN topic_hashtags th ON lower(th.hashtag) = sh.hashtag
    JOIN topics t ON t.id = th.topic_id
    JOIN statuses s ON s.id = sh.status_id
    GROUP BY s.account_id
"""

# follows: follower_account_id segue followed_account_id.
FOLLOW_QUERY = "SELECT follower_account_id, followed_account_id FROM follows"


def _canon_acct(acct: str, domain: str) -> str:
    """username@dominio-di-casa. Univoco per protocollo: due account diversi non
    possono avere la stessa stringa qualificata."""
    return acct if "@" in acct else f"{acct}@{domain}"


def _add_edge(g: nx.DiGraph, src, dst, edge_type: str, w: int,
              first_ts=None, last_ts=None) -> None:
    """Aggiunge/aggiorna un arco src->dst per un dato tipo. Un arco toccato da piu'
    tipi (es. sia follow che reply) fonde i pesi in UN SOLO arco (mai archi
    paralleli), tenendo tracciata ogni componente separatamente."""
    if w <= 0 or src == dst:
        return
    if not g.has_node(src) or not g.has_node(dst):
        return  # es. un follow verso un account mai comparso tra i nodi
    if not g.has_edge(src, dst):
        g.add_edge(src, dst, weight=0.0,
                   w_boost=0, w_follow=0, w_reply=0, w_mention=0)
    data = g[src][dst]
    data[f"w_{edge_type}"] += w
    if first_ts is not None:
        prev = data.get("first_ts")
        data["first_ts"] = min(first_ts, prev) if prev else first_ts
    if last_ts is not None:
        prev = data.get("last_ts")
        data["last_ts"] = max(last_ts, prev) if prev else last_ts


def build_influence_graph(conn) -> nx.DiGraph:
    """Grafo utente->utente pesato con boost + follow + reply + mention.

    Le copie cache dello stesso account (piu' righe in `accounts` con lo stesso
    acct canonico, osservate da istanze diverse) vengono fuse in un unico nodo
    (id = il piu' piccolo account_id del gruppo), altrimenti un hub reale con
    molte copie verrebbe visto come tanti nodi mediocri."""
    g = nx.DiGraph()

    with conn.cursor() as cur:
        # ---- nodi + canonicalizzazione degli account duplicati ----
        cur.execute(NODE_QUERY)
        groups: dict[str, list[tuple]] = defaultdict(list)
        for account_id, acct, bot, followers, domain in cur.fetchall():
            groups[_canon_acct(acct, domain)].append((account_id, bot, followers, domain))

        canon_id_of: dict[int, int] = {}
        for canon_acct, members in groups.items():
            rep = min(m[0] for m in members)
            g.add_node(rep,
                       acct=canon_acct,
                       bot=any(m[1] for m in members),
                       followers=max(m[2] for m in members),
                       domain=members[0][3])
            for account_id, *_ in members:
                canon_id_of[account_id] = rep

        # ---- topic per nodo (metadato utile per un IM topic-aware) ----
        cur.execute(ACCOUNT_TOPICS_QUERY)
        for account_id, topic_names in cur.fetchall():
            nid = canon_id_of.get(account_id, account_id)
            if g.has_node(nid):
                existing = g.nodes[nid].get("topics", "")
                merged = set(existing.split(",")) if existing else set()
                merged.update(topic_names)
                g.nodes[nid]["topics"] = ",".join(sorted(merged))

        # ---- archi di interazione: boost, reply, mention ----
        for edge_type, query in EDGE_QUERIES.items():
            cur.execute(query)
            for src, dst, w, first_ts, last_ts in cur.fetchall():
                _add_edge(g, canon_id_of.get(src, src), canon_id_of.get(dst, dst),
                          edge_type, int(w), first_ts, last_ts)

        # ---- arco di amicizia (follow) ----
        # Direzione: FOLLOWED -> FOLLOWER. L'influenza scorre da chi e' seguito
        # verso chi segue (i post del seguito compaiono nel feed del follower).
        # Il follow e' binario: peso +1 (la tabella follows non ha conteggi).
        cur.execute(FOLLOW_QUERY)
        for follower, followed in cur.fetchall():
            _add_edge(g, canon_id_of.get(followed, followed),
                      canon_id_of.get(follower, follower), "follow", 1)

    return g


def compute_weights(g: nx.DiGraph) -> None:
    """Calcola il peso combinato degli archi e la versione log per Gephi.

    1) `weight`      : peso combinato secondo la gerarchia EDGE_TYPE_WEIGHT.
                       weight = 1.0*boost + 0.7*follow + 0.4*reply + 0.1*mention
    2) `weight_norm` : log1p(weight)/log1p(max) — solo per la visualizzazione in
                       Gephi (mantiene l'ordinamento senza farsi dominare dagli
                       outlier).

    Le PROBABILITA' per PMIA/IC si calcolano a parte con compute_ic_probabilities."""
    for _, _, d in g.edges(data=True):
        d["weight"] = (EDGE_TYPE_WEIGHT["boost"]   * d.get("w_boost", 0)
                       + EDGE_TYPE_WEIGHT["follow"]  * d.get("w_follow", 0)
                       + EDGE_TYPE_WEIGHT["reply"]   * d.get("w_reply", 0)
                       + EDGE_TYPE_WEIGHT["mention"] * d.get("w_mention", 0))

    weights = [d["weight"] for _, _, d in g.edges(data=True)]
    log_max = math.log1p(max(weights)) if weights else 0.0
    for _, _, d in g.edges(data=True):
        d["weight_norm"] = (math.log1p(d["weight"]) / log_max) if log_max > 0 else 0.0


# Parametri per le probabilita' IC (input di PMIA):
IC_BASE_PROB = 0.05    # p0: probabilita' base per "unita' di peso" (metodo independent_trials)
IC_PROB_CAP = 0.999    # tetto: nessun arco con p esattamente 1 (PMIA usa prodotti di prob.)


def compute_ic_probabilities(g: nx.DiGraph, method: str = "independent_trials",
                             p0: float = IC_BASE_PROB, cap: float = IC_PROB_CAP) -> None:
    """Assegna a ogni arco la probabilita' di attivazione `p_ic` per il modello
    Independent Cascade, cioe' l'input che PMIA si aspetta.

    method="independent_trials" (consigliato):
        p(u,v) = 1 - (1 - p0)^weight(u,v)
        Ogni unita' di peso e' un tentativo indipendente con probabilita' p0.
        Non accoppia gli archi tra loro; rispetta la gerarchia (weight la incorpora);
        satura verso 1 al crescere delle interazioni. Tara p0 per calibrare.

    method="weighted_cascade" (setting del paper PMIA, Chen et al. 2010):
        p(u,v) = weight(u,v) / (somma dei pesi entranti in v)
        Le probabilita' entranti in ogni nodo sommano a 1. Attenzione: la stessa
        forza d'interazione da' p diversa a seconda di quanti archi entrano nel
        target (accoppia gli archi).

    In entrambi i casi si applica un tetto `cap` < 1: PMIA calcola la probabilita'
    di un cammino come prodotto delle p, quindi archi a p=1 esatto sono degeneri."""
    if method == "independent_trials":
        for _, _, d in g.edges(data=True):
            p = 1.0 - (1.0 - p0) ** d["weight"]
            d["p_ic"] = min(p, cap)
    elif method == "weighted_cascade":
        in_strength: dict[int, float] = defaultdict(float)
        for _, v, d in g.edges(data=True):
            in_strength[v] += d["weight"]
        for _, v, d in g.edges(data=True):
            s = in_strength[v]
            p = (d["weight"] / s) if s > 0 else 0.0
            d["p_ic"] = min(p, cap)
    else:
        raise ValueError(f"metodo sconosciuto: {method!r} "
                         "(usa 'independent_trials' o 'weighted_cascade')")


def compute_report(g: nx.DiGraph) -> dict:
    """Metriche descrittive del grafo (senza community detection)."""
    n = g.number_of_nodes()
    report: dict = {"nodes": n, "edges": g.number_of_edges()}

    for t in ("boost", "follow", "reply", "mention"):
        report[f"edges_{t}"] = sum(1 for _, _, d in g.edges(data=True) if d.get(f"w_{t}", 0) > 0)

    # archi in cui piu' tipi si sono fusi in un unico peso
    report["edges_multi_type"] = sum(
        1 for _, _, d in g.edges(data=True)
        if sum(1 for t in ("w_boost", "w_follow", "w_reply", "w_mention") if d.get(t, 0) > 0) > 1
    )

    connected = [node for node in g.nodes if g.degree(node) > 0]
    report["isolated_pct"] = 100 * (n - len(connected)) / n if n else 0.0

    if n:
        components = list(nx.weakly_connected_components(g))
        giant = max(components, key=len)
        report["components"] = len(components)
        report["giant_pct"] = 100 * len(giant) / n
    else:
        report["components"] = 0
        report["giant_pct"] = 0.0

    out_degrees = [d for _, d in g.out_degree() if d > 0]
    report["branching"] = sum(out_degrees) / len(out_degrees) if out_degrees else 0.0

    weights = [d["weight"] for _, _, d in g.edges(data=True)]
    if weights:
        weights_sorted = sorted(weights)
        report["weight_min"] = min(weights)
        report["weight_max"] = max(weights)
        report["weight_mean"] = sum(weights) / len(weights)
        report["weight_median"] = weights_sorted[len(weights_sorted) // 2]
    return report


def export_gexf(g: nx.DiGraph, path: Path) -> None:
    """Export per Gephi. I timestamp diventano stringhe (gexf non li supporta)."""
    h = g.copy()
    for _, _, data in h.edges(data=True):
        for key in ("first_ts", "last_ts"):
            if key in data and data[key] is not None:
                data[key] = data[key].isoformat()
    nx.write_gexf(h, path)


def get_connection(database_url: str):
    """Connessione a PostgreSQL. Usa il pacchetto interno `snm` se disponibile
    (quando lo script gira dentro l'albero del progetto), altrimenti si connette
    direttamente con psycopg (v3) o psycopg2. Installa uno dei due:
        pip install "psycopg[binary]"     # v3 (consigliato)
        pip install psycopg2-binary       # v2
    """
    try:
        from snm.storage.db import get_connection as _snm_get_connection
        return _snm_get_connection(database_url)
    except Exception:
        pass
    try:
        import psycopg                      # v3
        return psycopg.connect(database_url)
    except ImportError:
        import psycopg2                     # v2
        return psycopg2.connect(database_url)


def main() -> None:
    try:
        from dotenv import load_dotenv      # opzionale: carica DATABASE_URL da .env
        load_dotenv()
    except ImportError:
        pass

    logging.basicConfig(level=logging.INFO)

    conn = get_connection(os.environ["DATABASE_URL"])
    logger.info("costruzione grafo di influenza dal DB...")
    g = build_influence_graph(conn)
    conn.close()

    compute_weights(g)
    compute_ic_probabilities(g, method="independent_trials")  # input per PMIA (IC)
    report = compute_report(g)

    print("\n=== GRAFO DI INFLUENZA UTENTE->UTENTE (pesato) ===")
    print(f"nodi:                 {report['nodes']}")
    print(f"archi:                {report['edges']}")
    print(f"  di cui boost:       {report['edges_boost']}")
    print(f"  di cui follow:      {report['edges_follow']}")
    print(f"  di cui reply:       {report['edges_reply']}")
    print(f"  di cui mention:     {report['edges_mention']}")
    print(f"archi multi-tipo:     {report['edges_multi_type']} (piu' canali fusi in un peso)")
    print(f"nodi isolati:         {report['isolated_pct']:.1f}%")
    print(f"componenti:           {report['components']} (gigante: {report['giant_pct']:.1f}% dei nodi)")
    print(f"ramificazione media:  {report['branching']:.2f}")
    if "weight_mean" in report:
        print(f"peso archi:           min {report['weight_min']:.2f} | "
              f"mediana {report['weight_median']:.2f} | media {report['weight_mean']:.2f} | "
              f"max {report['weight_max']:.2f}")
    p_all = [d["p_ic"] for _, _, d in g.edges(data=True)]
    if p_all:
        p_sorted = sorted(p_all)
        print(f"p_ic (per PMIA/IC):   min {min(p_all):.3f} | "
              f"mediana {p_sorted[len(p_sorted)//2]:.3f} | max {max(p_all):.3f}")

    OUT_DIR.mkdir(exist_ok=True)
    out = OUT_DIR / "influence_graph.gexf"
    export_gexf(g, out)
    logger.info("esportato %s", out)


if __name__ == "__main__":
    main()
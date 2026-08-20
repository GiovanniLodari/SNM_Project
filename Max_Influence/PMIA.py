"""PMIA per SIMULAZIONI su sottografi — FILE UNICO E AUTOSUFFICIENTE.

Novita' di questa versione:
  * campionamento SNOWBALL: i sottografi partono da alcuni utenti IA e crescono
    per vicinato -> sottografi CONNESSI e DENSI (spread realistico), non nuvole di
    nodi scollegati come col campionamento casuale;
  * CRESCITA fino al 60% di similarita' (Opzione 1): i sottografi partono piccoli
    (simulazioni diverse, similarita' ~0) e crescono a ogni giro; ci si ferma quando
    la similarita' media di Jaccard sui nodi raggiunge TARGET_SIM. Lo spread di
    riferimento e' l'ULTIMA simulazione (sottografo piu' grande);
  * omofilia sul grafo intero (--homophily-only) e per singola simulazione.

Accanto serve solo graph_builder.py. Uso: configura e lancia:  python PMIA.py
"""
from __future__ import annotations

import argparse
import heapq
import json
import math
import os
import random
import statistics
import sys
from collections import defaultdict

import networkx as nx

import graph_builder as gb


# =========================================================================== #
#  >>> CONFIGURA QUI <<<  (poi lancia:  python PMIA.py)
# =========================================================================== #
GEXF     = r"graph-out/influence_graph.gexf"   # grafo da graph_builder (None = dal DB)
LABELS   = r"users_ai_vs_human.jsonl"          # file da ai_users.py (campo more_ai)

# --- crescita dei sottografi (Opzione 1) ---
N_START     = 2000    # nodi del PRIMO sottografo
GROWTH      = 1.7      # fattore di crescita dei nodi a ogni simulazione
N_CAP       = 320380  # tetto ai nodi per simulazione (per "tutti i nodi" mettilo >= nodi del grafo)
TARGET_SIM  = 0.60    # ci si ferma se la similarita' media (Jaccard nodi) >= 60%
MAX_SIMS    = 15      # tetto MASSIMO al numero di simulazioni
# stop anche se lo SPREAD non cambia piu' (plateau) sulle ultime simulazioni:
PLATEAU_WINDOW = 3    # quante simulazioni recenti confrontare
PLATEAU_TOL    = 0.01 # se il range relativo dello spread e' <= 1% -> stop (nessun cambiamento)
SNOWBALL_STARTS = 8   # da quanti utenti IA parte ogni snowball

K_SEED   = 1000       # numero di seed (se >= agli IA nel sottografo, sono TUTTI seed)
THETA    = 0.02       # soglia PMIA (piu' alta = piu' veloce; 1/320 e' molto lento!)
RANDOM_SEED = 42      # riproducibilita' (None = ogni volta diverso)

# etichette: quali nodi sono portatori di notizie IA
LABEL_FIELD    = "more_ai"
POSITIVE_VALUE = "true"
ID_FIELD       = "acct"
MATCH_BY       = "acct"     # "acct" | "node_id"

OUT_DIR  = r"simulazioni"             # cartella con un file per simulazione
OUT_JSON = r"pmia_simulations.json"   # riepilogo
OUT_GRAPH_JSON = r"grafo_max_spread_animazione.json"   # animazione della sim col max spread
# =========================================================================== #


# =========================================================================== #
#  PMIA (Chen, Wang, Wang 2010) su Independent Cascade
# =========================================================================== #
def _dijkstra_arborescence(g, source, theta, reverse):
    D = -math.log(theta)
    dist = {source: 0.0}
    toward = {}
    heap = [(0.0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, math.inf):
            continue
        neighbors = g.in_edges(u, data=True) if reverse else g.out_edges(u, data=True)
        for a, b, data in neighbors:
            w = data.get("p_ic", 0.0)
            if w <= 0.0:
                continue
            nxt = a if reverse else b
            nd = d - math.log(w)
            if nd <= D and nd < dist.get(nxt, math.inf):
                dist[nxt] = nd
                toward[nxt] = u
                heapq.heappush(heap, (nd, nxt))
    return dist, toward


def mioa_nodes(g, u, theta):
    dist, _ = _dijkstra_arborescence(g, u, theta, reverse=False)
    return set(dist.keys())


def compute_miia(g, v, theta):
    dist, toward = _dijkstra_arborescence(g, v, theta, reverse=True)
    children = defaultdict(list)
    pmap = {}
    for a, b in toward.items():
        children[b].append(a)
        pmap[(a, b)] = g[a][b]["p_ic"]
    order = sorted(dist.keys(), key=lambda n: dist[n], reverse=True)
    return order, children, pmap


def ap_root(miia, seeds):
    order, children, pmap = miia
    ap = {}
    for u in order:
        if u in seeds:
            ap[u] = 1.0
        else:
            prod = 1.0
            for a in children.get(u, ()):
                prod *= (1.0 - ap[a] * pmap[(a, u)])
            ap[u] = 1.0 - prod
    return ap[order[-1]] if order else 0.0


def pmia_select(g, k, candidates, theta):
    candidates = [u for u in candidates if g.has_node(u)]
    if not candidates:
        return [], 0.0
    infl = {u: mioa_nodes(g, u, theta) for u in candidates}
    relevant = set().union(*infl.values()) if infl else set()
    miia = {v: compute_miia(g, v, theta) for v in relevant}

    # se i seed richiesti bastano per TUTTI i candidati, non serve il greedy:
    # sono tutti seed. (Caso tipico: k >= numero di utenti IA nel sottografo.)
    if k >= len(candidates):
        seedset = set(candidates)
        spread = sum(ap_root(miia[v], seedset) for v in relevant)
        return list(candidates), spread

    ap_current = {v: 0.0 for v in relevant}

    heap = []
    for u in candidates:
        d = sum(ap_root(miia[v], {u}) for v in infl[u])
        heapq.heappush(heap, (-d, u, 0))

    S, seedset, spread = [], set(), 0.0
    while heap and len(S) < k:
        neg, u, ts = heapq.heappop(heap)
        if u in seedset:
            continue
        if ts == len(S):
            spread += -neg
            S.append(u); seedset.add(u)
            for v in infl[u]:
                ap_current[v] = ap_root(miia[v], seedset)
        else:
            d = sum(ap_root(miia[v], seedset | {u}) - ap_current[v] for v in infl[u])
            heapq.heappush(heap, (-d, u, len(S)))
    return S, spread


# =========================================================================== #
#  Caricamento grafo (STRADA A) + candidati portatori IA
# =========================================================================== #
def _ensure_ic_probabilities(g):
    """Assegna p_ic a ogni arco usando independent_trials (formula documentata:
    p = 1-(1-p0)^weight), coerente con il p_ic baked nel GEXF da graph_builder."""
    needs_weights = any("weight" not in d for _, _, d in g.edges(data=True))
    if needs_weights:
        gb.compute_weights(g)
    else:
        for _, _, d in g.edges(data=True):
            d["weight"] = float(d["weight"])
    gb.compute_ic_probabilities(g, method="independent_trials")


def load_graph(args):
    if args.gexf:
        g = nx.DiGraph(nx.read_gexf(args.gexf))
        for _, _, d in g.edges(data=True):
            for key in ("weight", "w_boost", "w_follow", "w_reply", "w_mention"):
                if key in d:
                    try:
                        d[key] = float(d[key])
                    except (TypeError, ValueError):
                        pass
        for _, d in g.nodes(data=True):
            if "followers" in d:
                try:
                    d["followers"] = int(float(d["followers"]))
                except (TypeError, ValueError):
                    pass
    else:
        import os as _os
        try:
            from dotenv import load_dotenv
            load_dotenv()
        except ImportError:
            pass
        conn = gb.get_connection(_os.environ["DATABASE_URL"])
        g = gb.build_influence_graph(conn)
        conn.close()
    _ensure_ic_probabilities(g)
    return g


def _read_json_records(path):
    with open(path, encoding="utf-8") as f:
        text = f.read().strip()
    if not text:
        return []
    if text[0] == "[":
        return json.loads(text)
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def resolve_candidates(g, args):
    records = _read_json_records(args.labels)
    positive = str(args.positive_value).strip().lower()
    wanted = [r.get(args.id_field) for r in records
              if r.get(args.label_field) is not None
              and str(r.get(args.label_field)).strip().lower() == positive]
    if args.match_by == "acct":
        acct_to_node = {d.get("acct"): n for n, d in g.nodes(data=True)}
        nodes = {acct_to_node[a] for a in wanted if a in acct_to_node}
    else:
        nodes = set()
        for a in wanted:
            for cand in (a, str(a)):
                if g.has_node(cand):
                    nodes.add(cand)
                    break
    print(f"[candidati] portatori IA nel file: {len(wanted)} | agganciati a nodi: {len(nodes)} "
          f"(match_by={args.match_by})", file=sys.stderr)
    return nodes


# =========================================================================== #
#  Metriche
# =========================================================================== #
def jaccard_similarity(a, b):
    a, b = set(a), set(b)
    union = len(a | b)
    return (len(a & b) / union) if union else 0.0


def gini(values):
    xs = sorted(v for v in values if v >= 0)
    n, tot = len(xs), sum(xs)
    if n == 0 or tot == 0:
        return 0.0
    cum = sum((i + 1) * x for i, x in enumerate(xs))
    return (2.0 * cum) / (n * tot) - (n + 1.0) / n


def compute_homophily(g, candidates):
    """Omofilia: i nodi IA (more_ai==true) si collegano fra loro piu' del previsto?"""
    ia = set(candidates)
    N, E = g.number_of_nodes(), g.number_of_edges()
    n_ia = sum(1 for n in g.nodes if n in ia)
    share_ia = n_ia / N if N else 0.0
    c_ia_ia = c_ia_non = c_non_ia = c_non_non = 0
    for u, v in g.edges():
        su, sv = u in ia, v in ia
        if su and sv:
            c_ia_ia += 1
        elif su and not sv:
            c_ia_non += 1
        elif not su and sv:
            c_non_ia += 1
        else:
            c_non_non += 1
    obs = c_ia_ia / E if E else 0.0
    out_ia = (c_ia_ia + c_ia_non) / E if E else 0.0
    in_ia = (c_ia_ia + c_non_ia) / E if E else 0.0
    exp_degree = out_ia * in_ia
    ia_out_total = c_ia_ia + c_ia_non
    frac_ia_to_ia = c_ia_ia / ia_out_total if ia_out_total else 0.0
    for n in g.nodes:
        g.nodes[n]["is_ia"] = bool(n in ia)
    try:
        assort = nx.attribute_assortativity_coefficient(g, "is_ia")
    except Exception:
        assort = float("nan")
    return {
        "n_total": N, "n_ia": n_ia, "share_ia": round(share_ia, 4), "edges_total": E,
        "edges_ia_ia": c_ia_ia, "edges_ia_non": c_ia_non,
        "edges_non_ia": c_non_ia, "edges_non_non": c_non_non,
        "obs_ia_ia_frac": round(obs, 5),
        "expected_ia_ia_frac_degree_null": round(exp_degree, 5),
        "homophily_ratio_degree_null": round(obs / exp_degree, 3) if exp_degree > 0 else None,
        "frac_ia_outlinks_to_ia": round(frac_ia_to_ia, 4),
        "baseline_share_ia": round(share_ia, 4),
        "assortativity_is_ia": round(assort, 4) if assort == assort else None,
    }


def print_homophily(h):
    print("\n=== OMOFILIA UTENTI IA (i portatori IA si collegano tra loro?) ===")
    print(f"nodi IA: {h['n_ia']}/{h['n_total']} (share {100*h['share_ia']:.1f}%) | archi totali: {h['edges_total']}")
    print(f"archi  IA->IA: {h['edges_ia_ia']} | IA->non: {h['edges_ia_non']} | "
          f"non->IA: {h['edges_non_ia']} | non->non: {h['edges_non_non']}")
    print(f"frazione IA->IA osservata: {100*h['obs_ia_ia_frac']:.3f}%  |  "
          f"attesa per caso: {100*h['expected_ia_ia_frac_degree_null']:.3f}%")
    print(f"rapporto omofilia (oss/atteso): {h['homophily_ratio_degree_null']}   ( >1 = omofilia )")
    print(f"quando un IA crea un link, va verso un altro IA nel "
          f"{100*h['frac_ia_outlinks_to_ia']:.1f}% dei casi  (baseline {100*h['baseline_share_ia']:.1f}%)")
    print(f"assortativita' di Newman sull'etichetta IA: {h['assortativity_is_ia']}   "
          f"( >0 omofilia, ~0 mescolanza, <0 eterofilia )")
    r, a = h["homophily_ratio_degree_null"], h["assortativity_is_ia"]
    if (r is not None and r > 1.1) or (a is not None and a > 0.05):
        print(">> Gli utenti IA TENDONO a collegarsi tra loro (omofilia).")
    elif (r is not None and r < 0.9) or (a is not None and a < -0.05):
        print(">> Gli utenti IA collegano PIU' spesso non-IA (eterofilia).")
    else:
        print(">> Nessuna omofilia marcata: i link IA sono vicini all'atteso per caso.")


# =========================================================================== #
#  Campionamento SNOWBALL (a partire dagli utenti IA)
# =========================================================================== #
def sample_snowball(g, n_nodes, candidates, rng, n_start):
    """Sottografo connesso e denso: parte da n_start utenti IA e cresce per
    vicinato (successori + predecessori) fino a ~n_nodes nodi. Mantiene le p_ic."""
    carriers = [c for c in candidates if g.has_node(c)]
    if not carriers:
        return nx.DiGraph()
    start = rng.sample(carriers, min(n_start, len(carriers)))
    visited = set(start)
    frontier = list(start)
    while frontier and len(visited) < n_nodes:
        rng.shuffle(frontier)
        nxt = []
        for u in frontier:
            if len(visited) >= n_nodes:
                break
            nbrs = list(g.successors(u)) + list(g.predecessors(u))
            rng.shuffle(nbrs)
            for w in nbrs:
                if w not in visited:
                    visited.add(w)
                    nxt.append(w)
                    if len(visited) >= n_nodes:
                        break
        frontier = nxt

    nodes = list(visited)
    sub = g.subgraph(nodes)
    h = nx.DiGraph()
    for node in nodes:
        h.add_node(node, **g.nodes[node])
    for u, v, d in sub.edges(data=True):
        h.add_edge(u, v, **d)
    return h


def simulate_ic_trace(h, seeds, rng):
    """Una realizzazione dell'Independent Cascade dai seed, registrata passo-passo
    per l'animazione. Ritorna:
      - activation_step: {nodo -> step in cui si e' attivato}
      - fired: set di archi (u,v) che hanno trasmesso
      - frames: lista di {step, new_nodes, new_edges} per l'animazione."""
    activation_step = {s: 0 for s in seeds}
    fired = set()
    frames = [{"step": 0, "new_nodes": list(seeds), "new_edges": []}]
    frontier = list(seeds)
    step = 0
    while frontier:
        step += 1
        new_nodes, new_edges = [], []
        for u in frontier:
            for v in h.successors(u):
                if v in activation_step:
                    continue
                if rng.random() < h[u][v].get("p_ic", 0.0):
                    activation_step[v] = step
                    new_nodes.append(v)
                    new_edges.append([u, v])
                    fired.add((u, v))
        if not new_nodes:
            break
        frames.append({"step": step, "new_nodes": new_nodes, "new_edges": new_edges})
        frontier = new_nodes
    return activation_step, fired, frames


def export_final_graph(h, seeds, candidates, path, rng):
    """Esporta il sottografo finale + la propagazione (IC) in un JSON per animare.
    Schema: meta, nodes, edges, seeds, frames."""
    ia = set(candidates)
    seedset = set(seeds)
    activation_step, fired, frames = simulate_ic_trace(h, seeds, rng)

    nodes = []
    for n, d in h.nodes(data=True):
        nodes.append({
            "id": n,
            "acct": d.get("acct"),
            "followers": d.get("followers"),
            "is_ia": bool(n in ia),
            "is_seed": bool(n in seedset),
            "activation_step": activation_step.get(n),   # None se mai attivato
        })
    edges = []
    for u, v, d in h.edges(data=True):
        st = activation_step.get(v)
        edges.append({
            "source": u, "target": v,
            "p_ic": round(float(d.get("p_ic", 0.0)), 6),
            "fired": (u, v) in fired,                     # ha trasmesso l'informazione?
            "step": st if (u, v) in fired else None,      # step in cui ha trasmesso
        })

    reached = len(activation_step)
    data = {
        "meta": {
            "nodes": h.number_of_nodes(),
            "edges": h.number_of_edges(),
            "seeds": len(seeds),
            "reached_nodes": reached,
            "reached_pct": round(100 * reached / h.number_of_nodes(), 3) if h.number_of_nodes() else 0.0,
            "num_steps": len(frames) - 1,
            "note": "propagazione = una realizzazione Independent Cascade dai seed",
        },
        "seeds": list(seeds),
        "nodes": nodes,
        "edges": edges,
        "frames": frames,   # per l'animazione: step 0 = seed, poi nuovi nodi/archi a ogni step
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"[salvato] {path}  ({h.number_of_nodes()} nodi, {h.number_of_edges()} archi, "
          f"{reached} raggiunti in {len(frames)-1} step)", file=sys.stderr)


def _build_induced(g, nodeset):
    """Ricostruisce il sottografo indotto da un insieme di nodi (con attributi e
    p_ic). Deterministico: lo snowball tiene tutti gli archi indotti, quindi il
    sottografo e' univocamente determinato dai suoi nodi."""
    sub = g.subgraph(nodeset)
    h = nx.DiGraph()
    for n in nodeset:
        h.add_node(n, **g.nodes[n])
    for u, v, d in sub.edges(data=True):
        h.add_edge(u, v, **d)
    return h


def _save_sim_seed_file(path, g, h, seeds, candidates):
    """Salva il file di una simulazione: seed (id, acct, followers) + omofilia."""
    homo = compute_homophily(h, candidates & set(h.nodes))
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"seed": _seed_info(g, seeds),
                   "homofilia": {"ratio": homo["homophily_ratio_degree_null"],
                                 "assortativity": homo["assortativity_is_ia"],
                                 "frac_ia_to_ia": homo["frac_ia_outlinks_to_ia"]}},
                  f, ensure_ascii=False, indent=2)


def _seed_info(g, seeds):
    out = []
    for s in seeds:
        d = g.nodes[s]
        out.append({"id": s, "acct": d.get("acct"), "followers": d.get("followers")})
    return out


# =========================================================================== #
#  Ciclo di simulazioni con crescita fino a TARGET_SIM
# =========================================================================== #
def run_simulations(g, candidates, args, rng):
    os.makedirs(args.out_dir, exist_ok=True)
    graph_n = g.number_of_nodes()
    accepted, sims = [], []
    N = float(args.n_start)

    best = {"spread": -1.0, "nodeset": None, "seeds": None, "sim": None}
    last = {"nodeset": None, "seeds": None, "sim": None}

    while len(sims) < args.max_sims:
        target_nodes = min(int(round(N)), args.n_cap, graph_n)
        h = sample_snowball(g, target_nodes, candidates, rng, args.snowball_starts)
        nodeset = set(h.nodes)
        accepted.append(nodeset)
        sim_id = len(sims) + 1

        cand_sub = candidates & nodeset
        seeds, spread = pmia_select(h, args.k, cand_sub, theta=args.theta)

        if len(accepted) >= 2:
            pairs = [jaccard_similarity(accepted[i], accepted[j])
                     for i in range(len(accepted)) for j in range(i + 1, len(accepted))]
            sim_mean = statistics.fmean(pairs)
        else:
            sim_mean = 0.0

        rec = {
            "sim": sim_id, "nodes": h.number_of_nodes(), "edges": h.number_of_edges(),
            "candidates": len(cand_sub), "seeds": len(seeds),
            "spread": round(spread, 4),
            "spread_pct": round(100 * spread / h.number_of_nodes(), 3) if h.number_of_nodes() else 0.0,
            "similarity_mean": round(sim_mean, 4),
            "gini_outdeg": round(gini([d for _, d in h.out_degree()]), 4),
        }
        sims.append(rec)
        print(f"[sim {sim_id:>2}] nodi={rec['nodes']:>6} archi={rec['edges']:>8} "
              f"seed={rec['seeds']:>4} spread={rec['spread']:>10.2f} "
              f"({rec['spread_pct']:>5.2f}%) similarita'={rec['similarity_mean']:.3f}",
              file=sys.stderr)

        # tengo solo i NODESET (leggeri) della migliore e dell'ultima: i grafi si
        # ricostruiscono a fine ciclo, cosi' non tengo grafi enormi in memoria.
        if spread > best["spread"]:
            best = {"spread": spread, "nodeset": nodeset, "seeds": seeds, "sim": rec}
        last = {"nodeset": nodeset, "seeds": seeds, "sim": rec}

        if len(sims) >= 2 and sim_mean >= args.target_sim:
            print(f"[stop] similarita' media {sim_mean:.3f} >= target {args.target_sim}",
                  file=sys.stderr)
            break
        # stop se lo SPREAD e' stabile (plateau) sulle ultime plateau_window simulazioni
        if len(sims) >= args.plateau_window:
            recent = [s["spread"] for s in sims[-args.plateau_window:]]
            m = statistics.fmean(recent)
            if m > 0 and (max(recent) - min(recent)) / m <= args.plateau_tol:
                print(f"[stop] spread stabile sulle ultime {args.plateau_window} simulazioni "
                      f"(variazione <= {100*args.plateau_tol:.0f}%): nessun cambiamento.",
                      file=sys.stderr)
                break
        N *= args.growth

    # --- salvo SOLO due simulazioni: quella col massimo spread e l'ultima ---
    if best["nodeset"] is not None:
        h_best = _build_induced(g, best["nodeset"])
        _save_sim_seed_file(os.path.join(args.out_dir, "simulazione_max_spread.json"),
                            g, h_best, best["seeds"], candidates)
        # animazione per la simulazione col massimo spread
        export_final_graph(h_best, best["seeds"], candidates, args.out_graph_json, rng)

    if last["nodeset"] is not None:
        h_last = _build_induced(g, last["nodeset"])
        _save_sim_seed_file(os.path.join(args.out_dir, "simulazione_ultima.json"),
                            g, h_last, last["seeds"], candidates)

    return sims, best["sim"], last["sim"]


def main():
    p = argparse.ArgumentParser(description="PMIA per simulazioni su sottografi (snowball + crescita)")
    p.add_argument("--gexf", default=GEXF)
    p.add_argument("--labels", default=LABELS)
    p.add_argument("--n-start", type=int, default=N_START)
    p.add_argument("--growth", type=float, default=GROWTH)
    p.add_argument("--n-cap", type=int, default=N_CAP)
    p.add_argument("--target-sim", type=float, default=TARGET_SIM)
    p.add_argument("--max-sims", type=int, default=MAX_SIMS)
    p.add_argument("--plateau-window", type=int, default=PLATEAU_WINDOW)
    p.add_argument("--plateau-tol", type=float, default=PLATEAU_TOL)
    p.add_argument("--snowball-starts", type=int, default=SNOWBALL_STARTS)
    p.add_argument("--k", type=int, default=K_SEED)
    p.add_argument("--theta", type=float, default=THETA)
    p.add_argument("--random-seed", type=int, default=RANDOM_SEED)
    p.add_argument("--label-field", default=LABEL_FIELD)
    p.add_argument("--positive-value", default=POSITIVE_VALUE)
    p.add_argument("--id-field", default=ID_FIELD)
    p.add_argument("--match-by", choices=["acct", "node_id"], default=MATCH_BY)
    p.add_argument("--out-dir", default=OUT_DIR)
    p.add_argument("--out-json", default=OUT_JSON)
    p.add_argument("--out-graph-json", default=OUT_GRAPH_JSON)
    p.add_argument("--homophily-only", action="store_true",
                   help="calcola solo l'omofilia sul grafo e termina")
    p.add_argument("--out-homophily", default="homofilia.json")
    args = p.parse_args()

    rng = random.Random(args.random_seed)
    g = load_graph(args)
    print(f"[grafo intero] nodi={g.number_of_nodes()} archi={g.number_of_edges()}", file=sys.stderr)

    candidates = resolve_candidates(g, args)
    if not candidates:
        sys.exit("Nessun portatore IA agganciato: controlla --labels / --match-by / --id-field.")

    homo = compute_homophily(g, candidates)
    print_homophily(homo)
    with open(args.out_homophily, "w", encoding="utf-8") as f:
        json.dump(homo, f, ensure_ascii=False, indent=2)
    print(f"[salvato] {args.out_homophily}", file=sys.stderr)
    if args.homophily_only:
        return

    sims, best_rec, last_rec = run_simulations(g, candidates, args, rng)
    spreads = [s["spread"] for s in sims]
    mean_spread = statistics.fmean(spreads) if spreads else 0.0

    print("\n=== PMIA — SIMULAZIONI SU SOTTOGRAFI (snowball, crescita) ===")
    print(f"k={args.k} | theta={args.theta} | target similarita'={args.target_sim}")
    print(f"\n{'sim':>3} {'nodi':>7} {'archi':>9} {'cand.':>6} {'seed':>5} "
          f"{'spread':>11} {'spread%':>8} {'simil.':>7}")
    for s in sims:
        print(f"{s['sim']:>3} {s['nodes']:>7} {s['edges']:>9} {s['candidates']:>6} "
              f"{s['seeds']:>5} {s['spread']:>11.2f} {s['spread_pct']:>7.2f}% "
              f"{s['similarity_mean']:>7.3f}")
    if best_rec:
        print(f"\n>> MAX SPREAD: simulazione {best_rec['sim']} -> {best_rec['spread']:.2f} nodi "
              f"su {best_rec['nodes']} ({best_rec['spread_pct']:.2f}%)")
    if last_rec:
        print(f">> ULTIMA:    simulazione {last_rec['sim']} -> {last_rec['spread']:.2f} nodi "
              f"su {last_rec['nodes']} ({last_rec['spread_pct']:.2f}%)")
    print(f"   (spread medio su tutte: {mean_spread:.2f})")
    print(f"[salvati] {args.out_dir}/simulazione_max_spread.json e simulazione_ultima.json")
    print(f"[animazione] {args.out_graph_json} (grafo col max spread)")

    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump({"params": {"n_start": args.n_start, "growth": args.growth,
                              "n_cap": args.n_cap, "target_sim": args.target_sim,
                              "k": args.k, "theta": args.theta},
                   "max_spread_sim": best_rec, "last_sim": last_rec,
                   "spread_mean_all": round(mean_spread, 4),
                   "n_simulations": len(sims)}, f, ensure_ascii=False, indent=2)
    print(f"[salvato] {args.out_json}", file=sys.stderr)


if __name__ == "__main__":
    main()
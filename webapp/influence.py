import csv
import json
import threading
from typing import Any, Dict, List, Optional, Set

from fastapi import HTTPException

from webapp.path_utils import INFLUENCE_MAXIMIZATION_PATH, CONFRONTO_ALGORITMI_PATH, TOPIC_PROPAGATORI_PATH, FACT_CHECK_PATH, RISULTATI_IM_DIR


def _missing_data_file(path, descrizione: str) -> HTTPException:
    """503 leggibile al posto di una FileNotFoundError grezza: i dataset di
    Influence Maximization sono troppo grandi per stare su git (vedi
    .gitignore), quindi la loro assenza e' una condizione prevista su un clone
    fresco, non un bug. Il client deve poterlo distinguere da un 500."""
    return HTTPException(
        status_code=503,
        detail=(
            f"{descrizione} non e' disponibile: manca il file {path.name}. "
            f"Va rigenerato o copiato in {path.parent}."
        ),
    )

_CACHE_LOCK = threading.Lock()
_INFLUENCE_DATA_CACHE: Optional[Dict[str, Any]] = None
_ALGO_COMPARISON_CACHE: Optional[Dict[str, Any]] = None
_TOPIC_PROPAGATORI_CACHE: Optional[Dict[str, Any]] = None
_FACT_CHECK_INDEX_CACHE: Optional[Dict[int, Dict]] = None



def load_influence_data() -> Dict[str, Any]:
    """Carica e memorizza in cache il dataset di Influence Maximization."""
    global _INFLUENCE_DATA_CACHE
    if _INFLUENCE_DATA_CACHE is not None:
        return _INFLUENCE_DATA_CACHE

    with _CACHE_LOCK:
        if _INFLUENCE_DATA_CACHE is not None:
            return _INFLUENCE_DATA_CACHE

        path = INFLUENCE_MAXIMIZATION_PATH
        if not path.exists():
            raise _missing_data_file(path, "Il dataset di Influence Maximization")

        with open(path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        meta = raw_data.get("meta", {})
        seeds_list = [str(s) for s in raw_data.get("seeds", [])]
        seeds_set = set(seeds_list)

        raw_nodes = raw_data.get("nodes", [])
        nodes_dict: Dict[str, Dict[str, Any]] = {}
        for n in raw_nodes:
            nid = str(n["id"])
            nodes_dict[nid] = n

        fired_edges = [e for e in raw_data.get("edges", []) if e.get("fired")]

        # Conteggio attivazioni dirette per ciascun seed
        seed_direct_reach: Dict[str, int] = {s: 0 for s in seeds_set}
        fired_edges_by_step: Dict[int, int] = {}
        
        for e in fired_edges:
            src = str(e["source"])
            st = e.get("step", 0)
            if src in seed_direct_reach:
                seed_direct_reach[src] += 1
            fired_edges_by_step[st] = fired_edges_by_step.get(st, 0) + 1

        # Statistiche dettagliate per step (Frames)
        step_stats: List[Dict[str, Any]] = []
        cumulative = 0
        total_nodes = meta.get("nodes", 319096)

        frames = raw_data.get("frames", [])
        for fr in frames:
            st = fr.get("step", 0)
            new_nodes = fr.get("new_nodes", [])
            new_nodes_list = new_nodes if isinstance(new_nodes, list) else []
            count = len(new_nodes_list)
            
            ai_count = 0
            human_count = 0
            for nid in new_nodes_list:
                node = nodes_dict.get(str(nid), {})
                if node.get("is_ia"):
                    ai_count += 1
                else:
                    human_count += 1

            cumulative += count
            cum_pct = round((cumulative / total_nodes) * 100, 3)

            step_stats.append({
                "step": st,
                "new_nodes": count,
                "new_ai": ai_count,
                "new_human": human_count,
                "cumulative_nodes": cumulative,
                "cumulative_pct": cum_pct,
                "fired_edges": fired_edges_by_step.get(st, 0),
            })

        # Calcolo top seeds (Leaderboard)
        top_seed_list = []
        for sid in seeds_list:
            n = nodes_dict.get(sid, {})
            foll = n.get("followers", 0)
            direct = seed_direct_reach.get(sid, 0)
            eff = round(direct / foll, 4) if foll > 0 else 0.0
            top_seed_list.append({
                "id": sid,
                "acct": n.get("acct", f"Seed_{sid}"),
                "followers": foll,
                "is_ia": True,
                "direct_reached": direct,
                "efficiency": eff,
                "step": 0,
            })

        top_seed_list.sort(key=lambda x: (x["direct_reached"], x["followers"]), reverse=True)

        # Calcolo top target accounts (account umani a piu alto follower raggiunti)
        reached_human_nodes = [
            n for n in raw_nodes if not n.get("is_ia") and n.get("activation_step") is not None
        ]
        reached_human_nodes.sort(
            key=lambda x: (-(x.get("followers") or 0), x.get("activation_step") or 999)
        )
        
        top_targets = []
        for n in reached_human_nodes[:50]:
            top_targets.append({
                "id": str(n["id"]),
                "acct": n.get("acct", ""),
                "followers": n.get("followers", 0),
                "is_ia": False,
                "activation_step": n.get("activation_step"),
            })

        # Estrazione Sottografo Canvas per Rendering 60FPS nel Frontend
        # Selezioniamo i primi 60 seed piu influenti e i loro principali bersagli diretti
        top_seeds_for_graph = set(s["id"] for s in top_seed_list[:60])
        subgraph_nodes_map: Dict[str, Dict[str, Any]] = {}

        for sid in top_seeds_for_graph:
            n = nodes_dict.get(sid)
            if n:
                subgraph_nodes_map[sid] = {
                    "id": sid,
                    "acct": n.get("acct", f"Seed_{sid}"),
                    "followers": n.get("followers", 0),
                    "is_ia": True,
                    "is_seed": True,
                    "activation_step": 0,
                }

        # Raccogliamo fino a 6 bersagli per seed per mantenere il canvas fluido (~400 nodi)
        seed_targets_count: Dict[str, int] = {s: 0 for s in top_seeds_for_graph}
        subgraph_edges: List[Dict[str, Any]] = []

        for e in fired_edges:
            src = str(e["source"])
            tgt = str(e["target"])
            if src in top_seeds_for_graph:
                if seed_targets_count[src] < 6 or tgt in top_seeds_for_graph:
                    seed_targets_count[src] += 1
                    subgraph_edges.append({
                        "source": src,
                        "target": tgt,
                        "p_ic": round(e.get("p_ic", 0.04), 4),
                        "step": e.get("step", 1),
                    })
                    if tgt not in subgraph_nodes_map:
                        tn = nodes_dict.get(tgt, {})
                        subgraph_nodes_map[tgt] = {
                            "id": tgt,
                            "acct": tn.get("acct", f"Node_{tgt}"),
                            "followers": tn.get("followers", 0),
                            "is_ia": bool(tn.get("is_ia")),
                            "is_seed": False,
                            "activation_step": tn.get("activation_step", 1),
                        }

        # Conteggio demografico finale
        total_activated = [n for n in raw_nodes if n.get("activation_step") is not None]
        activated_ai = sum(1 for n in total_activated if n.get("is_ia"))
        activated_human = len(total_activated) - activated_ai

        _INFLUENCE_DATA_CACHE = {
            "meta": {
                "nodes": meta.get("nodes", 319096),
                "edges": meta.get("edges", 1978155),
                "seeds": len(seeds_list),
                "reached_nodes": meta.get("reached_nodes", 80943),
                "reached_pct": meta.get("reached_pct", 25.366),
                "num_steps": meta.get("num_steps", 11),
                "note": meta.get("note", "Independent Cascade simulation"),
            },
            "demographics": {
                "activated_total": len(total_activated),
                "activated_ai": activated_ai,
                "activated_human": activated_human,
                "seeds_ai": len(seeds_list),
                "seeds_human": 0,
            },
            "step_stats": step_stats,
            "all_seeds": top_seed_list,
            "top_targets": top_targets,
            "graph_subgraph": {
                "nodes": list(subgraph_nodes_map.values()),
                "links": subgraph_edges,
            },
            "raw_nodes": raw_nodes,
            "raw_edges": raw_data.get("edges", []),
        }

        return _INFLUENCE_DATA_CACHE


def get_influence_summary() -> Dict[str, Any]:
    """Restituisce il sommario ad alte prestazioni delle metriche di influenza."""
    data = load_influence_data()
    return {
        "meta": data["meta"],
        "demographics": data["demographics"],
        "step_stats": data["step_stats"],
        "top_seeds": data["all_seeds"][:25],
        "top_targets": data["top_targets"][:25],
    }


def get_influence_graph(seed_id: Optional[str] = None) -> Dict[str, Any]:
    """Restituisce un sottografo ad albero di propagazione multi-hop focalizzato su un singolo seed,
    mostrando l'infezione a cascata passo dopo passo (Step 1, Step 2, Step 3, ... Step 11)
    e i nodi inattivi vicini."""
    data = load_influence_data()
    raw_nodes = data["raw_nodes"]
    nodes_dict = {str(n["id"]): n for n in raw_nodes}
    top_seeds = data["all_seeds"]

    if not seed_id or seed_id == "all":
        seed_id = top_seeds[0]["id"] if top_seeds else "66109"

    seed_node = nodes_dict.get(str(seed_id))
    if not seed_node:
        return data["graph_subgraph"]

    sid = str(seed_id)

    raw_edges = data.get("raw_edges")
    if raw_edges is None:
        path = INFLUENCE_MAXIMIZATION_PATH
        with open(path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
            raw_edges = raw_data.get("edges", [])
            data["raw_edges"] = raw_edges

    # Mappa di adiacenza degli archi fired (source -> edges e target -> edges)
    adj_out: Dict[str, List[Dict[str, Any]]] = {}
    adj_in: Dict[str, List[Dict[str, Any]]] = {}
    adj_unfired: Dict[str, List[Dict[str, Any]]] = {}

    for e in raw_edges:
        src = str(e.get("source"))
        tgt = str(e.get("target"))
        if e.get("fired"):
            adj_out.setdefault(src, []).append(e)
            adj_in.setdefault(tgt, []).append(e)
        else:
            adj_unfired.setdefault(src, []).append(e)

    visited_nodes: Set[str] = {sid}
    selected_fired_edges: List[Dict[str, Any]] = []

    # Step 1: Bersagli diretti del seed_id (fino a 40)
    step1_candidates = sorted(
        adj_out.get(sid, []),
        key=lambda e: nodes_dict.get(str(e.get("target")), {}).get("followers", 0),
        reverse=True
    )[:40]

    for e in step1_candidates:
        tgt_id = str(e["target"])
        visited_nodes.add(tgt_id)
        selected_fired_edges.append(e)

    # Step 2..11: Estrazione cascata a valle garantendo nodi attivi per TUTTI gli step 2..11
    frontier = [str(e["target"]) for e in step1_candidates]

    for st in range(2, 12):
        next_frontier = []
        st_edges = []

        # Estraiamo gli archi a valle dalla frontiera corrente
        for src in frontier:
            for e in adj_out.get(src, []):
                tgt_id = str(e["target"])
                if tgt_id not in visited_nodes:
                    visited_nodes.add(tgt_id)
                    next_frontier.append(tgt_id)
                    st_edges.append(e)

        # Se il ramo locale ha meno di 10 nodi per questo step, integriamo con nodi dello step st della simulazione
        if len(st_edges) < 10:
            global_st_nodes = [
                n for n in raw_nodes if n.get("activation_step") == st and str(n["id"]) not in visited_nodes
            ]
            global_st_nodes.sort(key=lambda n: n.get("followers", 0), reverse=True)

            needed = 10 - len(st_edges)
            for n in global_st_nodes[:needed]:
                nid = str(n["id"])
                visited_nodes.add(nid)
                next_frontier.append(nid)
                in_e = adj_in.get(nid)
                if in_e:
                    selected_fired_edges.append(in_e[0])

        selected_fired_edges.extend(st_edges)
        frontier = next_frontier

    # Nodi Inattivi vicini (fino a 25 nodi non contagiati)
    unfired_from_seed = sorted(
        adj_unfired.get(sid, []),
        key=lambda e: nodes_dict.get(str(e.get("target")), {}).get("followers", 0),
        reverse=True
    )[:25]

    nodes_map: Dict[str, Dict[str, Any]] = {}
    
    # 1. Seed Bot di Origine (Step 0)
    nodes_map[sid] = {
        "id": sid,
        "acct": seed_node.get("acct", f"Seed_{sid}"),
        "followers": seed_node.get("followers", 0),
        "is_ia": True,
        "is_seed": True,
        "activation_step": 0,
        "role": "seed",
    }

    links_list: List[Dict[str, Any]] = []

    # 2. Nodi Attivi nella Cascata Multi-Hop (Step 1..11)
    for e in selected_fired_edges:
        src_id = str(e["source"])
        tgt_id = str(e["target"])
        tn = nodes_dict.get(tgt_id, {})
        st = e.get("step", tn.get("activation_step", 1))

        links_list.append({
            "source": src_id,
            "target": tgt_id,
            "p_ic": round(e.get("p_ic", 0.04), 4),
            "step": st,
            "fired": True,
        })

        if tgt_id not in nodes_map:
            nodes_map[tgt_id] = {
                "id": tgt_id,
                "acct": tn.get("acct", f"Node_{tgt_id}"),
                "followers": tn.get("followers", 0),
                "is_ia": bool(tn.get("is_ia")),
                "is_seed": bool(tn.get("is_seed")),
                "activation_step": st,
                "role": "active",
            }

    # 3. Nodi Inattivi Non Contagiati
    for e in unfired_from_seed:
        tgt_id = str(e["target"])
        tn = nodes_dict.get(tgt_id, {})
        links_list.append({
            "source": sid,
            "target": tgt_id,
            "p_ic": round(e.get("p_ic", 0.04), 4),
            "step": 99,
            "fired": False,
        })
        if tgt_id not in nodes_map:
            nodes_map[tgt_id] = {
                "id": tgt_id,
                "acct": tn.get("acct", f"Node_{tgt_id}"),
                "followers": tn.get("followers", 0),
                "is_ia": bool(tn.get("is_ia")),
                "is_seed": False,
                "activation_step": None,
                "role": "inactive",
            }

    return {
        "focused_seed": seed_id,
        "nodes": list(nodes_map.values()),
        "links": links_list,
    }



def get_influence_seeds(page: int = 1, page_size: int = 25, search: str = "") -> Dict[str, Any]:
    """Paginazione dei seed con ricerca per nome utente."""
    data = load_influence_data()
    seeds = data["all_seeds"]

    if search:
        s_lower = search.lower()
        seeds = [s for s in seeds if s_lower in s["acct"].lower() or s_lower in s["id"]]

    total = len(seeds)
    page = max(page, 1)
    limit = max(5, min(100, page_size))
    start = (page - 1) * limit
    end = start + limit
    rows = seeds[start:end]

    return {
        "seeds": rows,
        "total": total,
        "page": page,
        "page_size": limit,
        "has_next": end < total,
    }


def get_influence_nodes(page: int = 1, page_size: int = 25, search: str = "", step_filter: Optional[int] = None, type_filter: str = "all") -> Dict[str, Any]:
    """Paginazione dei nodi attivati con filtri per tipo, step e ricerca."""
    data = load_influence_data()
    raw_nodes = data["raw_nodes"]

    filtered = [n for n in raw_nodes if n.get("activation_step") is not None]

    if step_filter is not None:
        filtered = [n for n in filtered if n.get("activation_step") == step_filter]

    if type_filter == "ai":
        filtered = [n for n in filtered if n.get("is_ia")]
    elif type_filter == "human":
        filtered = [n for n in filtered if not n.get("is_ia")]

    if search:
        s_lower = search.lower()
        filtered = [n for n in filtered if s_lower in str(n.get("acct", "")).lower() or s_lower in str(n["id"])]

    total = len(filtered)
    page = max(page, 1)
    limit = max(5, min(100, page_size))
    start = (page - 1) * limit
    end = start + limit

    rows = []
    for n in filtered[start:end]:
        rows.append({
            "id": str(n["id"]),
            "acct": n.get("acct", ""),
            "followers": n.get("followers", 0),
            "is_ia": bool(n.get("is_ia")),
            "is_seed": bool(n.get("is_seed")),
            "activation_step": n.get("activation_step"),
        })

    return {
        "nodes": rows,
        "total": total,
        "page": page,
        "page_size": limit,
        "has_next": end < total,
    }


def get_algo_comparison() -> Dict[str, Any]:
    """Carica e memorizza in cache il confronto benchmark degli algoritmi IM."""
    global _ALGO_COMPARISON_CACHE
    if _ALGO_COMPARISON_CACHE is not None:
        return _ALGO_COMPARISON_CACHE

    with _CACHE_LOCK:
        if _ALGO_COMPARISON_CACHE is not None:
            return _ALGO_COMPARISON_CACHE

        path = CONFRONTO_ALGORITMI_PATH
        if not path.exists():
            raise _missing_data_file(path, "Il confronto fra algoritmi")

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        clean_algos = {}
        for algo_name, algo_info in data.get("algorithms", {}).items():
            seeds_list = algo_info.get("seeds", [])
            clean_algos[algo_name] = {
                "n_seeds": algo_info.get("n_seeds", len(seeds_list)),
                "est_spread": algo_info.get("est_spread"),
                "mc_spread": algo_info.get("mc_spread"),
                "time_s": algo_info.get("time_s"),
                "seeds_sample": seeds_list[:15],
            }

        _ALGO_COMPARISON_CACHE = {
            "subgraph": data.get("subgraph", {}),
            "k": data.get("k", 1000),
            "eval_runs": data.get("eval_runs", 500),
            "algorithms": clean_algos,
            "seed_overlap_jaccard": data.get("seed_overlap_jaccard", {}),
            "winner_by_mc_spread": data.get("winner_by_mc_spread", "CELF++"),
            # Assente nelle run precedenti all'introduzione del campo: si passa
            # None e la pagina dichiara i parametri non registrati, invece di
            # attribuire alla run valori che potrebbero non essere i suoi.
            "params": data.get("params"),
        }
        return _ALGO_COMPARISON_CACHE


def _load_fact_check_index() -> Dict[int, Dict]:
    """Carica fact_check_report.csv in cache: {status_id: {veracity, ai_generated}}."""
    global _FACT_CHECK_INDEX_CACHE
    if _FACT_CHECK_INDEX_CACHE is not None:
        return _FACT_CHECK_INDEX_CACHE
    with _CACHE_LOCK:
        if _FACT_CHECK_INDEX_CACHE is not None:
            return _FACT_CHECK_INDEX_CACHE
        index: Dict[int, Dict] = {}
        with open(FACT_CHECK_PATH, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                try:
                    sid = int(row["id"])
                    v = int(row["veracity"])
                    ai_raw = row.get("ai_generated", "").strip().lower()
                    ai = ai_raw in ("true", "1", "yes")
                    index[sid] = {"veracity": v, "ai_generated": ai}
                except (ValueError, KeyError):
                    pass
        _FACT_CHECK_INDEX_CACHE = index
        return index


def get_propagatore_posts(
    acct: str,
    topic: str,
    veracity_group: str,
    tipo: str,
    n: int,
    conn,
) -> List[Dict[str, Any]]:
    """Post di un propagatore filtrati per topic/veracity/tipo-autore."""
    fc = _load_fact_check_index()
    cur = conn.cursor()

    # Recupera tutti i post dell'account — il filtro per topic avviene già
    # a monte (chi appare nel ranking per un topic lo è perché classificato
    # tale nel GEXF); filtrare anche i post per hashtag del topic escluderebbe
    # post valid amente classificati ma privi di hashtag registrati.
    cur.execute(
        """
        SELECT s.id, s.content, s.created_at
        FROM statuses s
        JOIN accounts a ON s.account_id = a.id
        WHERE a.acct = %s
        ORDER BY s.created_at DESC
        """,
        (acct,),
    )

    results = []
    for (sid, content, created_at) in cur.fetchall():
        fc_row = fc.get(sid)
        if fc_row is None:
            continue
        v = fc_row["veracity"]
        ai = fc_row["ai_generated"]
        # Filtro veracity: vero=0-1, falso=3-4 (2=misto escluso da entrambi)
        if veracity_group == "info" and v > 1:
            continue
        if veracity_group == "disinfo" and v < 3:
            continue
        # Filtro tipo autore
        if tipo == "ai" and not ai:
            continue
        if tipo == "human" and ai:
            continue
        results.append({
            "id": sid,
            "content": content or "",
            "created_at": created_at.isoformat() if created_at else None,
        })
        if len(results) >= n:
            break
    return results


def get_topic_propagatori() -> Dict[str, Any]:
    """Carica topic_propagators.json in cache (file statico, ~200KB)."""
    global _TOPIC_PROPAGATORI_CACHE
    if _TOPIC_PROPAGATORI_CACHE is not None:
        return _TOPIC_PROPAGATORI_CACHE
    with _CACHE_LOCK:
        if _TOPIC_PROPAGATORI_CACHE is not None:
            return _TOPIC_PROPAGATORI_CACHE
        path = TOPIC_PROPAGATORI_PATH
        if not path.exists():
            raise _missing_data_file(path, "I propagatori per topic")
        with open(path, "r", encoding="utf-8") as f:
            _TOPIC_PROPAGATORI_CACHE = json.load(f)
        return _TOPIC_PROPAGATORI_CACHE


def get_result_comparison() -> List[Dict[str, Any]]:
    """Legge result_*.json da Risultati_IM e restituisce confronto spread/tempo."""
    results: List[Dict[str, Any]] = []
    if not RISULTATI_IM_DIR.exists():
        return results
    ALIAS = {"SKIM": "RIS-greedy"}
    for path in sorted(RISULTATI_IM_DIR.glob("result_*.json")):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        algo_raw = data.get("algo", path.stem.replace("result_", ""))
        algo = ALIAS.get(algo_raw, algo_raw)
        spread_by_k = data.get("spread", {})
        k_max = str(data.get("k_max", ""))
        spread = spread_by_k.get(k_max) if k_max else None
        results.append({
            "algo": algo,
            "algo_raw": algo_raw,
            "spread": spread,
            "time_s": data.get("selection_seconds"),
            "k_max": data.get("k_max"),
            "graph_nodes": data.get("graph_nodes"),
            "graph_edges": data.get("graph_edges"),
            "candidates": data.get("candidates"),
            "mc_eval": data.get("mc_eval"),
        })
    results.sort(key=lambda r: r.get("spread") or 0, reverse=True)
    return results


def get_propagatore_profile(acct: str, conn) -> Dict[str, Any]:
    """Profilo account per il drawer propagatori: dati DB + etichette."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.id, a.acct, a.username, a.bot, a.raw,
                   (SELECT COUNT(*) FROM statuses WHERE account_id = a.id) as statuses_db
            FROM accounts a
            WHERE a.acct = %s
            LIMIT 1
            """,
            (acct,),
        )
        row = cur.fetchone()
    if not row:
        return {}
    acc_id, acct_db, username, is_bot, raw, statuses_db = row
    rd = raw if isinstance(raw, dict) else {}
    return {
        "id": acc_id,
        "acct": acct_db,
        "display_name": rd.get("display_name") or username or acct_db,
        "bot": bool(is_bot),
        "avatar": rd.get("avatar") or rd.get("avatar_static"),
        "header": rd.get("header") or rd.get("header_static"),
        "note": rd.get("note") or "",
        "url": rd.get("url"),
        "followers_count": rd.get("followers_count"),
        "following_count": rd.get("following_count"),
        "statuses_count": rd.get("statuses_count") or statuses_db,
        "created_at": rd.get("created_at"),
        "fields": rd.get("fields", []),
    }


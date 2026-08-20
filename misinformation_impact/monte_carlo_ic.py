"""Monte Carlo IC con soggezione topic-aware via TwitterRank.

Implementazione ottimizzata:
  - Adjacency in formato CSR numpy (row_ptr / col_idx / p_base_arr)
  - Numba JIT + parallel=True: tutte le N_SIMS del post in codice nativo OpenMP
  - Fallback Python se numba non è installato
  - Cache adj CSR su disco: evita re-parsing GEXF sulle run successive
  - Resume: append su mc_spread.jsonl, salta post già completati

Logica IC:
  p_base(u→v) = 1 - (1-P0)^log(1+w)       precomputata per arco
  p_ic(u→v,t) = min(p_base × α(v,t), 0.999)
  α(v,t)      = TR(v,t) / mean_TR(t)
"""
import csv
import json
import math
import os
import pickle
import random
import statistics
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).parent.parent
DATA_DIR = Path(__file__).parent / "data"

P0 = 0.05
N_SIMS = 50
SEED = 42

# ── Numba (opzionale) ────────────────────────────────────────────────────────
try:
    import numba

    @numba.njit(cache=True)
    def _ic_sim_nb(row_ptr, col_idx, p_base_arr, alpha_arr, seed_idx, n_nodes):
        active = np.zeros(n_nodes, dtype=numba.boolean)
        active[seed_idx] = True
        frontier  = np.empty(n_nodes, dtype=np.int32)
        next_f    = np.empty(n_nodes, dtype=np.int32)
        frontier[0] = seed_idx
        f_size = 1
        count = 0
        while f_size > 0:
            nf_size = 0
            for fi in range(f_size):
                u = frontier[fi]
                for i in range(row_ptr[u], row_ptr[u + 1]):
                    v = col_idx[i]
                    if not active[v]:
                        p = p_base_arr[i] * alpha_arr[v]
                        if p > 0.999:
                            p = 0.999
                        if np.random.random() < p:
                            active[v] = True
                            next_f[nf_size] = v
                            nf_size += 1
                            count += 1
            frontier[:nf_size] = next_f[:nf_size]
            f_size = nf_size
        return count

    @numba.njit(parallel=True, cache=True)
    def ic_multi_sim_nb(row_ptr, col_idx, p_base_arr, alpha_arr,
                        seed_idx, n_nodes, n_sims, base_seed):
        results = np.zeros(n_sims, dtype=np.int32)
        for s in numba.prange(n_sims):
            np.random.seed(base_seed + s)
            results[s] = _ic_sim_nb(row_ptr, col_idx, p_base_arr, alpha_arr,
                                    seed_idx, n_nodes)
        return results

    USE_NUMBA = True
    print("Numba disponibile: IC compilato in codice nativo (parallel=True)")

except ImportError:
    USE_NUMBA = False
    print("Numba non trovato: uso fallback Python (più lento). pip install numba per 50-200× speedup")


# ── Fallback Python ──────────────────────────────────────────────────────────
def ic_multi_sim_py(row_ptr, col_idx, p_base_arr, alpha_arr,
                    seed_idx, n_nodes, n_sims, base_seed):
    results = np.zeros(n_sims, dtype=np.int32)
    rng = random.Random(base_seed)
    for s in range(n_sims):
        active = bytearray(n_nodes)
        active[seed_idx] = 1
        frontier = [seed_idx]
        count = 0
        while frontier:
            next_f = []
            for u in frontier:
                for i in range(row_ptr[u], row_ptr[u + 1]):
                    v = int(col_idx[i])
                    if not active[v]:
                        p = float(p_base_arr[i]) * float(alpha_arr[v])
                        if p > 0.999:
                            p = 0.999
                        if rng.random() < p:
                            active[v] = 1
                            next_f.append(v)
                            count += 1
            frontier = next_f
        results[s] = count
    return results


ic_multi_sim = ic_multi_sim_nb if USE_NUMBA else ic_multi_sim_py


# ─────────────────────────────────────────────────────────────────────────────

def load_jsonl_map(path: Path, key: str, value: str) -> dict:
    result = {}
    if not path.exists():
        return result
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                row = json.loads(line)
                result[row[key]] = row[value]
    return result


def veracity_group(veracity: int) -> str:
    if veracity <= 1:
        return "vero"
    if veracity == 2:
        return "misto"
    if veracity <= 4:
        return "falso"
    return "non_verificabile"


def build_csr(adj_int: dict, n_nodes: int):
    """Converte adj_int dict in formato CSR numpy."""
    row_ptr = np.zeros(n_nodes + 1, dtype=np.int32)
    for u, neighbors in adj_int.items():
        if u < n_nodes:
            row_ptr[u + 1] = len(neighbors)
    np.cumsum(row_ptr, out=row_ptr)
    total = int(row_ptr[-1])
    col_idx   = np.zeros(total, dtype=np.int32)
    p_base_arr = np.zeros(total, dtype=np.float32)
    for u, neighbors in adj_int.items():
        if u >= n_nodes:
            continue
        start = int(row_ptr[u])
        for i, (v, p) in enumerate(neighbors):
            col_idx[start + i]    = v
            p_base_arr[start + i] = np.float32(p)
    return row_ptr, col_idx, p_base_arr


def export_user_topic_weights(node_order: dict, tr_matrix: np.ndarray, topic_list: list) -> None:
    out = DATA_DIR / "user_topic_weights.jsonl"
    idx_to_node = {v: k for k, v in node_order.items()}
    n = tr_matrix.shape[0]
    with out.open("w", encoding="utf-8") as f:
        for i in range(n):
            nid = idx_to_node.get(i)
            if nid is None:
                continue
            tr_vec = tr_matrix[i].astype(float)
            total = tr_vec.sum()
            topics = [
                {
                    "topic": topic_list[j],
                    "tr_score": round(float(s), 6),
                    "tr_weight": round(float(s / total) if total > 0 else 1.0 / len(topic_list), 4),
                }
                for j, s in enumerate(tr_vec)
            ]
            topics.sort(key=lambda x: -x["tr_weight"])
            f.write(json.dumps({"node_id": nid, "topics": topics}) + "\n")
    print(f"  user_topic_weights.jsonl: {n} nodi -> {out}")


def main() -> None:
    print("Carico fact_check_report.csv...")
    posts: dict[int, dict] = {}
    with (ROOT / "fact_check_report.csv").open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            v = int(row["veracity"])
            vg = veracity_group(v)
            if vg not in ("vero", "falso"):
                continue
            posts[int(row["id"])] = {
                "veracity_group": vg,
                "ai_generated": row["ai_generated"].strip().lower() == "true",
            }
    print(f"  {len(posts)} post (vero+falso)")

    post_to_author = load_jsonl_map(DATA_DIR / "post_authors.jsonl", "post_id", "account_id")
    canon_map      = load_jsonl_map(DATA_DIR / "account_canonical.jsonl", "account_id", "canonical_id")

    print("Carico TwitterRank...")
    tr_data    = np.load(DATA_DIR / "twitter_rank.npz")
    tr_matrix  = tr_data["TR"].astype(np.float64)
    mean_tr    = tr_matrix.mean(axis=0)
    with (DATA_DIR / "node_order.json").open() as f:
        node_order: dict[str, int] = json.load(f)
    with (DATA_DIR / "topic_list.json").open() as f:
        topic_list: list = json.load(f)
    K       = len(topic_list)
    n_nodes = tr_matrix.shape[0]
    print(f"  TR matrix {tr_matrix.shape}")

    alpha_matrix = np.where(mean_tr > 0, tr_matrix / mean_tr, 1.0).astype(np.float32)

    # ── carica o costruisce adjacency CSR ─────────────────────────────────────
    graph_path = ROOT / "Max_Influence" / "graph-out" / "influence_graph.gexf"
    cache_path = DATA_DIR / "adj_csr_cache.pkl"
    cache_valid = (
        cache_path.exists()
        and cache_path.stat().st_mtime > graph_path.stat().st_mtime
    )

    if cache_valid:
        print("Carico adjacency CSR da cache...", flush=True)
        t0 = time.time()
        with cache_path.open("rb") as f:
            row_ptr, col_idx, p_base_arr, account_to_node = pickle.load(f)
        print(f"  {len(row_ptr)-1} nodi, {len(col_idx)} archi  ({time.time()-t0:.1f}s)")
    else:
        import networkx as nx
        print("Carico grafo GEXF (prima volta, può richiedere qualche minuto)...", flush=True)
        t0 = time.time()
        g = nx.read_gexf(str(graph_path))
        print(f"  {g.number_of_nodes()} nodi, {g.number_of_edges()} archi  ({time.time()-t0:.1f}s)")

        account_to_node: dict[int, str] = {int(nid): nid for nid in g.nodes()}

        print("Costruisco adjacency int + p_base...", flush=True)
        t0 = time.time()
        adj_int: dict[int, list] = {}
        for u, v, d in g.edges(data=True):
            ui = node_order.get(u, -1)
            vi = node_order.get(v, -1)
            if ui < 0 or vi < 0:
                continue
            w = float(d.get("weight", 1.0))
            p_base = min(1.0 - (1.0 - P0) ** math.log(1.0 + w), 0.999)
            adj_int.setdefault(ui, []).append((vi, p_base))
        print(f"  ({time.time()-t0:.1f}s), converto in CSR...", flush=True)

        t0 = time.time()
        row_ptr, col_idx, p_base_arr = build_csr(adj_int, n_nodes)
        print(f"  CSR: {len(col_idx)} archi  ({time.time()-t0:.1f}s)")

        print("Salvo cache CSR...", flush=True)
        with cache_path.open("wb") as f:
            pickle.dump((row_ptr, col_idx, p_base_arr, account_to_node), f, protocol=5)
        print(f"  -> {cache_path}")

    if USE_NUMBA:
        print("Warmup Numba JIT (prima compilazione, ~20s)...", flush=True)
        t0 = time.time()
        ic_multi_sim(row_ptr, col_idx, p_base_arr,
                     alpha_matrix[:, 0].copy(), 0, n_nodes, 2, 0)
        print(f"  JIT pronto  ({time.time()-t0:.1f}s)")

    print("Esporto user_topic_weights.jsonl...")
    export_user_topic_weights(node_order, tr_matrix, topic_list)

    # gruppi
    groups: dict[str, list] = {
        "vero_ai": [], "vero_human": [], "falso_ai": [], "falso_human": []
    }
    for pid, pdata in posts.items():
        label = f"{pdata['veracity_group']}_{'ai' if pdata['ai_generated'] else 'human'}"
        groups[label].append(pid)
    for label, pids in groups.items():
        print(f"  {label}: {len(pids)} post")

    # resume
    out_spread = DATA_DIR / "mc_spread.jsonl"
    done_ids: set[int] = set()
    if out_spread.exists():
        with out_spread.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    done_ids.add(json.loads(line)["post_id"])
        print(f"Resume: {len(done_ids)} post già completati.")

    total_todo = sum(len(v) for v in groups.values()) - len(done_ids)
    print(f"\nSimulazione MC IC: {total_todo} post × {N_SIMS} sim  "
          f"({'Numba' if USE_NUMBA else 'Python'})...", flush=True)

    t_start = time.time()
    done = 0

    with out_spread.open("a", encoding="utf-8") as out_f:
        for group, pids in groups.items():
            for pid in pids:
                if pid in done_ids:
                    continue
                account_id  = post_to_author.get(pid)
                if account_id is None:
                    continue
                canonical_id = canon_map.get(account_id, account_id)
                node_id_str  = account_to_node.get(canonical_id)
                if node_id_str is None:
                    continue
                node_idx = node_order.get(node_id_str, -1)
                if node_idx < 0:
                    continue

                t_idx       = int(np.argmax(tr_matrix[node_idx]))
                topic_label = topic_list[t_idx] if t_idx < K else "unknown"
                alpha_arr   = alpha_matrix[:, t_idx].copy()

                spreads = ic_multi_sim(
                    row_ptr, col_idx, p_base_arr, alpha_arr,
                    node_idx, n_nodes, N_SIMS, SEED + done
                )

                row = {
                    "post_id": pid,
                    "group": group,
                    "topic": topic_label,
                    "spread_mean":   round(float(spreads.mean()), 3),
                    "spread_std":    round(float(spreads.std()),  3),
                    "spread_median": float(np.median(spreads)),
                }
                out_f.write(json.dumps(row) + "\n")
                out_f.flush()
                done += 1
                if done % 50 == 0:
                    elapsed   = time.time() - t_start
                    rate      = done / elapsed
                    remaining = (total_todo - done) / rate if rate > 0 else 0
                    print(
                        f"  {done}/{total_todo} ({100*done/total_todo:.1f}%)"
                        f"  {rate:.1f} post/s  ETA {remaining/60:.1f} min",
                        flush=True,
                    )

    total_written = len(done_ids) + done
    print(f"\nmc_spread.jsonl: {total_written} righe -> {out_spread}")

    # summary
    results = []
    with out_spread.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                results.append(json.loads(line))

    def agg(vals):
        if not vals:
            return {"n": 0}
        s = sorted(vals)
        n = len(s)
        return {
            "n": n,
            "mean":   round(statistics.mean(s), 3),
            "median": round(statistics.median(s), 3),
            "std":    round(statistics.stdev(s) if n > 1 else 0.0, 3),
            "p25":    round(s[n // 4], 3),
            "p75":    round(s[3 * n // 4], 3),
        }

    summary = {}
    for group in groups:
        sub = [r["spread_mean"] for r in results if r["group"] == group]
        summary[group] = agg(sub)
        tc: dict[str, int] = {}
        for r in results:
            if r["group"] == group:
                tc[r["topic"]] = tc.get(r["topic"], 0) + 1
        summary[group]["top_topics"] = sorted(tc.items(), key=lambda x: -x[1])[:5]

    out_json = DATA_DIR / "mc_summary.json"
    with out_json.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"mc_summary.json -> {out_json}")

    print("\n=== RIEPILOGO MC ===")
    for group, s in summary.items():
        if s.get("n", 0) == 0:
            continue
        print(f"{group:20s}  n={s['n']:5d}  spread medio={s['mean']:.2f}  "
              f"mediana={s['median']:.1f}  std={s['std']:.2f}")


if __name__ == "__main__":
    main()

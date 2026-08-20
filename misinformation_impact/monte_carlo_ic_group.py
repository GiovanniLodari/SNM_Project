"""Monte Carlo IC per-gruppo: dinamiche epidemiche collettive.

Seed = tutti gli autori unici del gruppo simultaneamente.
Ogni nodo propagante usa il suo topic dominante (TwitterRank).

Risponde a: "se tutto il contenuto falso-AI parte insieme, quanto si
diffonde l'epidemia rispetto al contenuto falso-umano?"

Ottimizzazioni:
  - Carica adj CSR da cache (evita re-parsing GEXF 25 min)
  - Numba JIT + prange per sim parallele (se disponibile)
  - Fallback multiprocessing Python

Output:
  data/mc_group_spread.jsonl  — per gruppo, per sim: spread totale
  data/mc_group_summary.json  — statistiche aggregate per gruppo
"""
import csv
import json
import pickle
import statistics
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).parent.parent
DATA_DIR = Path(__file__).parent / "data"

P0 = 0.05
N_SIMS = 10000      # sim per run aggregato (tutti i seed del gruppo)
N_SIMS_TOPIC = 1000  # sim per run per-topic (subset di seed)
MIN_SEEDS_TOPIC = 3  # topic con meno seed vengono saltati
SEED = 42

# ── Numba ────────────────────────────────────────────────────────────────────
try:
    import numba

    @numba.njit(cache=True)
    def _ic_group_sim_nb(row_ptr, col_idx, p_base_arr, alpha_matrix,
                         dominant_topic, seeds_arr, n_nodes):
        active = np.zeros(n_nodes, dtype=numba.boolean)
        frontier = np.empty(n_nodes, dtype=np.int32)
        next_f   = np.empty(n_nodes, dtype=np.int32)
        f_size = 0
        for s in seeds_arr:
            if not active[s]:
                active[s] = True
                frontier[f_size] = s
                f_size += 1
        count = 0
        while f_size > 0:
            nf_size = 0
            for fi in range(f_size):
                u = frontier[fi]
                t_u = dominant_topic[u]
                for i in range(row_ptr[u], row_ptr[u + 1]):
                    v = col_idx[i]
                    if not active[v]:
                        p = p_base_arr[i] * alpha_matrix[v, t_u]
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
    def ic_group_multi_sim_nb(row_ptr, col_idx, p_base_arr, alpha_matrix,
                              dominant_topic, seeds_arr, n_nodes, n_sims, base_seed):
        results = np.zeros(n_sims, dtype=np.int32)
        for s in numba.prange(n_sims):
            np.random.seed(base_seed + s)
            results[s] = _ic_group_sim_nb(row_ptr, col_idx, p_base_arr,
                                          alpha_matrix, dominant_topic,
                                          seeds_arr, n_nodes)
        return results

    USE_NUMBA = True
    print("Numba disponibile: IC gruppo compilato in codice nativo (parallel=True)")

except ImportError:
    USE_NUMBA = False
    print("Numba non trovato: uso fallback Python. pip install numba per speedup")


# ── Fallback Python ──────────────────────────────────────────────────────────
def ic_group_multi_sim_py(row_ptr, col_idx, p_base_arr, alpha_matrix,
                          dominant_topic, seeds_arr, n_nodes, n_sims, base_seed):
    import random
    results = np.zeros(n_sims, dtype=np.int32)
    for s in range(n_sims):
        rng = random.Random(base_seed + s)
        active = bytearray(n_nodes)
        frontier = []
        for seed in seeds_arr:
            if not active[seed]:
                active[seed] = 1
                frontier.append(int(seed))
        count = 0
        while frontier:
            next_f = []
            for u in frontier:
                t_u = int(dominant_topic[u])
                for i in range(int(row_ptr[u]), int(row_ptr[u + 1])):
                    v = int(col_idx[i])
                    if not active[v]:
                        p = float(p_base_arr[i]) * float(alpha_matrix[v, t_u])
                        if p > 0.999:
                            p = 0.999
                        if rng.random() < p:
                            active[v] = 1
                            next_f.append(v)
                            count += 1
            frontier = next_f
        results[s] = count
    return results


ic_group_multi_sim = ic_group_multi_sim_nb if USE_NUMBA else ic_group_multi_sim_py


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
    tr_data   = np.load(DATA_DIR / "twitter_rank.npz")
    tr_matrix = tr_data["TR"].astype(np.float64)
    mean_tr   = tr_matrix.mean(axis=0)
    with (DATA_DIR / "node_order.json").open() as f:
        node_order: dict[str, int] = json.load(f)
    with (DATA_DIR / "topic_list.json").open() as f:
        topic_list: list[str] = json.load(f)
    K       = len(topic_list)
    n_nodes = tr_matrix.shape[0]
    print(f"  TR matrix {tr_matrix.shape}")

    alpha_matrix = np.where(mean_tr > 0, tr_matrix / mean_tr, 1.0).astype(np.float32)
    dominant_topic = np.argmax(tr_matrix, axis=1).astype(np.int32)

    # ── carica adj CSR da cache ───────────────────────────────────────────────
    # Il nome della cache include P0 così un cambio di parametro non riusa
    # silenziosamente valori costruiti con probabilità diverse.
    cache_path = DATA_DIR / f"adj_csr_cache_p{P0:.4f}.pkl"
    graph_path = ROOT / "Max_Influence" / "graph-out" / "influence_graph.gexf"
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
        print("Cache non trovata, carico GEXF (può richiedere qualche minuto)...", flush=True)
        t0 = time.time()
        g = nx.read_gexf(str(graph_path))
        print(f"  {g.number_of_nodes()} nodi, {g.number_of_edges()} archi  ({time.time()-t0:.1f}s)")
        account_to_node = {int(nid): nid for nid in g.nodes()}
        adj_int: dict[int, list] = {}
        for u, v, d in g.edges(data=True):
            ui = node_order.get(u, -1)
            vi = node_order.get(v, -1)
            if ui < 0 or vi < 0:
                continue
            # Usa p_ic pre-calcolato da graph_builder (independent_trials, p0=P0).
            # Coerente con la formula documentata: p = 1-(1-P0)^weight.
            p_base = min(float(d.get("p_ic", 0.0)), 0.999)
            if p_base <= 0.0:
                continue
            adj_int.setdefault(ui, []).append((vi, p_base))
        row_ptr = np.zeros(n_nodes + 1, dtype=np.int32)
        for u, neighbors in adj_int.items():
            if u < n_nodes:
                row_ptr[u + 1] = len(neighbors)
        np.cumsum(row_ptr, out=row_ptr)
        total = int(row_ptr[-1])
        col_idx    = np.zeros(total, dtype=np.int32)
        p_base_arr = np.zeros(total, dtype=np.float32)
        for u, neighbors in adj_int.items():
            if u >= n_nodes:
                continue
            start = int(row_ptr[u])
            for i, (v, p) in enumerate(neighbors):
                col_idx[start + i]    = v
                p_base_arr[start + i] = np.float32(p)
        with cache_path.open("wb") as f:
            pickle.dump((row_ptr, col_idx, p_base_arr, account_to_node), f, protocol=5)
        print(f"  Cache salvata -> {cache_path}")

    if USE_NUMBA:
        print("Warmup Numba JIT...", flush=True)
        t0 = time.time()
        dummy_seeds = np.array([0], dtype=np.int32)
        ic_group_multi_sim(row_ptr, col_idx, p_base_arr, alpha_matrix,
                           dominant_topic, dummy_seeds, n_nodes, 2, 0)
        print(f"  JIT pronto  ({time.time()-t0:.1f}s)")

    # costruisci seed set per gruppo
    group_seeds: dict[str, set[int]] = {
        "vero_ai": set(), "vero_human": set(), "falso_ai": set(), "falso_human": set()
    }
    for pid, pdata in posts.items():
        label = f"{pdata['veracity_group']}_{'ai' if pdata['ai_generated'] else 'human'}"
        account_id   = post_to_author.get(pid)
        if account_id is None:
            continue
        canonical_id = canon_map.get(account_id, account_id)
        node_id_str  = account_to_node.get(canonical_id)
        if node_id_str is None:
            continue
        node_idx = node_order.get(node_id_str, -1)
        if node_idx >= 0:
            group_seeds[label].add(node_idx)

    for label, seeds in group_seeds.items():
        print(f"  {label}: {len(seeds)} seed unici")

    out_spread = DATA_DIR / "mc_group_spread.jsonl"
    summary = {}

    with out_spread.open("w", encoding="utf-8") as out_f:
        for group, seeds_set in group_seeds.items():
            if not seeds_set:
                summary[group] = {"aggregate": {"n_sims": 0}, "by_topic": {}}
                continue

            seeds_arr = np.array(sorted(seeds_set), dtype=np.int32)
            print(f"\n[{group}] {N_SIMS} sim da {len(seeds_arr)} seed (aggregato)...", flush=True)
            t0 = time.time()

            spreads = ic_group_multi_sim(
                row_ptr, col_idx, p_base_arr, alpha_matrix,
                dominant_topic, seeds_arr, n_nodes, N_SIMS, SEED
            )

            elapsed = time.time() - t0
            print(f"  fatto in {elapsed:.1f}s  ({N_SIMS/elapsed:.1f} sim/s)")

            for i, spread in enumerate(spreads):
                out_f.write(json.dumps({"group": group, "topic": "generale", "sim": i, "spread": int(spread)}) + "\n")
            out_f.flush()

            s = sorted(spreads.tolist())
            n = len(s)
            agg_stats = {
                "n_sims": n,
                "n_seeds": int(len(seeds_arr)),
                "spread_mean":   round(statistics.mean(s), 1),
                "spread_median": round(statistics.median(s), 1),
                "spread_std":    round(statistics.stdev(s) if n > 1 else 0.0, 1),
                "spread_p25":    s[n // 4],
                "spread_p75":    s[3 * n // 4],
                "spread_max":    s[-1],
            }
            print(f"  aggregato: medio={agg_stats['spread_mean']:.1f}  "
                  f"mediana={agg_stats['spread_median']:.1f}  "
                  f"max={agg_stats['spread_max']}")

            # ── run per-topic ─────────────────────────────────────────────────
            by_topic: dict = {}
            for t_idx, topic_name in enumerate(topic_list):
                topic_seeds = seeds_arr[dominant_topic[seeds_arr] == t_idx]
                if len(topic_seeds) < MIN_SEEDS_TOPIC:
                    if len(topic_seeds) > 0:
                        by_topic[topic_name] = {
                            "n_seeds": int(len(topic_seeds)),
                            "n_sims": 0,
                            "_note": "campione insufficiente",
                        }
                    continue

                print(f"  [{topic_name}] {N_SIMS_TOPIC} sim da {len(topic_seeds)} seed...", flush=True)
                t0 = time.time()
                t_spreads = ic_group_multi_sim(
                    row_ptr, col_idx, p_base_arr, alpha_matrix,
                    dominant_topic, topic_seeds, n_nodes, N_SIMS_TOPIC,
                    SEED + t_idx * 10000,
                )
                elapsed = time.time() - t0

                for i, spread in enumerate(t_spreads):
                    out_f.write(json.dumps({"group": group, "topic": topic_name, "sim": i, "spread": int(spread)}) + "\n")
                out_f.flush()

                ts = sorted(t_spreads.tolist())
                tn = len(ts)
                by_topic[topic_name] = {
                    "n_sims": tn,
                    "n_seeds": int(len(topic_seeds)),
                    "spread_mean":   round(statistics.mean(ts), 1),
                    "spread_median": round(statistics.median(ts), 1),
                    "spread_std":    round(statistics.stdev(ts) if tn > 1 else 0.0, 1),
                    "spread_p25":    ts[tn // 4],
                    "spread_p75":    ts[3 * tn // 4],
                    "spread_max":    ts[-1],
                }
                print(f"    medio={by_topic[topic_name]['spread_mean']:.1f}  ({elapsed:.1f}s)")

            summary[group] = {"aggregate": agg_stats, "by_topic": by_topic}

    out_json = DATA_DIR / "mc_group_summary.json"
    with out_json.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"\nmc_group_summary.json -> {out_json}")

    print("\n=== RIEPILOGO GROUP MC ===")
    for group, s in summary.items():
        agg = s.get("aggregate", s)
        if agg.get("n_sims", 0) == 0:
            continue
        by_t = s.get("by_topic", {})
        print(f"{group:20s}  seeds={agg['n_seeds']:4d}  "
              f"spread medio={agg['spread_mean']:8.1f}  "
              f"mediana={agg['spread_median']:8.1f}  "
              f"max={agg['spread_max']}  "
              f"topic con dati={sum(1 for v in by_t.values() if v.get('n_sims',0)>0)}")


if __name__ == "__main__":
    main()

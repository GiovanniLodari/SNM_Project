"""Propagatori migliori (info/disinfo) per topic, sul grafo intero, RAM-safe.

Il grafo intero (GEXF, ~965MB, ~319k nodi, ~2M archi) non viene MAI caricato in
networkx: si fa un parsing streaming (iterparse con gestione manuale dello
stack padre/figlio -- ElementTree stdlib non ha getparent(), quindi senza
questa gestione gli elementi già processati restano comunque agganciati alla
lista figli del genitore anche dopo elem.clear(), e la memoria cresce lo
stesso) direttamente in array numpy compatti: un CSR INVERSO (per ogni nodo,
i suoi predecessori con p_ic). E' l'unica struttura che serve a SKIM, la cui
RR-set risale gli archi ENTRANTI a partire da un bersaglio casuale.

Il risultato del parsing va in cache su disco (pickle) cosi' il parsing dei
965MB si paga una volta sola, non a ogni lancio.

Ottimizzazione chiave: le RR-set (il costo dominante di SKIM) si campionano
UNA SOLA VOLTA su tutto il grafo, non una volta per ogni combinazione
topic x gruppo. Per ciascuna RR-set si registra solo quali candidati
(l'unione di tutti gli utenti more_true/more_false, poche migliaia) copre.
La selezione greedy per ogni topic/gruppo legge poi da questa cache in
memoria, senza rifare traversal sul grafo: 33 combinazioni quasi gratis dopo
il campionamento iniziale.

Uso:
    python topic_propagators.py --benchmark        # stima il costo, non lancia la pipeline
    python topic_propagators.py                     # pipeline completa (usa la cache CSR se c'e')
    python topic_propagators.py --rebuild-cache     # riparse il GEXF anche se la cache esiste
"""
from __future__ import annotations

import argparse
import heapq
import json
import pickle
import random
import sys
import time
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

import numpy as np

HERE = Path(__file__).parent
ROOT = HERE.parent
GEXF_PATH = HERE / "graph-out" / "influence_graph.gexf"
FACT_CHECK_PATH = ROOT / "fact_check_report.csv"
POST_AUTHORS_PATH = ROOT / "misinformation_impact" / "data" / "post_authors.jsonl"
ACCOUNT_CANONICAL_PATH = ROOT / "misinformation_impact" / "data" / "account_canonical.jsonl"
CSR_CACHE_PATH = HERE / "graph-out" / "reverse_csr_cache.pkl"
OUT_PATH = HERE / "Risultati_IM" / "topic_propagators.json"

K_SEED = 50
NUM_RR = 74000
RANDOM_SEED = 42


# =========================================================================== #
# 1. Streaming GEXF -> CSR inverso (predecessori), niente networkx
# =========================================================================== #
def _local_tag(elem) -> str:
    return elem.tag.rsplit("}", 1)[-1]


def _iter_gexf(path: Path):
    """Itera (tag, elem) in ordine documento. Per node/edge/attributes libera
    subito l'elemento dal genitore dopo averlo restituito: senza questo,
    ElementTree accumula comunque ~2.3M Element quasi vuoti sotto la radice
    anche con elem.clear(), perche' clear() svuota l'elemento ma non lo
    stacca dal genitore (che stdlib ET non permette di risalire)."""
    stack: list[ET.Element] = []
    for event, elem in ET.iterparse(str(path), events=("start", "end")):
        if event == "start":
            stack.append(elem)
            continue
        stack.pop()
        tag = _local_tag(elem)
        yield tag, elem
        if tag in ("node", "edge", "attributes"):
            elem.clear()
            if stack:
                stack[-1].remove(elem)


def build_reverse_csr(gexf_path: Path) -> dict:
    node_attr_by_id: dict[str, str] = {}
    edge_attr_by_id: dict[str, str] = {}

    node_ids: list[str] = []
    id_to_idx: dict[str, int] = {}
    acct: list[str] = []
    followers: list[int] = []
    bot: list[bool] = []
    topics: list[frozenset] = []

    src_list: list[int] = []
    dst_list: list[int] = []
    p_list: list[float] = []

    n_nodes = n_edges = 0
    t0 = time.time()
    for tag, elem in _iter_gexf(gexf_path):
        if tag == "attributes":
            cls = elem.get("class")
            target_map = node_attr_by_id if cls == "node" else edge_attr_by_id
            for child in elem:
                if _local_tag(child) == "attribute":
                    target_map[child.get("id")] = child.get("title")

        elif tag == "node":
            nid = elem.get("id")
            idx = len(node_ids)
            id_to_idx[nid] = idx
            node_ids.append(nid)
            a, f, b, t = "", 0, False, frozenset()
            for av in elem.iter():
                if _local_tag(av) != "attvalue":
                    continue
                name = node_attr_by_id.get(av.get("for"))
                val = av.get("value")
                if name == "acct":
                    a = val or ""
                elif name == "followers":
                    try:
                        f = int(float(val))
                    except (TypeError, ValueError):
                        f = 0
                elif name == "bot":
                    b = str(val).strip().lower() == "true"
                elif name == "topics" and val:
                    t = frozenset(val.split(","))
            acct.append(a)
            followers.append(f)
            bot.append(b)
            topics.append(t)
            n_nodes += 1
            if n_nodes % 50000 == 0:
                print(f"  nodi letti: {n_nodes}  ({time.time()-t0:.0f}s)", file=sys.stderr)

        elif tag == "edge":
            src = id_to_idx.get(elem.get("source"))
            dst = id_to_idx.get(elem.get("target"))
            p = None
            for av in elem.iter():
                if _local_tag(av) != "attvalue":
                    continue
                if edge_attr_by_id.get(av.get("for")) == "p_ic":
                    p = float(av.get("value"))
                    break
            if src is not None and dst is not None and p is not None and p > 0.0:
                src_list.append(src)
                dst_list.append(dst)
                p_list.append(p)
                n_edges += 1
            if n_edges % 500000 == 0 and n_edges > 0:
                print(f"  archi letti: {n_edges}  ({time.time()-t0:.0f}s)", file=sys.stderr)

    print(f"[gexf] nodi={n_nodes} archi={n_edges} parsing={time.time()-t0:.1f}s", file=sys.stderr)

    n = len(node_ids)
    src_arr = np.asarray(src_list, dtype=np.int32)
    dst_arr = np.asarray(dst_list, dtype=np.int32)
    p_arr = np.asarray(p_list, dtype=np.float32)
    del src_list, dst_list, p_list

    # CSR indicizzato per TARGET (predecessori): ordina per dst.
    order = np.argsort(dst_arr, kind="stable")
    dst_sorted = dst_arr[order]
    col_idx = src_arr[order]  # predecessori, allineati a dst_sorted
    p_ic = p_arr[order]
    row_ptr = np.searchsorted(dst_sorted, np.arange(n + 1)).astype(np.int64)

    return {
        "n": n,
        "node_ids": node_ids,
        "id_to_idx": id_to_idx,
        "acct": acct,
        "acct_to_idx": {a: i for i, a in enumerate(acct) if a},
        "followers": np.asarray(followers, dtype=np.int64),
        "bot": np.asarray(bot, dtype=bool),
        "topics": topics,
        "row_ptr": row_ptr,
        "col_idx": col_idx,
        "p_ic": p_ic,
    }


def load_or_build_csr(gexf_path: Path, cache_path: Path, rebuild: bool = False) -> dict:
    if cache_path.exists() and not rebuild:
        print(f"[cache] carico {cache_path}", file=sys.stderr)
        with open(cache_path, "rb") as f:
            return pickle.load(f)
    print(f"[parsing] {gexf_path} (streaming, puo' richiedere qualche minuto)", file=sys.stderr)
    g = build_reverse_csr(gexf_path)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_path, "wb") as f:
        pickle.dump(g, f, protocol=pickle.HIGHEST_PROTOCOL)
    print(f"[cache] salvata in {cache_path}", file=sys.stderr)
    return g


# =========================================================================== #
# 2. RR-set su CSR (stessa logica di SKIM.py, dati diversi)
# =========================================================================== #
def sample_rr_set(g: dict, rng: random.Random) -> set[int]:
    row_ptr, col_idx, p_ic, n = g["row_ptr"], g["col_idx"], g["p_ic"], g["n"]
    target = rng.randrange(n)
    visited = {target}
    frontier = [target]
    while frontier:
        nxt = []
        for v in frontier:
            start, end = row_ptr[v], row_ptr[v + 1]
            for i in range(start, end):
                u = int(col_idx[i])
                if u not in visited and rng.random() < p_ic[i]:
                    visited.add(u)
                    nxt.append(u)
        frontier = nxt
    return visited


def sample_covers(g: dict, num_rr: int, track: set[int], rng: random.Random,
                   log_every: int = 500) -> dict[int, set[int]]:
    """Campiona num_rr RR-set UNA VOLTA sola; per ciascuna registra solo quali
    nodi in `track` (unione di tutti i candidati, poche migliaia) copre. Il
    costo dominante (traversal sul grafo) si paga una volta sola, non per
    ogni combinazione topic/gruppo."""
    covers: dict[int, set[int]] = defaultdict(set)
    t0 = time.time()
    for i in range(num_rr):
        rr = sample_rr_set(g, rng)
        for node in (rr & track):
            covers[node].add(i)
        if (i + 1) % log_every == 0:
            dt = time.time() - t0
            print(f"  RR-set {i+1}/{num_rr}  ({dt:.1f}s, {dt/(i+1)*1000:.1f}ms/set)", file=sys.stderr)
    return covers


# =========================================================================== #
# 3. Greedy max-coverage (lazy), identico a SKIM.py, legge da `covers` gia'
#    pronto invece di ricampionare.
# =========================================================================== #
def greedy_select(covers: dict[int, set[int]], candidates: set[int], k: int) -> list[tuple[int, int, int]]:
    """Ritorna lista di (node_idx, marginal_gain, cumulative_covered)."""
    heap = [(-len(covers[u]), u) for u in candidates if u in covers]
    heapq.heapify(heap)
    covered: set[int] = set()
    seeds: list[tuple[int, int, int]] = []
    seen: set[int] = set()
    while len(seeds) < k and heap:
        neg, u = heapq.heappop(heap)
        if u in seen:
            continue
        gain = len(covers[u] - covered)
        if heap and gain < -heap[0][0]:
            heapq.heappush(heap, (-gain, u))
            continue
        if gain == 0:
            break
        covered |= covers[u]
        seen.add(u)
        seeds.append((u, gain, len(covered)))
    return seeds


# =========================================================================== #
# 4. Gruppi vero_ai/vero_human/falso_ai/falso_human, pool candidati per topic
#
# Stessi nodi usati nel confronto di atto1 (ImpattoDis / mc_group_summary.json,
# misinformation_impact/monte_carlo_ic_group.py): il gruppo si assegna a
# livello di POST (veracity da fact_check_report.csv incrociata con
# ai_generated), poi si risale post -> account_id (post_authors.jsonl) ->
# canonical_id (account_canonical.jsonl). L'id canonico E' l'id nodo nel GEXF
# (stessa identita' usata da monte_carlo_ic_group.py: account_to_node e'
# mappa identita' su int(nid)), quindi il join con la CSR e' diretto sull'id,
# non serve passare per l'acct.
# =========================================================================== #
def veracity_group(veracity: int) -> str:
    if veracity <= 1:
        return "vero"
    if veracity == 2:
        return "misto"
    if veracity <= 4:
        return "falso"
    return "non_verificabile"


def load_group_members(g: dict, fact_check_path: Path, post_authors_path: Path,
                        account_canonical_path: Path) -> dict[str, set[int]]:
    """Un account entra in UN SOLO gruppo, per maggioranza sui suoi post
    classificati (non 'almeno un post'): altrimenti un account con anche un
    solo post fuori tema finisce in piu' gruppi contemporaneamente (verificato
    empiricamente: 432 account in comune fra vero_ai e vero_human con la
    versione 'almeno un post' -- non un errore di identita', ma un'etichetta
    per post che si sovrapponeva). Con la maggioranza i quattro gruppi sono
    mutuamente esclusivi; gli account in pareggio netto (stesso conteggio sui
    due assi) restano fuori, non classificabili onestamente."""
    id_to_idx = g["id_to_idx"]  # id nodo GEXF (stringa) -> idx, coincide con l'id account canonico

    import csv as _csv
    posts: dict[int, tuple[str, bool]] = {}
    with open(fact_check_path, encoding="utf-8", newline="") as f:
        for row in _csv.DictReader(f):
            vg = veracity_group(int(row["veracity"]))
            if vg not in ("vero", "falso"):
                continue
            posts[int(row["id"])] = (vg, row["ai_generated"].strip().lower() == "true")

    post_to_author: dict[int, int] = {}
    with open(post_authors_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                r = json.loads(line)
                post_to_author[r["post_id"]] = r["account_id"]

    canon_map: dict[int, int] = {}
    with open(account_canonical_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                r = json.loads(line)
                canon_map[r["account_id"]] = r["canonical_id"]

    # conteggi per account canonico: quanti post vero_ai/vero_human/falso_ai/falso_human
    counts: dict[int, dict[str, int]] = defaultdict(lambda: {"vero_ai": 0, "vero_human": 0,
                                                              "falso_ai": 0, "falso_human": 0})
    for pid, (vg, is_ai) in posts.items():
        account_id = post_to_author.get(pid)
        if account_id is None:
            continue
        canonical_id = canon_map.get(account_id, account_id)
        counts[canonical_id][f"{vg}_{'ai' if is_ai else 'human'}"] += 1

    group_members: dict[str, set[int]] = {
        "vero_ai": set(), "vero_human": set(), "falso_ai": set(), "falso_human": set(),
    }
    for canonical_id, c in counts.items():
        idx = id_to_idx.get(str(canonical_id))
        if idx is None:
            continue
        n_vero, n_falso = c["vero_ai"] + c["vero_human"], c["falso_ai"] + c["falso_human"]
        n_ai, n_human = c["vero_ai"] + c["falso_ai"], c["vero_human"] + c["falso_human"]
        if n_vero == n_falso or n_ai == n_human:
            continue  # pareggio netto su almeno un asse: non classificabile
        v = "vero" if n_vero > n_falso else "falso"
        a = "ai" if n_ai > n_human else "human"
        group_members[f"{v}_{a}"].add(idx)

    for label, members in group_members.items():
        print(f"  {label}: {len(members)} nodi", file=sys.stderr)
    return group_members


def build_candidate_pools(g: dict, group_members: dict[str, set[int]]):
    """Ritorna {(topic, gruppo): set[idx]} per ogni topic osservato nel grafo
    + 'generale', per 6 gruppi: info/disinfo (uniti, per il confronto
    complessivo) E i 4 sotto-gruppi vero_ai/vero_human/falso_ai/falso_human
    (per le classifiche separate AI vs umano) -- selezione greedy indipendente
    per ciascuno, non un filtro a posteriori sulla lista mista: un account
    che non entra nella top-K mista puo' comunque dominare il suo sotto-gruppo."""
    topics_by_idx = g["topics"]
    info = group_members["vero_ai"] | group_members["vero_human"]
    disinfo = group_members["falso_ai"] | group_members["falso_human"]
    pool_members = {"info": info, "disinfo": disinfo, **group_members}

    all_topics: set[str] = set()
    for t in topics_by_idx:
        all_topics |= t

    pools: dict[tuple[str, str], set[int]] = {}
    for group, members in pool_members.items():
        pools[("generale", group)] = set(members)
        for topic in all_topics:
            pools[(topic, group)] = {idx for idx in members if topic in topics_by_idx[idx]}
    return pools, pool_members


# =========================================================================== #
# 5. Benchmark: costo di UNA sola sampling pass sul grafo intero
# =========================================================================== #
def run_benchmark(g: dict, n_probe: int, num_rr: int) -> None:
    rng = random.Random(RANDOM_SEED)
    sizes: list[int] = []
    times: list[float] = []
    for _ in range(n_probe):
        t1 = time.time()
        rr = sample_rr_set(g, rng)
        times.append(time.time() - t1)
        sizes.append(len(rr))
    avg_size = sum(sizes) / n_probe
    avg_time = sum(times) / n_probe
    print(f"\n[benchmark] {n_probe} RR-set su grafo intero (n={g['n']} nodi, "
          f"{len(g['p_ic'])} archi)")
    print(f"  dimensione media RR-set: {avg_size:.1f} nodi (min {min(sizes)}, max {max(sizes)})")
    print(f"  tempo medio/RR-set: {avg_time*1000:.2f}ms")
    print(f"  stima per {num_rr} RR-set (l'UNICA sampling pass, riusata per tutte le "
          f"combinazioni topic x gruppo): {avg_time*num_rr:.1f}s (~{avg_time*num_rr/60:.1f} min)")
    print("  (la selezione greedy per ogni combinazione, dopo, e' rapida: legge da un dict "
          "gia' pronto, non rifa' traversal sul grafo)")


# =========================================================================== #
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--gexf", type=Path, default=GEXF_PATH)
    ap.add_argument("--fact-check", type=Path, default=FACT_CHECK_PATH)
    ap.add_argument("--post-authors", type=Path, default=POST_AUTHORS_PATH)
    ap.add_argument("--account-canonical", type=Path, default=ACCOUNT_CANONICAL_PATH)
    ap.add_argument("--cache", type=Path, default=CSR_CACHE_PATH)
    ap.add_argument("--out", type=Path, default=OUT_PATH)
    ap.add_argument("--k", type=int, default=K_SEED)
    ap.add_argument("--num-rr", type=int, default=NUM_RR)
    ap.add_argument("--random-seed", type=int, default=RANDOM_SEED)
    ap.add_argument("--rebuild-cache", action="store_true")
    ap.add_argument("--benchmark", action="store_true",
                     help="stima il costo e basta, non lancia la pipeline")
    ap.add_argument("--benchmark-n", type=int, default=100)
    args = ap.parse_args()

    g = load_or_build_csr(args.gexf, args.cache, rebuild=args.rebuild_cache)
    print(f"[grafo] {g['n']} nodi, {len(g['p_ic'])} archi (CSR inverso)", file=sys.stderr)

    if args.benchmark:
        run_benchmark(g, args.benchmark_n, args.num_rr)
        return

    print("[gruppi] vero_ai/vero_human/falso_ai/falso_human (stessi nodi di atto1)...",
          file=sys.stderr)
    group_members = load_group_members(g, args.fact_check, args.post_authors, args.account_canonical)

    pools, pool_members = build_candidate_pools(g, group_members)
    track = pool_members["info"] | pool_members["disinfo"]
    print(f"[candidati] info={len(pool_members['info'])} disinfo={len(pool_members['disinfo'])} "
          f"totale tracciato={len(track)}", file=sys.stderr)

    rng = random.Random(args.random_seed)
    print(f"[sampling] {args.num_rr} RR-set sul grafo intero (una volta sola)...", file=sys.stderr)
    covers = sample_covers(g, args.num_rr, track, rng)

    acct = g["acct"]
    followers = g["followers"]
    bot = g["bot"]
    ai_idx = group_members["vero_ai"] | group_members["falso_ai"]
    human_idx = group_members["vero_human"] | group_members["falso_human"]

    def _profile(idx: int) -> str:
        is_ai, is_human = idx in ai_idx, idx in human_idx
        if is_ai and is_human:
            return "misto"
        if is_ai:
            return "ai"
        if is_human:
            return "human"
        return "unknown"

    results: dict[str, dict[str, dict]] = {}
    for (topic, group), cand in sorted(pools.items()):
        seeds = greedy_select(covers, cand, args.k)

        # Conteggi su tutto il pool di candidati (non solo i seed selezionati)
        counts = {"ai": 0, "human": 0, "misto": 0, "unknown": 0,
                  "bot_tra_ai": 0, "bot_tra_umani": 0}
        for idx in cand:
            profile = _profile(idx)
            counts[profile] = counts.get(profile, 0) + 1
            is_bot = bool(bot[idx])
            if is_bot and profile == "ai":
                counts["bot_tra_ai"] += 1
            elif is_bot and profile == "human":
                counts["bot_tra_umani"] += 1

        rows = []
        for rank, (idx, marginal, cumulative) in enumerate(seeds, start=1):
            profile = _profile(idx)
            is_bot = bool(bot[idx])
            rows.append({
                "acct": acct[idx], "followers": int(followers[idx]), "rank": rank,
                "profilo": profile, "bot": is_bot,
                "marginal_rr": marginal,
                "cumulative_rr": cumulative,
            })

        entry = results.setdefault(topic, {})
        entry[group] = {"seeds": rows, "n_candidates": len(cand), "counts": counts}
        print(f"  {topic:>28} / {group:<8} candidati={len(cand):>5} -> {len(seeds)} seed",
              file=sys.stderr)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({
            "k": args.k, "num_rr": args.num_rr, "random_seed": args.random_seed,
            "n_candidates_info": len(pool_members["info"]),
            "n_candidates_disinfo": len(pool_members["disinfo"]),
            "group_sizes": {k: len(v) for k, v in group_members.items()},
            "topics": results,
        }, f, ensure_ascii=False, indent=2)
    print(f"[salvato] {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()

"""Analisi misinformation impact: confronto diffusione reale e potenziale
strutturale tra post AI vs umani, veri vs falsi.

Input (tutti presenti dopo fetch_db_data.py):
    fact_check_report.csv         — verdetti + ai_generated
    data/post_authors.jsonl       — post_id → account_id
    data/post_boosts.jsonl        — post_id → boost_count reale
    graph-out/user_graph.gexf     — grafo utente->utente

Output:
    data/impact_per_post.csv      — una riga per post, tutte le metriche
    data/impact_summary.json      — statistiche aggregate per categoria

Metriche calcolate:
  boost_count       : numero di volte che il post è stato boostato (diffusione reale)
  ic_spread_1step   : spread atteso IC a 1 passo dall'autore
                      = Σ p_ic(autore → v) per ogni vicino uscente v
                      dove p_ic(u,v) = 1 - (1 - P0)^weight(u,v)
  followers         : follower dell'autore (attributo nodo del grafo)
  out_degree        : numero di vicini uscenti dell'autore nel grafo

Categorie di analisi:
  veracity_group: "vero" (veracity 0-1) | "misto" (2) | "falso" (3-4) | "non_verificabile" (5)
  ai_generated:   true | false

Uso:
    python -m misinformation_impact.analyze
    python -m misinformation_impact.analyze --graph ../graph-out/user_graph.gexf
"""
import argparse
import csv
import json
import math
import statistics
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_DIR = Path(__file__).parent / "data"

# parametri IC (stessa calibrazione di Max_Influence/graph_builder.py)
IC_P0 = 0.05
IC_CAP = 0.999


def veracity_group(veracity: int) -> str:
    if veracity <= 1:
        return "vero"
    if veracity == 2:
        return "misto"
    if veracity <= 4:
        return "falso"
    return "non_verificabile"


def load_fact_check(path: Path) -> dict[int, dict]:
    posts = {}
    with path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            pid = int(row["id"])
            posts[pid] = {
                "verdict": row["verdict"],
                "veracity": int(row["veracity"]),
                "veracity_group": veracity_group(int(row["veracity"])),
                "confidence": row.get("confidence"),
                "ai_generated": row["ai_generated"].strip().lower() == "true",
            }
    return posts


def load_jsonl_map(path: Path, key: str, value: str) -> dict[int, int]:
    result = {}
    if not path.exists():
        return result
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                row = json.loads(line)
                result[int(row[key])] = int(row[value])
    return result


def compute_ic_spread_1step(g, node_id: str) -> float:
    """Spread atteso IC a 1 passo: somma delle p_ic sugli archi uscenti."""
    total = 0.0
    for _, _, d in g.out_edges(node_id, data=True):
        w = d.get("weight", 0)
        if w > 0:
            p = 1.0 - (1.0 - IC_P0) ** float(w)
            total += min(p, IC_CAP)
    return total


def stats(values: list[float]) -> dict:
    if not values:
        return {"n": 0, "mean": None, "median": None, "p25": None, "p75": None, "total": None}
    s = sorted(values)
    n = len(s)
    return {
        "n": n,
        "mean": round(statistics.mean(s), 4),
        "median": round(statistics.median(s), 4),
        "p25": round(s[n // 4], 4),
        "p75": round(s[3 * n // 4], 4),
        "total": round(sum(s), 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fact-check", default="../fact_check_report.csv")
    parser.add_argument("--graph", default="../Max_Influence/graph-out/influence_graph.gexf")
    args = parser.parse_args()

    fact_check_path = Path(__file__).parent / args.fact_check
    graph_path = Path(__file__).parent / args.graph

    print("Carico fact_check_report.csv...")
    posts = load_fact_check(fact_check_path)
    print(f"  {len(posts)} post")

    print("Carico post_authors.jsonl...")
    post_to_author = load_jsonl_map(DATA_DIR / "post_authors.jsonl", "post_id", "account_id")
    print(f"  {len(post_to_author)} mapping post→autore")

    print("Carico account_canonical.jsonl (canonicalization)...")
    canon_map = load_jsonl_map(DATA_DIR / "account_canonical.jsonl", "account_id", "canonical_id")
    print(f"  {len(canon_map)} account, {sum(1 for k,v in canon_map.items() if k!=v)} remappati")

    print("Carico post_boosts.jsonl...")
    post_to_boosts = load_jsonl_map(DATA_DIR / "post_boosts.jsonl", "post_id", "boost_count")
    print(f"  {len(post_to_boosts)} post con almeno 1 boost")

    print("Carico grafo GEXF (può richiedere qualche secondo)...")
    import networkx as nx
    g = nx.read_gexf(str(graph_path))
    print(f"  {g.number_of_nodes()} nodi, {g.number_of_edges()} archi")

    # indice account_id (int) → node_id (stringa nel GEXF)
    account_to_node: dict[int, str] = {}
    for nid, data in g.nodes(data=True):
        try:
            account_to_node[int(nid)] = nid
        except (ValueError, TypeError):
            pass

    print("Calcolo metriche per post...")
    rows_out = []
    for pid, pdata in posts.items():
        account_id = post_to_author.get(pid)
        boost_count = post_to_boosts.get(pid, 0)

        author_followers = None
        author_out_degree = None
        ic_spread = None

        if account_id is not None:
            canonical_id = canon_map.get(account_id, account_id)
            node_id = account_to_node.get(canonical_id)
            if node_id is not None:
                ndata = g.nodes[node_id]
                author_followers = int(ndata.get("followers", 0))
                author_out_degree = g.out_degree(node_id)
                ic_spread = round(compute_ic_spread_1step(g, node_id), 4)

        rows_out.append({
            "post_id": pid,
            "verdict": pdata["verdict"],
            "veracity": pdata["veracity"],
            "veracity_group": pdata["veracity_group"],
            "ai_generated": pdata["ai_generated"],
            "boost_count": boost_count,
            "author_id": account_id,
            "author_followers": author_followers,
            "author_out_degree": author_out_degree,
            "ic_spread_1step": ic_spread,
        })

    DATA_DIR.mkdir(exist_ok=True)
    out_csv = DATA_DIR / "impact_per_post.csv"
    fieldnames = ["post_id", "verdict", "veracity", "veracity_group", "ai_generated",
                  "boost_count", "author_id", "author_followers", "author_out_degree", "ic_spread_1step"]
    with out_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
        w.writeheader()
        w.writerows(rows_out)
    print(f"impact_per_post.csv: {len(rows_out)} righe -> {out_csv}")

    # confronto 2x2 principale: solo vero/falso × ai/human
    summary = {}
    for vg in ["vero", "falso"]:
        for ai in [True, False]:
            label = f"{vg}_{'ai' if ai else 'human'}"
            subset = [r for r in rows_out if r["veracity_group"] == vg and r["ai_generated"] == ai]
            summary[label] = {
                "n": len(subset),
                "boost_count": stats([r["boost_count"] for r in subset]),
                "ic_spread_1step": stats([r["ic_spread_1step"] for r in subset if r["ic_spread_1step"] is not None]),
                "author_followers": stats([r["author_followers"] for r in subset if r["author_followers"] is not None]),
                "author_out_degree": stats([r["author_out_degree"] for r in subset if r["author_out_degree"] is not None]),
            }

    # confronto diretto AI vs umano (solo vero/falso, collassa veracity)
    for ai in [True, False]:
        label = f"all_{'ai' if ai else 'human'}"
        subset = [r for r in rows_out if r["veracity_group"] in ("vero", "falso") and r["ai_generated"] == ai]
        summary[label] = {
            "n": len(subset),
            "boost_count": stats([r["boost_count"] for r in subset]),
            "ic_spread_1step": stats([r["ic_spread_1step"] for r in subset if r["ic_spread_1step"] is not None]),
        }

    # categorie escluse dal confronto principale (solo per completezza)
    for vg in ["misto", "non_verificabile"]:
        for ai in [True, False]:
            label = f"{vg}_{'ai' if ai else 'human'}"
            subset = [r for r in rows_out if r["veracity_group"] == vg and r["ai_generated"] == ai]
            summary[label] = {"n": len(subset), "_note": "escluso dal confronto principale"}

    out_json = DATA_DIR / "impact_summary.json"
    with out_json.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"impact_summary.json -> {out_json}")

    # stampa riepilogo rapido (solo categorie con metriche complete)
    print("\n=== RIEPILOGO ===")
    for label, s in summary.items():
        if "boost_count" not in s:
            continue
        bc = s["boost_count"]
        ic = s["ic_spread_1step"]
        print(f"{label:30s} n={s['n']:5d}  boost mediana={bc['median']}  ic_spread mediana={ic['median']}")


if __name__ == "__main__":
    main()

"""Backend per l'analisi di impatto della disinformazione.

Legge i file flat prodotti dalla pipeline misinformation_impact/:
  mc_spread.jsonl       — spread MC per singolo post (topic, group, mean/median/std)
  mc_summary.json       — aggregati per gruppo (prodotto dallo stesso script)
  mc_group_summary.json — dinamica epidemica collettiva per gruppo
  topic_list.json       — lista dei 16 topic canonici

Strategia di cache: double-checked locking, come influence.py.
Gestione file mancanti: 503 con messaggio leggibile, non 500.
"""
import json
import statistics
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from webapp.path_utils import (
    MC_SPREAD_PATH,
    MC_GROUP_SUMMARY_PATH,
    TOPIC_LIST_PATH,
    POST_BOOSTS_PATH,
)

_LOCK = threading.Lock()
_SPREAD_CACHE: Optional[Dict[str, Any]] = None
_GROUP_CACHE: Optional[Dict[str, Any]] = None
_TOPICS_CACHE: Optional[List[str]] = None
_BOOST_CACHE: Optional[Dict[str, Any]] = None


def _missing(path: Path, desc: str) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail=(
            f"{desc} non disponibile: manca {path.name}. "
            f"Esegui prima la pipeline misinformation_impact."
        ),
    )


# ── topic list ────────────────────────────────────────────────────────────────

def load_topics() -> List[str]:
    global _TOPICS_CACHE
    if _TOPICS_CACHE is not None:
        return _TOPICS_CACHE
    with _LOCK:
        if _TOPICS_CACHE is not None:
            return _TOPICS_CACHE
        if not TOPIC_LIST_PATH.exists():
            return []
        with TOPIC_LIST_PATH.open(encoding="utf-8") as f:
            _TOPICS_CACHE = json.load(f)
        return _TOPICS_CACHE


def get_topics() -> Dict[str, Any]:
    topics = load_topics()
    return {"topics": ["generale"] + topics}


# ── mc_spread.jsonl ───────────────────────────────────────────────────────────

def _load_spread_index() -> Dict[str, Any]:
    """Legge mc_spread.jsonl e costruisce indice in memoria.

    Struttura:
      _SPREAD_CACHE["by_group_topic"][(group, topic)] = [spread_mean, ...]
      _SPREAD_CACHE["by_group"]      [group]          = [spread_mean, ...]
      _SPREAD_CACHE["total"]                          = n righe lette
      _SPREAD_CACHE["partial"]                        = True se mc ancora in corso
    """
    global _SPREAD_CACHE
    if _SPREAD_CACHE is not None:
        return _SPREAD_CACHE
    with _LOCK:
        if _SPREAD_CACHE is not None:
            return _SPREAD_CACHE
        if not MC_SPREAD_PATH.exists():
            raise _missing(MC_SPREAD_PATH, "mc_spread.jsonl")

        by_group_topic: Dict[tuple, List[float]] = {}
        by_group: Dict[str, List[float]] = {}
        total = 0

        with MC_SPREAD_PATH.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                group = row.get("group", "")
                topic = row.get("topic", "")
                val = row.get("spread_mean")
                if val is None:
                    continue
                by_group_topic.setdefault((group, topic), []).append(float(val))
                by_group.setdefault(group, []).append(float(val))
                total += 1

        # Stima se ancora in corso: mc_summary.json esiste solo a fine run
        from webapp.path_utils import MC_SUMMARY_PATH
        partial = not MC_SUMMARY_PATH.exists()

        _SPREAD_CACHE = {
            "by_group_topic": {f"{g}|{t}": v for (g, t), v in by_group_topic.items()},
            "by_group": by_group,
            "total": total,
            "partial": partial,
        }
        return _SPREAD_CACHE


def _agg(vals: List[float]) -> Dict[str, Any]:
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


GROUPS = ["vero_ai", "vero_human", "falso_ai", "falso_human"]


def get_summary(topic: str = "generale") -> Dict[str, Any]:
    """Aggregati per gruppo, opzionalmente filtrati per topic."""
    idx = _load_spread_index()
    result: Dict[str, Any] = {}

    for group in GROUPS:
        if topic == "generale":
            vals = idx["by_group"].get(group, [])
        else:
            vals = idx["by_group_topic"].get(f"{group}|{topic}", [])
        result[group] = _agg(vals)

    return {
        "topic": topic,
        "partial": idx["partial"],
        "total_posts": idx["total"],
        "groups": result,
    }


# ── mc_group_summary.json ─────────────────────────────────────────────────────

def _load_group_summary() -> Dict[str, Any]:
    global _GROUP_CACHE
    if _GROUP_CACHE is not None:
        return _GROUP_CACHE
    with _LOCK:
        if _GROUP_CACHE is not None:
            return _GROUP_CACHE
        if not MC_GROUP_SUMMARY_PATH.exists():
            raise _missing(MC_GROUP_SUMMARY_PATH, "mc_group_summary.json")
        with MC_GROUP_SUMMARY_PATH.open(encoding="utf-8") as f:
            _GROUP_CACHE = json.load(f)
        return _GROUP_CACHE


def get_group_summary(topic: str = "generale") -> Dict[str, Any]:
    """Dinamica epidemica collettiva, con filtro topic se disponibile."""
    data = _load_group_summary()
    result: Dict[str, Any] = {}

    for group in GROUPS:
        gdata = data.get(group, {})
        if topic == "generale":
            entry = gdata.get("aggregate", gdata)
        else:
            by_topic = gdata.get("by_topic", {})
            entry = by_topic.get(topic)
            if entry is None:
                entry = {"n_seeds": 0, "_note": "nessun seed per questo topic"}
        result[group] = entry

    has_topic_data = any(
        "by_topic" in data.get(g, {}) for g in GROUPS
    )
    return {
        "topic": topic,
        "has_topic_breakdown": has_topic_data,
        "groups": result,
    }


# ── boost osservati ───────────────────────────────────────────────────────────

def _load_boost_index() -> Dict[str, Any]:
    """Carica mc_spread.jsonl (per group+topic per-post) e post_boosts.jsonl
    (boost reali osservati). Fa il join su post_id.
    Post in mc_spread ma assenti in post_boosts hanno boost_count=0.
    """
    global _BOOST_CACHE
    if _BOOST_CACHE is not None:
        return _BOOST_CACHE
    with _LOCK:
        if _BOOST_CACHE is not None:
            return _BOOST_CACHE
        if not MC_SPREAD_PATH.exists():
            raise _missing(MC_SPREAD_PATH, "mc_spread.jsonl")
        if not POST_BOOSTS_PATH.exists():
            raise _missing(POST_BOOSTS_PATH, "post_boosts.jsonl")

        # post_id -> boost_count
        boost_by_post: Dict[int, int] = {}
        with POST_BOOSTS_PATH.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                    boost_by_post[int(r["post_id"])] = int(r["boost_count"])
                except (KeyError, ValueError, json.JSONDecodeError):
                    continue

        # mc_spread.jsonl -> per (group, topic): lista boost_count
        by_group_topic: Dict[str, List[int]] = {}
        by_group: Dict[str, List[int]] = {}
        with MC_SPREAD_PATH.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                group = row.get("group", "")
                topic = row.get("topic", "")
                pid = row.get("post_id")
                if pid is None or not group:
                    continue
                bc = boost_by_post.get(int(pid), 0)
                key = f"{group}|{topic}"
                by_group_topic.setdefault(key, []).append(bc)
                by_group.setdefault(group, []).append(bc)

        _BOOST_CACHE = {"by_group_topic": by_group_topic, "by_group": by_group}
        return _BOOST_CACHE


def _agg_int(vals: List[int]) -> Dict[str, Any]:
    if not vals:
        return {"n": 0}
    s = sorted(vals)
    n = len(s)
    nonzero = sum(1 for v in s if v > 0)
    return {
        "n": n,
        "mean":   round(statistics.mean(s), 4),
        "median": float(statistics.median(s)),
        "std":    round(statistics.stdev(s) if n > 1 else 0.0, 4),
        "max":    s[-1],
        "boosted_pct": round(100.0 * nonzero / n, 2),
        "boosted_n": nonzero,
    }


def get_boost_summary(topic: str = "generale") -> Dict[str, Any]:
    """Boost reali osservati per gruppo, opzionalmente filtrati per topic."""
    idx = _load_boost_index()
    result: Dict[str, Any] = {}
    for group in GROUPS:
        if topic == "generale":
            vals = idx["by_group"].get(group, [])
        else:
            vals = idx["by_group_topic"].get(f"{group}|{topic}", [])
        result[group] = _agg_int(vals)
    return {"topic": topic, "groups": result}

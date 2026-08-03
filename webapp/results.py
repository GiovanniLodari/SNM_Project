import csv
import json
from pathlib import Path

# Cache in memoria per file che vengono riletti a ogni richiesta (ai_scores.jsonl,
# fact_check_report.csv, post_texts.jsonl - fino a centinaia di MB, crescono per
# append durante le pipeline in corso). Chiave = (path, extra); valore = (mtime,
# size, risultato). Un nuovo batch scritto dalla pipeline cambia mtime/size e
# invalida da solo la cache alla richiesta successiva - nessun refresh manuale,
# i numeri restano sempre aggiornati come richiesto, solo senza rileggere l'intero
# file quando non e' cambiato nulla dall'ultima richiesta.
_file_cache: dict[tuple, tuple[tuple[float, int], object]] = {}


def _cached_load(path: Path, extra_key, loader):
    if not path.exists():
        return loader()
    stat = path.stat()
    fingerprint = (stat.st_mtime, stat.st_size)
    cache_key = (path, extra_key)
    cached = _file_cache.get(cache_key)
    if cached is not None and cached[0] == fingerprint:
        return cached[1]
    result = loader()
    _file_cache[cache_key] = (fingerprint, result)
    return result


def load_ai_scores(path: Path) -> dict[int, dict]:
    """Legge ai_scores.jsonl (prodotto da fast-detect-gpt/scripts/snm_detect.py),
    indicizzato per id status. File assente = nessun risultato ancora (dict vuoto,
    non un errore: la pipeline potrebbe non essere ancora partita). Righe
    troncate/corrotte dall'ultimo flush mancato vengono ignorate, non sollevano errore."""
    def _load():
        scores = {}
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                    scores[row["id"]] = row
                except (json.JSONDecodeError, KeyError):
                    # Righe troncate/malformate da un crash/interruzione vengono ignorate
                    continue
        return scores

    return _cached_load(path, None, _load) if path.exists() else {}


def load_fact_checks(path: Path) -> dict[int, dict]:
    """Legge fact_check_report.csv (prodotto da snm.analysis.fact_check),
    indicizzato per id status. File assente = dict vuoto. Righe troncate/malformate
    dall'ultimo flush mancato vengono ignorate, non sollevano errore."""
    def _load():
        checks = {}
        with path.open("r", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                try:
                    row["veracity"] = int(row["veracity"])
                    row["confidence"] = float(row["confidence"]) if row["confidence"] else None
                    checks[int(row["id"])] = row
                except (KeyError, TypeError, ValueError):
                    # Righe troncate/malformate da un crash/interruzione vengono ignorate
                    continue
        return checks

    return _cached_load(path, None, _load) if path.exists() else {}


def count_eligible_posts(post_texts_path: Path, lang: str = "en") -> int:
    """Conta i post nel pool idoneo (stesso filtro di export_texts.py/fact_check.py:
    lingua + testo non vuoto dopo strip), per calcolare le percentuali di
    completamento delle pipeline. File assente = 0. Righe troncate vengono
    ignorate (come in load_ai_scores)."""
    def _load():
        n = 0
        with post_texts_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                    if row.get("lang") == lang and row.get("text", "").strip():
                        n += 1
                except (json.JSONDecodeError, KeyError):
                    # Righe troncate/malformate da un crash/interruzione vengono ignorate
                    continue
        return n

    return _cached_load(post_texts_path, lang, _load) if post_texts_path.exists() else 0


def ai_score_for(ai_scores: dict[int, dict], post_id: int) -> dict | None:
    entry = ai_scores.get(post_id)
    if entry is not None and entry["probability"] != entry["probability"]:  # NaN != NaN check
        return None
    return entry


def fact_check_for(fact_checks: dict[int, dict], post_id: int) -> dict | None:
    return fact_checks.get(post_id)


from collections import defaultdict


def accounts_producing_ai_content(
    ai_scores: dict[int, dict], status_to_account: dict[int, int], threshold: float = 0.5,
) -> set[int]:
    """Account la cui probabilita' IA media (sui post per cui abbiamo un
    punteggio) supera la soglia - anticipazione grezza della fase 4."""
    by_account: dict[int, list[float]] = defaultdict(list)
    for status_id, account_id in status_to_account.items():
        score = ai_scores.get(status_id)
        if score is not None and score["probability"] == score["probability"]:  # NaN != NaN check
            by_account[account_id].append(score["probability"])

    return {
        account_id for account_id, probs in by_account.items()
        if sum(probs) / len(probs) >= threshold
    }


_HISTOGRAM_BUCKETS = ["0.0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"]


def ai_probability_histogram(ai_scores: dict[int, dict]) -> dict[str, int]:
    hist = {bucket: 0 for bucket in _HISTOGRAM_BUCKETS}
    for row in ai_scores.values():
        p = row["probability"]
        # Skip NaN values (can occur if detection fails)
        if p != p:  # NaN != NaN check
            continue
        index = min(int(p * 5), 4)  # p=1.0 finisce nell'ultimo bucket, non in uno sesto
        hist[_HISTOGRAM_BUCKETS[index]] += 1
    return hist


PROBABILITY_FILTER_BUCKETS = ["0-25", "25-50", "50-75", "75-100"]


def probability_bucket_of(probability: float) -> str | None:
    """Quartile ('0-25', '25-50', '50-75', '75-100') per il filtro a
    checkbox di /ai-detection - granularita' diversa (4 bucket, non 5)
    dall'istogramma di ai_probability_histogram, sono due viste distinte.
    None per NaN (punteggio non valido, escluso da ogni filtro)."""
    if probability != probability:  # NaN != NaN check
        return None
    index = min(int(probability * 4), 3)
    return PROBABILITY_FILTER_BUCKETS[index]


def all_ai_scored_ids(ai_scores: dict[int, dict]) -> list[tuple[int, float]]:
    """Tutti gli id con punteggio IA valido (NaN escluso), ordinati per id
    crescente - per la lista completa sfogliabile in /ai-detection."""
    valid = [
        (status_id, row["probability"]) for status_id, row in ai_scores.items()
        if row["probability"] == row["probability"]
    ]
    valid.sort(key=lambda kv: kv[0])
    return valid


def verdict_counts(fact_checks: dict[int, dict]) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for row in fact_checks.values():
        counts[row["verdict"]] += 1
    return dict(counts)


def all_fact_checked_ids(fact_checks: dict[int, dict]) -> list[tuple[int, dict]]:
    """Tutti gli id fact-checkati (qualunque verdetto), ordinati per id
    crescente - per la lista completa sfogliabile in /fact-check."""
    items = list(fact_checks.items())
    items.sort(key=lambda kv: kv[0])
    return items


def status_ids_above_probability(ai_scores: dict[int, dict], threshold: float) -> set[int]:
    """Id status con probabilita' IA >= soglia (NaN esclusi, stesso criterio di ai_probability_histogram)."""
    return {
        status_id for status_id, row in ai_scores.items()
        if row["probability"] == row["probability"] and row["probability"] >= threshold
    }

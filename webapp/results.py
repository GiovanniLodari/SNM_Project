import csv
import json
import os
import threading
import time
from collections import OrderedDict
from pathlib import Path

# Cache in memoria per file che vengono riletti a ogni richiesta (ai_scores.jsonl,
# fact_check_report.csv, post_texts.jsonl - fino a centinaia di MB, crescono per
# append durante le pipeline in corso). Chiave = (path, extra); valore =
# (impronta, istante d'uso, risultato). Un nuovo batch scritto dalla pipeline
# cambia mtime/size e invalida da solo la cache alla richiesta successiva -
# nessun refresh manuale, i numeri restano sempre aggiornati come richiesto,
# solo senza rileggere l'intero file quando non e' cambiato nulla.
#
# Le voci scadono: parsati in memoria questi file pesano molto piu' che su disco
# (misurato: ai_scores.jsonl 27 MB -> ~123 MB di heap, ada_scores 29 MB -> ~245
# MB), e senza scadenza i quattro detector restavano residenti per sempre anche
# quando nessuno stava piu' guardando la pagina che li usa. Il TTL li libera
# quando si smette di consultarli; il tetto sul numero di voci e' una seconda
# rete di sicurezza. Entrambi si regolano da ambiente.
_CACHE_TTL_SECONDS = float(os.environ.get("SNM_CACHE_TTL_SECONDS", 600))
_CACHE_MAX_ENTRIES = int(os.environ.get("SNM_CACHE_MAX_ENTRIES", 6))

_file_cache: OrderedDict[tuple, tuple[tuple[float, int], float, object]] = OrderedDict()
_cache_lock = threading.Lock()


def _evict(adesso: float) -> None:
    """Rimuove le voci scadute e, se necessario, le meno usate di recente.
    Il chiamante deve gia' detenere _cache_lock."""
    scadute = [k for k, (_, ultimo_uso, _) in _file_cache.items()
               if adesso - ultimo_uso > _CACHE_TTL_SECONDS]
    for k in scadute:
        del _file_cache[k]
    while len(_file_cache) > _CACHE_MAX_ENTRIES:
        _file_cache.popitem(last=False)


def _cached_load(path: Path, extra_key, loader):
    if not path.exists():
        return loader()
    stat = path.stat()
    fingerprint = (stat.st_mtime, stat.st_size)
    cache_key = (path, extra_key)
    adesso = time.monotonic()

    with _cache_lock:
        _evict(adesso)
        cached = _file_cache.get(cache_key)
        if cached is not None and cached[0] == fingerprint:
            _file_cache[cache_key] = (fingerprint, adesso, cached[2])
            _file_cache.move_to_end(cache_key)
            return cached[2]

    # Il caricamento sta fuori dal lock: rileggere un file da centinaia di MB
    # bloccherebbe ogni altra richiesta. Due richieste in parallelo sullo stesso
    # file possono caricarlo entrambe - spreco raro e innocuo, il risultato e'
    # identico e l'ultimo che scrive vince.
    result = loader()

    with _cache_lock:
        _file_cache[cache_key] = (fingerprint, time.monotonic(), result)
        _file_cache.move_to_end(cache_key)
        _evict(time.monotonic())
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


def normalize_verdict(verdict: str) -> str:
    v = (verdict or "").strip().lower()
    if v in ("vero", "vera", "veri"):
        return "vero"
    if v in ("falso", "falsa", "falsi"):
        return "falso"
    return v


def load_fact_checks(path: Path) -> dict[int, dict]:
    """Legge fact_check_report.csv (prodotto da snm.analysis.fact_check),
    indicizzato per id status. File assente = dict vuoto. Righe troncate/malformate
    dall'ultimo flush mancato vengono ignorate, non sollevano errore."""
    def _load():
        checks = {}
        with path.open("r", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                try:
                    row["verdict"] = normalize_verdict(row.get("verdict", ""))
                    row["veracity"] = int(row["veracity"]) if row.get("veracity") is not None else 5
                    row["confidence"] = float(row["confidence"]) if row.get("confidence") else None
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


def count_checkworthy_eligible_posts(
    post_texts_path: Path, checkworthy_path: Path, lang: str = "en",
) -> int:
    """Denominatore corretto per la % di completamento del fact-check: post
    idonei (lingua + testo non vuoto) CHE SONO ANCHE checkworthy=true nella
    cache di run_checkworthiness.py. count_eligible_posts da sola sottostima
    grossolanamente la % completata, perche' il checkworthiness scarta circa
    l'80% dei post idonei come non verificabili (opinioni) - fact_check.py
    non li processa mai, quindi non vanno nel denominatore. File cache
    assente = 0 (checkworthiness non ancora eseguito)."""
    if not checkworthy_path.exists():
        return count_eligible_posts(post_texts_path, lang=lang)

    def _load():
        eligible_ids: set[int] = set()
        with post_texts_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                    if row.get("lang") == lang and row.get("text", "").strip():
                        eligible_ids.add(row["id"])
                except (json.JSONDecodeError, KeyError):
                    continue

        n = 0
        with checkworthy_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                    if row.get("checkworthy") and row["id"] in eligible_ids:
                        n += 1
                except (json.JSONDecodeError, KeyError):
                    continue
        return n

    return _cached_load(checkworthy_path, ("checkworthy_eligible", lang), _load)


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


def sample_posts_by_probability_bucket(
    ai_scores: dict[int, dict], conn, samples_per_bucket: int = 100
) -> dict[str, list[dict]]:
    """Raggruppa gli status id nei 5 scaglioni dell'istogramma e seleziona fino a N
    post rappresentativi per ciascuno scaglione con la relativa probabilita'."""
    from webapp import queries

    buckets_status_ids: dict[str, list[tuple[int, float]]] = {b: [] for b in _HISTOGRAM_BUCKETS}

    for status_id, row in ai_scores.items():
        p = row.get("probability")
        if p is None or p != p:  # NaN check
            continue
        idx = min(int(p * 5), 4)
        b_name = _HISTOGRAM_BUCKETS[idx]
        buckets_status_ids[b_name].append((status_id, float(p)))

    # Per ogni bucket, prendiamo fino a samples_per_bucket status_id distribuiti in modo uniforme o casuale/ordinato
    all_needed_ids = set()
    sampled_ids_per_bucket = {}

    for b_name, items in buckets_status_ids.items():
        if not items:
            sampled_ids_per_bucket[b_name] = []
            continue
        # Ordiniamo per id per avere risultati deterministici
        items.sort(key=lambda x: x[0])
        # Campionamento a passo regolare se gli elementi sono piu' del limite
        if len(items) <= samples_per_bucket:
            selected = items
        else:
            step = len(items) / samples_per_bucket
            selected = [items[int(i * step)] for i in range(samples_per_bucket)]

        sampled_ids_per_bucket[b_name] = selected
    
    # Raccogliamo tutti gli id necessari DOPO aver costruito sampled_ids_per_bucket
    for b_items in sampled_ids_per_bucket.values():
        for sid, _ in b_items:
            all_needed_ids.add(sid)
    
    posts_by_id = queries.get_posts_by_ids(conn, list(all_needed_ids))

    result = {}
    for b_name, selected in sampled_ids_per_bucket.items():
        result[b_name] = [
            {"post": posts_by_id[sid], "probability": prob}
            for sid, prob in selected
            if sid in posts_by_id
        ]

    return result


def get_descriptive_stats(ai_scores: dict[int, dict], conn) -> dict:

    """Calcola statistiche descrittive avanzate sul dataset ai_scores e sui post associati:
    - Media, mediana, min, max della probabilita' e del criterio
    - Distribuzione per curva Gaussiana/KDE
    - Lunghezza media e mediana dei post (in caratteri e token)
    - Statistiche account (data iscrizione media/min/max, % bot, top account creatori)
    - Istogramma fine a 10 bucket per la curva di distribuzione
    """
    from webapp import queries

    valid_scores = [
        row for row in ai_scores.values()
        if row.get("probability") is not None and row["probability"] == row["probability"]
    ]

    if not valid_scores:
        return {}

    probs = [float(r["probability"]) for r in valid_scores]
    criteria = [float(r["criterion"]) for r in valid_scores if r.get("criterion") is not None and r["criterion"] == r["criterion"]]
    ntokens_list = [int(r["ntokens"]) for r in valid_scores if r.get("ntokens") is not None]

    probs.sort()
    n = len(probs)
    mean_prob = sum(probs) / n
    median_prob = probs[n // 2] if n % 2 != 0 else (probs[n // 2 - 1] + probs[n // 2]) / 2.0
    min_prob = probs[0]
    max_prob = probs[-1]

    # Variance and StdDev
    variance_prob = sum((p - mean_prob) ** 2 for p in probs) / n
    std_prob = variance_prob ** 0.5

    # 10-bucket fine distribution curve
    fine_buckets = [f"{i*10}-{(i+1)*10}%" for i in range(10)]
    fine_counts = [0] * 10
    for p in probs:
        idx = min(int(p * 10), 9)
        fine_counts[idx] += 1

    distribution_curve = [
        {"bucket": fine_buckets[i], "count": fine_counts[i], "percentage": round((fine_counts[i] / n) * 100, 1)}
        for i in range(10)
    ]

    # Criteria stats
    criteria_stats = {}
    if criteria:
        criteria.sort()
        nc = len(criteria)
        mean_crit = sum(criteria) / nc
        median_crit = criteria[nc // 2]
        criteria_stats = {
            "mean": round(mean_crit, 4),
            "median": round(median_crit, 4),
            "min": round(criteria[0], 4),
            "max": round(criteria[-1], 4),
        }

    # Uniform step sampling of 1000 status IDs across the full dataset
    if len(valid_scores) <= 1000:
        sample_scores = valid_scores
    else:
        step = len(valid_scores) / 1000.0
        sample_scores = [valid_scores[int(i * step)] for i in range(1000)]

    sample_status_ids = [r["id"] for r in sample_scores]
    posts_by_id = queries.get_posts_by_ids(conn, sample_status_ids)

    lengths = [len(p["content"]) for p in posts_by_id.values() if p.get("content")]
    avg_char_length = round(sum(lengths) / len(lengths), 1) if lengths else 0
    median_char_length = sorted(lengths)[len(lengths) // 2] if lengths else 0

    if ntokens_list and (sum(ntokens_list) / len(ntokens_list)) > 5:
        avg_tokens = round(sum(ntokens_list) / len(ntokens_list), 1)
    else:
        avg_tokens = round(avg_char_length / 4.2) if avg_char_length else 0

    # Account bot breakdown & top domains derived from uniform sample and scaled to total analyzed (n)
    sample_total = max(1, len(posts_by_id))
    bot_counts = {True: 0, False: 0}
    domain_counts: dict[str, int] = defaultdict(int)
    for p in posts_by_id.values():
        if p.get("bot") is not None:
            bot_counts[bool(p["bot"])] += 1
        if p.get("domain"):
            domain_counts[p["domain"]] += 1

    bot_pct = bot_counts.get(True, 0) / sample_total
    est_bots = int(round(bot_pct * n))
    est_humans = n - est_bots

    sorted_domains = sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    top_domains = [
        {"domain": dom, "count": int(round((cnt / sample_total) * n))}
        for dom, cnt in sorted_domains
    ]

    return {
        "total_analyzed": n,
        "probability": {
            "mean": round(mean_prob * 100, 2),
            "median": round(median_prob * 100, 2),
            "std": round(std_prob * 100, 2),
            "min": round(min_prob * 100, 2),
            "max": round(max_prob * 100, 2),
        },
        "criteria": criteria_stats,
        "distribution_curve": distribution_curve,
        "text_length": {
            "avg_chars": avg_char_length,
            "median_chars": median_char_length,
            "avg_tokens": avg_tokens,
        },
        "bot_breakdown": {
            "bots": est_bots,
            "humans": est_humans,
            "bot_percentage": round(bot_pct * 100, 1),
        },
        "top_domains": top_domains,
    }




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


def compute_four_detector_comparison(
    fastdetect_scores: dict[int, dict],
    bino_scores: dict[int, dict],
    desklib_scores: dict[int, dict],
    ada_scores: dict[int, dict],
) -> dict:
    """Calcola in modo dinamico e completo il confronto tra tutti e 4 i modelli
    (FastDetectGPT, Binoculars, Desklib, AdaDetectGPT): consenso a 4 vie, accordi per coppia e copertura."""
    thr = 0.5
    all_ids = set(fastdetect_scores.keys()) | set(bino_scores.keys()) | set(desklib_scores.keys()) | set(ada_scores.keys())

    ai_hist = {4: 0, 3: 0, 2: 0, 1: 0, 0: 0}
    pair_agreement = {
        "bino-gpt": 0,
        "bino-desk": 0,
        "bino-ada": 0,
        "desk-gpt": 0,
        "desk-ada": 0,
        "gpt-ada": 0,
    }
    considered_full = 0
    full_agree = 0

    for _id in all_ids:
        fd_row = fastdetect_scores.get(_id)
        fd_p = fd_row["probability"] if (fd_row and fd_row.get("probability") is not None and fd_row["probability"] == fd_row["probability"]) else None

        bino_row = bino_scores.get(_id)
        bpct = bino_row.get("ai_probability_pct") if bino_row else None
        bino_p = (bpct / 100.0) if bpct is not None else None

        desk_row = desklib_scores.get(_id)
        dp = desk_row.get("ai_probability") if desk_row else None
        desk_p = float(dp) if (dp is not None and dp == dp) else None

        ada_row = ada_scores.get(_id)
        ap = ada_row.get("probability") if ada_row else None
        ada_p = float(ap) if (ap is not None and ap == ap) else None

        lab = {
            "gpt": (fd_p >= thr) if fd_p is not None else None,
            "bino": (bino_p >= thr) if bino_p is not None else None,
            "desk": (desk_p >= thr) if desk_p is not None else None,
            "ada": (ada_p >= thr) if ada_p is not None else None,
        }

        present = {k: v for k, v in lab.items() if v is not None}
        if present:
            ai_votes = sum(1 for v in present.values() if v)
            ai_hist[ai_votes] += 1

        pairs = [
            ("bino", "gpt", "bino-gpt"),
            ("bino", "desk", "bino-desk"),
            ("bino", "ada", "bino-ada"),
            ("desk", "gpt", "desk-gpt"),
            ("desk", "ada", "desk-ada"),
            ("gpt", "ada", "gpt-ada"),
        ]
        for m1, m2, key in pairs:
            if lab[m1] is not None and lab[m2] is not None and lab[m1] == lab[m2]:
                pair_agreement[key] += 1

        if len(present) == 4:
            considered_full += 1
            if len(set(present.values())) == 1:
                full_agree += 1

    return {
        "soglia_ai": thr,
        "id_totali": len(all_ids),
        "id_presenti_in_tutti_e_4": considered_full,
        "conteggio_ai": {
            "ai_per_tutti_e_4": ai_hist.get(4, 0),
            "ai_per_esattamente_3": ai_hist.get(3, 0),
            "ai_per_esattamente_2": ai_hist.get(2, 0),
            "ai_per_esattamente_1": ai_hist.get(1, 0),
            "ai_per_nessuno": ai_hist.get(0, 0),
        },
        "accordo": {
            "tutti_e_4_stessa_etichetta": full_agree,
            "coppie": pair_agreement,
        },
        "copertura": {
            "fastdetectgpt": len(fastdetect_scores),
            "binoculars": len(bino_scores),
            "desklib": len(desklib_scores),
            "adadetectgpt": len(ada_scores),
        },
    }





def load_binoculars_report(base_dir: Path) -> dict:
    report_file = base_dir / "ai_detection_report.json"
    if not report_file.exists():
        return {}
    def _load():
        with report_file.open("r", encoding="utf-8") as f:
            return json.load(f)
    return _cached_load(report_file, "binoculars_report", _load)


def load_binoculars_scores(path: Path) -> dict[int, dict]:
    if not path.exists():
        return {}
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
                    continue
        return scores
    return _cached_load(path, "binoculars_scores", _load)


def load_desklib_scores(path: Path) -> dict[int, dict]:
    if not path.exists():
        return {}
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
                    continue
        return scores
    return _cached_load(path, "desklib_scores", _load)


def load_ada_scores(path: Path) -> dict[int, dict]:
    """Legge ai_scores_ada_local.jsonl (AdaDetectGPT Local), indicizzato per id status.
    Gestisce NaN e righe malformate senza sollevare errori."""
    if not path.exists():
        return {}
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
                    continue
        return scores
    return _cached_load(path, "ada_scores", _load)



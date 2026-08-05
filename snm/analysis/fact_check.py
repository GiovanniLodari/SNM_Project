# fact_check.py
"""Fact-checking (fase 2, fase di valutazione): per ogni post nel JSONL
prodotto da export_texts.py (lo stesso usato per l'AI detection), cerca
evidenza (ddgs + Wikipedia + opzionale Google Fact Check Tools, tutti
gratuiti) e chiede a un modello Ollama Cloud un verdetto strutturato.
Scrive un report CSV - NESSUNA scrittura nel database in questa fase.

Il post breve tipico di Mastodon viene trattato come UN'unica affermazione
da verificare (niente scomposizione in sotto-claim: inutile su testi di
poche righe).

Nessun modello neurale locale: solo chiamate HTTP (ricerca web + Ollama
Cloud), quindi gira in parallelo su thread (un worker per chiave Ollama di
default) - il collo di bottiglia reale non e' CPU/GPU ma il numero di
richieste concorrenti che le chiavi Ollama reggono. Resumibile: un rerun con
lo stesso --output riparte dai soli id non ancora presenti nel CSV.

Chiavi richieste in .env:
    OLLAMA_API_KEY / OLLAMA_API_KEY_1..N  obbligatoria (una o piu', ognuna
                                            gestisce le sue richieste in
                                            parallelo; se una risponde 429
                                            (quota esaurita) viene rimossa
                                            dal pool condiviso, le altre
                                            proseguono)
    GOOGLE_FACTCHECK_API_KEY               opzionale (pre-check contro
                                            fact-check gia' pubblicati)

Uso:
    python -m snm.analysis.fact_check --input post_texts.jsonl --output fact_check_report.csv
    python -m snm.analysis.fact_check --input post_texts.jsonl --output report.csv --limit 50  # test rapido
    python -m snm.analysis.fact_check --input post_texts.jsonl --output report.csv --workers 5  # meno parallelismo
"""
import argparse
import csv
import json
import logging
import os
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from dotenv import load_dotenv

from snm.analysis.checkworthiness import DEFAULT_THRESHOLD as DEFAULT_CHECKWORTHINESS_THRESHOLD

load_dotenv()

logger = logging.getLogger(__name__)

OLLAMA_CHAT_URL = "https://ollama.com/api/chat"
WIKIPEDIA_SEARCH_URL = "https://en.wikipedia.org/w/api.php"
# Rate limit Wikimedia per client anonimo (mediawiki.org/wiki/Wikimedia_APIs/Rate_limits):
# SENZA User-Agent con contatto reale, 10 richieste/min; CON un User-Agent
# conforme (contatto verificabile: email o URL), 200 richieste/min - 20x. La
# causa dei 429 misurati empiricamente era proprio uno User-Agent generico
# senza contatto, non un limite intrinseco della ricerca. A 200/min il ritmo
# della pipeline (dominato da Ollama, ~1-3 post/s con 10 worker) non lo satura
# piu' - il rate limiter e circuit breaker sotto restano come rete di
# sicurezza, non piu' come strategia principale.
WIKIPEDIA_USER_AGENT = "SNM-Project-FactCheck/1.0 (giovanni.lodari@gmail.com) requests/2.x"
GOOGLE_FACTCHECK_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"

# scala di veridicita': valori bassi = vero, alti = falso.
VERACITY_SCALE = {
    "vero": 0,
    "perlopiù vero": 1,
    "perlopiu' vero": 1,
    "misto": 2,
    "incerto": 2,
    "perlopiù falso": 3,
    "perlopiu' falso": 3,
    "falso": 4,
    "non verificabile": 5,
}

FACT_CHECK_PROMPT = """Sei un fact-checker. Data un'affermazione estratta da un post social pubblicato il {created_at} e alcune fonti trovate online, valuta la sua veridicità basandoti SOLO sulle fonti fornite.

IMPORTANTE: valuta la veridicità dell'affermazione al momento della sua pubblicazione ({created_at}), non ad oggi. Se l'affermazione descrive un evento in corso (es. un punteggio parziale, uno stato temporaneo) e le fonti si riferiscono a un esito successivo o finale, NON considerarla falsa solo per la differenza temporale: valutala "vero" se era accurata al momento della pubblicazione, "non verificabile" se le fonti non permettono di determinarlo a quella data.

Se le fonti non bastano, usa "non verificabile".

Affermazione: "{text}"

Fonti trovate:
{evidence_block}

Rispondi SOLO con un JSON valido, nessun testo extra, in questo formato esatto:
{{"verdict": "vero|perlopiù vero|misto|perlopiù falso|falso|non verificabile", "confidence": 0.0-1.0, "reasoning": "motivazione breve in italiano, 1-2 frasi"}}"""


def load_texts(input_path: Path, lang: str, limit: int | None) -> list[dict]:
    """Legge il JSONL prodotto da export_texts.py (id, lang, text, created_at) - lo
    stesso file usato per l'AI detection."""
    rows = []
    with input_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if lang and row.get("lang") != lang:
                continue
            if not row.get("text", "").strip():
                continue
            rows.append(row)
            if limit and len(rows) >= limit:
                break
    return rows


# Tutti i motori testuali di ddgs 9.14.4 tranne "wikipedia": Wikipedia ha
# gia' la nostra search_wikipedia dedicata (circuit breaker + UA conforme,
# 200 req/min); lasciarla anche dentro ddgs "auto" la interroga una seconda
# volta in modo scoordinato, senza guadagnare evidenza aggiuntiva. Elenco
# esplicito perche' il parametro `backend` di ddgs non supporta una sintassi
# "escludi X" (solo elenco comma-separated positivo) - verificato su
# ddgs.engines.ENGINES["text"].keys(), da aggiornare se una futura versione
# di ddgs aggiunge/rimuove motori testuali.
DDG_BACKENDS = "duckduckgo,yahoo,startpage,brave,mojeek,yandex,google,grokipedia"


def search_ddg(query: str, max_results: int = 5) -> list[dict]:
    """Ricerca web gratuita via metasearch (ddgs, nessuna chiave).

    Prova piu' motori insieme (vedi DDG_BACKENDS) e usa chi risponde per
    primo - verificato empiricamente (2026-08-03) che pinnare un singolo
    motore (es. solo "duckduckgo") fallisce piu' spesso: la ridondanza
    multi-motore e' cio' che tiene la ricerca in piedi quando un singolo
    servizio e' bloccato/lento, non il problema. I "RequestError"/timeout
    osservati sotto carico concorrente (piu' fact-check in parallelo,
    ognuno con la propria ricerca multi-motore) sono blip transitori quando
    *tutti* i motori sono lenti/bloccati insieme; un retry con breve attesa
    assorbe la maggior parte di questi casi senza reinsistere
    indefinitamente. Documentazione ufficiale ddgs non offre altra opzione
    anti-rate-limit oltre a backend/timeout, salvo la cache DHT peer-to-peer
    (BETA, nuova dipendenza `ddgs[api]`, condivide le query in modo anonimo
    con altri utenti ddgs) - non adottata qui."""
    from ddgs import DDGS

    for attempt in range(2):
        try:
            with DDGS(timeout=8) as ddgs:
                results = list(ddgs.text(query, max_results=max_results, backend=DDG_BACKENDS))
            return [
                {"title": r.get("title"), "url": r.get("href"), "snippet": r.get("body")}
                for r in results
            ]
        except Exception as exc:
            if attempt == 0:
                time.sleep(1.0)
                continue
            logger.warning("ricerca DuckDuckGo fallita: %s", exc)
            return []


# L'API di ricerca Wikipedia ha un rate-limit per IP piu' stretto di DDG/
# Ollama e a FINESTRA, non a burst: misurato empiricamente che regge solo
# ~10-12 richieste (anche serializzate a 1.5s l'una dall'altra) prima di
# rispondere 429 a tutte le successive; il blocco poi si risolve da solo
# dopo un po' (non e' permanente). Wikipedia e' una fonte voluta (non va
# disabilitata) ma non possiamo far bloccare i worker in attesa - sarebbe
# lei il collo di bottiglia di tutta la pipeline, non Ollama. Soluzione:
# circuit breaker adattivo, condiviso fra i thread. Un 429 mette Wikipedia
# in pausa per un cooldown (rispetta Retry-After se il server lo manda,
# altrimenti una stima) - durante la pausa i worker saltano la chiamata
# all'istante (nessuna attesa, resta l'evidenza DDG); passato il cooldown si
# ritenta da soli, senza intervento manuale.
_WIKIPEDIA_LOCK = threading.Lock()
_WIKIPEDIA_MIN_INTERVAL = 0.35  # 200/min documentati con UA conforme, margine sotto 0.3s/richiesta
_WIKIPEDIA_DEFAULT_COOLDOWN = 60.0  # se il 429 non manda Retry-After
_last_wikipedia_call = 0.0
_wikipedia_paused_until = 0.0


def search_wikipedia(query: str, max_results: int = 3) -> list[dict]:
    """Ricerca gratuita su Wikipedia (nessuna chiave, User-Agent richiesto da policy Wikimedia).
    Rate-limited e con circuit breaker fra i thread worker: vedi nota sopra."""
    global _last_wikipedia_call, _wikipedia_paused_until
    now = time.time()
    with _WIKIPEDIA_LOCK:
        if now < _wikipedia_paused_until or now - _last_wikipedia_call < _WIKIPEDIA_MIN_INTERVAL:
            return []  # in cooldown o slot occupato, salto Wikipedia per questo post
        _last_wikipedia_call = now
    try:
        response = requests.get(
            WIKIPEDIA_SEARCH_URL,
            params={
                "action": "query", "list": "search", "srsearch": query,
                "format": "json", "srlimit": max_results,
            },
            headers={"User-Agent": WIKIPEDIA_USER_AGENT},
            timeout=15,
        )
        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After")
            cooldown = float(retry_after) if retry_after and retry_after.isdigit() else _WIKIPEDIA_DEFAULT_COOLDOWN
            with _WIKIPEDIA_LOCK:
                _wikipedia_paused_until = max(_wikipedia_paused_until, time.time() + cooldown)
            logger.warning("Wikipedia in cooldown per %.0fs (429)", cooldown)
            return []
        response.raise_for_status()
        hits = response.json().get("query", {}).get("search", [])
        return [
            {
                "title": h["title"],
                "url": f"https://en.wikipedia.org/wiki/{h['title'].replace(' ', '_')}",
                "snippet": re.sub(r"<[^>]+>", "", h.get("snippet", "")),
            }
            for h in hits
        ]
    except Exception as exc:
        logger.warning("ricerca Wikipedia fallita: %s", exc)
        return []


def search_google_factcheck(query: str, api_key: str, max_results: int = 3) -> list[dict]:
    """Claim gia' verificati da fact-checker professionisti (PolitiFact,
    Snopes, ecc. via schema ClaimReview). Gratuita, richiede solo una API
    key Google (Fact Check Tools API, distinta dalla Custom Search a pagamento)."""
    try:
        response = requests.get(
            GOOGLE_FACTCHECK_URL,
            params={"query": query, "key": api_key, "languageCode": "en"},
            timeout=15,
        )
        response.raise_for_status()
        claims = response.json().get("claims", [])[:max_results]
        results = []
        for claim in claims:
            for review in claim.get("claimReview", []):
                publisher = review.get("publisher", {}).get("name", "?")
                results.append({
                    "title": claim.get("text", ""),
                    "url": review.get("url"),
                    "snippet": f"{publisher}: {review.get('textualRating', '?')}",
                })
        return results
    except Exception as exc:
        logger.warning("ricerca Google Fact Check fallita: %s", exc)
        return []


def call_ollama(text: str, created_at: str | None, evidence: list[dict], model: str, api_key: str) -> dict:
    evidence_block = "\n".join(
        f"- {e['title']}: {e['snippet']} ({e['url']})" for e in evidence
    ) or "(nessuna fonte trovata)"
    date_str = created_at if created_at else "data sconosciuta"
    prompt = FACT_CHECK_PROMPT.format(text=text, created_at=date_str, evidence_block=evidence_block)
    response = requests.post(
        OLLAMA_CHAT_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "format": "json",
            "stream": False,
        },
        timeout=120,
    )
    response.raise_for_status()
    content = response.json()["message"]["content"]
    return json.loads(content)


def load_ollama_keys() -> list[str]:
    """Chiavi Ollama Cloud da .env: supporta sia OLLAMA_API_KEY singola sia
    OLLAMA_API_KEY_1..N (rotazione automatica quando una esaurisce la quota).
    Se entrambe presenti, la singola viene provata per prima."""
    keys = []
    single = os.environ.get("OLLAMA_API_KEY")
    if single:
        keys.append(single)
    i = 1
    while True:
        key = os.environ.get(f"OLLAMA_API_KEY_{i}")
        if not key:
            break
        keys.append(key)
        i += 1
    if not keys:
        raise RuntimeError(
            "Nessuna chiave Ollama trovata: imposta OLLAMA_API_KEY o OLLAMA_API_KEY_1..N in .env"
        )
    return keys


class OllamaKeyPool:
    """Pool di chiavi Ollama Cloud condiviso fra thread worker: ogni chiamata
    prende la prossima chiave viva a round-robin (lock solo per l'estrazione,
    la chiamata HTTP vera e propria gira fuori dal lock cosi' i worker non si
    bloccano a vicenda). Se una chiave risponde 429 (quota esaurita) viene
    rimossa dal pool condiviso - nessun altro worker la ritentera'. Altri
    errori (400, 5xx, rete) propagano subito: cambiare chiave non li risolve."""

    def __init__(self, keys: list[str]):
        self._lock = threading.Lock()
        self._keys = list(keys)
        self.total = len(keys)
        self._next = 0

    def call(self, text: str, created_at: str | None, evidence: list[dict], model: str) -> dict:
        last_exc = None
        while True:
            with self._lock:
                if not self._keys:
                    raise RuntimeError(f"Tutte le {self.total} chiavi Ollama esaurite") from last_exc
                key = self._keys[self._next % len(self._keys)]
                self._next += 1
            try:
                return call_ollama(text, created_at, evidence, model, key)
            except requests.exceptions.HTTPError as exc:
                if getattr(exc.response, "status_code", None) != 429:
                    raise
                with self._lock:
                    if key in self._keys:
                        self._keys.remove(key)
                        logger.warning(
                            "Chiave Ollama esaurita (429), rimangono %d/%d",
                            len(self._keys), self.total,
                        )
                last_exc = exc


def fact_check_one(text: str, created_at: str | None, model: str, key_pool: OllamaKeyPool, factcheck_key: str | None) -> dict:
    """Cerca evidenza, chiede il verdetto a Ollama. Ritorna il risultato
    (verdict, veracity, confidence, reasoning, evidence) senza scrivere nulla.
    Chiamabile in parallelo da piu' thread (ogni chiamata e' indipendente,
    key_pool e' l'unico stato condiviso ed e' gia' thread-safe)."""
    query = " ".join(text.split()[:30])
    evidence = search_ddg(query) + search_wikipedia(query)
    if factcheck_key:
        evidence = search_google_factcheck(query, factcheck_key) + evidence

    result = key_pool.call(text, created_at, evidence, model)
    verdict = str(result.get("verdict", "")).strip().lower()
    return {
        "verdict": result.get("verdict", ""),
        "veracity": VERACITY_SCALE.get(verdict, 5),  # sconosciuto -> non verificabile
        "confidence": result.get("confidence"),
        "reasoning": result.get("reasoning"),
        "evidence": evidence,
    }


def load_checkworthy_ids(path: Path, threshold: float) -> set[int]:
    """Legge la cache prodotta da run_checkworthiness.py (id->punteggio) e
    ritorna gli id che superano la soglia. Separata dal filtro inline
    precedente: il punteggio e' deterministico (stesso testo -> stesso
    punteggio sempre), quindi va calcolato una volta sola (run_checkworthiness.py,
    resumabile) invece che ricalcolato ad ogni riavvio di questa pipeline."""
    ids: set[int] = set()
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("score", 0) > threshold:
                ids.add(row["id"])
    return ids


def load_done_ids_csv(path: Path) -> set[int]:
    """Id gia' presenti in un report CSV di un run precedente (resume dopo
    crash/interruzione). Righe troncate/malformate dall'ultimo flush mancato
    vengono ignorate, non sollevano errore."""
    done: set[int] = set()
    if not path.exists():
        return done
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                done.add(int(row["id"]))
            except (KeyError, TypeError, ValueError):
                continue
    return done


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=str, required=True, help="JSONL prodotto da export_texts.py")
    parser.add_argument("--output", type=str, required=True, help="report CSV di output")
    parser.add_argument(
        "--checkworthy-cache", type=str, default="checkworthy_scores.jsonl",
        help="cache prodotta da run_checkworthiness.py (id->punteggio verificabilita')",
    )
    parser.add_argument("--lang", type=str, default="en", help="filtra per lingua (campo 'lang'), vuoto = tutte")
    parser.add_argument("--limit", type=int, default=None, help="numero massimo di post (test rapido)")
    parser.add_argument("--model", type=str, default="gpt-oss:20b", help="modello Ollama Cloud")
    parser.add_argument(
        "--workers", type=int, default=None,
        help="thread paralleli (default: una per chiave Ollama disponibile)",
    )
    args = parser.parse_args()

    key_pool = OllamaKeyPool(load_ollama_keys())
    factcheck_key = os.environ.get("GOOGLE_FACTCHECK_API_KEY")
    workers = args.workers or key_pool.total

    out_path = Path(args.output)
    done_ids = load_done_ids_csv(out_path)

    checkworthy_cache_path = Path(args.checkworthy_cache)
    if not checkworthy_cache_path.exists():
        print(
            f"cache checkworthiness mancante: {checkworthy_cache_path}\n"
            "esegui prima: python -m snm.analysis.run_checkworthiness "
            f"--input {args.input} --output {checkworthy_cache_path}",
            file=sys.stderr,
        )
        sys.exit(1)
    checkworthy_ids = load_checkworthy_ids(checkworthy_cache_path, DEFAULT_CHECKWORTHINESS_THRESHOLD)

    rows = load_texts(Path(args.input), args.lang, args.limit)
    if done_ids:
        rows = [r for r in rows if r["id"] not in done_ids]
        print(f"{len(done_ids)} post gia' presenti in {out_path} (run precedente), salto")
    n_before_checkworthiness = len(rows)
    rows = [r for r in rows if r["id"] in checkworthy_ids]
    print(f"{n_before_checkworthiness - len(rows)} post scartati (non verificabili, checkworthiness <= 60%)")
    print(f"{len(rows)} post da valutare (modello={args.model}, chiavi ollama={key_pool.total}, "
          f"workers={workers}, google_factcheck={'si' if factcheck_key else 'no'})")

    done = 0
    write_header = not done_ids
    with out_path.open("a" if done_ids else "w", encoding="utf-8", newline="") as out_f:
        writer = csv.writer(out_f)
        if write_header:
            writer.writerow(["id", "verdict", "veracity", "confidence", "reasoning", "evidence_urls", "model"])
            out_f.flush()

        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(fact_check_one, row["text"], row.get("created_at"), args.model, key_pool, factcheck_key): row
                for row in rows
            }
            for future in as_completed(futures):
                row = futures[future]
                try:
                    result = future.result()
                except Exception as exc:
                    print(f"id {row['id']}: errore, salto ({exc})", file=sys.stderr)
                    continue
                evidence_urls = "; ".join(e["url"] for e in result["evidence"] if e.get("url"))
                writer.writerow([
                    row["id"], result["verdict"], result["veracity"], result["confidence"],
                    result["reasoning"], evidence_urls, args.model,
                ])
                out_f.flush()
                done += 1
                print(f"{done}/{len(rows)}", flush=True)

    print(f"fatto: {done}/{len(rows)} post valutati -> {out_path}")


if __name__ == "__main__":
    main()

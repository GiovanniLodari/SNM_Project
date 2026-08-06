#!/usr/bin/env python3
"""
AI detection con il METODO Binoculars (Hans et al., ICML 2024), reimplementato in
modo fedele con `transformers` + `torch`, adatto a GPU piccole (es. 8 GB).

Novità di questa versione:
  * colonna `ai_probability_pct` (2ª colonna): probabilità in % che il post sia IA
  * CHECKPOINT: se interrompi, al riavvio riprende da dove era rimasto
  * conteggio LIVE dei post analizzati
  * BATCH per velocizzare (con dimezzamento automatico se va in out-of-memory)

Punteggio Binoculars grezzo:  B = logPPL_performer / logX-PPL(observer, performer)
  -> PIÙ BASSO = più probabile IA ; PIÙ ALTO = più probabile umano
La % è una trasformazione logistica dello score attorno a THRESHOLD:
  p_IA = 1 / (1 + exp(STEEPNESS * (score - THRESHOLD)))
NON è una probabilità calibrata finché non tari THRESHOLD/STEEPNESS su dati etichettati.

Installazione (in un venv con UN SOLO Python, consigliato 3.10):
  python -m pip install torch --index-url https://download.pytorch.org/whl/cu124
  python -m pip install --upgrade "transformers>=4.44" "huggingface_hub>=0.24" accelerate
  python -c "import torch; print(torch.cuda.is_available())"   # deve stampare True

Uso: incolla l'URL in INPUT_URL, poi:  python ai_detection_binoculars.py
"""
from __future__ import annotations

import argparse
import json
import math
import os
import statistics
import sys
import time
import urllib.request
from datetime import datetime, timezone
from typing import Iterator, Tuple

# Riduce la frammentazione della memoria GPU nelle esecuzioni lunghe (va impostato
# PRIMA che torch venga importato, quindi qui in cima).
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")


# =========================================================================== #
#  >>> CONFIGURA QUI <<<  (poi lancia:  python ai_detection_binoculars.py)
# =========================================================================== #
INPUT_URL = "C:\\Users\\antoc\\Desktop\\SNM_Project\\post_texts.jsonl"   # <-- URL o path locale del JSONL

# Coppia di modelli: observer = base, performer = instruct dello STESSO modello.
# Default LEGGERO e MULTILINGUE (en+it), per 8 GB di VRAM (~2 GB totali):
OBSERVER_MODEL  = "Qwen/Qwen2.5-0.5B"
PERFORMER_MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
# Alternativa più accurata, entra comunque in 8 GB (~6 GB totali):
#   OBSERVER_MODEL  = "Qwen/Qwen2.5-1.5B"
#   PERFORMER_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"

THRESHOLD  = 0.90      # score < THRESHOLD => IA.  DA CALIBRARE per questa coppia!
STEEPNESS  = 25.0      # pendenza della curva score->%. Più alto = transizione più netta.
MAX_TOKENS = 512       # token massimi per testo. NON cambiarlo a metà dataset: altererebbe
                       # gli score già calcolati rispetto ai nuovi. Il batch invece è sicuro.
BATCH      = 2         # su 8 GB con Qwen (vocab ~152k) tieni 2 (o 1). Lo score NON dipende
                       # dal batch: abbassarlo riduce solo la memoria, non cambia i risultati.
MIN_WORDS  = 50        # sotto tot parole il testo è marcato poco affidabile

OUTPUT       = "ai_scores_binoculars.jsonl"
REPORT       = "ai_detection_report.md"
CHECKPOINT   = "ai_scores_binoculars.ckpt.json"   # file di checkpoint per il resume
SAVE_EVERY   = 100     # (non più critico: il checkpoint viene salvato a ogni batch)
# Comportamento resume: di DEFAULT riprende sempre dall'output esistente e NON lo
# cancella mai. Per ricominciare da zero azzerando l'output lancia con --fresh.
DETECTOR     = "binoculars"   # "binoculars" (reale) oppure "mock" (test senza GPU/modelli)
# =========================================================================== #


# --------------------------------------------------------------------------- #
#  Lettura input (URL o file locale), riga per riga -> (indice_riga, oggetto)
# --------------------------------------------------------------------------- #
def open_source(source: str):
    if source.startswith(("http://", "https://")):
        req = urllib.request.Request(source, headers={"User-Agent": "binoculars/1.0"})
        for raw in urllib.request.urlopen(req):     # noqa: S310 (URL dato dall'utente)
            yield raw.decode("utf-8", errors="replace")
    else:
        with open(source, encoding="utf-8") as f:
            yield from f


def read_jsonl(source: str) -> Iterator[Tuple[int, dict]]:
    for i, line in enumerate(open_source(source)):
        line = line.strip()
        if not line:
            continue
        try:
            yield i, json.loads(line)
        except json.JSONDecodeError as e:
            print(f"[warn] riga {i} non JSON, saltata: {e}", file=sys.stderr)


# --------------------------------------------------------------------------- #
#  score -> probabilità IA (%)
# --------------------------------------------------------------------------- #
def ai_probability_pct(score, threshold, steepness):
    if score is None:
        return None
    # più basso lo score, più alta la probabilità di IA
    p = 1.0 / (1.0 + math.exp(steepness * (score - threshold)))
    return round(100.0 * p, 2)


# --------------------------------------------------------------------------- #
#  Metodo Binoculars (reimplementazione fedele del repo ahans30/Binoculars)
# --------------------------------------------------------------------------- #
class BinocularsDetector:
    def __init__(self, observer_name, performer_name, threshold, max_tokens=512):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self.torch = torch
        self.threshold = threshold
        self.max_tokens = max_tokens
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32
        if self.device == "cpu":
            print("[attenzione] GPU non rilevata: girerà su CPU (molto più lento).",
                  file=sys.stderr)

        print(f"[info] carico observer:  {observer_name}", file=sys.stderr)
        self.tok = AutoTokenizer.from_pretrained(observer_name)
        if self.tok.pad_token is None:
            self.tok.pad_token = self.tok.eos_token
        self.observer = AutoModelForCausalLM.from_pretrained(
            observer_name, torch_dtype=self.dtype).to(self.device).eval()
        print(f"[info] carico performer: {performer_name}", file=sys.stderr)
        self.performer = AutoModelForCausalLM.from_pretrained(
            performer_name, torch_dtype=self.dtype).to(self.device).eval()

        if self.observer.config.vocab_size != self.performer.config.vocab_size:
            raise ValueError("I due modelli non condividono lo stesso vocabolario: "
                             "usa una coppia base+instruct della stessa famiglia.")
        print(f"[info] device={self.device} dtype={self.dtype}", file=sys.stderr)

    def _log_ppl(self, logits, input_ids, attn):
        F = self.torch.nn.functional
        logits = logits[:, :-1, :].float()
        labels = input_ids[:, 1:]
        mask = attn[:, 1:].float()
        ce = F.cross_entropy(logits.transpose(1, 2), labels, reduction="none")
        return (ce * mask).sum(1) / mask.sum(1).clamp(min=1)

    def _log_xppl_from_logsoftmax(self, obs_logits, perf_logsoftmax, input_ids, attn):
        # cross-perplexity = media su token di  -sum_v softmax(observer)_v * log_softmax(performer)_v
        # (identico al cross_entropy(performer_logits, target=softmax(observer)) del repo originale)
        torch = self.torch
        p = torch.softmax(obs_logits.float(), dim=-1)
        ce = -(p * perf_logsoftmax).sum(dim=-1)          # (B, T)
        del p
        mask = attn.float()
        return (ce * mask).sum(1) / mask.sum(1).clamp(min=1)

    def _score_chunk(self, texts):
        torch = self.torch
        enc = self.tok(texts, return_tensors="pt", padding=True,
                       truncation=True, max_length=self.max_tokens)
        enc = {k: v.to(self.device) for k, v in enc.items()}
        ids, attn = enc["input_ids"], enc["attention_mask"]
        with torch.no_grad():
            # calcolo un modello per volta e libero i logits appena non servono,
            # così non tengo mai in memoria due tensori enormi (B x T x vocab) insieme
            perf = self.performer(**enc).logits
            ppl = self._log_ppl(perf, ids, attn)
            perf_soft = torch.log_softmax(perf.float(), dim=-1)  # serve al cross-entropy
            del perf
            obs = self.observer(**enc).logits
            xppl = self._log_xppl_from_logsoftmax(obs, perf_soft, ids, attn)
            del obs, perf_soft
            scores = (ppl / xppl.clamp(min=1e-6)).cpu().tolist()
        del ppl, xppl, enc, ids, attn
        if self.device == "cuda":
            torch.cuda.empty_cache()
        return scores

    def score_texts(self, texts):
        """Ritorna la lista di score grezzi; dimezza il batch da solo su OOM."""
        try:
            return self._score_chunk(texts)
        except RuntimeError as e:
            if "out of memory" in str(e).lower() and len(texts) > 1:
                if self.device == "cuda":
                    self.torch.cuda.empty_cache()
                mid = len(texts) // 2
                print(f"[oom] riduco il batch a {mid}", file=sys.stderr)
                return self.score_texts(texts[:mid]) + self.score_texts(texts[mid:])
            raise


class MockDetector:
    def __init__(self, threshold=0.9):
        self.threshold = threshold

    def score_texts(self, texts):
        return [max(0.4, min(1.2, 1.1 - len(t.split()) / 400)) for t in texts]


# --------------------------------------------------------------------------- #
#  Checkpoint
# --------------------------------------------------------------------------- #
def save_checkpoint(path, input_id, count, _unused=None):
    """Salva il checkpoint (solo informativo: il resume usa il file di output).
    Su Windows os.replace può fallire se il file è bloccato (OneDrive/antivirus/editor):
    quindi riprovo qualche volta e, se proprio non riesco, proseguo senza crashare."""
    data = {"input": input_id, "count": count,
            "updated_at": datetime.now(timezone.utc).isoformat()}
    tmp = path + ".tmp"
    for attempt in range(5):
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f)
            os.replace(tmp, path)      # scrittura atomica
            return
        except PermissionError:
            time.sleep(0.4)            # file momentaneamente bloccato: riprovo
        except Exception:
            break
    # fallback: scrittura diretta (non atomica); se fallisce, rinuncio in silenzio
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        print("[warn] non riesco a salvare il checkpoint (file bloccato?); "
              "proseguo comunque: il resume si basa sull'output.", file=sys.stderr)


# --------------------------------------------------------------------------- #
#  Costruzione del record di output con la % come 2ª colonna
# --------------------------------------------------------------------------- #
def build_record(row, text_field, score, threshold, steepness, min_words):
    pct = ai_probability_pct(score, threshold, steepness)
    label = None
    ai_gen = None
    if score is not None:
        label = "Most likely AI-Generated" if score < threshold else "Most likely human-generated"
        ai_gen = score < threshold

    keys = list(row.keys())
    rec = {}
    if keys:                       # 1ª colonna = prima colonna originale (es. id)
        rec[keys[0]] = row[keys[0]]
    rec["ai_probability_pct"] = pct  # <-- 2ª colonna richiesta
    for k in keys[1:]:             # tutte le altre colonne originali, in ordine
        rec[k] = row[k]
    # campi accessori in coda
    rec["binoculars_score"] = None if score is None else round(float(score), 6)
    rec["binoculars_label"] = label if label else "skipped_empty"
    rec["ai_generated"] = ai_gen
    txt = row.get(text_field)
    if txt and str(txt).strip():
        nw = len(str(txt).split())
        rec["n_words"] = nw
        rec["reliable_length"] = nw >= min_words
    return rec


# --------------------------------------------------------------------------- #
#  Elaborazione principale (con batch, checkpoint, conteggio live)
# --------------------------------------------------------------------------- #
def process(args):
    detector = (MockDetector(args.threshold) if args.detector == "mock"
                else BinocularsDetector(args.observer, args.performer,
                                        args.threshold, args.max_tokens))

    # RESUME ROBUSTO E SICURO: conto quante righe ci sono già nell'output e riprendo
    # da lì. NON cancello mai l'output. Per ricominciare da zero serve --fresh.
    n_done = 0
    if os.path.exists(args.output) and os.path.getsize(args.output) > 0:
        with open(args.output, encoding="utf-8") as f:
            n_done = sum(1 for line in f if line.strip())

    if args.fresh:
        open(args.output, "w", encoding="utf-8").close()
        if os.path.exists(args.checkpoint):
            os.remove(args.checkpoint)
        n_done = 0
        print("[fresh] ricomincio da zero: output azzerato (richiesto con --fresh).",
              file=sys.stderr)
    elif n_done > 0:
        print(f"[resume] trovate {n_done} righe già fatte in '{args.output}': "
              f"riprendo da lì, non le rifaccio.", file=sys.stderr)

    out = open(args.output, "a", encoding="utf-8")   # SEMPRE append: mai sovrascrivere
    buffer = []
    done = n_done
    new_this_run = 0
    seen = 0            # righe non vuote lette finora dall'input

    def flush():
        nonlocal done, new_this_run
        if not buffer:
            return
        idx_nonempty, texts = [], []
        for j, row in enumerate(buffer):
            t = row.get(args.text_field)
            if t and str(t).strip():
                idx_nonempty.append(j)
                texts.append(str(t))
        scores_nonempty = detector.score_texts(texts) if texts else []
        score_map = dict(zip(idx_nonempty, scores_nonempty))

        for j, row in enumerate(buffer):
            rec = build_record(row, args.text_field, score_map.get(j),
                               args.threshold, args.steepness, args.min_words)
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            done += 1
            new_this_run += 1
        out.flush()
        os.fsync(out.fileno())   # forza la scrittura su disco: niente perdite se crasha
        buffer.clear()
        save_checkpoint(args.checkpoint, args.input, done, done)
        print(f"[progress] totale nel file: {done}  (+{new_this_run} in questo run)",
              file=sys.stderr)

    for _, row in read_jsonl(args.input):
        seen += 1
        if seen <= n_done:      # righe già presenti nell'output: le salto
            continue
        buffer.append(row)
        if len(buffer) >= args.batch_size:
            flush()
        if args.limit and new_this_run >= args.limit:
            break
    flush()
    save_checkpoint(args.checkpoint, args.input, done, done)
    out.close()
    print(f"\n[fine run] nuovi in questo run: {new_this_run} | totale nel file: {done}",
          file=sys.stderr)
    return done


# --------------------------------------------------------------------------- #
#  Report (calcolato rileggendo TUTTO il file di output, anche dopo resume)
# --------------------------------------------------------------------------- #
def build_report(args, total_done):
    rows = []
    with open(args.output, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    scored = [r for r in rows if isinstance(r.get("binoculars_score"), (int, float))]
    scores = [r["binoculars_score"] for r in scored]
    pcts = [r["ai_probability_pct"] for r in scored if r.get("ai_probability_pct") is not None]
    n_ai = sum(1 for r in scored if r.get("ai_generated"))
    n_empty = sum(1 for r in rows if r.get("binoculars_label") == "skipped_empty")
    n_short = sum(1 for r in scored if r.get("reliable_length") is False)

    by_lang = {}
    for r in scored:
        d = by_lang.setdefault(str(r.get("lang", "unknown")), {"n": 0, "ai": 0})
        d["n"] += 1
        d["ai"] += 1 if r.get("ai_generated") else 0
    hist = {}
    for p in pcts:
        b = f"{int(p//10)*10}-{int(p//10)*10+10}%"
        hist[b] = hist.get(b, 0) + 1
    ranked = sorted(scored, key=lambda r: r["binoculars_score"])

    stats = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input": args.input, "detector": args.detector,
        "observer_model": args.observer, "performer_model": args.performer,
        "threshold": args.threshold, "steepness": args.steepness,
        "max_tokens": args.max_tokens, "min_words_for_reliable": args.min_words,
        "counts": {"total_in_file": len(rows), "scored": len(scored),
                   "skipped_empty": n_empty, "short_unreliable": n_short,
                   "ai_generated": n_ai, "human": len(scored) - n_ai},
        "score_summary": {
            "mean": round(statistics.fmean(scores), 4) if scores else None,
            "median": round(statistics.median(scores), 4) if scores else None,
            "min": round(min(scores), 4) if scores else None,
            "max": round(max(scores), 4) if scores else None,
            "stdev": round(statistics.pstdev(scores), 4) if len(scores) > 1 else None},
        "ai_probability_pct_summary": {
            "mean": round(statistics.fmean(pcts), 2) if pcts else None,
            "median": round(statistics.median(pcts), 2) if pcts else None},
        "histogram_pct": dict(sorted(hist.items(), key=lambda x: int(x[0].split('-')[0]))),
        "by_lang": by_lang,
        "most_likely_ai": [{"id": r.get("id"), "pct": r.get("ai_probability_pct"),
                            "score": r["binoculars_score"]} for r in ranked[:10]],
        "most_likely_human": [{"id": r.get("id"), "pct": r.get("ai_probability_pct"),
                              "score": r["binoculars_score"]} for r in ranked[-10:][::-1]],
    }
    write_report_md(stats, args.report)
    with open(args.report_json, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    return stats


def write_report_md(s, path):
    c, ss, ps = s["counts"], s["score_summary"], s["ai_probability_pct_summary"]
    pct = 100 * c["ai_generated"] / c["scored"] if c["scored"] else 0
    L = ["# Report AI detection — Binoculars\n",
         f"- Generato: `{s['generated_at']}`",
         f"- Sorgente: `{s['input']}`  |  Detector: `{s['detector']}`",
         f"- Modelli: observer `{s['observer_model']}` / performer `{s['performer_model']}`",
         f"- Soglia: `{s['threshold']}` | pendenza %: `{s['steepness']}` | max_tokens: `{s['max_tokens']}`",
         "  (score < soglia ⇒ IA; **score più basso = % IA più alta**)\n",
         "## Conteggi\n", "| Metrica | Valore |", "|---|---|",
         f"| Righe nel file | {c['total_in_file']} |",
         f"| Analizzate (con score) | {c['scored']} |",
         f"| Vuote / saltate | {c['skipped_empty']} |",
         f"| Testi corti (< {s['min_words_for_reliable']} parole, poco affidabili) | {c['short_unreliable']} |",
         f"| **IA** | **{c['ai_generated']}** ({pct:.1f}%) |",
         f"| Umani | {c['human']} |\n",
         "## Probabilità IA (%)\n", "| media % | mediana % |", "|---|---|",
         f"| {ps['mean']} | {ps['median']} |\n",
         "## Statistiche score grezzo\n", "| mean | median | min | max | stdev |",
         "|---|---|---|---|---|",
         f"| {ss['mean']} | {ss['median']} | {ss['min']} | {ss['max']} | {ss['stdev']} |\n",
         "## Distribuzione probabilità IA (bucket 10%)\n", "| Fascia | Conteggio |", "|---|---|"]
    for k, v in s["histogram_pct"].items():
        L.append(f"| {k} | {v} {'█'*min(40, v)} |")
    L += ["\n## Per lingua\n", "| lang | n | IA | % IA |", "|---|---|---|---|"]
    for lang, d in sorted(s["by_lang"].items(), key=lambda x: -x[1]["n"]):
        L.append(f"| {lang} | {d['n']} | {d['ai']} | {100*d['ai']/d['n'] if d['n'] else 0:.1f}% |")
    L += ["\n## Top 10 più probabilmente IA\n", "| id | % IA | score |", "|---|---|---|"]
    L += [f"| {r['id']} | {r['pct']} | {r['score']} |" for r in s["most_likely_ai"]]
    L += ["\n## Top 10 più probabilmente umani\n", "| id | % IA | score |", "|---|---|---|"]
    L += [f"| {r['id']} | {r['pct']} | {r['score']} |" for r in s["most_likely_human"]]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))


def main():
    p = argparse.ArgumentParser(description="AI detection con metodo Binoculars")
    p.add_argument("--input", default=INPUT_URL)
    p.add_argument("--output", default=OUTPUT)
    p.add_argument("--report", default=REPORT)
    p.add_argument("--report-json", default="ai_detection_report.json")
    p.add_argument("--checkpoint", default=CHECKPOINT)
    p.add_argument("--text-field", default="text")
    p.add_argument("--detector", choices=["binoculars", "mock"], default=DETECTOR)
    p.add_argument("--observer", default=OBSERVER_MODEL)
    p.add_argument("--performer", default=PERFORMER_MODEL)
    p.add_argument("--threshold", type=float, default=THRESHOLD)
    p.add_argument("--steepness", type=float, default=STEEPNESS)
    p.add_argument("--max-tokens", type=int, default=MAX_TOKENS)
    p.add_argument("--min-words", type=int, default=MIN_WORDS)
    p.add_argument("--batch-size", type=int, default=BATCH)
    p.add_argument("--save-every", type=int, default=SAVE_EVERY)
    p.add_argument("--limit", type=int, default=0, help="0 = tutti; N = solo N nuovi (per test)")
    p.add_argument("--fresh", action="store_true",
                   help="ricomincia da zero AZZERANDO l'output (di default invece riprende e non cancella)")
    args = p.parse_args()

    if "INCOLLA-QUI" in args.input:
        sys.exit("ERRORE: incolla il tuo URL/percorso in INPUT_URL (sezione CONFIGURA QUI), poi rilancia.")

    try:
        total = process(args)
    except (RuntimeError, KeyboardInterrupt) as e:
        # progresso salvato nel checkpoint a ogni batch: basta RILANCIARE lo stesso
        # comando per riprendere da dove si è fermato (nessun post rifatto).
        print(f"\n[interrotto] {type(e).__name__}: {e}", file=sys.stderr)
        print("[recupero] progresso salvato. Rilancia LO STESSO comando per riprendere "
              "da dove si è fermato. Se era 'out of memory', abbassa BATCH a 1 nello script "
              "(o aggiungi --batch-size 1) prima di rilanciare.", file=sys.stderr)
        sys.exit(1)

    stats = build_report(args, total)
    c = stats["counts"]
    print(f"[report] {args.report}  |  file: {args.output}", file=sys.stderr)
    print(f"[riassunto] analizzati {c['scored']} | IA {c['ai_generated']} | "
          f"umani {c['human']} | corti {c['short_unreliable']}", file=sys.stderr)


if __name__ == "__main__":
    main()
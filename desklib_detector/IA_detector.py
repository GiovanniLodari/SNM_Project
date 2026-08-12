"""
Analizza un file JSONL di post (~200k) col detector desklib/ai-text-detector,
calcolando la probabilita' IA SOLO per i post in inglese.

  * CHECKPOINT ogni 1000 post: CSV in APPEND + report aggiornato su disco.
  * RIPRESA automatica: al riavvio salta i post gia' presenti nel CSV.
  * AVANZAMENTO live: contatore aggiornato ad ogni batch.

Uso:
  1. attiva il venv
  2. imposta INPUT_FILE col nome del tuo file
  3. python analizza_post.py     (rilancialo quante volte vuoi: riprende)
"""

import csv
import json
import os
from pathlib import Path
import sys
import time
import torch
import torch.nn as nn
from collections import Counter
from transformers import AutoTokenizer, AutoConfig, AutoModel, PreTrainedModel

# ---------------------------------------------------------------------------
# CONFIGURAZIONE
# ---------------------------------------------------------------------------
INPUT_FILE       = str(Path(__file__).resolve().parent.parent / "post_texts.jsonl")
OUTPUT_CSV       = "risultati.csv"
OUTPUT_REPORT    = "report.txt"
TARGET_LANG      = "en"
THRESHOLD        = 0.5
BATCH_SIZE       = 16
CHECKPOINT_EVERY = 1000
MODEL_NAME       = "desklib/ai-text-detector-v1.01"

CSV_HEADER = ["id", "lang", "text", "ai_probability"]
csv.field_size_limit(min(sys.maxsize, 2**31 - 1))


def norm_lang(v):
    """Normalizza la lingua: None, mancante o vuota -> '??'."""
    if v is None or (isinstance(v, str) and v.strip() == ""):
        return "??"
    return str(v)


# ---------------------------------------------------------------------------
# MODELLO
# ---------------------------------------------------------------------------
class DesklibAIDetectionModel(PreTrainedModel):
    config_class = AutoConfig

    def __init__(self, config):
        super().__init__(config)
        self.model = AutoModel.from_config(config)
        self.classifier = nn.Linear(config.hidden_size, 1)
        self.init_weights()

    def forward(self, input_ids, attention_mask):
        out = self.model(input_ids=input_ids, attention_mask=attention_mask)
        last_hidden = out[0]
        mask = attention_mask.unsqueeze(-1).float()
        pooled = (last_hidden * mask).sum(1) / mask.sum(1)
        logit = self.classifier(pooled)
        return torch.sigmoid(logit)


def carica_detector():
    print(f"Carico il modello '{MODEL_NAME}' (la prima volta lo scarica)...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = DesklibAIDetectionModel.from_pretrained(MODEL_NAME)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device).eval()
    print(f"Modello pronto (device: {device}).")
    return tokenizer, model, device


def infer_batch(testi, tokenizer, model, device):
    """Probabilita' (0..1) per UN batch di testi (<= BATCH_SIZE)."""
    enc = tokenizer(testi, return_tensors="pt", truncation=True,
                    max_length=512, padding=True)
    input_ids = enc["input_ids"].to(device)
    attention_mask = enc["attention_mask"].to(device)
    with torch.no_grad():
        probs = model(input_ids, attention_mask).squeeze(-1)
    return probs.reshape(-1).cpu().tolist()


# ---------------------------------------------------------------------------
# STATISTICHE (incrementali, sopravvivono ai riavvii)
# ---------------------------------------------------------------------------
class Stats:
    def __init__(self):
        self.per_lingua = Counter()
        self.totale = 0
        self.en_count = 0
        self.prob_sum = 0.0
        self.n_ia = 0
        self.prob_min = None
        self.prob_max = None
        self.fasce = Counter()

    def aggiungi(self, lang, prob):
        self.totale += 1
        self.per_lingua[norm_lang(lang)] += 1
        if prob is not None:
            self.en_count += 1
            self.prob_sum += prob
            if prob >= THRESHOLD:
                self.n_ia += 1
            self.prob_min = prob if self.prob_min is None else min(self.prob_min, prob)
            self.prob_max = prob if self.prob_max is None else max(self.prob_max, prob)
            self.fasce[min(int(prob * 5), 4)] += 1


def carica_stato(percorso_csv):
    done = set()
    stats = Stats()
    if not os.path.exists(percorso_csv):
        return done, stats
    with open(percorso_csv, "r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)  # intestazione
        for riga in reader:
            if len(riga) < 4:
                continue
            _id, lang, _text, prob_str = riga[0], riga[1], riga[2], riga[3]
            done.add(str(_id))
            prob = float(prob_str) if prob_str != "" else None
            stats.aggiungi(lang, prob)
    print(f"Ripresa: {len(done)} post gia' presenti in '{percorso_csv}'.")
    return done, stats


# ---------------------------------------------------------------------------
# REPORT
# ---------------------------------------------------------------------------
def scrivi_report(stats):
    r = []
    r.append("=" * 55)
    r.append("REPORT ANALISI POST  (aggiornato ad ogni checkpoint)")
    r.append("=" * 55)
    r.append(f"Post processati finora: {stats.totale}")
    r.append("")
    r.append("Post per lingua:")
    for lang, n in stats.per_lingua.most_common():
        perc = 100 * n / stats.totale if stats.totale else 0
        r.append(f"  {str(lang):>6} : {n:>6}  ({perc:5.1f}%)")
    r.append("")
    r.append(f"Analisi IA (solo lingua '{TARGET_LANG}'):")
    r.append(f"  Post analizzati        : {stats.en_count}")
    media = stats.prob_sum / stats.en_count if stats.en_count else 0.0
    r.append(f"  Probabilita' media IA  : {media:.1%}")
    r.append(f"  Classificati IA (>= {THRESHOLD}) : {stats.n_ia}")
    r.append(f"  Classificati umani     : {stats.en_count - stats.n_ia}")
    if stats.en_count:
        r.append(f"  Prob. min / max        : "
                 f"{stats.prob_min:.1%} / {stats.prob_max:.1%}")
        r.append("")
        r.append("  Distribuzione probabilita' (post inglesi):")
        etich = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"]
        for i, lab in enumerate(etich):
            r.append(f"    {lab:>7} : {stats.fasce.get(i, 0):>6}")
    r.append("=" * 55)
    r.append("Nota: le probabilita' sono un indicatore, non una prova. "
             "Su testi brevi l'affidabilita' e' bassa.")
    testo = "\n".join(r)
    with open(OUTPUT_REPORT, "w", encoding="utf-8") as f:
        f.write(testo + "\n")
    return testo


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    done, stats = carica_stato(OUTPUT_CSV)

    totali_file = 0
    da_fare = []
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for n, riga in enumerate(f, 1):
            riga = riga.strip()
            if not riga:
                continue
            try:
                rec = json.loads(riga)
            except json.JSONDecodeError:
                print(f"  [attenzione] riga {n} non valida, saltata.")
                continue
            totali_file += 1
            if str(rec.get("id")) not in done:
                da_fare.append(rec)

    print(f"Post nel file: {totali_file} | gia' fatti: {len(done)} | "
          f"da fare ora: {len(da_fare)}")
    if not da_fare:
        print("Niente da fare: tutti i post risultano gia' analizzati.")
        print(scrivi_report(stats))
        return

    tokenizer, model, device = carica_detector()

    nuovo_file = not os.path.exists(OUTPUT_CSV) or os.path.getsize(OUTPUT_CSV) == 0
    csv_f = open(OUTPUT_CSV, "a", encoding="utf-8", newline="")
    writer = csv.writer(csv_f)
    if nuovo_file:
        writer.writerow(CSV_HEADER)

    processati_sess = 0           # post processati in questa sessione
    analizzati_en_sess = 0        # post inglesi analizzati in questa sessione
    t0 = time.time()

    for start in range(0, len(da_fare), CHECKPOINT_EVERY):
        blocco = da_fare[start:start + CHECKPOINT_EVERY]

        # Inferenza sui post inglesi del blocco, batch per batch, con avanzamento live.
        idx_en = [i for i, r in enumerate(blocco) if r.get("lang") == TARGET_LANG]
        prob_per_idx = {}
        for b in range(0, len(idx_en), BATCH_SIZE):
            sub = idx_en[b:b + BATCH_SIZE]
            testi = [str(blocco[i].get("text", "")) for i in sub]
            probs = infer_batch(testi, tokenizer, model, device)
            for i, p in zip(sub, probs):
                prob_per_idx[i] = p
            analizzati_en_sess += len(sub)
            # velocita' e stima tempo rimanente (sui post da fare in totale)
            fatti = processati_sess + b + len(sub)
            vel = fatti / max(time.time() - t0, 1e-6)
            print(f"\r  in corso... post analizzati (en) questa sessione: "
                  f"{analizzati_en_sess}  |  ~{vel:.1f} post/s",
                  end="", flush=True)

        # Scrittura righe del blocco (in ordine originale) + statistiche.
        for i, rec in enumerate(blocco):
            prob = prob_per_idx.get(i)
            prob_str = f"{prob:.6f}" if prob is not None else ""
            writer.writerow([rec.get("id", ""), rec.get("lang", ""),
                             rec.get("text", ""), prob_str])
            stats.aggiungi(rec.get("lang"), prob)

        # CHECKPOINT
        csv_f.flush()
        os.fsync(csv_f.fileno())
        scrivi_report(stats)
        processati_sess += len(blocco)
        print(f"\r  [CHECKPOINT] salvati {processati_sess}/{len(da_fare)} "
              f"post di questa sessione  (totale su disco: {stats.totale})"
              + " " * 15)

    csv_f.close()
    print("\nFatto. Report finale:\n")
    print(scrivi_report(stats))
    print(f"\nCSV    -> {OUTPUT_CSV}")
    print(f"Report -> {OUTPUT_REPORT}")


if __name__ == "__main__":
    main()
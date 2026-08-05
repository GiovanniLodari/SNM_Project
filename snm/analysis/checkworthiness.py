# checkworthiness.py
"""Filtro di verificabilita' (fase 2, pre-fact-check): scarta le
affermazioni non verificabili (opinioni, stati personali - es. "il mio
gatto e' nero") prima di spendere ricerca+LLM su di esse. Stesso modello
gia' citato in docs/report_fase0.tex (metodologia del collega in
fase_1_beta/): SophieTr/xlm-roberta-base-claim-detection-clef21-24, soglia
> 60%. Gira in batch PRIMA del ThreadPoolExecutor di fact_check.py (fase
CPU/GPU-bound, non di rete - i due colli di bottiglia non vanno mescolati).
"""

CHECKWORTHINESS_MODEL = "SophieTr/xlm-roberta-base-claim-detection-clef21-24"
DEFAULT_THRESHOLD = 0.6


def filter_by_score(rows: list[dict], scores: list[float], threshold: float = DEFAULT_THRESHOLD) -> list[dict]:
    """Accoppia ogni riga al suo punteggio (stessa posizione in entrambe le
    liste) e tiene solo quelle sopra soglia. Pura, nessun I/O."""
    return [row for row, score in zip(rows, scores) if score > threshold]


import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


def load_model(cache_dir: str = "cache"):
    # Il repo CHECKWORTHINESS_MODEL contiene solo config.json + model.safetensors,
    # nessun file di tokenizer (verificato via HF API). E' un fine-tune di
    # xlm-roberta-base (architecture XLMRobertaForSequenceClassification,
    # vocab_size 250002 identico), quindi il tokenizer si carica dal base model.
    tokenizer = AutoTokenizer.from_pretrained("xlm-roberta-base", cache_dir=cache_dir)
    model = AutoModelForSequenceClassification.from_pretrained(CHECKWORTHINESS_MODEL, cache_dir=cache_dir)
    model.eval()
    return tokenizer, model


def score_batch(texts: list[str], tokenizer, model, batch_size: int = 32) -> list[float]:
    """P(checkworthy) per testo, in batch (un solo forward pass per gruppo
    invece di uno per testo - stesso motivo di batching di snm_detect.py).
    Indice 1 = classe positiva (convenzione standard HuggingFace per
    classificatori binari senza id2label custom - verificato manualmente,
    vedi Task 2 Step 5 del piano)."""
    scores: list[float] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        inputs = tokenizer(batch, truncation=True, padding=True, return_tensors="pt")
        with torch.no_grad():
            logits = model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)[:, 1]
        scores.extend(probs.tolist())
    return scores


def filter_checkworthy(rows: list[dict], threshold: float = DEFAULT_THRESHOLD, batch_size: int = 32) -> list[dict]:
    """Orchestratore: carica il modello, valuta tutte le righe, filtra.
    Chiamato una volta per run da fact_check.py, prima del ThreadPoolExecutor."""
    if not rows:
        return []
    # Ordina per lunghezza testo (proxy economico della lunghezza in token):
    # senza ordinamento, un post molto lungo capitato in un batch costringe
    # tutti gli altri del batch a pagare il suo padding (costo quadratico
    # nell'attenzione). Misurato su corpus reale: 69% di spreco computazionale
    # con file-order batching (outlier ~44k char forzano padding per interi batch).
    rows_sorted = sorted(rows, key=lambda r: len(r.get("text", "")))
    tokenizer, model = load_model()
    scores = score_batch([row["text"] for row in rows_sorted], tokenizer, model, batch_size=batch_size)
    return filter_by_score(rows_sorted, scores, threshold=threshold)

# Guida al Setup dei Dataset e Percorsi File

Questa guida spiega come sono gestiti i file di dati nel progetto e come consentire a tutti i membri del team di caricare ed esplorare le analisi (FastDetectGPT, Binoculars, Desklib e Fact-Checking).

---

## 1. Risoluzione Automatica dei Percorsi (Zero-Config)

Il sistema include un meccansimo dinamico di risoluzione dei file (`webapp/path_utils.py`). Il server FastAPI cercherà automaticamente i file nei seguenti percorsi di default:

| Dataset | Modello / Modulo | Percorsi Candidati di Default |
| :--- | :--- | :--- |
| **FastDetectGPT** | Detector 1 | `data/ai_scores_fast_detect.jsonl`<br>`ai_scores_fast_detect.jsonl`<br>`fast-detect-gpt/ai_scores_fast_detect.jsonl` |
| **Binoculars** | Detector 2 | `desklib_detector/risultati_binocular_all/ai_scores_binoculars.jsonl`<br>`data/ai_scores_binoculars.jsonl`<br>`ai_scores_binoculars.jsonl` |
| **Desklib AI Detector** | Detector 3 | `desklib_detector/risultati_binocular_all/risultati.jsonl`<br>`data/risultati.jsonl`<br>`risultati.jsonl`<br>`desklib_scores.jsonl` |
| **Fact-Checking** | Report Veridicità | `fact_checking/fact_check_report.csv`<br>`fact_check_report.csv`<br>`data/fact_check_report.csv` |
| **Post Corpus** | Testi Estratti | `post_texts.jsonl`<br>`data/post_texts.jsonl` |

---

## 2. Configurazione Personalizzata tramite File `.env` (Opzionale)

Se hai memorizzato i file di output in una cartella differente nel tuo computer locale, puoi specificare i percorsi assoluti nel file `.env` alla radice del progetto:

```env
# Esempio configurazione percorsi personalizzati nel file .env
AI_SCORES_PATH=C:/SNM_Project/data/ai_scores_fast_detect.jsonl
BINOCULARS_SCORES_PATH=C:/SNM_Project/desklib_detector/risultati_binocular_all/ai_scores_binoculars.jsonl
DESKLIB_SCORES_PATH=C:/SNM_Project/desklib_detector/risultati_binocular_all/risultati.jsonl
FACT_CHECK_PATH=C:/SNM_Project/fact_checking/fact_check_report.csv
POST_TEXTS_PATH=C:/SNM_Project/post_texts.jsonl
```

---

## 3. Struttura Cartelle Consigliata per il Repository

Per mantenere la massima compatibilità senza dover modificare il file `.env`, posiziona i file di output secondo la seguente struttura:

```text
SNM_Project/
├── data/
│   └── ai_scores_fast_detect.jsonl         # Output FastDetectGPT
├── desklib_detector/
│   └── risultati_binocular_all/
│       ├── ai_scores_binoculars.jsonl     # Output Binoculars
│       └── risultati.jsonl                # Output Desklib
├── fact_checking/
│   └── fact_check_report.csv              # Output Fact-Checking
├── post_texts.jsonl                       # Corpus testi
└── .env
```

---

## 4. Avvio dell'Applicazione

Una volta posizionati i file, avvia l'intero stack (Backend FastAPI + Frontend React/Vite) tramite lo script PowerShell:

```powershell
.\start_all.ps1
```

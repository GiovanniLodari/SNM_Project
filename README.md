# SNM Intelligence

> Quanta parte del Fediverso non l'ha scritta una persona, e quanto lontano arriva?

Progetto di tesi che raccoglie post da **Mastodon**, stima quali sono stati scritti da un'intelligenza artificiale, verifica le affermazioni controllabili e studia come i contenuti si diffondono nella rete sociale. I risultati si esplorano da un'interfaccia web.

## Cosa fa

1. **Raccolta.** Per ogni argomento in `topic_list.txt` trova le istanze Mastodon più attive, ne scopre gli hashtag più usati e scarica i post, insieme agli account e agli archi della rete (follow, boost, risposte). Tutto finisce in un database (PostgreSQL o SQLite).
2. **Rilevamento di testo sintetico.** Ogni testo passa da rilevatori indipendenti: Fast-DetectGPT, AdaDetectGPT, Binoculars e Desklib. Un confronto tra i rilevatori (`comparatore_detector/`) mostra dove concordano e dove no.
3. **Verifica.** Un modello stima se un post contiene un'affermazione controllabile (*check-worthiness*); le affermazioni vengono poi verificate con un LLM che cerca prove sul web e cita le fonti.
4. **Rete e diffusione.**
   - Community detection sul grafo sociale (Leiden, Infomap).
   - Influence maximization con CELF++, PMIA e SKIM, per scegliere da quali nodi conviene partire.
   - Simulazioni Monte Carlo (modello Independent Cascade) e TwitterRank per misurare fin dove arriva un contenuto.
5. **Interfaccia.** Backend FastAPI e frontend React che presentano il lavoro come una sequenza di capitoli: i corpus, il testo sintetico, la verifica, la propagazione.

## Struttura

| Percorso | Contenuto |
|---|---|
| `pipeline.py`, `snm/collection/` | Raccolta dati da Mastodon |
| `snm/storage/`, `db/` | Accesso al database e schemi (PostgreSQL, SQLite) |
| `snm/analysis/` | Export testi, check-worthiness, fact-checking, import/export DB |
| `snm/graph/` | Costruzione del grafo, community detection, visualizzazioni |
| `binoculars/`, `desklib_detector/`, `comparatore_detector/` | Rilevatori di testo sintetico e confronto |
| `Max_Influence/` | Algoritmi di influence maximization e risultati |
| `misinformation_impact/` | Simulazioni di diffusione della disinformazione |
| `webapp/` | API FastAPI |
| `frontend/` | Interfaccia React + Vite |
| `tests/` | Test del backend (pytest) |

Per il dettaglio di ogni file vedi [`report.md`](report.md); per l'idea di prodotto, [`PRODUCT.md`](PRODUCT.md) e [`DESIGN.md`](DESIGN.md).

## Requisiti

- Python 3.10+
- Node.js 18+
- Un database: SQLite (nessuna installazione) oppure PostgreSQL
- Facoltativo: una GPU per i rilevatori basati su modelli (`torch`, `transformers`)

## Installazione

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cd frontend && npm install && cd ..

cp env.example .env                # poi compila i valori
```

In `.env` imposta almeno `DATABASE_URL`. `INSTANCES_SOCIAL_API` serve per scoprire le istanze e i token `MASTODON_TOKEN_*` sono facoltativi: senza, si usa l'accesso anonimo, con rate limit più basso.

## Avvio

Tutto insieme su Windows:

```powershell
.\start_all.ps1
```

Oppure separatamente:

```bash
uvicorn webapp.main:app --port 8088 --reload     # backend  → http://127.0.0.1:8088
cd frontend && npm run dev                       # frontend → http://localhost:5173
```

Per raccogliere nuovi dati:

```bash
python pipeline.py
```

## Dati

Il repository **non contiene** il corpus dei post e i risultati pesanti (`post_texts.jsonl`, i punteggi dei rilevatori completi, i report di fact-checking): sono contenuti pubblicati da altre persone, e si rigenerano con la pipeline. Restano nel repository i risultati aggregati e piccoli (`Max_Influence/Risultati_IM/`, `Risultati_Binoculars/`, i grafici ROC in `data/`).

Per come vengono cercati i file di output e per personalizzarne i percorsi vedi [`DATASET_SETUP.md`](DATASET_SETUP.md).

## Test

```bash
pip install pytest
pytest tests/

cd frontend && npm test
```

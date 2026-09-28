# SNM Intelligence

> How much of the Fediverse was not written by a person, and how far does it travel?

University project (Social Networks and Media) that collects posts from **Mastodon**, estimates which ones were written by an AI, checks verifiable claims and studies how content spreads through the social network. The results are explored through a web interface. Code, comments and documentation are in Italian.

## What it does

1. **Collection.** For each topic in `topic_list.txt` it finds the most active Mastodon instances, discovers their most used hashtags and downloads the posts, together with accounts and network edges (follows, boosts, replies). Everything goes into a database (PostgreSQL or SQLite).
2. **Synthetic-text detection.** Every text goes through independent detectors: Fast-DetectGPT, AdaDetectGPT, Binoculars and Desklib. A comparison across detectors (`comparatore_detector/`) shows where they agree and where they do not.
3. **Verification.** A model estimates whether a post contains a checkable claim (*check-worthiness*); claims are then verified by an LLM that searches the web for evidence and cites its sources.
4. **Network and diffusion.**
   - Community detection on the social graph (Leiden, Infomap).
   - Influence maximization with CELF++, PMIA and SKIM, to choose the nodes to start from.
   - Monte Carlo simulations (Independent Cascade model) and TwitterRank to measure how far a piece of content travels.
5. **Interface.** A FastAPI backend and a React frontend that present the work as a sequence of chapters: the corpora, synthetic text, verification, propagation.

## Structure

| Path | Content |
|---|---|
| `pipeline.py`, `snm/collection/` | Data collection from Mastodon |
| `snm/storage/`, `db/` | Database access and schemas (PostgreSQL, SQLite) |
| `snm/analysis/` | Text export, check-worthiness, fact-checking, DB import/export |
| `snm/graph/` | Graph construction, community detection, visualizations |
| `binoculars/`, `desklib_detector/`, `comparatore_detector/` | Synthetic-text detectors and comparison |
| `Max_Influence/` | Influence-maximization algorithms and results |
| `misinformation_impact/` | Misinformation diffusion simulations |
| `webapp/` | FastAPI API |
| `frontend/` | React + Vite interface |
| `tests/` | Backend tests (pytest) |

For a per-file description see [`report.md`](report.md); for the product idea, [`PRODUCT.md`](PRODUCT.md) and [`DESIGN.md`](DESIGN.md) (in Italian).

## Requirements

- Python 3.10+
- Node.js 18+
- A database: SQLite (no installation) or PostgreSQL
- Optional: a GPU for the model-based detectors (`torch`, `transformers`)

## Installation

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cd frontend && npm install && cd ..

cp env.example .env                # then fill in the values
```

In `.env` set at least `DATABASE_URL`. `INSTANCES_SOCIAL_API` is needed to discover instances, and the `MASTODON_TOKEN_*` tokens are optional: without them anonymous access is used, with a lower rate limit.

## Running

Everything at once on Windows:

```powershell
.\start_all.ps1
```

Or separately:

```bash
uvicorn webapp.main:app --port 8088 --reload     # backend  → http://127.0.0.1:8088
cd frontend && npm run dev                       # frontend → http://localhost:5173
```

To collect new data:

```bash
python pipeline.py
```

## Data

The repository **does not contain** the post corpus and the heavy results (`post_texts.jsonl`, the full detector scores, the fact-checking reports): they are content published by other people, and they can be regenerated with the pipeline. Small aggregated results stay in the repository (`Max_Influence/Risultati_IM/`, `Risultati_Binoculars/`, the ROC plots in `data/`).

For how output files are looked up and how to customize their paths see [`DATASET_SETUP.md`](DATASET_SETUP.md).

## Tests

```bash
pip install pytest
pytest tests/

cd frontend && npm test
```

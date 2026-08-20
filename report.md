# Report tecnico — SNM Project

> Documentazione di ogni file tracciato nel repository: cosa fa, perché esiste, come si collega al resto. Scritto per chi clona il progetto per la prima volta (colleghi) e deve orientarsi senza dover rileggere tutto il codice da zero.

## Sintesi del progetto

Il progetto analizza post Mastodon per: (1) rilevare contenuto generato da IA, (2) verificarne la veridicità (fact-checking), (3) studiare come le fake news si diffondono nella rete (influence maximization), (4) stimare quanti account che producono contenuto IA sono anche bot. Il punto di partenza è la raccolta dei post e la costruzione della rete informativa (chi segue chi, chi amplifica/risponde a chi) su cui si appoggiano tutte le fasi successive.

Lingua di lavoro: italiano (codice, commenti, documentazione).

---

## Struttura ad alto livello

```
SNM_Project/
├── db/schema.sql              # schema Postgres (unica fonte di verità sulle tabelle)
├── data/ai_scores_fast_detect.jsonl       # risultati AI detection (completo, condiviso via git)
├── post_texts.jsonl           # corpus testi (input pipeline IA/fact-check, condiviso via git)
├── pipeline.py                # pipeline principale: raccolta post per argomento
├── instance_blacklist.txt     # istanze Mastodon da evitare (verificate manualmente)
├── topic_list.txt             # argomenti su cui raccogliere (input reale di pipeline.py)
├── topics.example.txt         # esempio/riferimento sintassi topic (non usato in produzione)
├── requirements.txt           # dipendenze Python di produzione
├── requirements-dev.txt       # dipendenze extra per sviluppo/test
├── snm/                       # libreria core del progetto
│   ├── config.py
│   ├── storage/                (accesso al database)
│   ├── collection/              (raccolta dati da Mastodon)
│   ├── analysis/                (AI detection, fact-check, checkworthiness, export)
│   └── graph/                   (costruzione grafo, community detection, visualizzazione)
└── webapp/                    # interfaccia browser (FastAPI, localhost)
    ├── main.py, jobs.py, queries.py, results.py
    └── templates/*.html
```

File/cartelle **non tracciate** ma rilevanti per far girare il progetto (gitignorate, ognuna col motivo):
- `fast-detect-gpt/` — tool esterno per l'AI detection (repo git a sé, ha il proprio `.git`); il suo output finale viene copiato in `data/ai_scores_fast_detect.jsonl` per essere condiviso.
- `fisso/` — copia di lavoro dei codici che girano sul secondo PC (quello con GPU).
- `cache/` — modelli HuggingFace scaricati per il checkworthiness.
- `checkworthy_scores.jsonl`, `fact_check_report*.csv` — risultati fact-checking/checkworthiness, restano locali finché non revisionati (vedi sezione "Dati non ancora condivisi" più sotto).
- `exports/`, `imports/` — cartelle di lavoro del supervisore export/import DB.
- `.pids/`, `.logs/` — stato del supervisore pipeline (PID e log dei processi lanciati dalla webapp).
- `docs/`, `tests/` (quasi tutta) — documentazione di progetto e test, tenuti locali per scelta.

---

## File di configurazione e dati alla radice

**`db/schema.sql`** — Lo schema Postgres completo, unica fonte di verità sulla struttura dati. Tabelle principali:
- `topics` — argomenti di ricerca (es. "Intelligenza Artificiale").
- `instances` — istanze Mastodon scoperte, con utenti attivi e da quale topic sono state trovate.
- `accounts` — account Mastodon (uno per istanza che li ha osservati: lo stesso account reale può comparire più volte se visto da istanze diverse — deduplicato solo a livello di analisi, non nel DB).
- `statuses` — i post, con contenuto, lingua, riferimenti a reblog/reply, colonna `raw` (JSON originale Mastodon per non perdere nulla), `source` (`hashtag` o `user_timeline`), `veracity` (esito fact-check, scala 0-5).
- `status_hashtags`, `mentions` — hashtag e menzioni per post.
- `topic_hashtags` — hashtag scoperti per (topic, istanza), con conteggio uso.
- `reblogs` — arco "booster ha condiviso questo post" (diverso dai reblog visti come post via timeline).
- `follows` — arco "follower segue followed" (rete sociale, separata dalla rete di diffusione).
- `collection_runs` — bookkeeping dei cursori di raccolta incrementale (per hashtag/istanza).
- `ai_labels`, `fact_checks` — tabelle predisposte per i risultati IA/fact-check quando verranno importati nel DB (oggi i risultati vivono come file flat, vedi sotto).
Colonne aggiunte via `ALTER TABLE` (con commento nello schema stesso sul perché): `enriched_at`, `source`, `deleted_at`, `veracity`, `timeline_crawled_at`, `followers_crawled_at`, `following_crawled_at`.

**`data/ai_scores_fast_detect.jsonl`** — Risultato completo dell'AI detection (Fast-DetectGPT): una riga JSON per post, `{"id", "probability", "criterion", "ntokens", "model"}`. **Completo al 100%** (192.822/192.822 post eligible, aggiornato 2026-08-03). Tracciato in git deliberatamente (non nella cartella `fast-detect-gpt/`, che è un repo git annidato e gitignorata) così i colleghi lo hanno senza dover installare/eseguire il tool esterno.

**`post_texts.jsonl`** — Corpus testi filtrato (id, lingua, testo ripulito da HTML, data pubblicazione), prodotto da `snm/analysis/export_texts.py`. È l'input di tutte e tre le pipeline di analisi contenutistica (AI detection, checkworthiness, fact-check). Tracciato in git: senza, `data/ai_scores_fast_detect.jsonl` sarebbe solo un elenco id→probabilità senza testo, illeggibile senza un DB importato e collegato.

**`pipeline.py`** — La pipeline principale di raccolta: per ogni topic in `topic_list.txt`, trova le istanze Mastodon più popolari (via instances.social), scopre gli hashtag più usati su quelle istanze, scarica i post recenti con quegli hashtag. Raccolta incrementale (riparte dal cursore `since_id` dell'ultimo run). Multi-istanza in parallelo (thread pool, un worker per dominio — il rate limit Mastodon è per server, istanze diverse non si intralciano). Se un'istanza rifiuta l'accesso anonimo, tenta automaticamente la registrazione di un account (vedi `instance_registration.py`).

**`instance_blacklist.txt`** — Domini di istanze Mastodon da evitare, un dominio per riga con commento sul motivo (tipicamente "registrazioni chiuse/solo invito", verificato a mano). Letto da `snm/collection/instance_blacklist.py`.

**`topic_list.txt`** — L'elenco reale di argomenti su cui `pipeline.py` raccoglie dati (oggi: intelligenza artificiale, cambiamento climatico, elezioni). Sintassi: un topic per riga, opzionalmente `Nome: alias1, alias2` per usare query di ricerca diverse dal nome visualizzato.

**`topics.example.txt`** — Elenco più ampio di topic di esempio (politica, sport, gaming, musica, ecc.) con sintassi alias completa, usato come riferimento/ispirazione, non è l'input reale della pipeline.

**`requirements.txt`** — Dipendenze di produzione: `requests`, `python-dotenv`, `psycopg2-binary` (Postgres), `infomap`+`python-igraph`+`leidenalg` (community detection), `matplotlib` (grafici), `ddgs` (ricerca web per fact-check), `fastapi`+`starlette`+`python-multipart`+`uvicorn[standard]`+`jinja2` (webapp), `torch`+`transformers` (modelli IA), `networkx`+`pyvis` (grafo).

**`requirements-dev.txt`** — Solo `pytest`, per eseguire la suite di test (in `tests/`, quasi tutta locale/non tracciata).

---

## `snm/` — libreria core

### `snm/config.py`
Gestione token di accesso Mastodon via variabili d'ambiente. `normalize_domain()` converte un dominio nel nome della env var (`mastodon.social` → `MASTODON_TOKEN_MASTODON_SOCIAL`). `get_token()`/`get_optional_token()` leggono il token (il secondo ritorna `None` invece di sollevare eccezione, per gli endpoint pubblici che funzionano anche in anonimo). `check_tokens()` divide una lista di domini in "con token"/"senza token".

### `snm/storage/db.py`
Tutto l'accesso al database: connessione, inizializzazione schema, e una funzione "upsert" (insert-o-aggiorna) per ogni tabella. Pattern ricorrente: ogni funzione fa `INSERT ... ON CONFLICT DO UPDATE ... RETURNING id`, così è idempotente (rilanciare la stessa raccolta non duplica nulla) e ritorna sempre l'id, nuovo o esistente. Funzioni chiave:
- `upsert_topic`, `upsert_instance`, `upsert_account`, `upsert_status` — quest'ultima è ricorsiva: se il post è un reblog, inserisce prima l'originale, poi collega `reblog_of_id`; popola anche hashtag e menzioni associate.
- `insert_reblog`, `insert_follow` — archi di rete, idempotenti (ritornano `bool`: se la riga era nuova o già presente, usato dal merge dell'export/import DB — vedi sotto).
- `list_statuses_to_enrich`, `mark_enriched`, `mark_deleted` — supporto ad `interaction_enrichment.py`.
- `list_accounts_to_crawl`, `mark_timeline_crawled` — supporto a `user_timeline_crawler.py`.
- `list_accounts_for_follow_crawl`, `mark_followers_crawled`, `mark_following_crawled`, `get_or_create_instance_id` — supporto a `follow_crawler.py`.
- `upsert_ai_label`, `upsert_fact_check`, `list_statuses_to_fact_check` — supporto per quando i risultati IA/fact-check verranno importati nel DB (oggi non ancora usate in produzione, i risultati vivono come file flat).
- `record_topic_hashtags`, `record_collection_run`, `get_since_cursor` — bookkeeping della raccolta per hashtag.

### `snm/storage/db_import.py`
Varianti "import-only" delle funzioni sopra, per il merge di dati tra DB di colleghi diversi (via export/import, vedi `snm/analysis/db_export.py`/`run_db_import.py`). Differenza chiave: le `upsert_*` di `db.py` sono pensate per il crawler live e *sovrascrivono* il contenuto a ogni ri-fetch; queste **non toccano mai una riga già esistente** — in caso di conflitto sulla chiave naturale (dominio, mastodon_id) ritornano l'id esistente senza modificare nulla, così un collega può integrare dati senza rischiare di perdere progressi locali (es. `followers_crawled_at`). Ogni funzione ritorna anche un `bool` (riga nuova o già presente), usato per il riepilogo "N nuove / M già presenti" mostrato nella webapp.

### `snm/collection/` — raccolta dati da Mastodon
- **`http_client.py`** — `rate_limited_get()`: unico punto da cui parte ogni richiesta GET verso l'API Mastodon. Rispetta il rate limit (header `X-RateLimit-Remaining`/`Reset`): se la quota è esaurita aspetta fino al reset, poi ritenta una volta se necessario.
- **`instance_discovery.py`** — Cerca le istanze Mastodon più popolari per un topic tramite l'API di instances.social.
- **`instance_registration.py`** — Registra automaticamente un account del progetto su un'istanza (via API ufficiale Mastodon), salva il token in `.env`. Ha anche una modalità `--check` per verificare se un token già registrato è diventato attivo (serve conferma email + eventuale approvazione admin).
- **`instance_blacklist.py`** — Carica/aggiorna `instance_blacklist.txt`.
- **`hashtag_discovery.py`** — Cerca gli hashtag più usati per un topic su un'istanza (endpoint di ricerca Mastodon).
- **`post_collector.py`** — `collect_posts()`: scarica i post con un dato hashtag dalla tag timeline di un'istanza, paginando, filtrando per lingua (`ALLOWED_LANGUAGES = {en, it, es, ro}`), supporta raccolta incrementale via `since_id`.
- **`topics.py`** — Legge il file dei topic (`topic_list.txt`), con supporto alla sintassi alias (`Nome: query1, query2`).
- **`progress.py`** — `ProgressTracker`: logga periodicamente (ogni 30s, thread dedicato) lo stato di avanzamento di un download multi-istanza in parallelo — niente barre di progresso interattive (con N thread si pesterebbero), una riga di log leggibile anche su file.
- **`interaction_enrichment.py`** — Per ogni post già raccolto con boost/reply dichiarati, recupera chi ha fatto boost (→ tabella `reblogs`) e il thread di risposte (→ righe `statuses` collegate). Costruisce la rete di diffusione necessaria per l'influence maximization. Circuit breaker per istanza (5 errori consecutivi = abbandona quell'istanza per questo run, riprendibile al prossimo).
- **`user_timeline_crawler.py`** — Scarica la cronologia recente degli account già noti, per catturare boost fatti da loro (direzione di amplificazione che la sola raccolta per hashtag non vede) e densificare la rete.
- **`follow_crawler.py`** — Scarica le relazioni follower/following degli account noti (rete sociale, distinta dalla rete di diffusione). Ogni nuovo follower/following scoperto diventa un nuovo account nel DB (crescita del corpus accettata). Supporta `--before <data>` per limitare lo scope a un resume mirato senza inseguire nuovi account scoperti nel frattempo.
- **`mastodon_scraping.py`** — Piccola utility di stampa per ispezionare a mano le istanze trovate per un topic (uso interattivo/debug, non parte della pipeline in produzione — nota: il topic è scritto a mano nel codice, non parametrico).

### `snm/analysis/` — analisi contenutistica
- **`export_texts.py`** — Estrae da `statuses` un JSONL con id/lingua/testo pulito (HTML→testo piano)/data pubblicazione, escludendo post cancellati, reblog puri (testo vuoto) e testi vuoti dopo pulizia. Produce `post_texts.jsonl`, l'input di tutte le pipeline sotto.
- **`checkworthiness.py`** — Filtro di verificabilità: un modello IA (`SophieTr/xlm-roberta-base-claim-detection-clef21-24`) stima se un post contiene un'affermazione controllabile o solo un'opinione personale. Soglia 0.6. Include l'ottimizzazione di ordinare i testi per lunghezza prima di fare i batch (altrimenti un outlier lunghissimo fa pagare padding a tutto il batch — misurato 69% di spreco senza).
- **`run_checkworthiness.py`** — Pipeline eseguibile e **resumabile** che applica `checkworthiness.py` a tutto `post_texts.jsonl` e salva il punteggio per ogni post in `checkworthy_scores.jsonl` (cache). Nata per evitare di ricalcolare il checkworthiness (deterministico, stesso testo → stesso punteggio) a ogni riavvio del fact-checking.
- **`fact_check.py`** — Pipeline di fact-checking: per ogni post che ha superato il checkworthiness, cerca prove sul web (ricerca generica via `ddgs` + Wikipedia dedicata con circuit breaker anti-rate-limit + opzionale Google Fact Check Tools), passa tutto a un modello IA (Ollama Cloud) con la data di pubblicazione del post (per non giudicarlo con informazioni successive all'evento), ottiene un verdetto su scala vero/perlopiù vero/misto/perlopiù falso/falso/non verificabile. Multi-thread (un pool di chiavi Ollama Cloud, rotazione automatica su quota esaurita). Resumabile.
- **`db_export.py`** — Esporta le tabelle di raccolta (tutte tranne `collection_runs`, `ai_labels`, `fact_checks` e la colonna `veracity` — dati gated) in uno zip di JSONL, con ogni riferimento ad account/status sostituito dalla sua chiave naturale (dominio + mastodon_id) invece dell'id SERIAL locale, per essere portabile tra DB diversi. Streaming (cursori nominati) per le tabelle grandi.
- **`run_db_import.py`** — Importa uno zip prodotto da `db_export.py` in questo DB, tabella per tabella nell'ordine di dipendenza (topics→instances→accounts→statuses→il resto), risolvendo i riferimenti via chiave naturale, usando le funzioni non distruttive di `db_import.py`. Ritorna un riepilogo nuove/già presenti per tabella.
- **`import_ai_labels.py`** — Importa un JSONL di risultati Fast-DetectGPT nella tabella `ai_labels` del DB. Gated: non ancora usato in produzione (i risultati restano come file flat finché non revisionati).
- **`chain_stats.py`** — Statistica sulla lunghezza delle "catene" di post (reply/reblog concatenati): quante catene di ogni lunghezza esistono, quanti post coinvolgono. Query SQL ricorsiva.
- **`check_language_distribution.py`** — Analisi/grafico della distribuzione dei post per lingua nel DB, distinguendo il corpus di analisi (lingue ammesse) dal resto della rete (reblog/thread raccolti solo per densificare il grafo).

### `snm/graph/` — costruzione e analisi del grafo
- **`builder.py`** — Il cuore dell'analisi di rete. `build_user_graph()`: proietta il DB in un grafo diretto pesato utente→utente (archi = boost, reply, mention), fondendo le copie duplicate dello stesso account reale osservate da istanze diverse. `build_combined_graph()`: stessa cosa più gli archi di follow (rete sociale), tenuta separata dalla vista di diffusione pura perché la community detection calibrata (vedi sotto) è validata solo su quest'ultima. `normalize_log_weights()`: normalizzazione logaritmica dei pesi (scelta dopo test empirici su 3 alternative — vedi commento nel codice). `detect_communities_infomap()`: community detection via map equation (Infomap), sfrutta la direzione degli archi. `compute_report()`: calcola tutte le metriche (nodi isolati, componenti, community, modularità, gate metodologico IM/IBM vs modelli epidemici).
- **`compare_communities.py`** — Confronta Louvain (modularità, non diretto) e Infomap (map equation, diretto) sulla stessa proiezione, usando il flow-containment (quanto peso resta dentro la stessa community) come criterio, non la modularità (che Infomap non ottimizza).
- **`cd_report_figures.py`** — Confronto a tre (Louvain/Leiden/Infomap) con figure per il report di progetto: codelength, flow-containment osservato vs atteso per caso, distribuzione dimensioni community.
- **`infomap_significance.py`** — Verifica se la struttura a community trovata da Infomap è genuina o solo rumore statistico: confronto contro un modello nullo (stessa sequenza di grado, configuration model), z-score.
- **`export_leiden_graph.py`** — Esporta il grafo con community Leiden come attributo nodo, in due versioni (completa e filtrata escludendo componenti piccolissime), per ispezione in Gephi.
- **`export_leiden_html.py`** — Visualizzazione HTML via libreria GPU (Cosmograph/WebGL) dei grafi Leiden esportati sopra, layout che si ferma da solo dopo pochi secondi.
- **`visualize.py`** — Visualizzazione HTML di un sottografo filtrato (top N nodi per grado, o per topic/community), via pyvis (CPU, adatta a max ~1000 nodi).
- **`visualize_full.py`** — Visualizzazione HTML del grafo completo su GPU (stessa libreria di `export_leiden_html.py`), gestisce decine di migliaia di nodi.

---

## `webapp/` — interfaccia browser

FastAPI + Jinja2, pensata per girare solo in locale (no autenticazione, no build step, nessun framework JS).

- **`main.py`** — Tutte le route. Dashboard (statistiche generali), `/posts` (sfoglia post dal DB, filtro lingua a checkbox multi-selezione), `/ai-detection` e `/fact-check` (sfoglia risultati completi paginati, con filtri a checkbox su probabilità/lingua/verdetto — i risultati vengono dai file jsonl/csv, non dal DB), `/accounts` (incrocio bot/produzione IA), `/pipelines` (supervisore, sotto), `/db-sync` (export/import DB, sotto).
- **`jobs.py`** — Supervisore pipeline: avvia/monitora/ferma gli script di raccolta e analisi dal browser invece che da terminale. Ogni pipeline registrata in `PIPELINES` con nome, comando, se accetta un parametro. Lanciati come processi "detached" (sopravvivono a un riavvio della webapp), stato vivo/morto sempre ricalcolato da `tasklist` (mai fidarsi della sola presenza del PID file). `parse_progress()` estrae una percentuale reale dall'ultimo log se riconosce un pattern "N/M" (quasi tutte le pipeline lo stampano), altrimenti la webapp mostra una barra generica "in corso".
- **`queries.py`** — Query dirette al DB per la webapp (elenco post con filtro lingua multi-selezione, dettaglio post, conteggi account/bot, lingue distinte per popolare i filtri).
- **`results.py`** — Caricamento e analisi dei file di risultato (`ai_scores_fast_detect.jsonl`, `fact_check_report.csv`) con cache in memoria (invalidata su cambio dimensione/data del file, evita di rileggere file grandi a ogni richiesta). Funzioni di filtro (per probabilità, per verdetto) e statistiche (istogramma probabilità, conteggio verdetti).
- **`templates/`** — Una pagina HTML per route (`dashboard.html`, `posts.html`, `post_detail.html`, `accounts.html`, `ai_detection.html`, `fact_check.html`, `pipelines.html`, `db_sync.html`), estendono tutte `base.html` (CSS condiviso, tema chiaro/scuro automatico, barra di navigazione).

---

## Dati non ancora condivisi (gated)

`checkworthy_scores.jsonl` (cache checkworthiness) e `fact_check_report.csv` (risultati fact-check, ancora in corso) restano **file locali, non tracciati in git**: la decisione presa è di condividerli con i colleghi solo dopo revisione dei risultati (o importarli nel DB tramite `import_ai_labels.py`/funzioni equivalenti quando pronte). L'AI detection (`data/ai_scores_fast_detect.jsonl`) è invece completa e già condivisa, come descritto sopra.

---

## Come far girare il progetto da zero (riepilogo pratico)

1. `pip install -r requirements.txt` (+ `requirements-dev.txt` per i test).
2. `.env` con `DATABASE_URL` e, se serve raccogliere dati nuovi, i token Mastodon/API esterne (vedi `snm/config.py`, `snm/collection/instance_registration.py`).
3. `python -m snm.storage.db` non esiste come comando a sé: lo schema si inizializza automaticamente (`init_schema`) al primo avvio di qualunque pipeline.
4. Per avere subito dati e risultati senza raccogliere nulla: importare un export DB di un collega (`webapp` → `/db-sync` → Importa), usare `data/ai_scores_fast_detect.jsonl` già incluso, e `post_texts.jsonl` già incluso.
5. `uvicorn webapp.main:app --port 8080` per la webapp; da lì, sezione Pipeline per avviare/monitorare tutto il resto.

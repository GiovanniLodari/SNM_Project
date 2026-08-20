-- db/schema.sql
CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS instances (
    id SERIAL PRIMARY KEY,
    domain TEXT UNIQUE NOT NULL,
    discovered_via_topic_id INTEGER REFERENCES topics(id),
    active_users INTEGER,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER NOT NULL REFERENCES instances(id),
    mastodon_id TEXT NOT NULL,
    acct TEXT NOT NULL,
    username TEXT NOT NULL,
    bot BOOLEAN NOT NULL DEFAULT FALSE,
    raw JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (instance_id, mastodon_id)
);

CREATE TABLE IF NOT EXISTS statuses (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER NOT NULL REFERENCES instances(id),
    mastodon_id TEXT NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    content TEXT,
    language TEXT,
    created_at TIMESTAMPTZ,
    reblog_of_id INTEGER REFERENCES statuses(id),
    in_reply_to_mastodon_id TEXT,
    in_reply_to_id INTEGER REFERENCES statuses(id),
    raw JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (instance_id, mastodon_id)
);

CREATE TABLE IF NOT EXISTS status_hashtags (
    status_id INTEGER NOT NULL REFERENCES statuses(id),
    hashtag TEXT NOT NULL,
    PRIMARY KEY (status_id, hashtag)
);

CREATE TABLE IF NOT EXISTS mentions (
    status_id INTEGER NOT NULL REFERENCES statuses(id),
    mentioned_acct TEXT NOT NULL,
    PRIMARY KEY (status_id, mentioned_acct)
);

CREATE TABLE IF NOT EXISTS topic_hashtags (
    topic_id INTEGER NOT NULL REFERENCES topics(id),
    instance_id INTEGER NOT NULL REFERENCES instances(id),
    hashtag TEXT NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (topic_id, instance_id, hashtag)
);

-- Archi di diffusione recuperati a posteriori (arricchimento interazioni):
-- "booster_account_id ha boostato status_id". I reply recuperati dal context
-- diventano invece righe normali di statuses.
CREATE TABLE IF NOT EXISTS reblogs (
    status_id INTEGER NOT NULL REFERENCES statuses(id),
    booster_account_id INTEGER NOT NULL REFERENCES accounts(id),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (status_id, booster_account_id)
);

-- Marcatore di avanzamento dell'arricchimento (NULL = non ancora processato).
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;

-- Provenienza del post: 'hashtag' = raccolta per hashtag (pipeline),
-- 'user_timeline' = crawler timeline utenti. Le analisi contenutistiche
-- (AI detection, fact-checking) possono filtrare; la rete usa tutto.
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'hashtag';

-- Marcatore crawl timeline: quando abbiamo scaricato i post recenti dell'account.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS timeline_crawled_at TIMESTAMPTZ;

-- Ricerca testuale nel corpus (webapp: /api/posts?q=..., /api/fact-check?search=...).
--
-- Le due ricerche usano `content ILIKE '%termine%'`, che senza indice obbliga a
-- leggere l'intera tabella: misurato su 1,8 milioni di post, una ricerca costa
-- oltre trenta secondi, cioe' una pagina che sembra bloccata. L'indice trigram
-- riporta la stessa interrogazione nell'ordine dei millisecondi.
--
-- Misurato: la stessa ricerca passa da 37 secondi a 38 millisecondi, e il
-- conteggio dei risultati da 24 secondi a 17.
--
-- ATTENZIONE: questo file viene eseguito da `init_schema` all'avvio della
-- webapp. Su un database vuoto la creazione e' istantanea; su uno gia' popolato
-- richiede alcuni minuti e parecchio spazio (circa 490 MB su un corpus di 1,8
-- milioni di post, quasi la meta' della tabella), quindi il primo avvio dopo
-- questa aggiunta resta fermo per quel tempo. `IF NOT EXISTS` fa si' che accada
-- una volta sola.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS statuses_content_trgm
    ON statuses USING gin (content gin_trgm_ops);

-- Post risultato cancellato sull'istanza di origine (404 durante l'arricchimento).
-- Si conserva comunque: contenuto già salvato in raw, e la cancellazione stessa
-- è un segnale (spesso correla con moderazione). NULL = mai visto cancellato.
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Esito sintetico del fact-checking (fase 2): livello ordinale di veridicità,
-- NULL = non ancora verificato. Scala definita in fase 2 (valori bassi = vero,
-- alti = falso). I dettagli (fonte, verdetto, data) andranno nella futura
-- tabella fact_checks.
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS veracity SMALLINT;

CREATE TABLE IF NOT EXISTS collection_runs (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES topics(id),
    instance_id INTEGER NOT NULL REFERENCES instances(id),
    hashtag TEXT NOT NULL,
    max_id_cursor TEXT,
    posts_collected INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

-- Marcatori crawl relazioni follow (fase densificazione grafo): NULL = non
-- ancora scaricato. Colonne separate perché followers e following sono due
-- chiamate API indipendenti, resumabili singolarmente.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS followers_crawled_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS following_crawled_at TIMESTAMPTZ;

-- Arco 'follower segue followed', scoperto dal crawler di relazioni follow.
-- Rete sociale statica, distinta dagli archi di diffusione (reblogs/statuses).
CREATE TABLE IF NOT EXISTS follows (
    follower_account_id INTEGER NOT NULL REFERENCES accounts(id),
    followed_account_id INTEGER NOT NULL REFERENCES accounts(id),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_account_id, followed_account_id)
);

-- Indice per query 'chi segue X' (letture dal graph builder, fase diffusione).
CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows(followed_account_id);

-- Fase 1: probabilita' di generazione IA per post (Fast-DetectGPT). Un run
-- successivo con lo stesso status sovrascrive (ON CONFLICT), non accumula:
-- vale l'ultima esecuzione, il modello usato resta tracciato per confronto.
CREATE TABLE IF NOT EXISTS ai_labels (
    status_id INTEGER PRIMARY KEY REFERENCES statuses(id),
    ai_probability REAL NOT NULL,
    criterion REAL,
    model TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fase 2: dettaglio fact-checking (LLM via Ollama Cloud + ricerca web
-- gratuita: ddgs, Wikipedia, opzionale Google Fact Check Tools). Scala di
-- statuses.veracity: 0=vero, 1=perlopiu' vero, 2=misto/incerto,
-- 3=perlopiu' falso, 4=falso, 5=non verificabile (evidenza insufficiente,
-- distinto da NULL = non ancora processato). Un run successivo sullo stesso
-- status sovrascrive (ON CONFLICT), non accumula.
CREATE TABLE IF NOT EXISTS fact_checks (
    status_id INTEGER PRIMARY KEY REFERENCES statuses(id),
    verdict TEXT NOT NULL,
    reasoning TEXT,
    evidence JSONB,
    model TEXT NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Post di un dato account.
--
-- Serve a due letture per singolo account che sembrano innocue e non lo erano:
-- il conteggio dei post nell'anagrafica delle classifiche
-- (`webapp/queries.py::get_accounts_by_ids`) e quello nel dettaglio di un
-- account (`webapp/api.py`). Sono sottoquery correlate, cioe' una per account, e
-- senza indice ognuna scandiva l'intera tabella: per i dieci profili di una
-- classifica erano dieci scansioni da 1,8 milioni di righe, **16,8 s misurati**.
-- Con l'indice la stessa chiamata costa 7 ms.
--
-- Le due colonne e non una: `deleted_at` in coda permette a
-- `account_id = X AND deleted_at IS NULL` di risolversi nel solo indice, senza
-- risalire alla tabella, e lascia comunque `account_id` come colonna guida per
-- chi non filtra sulla cancellazione.
--
-- Nota per chi legge la storia di questo file: un indice **non** avrebbe
-- risolto la lentezza degli aggregati di riepilogo (vedi il commento delle viste
-- qui sotto). Le due cose si somigliano e sono opposte: un aggregato visita
-- tutte le righe comunque, una sottoquery correlata cerca un valore preciso. La
-- prima vuole una vista, la seconda un indice.
CREATE INDEX IF NOT EXISTS idx_statuses_account ON statuses(account_id, deleted_at);

-- ---------------------------------------------------------------------------
-- Viste materializzate dei riepiloghi
--
-- Le cifre di apertura dei capitoli - quanti post, quanti autori, come si
-- distribuiscono fra lingue e istanze, quanti follower dichiarano i profili -
-- sono aggregati su tutto il corpus. Calcolarle in lettura significa scandire
-- 1,8 milioni di statuses e 660 mila accounts a ogni richiesta: misurato,
-- `corpus_composition` costava 13,8 s e `accounts_population` 16,7 s, contro i
-- 19 ms della pagina di post, che invece e' indicizzata e paginata.
--
-- Un indice non risolve: e' stato provato un indice di copertura a cinque
-- colonne e `COUNT(DISTINCT account_id)` e' passato da 1631 a 1639 ms. Un
-- aggregato che deve visitare tutte le righe le visita comunque; l'indice rende
-- piu' economica la visita, non la evita.
--
-- Questi numeri cambiano solo quando la pipeline scrive. Vengono quindi
-- calcolati una volta alla scrittura e letti come una riga: e' il senso di
-- queste viste. Il ricalcolo si chiede con `snm.storage.viste.aggiorna_viste`,
-- che la pipeline invoca alla fine di un ingest.
--
-- `WITH NO DATA`: `init_schema` gira a ogni avvio dell'applicazione, e popolare
-- qui dentro vorrebbe dire pagare mezzo minuto di scansioni a ogni boot. Finche'
-- una vista non e' popolata, `webapp/queries.py` ricade sulla query dal vivo -
-- lenta ma corretta - invece di rispondere con un errore.
-- ---------------------------------------------------------------------------

-- Le cifre scalari del corpus: una riga sola.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_corpus_totali AS
SELECT COUNT(*)                                          AS posts_total,
       COUNT(DISTINCT s.account_id)                      AS authors_total,
       COUNT(DISTINCT s.instance_id)                     AS instances_total,
       MIN(s.created_at)                                 AS first_post_at,
       MAX(s.created_at)                                 AS last_post_at,
       COUNT(*) FILTER (WHERE s.language IS NULL)        AS posts_senza_lingua
FROM statuses s
WHERE s.deleted_at IS NULL
WITH NO DATA;

-- Post per lingua. Non limitata a TOP_LINGUE: il taglio lo fa la query di
-- lettura, e su un centinaio di righe costa nulla. Serve anche a
-- `distinct_languages`, che altrimenti fa un SELECT DISTINCT su 1,8M righe.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_corpus_lingue AS
SELECT s.language, COUNT(*) AS posts
FROM statuses s
WHERE s.deleted_at IS NULL AND s.language IS NOT NULL
GROUP BY s.language
WITH NO DATA;

-- Post per istanza, con quanti autori distinti e quanti post di account che si
-- dichiarano bot. E' la query piu' costosa del capitolo: due join piu' un
-- COUNT(DISTINCT), 4,9 s misurati.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_corpus_istanze AS
SELECT i.domain,
       COUNT(*)                            AS posts,
       COUNT(DISTINCT s.account_id)        AS accounts,
       COUNT(*) FILTER (WHERE a.bot)       AS bot_posts
FROM statuses s
JOIN instances i ON i.id = s.instance_id
JOIN accounts a ON a.id = s.account_id
WHERE s.deleted_at IS NULL
GROUP BY i.domain
WITH NO DATA;

-- Post per dichiarazione di bot dell'autore. Due righe.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_posts_per_bot AS
SELECT a.bot, COUNT(*) AS posts
FROM statuses s
JOIN accounts a ON a.id = s.account_id
WHERE s.deleted_at IS NULL
GROUP BY a.bot
WITH NO DATA;

-- Account per istanza. Due righe per dominio.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_accounts_istanze AS
SELECT i.domain,
       COUNT(*)                       AS accounts,
       COUNT(*) FILTER (WHERE a.bot)  AS bot_accounts
FROM accounts a
JOIN instances i ON i.id = a.instance_id
GROUP BY i.domain
WITH NO DATA;

-- Account per dichiarazione di bot. Due righe.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_accounts_per_bot AS
SELECT a.bot, COUNT(*) AS accounts
FROM accounts a
GROUP BY a.bot
WITH NO DATA;

-- I follower dichiarati, estratti una volta sola da `accounts.raw`.
--
-- E' la voce piu' costosa dell'applicazione: `followers_count` vive dentro un
-- documento JSONB non validato, quindi leggerlo per 660 mila profili vuol dire
-- aprire 660 mila documenti e applicare a ciascuno un test con espressione
-- regolare. Qui diventa una colonna `bigint` in una vista stretta, e la stessa
-- statistica si calcola scandendo righe piccole invece di JSON.
--
-- Il CASE e' lo stesso di `webapp/queries.py` (_FOLLOWERS) e va tenuto
-- allineato: garantisce che il cast non venga valutato su un valore che non
-- passa il controllo, cosa che un filtro nella WHERE non garantirebbe. Il tetto
-- di plausibilita' NON si applica qui: scartare in vista impedirebbe di contare
-- gli scartati, che la pagina dichiara.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_account_followers AS
SELECT a.id AS account_id,
       a.bot,
       CASE WHEN (a.raw->>'followers_count') ~ '^[0-9]+$'
            THEN (a.raw->>'followers_count')::bigint END AS followers
FROM accounts a
WITH NO DATA;

-- Account distinti che hanno almeno un post non cancellato. Una riga.
-- Separata da mv_corpus_totali perche' la legge il capitolo sugli account, e
-- tenerle insieme costringerebbe a ricalcolare l'una per aggiornare l'altra.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_accounts_con_post AS
SELECT COUNT(DISTINCT s.account_id) AS accounts_con_post
FROM statuses s
WHERE s.deleted_at IS NULL
WITH NO DATA;

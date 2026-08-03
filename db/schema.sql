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

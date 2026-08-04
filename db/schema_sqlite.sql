-- DB/schema_sqlite.sql

CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE NOT NULL,
    discovered_via_topic_id INTEGER REFERENCES topics(id),
    active_users INTEGER,
    discovered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id INTEGER NOT NULL REFERENCES instances(id),
    mastodon_id TEXT NOT NULL,
    acct TEXT NOT NULL,
    username TEXT NOT NULL,
    bot BOOLEAN NOT NULL DEFAULT 0,
    raw TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    timeline_crawled_at TEXT,
    followers_crawled_at TEXT,
    following_crawled_at TEXT,
    UNIQUE (instance_id, mastodon_id)
);

CREATE TABLE IF NOT EXISTS statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id INTEGER NOT NULL REFERENCES instances(id),
    mastodon_id TEXT NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    content TEXT,
    language TEXT,
    created_at TEXT,
    reblog_of_id INTEGER REFERENCES statuses(id),
    in_reply_to_mastodon_id TEXT,
    in_reply_to_id INTEGER REFERENCES statuses(id),
    raw TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    enriched_at TEXT,
    source TEXT NOT NULL DEFAULT 'hashtag',
    deleted_at TEXT,
    veracity INTEGER,
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
    discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (topic_id, instance_id, hashtag)
);

CREATE TABLE IF NOT EXISTS reblogs (
    status_id INTEGER NOT NULL REFERENCES statuses(id),
    booster_account_id INTEGER NOT NULL REFERENCES accounts(id),
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (status_id, booster_account_id)
);

CREATE TABLE IF NOT EXISTS collection_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL REFERENCES topics(id),
    instance_id INTEGER NOT NULL REFERENCES instances(id),
    hashtag TEXT NOT NULL,
    max_id_cursor TEXT,
    posts_collected INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT
);

CREATE TABLE IF NOT EXISTS follows (
    follower_account_id INTEGER NOT NULL REFERENCES accounts(id),
    followed_account_id INTEGER NOT NULL REFERENCES accounts(id),
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (follower_account_id, followed_account_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows(followed_account_id);

CREATE TABLE IF NOT EXISTS ai_labels (
    status_id INTEGER PRIMARY KEY REFERENCES statuses(id),
    ai_probability REAL NOT NULL,
    criterion REAL,
    model TEXT NOT NULL,
    detected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fact_checks (
    status_id INTEGER PRIMARY KEY REFERENCES statuses(id),
    verdict TEXT NOT NULL,
    reasoning TEXT,
    evidence TEXT,
    model TEXT NOT NULL,
    checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

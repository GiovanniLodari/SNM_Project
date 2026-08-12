"""Conta, per ogni utente, quanti post sono AI e quanti umani, e divide gli utenti
in due gruppi (piu' post AI / piu' post umani).

Catena:
  1) utente -> lista dei suoi post  (dal DB, oppure da un JSON gia' pronto)
  2) file JSONL con le probabilita' AI per post:
        {"id": <post_id>, "probability": <P(AI)>, ...}
  3) per utente: n. post AI (probability >= soglia) vs n. post umani
  4) file principale: id utente + booleano "piu' AI che umani" (+ conteggi)
  5) due file separati: id degli utenti "piu' AI" e id degli utenti "piu' umani"

Il file principale e' gia' utilizzabile come --labels di influence_pmia.py
(usa il campo more_ai come etichetta: --label-field more_ai --positive-value true).

Uso tipico (costruendo utente->post dal DB):
  python ai_users.py --ai-file post_ai_scores.jsonl
Oppure con la mappa utente->post gia' pronta:
  python ai_users.py --ai-file post_ai_scores.jsonl --user-posts user_posts.jsonl
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from pathlib import Path


# =========================================================================== #
#  >>> CONFIGURA QUI <<<  (poi lancia solo:  python ai_users.py)
# =========================================================================== #
# File JSONL con le probabilita' AI per post ({"id":.., "probability":..}). OBBLIGATORIO.
AI_FILE     = str(Path(__file__).resolve().parent.parent / "data" / "ai_scores.jsonl")

# Mappa utente->post gia' pronta. Se la lasci None, viene costruita dal DB
# (serve DATABASE_URL nel .env) e salvata in OUT_USER_POSTS.
USER_POSTS  = None                 # es. r"user_posts.jsonl"  oppure  None

AI_THRESHOLD = 0.5                 # probability >= soglia => post AI
TIES         = "exclude"           # dove finiscono i pareggi: "exclude" | "human" | "ai"
CANONICALIZE = False               # True = fonde le copie cache degli account (coerente col grafo)

POST_ID_FIELD = "id"               # campo id-post nel file AI
PROB_FIELD    = "probability"      # campo probabilita' nel file AI

# File di output (creati accanto allo script / cartella corrente)
OUT_USER_POSTS  = r"user_posts.jsonl"
OUT_USERS       = r"users_ai_vs_human.jsonl"
OUT_MORE_AI     = r"users_more_ai.json"
OUT_MORE_HUMAN  = r"users_more_human.json"
# =========================================================================== #


# --------------------------------------------------------------------------- #
#  Lettura del file delle probabilita' AI (JSONL) -> {post_id(str): P(AI)}
# --------------------------------------------------------------------------- #
def load_ai_probabilities(path, post_id_field, prob_field):
    probs = {}
    with open(path, encoding="utf-8") as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"[warn] riga {i} del file AI non valida, saltata: {e}", file=sys.stderr)
                continue
            pid = obj.get(post_id_field)
            p = obj.get(prob_field)
            if pid is None or p is None:
                continue
            probs[str(pid)] = float(p)   # chiave come stringa: evita mismatch int/str
    return probs


# --------------------------------------------------------------------------- #
#  utente -> lista post: dal DB oppure da file
# --------------------------------------------------------------------------- #
def load_user_posts_from_file(path):
    """Accetta JSONL {"user_id":.., "post_ids":[..]} oppure un dict JSON
    {user_id: [post_ids]}."""
    with open(path, encoding="utf-8") as f:
        text = f.read().strip()
    users = {}   # user_id(str) -> {"acct":.., "post_ids":[..]}
    if text.startswith("{") and '"post_ids"' not in text.split("\n", 1)[0]:
        # dict {user_id: [post_ids]}
        for uid, posts in json.loads(text).items():
            users[str(uid)] = {"acct": None, "post_ids": [str(p) for p in posts]}
    else:
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            o = json.loads(line)
            uid = str(o.get("user_id", o.get("id")))
            users[uid] = {"acct": o.get("acct"),
                          "post_ids": [str(p) for p in o.get("post_ids", [])]}
    return users


USER_POSTS_QUERY = """
    SELECT s.account_id, s.id, a.acct
    FROM statuses s JOIN accounts a ON a.id = s.account_id
    WHERE s.deleted_at IS NULL
"""


def build_user_posts_from_db(conn, canonicalize):
    """utente -> {acct, post_ids} leggendo statuses dal DB. Se canonicalize=True,
    fonde le copie cache dello stesso account (come graph_builder) cosi' gli id
    coincidono con i nodi del grafo."""
    canon_id_of, canon_acct_of = {}, {}
    if canonicalize:
        import graph_builder as gb
        with conn.cursor() as cur:
            cur.execute(gb.NODE_QUERY)
            groups = defaultdict(list)
            for account_id, acct, bot, followers, domain in cur.fetchall():
                groups[gb._canon_acct(acct, domain)].append(account_id)
            for canon_acct, members in groups.items():
                rep = min(members)
                for account_id in members:
                    canon_id_of[account_id] = rep
                    canon_acct_of[rep] = canon_acct

    users = defaultdict(lambda: {"acct": None, "post_ids": []})
    with conn.cursor() as cur:
        cur.execute(USER_POSTS_QUERY)
        for account_id, status_id, acct in cur.fetchall():
            uid = canon_id_of.get(account_id, account_id)
            u = users[str(uid)]
            u["post_ids"].append(str(status_id))
            if u["acct"] is None:
                u["acct"] = canon_acct_of.get(uid, acct)
    return users


# --------------------------------------------------------------------------- #
#  Conteggio AI vs umano per utente + classificazione
# --------------------------------------------------------------------------- #
def classify_users(users, probs, threshold, ties):
    """Per ogni utente conta post AI/umani e decide il gruppo.
    ties: 'exclude' | 'human' | 'ai' (dove finiscono i pareggi/senza punteggio)."""
    rows, more_ai_ids, more_human_ids = [], [], []
    for uid, info in users.items():
        ai = human = unscored = 0
        for pid in info["post_ids"]:
            p = probs.get(pid)
            if p is None:
                unscored += 1
            elif p >= threshold:
                ai += 1
            else:
                human += 1

        if ai > human:
            group = "ai"
        elif human > ai:
            group = "human"
        else:                      # pareggio (compreso 0-0)
            group = ties           # 'exclude' | 'human' | 'ai'

        more_ai = group == "ai"
        rows.append({
            "user_id": _maybe_int(uid),
            "acct": info.get("acct"),
            "ai_posts": ai,
            "human_posts": human,
            "unscored_posts": unscored,
            "total_scored": ai + human,
            "more_ai": more_ai,
        })
        if group == "ai":
            more_ai_ids.append(_maybe_int(uid))
        elif group == "human":
            more_human_ids.append(_maybe_int(uid))
    return rows, more_ai_ids, more_human_ids


def _maybe_int(x):
    try:
        return int(x)
    except (TypeError, ValueError):
        return x


# --------------------------------------------------------------------------- #
def main():
    # I default vengono dal blocco CONFIGURA QUI: puoi lanciare "python ai_users.py".
    p = argparse.ArgumentParser(description="Post AI vs umani per utente + split")
    p.add_argument("--ai-file", default=AI_FILE, help="JSONL con id post e probabilita' AI")
    p.add_argument("--user-posts", default=USER_POSTS, help="JSON/JSONL utente->post (se assente: dal DB)")
    p.add_argument("--ai-threshold", type=float, default=AI_THRESHOLD,
                   help="probability >= soglia => post AI")
    p.add_argument("--post-id-field", default=POST_ID_FIELD)
    p.add_argument("--prob-field", default=PROB_FIELD)
    p.add_argument("--ties", choices=["exclude", "human", "ai"], default=TIES,
                   help="dove mettere i pareggi/utenti senza post con punteggio")
    p.add_argument("--canonicalize", action="store_true", default=CANONICALIZE,
                   help="fonde le copie cache degli account (coerente col grafo)")
    p.add_argument("--out-user-posts", default=OUT_USER_POSTS)
    p.add_argument("--out-users", default=OUT_USERS)
    p.add_argument("--out-more-ai", default=OUT_MORE_AI)
    p.add_argument("--out-more-human", default=OUT_MORE_HUMAN)
    args = p.parse_args()

    if not args.ai_file or not os.path.exists(args.ai_file):
        sys.exit(f"ERRORE: file AI non trovato: {args.ai_file!r}. "
                 "Imposta AI_FILE nella sezione CONFIGURA QUI (in cima allo script).")

    # 1) utente -> post
    if args.user_posts:
        users = load_user_posts_from_file(args.user_posts)
        print(f"[utente->post] caricati {len(users)} utenti da {args.user_posts}", file=sys.stderr)
    else:
        import graph_builder as gb
        try:
            from dotenv import load_dotenv
            load_dotenv()
        except ImportError:
            pass
        conn = gb.get_connection(os.environ["DATABASE_URL"])
        users = build_user_posts_from_db(conn, args.canonicalize)
        conn.close()
        print(f"[utente->post] costruiti {len(users)} utenti dal DB", file=sys.stderr)
        # salva anche la mappa utente->post (era una delle cose richieste)
        with open(args.out_user_posts, "w", encoding="utf-8") as f:
            for uid, info in users.items():
                f.write(json.dumps({"user_id": _maybe_int(uid), "acct": info["acct"],
                                    "post_ids": [_maybe_int(x) for x in info["post_ids"]]},
                                   ensure_ascii=False) + "\n")
        print(f"[salvato] {args.out_user_posts}", file=sys.stderr)

    # 2) probabilita' AI per post
    probs = load_ai_probabilities(args.ai_file, args.post_id_field, args.prob_field)
    print(f"[AI] caricate probabilita' per {len(probs)} post", file=sys.stderr)

    # 3-4) conteggio e classificazione
    rows, more_ai_ids, more_human_ids = classify_users(users, probs, args.ai_threshold, args.ties)

    with open(args.out_users, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    # 5) split
    with open(args.out_more_ai, "w", encoding="utf-8") as f:
        json.dump(more_ai_ids, f, ensure_ascii=False)
    with open(args.out_more_human, "w", encoding="utf-8") as f:
        json.dump(more_human_ids, f, ensure_ascii=False)

    n = len(rows)
    ties = n - len(more_ai_ids) - len(more_human_ids)
    print("\n=== RISULTATO ===")
    print(f"utenti totali:        {n}")
    print(f"piu' post AI:         {len(more_ai_ids)}  -> {args.out_more_ai}")
    print(f"piu' post umani:      {len(more_human_ids)}  -> {args.out_more_human}")
    print(f"pareggi/senza dati:   {ties}  (ties={args.ties})")
    print(f"file principale:      {args.out_users}")


if __name__ == "__main__":
    main()
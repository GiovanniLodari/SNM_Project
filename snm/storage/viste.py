"""Aggiornamento delle viste materializzate dei riepiloghi.

Le cifre di apertura dei capitoli sono aggregati su tutto il corpus: 1,8 milioni
di statuses, 660 mila accounts. Calcolarle in lettura costava 13,8 s per la
composizione del corpus e 16,7 s per la popolazione degli account, contro i
19 ms della pagina di post - che invece e' indicizzata e paginata. Sono cifre
che cambiano solo quando la pipeline scrive, quindi si calcolano alla scrittura
e si leggono come una riga. Le viste sono dichiarate in `DB/schema.sql`, dove il
commento spiega anche perche' un indice non basta.

Questo modulo e' l'unico punto che le nomina in scrittura: chi aggiunge una
vista allo schema la aggiunge a `VISTE_RIEPILOGO` qui sotto, e viene aggiornata
insieme alle altre. Una vista dichiarata e mai aggiornata resta vuota, e la
lettura ricadrebbe per sempre sulla query lenta senza che nulla lo segnali.
"""
from __future__ import annotations

import logging
import time

logger = logging.getLogger(__name__)

# Le viste nell'ordine in cui vanno aggiornate. L'ordine non e' vincolante -
# nessuna dipende da un'altra - ma tenere per ultima quella sui follower mette
# in fondo la piu' lenta, cosi' un'interruzione a metà lascia aggiornate le
# cifre che aprono i capitoli.
VISTE_RIEPILOGO: tuple[str, ...] = (
    "mv_corpus_totali",
    "mv_corpus_lingue",
    "mv_corpus_istanze",
    "mv_posts_per_bot",
    "mv_accounts_istanze",
    "mv_accounts_per_bot",
    "mv_accounts_con_post",
    "mv_account_followers",
)


def _e_postgres(conn) -> bool:
    """Le viste materializzate esistono solo su PostgreSQL.

    Il progetto supporta anche `sqlite:///` (vedi env.example), dove `CREATE
    MATERIALIZED VIEW` non esiste: li' `DB/schema_sqlite.sql` non le dichiara e
    la lettura resta quella dal vivo. Su un corpus locale di prova e' la scelta
    giusta - e' piccolo - e su uno grande SQLite non e' il posto dove metterlo.
    """
    return type(conn).__name__ != "SQLiteConnectionWrapper"


def vista_popolata(conn, nome: str) -> bool:
    """Se la vista esiste ed e' stata popolata almeno una volta.

    `pg_matviews.ispopulated` distingue i due stati che contano: una vista
    creata `WITH NO DATA` esiste ma leggerla solleva un errore. E' il controllo
    su cui `webapp/queries.py` decide se leggere la vista o ricalcolare dal vivo.
    """
    if not _e_postgres(conn):
        return False
    with conn.cursor() as cur:
        cur.execute(
            "SELECT ispopulated FROM pg_matviews WHERE schemaname = 'public' AND matviewname = %s",
            (nome,),
        )
        riga = cur.fetchone()
    return bool(riga and riga[0])


def aggiorna_viste(conn, viste: tuple[str, ...] = VISTE_RIEPILOGO) -> dict[str, float]:
    """Ricalcola le viste dei riepiloghi. Restituisce i secondi spesi per ognuna.

    Va chiamata alla fine di un ingest, quando i numeri sono cambiati: e' il
    momento in cui il costo si paga una volta invece che a ogni lettura.

    `REFRESH MATERIALIZED VIEW` prende un lock esclusivo sulla vista per la
    durata del ricalcolo, quindi chi sta leggendo quella vista aspetta. Non si
    usa `CONCURRENTLY`, che non prenderebbe il lock, perche' richiede un indice
    unico su ogni vista e qui non ne esiste uno naturale: sette viste su otto
    hanno da una a un centinaio di righe, e su quelle il lock dura meno di un
    secondo. L'ottava - i follower - e' la sola che valga la pena di rivedere se
    l'attesa diventa un problema durante una dimostrazione.

    Su SQLite non fa nulla e lo dichiara: le viste non esistono in quello schema.
    """
    if not _e_postgres(conn):
        logger.info("viste materializzate non disponibili su SQLite: nessun aggiornamento")
        return {}

    tempi: dict[str, float] = {}
    for nome in viste:
        # Il nome finisce interpolato nella DDL, che non accetta parametri:
        # controllarlo contro l'elenco dichiarato e' cio' che rende impossibile
        # farci arrivare una stringa da fuori.
        if nome not in VISTE_RIEPILOGO:
            raise ValueError(f"vista non dichiarata in VISTE_RIEPILOGO: {nome!r}")
        inizio = time.perf_counter()
        with conn.cursor() as cur:
            cur.execute(f"REFRESH MATERIALIZED VIEW {nome}")
        conn.commit()
        tempi[nome] = time.perf_counter() - inizio
        logger.info("vista %s aggiornata in %.1f s", nome, tempi[nome])
    return tempi


def main() -> None:
    """Aggiorna i riepiloghi da riga di comando: `python -m snm.storage.viste`.

    Serve quando i dati sono stati scritti fuori dai due percorsi che
    l'aggiornamento lo fanno da soli (`pipeline.py`, `import_large_db.py`): una
    correzione a mano sul database, un ripristino da backup, o la prima volta
    dopo aver aggiunto le viste allo schema.
    """
    import os

    from dotenv import load_dotenv

    from snm.storage.db import get_connection

    load_dotenv(override=True)
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    conn = get_connection(os.environ["DATABASE_URL"])
    try:
        tempi = aggiorna_viste(conn)
    finally:
        conn.close()

    if not tempi:
        return
    logger.info("--- %d viste aggiornate in %.1f s ---", len(tempi), sum(tempi.values()))


if __name__ == "__main__":
    main()

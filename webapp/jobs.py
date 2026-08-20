# jobs.py
"""Supervisore pipeline: avvia/monitora/ferma gli script di raccolta e
analisi del progetto dal browser invece che da terminale. I processi sono
lanciati "detached" (CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS su Windows)
cosi' sopravvivono a un riavvio di uvicorn - non sono figli del processo
webapp. Lo stato vivo/morto si ricalcola sempre controllando se il PID
esiste ancora nel sistema (via tasklist), mai dalla sola presenza del file
PID: un processo detached non lascia altro segnale affidabile quando
termina (nessun modo di ottenerne l'exit code senza averlo atteso
attivamente, cosa che bloccherebbe la richiesta HTTP per ore)."""
import os
import re
import subprocess
import sys
import threading
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
# L'interprete che esegue uvicorn e' gia' quello del venv giusto: ricostruire
# il path a mano puntava a "venv/" mentre sul disco la cartella e' ".venv/",
# e ogni avvio di pipeline falliva con OSError.
PYTHON_EXE = sys.executable
PIDS_DIR = PROJECT_ROOT / ".pids"
LOGS_DIR = PROJECT_ROOT / ".logs"

# ponytail: single process-wide lock, not per-job - webapp is a single local
# process and start_job is called rarely (human clicking buttons), so
# serializing all starts is not a real contention cost. Upgrade to a
# per-name lock only if concurrent starts of *different* jobs measurably block.
_start_lock = threading.Lock()


def is_pid_alive(pid: int) -> bool:
    """Controlla se un PID esiste ancora nel sistema (Windows, via tasklist -
    nessuna nuova dipendenza tipo psutil). Formato CSV per un parsing
    affidabile indipendente dalla lingua di sistema (l'intestazione e il
    messaggio 'nessuna attivita'' sono localizzati, il PID tra virgolette no)."""
    result = subprocess.run(
        ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
        capture_output=True, text=True,
    )
    return f'"{pid}"' in result.stdout and "python.exe" in result.stdout.lower()


def _pid_file(name: str) -> Path:
    return PIDS_DIR / f"{name}.pid"


def _log_file(name: str) -> Path:
    return LOGS_DIR / f"{name}.log"


def read_pid_file(name: str) -> int | None:
    path = _pid_file(name)
    if not path.exists():
        return None
    try:
        return int(path.read_text(encoding="utf-8").strip())
    except ValueError:
        return None


def tail_log(name: str, n: int = 30) -> list[str]:
    """Ultime n righe del log di un job. Lista vuota se il log non esiste ancora.

    Legge solo l'ultima porzione del file (seek dalla fine) invece
    dell'intero contenuto: chiamata per ogni job a ogni refresh della
    pagina (5s), un log da run lunga (es. fact_check su 200k+ post) puo'
    arrivare a decine di MB e rileggerlo tutto ogni volta e' inutile."""
    path = _log_file(name)
    if not path.exists():
        return []
    with path.open("rb") as f:
        f.seek(0, 2)
        f.seek(max(0, f.tell() - 64_000))
        return f.read().decode("utf-8", errors="replace").splitlines()[-n:]


_PROGRESS_RE = re.compile(r"(\d+)\s*/\s*(\d+)")


def parse_progress(log_lines: list[str]) -> tuple[int, int] | None:
    """(completati, totale) ricavato dall'ultima riga di log che contiene un
    pattern 'N/M' (tutte le pipeline stampano progresso cosi': 'Istanza X:
    12/50 account', '16128/200042', '(3/9) esporto...'). None se nessuna
    riga recente ha questo pattern - la webapp mostra una barra animata
    generica ("in corso...") in quel caso, mai il log grezzo (righe di
    errore/warning di libreria non sono una vista amichevole)."""
    for line in reversed(log_lines):
        match = _PROGRESS_RE.search(line)
        if match:
            done, total = int(match.group(1)), int(match.group(2))
            if total > 0:
                return min(done, total), total
    return None


PIPELINES = {
    "pipeline": {
        "label": "Raccolta post per argomento",
        "description": (
            "Punto di partenza della raccolta dati: legge gli argomenti da "
            "topic_list.txt, trova le istanze Mastodon piu' popolari per ciascun "
            "argomento e gli hashtag piu' usati su quelle istanze, poi scarica i "
            "post recenti con quegli hashtag e li salva nel database. E' la "
            "pipeline da cui nascono tutti gli account e post successivamente "
            "arricchiti dalle altre procedure."
        ),
        "cwd": PROJECT_ROOT,
        "command": lambda param: [PYTHON_EXE, "pipeline.py"],
        "takes_param": None,
    },
    "follow_crawler": {
        "label": "Download relazioni follow/follower",
        "description": (
            "Per ogni account gia' presente nel database, scarica la lista di chi "
            "segue e di chi e' seguito da quell'account (le due liste 'follower' e "
            "'following' di Mastodon). Serve a costruire la rete sociale (chi segue "
            "chi), separata dalla rete di interazioni sui post. Il campo opzionale "
            "limita il lavoro agli account scoperti prima di una certa data, utile "
            "per riprendere un giro precedente senza inseguire i nuovi account "
            "scoperti nel frattempo."
        ),
        "cwd": PROJECT_ROOT,
        "command": lambda param: [
            PYTHON_EXE, "-m", "snm.collection.follow_crawler",
            *(["--before", param] if param else []),
        ],
        "takes_param": "prima del",
        "param_type": "date",
    },
    "user_timeline_crawler": {
        "label": "Download cronologia account",
        "description": (
            "Scarica i post piu' recenti pubblicati dagli account che risultano "
            "collegati alla rete (compaiono in un boost, una risposta o una "
            "menzione), per avere anche il loro contenuto oltre alle sole "
            "interazioni gia' note. Il numero di pagine controlla quanti post "
            "indietro nel tempo si va per ciascun account."
        ),
        "cwd": PROJECT_ROOT,
        "command": lambda param: [
            PYTHON_EXE, "-m", "snm.collection.user_timeline_crawler",
            *(["--pages", param] if param else []),
        ],
        "takes_param": "pagine",
        "param_type": "number",
    },
    "interaction_enrichment": {
        "label": "Aggiornamento boost/risposte",
        "description": (
            "Ripassa sui post gia' salvati per recuperare le interazioni "
            "(boost e risposte) arrivate dopo il primo salvataggio: un post "
            "appena raccolto potrebbe non avere ancora tutte le condivisioni che "
            "ricevera' nei giorni successivi. Il numero di giorni opzionale "
            "permette di ri-controllare anche post gia' arricchiti in passato, "
            "per catturare interazioni tardive."
        ),
        "cwd": PROJECT_ROOT,
        "command": lambda param: [
            PYTHON_EXE, "-m", "snm.collection.interaction_enrichment",
            *(["--refresh", param] if param else []),
        ],
        "takes_param": "giorni",
        "param_type": "number",
    },
    "checkworthiness": {
        "label": "Verifica di attendibilità (pre-fact-check)",
        "description": (
            "Passo preliminare al fact-checking: un modello IA legge ogni post e "
            "stima se contiene un'affermazione controllabile (es. un fatto, un "
            "evento, un dato) oppure solo un'opinione/stato personale (es. 'il mio "
            "gatto e' nero'), che non avrebbe senso far verificare. Il risultato "
            "viene salvato in un file cache: va eseguito una sola volta (il "
            "punteggio non cambia se il testo non cambia), il fact-checking vero "
            "e proprio poi lo riusa senza ricalcolarlo."
        ),
        "cwd": PROJECT_ROOT,
        "command": lambda param: [
            PYTHON_EXE, "-m", "snm.analysis.run_checkworthiness",
            "--input", "post_texts.jsonl", "--output", "checkworthy_scores.jsonl",
        ],
        "takes_param": None,
    },
    "fact_check": {
        "label": "Fact-checking",
        "description": (
            "Per ogni post che ha superato la verifica di attendibilita', cerca "
            "prove sul web (ricerca generica + Wikipedia, con l'eventuale data di "
            "pubblicazione del post per non giudicarlo con informazioni successive) "
            "e chiede a un modello IA di esprimere un verdetto: vero, perlopiu' "
            "vero, misto, perlopiu' falso, falso, o non verificabile se le prove "
            "trovate non bastano. Richiede che 'Verifica di attendibilita'' sia "
            "gia' stata eseguita almeno una volta."
        ),
        "cwd": PROJECT_ROOT,
        "command": lambda param: [
            PYTHON_EXE, "-m", "snm.analysis.fact_check",
            "--input", "post_texts.jsonl", "--output", "fact_check_report.csv",
        ],
        "takes_param": None,
    },
    "snm_detect": {
        "label": "Rilevamento contenuto IA",
        "description": (
            "Analizza ogni post con Fast-DetectGPT per stimare la probabilita' che "
            "il testo sia stato generato da un'intelligenza artificiale invece che "
            "scritto da una persona. Il risultato (una probabilita' da 0 a 1 per "
            "ogni post) e' quello che si vede poi nella sezione 'AI Detection'."
        ),
        "cwd": PROJECT_ROOT / "fast-detect-gpt",
        "command": lambda param: [
            PYTHON_EXE, "scripts/snm_detect.py",
            "--input", "../post_texts.jsonl", "--output", "ai_scores_fast_detect.jsonl",
        ],
        "takes_param": None,
    },
    "export_texts": {
        "label": "Preparazione testi per analisi",
        "description": (
            "Estrae dal database, in un unico file, il testo di ogni post "
            "assieme a lingua e data di pubblicazione: e' il file di partenza che "
            "'Rilevamento contenuto IA', 'Verifica di attendibilita'' e "
            "'Fact-checking' leggono tutte e tre. Va rieseguito quando nel "
            "database sono arrivati nuovi post da analizzare."
        ),
        "cwd": PROJECT_ROOT,
        "command": lambda param: [PYTHON_EXE, "-m", "snm.analysis.export_texts"],
        "takes_param": None,
    },
    "db_export": {
        "label": "Esporta dati DB",
        "cwd": PROJECT_ROOT,
        "command": lambda param: [PYTHON_EXE, "-m", "snm.analysis.db_export", "exports/export.zip"],
        "takes_param": None,
        # gestito dalla sua pagina dedicata (/db-sync), non elencato in /pipelines
        "hidden_from_dashboard": True,
    },
}


def job_status(name: str) -> dict:
    """Ritorna {'running': bool, 'pid': int|None}. Lo stato e' sempre
    ricalcolato dal vivo (mai dalla sola presenza del file PID)."""
    pid = read_pid_file(name)
    running = pid is not None and is_pid_alive(pid)
    return {"running": running, "pid": pid if running else None}


def start_job(name: str, param: str | None = None) -> tuple[bool, str]:
    """Avvia un job se non e' gia' in esecuzione. Ritorna (successo, messaggio).

    La lock e' presa per tutta la funzione: senza, due chiamate quasi
    simultanee (doppio click, due tab del browser) possono superare
    entrambe il controllo 'gia' in esecuzione' prima che una delle due
    scriva il PID file, lanciando due processi reali e orfanando il primo
    (nessun PID file lo referenzia piu')."""
    with _start_lock:
        if name not in PIPELINES:
            return False, f"pipeline sconosciuta: {name}"
        if job_status(name)["running"]:
            return False, f"{name} e' gia' in esecuzione"

        PIDS_DIR.mkdir(parents=True, exist_ok=True)
        LOGS_DIR.mkdir(parents=True, exist_ok=True)

        config = PIPELINES[name]
        command = config["command"](param)
        log_path = _log_file(name)

        # PYTHONUNBUFFERED: senza, lo stdout di un processo Python scritto su
        # file (non un terminale) e' bufferizzato a blocchi - le stampe di
        # progresso restano in memoria e non arrivano al file di log finche'
        # il buffer non si riempie, rendendo la barra di avanzamento nella
        # webapp inutile per pipeline che stampano poco/lentamente (osservato
        # su fact_check.py 2026-08-03). Vale per ogni pipeline lanciata da qui.
        env = {**os.environ, "PYTHONUNBUFFERED": "1"}

        try:
            with log_path.open("a", encoding="utf-8") as log_f:
                process = subprocess.Popen(
                    command,
                    cwd=str(config["cwd"]),
                    stdout=log_f,
                    stderr=subprocess.STDOUT,
                    env=env,
                    creationflags=(
                        subprocess.CREATE_NEW_PROCESS_GROUP
                        | subprocess.DETACHED_PROCESS
                        | subprocess.CREATE_NO_WINDOW
                    ),
                )
        except OSError as exc:
            # es. cwd o eseguibile mancanti (fast-detect-gpt/ e' gitignored,
            # un checkout pulito potrebbe non averla) - niente 500 grezzo.
            return False, str(exc)

        _pid_file(name).write_text(str(process.pid), encoding="utf-8")
        return True, f"{name} avviato (PID {process.pid})"


def stop_job(name: str) -> tuple[bool, str]:
    """Ferma un job in esecuzione. Ritorna (successo, messaggio)."""
    if name not in PIPELINES:
        return False, f"pipeline sconosciuta: {name}"

    status = job_status(name)
    if not status["running"]:
        return False, f"{name} non e' in esecuzione"

    subprocess.run(["taskkill", "/PID", str(status["pid"]), "/F"], capture_output=True)
    return True, f"{name} fermato (PID {status['pid']})"

# progress.py
"""Tracker di avanzamento per download paralleli multi-istanza.

Un reporter su thread dedicato logga a intervallo fisso lo stato di tutti i
worker (niente barre tipo tqdm: con N thread in parallelo si pestano; una riga
di log periodica è leggibile e funziona anche rediretta su file)."""
import logging
import threading

logger = logging.getLogger(__name__)

MAX_DOMAINS_SHOWN = 20


class ProgressTracker:
    def __init__(self, interval_seconds: float = 30.0):
        self._lock = threading.Lock()
        self._domains: dict[str, list[int]] = {}  # dominio -> [fatti, totale]
        self._interval = interval_seconds
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def register(self, domain: str, total: int) -> None:
        with self._lock:
            self._domains[domain] = [0, total]

    def advance(self, domain: str, n: int = 1) -> None:
        with self._lock:
            if domain in self._domains:
                self._domains[domain][0] += n

    def snapshot(self) -> str:
        """Riga di stato: totale complessivo + istanze ancora attive."""
        with self._lock:
            done = sum(d for d, _ in self._domains.values())
            total = sum(t for _, t in self._domains.values())
            active = [(dom, d, t) for dom, (d, t) in self._domains.items() if d < t]
        active.sort(key=lambda x: x[2] - x[1], reverse=True)
        pct = 100 * done / total if total else 100.0
        parts = [f"{dom} {d}/{t}" for dom, d, t in active[:MAX_DOMAINS_SHOWN]]
        extra = f" …e altre {len(active) - MAX_DOMAINS_SHOWN}" if len(active) > MAX_DOMAINS_SHOWN else ""
        detail = f" | {', '.join(parts)}{extra}" if parts else ""
        return f"progresso {done}/{total} ({pct:.0f}%), {len(active)} istanze attive{detail}"

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join()
        logger.info("finale: %s", self.snapshot())

    def _run(self) -> None:
        while not self._stop.wait(self._interval):
            logger.info(self.snapshot())

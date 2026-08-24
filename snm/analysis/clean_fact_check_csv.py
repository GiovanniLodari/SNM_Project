"""Rimuove righe obsolete dai CSV di fact-check per forzarne la ri-valutazione.

Modalità:
  --mode nonverificabile  (default) rimuove solo righe con verdict "non verificabile"
  --mode all              rimuove tutte le righe (reset completo)

Il file originale viene rinominato con suffisso .bak prima di qualsiasi modifica.
La pipeline fact_check.py è append-only e salta gli ID già presenti nel CSV:
rimuovendo le righe qui, quegli ID vengono ri-processati alla prossima run.

Uso:
    python -m snm.analysis.clean_fact_check_csv fact_check_report.csv
    python -m snm.analysis.clean_fact_check_csv fact_check_report.csv --mode all
    python -m snm.analysis.clean_fact_check_csv fact_check_report.csv fact_check_ai_report.csv
"""
import argparse
import csv
import shutil
from pathlib import Path


def clean(path: Path, mode: str) -> None:
    bak = path.with_suffix(path.suffix + ".bak")
    shutil.copy2(path, bak)

    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    if mode == "all":
        kept = []
    else:
        kept = [r for r in rows if r.get("verdict", "").strip().lower() != "non verificabile"]

    removed = len(rows) - len(kept)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(kept)

    print(f"{path.name}: {len(rows)} righe -> {len(kept)} mantenute, {removed} rimosse (backup: {bak.name})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="+", help="CSV da pulire")
    parser.add_argument(
        "--mode", choices=["nonverificabile", "all"], default="nonverificabile",
        help="nonverificabile: rimuove solo verdetti non verificabile; all: reset completo",
    )
    args = parser.parse_args()

    for fname in args.files:
        path = Path(fname)
        if not path.exists():
            print(f"{fname}: non trovato, salto")
            continue
        clean(path, args.mode)


if __name__ == "__main__":
    main()

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(override=True)

PROJECT_ROOT = Path(__file__).parent.parent

def resolve_file_path(env_key: str, candidates: list[Path]) -> Path:
    """Cerca un file provando prima le variabili d'ambiente (.env), poi una serie di percorsi candidati.
    Se nessuno esiste ancora, restituisce il candidato preferito di default."""
    env_val = os.getenv(env_key)
    if env_val:
        p = Path(env_val)
        if p.exists():
            return p
    for cand in candidates:
        if cand.exists():
            return cand
    return candidates[0]


AI_SCORES_PATH = resolve_file_path("AI_SCORES_PATH", [
    PROJECT_ROOT / "data" / "ai_scores.jsonl",
    PROJECT_ROOT / "ai_scores.jsonl",
    PROJECT_ROOT / "fast-detect-gpt" / "ai_scores.jsonl",
])

FACT_CHECK_PATH = resolve_file_path("FACT_CHECK_PATH", [
    PROJECT_ROOT / "fact_checking" / "fact_check_report.csv",
    PROJECT_ROOT / "fact_check_report.csv",
    PROJECT_ROOT / "data" / "fact_check_report.csv",
])

POST_TEXTS_PATH = resolve_file_path("POST_TEXTS_PATH", [
    PROJECT_ROOT / "post_texts.jsonl",
    PROJECT_ROOT / "data" / "post_texts.jsonl",
])

CHECKWORTHY_PATH = resolve_file_path("CHECKWORTHY_PATH", [
    PROJECT_ROOT / "checkworthy_scores.jsonl",
    PROJECT_ROOT / "data" / "checkworthy_scores.jsonl",
])

BINOCULAR_ALL_DIR = resolve_file_path("BINOCULAR_ALL_DIR", [
    PROJECT_ROOT / "desklib_detector" / "risultati_binocular_all",
    PROJECT_ROOT / "risultati_binocular_all",
    PROJECT_ROOT / "data",
])

BINOCULARS_SCORES_PATH = resolve_file_path("BINOCULARS_SCORES_PATH", [
    PROJECT_ROOT / "desklib_detector" / "risultati_binocular_all" / "ai_scores_binoculars.jsonl",
    PROJECT_ROOT / "data" / "ai_scores_binoculars.jsonl",
    PROJECT_ROOT / "ai_scores_binoculars.jsonl",
    PROJECT_ROOT / "risultati_binocular_all" / "ai_scores_binoculars.jsonl",
])

DESKLIB_SCORES_PATH = resolve_file_path("DESKLIB_SCORES_PATH", [
    PROJECT_ROOT / "desklib_detector" / "risultati_binocular_all" / "risultati.jsonl",
    PROJECT_ROOT / "data" / "risultati.jsonl",
    PROJECT_ROOT / "risultati.jsonl",
    PROJECT_ROOT / "desklib_scores.jsonl",
    PROJECT_ROOT / "data" / "desklib_scores.jsonl",
])

EXPORTS_DIR = PROJECT_ROOT / "exports"
IMPORTS_DIR = PROJECT_ROOT / "imports"
EXPORT_ZIP_PATH = EXPORTS_DIR / "export.zip"

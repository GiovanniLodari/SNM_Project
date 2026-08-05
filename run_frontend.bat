@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo Avvio del Frontend Progetto SNM (FastAPI)
echo ===================================================

:: Controlla se la cartella dell'ambiente virtuale esiste
if not exist .venv (
    echo [ERRORE] La cartella .venv non esiste in questa directory.
    echo Assicurati di aver installato l'ambiente virtuale.
    pause
    exit /b 1
)

:: Attiva l'ambiente virtuale e avvia uvicorn
echo Attivazione dell'ambiente virtuale (.venv)...
call .venv\Scripts\activate.bat

echo Avvio di uvicorn su http://127.0.0.1:8088 ...
uvicorn webapp.main:app --port 8088 --reload

pause

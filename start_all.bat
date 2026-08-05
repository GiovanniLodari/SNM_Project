@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo   SNM Intelligence - Avvio Completo (Backend + Frontend)
echo ===================================================

:: Controlla se la cartella dell'ambiente virtuale esiste
if not exist .venv (
    echo [ERRORE] La cartella .venv non esiste in questa directory.
    echo Assicurati di aver installato l'ambiente virtuale.
    pause
    exit /b 1
)

:: Avvio Backend in una nuova finestra CMD
echo [1/2] Avvio del Backend FastAPI (http://127.0.0.1:8088)...
start "SNM Backend (FastAPI)" cmd /k "call .venv\Scripts\activate.bat && uvicorn webapp.main:app --port 8088 --reload"

:: Avvio Frontend in una nuova finestra CMD
echo [2/2] Avvio del Frontend Vite React (http://localhost:5173)...
start "SNM Frontend (Vite React)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ---------------------------------------------------
echo OK! Entrambi i servizi sono stati avviati in finestre separate.
echo   Backend API: http://127.0.0.1:8088
echo   Frontend App: http://localhost:5173
echo ---------------------------------------------------

pause

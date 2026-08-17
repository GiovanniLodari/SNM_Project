# Script PowerShell per avviare Backend (FastAPI) e Frontend (Vite React) insieme

$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
}
Set-Location $scriptDir

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  SNM Intelligence - Avvio Completo (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Verifica ambiente virtuale Python (venv)
if (-not (Test-Path "$scriptDir\venv")) {
    Write-Host "[ERRORE] La cartella venv non esiste in $scriptDir." -ForegroundColor Red
    Write-Host "Crea e configura l'ambiente virtuale prima di proseguire." -ForegroundColor Red
    Pause
    Exit 1
}

# 2. Avvio Backend FastAPI in una nuova finestra PowerShell
Write-Host "[1/2] Avvio del Backend FastAPI (http://127.0.0.1:8088)..." -ForegroundColor Yellow
$backendCmd = "Set-Location '$scriptDir'; Write-Host '--- SNM BACKEND FASTAPI ---' -ForegroundColor Green; .\venv\Scripts\python.exe -m uvicorn webapp.main:app --port 8088 --reload"
Start-Process powershell.exe -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", $backendCmd

# 3. Avvio Frontend Vite React in una nuova finestra PowerShell
Write-Host "[2/2] Avvio del Frontend Vite React (http://localhost:5173)..." -ForegroundColor Yellow
$frontendCmd = "Set-Location '$scriptDir\frontend'; Write-Host '--- SNM FRONTEND VITE REACT ---' -ForegroundColor Cyan; npm run dev"
Start-Process powershell.exe -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "---------------------------------------------------" -ForegroundColor Green
Write-Host "[OK] Entrambi i servizi sono in fase di avvio!" -ForegroundColor Green
Write-Host "  Backend API: http://127.0.0.1:8088" -ForegroundColor White
Write-Host "  Frontend App: http://localhost:5173" -ForegroundColor White
Write-Host "---------------------------------------------------" -ForegroundColor Green


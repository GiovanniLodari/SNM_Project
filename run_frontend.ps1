# Script PowerShell per avviare il frontend del progetto SNM

$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Set-Location $PSScriptRoot

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Avvio del Frontend Progetto SNM (FastAPI)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Verifica se la cartella .venv esiste
if (-not (Test-Path ".venv")) {
    Write-Host "[ERRORE] La cartella .venv non esiste in questa directory." -ForegroundColor Red
    Write-Host "Assicurati di aver installato l'ambiente virtuale." -ForegroundColor Red
    Pause
    Exit 1
}

# Attiva l'ambiente virtuale ed esegui uvicorn
Write-Host "Attivazione dell'ambiente virtuale (.venv)..." -ForegroundColor Yellow
. .venv\Scripts\Activate.ps1

Write-Host "Avvio di uvicorn su http://127.0.0.1:8088 ..." -ForegroundColor Green
uvicorn webapp.main:app --port 8088 --reload

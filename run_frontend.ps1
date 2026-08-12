# Script PowerShell per avviare il backend FastAPI del progetto SNM

$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
}
Set-Location $scriptDir

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Avvio del Backend Progetto SNM (FastAPI)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Verifica se la cartella .venv esiste
if (-not (Test-Path "$scriptDir\.venv")) {
    Write-Host "[ERRORE] La cartella .venv non esiste in questa directory." -ForegroundColor Red
    Write-Host "Assicurati di aver installato l'ambiente virtuale." -ForegroundColor Red
    Pause
    Exit 1
}

Write-Host "Avvio di uvicorn su http://127.0.0.1:8088 ..." -ForegroundColor Green
.\.venv\Scripts\python.exe -m uvicorn webapp.main:app --port 8088 --reload


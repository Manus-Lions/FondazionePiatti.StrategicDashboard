@echo off
setlocal
set "DASHBOARD_DIR=%~dp0src\FondazionePiatti.StrategicDashboard"
set "DASHBOARD_EXE=%DASHBOARD_DIR%\bin\Debug\net9.0\FondazionePiatti.StrategicDashboard.exe"

if not exist "%DASHBOARD_EXE%" (
  echo Applicazione non compilata. Apri la soluzione in Visual Studio e premi Ctrl+Shift+B.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = Get-NetTCPConnection -LocalPort 5280 -State Listen -ErrorAction SilentlyContinue; if (-not $listener) { Start-Process -FilePath '%DASHBOARD_EXE%' -ArgumentList '--urls','http://127.0.0.1:5280' -WorkingDirectory '%DASHBOARD_DIR%' -WindowStyle Hidden }; for ($i = 0; $i -lt 24; $i++) { try { $response = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:5280/' -TimeoutSec 1; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 250 }; exit 1"

if errorlevel 1 (
  echo Il server non si e avviato. Controlla che la porta 5280 sia libera.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:5280/"
exit /b 0

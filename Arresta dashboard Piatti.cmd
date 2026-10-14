@echo off
setlocal
set "DASHBOARD_ROOT=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$root = [IO.Path]::GetFullPath('%DASHBOARD_ROOT%'); Get-Process -Name 'FondazionePiatti.StrategicDashboard' -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force"

echo Dashboard arrestata.
timeout /t 2 /nobreak >nul
exit /b 0

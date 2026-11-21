@echo off
setlocal
cd /d "%~dp0"
echo R146: replay original real Qwen response WITHOUT Ollama or Minecraft writes.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\r146-one-click-offline-replay.ps1"
set "result=%ERRORLEVEL%"
echo.
if not "%result%"=="0" echo R146 failed or HOLD; preserve the printed review folder and report.
pause
exit /b %result%

@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo R190N_HOLD: Node.js is not available on PATH. No model request was made.
  pause
  exit /b 1
)
echo R190-N: source-only local Qwen/Gemma research.
echo Saved evidence is reused unless --fresh is passed.
echo No Minecraft writes, no model downloads, no external model APIs.
node.exe "%~dp0scripts\r190n-one-click-research.mjs" %*
set "code=%ERRORLEVEL%"
echo.
if not "%code%"=="0" echo R190N: HOLD or prerequisite failure. Review the printed evidence folder if present.
pause
exit /b %code%

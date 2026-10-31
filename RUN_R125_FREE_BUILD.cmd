@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. HOLD: no model request was made.
  pause
  exit /b 2
)
echo MinecraftAIBuilder R125 - Japanese local LLM to Education MakeCode
echo This tool never edits a Minecraft world.
node scripts\r125-free-build.mjs
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" echo HOLD: review the output and the model/error log.
pause
exit /b %RESULT%

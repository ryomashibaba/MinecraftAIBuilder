@echo off
setlocal
rem MAB V11 - existing local RESEARCH checkout and an existing Ollama server.
rem No installation, upload, Minecraft world write, or paid model call.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0r125-v11-windows-pilot.ps1" %*
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" echo V11 HOLD. Inspect the private BATCH_REPORT.json printed above.
exit /b %RESULT%

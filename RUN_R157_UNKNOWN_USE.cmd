@echo off
setlocal
cd /d "%~dp0"
echo R157: real local Qwen/Gemma unknown-use study, three rooms/programs, same B143 engine.
echo No Minecraft world writes. Protected Qwen originals unchanged.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\r157-one-click-unknown-use.ps1" %*
set "code=%ERRORLEVEL%"
echo.
echo Keep the printed EVIDENCE_ZIP; inspect R157_COMPARE.html if present.
if not "%code%"=="0" echo R157 ended in HOLD or prerequisite failure.
pause
exit /b %code%

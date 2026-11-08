@echo off
setlocal
cd /d "%~dp0"
echo R145: one real local Qwen room-graph attempt (NO Minecraft world writes)
echo Current repository branch is checked before any update.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\r145-one-command-real-graph.ps1" %*
set "result=%ERRORLEVEL%"
echo.
echo See the printed UPLOAD_THIS_ZIP path. Keep the raw model reply unchanged.
if not "%result%"=="0" echo R145 ended in HOLD or a local prerequisite failed.
pause
exit /b %result%

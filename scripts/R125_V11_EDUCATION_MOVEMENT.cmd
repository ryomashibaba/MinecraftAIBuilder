@echo off
setlocal
rem MAB V11: clipboard preparation only; preserves the open Education world.
rem Double-click to copy the read-only movement probe. No world writes.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0r125-v11-education-live-launch.ps1" -Mode Movement -NoOpen %*
exit /b %ERRORLEVEL%

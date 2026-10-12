@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not on PATH.
  echo This tool needs Node.js 20 or later. Nothing was collected.
  pause
  exit /b 1
)
if "%~1"=="" (
  node.exe "%~dp0collect-b67.mjs"
) else (
  node.exe "%~dp0collect-b67.mjs" --project-root "%~1"
)
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
  echo.
  echo ERROR: Collection failed. If root was not found, drag your project folder onto this CMD file.
) else (
  echo.
  echo The source evidence ZIP is in your Downloads folder.
  echo Review it for secrets before uploading it to ChatGPT.
)
pause
exit /b %RESULT%

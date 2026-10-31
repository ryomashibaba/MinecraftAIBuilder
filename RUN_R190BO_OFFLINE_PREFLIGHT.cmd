@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js is required. No model or network request was made.
 exit /b 1
)
if not exist "scripts\r190bo-spatial-local.mjs" (
 echo Complete repository required. No download or model request was made.
 exit /b 1
)
if not exist "r190bo-local-evidence" mkdir "r190bo-local-evidence"
node "scripts\r190bo-spatial-local.mjs" prepare --model qwen3:14b --out "r190bo-local-evidence\prepared"
exit /b %errorlevel%

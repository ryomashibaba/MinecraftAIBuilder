@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0scripts\r190o-offline-review.mjs" (
 echo R190O_HOLD: missing repository scripts. Use a complete updated checkout.
 pause
 exit /b 1
)
where node.exe >nul 2>nul
if errorlevel 1 (
 echo R190O_HOLD: Node.js missing; no model request was made.
 pause
 exit /b 1
)
echo R190-O: offline inspection of the saved model reply. ZERO inference.
echo R190-O: original untouched; shadows are HOST-created what-if research only.
node.exe "%~dp0scripts\r190o-offline-review.mjs" %*
set "code=%ERRORLEVEL%"
echo.
if not "%code%"=="0" echo R190O: HOLD. Check existing R190N evidence folders.
pause
exit /b %code%

@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "canonical=%USERPROFILE%\Projects\MinecraftAIBuilder"
if not exist "%canonical%\" goto :missing
set "runner=%canonical%\scripts\r190x-saved-quality-compare.mjs"
if not exist "%runner%" goto :outdated
if not exist "%canonical%\scripts\r190w-two-stage-study.mjs" goto :outdated
where node.exe >nul 2>nul
if errorlevel 1 goto :nonode
cd /d "%canonical%"
echo R190-X: comparison of SAVED original sources, ZERO model inference.
echo Looks for R190R, R190S, R190W in the canonical project only.
echo No Minecraft world contact, no downloads, no source overwrites.
node.exe "%runner%" %*
set "status=%ERRORLEVEL%"
if not "%status%"=="0" echo R190-X HOLD: missing or untrusted saved model outputs.
pause
exit /b %status%
:missing
echo HOLD: canonical project not available; refusing a replacement.
goto :fail
:outdated
echo HOLD: source checkout is old, update existing protected branch safely.
goto :fail
:nonode
echo HOLD: Node.js missing.
:fail
pause
exit /b 1

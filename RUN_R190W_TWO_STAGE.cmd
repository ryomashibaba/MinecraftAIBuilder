@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem ONLY the established local project. Never create a second checkout.
set "canonical=%USERPROFILE%\Projects\MinecraftAIBuilder"
if not exist "%canonical%\" goto :missing
set "runner=%canonical%\scripts\r190w-two-stage-study.mjs"
if not exist "%runner%" goto :outdated
if not exist "%canonical%\scripts\r190s-evidence-redesign.mjs" goto :outdated
if not exist "%canonical%\scripts\r190t-source-comparison.mjs" goto :outdated
findstr /C:"buildR190WGeometryPrompt" "%runner%" >nul 2>nul
if errorlevel 1 goto :outdated
where node.exe >nul 2>nul
if errorlevel 1 goto :nonode
cd /d "%canonical%"
echo R190-W: TWO model calls at most, first for architectural planning,
echo then for the model's own direct B143 geometry.
echo Prior saved original evidence is required and never overwritten.
echo Re-running normally REUSES prior work with ZERO new model calls.
echo Minecraft world access and construction are always BLOCKED.
echo Research files: "%canonical%\r190w-local-evidence"
choice /C YN /N /M "Run the local model research (or reuse saved evidence)? [Y/N] "
if errorlevel 2 goto :declined
node.exe "%runner%" %*
set "status=%ERRORLEVEL%"
if not "%status%"=="0" echo R190-W is HOLD. Check saved evidence, no automatic retry.
pause
exit /b %status%
:missing
echo HOLD: Canonical project directory missing; refusing to create or replace it.
goto :fail
:outdated
echo HOLD: Local project source is outdated. Sync the existing protected branch safely first.
goto :fail
:nonode
echo HOLD: Node.js is not available.
goto :fail
:declined
echo Declined: no model calls.
:fail
pause
exit /b 1

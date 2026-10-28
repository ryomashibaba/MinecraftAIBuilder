@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Canonical workspace ONLY. Never create another clone or overwrite sources.
set "canonical=%USERPROFILE%\Projects\MinecraftAIBuilder"
if not exist "%canonical%\" goto :missing
set "runner=%canonical%\scripts\r190y-comparison-pilot.mjs"
if not exist "%runner%" goto :outdated
if not exist "%canonical%\scripts\r190s-evidence-redesign.mjs" goto :outdated
if not exist "%canonical%\scripts\r190w-two-stage-study.mjs" goto :outdated
if not exist "%canonical%\scripts\r190x-saved-quality-compare.mjs" goto :outdated
findstr /C:"runR190YTrial" "%runner%" >nul 2>nul
if errorlevel 1 goto :outdated
where node.exe >nul 2>nul
if errorlevel 1 goto :nonode
cd /d "%canonical%"
echo MinecraftAIBuilder R190-Y: 1-click original-model comparison.
echo C: compare archived R/S/W ONLY.  ZERO inference.
echo G: explicitly allow missing S/W LOCAL Ollama research.
echo    Up to 3 requests total (S: 1, W: 2), cached studies reused.
echo N: cancel. Neither mode contacts a Minecraft world.
echo Sources NEVER repaired or overwritten. Results ART HOLD.
choice /C CGN /N /M "Choose [C] saved-only / [G] generate missing / [N] cancel: "
if errorlevel 3 goto :declined
if errorlevel 2 goto :generate
if errorlevel 1 goto :compare
:generate
node.exe "%runner%" --run-missing %*
goto :done
:compare
node.exe "%runner%" %*
:done
set "status=%ERRORLEVEL%"
if not "%status%"=="0" echo HOLD: look at the error; no automatic retry.
pause
exit /b %status%
:missing
echo HOLD: existing canonical project folder not found; no replacement created.
goto :failed
:outdated
echo HOLD: current canonical source is too old; no automatic overwrite/pull.
goto :failed
:nonode
echo HOLD: Node.js is not available.
goto :failed
:declined
echo Cancelled. No local model call.
:failed
pause
exit /b 1

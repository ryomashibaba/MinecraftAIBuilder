@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Prefer the user's longstanding canonical project; source checkouts may differ.
set "canonical_project=%USERPROFILE%\Projects\MinecraftAIBuilder"
set "repository_dir=%canonical_project%"
set "runner=%repository_dir%\scripts\r190r-one-click-direct-study.mjs"
if exist "%runner%" goto :version_check
set "repository_dir=%~dp0"
set "runner=%repository_dir%scripts\r190r-one-click-direct-study.mjs"
if exist "%runner%" goto :version_check
set "repository_dir=%~dp0MinecraftAIBuilder-R190R"
set "runner=%repository_dir%\scripts\r190r-one-click-direct-study.mjs"
if exist "%runner%" goto :version_check
if exist "%repository_dir%" goto :partial
where git.exe >nul 2>nul
if errorlevel 1 goto :nogit
echo R190-R: Source files only; no Ollama model is downloaded.
echo Minecraft worlds, main branch and existing files stay unchanged.
choice /C YN /N /M "Clone protected-source branch into new folder? [Y/N] "
if errorlevel 2 goto :declined
git clone --depth 1 --single-branch --branch feature/b198zr1-protected-architectural-revision https://github.com/ryomashibaba/MinecraftAIBuilder.git "%repository_dir%"
if errorlevel 1 goto :clonefail
if not exist "%runner%" goto :clonefail
:version_check
rem Older source clones still write results inside their own checkout.
rem Never silently run an old script and scatter more evidence files.
findstr /C:"R190R_CANONICAL_PROJECT_OUTPUT_V2" "%runner%" >nul 2>nul
if errorlevel 1 goto :outdated_checkout
:ready
if not exist "%canonical_project%" goto :canonical_missing
where node.exe >nul 2>nul
if errorlevel 1 goto :nonode
cd /d "%repository_dir%"
if errorlevel 1 goto :cwd
echo R190-R: Same Japanese request as R190-N; direct model-authored B143.
echo Existing verified evidence reused unless --fresh is given.
echo Source-only local request; no Minecraft contact or writes.
echo Canonical results: "%canonical_project%\r190r-local-evidence"
echo A validated legacy capture is reused in place, not moved or overwritten.
node.exe "%runner%" %*
set "code=%ERRORLEVEL%"
if not "%code%"=="0" echo R190-R HOLD. Check saved raw original where available.
pause
exit /b %code%
:outdated_checkout
echo R190-R HOLD: source checkout is older than the canonical-output fix.
echo Safely update your feature-branch checkout before rerunning.
echo Original files and historical evidence remain untouched.
goto :failed
:canonical_missing
echo R190-R HOLD: canonical project folder does not exist.
echo Expected "%canonical_project%"
echo Refusing to create an empty replacement for the former finished project.
goto :failed
:partial
echo R190-R HOLD: target folder incomplete. No overwrite.
goto :failed
:nogit
echo R190-R HOLD: Git missing. Use this CMD in a complete repository checkout.
goto :failed
:declined
echo R190-R HOLD: clone declined; no model request.
goto :failed
:clonefail
echo R190-R HOLD: clone failed; no model request.
goto :failed
:nonode
echo R190-R HOLD: Node.js unavailable; no model request.
goto :failed
:cwd
echo R190-R HOLD: failed to enter checkout; no model request.
:failed
pause
exit /b 1

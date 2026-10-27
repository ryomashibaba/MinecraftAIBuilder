@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "repository_dir=%~dp0"
set "runner=%repository_dir%scripts\r190r-one-click-direct-study.mjs"
if exist "%runner%" goto :ready
set "repository_dir=%~dp0MinecraftAIBuilder-R190R"
set "runner=%repository_dir%\scripts\r190r-one-click-direct-study.mjs"
if exist "%runner%" goto :ready
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
:ready
where node.exe >nul 2>nul
if errorlevel 1 goto :nonode
cd /d "%repository_dir%"
if errorlevel 1 goto :cwd
echo R190-R: Same Japanese request as R190-N; direct model-authored B143.
echo Existing verified evidence reused unless --fresh is given.
echo Source-only local request; no Minecraft contact or writes.
node.exe "%runner%" %*
set "code=%ERRORLEVEL%"
if not "%code%"=="0" echo R190-R HOLD. Check saved raw original where available.
pause
exit /b %code%
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

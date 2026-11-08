@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "canonical=%USERPROFILE%\Projects\MinecraftAIBuilder"
if not exist "%canonical%\" goto :project_missing
set "source=%canonical%"
set "runner=%source%\scripts\r190s-evidence-redesign.mjs"
if exist "%runner%" goto :ready
set "source=%~dp0"
set "runner=%source%scripts\r190s-evidence-redesign.mjs"
if exist "%runner%" goto :ready
rem Source checkout is optional and separate, canonical results always stay in Projects.
set "source=%~dp0MinecraftAIBuilder-R190S"
set "runner=%source%\scripts\r190s-evidence-redesign.mjs"
if exist "%runner%" goto :ready
if exist "%source%" goto :incomplete
where git.exe >nul 2>nul
if errorlevel 1 goto :nogit
echo Clone protected source only, no model download; no project overwrite.
choice /C YN /N /M "Clone the R190-S source checkout? [Y/N] "
if errorlevel 2 goto :declined
git clone --depth 1 --single-branch --branch feature/b198zr1-protected-architectural-revision https://github.com/ryomashibaba/MinecraftAIBuilder.git "%source%"
if errorlevel 1 goto :clonefailed
if not exist "%runner%" goto :clonefailed
:ready
rem Require R190-T paired REAL B143 review, not an older R190-S checkout.
if not exist "%source%\scripts\r190t-source-comparison.mjs" goto :outdated
findstr /C:"compareR190TSource" "%runner%" >nul 2>nul
if errorlevel 1 goto :outdated
where node.exe >nul 2>nul
if errorlevel 1 goto :nonode
cd /d "%source%"
echo R190-S: one new independently designed B143 attempt from a saved rejected original.
echo Results in "%canonical%\r190s-local-evidence"
echo Original source retained; NEVER writes to Minecraft.
node.exe "%runner%" %*
set "status=%ERRORLEVEL%"
if not "%status%"=="0" echo R190-S HOLD. Review the locally saved receipts.
pause
exit /b %status%
:project_missing
echo R190-S HOLD: previous canonical project folder does not exist; no replacement created.
goto :failed
:incomplete
echo R190-S HOLD: alternate source folder incomplete; no overwrite.
goto :failed
:nogit
echo R190-S HOLD: Git not installed and source unavailable.
goto :failed
:declined
echo R190-S HOLD: clone declined.
goto :failed
:clonefailed
echo R190-S HOLD: source checkout failed.
goto :failed
:outdated
echo R190-S HOLD: old source, latest script required; no unsafe run.
goto :failed
:nonode
echo R190-S HOLD: Node.js not available.
:failed
pause
exit /b 1

@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem One-click MAB V11 pilot. Clone only to an isolated NEW LOCALAPPDATA
rem directory; never modify the user's existing repository, main or worlds.
rem The existing local Ollama/LM Studio service is required for real calls.
set "REPO=https://github.com/ryomashibaba/MinecraftAIBuilder.git"
set "BRANCH=research/r125-v6-readonly-facade-diagnostic-20261111"
if not defined LOCALAPPDATA goto NO_APPDATA
where git.exe >nul 2>nul
if errorlevel 1 goto NO_GIT
where node.exe >nul 2>nul
if errorlevel 1 goto NO_NODE
set "ROOT=%LOCALAPPDATA%\MinecraftAIBuilder\IsolatedV11"
if not exist "%ROOT%" mkdir "%ROOT%"
if not exist "%ROOT%" goto NO_WRITE
set "CLONE=%ROOT%\source-%RANDOM%-%RANDOM%"
if exist "%CLONE%" goto NO_WRITE
echo MAB V11: preparing a NEW isolated research checkout.
set "GIT_LFS_SKIP_SMUDGE=1"
git.exe -c credential.interactive=never clone --quiet --depth 1 --single-branch --branch "%BRANCH%" -- "%REPO%" "%CLONE%"
if errorlevel 1 goto CLONE_FAILED
for /f "delims=" %%B in ('git.exe -C "%CLONE%" branch --show-current 2^>nul') do set "ACTUAL_BRANCH=%%B"
if not "%ACTUAL_BRANCH%"=="%BRANCH%" goto CLONE_WRONG_BRANCH
if not exist "%CLONE%\scripts\r125-v11-windows-pilot.ps1" goto MISSING_RUNNER
echo MAB V11: running the bounded three-brief pilot on the existing model service.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CLONE%\scripts\r125-v11-windows-pilot.ps1" %*
set "RESULT=%ERRORLEVEL%"
if "%RESULT%"=="0" goto PASSED
echo V11_PILOT_HOLD. Read the details printed above.
echo No model retry, no world construction, no upload.
exit /b %RESULT%
:PASSED
echo V11_PILOT_COMPLETED. Private 3D review opened if available.
exit /b 0
:NO_APPDATA
echo V11_HOLD_LOCALAPPDATA_NOT_FOUND
exit /b 2
:NO_GIT
echo V11_HOLD_GIT_NOT_FOUND
exit /b 2
:NO_NODE
echo V11_HOLD_NODE_NOT_FOUND
exit /b 2
:NO_WRITE
echo V11_HOLD_ISOLATED_CLONE_PATH_UNAVAILABLE
exit /b 2
:CLONE_FAILED
echo V11_HOLD_CLONE_FAILED_EXISTING_REPOSITORIES_UNCHANGED
exit /b 2
:CLONE_WRONG_BRANCH
echo V11_HOLD_CLONED_BRANCH_MISMATCH
exit /b 2
:MISSING_RUNNER
echo V11_HOLD_RESEARCH_RUNNER_MISSING
exit /b 2

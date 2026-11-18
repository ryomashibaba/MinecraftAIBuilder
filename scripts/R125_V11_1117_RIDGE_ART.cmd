@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem MAB V11: ONE offline 11/17 saved genuine-Qwen ridge A/B ART comparison.
rem Double-click for actual PRIVATE offline review; -CheckOnly for CI.
rem Never call Ollama/LM Studio, upload PRIVATE data or contact Minecraft.
set "BRANCH=research/r125-v6-readonly-facade-diagnostic-20261111"
set "REPO=https://github.com/ryomashibaba/MinecraftAIBuilder.git"
if /I "%~1"=="-CheckOnly" goto CHECK_ONLY
if not "%~1"=="" goto INVALID_ARGUMENT
if not defined LOCALAPPDATA goto NO_APPDATA
where git.exe >nul 2>nul
if errorlevel 1 goto NO_GIT
where node.exe >nul 2>nul
if errorlevel 1 goto NO_NODE
set "BASE=%LOCALAPPDATA%\MinecraftAIBuilder\IsolatedV11"
if not exist "%BASE%" mkdir "%BASE%"
if not exist "%BASE%" goto NO_WRITE
set "CLONE=%BASE%\ridge-1117-%RANDOM%-%RANDOM%"
if exist "%CLONE%" goto NO_WRITE
set "GIT_LFS_SKIP_SMUDGE=1"
echo MAB V11: isolated research checkout; no new model calls.
git.exe -c credential.interactive=never clone --quiet --depth 1 --single-branch --branch "%BRANCH%" -- "%REPO%" "%CLONE%"
if errorlevel 1 goto CLONE_FAILED
set "ACTUAL_BRANCH="
for /f "delims=" %%B in ('git.exe -C "%CLONE%" branch --show-current 2^>nul') do set "ACTUAL_BRANCH=%%B"
if not "%ACTUAL_BRANCH%"=="%BRANCH%" goto WRONG_BRANCH
if not exist "%CLONE%\scripts\r125-v11-review-existing.ps1" goto MISSING_REVIEW
if not exist "%CLONE%\scripts\r125-v11-finish-art-ab.mjs" goto MISSING_REVIEW
rem This script always uses the EXACT saved 2026-11-17 original SHA gate.
rem Existing reports are never overwritten. SOURCE failures remain HOLD.
set "PS_EXE=powershell.exe"
where pwsh.exe >nul 2>nul
if not errorlevel 1 set "PS_EXE=pwsh.exe"
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%CLONE%\scripts\r125-v11-review-existing.ps1" -RidgeContrast
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" goto REVIEW_HOLD
echo V11_1117_RIDGE_AB_FINISHED_SOURCE_ONLY_NOT_ART_ACCEPTED
echo Examine the opened A/B PNG. Minecraft and Education NOT TESTED.
exit /b 0
:CHECK_ONLY
where node.exe >nul 2>nul
if errorlevel 1 goto NO_NODE
node.exe --check "%~dp0r125-v11-finish-art-ab.mjs"
if errorlevel 1 goto CHECK_FAILED
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0r125-v11-review-existing.ps1" -CheckOnly -RidgeContrast -NoOpen
if errorlevel 1 goto CHECK_FAILED
echo V11_1117_RIDGE_ART_CHECK_ONLY_PASS_NO_PRIVATE_NO_MODEL_NO_WORLD
exit /b 0
:INVALID_ARGUMENT
echo V11_RIDGE_HOLD_INVALID_ARGUMENT
exit /b 2
:NO_APPDATA
echo V11_RIDGE_HOLD_LOCALAPPDATA
exit /b 2
:NO_GIT
echo V11_RIDGE_HOLD_GIT
exit /b 2
:NO_NODE
echo V11_RIDGE_HOLD_NODE
exit /b 2
:NO_WRITE
echo V11_RIDGE_HOLD_ISOLATED_PATH
exit /b 2
:CLONE_FAILED
echo V11_RIDGE_HOLD_CLONE_FAILED_NO_EXISTING_REPO_CHANGED
exit /b 2
:WRONG_BRANCH
echo V11_RIDGE_HOLD_WRONG_BRANCH
exit /b 2
:MISSING_REVIEW
echo V11_RIDGE_HOLD_REVIEW_FILES_MISSING
exit /b 2
:CHECK_FAILED
echo V11_RIDGE_HOLD_CHECK_ONLY
exit /b 2
:REVIEW_HOLD
echo V11_RIDGE_HOLD_SOURCE_OR_ART_GENERATION_FAILED
echo ORIGINALS_AND_MINECRAFT_UNCHANGED
exit /b %RESULT%

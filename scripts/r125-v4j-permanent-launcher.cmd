@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder - ONE PERMANENT LOCAL PILOT LAUNCHER
rem Permanent user-controlled local pilot. No paid API/world operations.
rem Clones ONLY into a fresh owned temporary folder, verifies BOTH exact-sha
rem GitHub CI runs, then asks for explicit single local Qwen pilot consent.
rem Keeps private model response local. Copies ONLY safe report to clipboard.
set "MAB_REPO=https://github.com/ryomashibaba/MinecraftAIBuilder.git"
set "MAB_BRANCH=feature/b198zr1-protected-architectural-revision"
set "MAB_MODEL=qwen3:14b"
set "FINAL_EXIT=2"
set "SOURCE_DIR="
if not defined LOCALAPPDATA goto NO_LOCALAPPDATA
where git.exe >nul 2>nul
if errorlevel 1 goto NO_GIT
where node.exe >nul 2>nul
if errorlevel 1 goto NO_NODE
set "WORK_ROOT=%LOCALAPPDATA%\MinecraftAIBuilder\ReusablePilot"
set "PRIVATE_ROOT=%LOCALAPPDATA%\MinecraftAIBuilder\PrivateModelStudies"
if not exist "%WORK_ROOT%" mkdir "%WORK_ROOT%"
if not exist "%PRIVATE_ROOT%" mkdir "%PRIVATE_ROOT%"
if not exist "%WORK_ROOT%" goto NO_FOLDER
if not exist "%PRIVATE_ROOT%" goto NO_FOLDER
set "SOURCE_DIR=%WORK_ROOT%\source-%RANDOM%-%RANDOM%"
if exist "%SOURCE_DIR%" goto OWNED_COLLISION
echo [1/4] Fetch latest research source into an isolated NEW folder.
set "GIT_LFS_SKIP_SMUDGE=1"
git.exe -c credential.interactive=never clone --quiet --depth 1 --single-branch --branch "%MAB_BRANCH%" -- "%MAB_REPO%" "%SOURCE_DIR%"
if errorlevel 1 goto NO_GIT_CLONE
set "MAB_HEAD="
for /f "delims=" %%H in ('git.exe -C "%SOURCE_DIR%" rev-parse HEAD 2^>nul') do set "MAB_HEAD=%%H"
if not defined MAB_HEAD goto NO_HEAD
if not exist "%SOURCE_DIR%\scripts\r125-v4j-safe-ci-gate.mjs" goto NO_SAFE_SCRIPT
if not exist "%SOURCE_DIR%\scripts\r125-v4j-current-pilot.mjs" goto NO_SAFE_SCRIPT
echo [2/4] Check BOTH workflow results for exact Git commit: %MAB_HEAD%
echo This may check again until GitHub finishes. NO model requests yet.
node.exe "%SOURCE_DIR%\scripts\r125-v4j-safe-ci-gate.mjs" "%MAB_HEAD%"
if errorlevel 1 goto CI_HOLD
echo [3/4] CI OK. Your double-click authorizes ONE local Qwen research model request.
echo Model: %MAB_MODEL%. No additional confirmation needed.
set "PRIVATE_OUT=%PRIVATE_ROOT%\V4J_AUTO_%RANDOM%_%RANDOM%"
if exist "%PRIVATE_OUT%" goto OWNED_COLLISION
if /I "%MAB_V7_OPT_IN%"=="1" (
  echo V7 opt-in requested. PRIVATE engine and fresh memory safety are mandatory.
  node.exe "%SOURCE_DIR%\scripts\r125-v4j-current-pilot.mjs" --model "%MAB_MODEL%" --out "%PRIVATE_OUT%" --v7-semantic
) else (
  node.exe "%SOURCE_DIR%\scripts\r125-v4j-current-pilot.mjs" --model "%MAB_MODEL%" --out "%PRIVATE_OUT%"
)
set "MODEL_EXIT=%ERRORLEVEL%"
set "V4J_SAFE_FILE=%PRIVATE_OUT%\V4J_CURRENT_SAFE_REPORT.json"
if not exist "%V4J_SAFE_FILE%" goto NO_SAFE_OUTPUT
echo [4/4] Private original retained locally. Safe JSON prepared.
powershell.exe -NoProfile -NonInteractive -Command "Get-Content -LiteralPath $env:V4J_SAFE_FILE -Raw -ErrorAction Stop | Set-Clipboard -ErrorAction Stop" >nul 2>nul
if errorlevel 1 goto CLIPBOARD_FALLBACK
echo SAFE REPORT COPIED TO CLIPBOARD. In your ChatGPT conversation press Ctrl+V and Send.
if not "%MODEL_EXIT%"=="0" echo SOURCE HOLD is valid diagnostic evidence, NOT a pass.
if not "%MODEL_EXIT%"=="0" goto DONE
set "FINAL_EXIT=0"
goto DONE
:CLIPBOARD_FALLBACK
echo Clipboard unavailable. Explorer will select the safe JSON. Attach ONLY that file.
start "" explorer.exe /select,"%V4J_SAFE_FILE%"
if not "%MODEL_EXIT%"=="0" echo SOURCE HOLD is valid diagnostic evidence, NOT a pass.
if not "%MODEL_EXIT%"=="0" goto DONE
set "FINAL_EXIT=0"
goto DONE
:NO_LOCALAPPDATA
echo HOLD: Windows LOCALAPPDATA unavailable.
goto DONE
:NO_GIT
echo HOLD: git.exe not found in PATH.
goto DONE
:NO_NODE
echo HOLD: node.exe not found in PATH.
goto DONE
:NO_FOLDER
echo HOLD: Cannot create isolated private folders.
goto DONE
:OWNED_COLLISION
echo HOLD: Random output folder collision. No overwrite.
goto DONE
:NO_GIT_CLONE
echo HOLD: Cannot clone research branch. No model calls.
goto DONE
:NO_HEAD
echo HOLD: Cannot verify Git HEAD. No model calls.
goto DONE
:NO_SAFE_SCRIPT
echo HOLD: Current research branch missing audited pilot or CI guard.
goto DONE
:CI_HOLD
echo HOLD: GitHub CI is not fully successful on this exact commit. NO model calls.
goto DONE
:NO_SAFE_OUTPUT
echo HOLD: No verified safe report available. Do not share PRIVATE original files.
goto DONE
:DONE
rem Only this run's brand-new isolated Git clone is deleted; PRIVATE studies stay.
if defined SOURCE_DIR if exist "%SOURCE_DIR%\.git" rmdir /s /q "%SOURCE_DIR%" >nul 2>nul
echo.
echo Exit status: %FINAL_EXIT%
pause
endlocal & exit /b %FINAL_EXIT%

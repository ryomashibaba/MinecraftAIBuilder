@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "FINAL_EXIT=0"
title MinecraftAIBuilder V4D - Safe one-click setup
rem Isolated branch download. Never modifies an existing MinecraftAIBuilder.
set "REPO_URL=https://github.com/ryomashibaba/MinecraftAIBuilder.git"
set "RESEARCH_BRANCH=feature/b198zr1-protected-architectural-revision"
rem CI-only V6 exact-head replay. --prepare-only makes no model call.
rem Fake-only --run-once requires a ready injected HTTP test server.
rem Normal user launch remains pinned to the legacy feature branch.
set "CI_V6_EXACT_HEAD="
if "%GITHUB_ACTIONS%"=="true" if "%CI%"=="true" if "%GITHUB_REF_NAME%"=="research/r125-v6-readonly-facade-diagnostic-20261111" if not "%GITHUB_SHA%"=="" if /i "%~1"=="--prepare-only" set "CI_V6_EXACT_HEAD=1"
if "%GITHUB_ACTIONS%"=="true" if "%CI%"=="true" if "%GITHUB_REF_NAME%"=="research/r125-v6-readonly-facade-diagnostic-20261111" if not "%GITHUB_SHA%"=="" if /i "%~1"=="--run-once" if "%MAB_V4D_TEST_DOUBLE_MODE%"=="1" if defined MAB_V4D_FAKE_READY_FILE if defined MAB_V4D_FAKE_POST_LOG if exist "%MAB_V4D_FAKE_READY_FILE%" set "CI_V6_EXACT_HEAD=1"
if defined CI_V6_EXACT_HEAD set "RESEARCH_BRANCH=research/r125-v6-readonly-facade-diagnostic-20261111"
set "MODEL_ID=qwen3:14b"
if not defined LOCALAPPDATA goto MISSING_LOCALAPPDATA
where git.exe >nul 2>nul
if errorlevel 1 goto MISSING_GIT
where node.exe >nul 2>nul
if errorlevel 1 goto MISSING_NODE
if /i "%~1"=="--check-only" goto CHECK_ONLY
if not "%~1"=="" if /i not "%~1"=="--prepare-only" if /i not "%~1"=="--run-once" goto BAD_ARGUMENT

set "WORK_ROOT=%LOCALAPPDATA%\MinecraftAIBuilder\IsolatedV4D"
if not exist "%WORK_ROOT%" mkdir "%WORK_ROOT%"
if not exist "%WORK_ROOT%" goto CANNOT_MAKE_FOLDER
set "WORK_DIR=%WORK_ROOT%\study-%RANDOM%-%RANDOM%"
if exist "%WORK_DIR%" goto FOLDER_COLLISION

echo.
echo [1/3] Downloading the research branch into a NEW isolated folder.
echo Existing MinecraftAIBuilder projects will NOT be changed.
echo.
set "GIT_LFS_SKIP_SMUDGE=1"
git.exe -c credential.interactive=never clone --quiet --depth 1 --single-branch --branch "%RESEARCH_BRANCH%" -- "%REPO_URL%" "%WORK_DIR%"
if errorlevel 1 goto CLONE_FAILED
for /f "delims=" %%G in ('git.exe -C "%WORK_DIR%" remote get-url origin 2^>nul') do set "ACTUAL_REMOTE=%%G"
if /i not "%ACTUAL_REMOTE%"=="%REPO_URL%" goto WRONG_REMOTE
for /f "delims=" %%G in ('git.exe -C "%WORK_DIR%" branch --show-current 2^>nul') do set "ACTUAL_BRANCH=%%G"
if not "%ACTUAL_BRANCH%"=="%RESEARCH_BRANCH%" goto WRONG_BRANCH
for /f "delims=" %%G in ('git.exe -C "%WORK_DIR%" rev-parse HEAD 2^>nul') do set "GIT_HEAD=%%G"
if "%GIT_HEAD%"=="" goto WRONG_HEAD
if defined CI_V6_EXACT_HEAD if /i not "%GIT_HEAD%"=="%GITHUB_SHA%" goto WRONG_HEAD
if not exist "%WORK_DIR%\scripts\r125-v4d-local-architect.mjs" goto MISSING_RUNNER
if not exist "%WORK_DIR%\scripts\r125-v4d-shareable-receipt.mjs" goto MISSING_RUNNER

echo [2/3] Research branch is prepared and verified.
echo Branch: %ACTUAL_BRANCH%
echo Git commit: %GIT_HEAD%
echo Isolated folder: %WORK_DIR%
echo.
if /i "%~1"=="--prepare-only" goto PREPARED
if /i "%~1"=="--run-once" goto RUN_MODEL
echo [3/3] Optional real local Qwen trial.
echo This contacts ONLY local Ollama at 127.0.0.1.
echo At most ONE model generation request. No Minecraft world write.
choice /C YN /M "Run one Qwen test now (Y=yes, N=prepare only)"
if errorlevel 2 goto PREPARED
if errorlevel 1 goto RUN_MODEL
goto PREPARED

:RUN_MODEL
set "PRIVATE_ROOT=%LOCALAPPDATA%\MinecraftAIBuilder\PrivateModelStudies"
if not exist "%PRIVATE_ROOT%" mkdir "%PRIVATE_ROOT%"
if not exist "%PRIVATE_ROOT%" goto CANNOT_MAKE_FOLDER
set "OUTPUT_DIR=%PRIVATE_ROOT%\V4D_%RANDOM%_%RANDOM%"
if exist "%OUTPUT_DIR%" goto FOLDER_COLLISION
echo.
echo Running ONE private compact-IR trial; no automatic retry.
node.exe "%WORK_DIR%\scripts\r125-v4d-local-architect.mjs" --compact --model "%MODEL_ID%" --out "%OUTPUT_DIR%" --prompt "Design an original small public library and workshop with a functional reception and a sheltered open-air community courtyard."
set "NODE_EXIT=%ERRORLEVEL%"
set "SHARE_FILE=%OUTPUT_DIR%\REVIEW_SUMMARY_SHAREABLE.json"
echo.
if "%NODE_EXIT%"=="0" goto SOURCE_READY
if not exist "%OUTPUT_DIR%\MODEL_RESPONSE_ORIGINAL.txt" goto NO_RAW_TO_DIAGNOSE
echo SOURCE HOLD: replaying saved response OFFLINE to classify the cause.
echo No additional model request will be sent.
set "REPLAY_DIR=%PRIVATE_ROOT%\V4D_REPLAY_%RANDOM%_%RANDOM%"
if exist "%REPLAY_DIR%" goto FOLDER_COLLISION
node.exe "%WORK_DIR%\scripts\r125-v4d-replay-private.mjs" --study "%OUTPUT_DIR%" --out "%REPLAY_DIR%"
if exist "%REPLAY_DIR%\REPLAY_SHAREABLE_STATUS.json" (
  set "SHARE_FILE=%REPLAY_DIR%\REPLAY_SHAREABLE_STATUS.json"
  echo Offline diagnostic saved. Original response remains private.
)
goto SHOW_RECEIPT

:NO_RAW_TO_DIAGNOSE
echo Model response was not saved; see original local preflight report.
goto SHOW_RECEIPT

:SOURCE_READY
echo Original response compiled; SOURCE candidate only, NOT ART PASS.
echo The private index.html is available for human review.
goto SHOW_RECEIPT

:SHOW_RECEIPT
if exist "%OUTPUT_DIR%\REVIEW_SUMMARY_SHAREABLE.json" (
 echo Model attempt summary saved locally.
) else (
 echo No model-attempt receipt was created; see error messages above.
)
rem Prefer diagnostics on failed outputs. Do not use variable assignments inside
rem a parenthesized CMD block because percent expansion is evaluated early.
if exist "%SHARE_FILE%" goto OPEN_RECEIPT
echo No shareable JSON was produced. Report the error above.
goto FINISH_MODEL

:OPEN_RECEIPT
echo Share ONLY the selected JSON with ChatGPT.
echo Shareable file: %SHARE_FILE%
if "%MAB_V4D_TEST_DOUBLE_MODE%"=="1" goto FINISH_MODEL
start "" explorer.exe /select,"%SHARE_FILE%"
goto FINISH_MODEL

:FINISH_MODEL
if not "%NODE_EXIT%"=="0" (
 echo Attempt finished with HOLD. Do not retry automatically.
 set "FINAL_EXIT=2"
)
goto DONE

:CHECK_ONLY
echo CHECK_ONLY_OK: git and node present. 0 clone, 0 model calls.
goto DONE
:PREPARED
echo PREPARED_ONLY: Branch ready; 0 model calls.
echo You can close this window and tell ChatGPT: PREPARED_ONLY.
goto DONE

:MISSING_LOCALAPPDATA
set "FINAL_EXIT=1"
echo ERROR: LOCALAPPDATA not available. Nothing changed.
goto DONE
:MISSING_GIT
set "FINAL_EXIT=1"
echo ERROR: Git is not available. Nothing changed.
goto DONE
:MISSING_NODE
set "FINAL_EXIT=1"
echo ERROR: Node.js is not available. Nothing changed.
goto DONE
:BAD_ARGUMENT
set "FINAL_EXIT=1"
echo ERROR: Supported flags are --check-only, --prepare-only, and --run-once.
goto DONE
:CANNOT_MAKE_FOLDER
set "FINAL_EXIT=1"
echo ERROR: Cannot create an isolated folder.
goto DONE
:FOLDER_COLLISION
set "FINAL_EXIT=1"
echo ERROR: Destination already exists. Nothing was overwritten.
goto DONE
:CLONE_FAILED
set "FINAL_EXIT=1"
echo ERROR: Git clone failed. Existing projects are untouched.
goto DONE
:WRONG_REMOTE
set "FINAL_EXIT=1"
echo ERROR: Unexpected origin URL. No model call.
goto DONE
:WRONG_BRANCH
set "FINAL_EXIT=1"
echo ERROR: Unexpected research branch. No model call.
goto DONE
:WRONG_HEAD
set "FINAL_EXIT=1"
echo ERROR: Cannot verify Git HEAD. No model call.
goto DONE
:MISSING_RUNNER
set "FINAL_EXIT=1"
echo ERROR: Trial source is missing. No model call.
goto DONE
:DONE
echo.
if /i "%~1"=="--check-only" (endlocal & exit /b %FINAL_EXIT%)
if /i "%~1"=="--prepare-only" (endlocal & exit /b %FINAL_EXIT%)
if /i "%~1"=="--run-once" (endlocal & exit /b %FINAL_EXIT%)
pause
endlocal

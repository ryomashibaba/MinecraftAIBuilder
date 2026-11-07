@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "FINAL_EXIT=0"
title MinecraftAIBuilder V4E - Experimental Ranked Glazing
rem Isolated branch download. Never modifies an existing MinecraftAIBuilder.
set "REPO_URL=https://github.com/ryomashibaba/MinecraftAIBuilder.git"
set "RESEARCH_BRANCH=feature/b198zr1-protected-architectural-revision"
set "MODEL_ID=qwen3:14b"
set "AUTHOR_FLAG=--ranked-windows"
if /i "%~1"=="--sectioned" set "AUTHOR_FLAG=--ranked-section"
if /i "%~1"=="--massing" set "AUTHOR_FLAG=--authored-massing"
if /i "%~1"=="--wing" set "AUTHOR_FLAG=--authored-wing"
if /i "%~1"=="--floorplate" set "AUTHOR_FLAG=--authored-floorplate"
if /i "%~1"=="--atrium" set "AUTHOR_FLAG=--authored-atrium"
if /i "%~1"=="--mezzanine" set "AUTHOR_FLAG=--authored-mezzanine"
if /i "%~1"=="--arcade" set "AUTHOR_FLAG=--authored-civic-arcade"
if not defined LOCALAPPDATA goto MISSING_LOCALAPPDATA
where git.exe >nul 2>nul
if errorlevel 1 goto MISSING_GIT
where node.exe >nul 2>nul
if errorlevel 1 goto MISSING_NODE
if /i "%~1"=="--check-only" goto CHECK_ONLY
if not "%~1"=="" if /i not "%~1"=="--prepare-only" if /i not "%~1"=="--run-once" if /i not "%~1"=="--sectioned" if /i not "%~1"=="--massing" if /i not "%~1"=="--wing" if /i not "%~1"=="--floorplate" if /i not "%~1"=="--atrium" if /i not "%~1"=="--mezzanine" if /i not "%~1"=="--arcade" if /i not "%~1"=="--arcade-five" goto BAD_ARGUMENT

set "WORK_ROOT=%LOCALAPPDATA%\MinecraftAIBuilder\IsolatedV4E"
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
if not exist "%WORK_DIR%\scripts\r125-v4d-local-architect.mjs" goto MISSING_RUNNER
if not exist "%WORK_DIR%\scripts\r125-v4d-shareable-receipt.mjs" goto MISSING_RUNNER
if not exist "%WORK_DIR%\source\ai\r125-v4e-ranked-exterior-ir.mjs" goto MISSING_RUNNER
if /i "%~1"=="--massing" if not exist "%WORK_DIR%\source\ai\r125-v4e-massing-author-ir.mjs" goto MISSING_RUNNER
if /i "%~1"=="--wing" if not exist "%WORK_DIR%\source\ai\r125-v4e-wing-author-ir.mjs" goto MISSING_RUNNER
if /i "%~1"=="--floorplate" if not exist "%WORK_DIR%\source\ai\r125-v4f-floorplate-author-ir.mjs" goto MISSING_RUNNER
if /i "%~1"=="--atrium" if not exist "%WORK_DIR%\source\ai\r125-v4g-height-author-ir.mjs" goto MISSING_RUNNER
if /i "%~1"=="--mezzanine" if not exist "%WORK_DIR%\source\ai\r125-v4h-mezzanine-author-ir.mjs" goto MISSING_RUNNER
if /i "%~1"=="--arcade" if not exist "%WORK_DIR%\source\ai\r125-v4j-civic-author-ir.mjs" goto MISSING_RUNNER
if /i "%~1"=="--arcade-five" if not exist "%WORK_DIR%\scripts\r125-v4j-five-genre-local.mjs" goto MISSING_RUNNER
if /i "%~1"=="--arcade-five" if not exist "%WORK_DIR%\scripts\r125-v4j-five-genre-replay.mjs" goto MISSING_RUNNER

echo [2/3] Research branch is prepared and verified.
echo Branch: %ACTUAL_BRANCH%
echo Git commit: %GIT_HEAD%
echo Isolated folder: %WORK_DIR%
echo.
if /i "%~1"=="--prepare-only" goto PREPARED
if /i "%~1"=="--run-once" goto RUN_MODEL
if /i "%~1"=="--arcade-five" goto FIVE_CHOICE
echo [3/3] Optional V4E ranked exterior research Qwen trial.
echo This contacts ONLY local Ollama at 127.0.0.1.
echo At most ONE model generation request. No Minecraft world write.
choice /C YN /M "Run one experimental V4E Qwen test (Y=yes, N=prepare only)"
if errorlevel 2 goto PREPARED
if errorlevel 1 goto RUN_MODEL
goto PREPARED

:FIVE_CHOICE
echo [3/3] Five distinct briefs: housing, shop, research, gallery and station.
echo Up to FIVE local Ollama attempts, strictly sequential; no paid API or world writes.
echo An offline five-genre diagnosis will run automatically afterwards, with ZERO extra model requests.
if "%MAB_V4D_TEST_DOUBLE_MODE%"=="1" goto RUN_FIVE_MODEL
choice /C YN /M "Run five independent V4J source-only Qwen studies (Y=yes, N=prepare only)"
if errorlevel 2 goto PREPARED
if errorlevel 1 goto RUN_FIVE_MODEL
goto PREPARED

:RUN_MODEL
set "PRIVATE_ROOT=%LOCALAPPDATA%\MinecraftAIBuilder\PrivateModelStudies"
if not exist "%PRIVATE_ROOT%" mkdir "%PRIVATE_ROOT%"
if not exist "%PRIVATE_ROOT%" goto CANNOT_MAKE_FOLDER
set "OUTPUT_DIR=%PRIVATE_ROOT%\V4E_%RANDOM%_%RANDOM%"
if exist "%OUTPUT_DIR%" goto FOLDER_COLLISION
echo.
echo Running ONE OPT-IN V4E ranked-exterior model trial; no automatic retry.
node.exe "%WORK_DIR%\scripts\r125-v4d-local-architect.mjs" %AUTHOR_FLAG% --model "%MODEL_ID%" --out "%OUTPUT_DIR%" --prompt "Design an original small public library and workshop with a functional reception and a sheltered open-air community courtyard."
set "NODE_EXIT=%ERRORLEVEL%"
set "SHARE_FILE=%OUTPUT_DIR%\REVIEW_SUMMARY_SHAREABLE.json"
echo.
if "%NODE_EXIT%"=="0" goto SOURCE_READY
if not exist "%OUTPUT_DIR%\MODEL_RESPONSE_ORIGINAL.txt" goto NO_RAW_TO_DIAGNOSE
echo SOURCE HOLD: replaying saved response OFFLINE to classify the cause.
echo No additional model request will be sent.
set "REPLAY_DIR=%PRIVATE_ROOT%\V4E_REPLAY_%RANDOM%_%RANDOM%"
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

:RUN_FIVE_MODEL
set "PRIVATE_ROOT=%LOCALAPPDATA%\MinecraftAIBuilder\PrivateModelStudies"
if not exist "%PRIVATE_ROOT%" mkdir "%PRIVATE_ROOT%"
if not exist "%PRIVATE_ROOT%" goto CANNOT_MAKE_FOLDER
set "OUTPUT_DIR=%PRIVATE_ROOT%\V4J_FIVE_%RANDOM%_%RANDOM%"
if exist "%OUTPUT_DIR%" goto FOLDER_COLLISION
node.exe "%WORK_DIR%\scripts\r125-v4j-five-genre-local.mjs" --model "%MODEL_ID%" --out "%OUTPUT_DIR%"
set "NODE_EXIT=%ERRORLEVEL%"
set "SHARE_FILE=%OUTPUT_DIR%\FIVE_GENRES_SHAREABLE_SUMMARY.json"
if not exist "%SHARE_FILE%" goto FIVE_NO_SUMMARY
rem Reuse the existing ZERO-POST replay against this precise ORIGINAL batch.
rem Replay writes ONLY into a fresh PRIVATE folder. Even a held model
rem answer is diagnosed without recontacting Ollama or changing the source.
set "FIVE_REPLAY_DIR=%PRIVATE_ROOT%\V4J_REPLAY_%RANDOM%_%RANDOM%"
if exist "%FIVE_REPLAY_DIR%" goto FOLDER_COLLISION
node.exe "%WORK_DIR%\scripts\r125-v4j-five-genre-replay.mjs" --study "%OUTPUT_DIR%" --out "%FIVE_REPLAY_DIR%"
set "REPLAY_EXIT=%ERRORLEVEL%"
if not "%REPLAY_EXIT%"=="0" (
 echo Offline comparison HOLD; keeping the original five-genre shareable summary.
 set "FINAL_EXIT=2"
)
if not exist "%FIVE_REPLAY_DIR%\FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json" goto FIVE_NO_REPLAY_SUMMARY
set "SHARE_FILE=%FIVE_REPLAY_DIR%\FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json"
echo Five-genre zero-model-call offline diagnostic created.
rem Show a real B143 comparison only when at least one true verified original
rem has been reconstructed. Synthetic responses never get visual ART promotion.
if "%MAB_V4D_TEST_DOUBLE_MODE%"=="1" goto FIVE_SHARE_SUMMARY
set "HAS_TRUE_REPLAY_VIEW="
for %%G in (housing shop research gallery station) do if exist "%FIVE_REPLAY_DIR%\%%G\TRUE_B143_FIVE_VIEWS_PRIVATE.svg" set "HAS_TRUE_REPLAY_VIEW=1"
if not defined HAS_TRUE_REPLAY_VIEW goto FIVE_SHARE_SUMMARY
if not exist "%FIVE_REPLAY_DIR%\FIVE_GENRES_PRIVATE_ART_REVIEW.html" goto FIVE_SHARE_SUMMARY
echo Opening the PRIVATE true-B143 five-genre ART HOLD comparison.
start "" "%FIVE_REPLAY_DIR%\FIVE_GENRES_PRIVATE_ART_REVIEW.html"
goto FIVE_SHARE_SUMMARY
:FIVE_NO_REPLAY_SUMMARY
echo No offline result available; the original 5-genre summary is preserved.
:FIVE_SHARE_SUMMARY
echo Share ONLY the safe summary file: %SHARE_FILE%
if "%MAB_V4D_TEST_DOUBLE_MODE%"=="1" goto FIVE_FINISHED
start "" explorer.exe /select,"%SHARE_FILE%"
goto FIVE_FINISHED
:FIVE_NO_SUMMARY
echo No summary created. Do not automatically retry.
:FIVE_FINISHED
if not "%NODE_EXIT%"=="0" set "FINAL_EXIT=2"
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
echo ERROR: Supported flags are --check-only, --prepare-only, --run-once, --sectioned, --massing, --wing, --floorplate, --atrium, --mezzanine, --arcade and --arcade-five.
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
if "%MAB_V4D_TEST_DOUBLE_MODE%"=="1" (endlocal & exit /b %FINAL_EXIT%)
pause
endlocal

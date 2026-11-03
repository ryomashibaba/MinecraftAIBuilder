@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "FINAL_EXIT=0"
title MinecraftAIBuilder V4D - Safe one-click setup
rem Isolated branch download. Never modifies an existing MinecraftAIBuilder.
set "REPO_URL=https://github.com/ryomashibaba/MinecraftAIBuilder.git"
set "RESEARCH_BRANCH=feature/b198zr1-protected-architectural-revision"
set "MODEL_ID=qwen3:14b"
if not defined LOCALAPPDATA goto MISSING_LOCALAPPDATA
where git.exe >nul 2>nul
if errorlevel 1 goto MISSING_GIT
where node.exe >nul 2>nul
if errorlevel 1 goto MISSING_NODE
if /i "%~1"=="--check-only" goto CHECK_ONLY
if not "%~1"=="" if /i not "%~1"=="--prepare-only" goto BAD_ARGUMENT

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
if not exist "%WORK_DIR%\scripts\r125-v4d-local-architect.mjs" goto MISSING_RUNNER
if not exist "%WORK_DIR%\scripts\r125-v4d-shareable-receipt.mjs" goto MISSING_RUNNER

echo [2/3] Research branch is prepared and verified.
echo Branch: %ACTUAL_BRANCH%
echo Git commit: %GIT_HEAD%
echo Isolated folder: %WORK_DIR%
echo.
if /i "%~1"=="--prepare-only" goto PREPARED
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
echo.
if exist "%OUTPUT_DIR%\REVIEW_SUMMARY_SHAREABLE.json" (
 echo Share ONLY REVIEW_SUMMARY_SHAREABLE.json with ChatGPT.
 echo Private study folder: %OUTPUT_DIR%
 start "" explorer.exe /select,"%OUTPUT_DIR%\REVIEW_SUMMARY_SHAREABLE.json"
) else (
 echo No shareable receipt was created. Report the error shown above.
)
if not "%NODE_EXIT%"=="0" echo Test returned HOLD. Do not retry automatically.
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
echo ERROR: Supported flags are --check-only and --prepare-only.
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
pause
endlocal

@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "launcher_dir=%~dp0"
set "repository_dir=%launcher_dir%"
set "runner=%repository_dir%scripts\r190n-one-click-research.mjs"
rem Portable entrypoint: a downloaded CMD alone does not include its JS modules.
if exist "%runner%" goto :ready
echo R190N: This CMD was downloaded without the repository's scripts folder.
echo R190N: The script itself is not missing from GitHub; only the local copy is incomplete.
where git.exe >nul 2>nul
if errorlevel 1 goto :no_git
set "repository_dir=%launcher_dir%MinecraftAIBuilder-R190N"
set "runner=%repository_dir%\scripts\r190n-one-click-research.mjs"
if exist "%runner%" goto :ready
if exist "%repository_dir%" goto :partial_repository
echo.
echo R190N: Git can fetch a shallow copy of your own GitHub repository.
echo Destination: "%repository_dir%"
echo This downloads program files from GitHub, not any Qwen/Gemma model.
echo No existing folder will be overwritten. Nothing touches Minecraft.
choice /C YN /N /M "Download the missing repository files now? [Y/N] "
if errorlevel 2 goto :declined
git clone --depth 1 --single-branch --branch feature/b198zr1-protected-architectural-revision https://github.com/ryomashibaba/MinecraftAIBuilder.git "%repository_dir%"
if errorlevel 1 goto :clone_failed
if not exist "%runner%" goto :clone_failed
:ready
where node.exe >nul 2>nul
if errorlevel 1 goto :no_node
cd /d "%repository_dir%"
if errorlevel 1 goto :directory_failed
echo R190-N: source-only local Qwen/Gemma research.
echo Saved evidence is reused unless --fresh is passed.
echo No Minecraft writes, no model downloads, no external model APIs.
node.exe "%runner%" %*
set "code=%ERRORLEVEL%"
echo.
if not "%code%"=="0" echo R190N: HOLD or prerequisite failure. Review the printed evidence folder if present.
pause
exit /b %code%
:no_git
echo R190N_HOLD: git.exe is not installed. The lone CMD has no JavaScript sources.
echo Clone the repository using Git, or place this CMD in the repository root.
echo https://github.com/ryomashibaba/MinecraftAIBuilder
goto :failed
:partial_repository
echo R190N_HOLD: "%repository_dir%" exists, but its scripts folder is incomplete.
echo R190N: This launcher will not overwrite or delete your existing files.
echo Reuse a complete checkout of the feature branch or rename the incomplete folder.
goto :failed
:declined
echo R190N_HOLD: Repository download declined; no model request was made.
goto :failed
:clone_failed
echo R190N_HOLD: Could not retrieve a complete repository. No model request was made.
echo Check your network and GitHub access; existing files are untouched.
goto :failed
:no_node
echo R190N_HOLD: Node.js is not available on PATH. No model request was made.
goto :failed
:directory_failed
echo R190N_HOLD: Could not enter the repository folder. No model request was made.
:failed
pause
exit /b 1

@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
echo MinecraftAIBuilder E2 - guarded one-click local Qwen source study
echo Offline checks first, then maximum one model request. No Minecraft writes.
where git >nul 2>nul
if errorlevel 1 goto stop
where node >nul 2>nul
if errorlevel 1 goto stop
set "EXPECTED_BRANCH=feature/b198zr1-protected-architectural-revision"
set "CURRENT_BRANCH="
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if /i not "%CURRENT_BRANCH%"=="%EXPECTED_BRANCH%" goto stop
set "DIRTY="
for /f "delims=" %%L in ('git status --porcelain --untracked-files=normal 2^>nul') do set "DIRTY=1"
if defined DIRTY goto stop
git fetch origin "%EXPECTED_BRANCH%"
if errorlevel 1 goto stop
git merge --ff-only FETCH_HEAD
if errorlevel 1 goto stop
node --test scripts\r190-e2-architecture.test.mjs scripts\r190-e2-offline-source.test.mjs scripts\r190-e2-qwen-study.test.mjs scripts\r190-e2-saved-diagnose.test.mjs
if errorlevel 1 goto stop
echo Offline E2 gates PASS; starting one explicit Qwen request.
node scripts\r190-e2-qwen-study.mjs
set "RESULT=%ERRORLEVEL%"
echo Upload E2_CHAT_HANDOFF.json from newest E2-qwen-* output folder.
if not "%RESULT%"=="0" echo SOURCE_HOLD or model issue. Keep original; no auto-retry.
pause
exit /b %RESULT%
:stop
echo HOLD before model request: check Git, clean working tree, target branch, network and offline tests.
pause
exit /b 2

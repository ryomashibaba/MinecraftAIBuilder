@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. HOLD: no model request was made.
  pause
  exit /b 2
)
echo MinecraftAIBuilder R125 - Japanese local LLM to Education MakeCode
echo This tool never edits a Minecraft world.
if /i "%~1"=="study-e2-diagnose" (
  echo E2: diagnose the latest ORIGINAL Qwen 3D source, no model calls
  node scripts\r190-e2-saved-diagnose.mjs --latest
) else (
if /i "%~1"=="study-e2" (
  echo E2: one local Qwen-authored freeform 3D building; SOURCE-only review
  node scripts\r190-e2-qwen-study.mjs
) else (
if /i "%~1"=="study-art-revise" (
  echo E1: SHA-verified correction of the latest failed research-lab ART proposal
  node scripts\r190-e1-art-candidate.mjs --revise-latest
) else (
if /i "%~1"=="study-art" (
  echo E1: SHA-locked research-lab art revision and original-vs-candidate B143 comparison
  node scripts\r190-e1-art-candidate.mjs
) else (
if /i "%~1"=="study-two-stage" (
  echo E1: model-authored massing, source-certified window choices, model-selected window
  node scripts\r190-e1-two-stage.mjs
) else (
  if /i "%~1"=="study-three" (
    echo E1: 3 independent Qwen R190 designs and source-only comparison
    node scripts\r125-r190-free-engine.mjs --study-three
  ) else (
    node scripts\r125-free-build.mjs
  )
)
)
)
)
)
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" echo HOLD: review the output and the model/error log.
pause
exit /b %RESULT%

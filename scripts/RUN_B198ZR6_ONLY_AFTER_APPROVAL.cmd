@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R6 is NOT approved by installing or opening this file.
rem A specific user must type a full per-run authorization phrase.
rem Does not access Minecraft or use cloud APIs. No automatic retry.
set "REPO=%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo [HOLD] Node.js not found. No model request started.
  exit /b 1
)
where powershell >nul 2>nul
if errorlevel 1 (
  echo [HOLD] Windows PowerShell not found. No model request started.
  exit /b 1
)
echo.
echo [B198Z-R6] SINGLE LOCAL QWEN SOURCE CAPTURE
echo Model: qwen3.8:27b / only one generation attempt
echo No Minecraft connection, construction or world read/write.
echo Original output saved byte-for-byte, even if invalid.
echo.
echo TYPE THE EXACT PHRASE BELOW ONLY AFTER APPROVING THIS RUN:
echo I_APPROVE_ONE_LOCAL_MODEL_REQUEST
set "ACK="
set /p "ACK=Approval phrase: "
if not "%ACK%"=="I_APPROVE_ONE_LOCAL_MODEL_REQUEST" (
  echo [HOLD] No explicit approval. Nothing started.
  exit /b 2
)
for /f %%G in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString()"') do set "RID=%%G"
if not defined RID (
  echo [HOLD] Unable to obtain a unique output ID.
  exit /b 1
)
set "ROOT=%LOCALAPPDATA%\MinecraftAIBuilder\R6_Evidence"
if not exist "%ROOT%" mkdir "%ROOT%"
if not exist "%ROOT%" (
  echo [HOLD] Cannot create output parent. No model request started.
  exit /b 1
)
set "R6_OUT=%ROOT%\R6_%RID%"
set "R6_ZIP=%ROOT%\R6_%RID%_UPLOAD_THIS_RESULT.zip"
if exist "%R6_OUT%" (
  echo [HOLD] Output exists already.
  exit /b 1
)
echo.
echo [R6] Starting exactly one authorized local source-only model attempt...
node "%~dp0b198zr6-authorized-single-r4-capture.mjs" --model qwen3.8:27b --authorize-one I_APPROVE_ONE_LOCAL_MODEL_REQUEST --out "%R6_OUT%"
set "R6_EXIT=%ERRORLEVEL%"
if not exist "%R6_OUT%" (
  echo [HOLD] No evidence folder; model operation did not complete.
  exit /b 1
)
set "R6_REPORT_MISSING=0"
if not exist "%R6_OUT%\R6_SINGLE_CAPTURE_RESULT.json" (
  echo [HOLD] Partial evidence only: R6 result JSON missing. Packing remaining evidence anyway.
  set "R6_REPORT_MISSING=1"
)
powershell -NoProfile -Command "Compress-Archive -LiteralPath $env:R6_OUT -DestinationPath $env:R6_ZIP -CompressionLevel Optimal"
if errorlevel 1 (
  echo [HOLD] Evidence exists but ZIP generation failed.
  echo Folder: %R6_OUT%
  exit /b 1
)
echo.
echo [R6] Upload this single ZIP back to ChatGPT:
echo %R6_ZIP%
echo.
if exist "%R6_ZIP%" (
  rem Bring the one upload file into view; no manual path searching.
  start "" explorer.exe /select,"%R6_ZIP%"
)
echo Inside the ZIP: index.html is the offline rotating 3D review.
echo B198W_REVIEW_BOARD.html provides the frozen human quality rubric.
echo.
if "%R6_REPORT_MISSING%"=="1" (
  echo [R8] Partial evidence ZIP saved; bring it back for diagnosis, never rerun automatically.
  exit /b 2
)
if not "%R6_EXIT%"=="0" (
  echo [R6] The model or source review is HOLD. Original evidence is retained.
  echo [R6] Never rerun automatically; ask for review of the saved ZIP.
  exit /b 2
)
echo [R6] Geometry/declared-claim checks passed; human approval still HOLD.
exit /b 0

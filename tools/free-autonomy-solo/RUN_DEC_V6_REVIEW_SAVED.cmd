@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Resume the SAVED MinecraftAIBuilder V6 PRIVATE proposal, NO new model call.
rem Docker QA only when already installed. Never install/pull or public push.
if /I "%~1"=="--ci-self-test" (
  echo DEC_V6_SAVED_REVIEW_CMD_STATIC_NO_MODEL
  exit /b 0
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: PowerShell missing; no auto-install.
  pause
  exit /b 2
)
where git.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Git missing; no auto-install.
  pause
  exit /b 2
)
echo.
echo Review previously saved Qwen14B V6 PRIVATE candidate without inference.
echo Candidate source stays PRIVATE. Only existing Docker QA may execute it.
echo No Minecraft writes, public GitHub upload or paid API.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('dec-v6-review-'+[guid]::NewGuid().ToString('N')+'.ps1'); $u='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/502e2ef6e3f50d66bb56d7bfbc4e0f5ac9a8a367/tools/free-autonomy-solo/RUN_DEC_V6_REVIEW_SAVED.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $u -OutFile $p; $h=((& git hash-object --no-filters $p)|Out-String).Trim(); if($h -cne 'b374e42c82e771ee06705e2daf128c66e2040f54'){throw 'V6_SAVED_REVIEW_PS1_IMMUTABLE_BLOB_HOLD'}; & $p"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
  echo HOLD: Candidate preserved. Do not regenerate Qwen.
) else (
  echo PRIVATE_SOURCE_QA_RESULT_READY; no ART or gameplay approval.
)
pause
exit /b %RESULT%

@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Genuine existing local Qwen3:14B. One response, immutable source, private evidence.
rem Nothing downloaded to user except the SHA-verified PowerShell launcher and fixed source.
if /I "%~1"=="--ci-self-test" (
  echo V4H_14B_NEW_CONTRACT_ONE_CLICK_STATIC_ONLY_NO_MODEL_NO_NETWORK
  exit /b 0
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Windows PowerShell is required.
  pause
  exit /b 2
)
where git.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Git is required. No auto-install.
  pause
  exit /b 2
)
echo One genuine Qwen14B architecture response, no model download or paid API.
echo Public project source is immutably pinned; source/world/ART safety preserved.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('dec-v4h-14b-'+[guid]::NewGuid().ToString('N')+'.ps1'); $u='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/ba9e13c9dd9402f35a2dec5de572739cef0046f5/scripts/DEC_RUN_REAL_QWEN14B_V4H_PINNED_ONCE.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $u -OutFile $p; $h=((& git hash-object $p)|Out-String).Trim(); if($h -cne '862f5ae5286d63a21303f110bb2773b802696290'){throw 'V4H_14B_LAUNCHER_IMMUTABLE_BLOB_HOLD'}; & $p"
set "RUN_EXIT=%ERRORLEVEL%"
echo.
if not "%RUN_EXIT%"=="0" (
  echo HOLD: no approved architecture; safe private receipt retained if generated.
) else (
  echo SOURCE-only candidate; human ART and Education world NOT approved.
)
pause
exit /b %RUN_EXIT%

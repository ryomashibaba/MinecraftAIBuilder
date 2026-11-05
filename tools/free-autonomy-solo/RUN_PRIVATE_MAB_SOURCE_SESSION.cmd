@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem MAB ONLY, preinstalled local Qwen14B. No model pull, source publish or paid API.
if /I "%~1"=="--ci-self-test" (
  echo PRIVATE_MAB_SOURCE_SESSION_CMD_STATIC_ONLY_NO_MODEL_NO_NETWORK
  exit /b 0
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Windows PowerShell required. Nothing installed.
  pause
  exit /b 2
)
where git.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Git required. Nothing installed.
  pause
  exit /b 2
)
echo.
echo MinecraftAIBuilder: local model - isolated QA - private code evidence.
echo If Docker and the audited Node image are absent: 0 new model generations.
echo The original source, main, public repo and Minecraft world stay unchanged.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('dec-mab-source-'+[guid]::NewGuid().ToString('N')+'.ps1'); $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/5b265667c622ccfe3097bcd7346bd9a16e086872/tools/free-autonomy-solo/RUN_PRIVATE_MAB_SOURCE_SESSION.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $p; $blob=((& git hash-object --no-filters $p)|Out-String).Trim(); if($blob -cne '99a2e1c6774d250232937ef45e2bcb5540ab4990'){throw 'MAB_PRIVATE_SOURCE_PS1_HASH_MISMATCH_NO_MODEL'}; & $p"
set "MAB_EXIT=%ERRORLEVEL%"
echo.
if not "%MAB_EXIT%"=="0" (
  echo HOLD: no approved source; private evidence or fail-closed receipt preserved.
) else (
  echo 2 independent QA passes with PRIVATE source/patch review; not ART or game pass.
)
pause
exit /b %MAB_EXIT%

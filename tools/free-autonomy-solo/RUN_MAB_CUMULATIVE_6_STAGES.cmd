@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem One immutable MAB research source; up to 3 cumulative 2-step QA cycles.
rem Does NOT auto-install Docker, Node, Ollama or download new model weights.
if /I "%~1"=="--ci-self-test" (
  echo MAB_SIX_CUMULATIVE_SOURCE_CMD_STATIC_NO_MODEL_NO_NETWORK
  exit /b 0
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Windows PowerShell required.
  pause
  exit /b 2
)
where git.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Git is required. No auto install.
  pause
  exit /b 2
)
echo.
echo MinecraftAIBuilder cumulative local source: Qwen14B - QA - private Git.
echo Existing Docker plus its vetted Node image is required BEFORE inference.
echo Max 3 cycles, up to 6 cumulative QA source revisions.
echo No Minecraft writes, no public source push, no paid APIs.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('mab-continuous-'+[guid]::NewGuid().ToString('N')+'.ps1'); $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/80f0beefbd2300b2a66a50967d9a07d5d9c19fdf/tools/free-autonomy-solo/RUN_MAB_CUMULATIVE_6_STAGES.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $p; $sha=((& git hash-object --no-filters $p)|Out-String).Trim(); if($sha -cne '8549272be3dd9c906a963dfae87559aaf6100d1c'){throw 'MAB_CUMULATIVE_PS1_BLOB_MISMATCH_NO_MODEL'}; & $p"
set "MAB_STATUS=%ERRORLEVEL%"
echo.
if not "%MAB_STATUS%"=="0" (
  echo HOLD: Do not consider partial QA or stopped session as success.
) else (
  echo Review ONLY: six cumulative source revisions passed isolated source QA.
)
pause
exit /b %MAB_STATUS%

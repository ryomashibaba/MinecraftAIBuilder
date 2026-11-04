@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem PRIVATE Ollama real-source pilot. No paid API, no GitHub push, no model install.
rem This CMD only downloads a pinned, SHA-verified research PowerShell launcher.
if /I "%~1"=="--ci-self-test" (
  echo PRIVATE_PILOT_CMD_CI_PARSER_ONLY_NO_MODEL_OR_DOWNLOAD
  exit /b 0
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Windows PowerShell is unavailable.
  pause
  exit /b 2
)
where git.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Git is required; nothing was downloaded.
  pause
  exit /b 2
)
echo Selecting one project and one already-installed LOCAL model.
echo The chosen model can generate PRIVATE drafts; no generated code is run.
echo No GitHub push, no Docker installation, no paid API or model download.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('dec-private-source-pilot-'+[guid]::NewGuid().ToString('N')+'.ps1'); $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/88851d440541bbfe1285335f2ffaf44e9bfc5a94/tools/free-autonomy-solo/RUN_QWEN14B_REAL_SOURCE_DRAFT_ONCE.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $p; $blob=((& git hash-object $p) | Out-String).Trim(); if($blob -cne '1c4b2ff13067d1711a3f0fb37fa09ea571846c48'){throw 'PINNED_LAUNCHER_INTEGRITY_HOLD'}; & $p"
set "PILOT_EXIT=%ERRORLEVEL%"
echo.
echo PRIVATE pilot finished with exit code %PILOT_EXIT%.
echo PRIVATE status JSON stays local; share it only when needed for diagnostics.
echo Do NOT upload private draft source or GitHub credentials.
pause
exit /b %PILOT_EXIT%

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
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('dec-private-source-pilot-'+[guid]::NewGuid().ToString('N')+'.ps1'); $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/495518a2560d237397b06658b57f54c33462cfb2/tools/free-autonomy-solo/RUN_QWEN14B_REAL_SOURCE_DRAFT_ONCE.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $p; $blob=((& git hash-object $p) | Out-String).Trim(); if($blob -cne 'fcb0c196b2bf5cd1755f3450a98eed3af0381e17'){throw 'PINNED_LAUNCHER_INTEGRITY_HOLD'}; & $p"
set "PILOT_EXIT=%ERRORLEVEL%"
echo.
echo PRIVATE pilot finished with exit code %PILOT_EXIT%.
echo Copy ONLY the displayed UPLOAD_THIS_SMALL_STATUS_JSON file back into ChatGPT.
echo Do NOT upload private draft source or GitHub credentials.
pause
exit /b %PILOT_EXIT%

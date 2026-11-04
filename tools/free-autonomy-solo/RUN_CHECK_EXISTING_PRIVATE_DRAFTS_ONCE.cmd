@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Re-check existing PRIVATE Qwen drafts. NO model call, Docker, source execution, or GitHub push.
if /I "%~1"=="--ci-self-test" (
  echo PRIVATE_EXISTING_DRAFT_AUDIT_CMD_PARSER_PASS_NO_SOURCE_OR_MODEL
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
  echo HOLD: Git is required; no changes were made.
  pause
  exit /b 2
)
echo Checking EXISTING MinecraftAIBuilder private drafts from Qwen3:14B.
echo No model rerun. No candidate execution, Docker, paid API or GitHub upload.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('dec-static-private-audit-'+[guid]::NewGuid().ToString('N')+'.ps1'); $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/2fb77b6c1fd3c10c0123f2a7c8e8217422d7fa23/tools/free-autonomy-solo/RUN_CHECK_EXISTING_PRIVATE_DRAFTS_ONCE.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $p; $sha=((& git hash-object $p) | Out-String).Trim(); if($sha -cne '9c7e9fb33f9b3c4c5a8da3f87598b25eb7e166ab'){throw 'STATIC_AUDIT_BOOTSTRAP_INTEGRITY_HOLD'}; & $p -Project minecraftaibuilder -Model qwen3:14b"
set "AUDIT_EXIT=%ERRORLEVEL%"
echo.
echo Static preflight exit code: %AUDIT_EXIT%.
echo Upload only SHAREABLE_STATIC_PREFLIGHT.json shown in Explorer.
echo Never upload private source, private diffs, prompts or credentials.
pause
exit /b %AUDIT_EXIT%

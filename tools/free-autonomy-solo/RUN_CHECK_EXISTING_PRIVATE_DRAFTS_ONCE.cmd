@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Read-only Node syntax check of existing PRIVATE Qwen drafts. NO model call, Docker, module execution, or GitHub push.
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
echo Parsing EXISTING MinecraftAIBuilder private Qwen3:14B drafts WITHOUT executing them.
echo No model rerun. No candidate execution, Docker, paid API or GitHub upload.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('dec-static-private-audit-'+[guid]::NewGuid().ToString('N')+'.ps1'); $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/21fffa8a3c734846396458fb245e660bd78e8410/tools/free-autonomy-solo/RUN_CHECK_EXISTING_PRIVATE_DRAFTS_ONCE.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $p; $sha=((& git hash-object $p) | Out-String).Trim(); if($sha -cne '4a25792d4dcc2b66d68e790cc8010f327e59c9c6'){throw 'STATIC_AUDIT_BOOTSTRAP_INTEGRITY_HOLD'}; & $p -Project minecraftaibuilder -Model qwen3:14b"
set "AUDIT_EXIT=%ERRORLEVEL%"
echo.
echo Module syntax-only check exit code: %AUDIT_EXIT%.
echo Upload only SHAREABLE_MJS_SYNTAX_RESULT.json shown in Explorer.
echo Never upload private source, private diffs, prompts or credentials.
pause
exit /b %AUDIT_EXIT%

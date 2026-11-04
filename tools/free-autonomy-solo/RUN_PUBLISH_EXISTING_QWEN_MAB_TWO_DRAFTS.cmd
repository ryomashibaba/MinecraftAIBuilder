@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem User-authorized PUBLIC submission of the two previously reviewed Qwen MAB source drafts.
rem PUBLIC Git history is irreversible. No model rerun, no paid APIs, no main write.
if /I "%~1"=="--ci-self-test" (
  echo PUBLIC_QWEN_QA_BOOTSTRAP_CMD_PARSER_ONLY_NO_PUSH_NO_SOURCE
  exit /b 0
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Windows PowerShell not found.
  pause
  exit /b 2
)
where git.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Git not found.
  pause
  exit /b 2
)
echo PUBLIC SOURCE NOTICE: The EXACT TWO existing Qwen3:14B draft snapshots
echo will be committed to GitHub PUBLIC research branch history permanently.
echo No re-generation, no Docker on Windows, no paid API, no main update.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('dec-public-two-drafts-'+[guid]::NewGuid().ToString('N')+'.ps1'); $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/4c59ca665c23256d7f6fe2b26fb818423fea9173/tools/free-autonomy-solo/RUN_PUBLISH_EXISTING_QWEN_MAB_TWO_DRAFTS.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $p; $actual=((& git hash-object $p) | Out-String).Trim(); if($actual -cne 'e54e744cf9ef105b66196895869f11e019e64889'){throw 'PINNED_PUBLIC_QA_BOOTSTRAP_BLOB_MISMATCH'}; & $p"
set "QA_EXIT=%ERRORLEVEL%"
echo.
echo Public source submission / independent GitHub QA exit code: %QA_EXIT%.
echo Send only SHAREABLE_REAL_QWEN_PUBLIC_QA_HANDOFF.json, NOT private source.
echo If GitHub authentication fails, source publication may remain unconfirmed.
pause
exit /b %QA_EXIT%

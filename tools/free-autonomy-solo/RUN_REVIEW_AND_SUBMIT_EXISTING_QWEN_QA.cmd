@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Default is review only: only typing PUBLIC later permits upload.
rem No model calls, generated code on Windows host, Docker install, paid API.
if /I "%~1"=="--ci-self-test" (
  echo REVIEWED_PUBLIC_QA_CMD_PARSER_ONLY_NO_DOWNLOAD_OR_PUSH
  exit /b 0
)
where git.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Git missing; no upload.
  pause
  exit /b 2
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: PowerShell missing; no upload.
  pause
  exit /b 2
)
echo Inspect the two exact existing Qwen3:14B MAB drafts before publishing.
echo GitHub is PUBLIC. Nothing uploads unless you explicitly type PUBLIC.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('dec-pinned-existing-source-public-review-'+[guid]::NewGuid().ToString('N')+'.ps1'); $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/c3734b9941ede33c8d4205344b19333934836500/tools/free-autonomy-solo/RUN_REVIEW_AND_SUBMIT_EXISTING_QWEN_QA.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $p; $actual=((& git hash-object $p) | Out-String).Trim(); if($actual -cne 'e22d6db137eb425021d98c1774a77354b6b94304'){throw 'PINNED_PUBLIC_REVIEW_LAUNCHER_INTEGRITY_HOLD'}; & $p"
set "QA_EXIT=%ERRORLEVEL%"
echo.
echo Public research source-QA handoff exit: %QA_EXIT%.
echo Upload only SHAREABLE_EXISTING_QWEN_PUBLIC_QA_STATUS.json, never private model drafts.
echo IMPORTANT: if PUBLIC was entered, failure here does NOT imply the upload was reversed.
pause
exit /b %QA_EXIT%

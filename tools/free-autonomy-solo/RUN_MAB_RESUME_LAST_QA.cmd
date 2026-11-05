@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Reuse only previously isolated-QA-approved MAB private Git commits.
rem No model/repo/package download other than SHA-verified trusted source.
if /I "%~1"=="--ci-self-test" (
  echo MAB_QA_RESUME_ONLY_STATIC_NO_MODEL_NO_NETWORK
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
  echo HOLD: Git required. No auto-install.
  pause
  exit /b 2
)
echo.
echo Resume the most recent stopped MinecraftAIBuilder PRIVATE QA session.
echo Re-validate all prior SOURCE QA Git commits before any model generation.
echo No replay of accepted stages, no public source push, no paid API.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('mab-resume-'+[guid]::NewGuid().ToString('N')+'.ps1'); $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/a3c9a55ce1e5c48e24e57ea44cac8c9923b00ab7/tools/free-autonomy-solo/RUN_MAB_CUMULATIVE_6_STAGES.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $p; $sha=((& git hash-object --no-filters $p)|Out-String).Trim(); if($sha -cne 'b83f39e56d68afc7ae32a493527a17a2e12a6a65'){throw 'MAB_QA_RESUME_BOOTSTRAP_BLOB_HOLD'}; & $p -ResumeLatest"
set "STATUS=%ERRORLEVEL%"
echo.
if not "%STATUS%"=="0" (
  echo HOLD: previous QA integrity failed or new model stage did not pass.
) else (
  echo SOURCE QA resumed successfully. Human ART and world remain NOT APPROVED.
)
pause
exit /b %STATUS%

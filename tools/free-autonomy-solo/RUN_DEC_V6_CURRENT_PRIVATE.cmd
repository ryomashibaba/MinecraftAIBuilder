@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Current V6 PRIVATE source, one local Qwen draft, no Docker execution by default.
rem Only fetch SHA-verified research tooling; never push original/model source.
if /I "%~1"=="--ci-self-test" (
  echo DEC_V6_PRIVATE_ONECLICK_STATIC_NO_MODEL_NO_NETWORK
  exit /b 0
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Windows PowerShell required. No install.
  pause
  exit /b 2
)
where git.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Git required. No install.
  pause
  exit /b 2
)
echo.
echo DEC current V6 PRIVATE local Qwen code proposal.
echo Default makes ONE unexecuted textual patch; no public GitHub push.
echo No Strata launch, no user-world writes, no paid API.
if /I "%~1"=="--qa" (
  echo Optional mode: existing Docker independent SOURCE QA only.
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('dec-v6-'+[guid]::NewGuid().ToString('N')+'.ps1'); $u='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/8b7ce2b47dce86334af6fb4400d86cd2a41b3bf0/tools/free-autonomy-solo/RUN_DEC_V6_CURRENT_PRIVATE.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $u -OutFile $p; $s=((& git hash-object --no-filters $p)|Out-String).Trim(); if($s -cne '846681bf4b07f61e494051cb56a3564a135b2c66'){throw 'DEC_V6_PS1_SHA_HOLD_NO_MODEL'}; & $p -WithDockerQa"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('dec-v6-'+[guid]::NewGuid().ToString('N')+'.ps1'); $u='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/8b7ce2b47dce86334af6fb4400d86cd2a41b3bf0/tools/free-autonomy-solo/RUN_DEC_V6_CURRENT_PRIVATE.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $u -OutFile $p; $s=((& git hash-object --no-filters $p)|Out-String).Trim(); if($s -cne '846681bf4b07f61e494051cb56a3564a135b2c66'){throw 'DEC_V6_PS1_SHA_HOLD_NO_MODEL'}; & $p"
)
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" (
  echo HOLD: no model source has been published. Check safe receipt only.
) else (
  echo PRIVATE-only result prepared. SOURCE QA and ART remain independent gates.
)
pause
exit /b %RESULT%

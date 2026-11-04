@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem ONE project, three independent genuine locally installed Qwen3:14B architecture briefs.
rem Downloads only SHA-verified public developer scripts; NO model pull, GitHub push or paid API.
if /I "%~1"=="--ci-self-test" (
  echo MAB_REAL_V4H_14B_CMD_STATIC_ONLY_NO_NETWORK_NO_MODEL
  exit /b 0
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Windows PowerShell unavailable.
  pause
  exit /b 2
)
where git.exe >nul 2>nul
if errorlevel 1 (
  echo HOLD: Git required. No auto install.
  pause
  exit /b 2
)
echo One model, ONE project, independent original public-building designs.
echo All original answers and B143 render artifacts remain private on this PC.
echo No Minecraft world writes, generated code execution, GitHub push, or paid API.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $p=Join-Path $env:TEMP ('mab-real-v4h-14b-'+[guid]::NewGuid().ToString('N')+'.ps1'); $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/22f76fcdb13de26a98126d929b474b1dca654e10/tools/free-autonomy-solo/RUN_REAL_MAB_V4H_14B_ARCHITECTURE.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $p; $blob=((& git hash-object $p) | Out-String).Trim(); if($blob -cne '3ff8f53348993d1da226e54c04f2cd5b2b746ce3'){throw 'PINNED_V4H_14B_LAUNCHER_INTEGRITY_HOLD'}; & $p"
set "V4H_EXIT=%ERRORLEVEL%"
echo.
if not "%V4H_EXIT%"=="0" (
  echo SOURCE HOLD - original private results preserved, no automatic repair.
) else (
  echo SOURCE-only private architecture evidence saved. ART and world still HOLD.
)
pause
exit /b %V4H_EXIT%

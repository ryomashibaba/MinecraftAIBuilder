@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem MAB V11 existing Qwen, Education new disposable-world prep only.
rem Default -Stage Probe. Explicit -Stage Preview for building MakeCode.
if not exist "%~dp0r125-v11-education-recovered.ps1" (
  echo MAB_EDUCATION_HOLD_SCRIPT_MISSING
  exit /b 2
)
where powershell.exe >nul 2>nul
if errorlevel 1 exit /b 2
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0r125-v11-education-recovered.ps1" %*
exit /b %ERRORLEVEL%

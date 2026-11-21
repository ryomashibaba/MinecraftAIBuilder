@echo off
rem V4E optional section-authoring trial, never the historical default.
rem Calls the existing one-click isolating launcher, with one local model POST.
if /i "%~1"=="--check-only" (
  call "%~dp0r125-v4e-one-click-ranked-trial.cmd" --check-only
) else (
  if not "%~1"=="" (
    echo ERROR: supported optional flag is --check-only only.
    exit /b 1
  )
  call "%~dp0r125-v4e-one-click-ranked-trial.cmd" --sectioned
)
exit /b %errorlevel%

@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem MAB V11: Retail entry. No Minecraft world changes by this launcher.
if not exist "%~dp0r125-v11-education-live-launch.ps1" (
    echo MAB_EDUCATION_HOLD_SCRIPT_MISSING
    exit /b 2
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
    echo MAB_EDUCATION_HOLD_POWERSHELL_MISSING
    exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0r125-v11-education-live-launch.ps1" -Mode Retail %*
set "RESULT=%ERRORLEVEL%"
if "%~1"=="-CheckOnly" exit /b %RESULT%
if not "%RESULT%"=="0" echo MAB_EDUCATION_HOLD. Review the error above.
echo.
echo Press any key to close this launcher window.
pause >nul
exit /b %RESULT%

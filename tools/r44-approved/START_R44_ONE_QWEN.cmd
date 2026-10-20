@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R44 - One Approved Local Qwen Trial
echo ============================================================
echo MinecraftAIBuilder R44 - 1 local Qwen 27B design generation
echo Model: qwen3.8:27b / user-approved single request
echo No Minecraft connection, world changes, or automatic retry
echo Original R25 evidence is never modified
echo ============================================================
where node >nul 2>nul
if errorlevel 1 (echo [HOLD] Node.js 24 required.& pause& exit /b 1)
where powershell.exe >nul 2>nul
if errorlevel 1 (echo [HOLD] Windows PowerShell required.& pause& exit /b 1)
echo.
echo IMPORTANT: GPU and system memory will be used by ONE real inference.
echo This request is ALREADY approved in Chat, but local confirmation
echo is still required to avoid accidental double-click execution.
set "R44_ACK="
set /p "R44_ACK=Type YES for ONE request (anything else cancels): "
if /I not "%R44_ACK%"=="YES" (
 echo [SAFE] Cancelled. No real Qwen request.
 pause
 exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_R44_ONE_APPROVED_REQUEST.ps1" -R44Consent I_APPROVE_R44_ONE_LOCAL_QWEN_REQUEST
set "RESULT=%ERRORLEVEL%"
if "%RESULT%"=="0" (
 echo [R44] Result ZIP is selected in Explorer.
) else (
 echo [R44 HOLD] If approval was consumed, do not run this again.
)
pause
exit /b %RESULT%

@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R17 - FUTURE MANUAL NEW APPROVAL ONLY
echo =======================================================
echo [R17] This is NOT the offline R16 installer.
echo [R17] Requires a FRESH one-time Qwen authorization.
echo [R17] No Minecraft Education world read or build.
echo [R17] THIS CAN SPEND LOCAL GPU TIME - DO NOT RUN YET.
echo =======================================================
where node >nul 2>nul
if errorlevel 1 (
 echo [HOLD] Node.js is unavailable.
 exit /b 1
)
where powershell.exe >nul 2>nul
if errorlevel 1 (
 echo [HOLD] PowerShell is unavailable.
 exit /b 1
)
echo DO NOT approve merely because this script exists.
echo First get NEW explicit permission for an R17 real Qwen inference.
echo.
echo EXACT NEW R17 PHRASE:
echo I_APPROVE_R17_ONE_LOCAL_QWEN_REQUEST
set "R17_ACK="
set /p "R17_ACK=Type it only after fresh approval: "
if not "%R17_ACK%"=="I_APPROVE_R17_ONE_LOCAL_QWEN_REQUEST" (
 echo [HOLD] No new R17 consent. Nothing started.
 exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_R17_ONCE_AFTER_FRESH_APPROVAL.ps1" -R17Consent "%R17_ACK%"
exit /b %ERRORLEVEL%

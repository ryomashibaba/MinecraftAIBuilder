@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder - One APPROVED local Qwen design capture
echo ===========================================================
echo MinecraftAIBuilder - ONE explicitly approved local Qwen run
echo User-approved Qwen: qwen3.8:27b, at most one generation.
echo Generates architectural source evidence only.
echo NO Minecraft world connection, readback or construction.
echo ===========================================================
where powershell.exe >nul 2>nul
if errorlevel 1 (
 echo [HOLD] Windows PowerShell is missing.
 pause
 exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
 echo [HOLD] Node.js is missing.
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0PREPARE_AND_START_APPROVED_ONCE.ps1"
set "R20_STATUS=%errorlevel%"
echo.
if "%R20_STATUS%"=="0" (
 echo [DONE] Open the highlighted R17_UPLOAD_THIS_RESULT.zip and upload it.
) else (
 echo [HOLD] Read the diagnostic output. Do NOT delete a consumed lock.
 echo [HOLD] Do NOT run a second local Qwen inference without new approval.
)
echo.
pause
exit /b %R20_STATUS%

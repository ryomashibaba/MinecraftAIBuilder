@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R24 - OFFLINE PREP ONLY
echo [R24] SAFE OFFLINE PREPARATION
echo [R24] No real Qwen inference. No Minecraft world operations.
where powershell.exe >nul 2>nul
if errorlevel 1 (echo [HOLD] PowerShell required.& pause& exit /b 1)
where node >nul 2>nul
if errorlevel 1 (echo [HOLD] Node.js required.& pause& exit /b 1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL_R24_OFFLINE_ONLY.ps1"
set "S=%errorlevel%"
if "%S%"=="0" (
 echo [PASS] R24 offline source QA completed. DO NOT run future Qwen yet.
) else (
 echo [HOLD] R24 offline preflight failed, no model generation requested.
)
pause
exit /b %S%

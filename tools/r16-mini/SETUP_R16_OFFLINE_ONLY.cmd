@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R16 MINI - preparation ONLY - NO real Qwen
echo =====================================================
echo [R16] PREPARE and TEST ONLY. NO real AI model calls.
echo [R16] Does NOT launch Minecraft or install any model.
echo =====================================================
where powershell.exe >nul 2>nul
if errorlevel 1 (
 echo [HOLD] Windows PowerShell is unavailable.
 pause
 exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
 echo [HOLD] Node.js is required for OFFLINE synthetic tests.
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL_R16_MINI.ps1"
if errorlevel 1 (
 echo [HOLD] Preparation failed. No Qwen call was made.
 pause
 exit /b 1
)
echo [PASS] R16 source integrity and offline mock tests completed.
echo [PASS] NO Qwen model generation. NO Minecraft construction.
echo Any future model generation needs FRESH specific approval.
pause
exit /b 0

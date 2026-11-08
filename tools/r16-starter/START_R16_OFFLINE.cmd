@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R16 - OFFLINE PREPARATION ONLY
echo [R16] This only prepares code and runs synthetic tests.
echo [R16] It does NOT generate buildings with the real Qwen model.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0FETCH_PINNED_R16.ps1"
if errorlevel 1 (
 echo [HOLD] Please share the error message with ChatGPT.
 pause
 exit /b 1
)
echo [PASS] Offline preparation only. Fresh approval required for any Qwen run.
pause
exit /b 0

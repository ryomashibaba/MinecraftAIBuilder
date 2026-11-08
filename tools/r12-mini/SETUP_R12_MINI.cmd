@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R12 MINI - Install + OFFLINE QA - NO QWEN
echo ==========================================================
echo [R12] Small installer + offline synthetic QA ONLY.
echo [R12] NEVER runs Qwen, Ollama, Minecraft, or an API model.
echo ==========================================================
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [HOLD] Windows PowerShell not found.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo [HOLD] Node.js missing. No download or inference started.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL_R12_MINI.ps1"
if errorlevel 1 (
  echo [HOLD] Setup failed. No Qwen or Minecraft used.
  pause
  exit /b 1
)
echo [PASS] R12 source package has been downloaded and verified.
echo [PASS] Only local synthetic test ran. NO real model call.
pause
exit /b 0

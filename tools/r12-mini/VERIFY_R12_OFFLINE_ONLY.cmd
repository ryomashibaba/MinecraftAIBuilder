@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R12 - OFFLINE QA ONLY - NO QWEN
echo [R12] Synthetic local inspection: no network, no Ollama and no Minecraft.
where node >nul 2>nul
if errorlevel 1 (
  echo [HOLD] Node.js not installed. No model was contacted.
  pause
  exit /b 1
)
node "%~dp0..\..\scripts\b198zr12-local-offline-qa.mjs"
if errorlevel 1 (
  echo [HOLD] Source-only tests failed. Never run Qwen for this.
  pause
  exit /b 1
)
echo [PASS] R9+R10+R11 offline synthetic QA done. No real model run.
pause
exit /b 0

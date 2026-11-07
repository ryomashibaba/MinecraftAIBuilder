@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R14 - saved R6 ZIP audit - NO QWEN
echo [R14] Re-review saved R6 result ZIP only.
echo [R14] No Qwen/Ollama request. No Minecraft read or construction.
echo You may also drag the old R6 result ZIP onto this CMD icon.
where powershell.exe >nul 2>nul
if errorlevel 1 (
 echo [HOLD] Windows PowerShell is missing.
 pause
 exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
 echo [HOLD] Node.js is missing. No model run started.
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_R14_REAUDIT.ps1" -ZipPath "%~1"
if errorlevel 1 (
 echo [HOLD] Audit failed safely. Original ZIP is untouched.
 pause
 exit /b 1
)
echo [DONE] Source-only re-audit complete. Qwen 0, Minecraft 0.
pause
exit /b 0

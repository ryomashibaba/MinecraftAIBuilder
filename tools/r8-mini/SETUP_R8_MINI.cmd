@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R8 MINI setup - NO MODEL EXECUTION
echo R8 MINI: downloads only required project files from pinned GitHub sources.
echo This is INSTALL ONLY. No Qwen inference, no Minecraft construction.
echo Requires internet access to raw.githubusercontent.com.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL_R8_MINI.ps1"
if errorlevel 1 (
  echo.
  echo [HOLD] Setup failed. No inference was used. See the error above.
  pause
  exit /b 1
)
echo.
echo [DONE] Only setup finished. NO model was executed.
pause
exit /b 0

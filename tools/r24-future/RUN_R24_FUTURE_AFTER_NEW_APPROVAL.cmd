@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R24 - FUTURE explicit one-time consent ONLY
echo =====================================================
echo [R24] FUTURE ONE-SHOT LOCAL QWEN 27B MODEL GENERATION
echo Only AFTER a separate NEW approval in the Chat.
echo Old R17 approval is already CONSUMED and cannot be reused.
echo No Minecraft world read/write/construction is allowed.
echo =====================================================
where powershell.exe >nul 2>nul
if errorlevel 1 (echo [HOLD] PowerShell required.& exit /b 1)
where node >nul 2>nul
if errorlevel 1 (echo [HOLD] Node.js required.& exit /b 1)
echo Confirm a NEW, explicit R23/R24 Qwen single-call approval in Chat.
echo EXACT future authorization phrase:
echo I_APPROVE_R23_ONE_LOCAL_QWEN_REQUEST
set "NEW_AUTH="
set /p "NEW_AUTH=Enter ONLY with NEW explicit approval: "
if not "%NEW_AUTH%"=="I_APPROVE_R23_ONE_LOCAL_QWEN_REQUEST" (
 echo [HOLD] No fresh authorization; no local model request.
 exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_R24_ONCE_ONLY_AFTER_NEW_APPROVAL.ps1" -R24Consent "%NEW_AUTH%"
exit /b %errorlevel%

@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R46 - One Approved Local Qwen Trial
echo ============================================================
echo R46: ONE approved local qwen3.8:27b generation on this PC
echo Model source and scripts are pinned to immutable Git blobs.
echo No Minecraft contact, placement, deletion or automatic retry.
echo ============================================================
where node >nul 2>nul
if errorlevel 1 (echo [HOLD] Node.js 24 required.& pause& exit /b 1)
where powershell.exe >nul 2>nul
if errorlevel 1 (echo [HOLD] PowerShell required.& pause& exit /b 1)
echo.
echo This ONE real local generation uses GPU/CPU resources.
echo Chat approval exists; local YES prevents accidental execution.
set "ACK="
set /p "ACK=Type YES to consume the R46 one-shot approval: "
if /I not "%ACK%"=="YES" (
 echo [SAFE] Cancelled. No model request.
 pause
 exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$rev='5c8cdc347c6209743eff8920030396dea44f77e4';$expected='74a7771a00f4e7d268af0b705f934640029f62e3';$dir=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\R46_Starter';[void](New-Item -ItemType Directory -Path $dir -Force);$dest=Join-Path $dir 'RUN_R46_ONE_APPROVED_REQUEST.ps1';[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;$web=New-Object Net.WebClient;try{$bytes=$web.DownloadData('https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+$rev+'/tools/r46-approved/RUN_R46_ONE_APPROVED_REQUEST.ps1')}finally{$web.Dispose()};$prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$bytes.Length+[char]0);$all=New-Object byte[] ($prefix.Length+$bytes.Length);[Array]::Copy($prefix,0,$all,0,$prefix.Length);[Array]::Copy($bytes,0,$all,$prefix.Length,$bytes.Length);$h=[Security.Cryptography.SHA1]::Create();try{$actual=([BitConverter]::ToString($h.ComputeHash($all))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()};if($actual -cne $expected){throw 'R46_STARTER_SHA_MISMATCH'};[IO.File]::WriteAllBytes($dest,$bytes);& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $dest -R46Consent I_APPROVE_R46_ONE_LOCAL_QWEN_REQUEST;exit $LASTEXITCODE"
set "RESULT=%ERRORLEVEL%"
if "%RESULT%"=="0" (
 echo [R46] Result ZIP selected in Explorer. Upload to ChatGPT.
) else (
 echo [R46 HOLD] If consent was consumed, NEVER retry automatically.
)
pause
exit /b %RESULT%

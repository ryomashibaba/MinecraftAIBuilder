@echo off
setlocal EnableExtensions DisableDelayedExpansion
title MinecraftAIBuilder R54 - FUTURE ONLY One Consented Local Trial
echo ============================================================
echo R54: FUTURE ONLY - requires NEW explicit Chat approval
echo Model source and scripts are pinned to immutable Git blobs.
echo No Minecraft contact, placement, deletion or automatic retry.
echo ============================================================
where node >nul 2>nul
if errorlevel 1 (echo [HOLD] Node.js 24 required.& pause& exit /b 1)
where powershell.exe >nul 2>nul
if errorlevel 1 (echo [HOLD] PowerShell required.& pause& exit /b 1)
echo.
echo This ONE real local generation uses GPU/CPU resources.
echo Chat approval MUST be granted separately before using this CMD.
set "ACK="
set /p "ACK=Type YES only AFTER a new R54 Chat approval: "
if /I not "%ACK%"=="YES" (
 echo [SAFE] Cancelled. No model request.
 pause
 exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$rev='63418118c09ccadc7576188cf0c4f146178be180';$expected='503a1d25b028300c1fee8d5f8f7f6d5b2614002d';$dir=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\R57_Future_Starter';[void](New-Item -ItemType Directory -Path $dir -Force);$dest=Join-Path $dir 'RUN_R54_ONE_FRESHLY_APPROVED_REQUEST.ps1';[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;$web=New-Object Net.WebClient;try{$bytes=$web.DownloadData('https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+$rev+'/tools/r56-future/RUN_R54_ONE_FRESHLY_APPROVED_REQUEST.ps1')}finally{$web.Dispose()};$prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$bytes.Length+[char]0);$all=New-Object byte[] ($prefix.Length+$bytes.Length);[Array]::Copy($prefix,0,$all,0,$prefix.Length);[Array]::Copy($bytes,0,$all,$prefix.Length,$bytes.Length);$h=[Security.Cryptography.SHA1]::Create();try{$actual=([BitConverter]::ToString($h.ComputeHash($all))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()};if($actual -cne $expected){throw 'R54_STARTER_SHA_MISMATCH'};[IO.File]::WriteAllBytes($dest,$bytes);& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $dest -R54Consent I_APPROVE_R54_ONE_LOCAL_QWEN_REQUEST;exit $LASTEXITCODE"
set "RESULT=%ERRORLEVEL%"
if "%RESULT%"=="0" (
 echo [R54] Result ZIP selected in Explorer. Upload to ChatGPT.
) else (
 echo [R54 HOLD] If consent was consumed, NEVER retry automatically.
)
pause
exit /b %RESULT%

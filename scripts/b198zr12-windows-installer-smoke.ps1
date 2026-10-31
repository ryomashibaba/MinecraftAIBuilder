# R12 real Windows setup smoke: installer + offline synthetic architecture,
# no Ollama, no actual Qwen calls, no Minecraft. The official user mini ZIP
# must contain the exact tracked setup/installer/README bytes.
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$starter=Join-Path $repo 'tools\r12-mini\SETUP_R12_MINI.cmd'
$installer=Join-Path $repo 'tools\r12-mini\INSTALL_R12_MINI.ps1'
$readme=Join-Path $repo 'tools\r12-mini\README_FIRST_JA.txt'
$qa=Join-Path $repo 'tools\r12-mini\VERIFY_R12_OFFLINE_ONLY.cmd'
foreach($p in @($starter,$installer,$readme,$qa)){
 if(-not (Test-Path -LiteralPath $p -PathType Leaf)){throw ('Missing '+$p)}
}
$check=(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -CheckOnly 2>&1 | Out-String)
if($LASTEXITCODE -ne 0 -or -not $check.Contains('22 pinned files')){throw ('Manifest failed: '+$check)}
if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js needed for synthetic QA'}
$originalLocal=$env:LOCALAPPDATA
$temp=Join-Path $env:RUNNER_TEMP ('r12-mini-ci-'+[guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $temp)
$env:LOCALAPPDATA=$temp
$install=Join-Path $temp 'MinecraftAIBuilder\R12_Mini_0e40f08e4bfd'
try{
 # This is the REAL first-click setup CMD. The fake stdin just handles pause.
 $output=('' | & $starter 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or -not $output.Contains('[PASS] Only local synthetic test ran.')) {
  throw ('R12 MINI real setup CMD failed: '+$output)
 }
 if(-not (Test-Path -LiteralPath $install)){throw 'No installed R12 folder'}
 $found=@(Get-ChildItem -LiteralPath $install -Recurse -File)
 if($found.Count -ne 22){throw ('Expected exactly 22 pinned files, found '+$found.Count)}
 if(Test-Path -LiteralPath (Join-Path $install 'scripts\RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd')){
  throw 'UNAUTHORIZED MODEL LAUNCHER WAS INCLUDED'
 }
 if(-not (Test-Path -LiteralPath (Join-Path $install 'source\ai\b198zr11-compact-r4-output.mjs'))){
  throw 'R11 compact guide not installed'
 }
 $test=(& node (Join-Path $install 'scripts\b198zr12-local-offline-qa.mjs') 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or -not $test.Contains('R12_OFFLINE_ONLY_PASS')){
  throw ('R9/R10/R11 offline synthetic QA failed: '+$test)
 }
 $again=(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or -not $again.Contains('Existing installation integrity verified')){
  throw ('R12 MINI idempotent re-verification failed: '+$again)
 }
 # An altered local source must be rejected rather than repaired silently.
 [IO.File]::AppendAllText(
  (Join-Path $install 'source\ai\b143-building-dsl.mjs'),'BAD')
 $oldPreference=$ErrorActionPreference
 try {
  $ErrorActionPreference='Continue'
  $tamper=(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer 2>&1 | Out-String)
  $tamperExit=$LASTEXITCODE
 }finally{$ErrorActionPreference=$oldPreference}
 if($tamperExit -eq 0 -or -not $tamper.Contains('Integrity mismatch')){
  throw ('Failed to detect altered source: '+$tamper)
 }
 Write-Host 'R12_MINI_REAL_WINDOWS_INSTALL_PASS'
 Write-Host '22 Git-blob-verified source files, one-click offline QA, recheck and tamper rejection PASS.'
 $global:LASTEXITCODE=0
}finally{
 $env:LOCALAPPDATA=$originalLocal
 if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue}
}

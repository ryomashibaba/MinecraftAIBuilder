# Windows PowerShell 5.1 real R16 download/install/fixtures:
# ONLY a fake local HTTP server is used by Node test cases.
# Check install, idempotence, integrity rejection, no model-run launcher.
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$script=Join-Path $repo 'tools\r16-mini\SETUP_R16_OFFLINE_ONLY.cmd'
$install=Join-Path $repo 'tools\r16-mini\INSTALL_R16_MINI.ps1'
$starter=Join-Path $repo 'tools\r16-starter\START_R16_OFFLINE.cmd'
$bootstrap=Join-Path $repo 'tools\r16-starter\FETCH_PINNED_R16.ps1'
$oldLocal=$env:LOCALAPPDATA
$oldCI=$env:CI
$temp=Join-Path $env:RUNNER_TEMP ('R16_MINI_CI_'+[Guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $temp)
$env:LOCALAPPDATA=$temp
$env:CI='true'
$dest=Join-Path $temp 'MinecraftAIBuilder\R16_Mini_a0438d8fa250'
try {
 $check=(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install -CheckOnly 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or -not $check.Contains('32 SHA-verified files')){
  throw ('R16 manifest preflight failed: '+$check)
 }
 if(-not (Test-Path -LiteralPath $starter) -or
    -not (Test-Path -LiteralPath $bootstrap)) {throw 'Starter ZIP scripts missing'}
 # Run actual 3-file user ZIP bootstrap first: pinned-downloads the pinned
 # installer, then 32-file source QA, without model launchers.
 $starterOut=('' | & $starter 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or -not $starterOut.Contains('Offline preparation only')){
  throw ('R16 real ZIP starter failed: '+$starterOut)
 }
 $cachedInstaller=Join-Path $temp 'MinecraftAIBuilder\R16_SetupCache\INSTALL_R16_8675fb2ca2aa.ps1'
 if(-not (Test-Path -LiteralPath $cachedInstaller -PathType Leaf)){
  throw 'R16 ZIP starter installer cache missing'
 }
 $output=('' | & $script 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or -not $output.Contains('[PASS] R16 source integrity')){
  throw ('R16 real Windows setup failed: '+$output)
 }
 if(-not (Test-Path -LiteralPath $dest -PathType Container)){
  throw 'R16 pinned output directory missing'
 }
 $files=@(Get-ChildItem -LiteralPath $dest -Recurse -File)
 if($files.Count -ne 32){throw ('Expected 32 files, found '+$files.Count)}
 if(Test-Path -LiteralPath (Join-Path $dest 'scripts\RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd')){
  throw 'UNAPPROVED_MODEL_EXECUTION_COMMAND_INCLUDED'
 }
 if(-not (Test-Path -LiteralPath (Join-Path $dest 'scripts\b198zr15-compare-saved-reviews.mjs'))){
  throw 'R15 benchmark comparison dependency not installed'
 }
 if(-not (Test-Path -LiteralPath (Join-Path $dest 'scripts\b198zr16-offline-preflight.mjs'))){
  throw 'R16 preparatory preflight missing'
 }
 # Second run MUST verify, never re-fetch or overwrite existing source.
 $recheck=(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or -not $recheck.Contains('Existing package SHA verified')){
  throw ('R16 repeated verification failed: '+$recheck)
 }
 # Tamper with a source and require immediate stop, WITHOUT auto repair.
 $tampered=Join-Path $dest 'source\ai\b143-building-dsl.mjs'
 [IO.File]::AppendAllText($tampered,'INVALID_APPEND')
 $prev=$ErrorActionPreference
 try{
  $ErrorActionPreference='Continue'
  $failOutput=(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install 2>&1 | Out-String)
  $failCode=$LASTEXITCODE
 }finally{$ErrorActionPreference=$prev}
 if($failCode -eq 0 -or -not $failOutput.Contains('INTEGRITY_MISMATCH')){
  throw ('R16 did not HOLD on edited source: '+$failOutput)
 }
 Write-Host 'R16_MINI_REAL_WINDOWS_PREPARE_PASS'
 Write-Host 'Source pin 32/32, real pinned download, R6/R11/R13/R15 mock HTTP suites, second run, mutation HOLD, zero model generation.'
 $global:LASTEXITCODE=0
}finally{
 $env:LOCALAPPDATA=$oldLocal
 $env:CI=$oldCI
 if(Test-Path -LiteralPath $temp){
  Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
 }
}

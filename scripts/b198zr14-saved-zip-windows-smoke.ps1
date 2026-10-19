# R14: real Windows one-click CMD, pinned GitHub-only downloads and re-audit
# from synthetic PREVIOUS response zip. Absolutely no real Qwen/Ollama request.
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$launcher=Join-Path $repo 'tools\r14-mini\SETUP_AND_REAUDIT_R14.cmd'
$installer=Join-Path $repo 'tools\r14-mini\INSTALL_R14_MINI.ps1'
$previous=$env:LOCALAPPDATA
$temp=Join-Path $env:RUNNER_TEMP ('R14_CI_'+[Guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $temp)
$env:LOCALAPPDATA=$temp
$env:CI='true'
try{
 $check=(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -CheckOnly 2>&1|Out-String)
 if($LASTEXITCODE -ne 0 -or -not $check.Contains('11 SHA-pinned')){
  throw ('R14 manifest check HOLD: '+$check)
 }
 $inFolder=Join-Path $temp 'R6_SYNTHETIC_CI'
 [void](New-Item -ItemType Directory -Path $inFolder)
 $raw='{"design":{"schema":"incomplete_qwen_mock","elements":['
 [IO.File]::WriteAllText((Join-Path $inFolder 'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),
  $raw,([Text.UTF8Encoding]::new($false)))
 $inZip=Join-Path $temp 'R6_SYNTHETIC_CI_UPLOAD_THIS_RESULT.zip'
 Compress-Archive -LiteralPath $inFolder -DestinationPath $inZip -CompressionLevel Optimal
 $before=(Get-FileHash -LiteralPath $inZip -Algorithm SHA256).Hash.ToLowerInvariant()
 # This is the exact Windows beginner CMD, stdin only acknowledges pause.
 $out=('' | & $launcher $inZip 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or -not $out.Contains('R14_OFFLINE_REAUDIT_COMPLETE')){
  throw ('R14 CMD input ZIP workflow failed: '+$out)
 }
 $after=(Get-FileHash -LiteralPath $inZip -Algorithm SHA256).Hash.ToLowerInvariant()
 if($before -ne $after){throw 'R14 altered original input ZIP'}
 $reports=Join-Path $temp 'MinecraftAIBuilder\R14_Reviews'
 $zipResults=@(Get-ChildItem -LiteralPath $reports -Filter 'R14_*_UPLOAD_THIS_AUDIT.zip' -File)
 if($zipResults.Count -ne 1){throw 'R14 did not produce exactly one audit ZIP'}
 $json=@(Get-ChildItem -LiteralPath $reports -Filter 'R13_OFFLINE_QUALITY_DECISION.json' -File -Recurse)
 if($json.Count -ne 1){throw 'R14 JSON quality report absent'}
 $data=Get-Content -LiteralPath $json[0].FullName -Raw -Encoding UTF8 | ConvertFrom-Json
 if($data.status -ne 'HOLD_ORIGINAL_JSON_TRUNCATED_OR_INVALID'){
  throw ('Incomplete mock model output was mislabeled: '+$data.status)
 }
 $manifest=@(Get-ChildItem -LiteralPath $reports -Filter 'R14_OFFLINE_AUDIT_MANIFEST.json' -File -Recurse)
 if($manifest.Count -ne 1){throw 'R14 SHA manifest missing'}
 $m=Get-Content -LiteralPath $manifest[0].FullName -Raw -Encoding UTF8 | ConvertFrom-Json
 if($m.sourceZipSha256 -ne $before -or
  $m.actualOllamaRequests -ne 0 -or $m.actualMinecraftWorldWrites -ne 0){
  throw 'R14 manifest provenance or safety mismatch'
 }
 # Re-audit same input: another new result, no silent overwrites.
 $out2=(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'tools\r14-mini\RUN_R14_REAUDIT.ps1') -ZipPath $inZip 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or -not $out2.Contains('R14_OFFLINE_REAUDIT_COMPLETE')){
  throw ('R14 second no-inference audit failed: '+$out2)
 }
 $zipResults=@(Get-ChildItem -LiteralPath $reports -Filter 'R14_*_UPLOAD_THIS_AUDIT.zip' -File)
 if($zipResults.Count -ne 2){throw 'R14 should create distinct runs without overwriting'}
 # Malicious zip path is rejected before any extraction or model contact.
 $evil=Join-Path $temp 'R6_EVIL.zip'
 Add-Type -AssemblyName System.IO.Compression
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 $archive=[IO.Compression.ZipFile]::Open($evil,[IO.Compression.ZipArchiveMode]::Create)
 try{
  $entry=$archive.CreateEntry('../R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt')
  $stream=New-Object IO.StreamWriter ($entry.Open())
  try{$stream.Write('evil')}finally{$stream.Dispose()}
 }finally{$archive.Dispose()}
 $old=$ErrorActionPreference
 try{
  $ErrorActionPreference='Continue'
  $reject=(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'tools\r14-mini\RUN_R14_REAUDIT.ps1') -ZipPath $evil 2>&1 | Out-String)
  $code=$LASTEXITCODE
 }finally{$ErrorActionPreference=$old}
 if($code -eq 0 -or -not $reject.Contains('R14_HOLD_UNSAFE_OR_NON_R6_ZIP_ENTRY')){
  throw ('Zip slip attempt was not blocked: '+$reject)
 }
 Write-Host 'R14_REAL_WINDOWS_ZIP_REAUDIT_PASS'
 Write-Host 'Correct HOLD for partial saved raw, zero-Qwen re-audit, original ZIP SHA unchanged, duplicate-free output, zip-slip rejected.'
 $global:LASTEXITCODE=0
}finally{
 $env:LOCALAPPDATA=$previous
 if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue}
}

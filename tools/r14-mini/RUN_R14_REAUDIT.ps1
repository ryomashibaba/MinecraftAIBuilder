# B198Z-R14: re-audit an existing R6 ZIP. NO model calls, Minecraft,
# Ollama, browser automation, repairs or writes to the supplied original.
# The only network step is SHA-checked installation of offline Node files.
param([string]$ZipPath)
$ErrorActionPreference='Stop'
function Hold([string]$reason){throw ('R14_HOLD_'+$reason)}
$zipRef=$null
$originalHashBefore=$null
try {
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){Hold 'NODEJS_NOT_INSTALLED'}
 # If no zip was dropped on the CMD, show a standard Windows file picker.
 if([string]::IsNullOrWhiteSpace($ZipPath)){
  if($env:CI -eq 'true'){Hold 'ZIP_PATH_REQUIRED_IN_CI'}
  Add-Type -AssemblyName System.Windows.Forms
  $picker=New-Object System.Windows.Forms.OpenFileDialog
  $picker.Title='R14: 過去の R6_UPLOAD_THIS_RESULT.zip を選択してください'
  $picker.Filter='保存済みR6 ZIP (*.zip)|*.zip'
  $picker.Multiselect=$false
  $picker.CheckFileExists=$true
  if($picker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK){
   Write-Host '[R14] キャンセルしました。モデルは一切動かしていません。'
   exit 0
  }
  $ZipPath=$picker.FileName
 }
 $item=Get-Item -LiteralPath $ZipPath -ErrorAction Stop
 if($item.PSIsContainer -or $item.Length -le 0 -or
  $item.Length -gt 15000000 -or $item.Extension -ne '.zip'){
  Hold 'ZIP_FILE_OR_SIZE_INVALID'
 }
 $originalHashBefore=(Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
 # Verify all source modules against immutable GitHub object IDs.
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'INSTALL_R14_MINI.ps1')
 if($LASTEXITCODE -ne 0){Hold 'PINNED_INSTALL_FAILED'}
 $root=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\R14_Mini_b320b2535374'
 $cli=Join-Path $root 'scripts\b198zr13-review-saved-capture.mjs'
 if(-not (Test-Path -LiteralPath $cli -PathType Leaf)){Hold 'PINNED_AUDITOR_NOT_INSTALLED'}
 $parent=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\R14_Reviews'
 [void](New-Item -ItemType Directory -Force -Path $parent)
 $runId=[guid]::NewGuid().ToString('N')
 $evidence=Join-Path $parent ('R14_evidence_'+$runId)
 $outDir=Join-Path $parent ('R14_review_'+$runId)
 $resultZip=Join-Path $parent ('R14_'+$runId+'_UPLOAD_THIS_AUDIT.zip')
 [void](New-Item -ItemType Directory -Path $evidence)
 # Inspect ZIP names, symlinks, counts and uncompressed sizes BEFORE reading.
 Add-Type -AssemblyName System.IO.Compression
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 $reader=[System.IO.Compression.ZipFile]::OpenRead($item.FullName)
 try{
  if($reader.Entries.Count -lt 1 -or $reader.Entries.Count -gt 100){
   Hold 'UNEXPECTED_ZIP_ENTRY_COUNT'
  }
  $wanted=@{
   'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'=120000
   'R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json'=300000
   'R6_SINGLE_CAPTURE_RESULT.json'=300000
  }
  $found=@{}
  [long]$total=0
  foreach($entry in $reader.Entries){
   $name=$entry.FullName
   # Never extract arbitrary archives or even parse traversal paths.
   if($name.Contains('\') -or $name.StartsWith('/') -or
    $name.Contains(':') -or $name -match '(^|/)\.\.(/|$)' -or
    $name -match '(^|/)\.(/|$)' -or
    $name -notmatch '^(?:R6_[a-zA-Z0-9._-]{1,100}/)?[a-zA-Z0-9._-]+/?$'){
    Hold 'UNSAFE_OR_NON_R6_ZIP_ENTRY'
   }
   if(((($entry.ExternalAttributes -shr 16) -band 61440) -eq 40960)){
    Hold 'UNTRUSTED_ZIP_SYMLINK'
   }
   if($entry.Length -gt 6000000){Hold 'OVERSIZED_ARCHIVE_ENTRY'}
   $total+=$entry.Length
   if($total -gt 15000000){Hold 'TOTAL_UNCOMPRESSED_ZIP_LIMIT'}
   if($name.EndsWith('/')){continue}
   $base=[IO.Path]::GetFileName($name)
   if($wanted.ContainsKey($base)){
    if($found.ContainsKey($base)){Hold 'DUPLICATE_EVIDENCE_ENTRY'}
    if($entry.Length -lt 1 -or $entry.Length -gt $wanted[$base]){
     Hold 'EVIDENCE_SIZE_INVALID'
    }
    $found[$base]=$entry
   }
  }
  if(-not $found.ContainsKey('R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt')){
   Hold 'ORIGINAL_MODEL_OUTPUT_NOT_IN_ZIP'
  }
  # Optional receipt/manifest absence is exposed by R13, not forged here.
  foreach($key in $found.Keys){
   $e=$found[$key]
   $stream=$e.Open()
   try{
    $out=New-Object System.IO.MemoryStream
    try{
     $buf=New-Object byte[] 8192
     [long]$size=0
     while(($count=$stream.Read($buf,0,$buf.Length)) -gt 0){
      $size+=$count
      if($size -gt $wanted[$key]){Hold 'DECOMPRESSION_LIMIT'}
      $out.Write($buf,0,$count)
     }
     if($size -ne $e.Length){Hold 'ARCHIVE_ENTRY_LENGTH_MISMATCH'}
     [IO.File]::WriteAllBytes((Join-Path $evidence $key),$out.ToArray())
    }finally{$out.Dispose()}
   }finally{$stream.Dispose()}
  }
 }finally{$reader.Dispose()}
 $reportOutput=(& node $cli --evidence $evidence --out $outDir 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or -not $reportOutput.Contains('R13_OFFLINE_CAPTURE_AUDIT')){
  Hold 'QUALITY_REVIEW_COULD_NOT_BE_COMPUTED'
 }
 $reportPath=Join-Path $outDir 'R13_OFFLINE_QUALITY_DECISION.json'
 $data=Get-Content -LiteralPath $reportPath -Encoding UTF8 -Raw | ConvertFrom-Json
 $extractedFile=Join-Path $evidence 'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'
 $extractedSha=(Get-FileHash -LiteralPath $extractedFile -Algorithm SHA256).Hash.ToLowerInvariant()
 if($data.rawSha256 -ne $extractedSha){
  Hold 'ANALYSIS_ORIGINAL_SHA_MISMATCH'
 }
 $after=(Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
 if($after -ne $originalHashBefore){Hold 'INPUT_ZIP_MODIFIED_UNEXPECTEDLY'}
 $manifest=[ordered]@{
  schema='minecraftaibuilder-b198zr14-offline-reaudit-result-v1'
  sourceZipFilename=$item.Name
  sourceZipSha256=$originalHashBefore
  modelOriginalRawSha256=$data.rawSha256
  r13DecisionStatus=$data.status
  modelGenerationPerformedByR14=$false
  actualOllamaRequests=0
  actualMinecraftWorldReads=0
  actualMinecraftWorldWrites=0
  sourceOriginalZipUntouched=$true
  modelAuthorshipIndependentlyCertified=$false
  humanAestheticsAutomaticallyApproved=$false
  readiness='NOT_PREPARED'
  blockedGates=9
  constructionApproved=$false
 }
 $manifestPath=Join-Path $outDir 'R14_OFFLINE_AUDIT_MANIFEST.json'
 [IO.File]::WriteAllText($manifestPath,
  (($manifest|ConvertTo-Json -Depth 5)+'`n'),([System.Text.UTF8Encoding]::new($false)))
 $payload=@((Join-Path $outDir 'R13_OFFLINE_QUALITY_DECISION.json'),
   (Join-Path $outDir 'R13_OFFLINE_QUALITY_OVERVIEW.html'),$manifestPath)
 Compress-Archive -LiteralPath $payload -DestinationPath $resultZip -CompressionLevel Optimal -ErrorAction Stop
 if(-not (Test-Path -LiteralPath $resultZip)){Hold 'REPORT_ZIP_MISSING'}
 Write-Host 'R14_OFFLINE_REAUDIT_COMPLETE'
 Write-Host ('R13 architecture decision: '+$data.status)
 Write-Host ('Original input ZIP: UNMODIFIED / '+$originalHashBefore)
 Write-Host ('Upload only: '+$resultZip)
 Write-Host '[R14] One local audit. Qwen model calls 0. Minecraft world operations 0.'
 if($env:CI -ne 'true'){
  Start-Process (Join-Path $outDir 'R13_OFFLINE_QUALITY_OVERVIEW.html')
  Start-Process explorer.exe -ArgumentList ('/select,"'+$resultZip+'"')
 }
 exit 0
}catch{
 Write-Host ('[R14 HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'No real Qwen call, no retry, no Minecraft contact and no source ZIP rewriting.'
 exit 1
}

# R52 FUTURE-RUNNER helper. NO Qwen request / no Minecraft.
# Drop-in replacement for Compress-Archive *after* original & audits are saved.
# New runner invokes ONE helper; the user still starts only one CMD and
# supplies only the final ZIP to ChatGPT. Never run with old consumed consent.
param(
 [Parameter(Mandatory=$true)][string]$EvidenceDir,
 [Parameter(Mandatory=$true)][string]$SourceRoot,
 [Parameter(Mandatory=$true)][string]$ZipOutput
)
$ErrorActionPreference='Stop'
try{
 $e=[IO.Path]::GetFullPath($EvidenceDir)
 $source=[IO.Path]::GetFullPath($SourceRoot)
 $dest=[IO.Path]::GetFullPath($ZipOutput)
 $runner=Join-Path $source 'scripts\b198zr52-postcapture-auto-storyboard.mjs'
 if(-not(Test-Path -LiteralPath $e -PathType Container)){throw 'EVIDENCE_FOLDER_MISSING'}
 if(-not(Test-Path -LiteralPath $runner -PathType Leaf)){throw 'PINNED_R52_NODE_RUNNER_MISSING'}
 if((Test-Path -LiteralPath $dest) -or
  (Split-Path -Parent $dest) -eq $e -or
  -not (Test-Path -LiteralPath (Split-Path -Parent $dest) -PathType Container)){
  throw 'ZIP_MUST_BE_NEW_SIBLING_OF_EVIDENCE'
 }
 if([IO.Path]::GetExtension($dest).ToLowerInvariant() -ne '.zip'){
  throw 'EXPECTED_ZIP_OUTPUT'
 }
 # No original response after a transport failure? Preserve the early
 # failure logs in the ZIP without inventing model bytes or a preview.
 # When a raw DOES exist, any SHA mismatch is strictly fatal.
 $rawFiles=@(Get-ChildItem -LiteralPath $e -File |
  Where-Object {$_.Name -match '^R[0-9]+_ORIGINAL_MODEL_RESPONSE_UNMODIFIED[.]txt
 if(-not (Test-Path -LiteralPath $dest -PathType Leaf)){
  throw 'R52_ARCHIVE_NOT_WRITTEN'
 }
 Write-Host ('R52_UPLOAD_THIS_RESULT_ZIP='+$dest)
 Write-Host '[R52] R51 storyboard automatically included when B143 failed.'
 Write-Host '[R52] No model request, no world actions, no retry.'
 exit 0
}catch{
 Write-Host ('[R52 ZIP HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'Existing model original and previous ZIPs are never modified.'
 exit 1
}
})
 if($rawFiles.Count -eq 0){
  $logs=@(Get-ChildItem -LiteralPath $e -File)
  if($logs.Count -eq 0){throw 'NO_CAPTURE_OR_EARLY_FAILURE_EVIDENCE'}
  Write-Host '[R52] No raw model response; packaging existing early-failure evidence WITHOUT diagram.'
 }else{
  # Internal offline source preview generation; no network or model call.
  # Fail closed on wrong raw SHA or ambiguous original.
  & node $runner --evidence-dir $e
  if($LASTEXITCODE -ne 0){throw 'R52_DIAGNOSTIC_SHA_OR_SOURCE_HOLD'}
 }
 Compress-Archive -LiteralPath $e -DestinationPath $dest -CompressionLevel Optimal -ErrorAction Stop
 if(-not (Test-Path -LiteralPath $dest -PathType Leaf)){
  throw 'R52_ARCHIVE_NOT_WRITTEN'
 }
 Write-Host ('R52_UPLOAD_THIS_RESULT_ZIP='+$dest)
 Write-Host '[R52] R51 storyboard automatically included when B143 failed.'
 Write-Host '[R52] No model request, no world actions, no retry.'
 exit 0
}catch{
 Write-Host ('[R52 ZIP HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'Existing model original and previous ZIPs are never modified.'
 exit 1
}

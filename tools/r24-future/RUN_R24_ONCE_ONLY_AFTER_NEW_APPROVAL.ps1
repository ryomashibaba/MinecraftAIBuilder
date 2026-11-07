# R24 FUTURE ONLY. Not distributed for real execution until the user
# grants a completely NEW explicit R23 request authorization in Chat.
# R17 consent is consumed. Minecraft read/write never permitted.
param([string]$R24Consent)
$ErrorActionPreference='Stop'
$required='I_APPROVE_R23_ONE_LOCAL_QWEN_REQUEST'
$model='qwen3.8:27b'
$revision='44108944d0d9b0f892d01729c3fa3c76d006fe55'
$expectedInstallerBlob='65c6b5308a1921629d0a656dd0b1c0e81cea621b'
function GitBlobSha([byte[]]$bytes){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$bytes.Length+[char]0)
 $full=New-Object byte[] ($prefix.Length+$bytes.Length)
 [Array]::Copy($prefix,0,$full,0,$prefix.Length)
 [Array]::Copy($bytes,0,$full,$prefix.Length,$bytes.Length)
 $sha=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($sha.ComputeHash($full))).Replace('-','').ToLowerInvariant()}
 finally{$sha.Dispose()}
}
function SaveUtf8([string]$p,[string]$txt){
 [IO.File]::WriteAllText($p,$txt,(New-Object Text.UTF8Encoding($false)))
}
try{
 # Reject old R17 consent, blank input or accidental double click BEFORE
 # touching any actual model (including the read-only model-list GET).
 if($R24Consent -cne $required){throw 'FRESH_R23_APPROVAL_NOT_PROVIDED'}
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_MISSING'}
 if(-not(Get-Command node -ErrorAction SilentlyContinue)){
  throw 'NODE_REQUIRED'
 }
 $installer=Join-Path $PSScriptRoot 'INSTALL_R24_OFFLINE_ONLY.ps1'
 if(-not(Test-Path -LiteralPath $installer -PathType Leaf) -or
  (GitBlobSha ([IO.File]::ReadAllBytes($installer))) -cne $expectedInstallerBlob){
  throw 'R24_PINNED_INSTALLER_MISSING_OR_MUTATED'
 }
 # Do NOT auto-install or download when real inference is requested.
 # Run the separate offline setup first. Reverify every source byte now.
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -CheckOnly
 if($LASTEXITCODE -ne 0){throw 'R24_SOURCE_SHA_CHECK_FAILED'}
 $base=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\R24_OneShot_Evidence'
 if(Test-Path -LiteralPath (Join-Path $base 'R23_APPROVAL_CONSUMED_LOCK.txt')){
  throw 'R23_ONE_REQUEST_ALREADY_CONSUMED_NO_RETRY'
 }
 $source=Join-Path $env:LOCALAPPDATA ('MinecraftAIBuilder\R24_Mini_'+$revision.Substring(0,12))
 $child=Join-Path $source 'scripts\b198zr23-future-one-shot.mjs'
 if(-not(Test-Path -LiteralPath $child -PathType Leaf)){
  throw 'R23_PINNED_SOURCE_NOT_FOUND'
 }
 # R23 itself validates the exact model via read-only /api/tags and then
 # atomically consumes its separate approval BEFORE any expensive POST.
 Write-Host '[R24] One future-approved local Qwen source request ONLY.'
 Write-Host '[R24] No automatic model retry and NO Minecraft construction.'
 & node $child --consent $required --base $base --model $model
 $nodeExit=$LASTEXITCODE
 $lock=Join-Path $base 'R23_APPROVAL_CONSUMED_LOCK.txt'
 if(-not(Test-Path -LiteralPath $lock -PathType Leaf)){
  # No expensive request is supposed to be possible without this lock;
  # preserve the error without claiming whether any transport happened.
  throw 'R23_DID_NOT_CONSUME_LOCK_NO_MODEL_SUCCESS_CLAIM'
 }
 $folders=@(Get-ChildItem -LiteralPath $base -Directory |
  Where-Object {$_.Name -like 'R23_*'})
 if($folders.Count -eq 1){
  $folder=$folders[0].FullName
 }else{
  # A child crash after an irreversible lock might have no evidence folder.
  # Never silently throw away that diagnostic or make a second model call.
  $folder=Join-Path $base ('R24_EARLY_FAILURE_'+[guid]::NewGuid().ToString('N'))
  [void](New-Item -ItemType Directory -Path $folder)
  SaveUtf8 (Join-Path $folder 'R24_NO_SINGLE_RESULT_FOLDER.txt') (
   'HOLD: approval already consumed; cannot isolate one R23 result folder. Model transport status unknown. NEVER RETRY.')
  $nodeExit=2
 }
 $auditPath=Join-Path $folder 'R23_EVIDENCE_CHAIN_AUDIT.json'
 $auditStatus='HOLD_AUDIT_UNAVAILABLE'
 $rawMatch=$false
 $issues=@()
 if(Test-Path -LiteralPath $auditPath -PathType Leaf){
  try{
   $audit=Get-Content -LiteralPath $auditPath -Raw -Encoding UTF8 |
    ConvertFrom-Json -ErrorAction Stop
   $auditStatus=$audit.status
   # Use the same .NET raw-byte SHA calculation as R18/R23. On some
   # Windows PowerShell 5.1 hosts Get-FileHash/PS pipeline throws AFTER
   # successful JSON parsing; classify it separately rather than converting
   # an intact raw original into an unreadable audit claim.
   $raw=Join-Path $folder 'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'
   if(Test-Path -LiteralPath $raw -PathType Leaf){
    try{
     $hash=[Security.Cryptography.SHA256]::Create()
     try{
      $bytes=[IO.File]::ReadAllBytes($raw)
      $digest=([BitConverter]::ToString($hash.ComputeHash($bytes))).Replace('-','').ToLowerInvariant()
     }finally{$hash.Dispose()}
     $rawMatch=($digest -ceq [string]$audit.rawSha256)
     if(-not $rawMatch){$issues+='R24_RAW_DIGEST_MISMATCH'}
    }catch{$issues+='R24_RAW_SHA_CALCULATION_FAILED'}
   }else{$issues+='R24_RAW_MISSING'}
   if($null -ne $audit.issues -and @($audit.issues).Count -gt 0){
    $issues+='R23_AUDIT_HAS_ISSUES'
   }
  }catch{$issues+='R24_AUDIT_JSON_OR_FIELDS_INVALID'}
 }else{$issues+='R23_AUDIT_MISSING'}
 if($nodeExit -eq 0 -and
   ($auditStatus -cne 'EVIDENCE_CHAIN_PASS_HUMAN_REVIEW_REQUIRED' -or
    -not $rawMatch -or $issues.Count -gt 0)){
  $nodeExit=2
 }
 $manifest=[ordered]@{
  schema='minecraftaibuilder-b198zr24-windows-one-shot-evidence-v1'
  originalR23ExitCode=$LASTEXITCODE
  packagedExitCode=$nodeExit
  evidenceChainStatus=$auditStatus
  auditAndRawMatch=$rawMatch
  packagingIssues=@($issues)
  model=$model
  profile='r22-quality'
  approvalConsumed=$true
  attemptsAllowed=1
  automaticRetries=0
  modelIdentityIndependentlyAuthenticated=$false
  constructionApproved=$false
  worldContacts=0
  worldWrites=0
  readiness='NOT_PREPARED'
  gates=@('BLOCKED','BLOCKED','BLOCKED','BLOCKED','BLOCKED',
   'BLOCKED','BLOCKED','BLOCKED','BLOCKED')
  BuildPlan=@{operations=@()}
 }
 $manifestFile=Join-Path $folder 'R24_PACKAGING_MANIFEST.json'
 SaveUtf8 $manifestFile (($manifest|ConvertTo-Json -Depth 5)+[Environment]::NewLine)
 $zip=Join-Path $base ((Split-Path $folder -Leaf)+'_UPLOAD_THIS_RESULT.zip')
 Compress-Archive -LiteralPath $folder -DestinationPath $zip -CompressionLevel Optimal -ErrorAction Stop
 if(-not(Test-Path -LiteralPath $zip -PathType Leaf)){
  throw 'R24_ATTEMPT_CONSUMED_BUT_RESULT_ZIP_MISSING'
 }
 Write-Host ('R24_UPLOAD_THIS_RESULT_ZIP: '+$zip)
 if($env:CI -ne 'true'){
  Start-Process explorer.exe -ArgumentList ('/select,"'+$zip+'"')
 }
 if($nodeExit -ne 0){
  Write-Host '[R24 HOLD] Evidence ZIP preserved. Never repeat consumed request.'
  exit 2
 }
 Write-Host '[R24] Evidence packaged. Independent 3D/human review required.'
 exit 0
}catch{
 Write-Host ('[R24 HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'No automatic reattempt. If the R23 lock was consumed, DO NOT rerun.'
 exit 1
}

# R17 — FUTURE ONLY after a completely NEW, explicit user approval.
# Never called by any R16 installer, bootstrap, CI setup or offline QA.
# Explicit separate consent + atomic once-per-install guard BEFORE Ollama.
# The R16 source is SHA-pinned; never trusts any unverified working tree.
param([string]$R17Consent)
$ErrorActionPreference='Stop'
$MODEL='qwen3.8:27b'
$required='I_APPROVE_R17_ONE_LOCAL_QWEN_REQUEST'
$revision='a0438d8fa2504564351f8ebafbe9ecc14575dc95'
$installerRevision='8675fb2ca2aad9e631246a5c429dd82756cab322'
$installerSha='8f4224bac2fc2fde9c5ac311052a5887174a9402'
function GitBlobSha([byte[]]$bytes){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$bytes.Length+[char]0)
 $full=New-Object byte[] ($prefix.Length+$bytes.Length)
 [Array]::Copy($prefix,0,$full,0,$prefix.Length)
 [Array]::Copy($bytes,0,$full,$prefix.Length,$bytes.Length)
 $hasher=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($hasher.ComputeHash($full))).Replace('-','').ToLowerInvariant()}
 finally{$hasher.Dispose()}
}
$originalNodeExit=1
try{
 if($R17Consent -cne $required){throw 'FRESH_R17_CONSENT_NOT_PROVIDED'}
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_MISSING'}
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'NODEJS_REQUIRED'}
 $p=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder'
 $source=Join-Path $p ('R16_Mini_'+$revision.Substring(0,12))
 $installer=Join-Path $p ('R16_SetupCache\INSTALL_R16_'+$installerRevision.Substring(0,12)+'.ps1')
 if(-not (Test-Path -LiteralPath $source -PathType Container)){
  throw 'R16_OFFLINE_PREPARATION_REQUIRED'
 }
 if(-not (Test-Path -LiteralPath $installer -PathType Leaf) -or
  (GitBlobSha ([IO.File]::ReadAllBytes($installer))) -ne $installerSha){
  throw 'PINNED_R16_INSTALLER_MISSING_OR_MUTATED'
 }
 # Existing R16 installer will recheck *all 32 hashes* and run the mock
 # suites again. No contact to actual model; do not allow source edits.
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer
 if($LASTEXITCODE -ne 0){throw 'PINNED_SOURCE_OR_SYNTHETIC_QA_FAILED'}
 $node=Join-Path $source 'scripts\b198zr6-authorized-single-r4-capture.mjs'
 if(-not (Test-Path -LiteralPath $node -PathType Leaf)){
  throw 'PINNED_CAPTURE_MODULE_MISSING'
 }
 $root=Join-Path $p 'R17_OneShot_Evidence'
 [void](New-Item -ItemType Directory -Path $root -Force)
 $guard=Join-Path $root 'R17_APPROVAL_CONSUMED_LOCK.txt'
 # Process-wide one-shot gate: only CreateNew may create, and subsequent
 # attempts cannot start an Ollama model request. Failed/partial attempt
 # stays consumed; a NEW future release and explicit user consent required.
 try{
  $lock=[IO.File]::Open($guard,
   [IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
 }catch [System.IO.IOException]{
  throw 'ONE_R17_ATTEMPT_ALREADY_CONSUMED_NO_AUTO_RETRY'
 }
 try{
  $mark=[Text.Encoding]::ASCII.GetBytes('R17 consent consumed. No retry. Model=qwen3.8:27b. Source only.')
  $lock.Write($mark,0,$mark.Length)
  $lock.Flush()
 }finally{$lock.Dispose()}
 $id=[Guid]::NewGuid().ToString()
 $folder=Join-Path $root ('R17_'+$id)
 $resultZip=Join-Path $root ('R17_'+$id+'_UPLOAD_THIS_RESULT.zip')
 Write-Host '[R17] New explicit consent accepted and irreversibly consumed.'
 Write-Host '[R17] Exactly one planned-source Qwen request, no automatic retries.'
 & node $node --model $MODEL --authorize-one I_APPROVE_ONE_LOCAL_MODEL_REQUEST --out $folder --prompt-profile r11-compact --source-tokens 3072 --context-tokens 6144
 $originalNodeExit=$LASTEXITCODE
 if(-not (Test-Path -LiteralPath $folder -PathType Container)){
  throw 'ATTEMPT_CONSUMED_BUT_NO_RESULT_FOLDER'
 }
 # Report only; no imaginary comparison to historic R6 evidence.
 $manifest=[ordered]@{
  schema='minecraftaibuilder-b198zr17-future-one-shot-launch-v1'
  type='EVIDENCE_ONLY_NOT_CONSTRUCTION'
  sourcePin=$revision
  profile='r11-compact'
  model=$MODEL
  modelAttemptsAllowed=1
  oneRunGuard='CONSUMED'
  nodeExitCode=$originalNodeExit
  baselineComparison='NOT_RUN_BASELINE_NOT_AUTO_SELECTED'
  modelQualityAutoAccepted=$false
  validHumanReviewRequired=$true
  actualMinecraftPlayerWalkingVerified=$false
  worldReads=0
  worldWrites=0
  readiness='NOT_PREPARED'
  gates=@('BLOCKED','BLOCKED','BLOCKED','BLOCKED','BLOCKED',
   'BLOCKED','BLOCKED','BLOCKED','BLOCKED')
  BuildPlan=@{operations=@()}
 }
 [IO.File]::WriteAllText((Join-Path $folder 'R17_ONE_SHOT_MANIFEST.json'),
  (($manifest|ConvertTo-Json -Depth 5)+[Environment]::NewLine),
  (New-Object System.Text.UTF8Encoding($false)))
 # Even a transport/model/HOLD source gets zipped. No automatic retry.
 Compress-Archive -LiteralPath $folder -DestinationPath $resultZip -CompressionLevel Optimal -ErrorAction Stop
 if(-not (Test-Path -LiteralPath $resultZip -PathType Leaf)){
  throw 'ATTEMPT_CONSUMED_EVIDENCE_ZIP_MISSING'
 }
 Write-Host ('R17_UPLOAD_THIS_RESULT_ZIP: '+$resultZip)
 Write-Host '[R17] Evidence captured; architecture and Minecraft remain unapproved.'
 if($env:CI -ne 'true'){
  Start-Process explorer.exe -ArgumentList ('/select,"'+$resultZip+'"')
 }
 if($originalNodeExit -ne 0){
  Write-Host '[R17 HOLD] Model or source incomplete; original evidence retained. NEVER rerun with this lock.'
  exit 2
 }
 Write-Host 'R17_ONE_SHOT_EVIDENCE_PACKAGED_NO_WORLD_WRITES'
 exit 0
}catch{
 Write-Host ('[R17 HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'No automatic retry; if consent was already consumed, its lock remains.'
 exit 1
}

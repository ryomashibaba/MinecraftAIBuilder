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
 $recoveredNoFolder=$false
 if(-not (Test-Path -LiteralPath $folder -PathType Container)){
  # An early Node failure can occur AFTER the one-shot lock was consumed,
  # but BEFORE the R6 capture module makes its folder. Preserve a diagnostic
  # ZIP instead of leaving the user with only an irreversible lock.
  [void](New-Item -ItemType Directory -Path $folder -ErrorAction Stop)
  $recoveredNoFolder=$true
  $originalNodeExit=1
  [IO.File]::WriteAllText(
   (Join-Path $folder 'R18_EARLY_NODE_FAILURE_NO_RAW.txt'),
   'HOLD: capture did not create its evidence folder. The one-shot approval is consumed. Whether model transport started is UNKNOWN. NEVER retry automatically.',
   (New-Object System.Text.UTF8Encoding($false)))
 }
 # R18: independent, read-only file-to-file SHA continuity audit.
 # A missing/invalid downstream report must not be treated as a fully
 # packaged successful capture, and may not trigger any extra Qwen request.
 $issues=New-Object 'System.Collections.Generic.List[string]'
 $rawPath=Join-Path $folder 'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'
 $rawSha=$null
 $linkState='NO_RAW_MODEL_RESPONSE'
 if(Test-Path -LiteralPath $rawPath -PathType Leaf){
  try{
   $shaObj=[Security.Cryptography.SHA256]::Create()
   try{
    $rawSha=([BitConverter]::ToString(
     $shaObj.ComputeHash([IO.File]::ReadAllBytes($rawPath)))).Replace('-','').ToLowerInvariant()
   }finally{$shaObj.Dispose()}
   $links=@(
    @{Name='R6_SINGLE_CAPTURE_RESULT.json';Field='originalRawSha256'},
    @{Name='R11_OFFLINE_COMPLETION_AUDIT.json';Field='rawSha256'},
    @{Name='R13_OFFLINE_QUALITY_DECISION.json';Field='rawSha256'},
    @{Name='R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json';Field='rawSha256'}
   )
   foreach($link in $links){
    $evidencePath=Join-Path $folder $link.Name
    if(-not (Test-Path -LiteralPath $evidencePath -PathType Leaf)){
     $issues.Add('MISSING_'+$link.Name)
     continue
    }
    try{
     $data=Get-Content -LiteralPath $evidencePath -Raw -Encoding UTF8 |
      ConvertFrom-Json -ErrorAction Stop
     $claimed=$data.($link.Field)
     if($claimed -cne $rawSha){$issues.Add('RAW_SHA_MISMATCH_'+$link.Name)}
    }catch{
     $issues.Add('UNREADABLE_'+$link.Name)
    }
   }
   $linkState=if($issues.Count -eq 0){'SHA_LINKED_EVIDENCE_PRESENT'}else{'HOLD_EVIDENCE_LINKS'}
  }catch{
   $issues.Add('RAW_SHA256_CANNOT_BE_READ')
   $linkState='HOLD_EVIDENCE_LINKS'
  }
 }elseif(-not $recoveredNoFolder){
  # R19 fail-closed: an exit 0 from the native child is NOT proof that
  # a captured model original exists. This can happen if the child behaves
  # unexpectedly, is replaced by a wrapper, or terminates prematurely.
  # Preflight/transport HOLD with a nonzero exit remains a legitimate
  # NO_RAW status (never claim that a request actually happened).
  if($originalNodeExit -eq 0){
   $issues.Add('ZERO_EXIT_WITHOUT_MODEL_ORIGINAL')
   $linkState='HOLD_EVIDENCE_LINKS'
  }
  $resultPath=Join-Path $folder 'R6_SINGLE_CAPTURE_RESULT.json'
  if(Test-Path -LiteralPath $resultPath -PathType Leaf){
   try{
    $captureResult=Get-Content -LiteralPath $resultPath -Raw -Encoding UTF8 |
     ConvertFrom-Json -ErrorAction Stop
    if($captureResult.originalSaved -eq $true){
     $issues.Add('CAPTURE_REPORT_CLAIMS_MISSING_RAW')
     $linkState='HOLD_EVIDENCE_LINKS'
    }
   }catch{
    $issues.Add('UNREADABLE_R6_SINGLE_CAPTURE_RESULT.json')
    $linkState='HOLD_EVIDENCE_LINKS'
   }
  }
 }
 $linkAudit=[ordered]@{
  schema='minecraftaibuilder-b198zr18-offline-evidence-links-v1'
  status=$linkState
  rawSha256=$rawSha
  linkedEvidenceIssues=@($issues.ToArray())
  earlyCaptureFolderRecovered=$recoveredNoFolder
  modelRequestsAddedByThisAudit=0
  noAutomaticRetry=$true
  sourceOnly=$true
  worldContacts=0
  worldWrites=0
  readiness='NOT_PREPARED'
 }
 [IO.File]::WriteAllText((Join-Path $folder 'R18_OFFLINE_EVIDENCE_LINK_AUDIT.json'),
  (($linkAudit|ConvertTo-Json -Depth 5)+[Environment]::NewLine),
  (New-Object System.Text.UTF8Encoding($false)))
 if($issues.Count -gt 0 -and $originalNodeExit -eq 0){$originalNodeExit=2}
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
  offlineEvidenceLinkStatus=$linkState
  offlineEvidenceLinkIssues=@($issues.ToArray())
  earlyCaptureFolderRecovered=$recoveredNoFolder
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

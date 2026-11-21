# R56 future wrapper around R54 ONE request; NOT AUTHORIZED YET. Do not distribute/run before fresh chat consent.
# Never invoke real Qwen from CI or offline installers. Exact model and pinned source.
param([string]$R54Consent)
$ErrorActionPreference='Stop'
$required='I_APPROVE_R54_ONE_LOCAL_QWEN_REQUEST'
$installerBlob='e2bb6ed2ab8767e3c58759d05ff33cd2d562f0c4'
$revision='385137010d86d9e7acc824c792f8d99ea0500982'
function GitBlobSha([byte[]]$b){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$b.Length+[char]0)
 $all=New-Object byte[] ($prefix.Length+$b.Length)
 [Array]::Copy($prefix,0,$all,0,$prefix.Length)
 [Array]::Copy($b,0,$all,$prefix.Length,$b.Length)
 $h=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($h.ComputeHash($all))).Replace('-','').ToLowerInvariant()}
 finally{$h.Dispose()}
}
function Digest([string]$file){
 $sha=[Security.Cryptography.SHA256]::Create()
 try{return ([BitConverter]::ToString($sha.ComputeHash(
  [IO.File]::ReadAllBytes($file)))).Replace('-','').ToLowerInvariant()}
 finally{$sha.Dispose()}
}
function Save([string]$filename,[object]$data){
 [IO.File]::WriteAllText($filename,
  (($data|ConvertTo-Json -Depth 10)+[Environment]::NewLine),
  (New-Object Text.UTF8Encoding($false)))
}
try{
 if($R54Consent -cne $required){throw 'NEW_R54_CONSENT_REQUIRED'}
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_MISSING'}
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){
  throw 'NODE24_REQUIRED'
 }
 $root=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder'
 $base=Join-Path $root 'R54_OneShot_Evidence'
 $lock=Join-Path $base 'R54_APPROVAL_CONSUMED_LOCK.txt'
 # Refuse a second run BEFORE downloading or invoking any source, even offline.
 if(Test-Path -LiteralPath $lock){throw 'R54_APPROVAL_ALREADY_CONSUMED_NO_RETRY'}
 $installer=Join-Path $PSScriptRoot 'INSTALL_R55_OFFLINE_SOURCE_ONLY.ps1'
 if(-not(Test-Path -LiteralPath $installer -PathType Leaf)){
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+
   '32363db9636f8dfeae2b8d6c2b5bdafa192f059b/tools/r55-future/INSTALL_R55_OFFLINE_SOURCE_ONLY.ps1'
  $web=New-Object System.Net.WebClient
  try{$bytes=$web.DownloadData($url)}finally{$web.Dispose()}
  if($bytes.Length -lt 1000 -or $bytes.Length -gt 25000 -or
   (GitBlobSha $bytes) -cne $installerBlob){
   throw 'PINNED_INSTALLER_DOWNLOAD_REJECTED'
  }
  [IO.File]::WriteAllBytes($installer,$bytes)
 }
 if((GitBlobSha ([IO.File]::ReadAllBytes($installer))) -cne $installerBlob){
  throw 'INSTALLER_SHA_PIN_MISMATCH'
 }
 # This is a synthetic-only offline download + SHA check + test. The REAL
 # Qwen POST is only in the separately invoked R54 Node runner BELOW.
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer
 if($LASTEXITCODE -ne 0){throw 'OFFLINE_SOURCE_PREPARATION_FAILED'}
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -CheckOnly
 if($LASTEXITCODE -ne 0){throw 'OFFLINE_SOURCE_RECHECK_FAILED'}
 $src=Join-Path $root ('R55_Source_'+$revision.Substring(0,12))
 $runner=Join-Path $src 'scripts\b198zr54-future-program-first-once.mjs'
 if(-not (Test-Path -LiteralPath $runner -PathType Leaf)){
  throw 'R54_RUNNER_NOT_FOUND'
 }
 if(Test-Path -LiteralPath $lock){throw 'R54_APPROVAL_ALREADY_CONSUMED_NO_RETRY'}
 Write-Host '[R54] Exact model: qwen3.8:27b. Approved one inference only.'
 Write-Host '[R54] No Minecraft world read, placement, deletion or retry.'
 & node $runner --consent $required --base $base
 $nodeExit=$LASTEXITCODE
 if(-not (Test-Path -LiteralPath $lock -PathType Leaf)){
  throw 'PRECHECK_HOLD_BEFORE_APPROVAL_CONSUMPTION_NO_MODEL_SUCCESS_CLAIM'
 }
 # There must only be one R54 evidence folder and no prior packaged ZIP.
 $folders=@(Get-ChildItem -LiteralPath $base -Directory |
  Where-Object {$_.Name -match '^R54_[0-9a-f-]{36}$'})
 if($folders.Count -eq 1){
  $folder=$folders[0].FullName
 }else{
  $folder=Join-Path $base ('R54_EARLY_FAILURE_'+[guid]::NewGuid().ToString('N'))
  [void](New-Item -ItemType Directory -Path $folder -ErrorAction Stop)
  [IO.File]::WriteAllText((Join-Path $folder 'R54_EARLY_FAILURE.txt'),
   'Approval lock consumed, but exactly one completed evidence folder could not be isolated. Actual POST count UNKNOWN. NO RESTART OR RETRY.',
   (New-Object Text.UTF8Encoding($false)))
  $nodeExit=2
 }
 $original=Join-Path $folder 'R54_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'
 $resultPath=Join-Path $folder 'R54_CAPTURE_RESULT.json'
 $manifestPath=Join-Path $folder 'R54_FINAL_EVIDENCE_MANIFEST.json'
 $auditStatus='HOLD_NO_RAW_OR_NO_RESULT'
 $originalSha=$null
 $issues=@()
 if(Test-Path -LiteralPath $original -PathType Leaf){
  try{
   $originalSha=Digest $original
   if(-not (Test-Path -LiteralPath $resultPath -PathType Leaf)){
    $issues+='MISSING_CAPTURE_RESULT'
   }else{
    $r=Get-Content -LiteralPath $resultPath -Encoding UTF8 -Raw | ConvertFrom-Json
    if($r.originalRawSha256 -cne $originalSha){$issues+='CAPTURE_RAW_SHA_MISMATCH'}
   }
   if(-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)){
    $issues+='MISSING_FINAL_MANIFEST'
   }else{
    $m=Get-Content -LiteralPath $manifestPath -Encoding UTF8 -Raw | ConvertFrom-Json
    if($m.rawSha256 -cne $originalSha){$issues+='MANIFEST_RAW_SHA_MISMATCH'}
    if($m.oneTimeLock -cne 'CONSUMED'){$issues+='CONSUMED_LOCK_MISMATCH'}
   }
   $auditStatus=if($issues.Count -eq 0){
    'SAVED_RAW_SHA_CHAIN_MATCHED_MODEL_QUALITY_UNVERIFIED'
   }else{'HOLD_RAW_SHA_EVIDENCE_CHAIN'}
  }catch{
   $issues+='RAW_AUDIT_ERROR'
   $auditStatus='HOLD_RAW_SHA_EVIDENCE_CHAIN'
  }
 }elseif($nodeExit -eq 0){
  $issues+='ZERO_EXIT_WITHOUT_ORIGINAL_MODEL_BYTES'
 }
 $report=[ordered]@{
  schema='minecraftaibuilder-r54-windows-postcapture-audit-v1'
  status=$auditStatus;originalRawSha256=$originalSha
  issues=@($issues);nodeExitCode=$nodeExit
  originalR25Unmodified=$true
  oneShotApprovalConsumed=$true;noAutomaticRetry=$true
  modelIdentityIndependentlyVerified=$false
  humanQualityCertified=$false;readiness='NOT_PREPARED'
  worldReads=0;worldWrites=0
  gates=@('BLOCKED','BLOCKED','BLOCKED','BLOCKED','BLOCKED',
   'BLOCKED','BLOCKED','BLOCKED','BLOCKED')
  BuildPlan=@{operations=@()}
 }
 $auditPath=Join-Path $folder 'R54_WINDOWS_ORIGINAL_SHA_AUDIT.json'
 if(-not(Test-Path -LiteralPath $auditPath)){Save $auditPath $report}
 if($issues.Count -gt 0){$nodeExit=2}
 $zip=Join-Path $base ('R54_'+[guid]::NewGuid().ToString('N')+'_UPLOAD_THIS_RESULT.zip')
 $archiveHelper=Join-Path $src 'tools\r52-future\ARCHIVE_WITH_R51_DIAGNOSTIC_OFFLINE.ps1'
 if(-not(Test-Path -LiteralPath $archiveHelper -PathType Leaf)){
  throw 'R54_SHA_VERIFIED_ZIP_HELPER_MISSING'
 }
 # The helper file is SHA pinned by R55. Never mutate original bytes.
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $archiveHelper -EvidenceDir $folder -SourceRoot $src -ZipOutput $zip
 if($LASTEXITCODE -ne 0){throw 'R54_OFFLINE_STORYBOARD_OR_ZIP_HOLD'}
 if(-not(Test-Path -LiteralPath $zip -PathType Leaf)){
  throw 'APPROVAL_CONSUMED_BUT_ZIP_NOT_CREATED'
 }
 Write-Host ('R54_UPLOAD_THIS_RESULT_ZIP='+$zip)
 if($env:CI -ne 'true'){
  Start-Process explorer.exe -ArgumentList ('/select,"'+$zip+'"')
 }
 if($nodeExit -ne 0){
  Write-Host '[R54 HOLD] Original/diagnostics packaged. Approval consumed; NO RE-RUN.'
  exit 2
 }
 Write-Host '[R54] One local Qwen request completed. Geometry/human quality NOT automatically certified.'
 exit 0
}catch{
 Write-Host ('[R54 HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'Do not re-execute if R54 approval was already consumed.'
 exit 1
}

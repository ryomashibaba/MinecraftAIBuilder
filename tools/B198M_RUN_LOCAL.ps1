# B198M Windows LOCAL model pilot. Never contacts Minecraft or a paid model API.
[CmdletBinding()]
param(
 [ValidateSet('Pilot','Full','Preflight','Diagnose','SourceProbe','ReplayLatest')][string]$Mode='Pilot',
 [string]$Model='',
 [string]$Endpoint='http://127.0.0.1:11434/v1/chat/completions',
 [string]$SourceDirectory='',
 [string]$OutputDirectory='',
 [ValidateRange(1,12)][int]$Cases=1,
 [ValidateRange(30,900)][int]$TimeoutSeconds=360,
 [ValidateRange(15,120)][int]$ProbeTimeoutSeconds=60,
 [ValidateRange(60,360)][int]$SourceTimeoutSeconds=300,
 [ValidateRange(512,4096)][int]$SourceOutputTokens=3072,
 [ValidateRange(4096,8192)][int]$SourceContextTokens=6144,
 [string]$ReplaySourceFile='',
 [switch]$IncludePilotRevision,
 [switch]$NoRevisions
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$branch='feature/b198y-first-real-source-recovery'
$root=$null
function Hold([string]$reason){throw "B198M_HOLD_$reason"}
try{
 Write-Host 'B198M SOURCE-ONLY REAL LOCAL MODEL PILOT' -ForegroundColor Cyan
 if($Endpoint -notmatch '^http://127\.0\.0\.1:([0-9]{2,5})/v1/chat/completions$'){
  Hold 'STRICT_127_0_0_1_ONLY'
 }
 $port=[int]$Matches[1]
 if($port -lt 1 -or $port -gt 65535){Hold 'INVALID_PORT'}
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){Hold 'NODE_22_PLUS_REQUIRED'}
 $nodeVersion = [string](& node --version)
 if($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v([0-9]+)\.'){
  Hold 'NODE_22_PLUS_REQUIRED'
 }
 $major=[int]$Matches[1]
 if($major -lt 22){Hold 'NODE_22_PLUS_REQUIRED'}
 if($Mode -eq 'ReplayLatest'){$Model='B198U_OFFLINE_NO_MODEL'}
 if(-not $Model){
  if($Endpoint -ne 'http://127.0.0.1:11434/v1/chat/completions'){
   Hold 'EXPLICIT_MODEL_REQUIRED_FOR_ALTERNATE_LOCAL_SERVER'
  }
  try{
   $tags=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5 -MaximumRedirection 0
  }catch{Hold 'OLLAMA_NOT_RUNNING_START_LOCAL_SERVER_FIRST'}
  $names=@($tags.models | ForEach-Object { $_.name } | Where-Object { $_ -is [string] -and $_.Length -ge 2 } | Sort-Object -Unique)
  if($names.Count -eq 0){Hold 'NO_INSTALLED_MODELS'}
  if($names.Count -eq 1){$Model=[string]$names[0]}
  else{
   Write-Host 'Installed local Ollama models:'
   for($i=0;$i -lt $names.Count;$i++){Write-Host ("[{0}] {1}" -f ($i+1),$names[$i])}
   $num=0
   $choice=Read-Host 'Choose a model number'
   if(-not [int]::TryParse($choice,[ref]$num) -or $num -lt 1 -or $num -gt $names.Count){
    Hold 'MODEL_CHOICE_REQUIRED'
   }
   $Model=[string]$names[$num-1]
  }
 }
 if($Model -notmatch '^[A-Za-z0-9._:/-]{2,140}$'){Hold 'INVALID_LOCAL_MODEL_ID'}
 if($Mode -eq 'ReplayLatest'){
  Write-Host 'B198U OFFLINE REPLAY — existing model response, NO Ollama model call.'
 }else{Write-Host "Selected LOCAL model: $Model"}
 if($Mode -eq 'Preflight'){
  Write-Host 'B198M_TEST_FINISHED PREFLIGHT_READY_NO_INFERENCE' -ForegroundColor Green
  return
 }
 if($Mode -eq 'Full'){$Cases=12}
 if(-not $SourceDirectory){
  $tmp=Join-Path ([IO.Path]::GetTempPath()) ('B198M-'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $sourceZip=Join-Path $tmp 'source.zip'
  $url='https://codeload.github.com/ryomashibaba/MinecraftAIBuilder/zip/refs/heads/'+$branch
  Write-Host 'Downloading separate GitHub SOURCE snapshot...'
  Invoke-WebRequest -Uri $url -OutFile $sourceZip -TimeoutSec 120
  Expand-Archive -LiteralPath $sourceZip -DestinationPath (Join-Path $tmp 'extracted') -ErrorAction Stop
  $folders=@(Get-ChildItem -LiteralPath (Join-Path $tmp 'extracted') -Directory)
  if($folders.Count -ne 1){Hold 'UNEXPECTED_GITHUB_SOURCE_ARCHIVE'}
  $SourceDirectory=$folders[0].FullName
 }
 $SourceDirectory=(Resolve-Path -LiteralPath $SourceDirectory).Path
 foreach($rel in @('scripts\b198k-local-comparison.mjs','scripts\b198m-pilot-summary.mjs','scripts\b198r-local-diagnostic.mjs','scripts\b198s-single-source-probe.mjs','scripts\b198u-offline-replay.mjs')){
  if(-not (Test-Path -LiteralPath (Join-Path $SourceDirectory $rel) -PathType Leaf)){
   Hold 'REQUIRED_GITHUB_SOURCE_MISSING'
  }
 }
 if(-not $OutputDirectory){
  $docs=[Environment]::GetFolderPath('MyDocuments')
  if(-not $docs){$docs=$env:USERPROFILE}
  $parent=Join-Path $docs 'MinecraftAIBuilder-B198M'
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  $OutputDirectory=Join-Path $parent ('pilot-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,6))
 }
 $OutputDirectory=[IO.Path]::GetFullPath($OutputDirectory)
 if(Test-Path -LiteralPath $OutputDirectory){Hold 'REFUSE_EXISTING_RESULTS'}
 New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
 $root=$OutputDirectory
 # B198R Diagnose: ONE tiny native Ollama request, not an architecture A/B.
 if($Mode -eq 'Diagnose'){
  $report=Join-Path $root 'B198R_UPLOAD_THIS_DIAGNOSTIC.json'
  Write-Host ('B198R small-model diagnostic: max {0} seconds.' -f $ProbeTimeoutSeconds)
  $old=Get-Location
  try{
   Set-Location -LiteralPath $SourceDirectory
   & node 'scripts/b198r-local-diagnostic.mjs' '--model' $Model '--out' $report '--port' ([string]$port) '--timeout-seconds' ([string]$ProbeTimeoutSeconds)
   if($LASTEXITCODE -ne 0){Hold 'LOCAL_DIAGNOSTIC_FAILED'}
  }finally{Set-Location -LiteralPath $old}
  $diagnostic=Get-Content -LiteralPath $report -Raw | ConvertFrom-Json
  $uploadZip=Join-Path $root 'B198R_UPLOAD_THIS_DIAGNOSTIC.zip'
  Compress-Archive -LiteralPath $report -DestinationPath $uploadZip -CompressionLevel Optimal
  if($diagnostic.status -eq 'LOCAL_SMALL_JSON_PROBE_PASS'){
   Write-Host 'B198R_TEST_FINISHED LOCAL_SMALL_JSON_PROBE_PASS_NO_ARCHITECTURE_GENERATED' -ForegroundColor Green
  }else{
   Write-Host ('B198R_TEST_FINISHED {0}' -f $diagnostic.status) -ForegroundColor Yellow
  }
  Write-Host ('Generated tokens/s: {0}' -f $diagnostic.telemetry.generatedTokensPerSecond)
  Write-Host ('Model loaded VRAM bytes: {0}' -f $diagnostic.modelResidency.vramBytes)
  Write-Host "Upload to ChatGPT: $uploadZip"
  Write-Host 'No complete architecture model call and no Minecraft world contact.'
  return
 }
 # B198S SourceProbe: exactly one real native model request, no A/B.
 if($Mode -eq 'SourceProbe'){
  if($SourceOutputTokens -gt $SourceContextTokens-2048){
   Hold 'B198S_OUTPUT_CONTEXT_OVERLAP'
  }
  $study=Join-Path $root 'source-study'
  Write-Host 'B198U: one model call, always save original candidate; safely expand declared bounds WITHOUT altering geometry.'
  Write-Host ('B198S native Ollama: think OFF requested, max output {0} tokens, context {1}, timeout {2}s.' -f $SourceOutputTokens,$SourceContextTokens,$SourceTimeoutSeconds)
  $old=Get-Location
  try{
   Set-Location -LiteralPath $SourceDirectory
   $probeArgs=@('scripts/b198s-single-source-probe.mjs','--model',$Model,
    '--out',$study,'--port',([string]$port),
    '--timeout-seconds',([string]$SourceTimeoutSeconds),
    '--source-tokens',([string]$SourceOutputTokens),
    '--context-tokens',([string]$SourceContextTokens))
   & node @probeArgs
   if($LASTEXITCODE -ne 0){Hold 'B198S_SOURCE_MODEL_OR_COMPILER_UNEXPECTED_FATAL'}
  }finally{Set-Location -LiteralPath $old}
  $report=Join-Path $root 'B198S_UPLOAD_THIS_SUMMARY.json'
  $result=Get-Content -LiteralPath $report -Raw | ConvertFrom-Json
  $upload=Join-Path $root 'B198S_UPLOAD_THIS_RESULT'
  New-Item -ItemType Directory -Path $upload | Out-Null
  Copy-Item -LiteralPath $report -Destination $upload
  foreach($f in @('B198U_ORIGINAL_MODEL_RESPONSE.txt','B198U_CORRECTED_CANDIDATE.txt','B198U_SOURCE_REPAIR_TRACE.json')){
   $sourceEvidence=Join-Path $root $f
   if(Test-Path -LiteralPath $sourceEvidence){Copy-Item -LiteralPath $sourceEvidence -Destination $upload}
  }
  Copy-Item -LiteralPath (Join-Path $study 'B198H_INDEPENDENT_SOURCE_EVIDENCE.json') -Destination $upload
  Copy-Item -LiteralPath (Join-Path $study 'B198B_RESULTS.json') -Destination $upload
  foreach($name in @('source-design.json','source-audit.json','index.html','B198W_SOURCE_QUALITY_EVIDENCE.json','B198W_REVIEW_BOARD.html')){
   $sourceFile=Join-Path (Join-Path $study 'c01') $name
   if(Test-Path -LiteralPath $sourceFile){
    $destination=Join-Path $upload ('c01_'+$name)
    if($name -eq 'B198W_REVIEW_BOARD.html'){
     # Source folder uses index.html; the upload ZIP intentionally flattens
     # this to c01_index.html. Keep BOTH iframe and open-in-new-tab functional
     # when the user extracts and opens the Chat-upload ZIP independently.
     $board=[IO.File]::ReadAllText($sourceFile,[Text.Encoding]::UTF8)
     if(-not $board.Contains('src="index.html"') -or
      -not $board.Contains('href="index.html"')){
      Hold 'B198W_SOURCE_REVIEW_VIEWER_REFERENCE_INVALID'
     }
     $board=$board.Replace('src="index.html"','src="c01_index.html"')
     $board=$board.Replace('href="index.html"','href="c01_index.html"')
     [IO.File]::WriteAllText($destination,$board,(New-Object System.Text.UTF8Encoding($false)))
    }else{
     Copy-Item -LiteralPath $sourceFile -Destination $destination
    }
   }
  }
  $archive=Join-Path $root 'B198S_UPLOAD_THIS_RESULT.zip'
  Compress-Archive -Path (Join-Path $upload '*') -DestinationPath $archive -CompressionLevel Optimal
  if($result.independentlyCompiled){
   if($result.originalModelBoundsOnlyRepair.applied){
    Write-Host 'B198U: declared bounds expanded without changing any model-authored elements; provenance saved.' -ForegroundColor Yellow
   }
   if($result.originalModelMetadataOnlyRepair.applied){
    Write-Host 'B198T: model title/brief was shortened to B143 limits; original text and geometry SHA provenance saved.' -ForegroundColor Yellow
   }
   Write-Host ('B198S_TEST_FINISHED {0}' -f $result.status) -ForegroundColor Green
   Write-Host ('B143 SOURCE independently compiled; element count: {0}' -f $result.independentlyCompiled.elements)
   Write-Host ('3D source review: {0}' -f (Join-Path (Join-Path $study 'c01') 'index.html'))
   Write-Host ('B198W quality review: {0}' -f (Join-Path (Join-Path $study 'c01') 'B198W_REVIEW_BOARD.html'))
  }else{
   Write-Host ('B198S_TEST_FINISHED {0}' -f $result.status) -ForegroundColor Yellow
   Write-Host 'SOURCE HOLD: no valid B143 building; do not claim architectural quality.'
   if($result.savedModelSource.originalUnmodifiedResponseStored){
    Write-Host 'B198U: full original model response SAVED in ZIP for offline repair. Do not repeat LLM solely to inspect source.' -ForegroundColor Cyan
   }
  }
  Write-Host "Upload to ChatGPT: $archive"
  Write-Host 'No Minecraft contacts/writes; model aesthetics and walking unreviewed.'
  return
 }
 # Reuse the most recent saved unaltered source without calling a model.
 if($Mode -eq 'ReplayLatest'){
  if(-not $ReplaySourceFile){
   $docs=[Environment]::GetFolderPath('MyDocuments')
   if(-not $docs){$docs=$env:USERPROFILE}
   $parent=Join-Path $docs 'MinecraftAIBuilder-B198M'
   $items=@(Get-ChildItem -LiteralPath $parent -Filter 'B198U_ORIGINAL_MODEL_RESPONSE.txt' -File -Recurse -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending)
   if($items.Count -eq 0){Hold 'NO_PREVIOUS_CAPTURED_MODEL_SOURCE'}
   $ReplaySourceFile=$items[0].FullName
  }
  if(-not (Test-Path -LiteralPath $ReplaySourceFile -PathType Leaf)){
   Hold 'REPLAY_SOURCE_FILE_NOT_FOUND'
  }
  $replayDir=Join-Path $root 'offline-review'
  Write-Host ('Replaying saved model source WITHOUT LLM inference: {0}' -f $ReplaySourceFile)
  $old=Get-Location
  try{
   Set-Location -LiteralPath $SourceDirectory
   & node 'scripts/b198u-offline-replay.mjs' '--source' $ReplaySourceFile '--out' $replayDir
   if($LASTEXITCODE -ne 0){Hold 'B198U_OFFLINE_REPLAY_FAILED'}
  }finally{Set-Location -LiteralPath $old}
  $zip=Join-Path $root 'B198U_UPLOAD_THIS_REPLAY.zip'
  Compress-Archive -Path (Join-Path $replayDir '*') -DestinationPath $zip -CompressionLevel Optimal
  $summary=Get-Content (Join-Path $replayDir 'B198U_REPLAY_SUMMARY.json') -Raw | ConvertFrom-Json
  Write-Host ('B198U_REPLAY_FINISHED {0}' -f $summary.status)
  Write-Host ('Local model requests in replay: {0}' -f $summary.modelCallsMade)
  Write-Host "Upload to ChatGPT: $zip"
  return
 }
 $run=Join-Path $root 'source-study'
 $log=Join-Path $root 'B198M_RUN_LOG.txt'
 $cmd=@('scripts/b198k-local-comparison.mjs','--model',$Model,
  '--out',$run,'--endpoint',$Endpoint,'--cases',[string]$Cases,
  '--directed-attempts','2','--directed-repairs','0',
  '--timeout-seconds',[string]$TimeoutSeconds)
 # Make the first real-model probe SMALL: compare creation only by default.
 # The full suite still includes the frozen dependent revisions.
 if($NoRevisions -or ($Mode -eq 'Pilot' -and -not $IncludePilotRevision)){
  $cmd+='--no-revisions'
 }
 if($Mode -eq 'Pilot'){$cmd+='--stop-on-timeout'}
 Write-Host ("Local timeout per model request: {0} seconds." -f $TimeoutSeconds)
 Write-Host 'B198Q: transport uses 127.0.0.1-only native HTTP; no hidden 300-second fetch header cutoff.'
 Write-Host 'B198Q: fatal network errors stop repeated model calls; reviews remain source-only.'
 Write-Host 'Pilot is one original Japanese creation task by default; revisions are opt-in.'
 Write-Host ('Starting localhost source-only A/B for {0} creation task(s).' -f $Cases)
 $old=Get-Location
 try{
  Set-Location -LiteralPath $SourceDirectory
  & node @cmd 2>&1 | Tee-Object -FilePath $log
  if($LASTEXITCODE -ne 0){Hold 'MODEL_OR_SOURCE_STUDY_FAILED_CHECK_RUN_LOG'}
  $summary=Join-Path $root 'B198M_UPLOAD_THIS_SUMMARY.json'
  & node 'scripts/b198m-pilot-summary.mjs' '--run' $run '--out' $summary 2>&1 | Tee-Object -FilePath $log -Append
  if($LASTEXITCODE -ne 0){Hold 'SUMMARY_SOURCE_INTEGRITY_FAILURE'}
 }finally{Set-Location -LiteralPath $old}
 $upload=Join-Path $root 'B198M_UPLOAD_THIS_RESULT'
 New-Item -ItemType Directory -Path $upload | Out-Null
 Copy-Item -LiteralPath $summary -Destination $upload
 Copy-Item -LiteralPath (Join-Path $run 'B198K_PAIRED_SOURCE_COMPARISON.json') -Destination $upload
 foreach($arm in @('direct','directed')){
  for($i=1;$i -le $Cases;$i++){
   $id='c{0:d2}' -f $i
   $source=Join-Path $run "$arm\$id\source-design.json"
   if(Test-Path -LiteralPath $source){
    Copy-Item -LiteralPath $source -Destination (Join-Path $upload ($arm+'_'+$id+'_source-design.json'))
   }
  }
  if(-not $NoRevisions){
   $source=Join-Path $run "$arm\r01\source-design.json"
   if(Test-Path -LiteralPath $source){
    Copy-Item -LiteralPath $source -Destination (Join-Path $upload ($arm+'_r01_source-design.json'))
   }
  }
 }
 $uploadZip=Join-Path $root 'B198M_UPLOAD_THIS_RESULT.zip'
 Compress-Archive -Path (Join-Path $upload '*') -DestinationPath $uploadZip -CompressionLevel Optimal
 $verified=Get-Content -LiteralPath $summary -Raw | ConvertFrom-Json
 if($verified.independentlyVerifiedPairedSourceCases -eq 0){
  Write-Host 'B198M_TEST_FINISHED HOLD_NO_COMPARABLE_SOURCE_PAIRS' -ForegroundColor Yellow
  Write-Host 'Local model responses may have timed out or failed strict JSON / source checks.'
 }else{
  Write-Host 'B198M_TEST_FINISHED SOURCE_CAPTURED_HUMAN_QUALITY_NOT_REVIEWED' -ForegroundColor Green
 }
 Write-Host "3D review: $run\index.html"
 Write-Host "Upload to ChatGPT: $uploadZip"
 Write-Host 'No paid API or Minecraft world writes.'
}catch{
 $reason=[string]$_.Exception.Message
 Write-Host "B198M_TEST_FINISHED HOLD: $reason" -ForegroundColor Yellow
 if($root){
  $diag=Join-Path $root 'B198M_LAST_STATUS.txt'
  try{
   [IO.File]::WriteAllText($diag,$reason+[Environment]::NewLine)
   Write-Host "Diagnostic: $diag"
   # A real Qwen reply may already be saved even when the source runner,
   # compiler or ZIP packaging fails unexpectedly. Never lose that reply.
   # This recovery path makes NO model request and never calls Minecraft.
   if($Mode -eq 'SourceProbe'){
    $upload=Join-Path $root 'B198S_UPLOAD_THIS_RESULT'
    if(-not (Test-Path -LiteralPath $upload)){
     New-Item -ItemType Directory -Path $upload | Out-Null
    }
    foreach($f in @('B198M_LAST_STATUS.txt','B198S_UPLOAD_THIS_SUMMARY.json',
      'B198U_ORIGINAL_MODEL_RESPONSE.txt','B198U_CORRECTED_CANDIDATE.txt',
      'B198U_SOURCE_REPAIR_TRACE.json')){
     $from=Join-Path $root $f
     $to=Join-Path $upload $f
     if((Test-Path -LiteralPath $from -PathType Leaf) -and
        -not (Test-Path -LiteralPath $to)){
      Copy-Item -LiteralPath $from -Destination $to
     }
    }
    $raw=Join-Path $root 'B198U_ORIGINAL_MODEL_RESPONSE.txt'
    $recovery=[ordered]@{
     schema='minecraftaibuilder-b198y-sourceprobe-failure-recovery-v1'
     status='HOLD_SOURCEPROBE_NOT_CERTIFIED'
     originalModelResponseStored=(Test-Path -LiteralPath $raw -PathType Leaf)
     modelCallsMade='UNKNOWN'
     sourceB143Compiled='UNVERIFIED'
     humanQualityApproved=$false
     readiness='NOT_PREPARED'
     worldContacts=0
     worldWrites=0
     constructionApproved=$false
     executionAllowed=$false
     gates=@('BLOCKED') * 9
     reason=$reason.Substring(0,[Math]::Min(350,$reason.Length))
    }
    $recoveryPath=Join-Path $upload 'B198Y_RECOVERY_STATUS.json'
    if(-not (Test-Path -LiteralPath $recoveryPath)){
     [IO.File]::WriteAllText($recoveryPath,
      ($recovery | ConvertTo-Json -Depth 6),[Text.Encoding]::UTF8)
    }
    $archive=Join-Path $root 'B198S_UPLOAD_THIS_RESULT.zip'
    if(-not (Test-Path -LiteralPath $archive)){
     Compress-Archive -Path (Join-Path $upload '*') -DestinationPath $archive -CompressionLevel Optimal
    }
    Write-Host "B198Y_RECOVERY_HOLD_UPLOAD_ZIP: $archive" -ForegroundColor Yellow
    if($recovery.originalModelResponseStored){
     Write-Host 'Original model response preserved. Analyze OFFLINE; do not rerun Qwen only to recover JSON.' -ForegroundColor Cyan
    }else{
     Write-Host 'NO_SAVED_MODEL_RESPONSE. This ZIP is diagnostic only, NOT an AI building.' -ForegroundColor Yellow
    }
   }
  }catch{
   Write-Host ("B198Y_RECOVERY_PACKAGING_HOLD: "+[string]$_.Exception.Message) -ForegroundColor Yellow
   Write-Host "Available evidence directory: $root"
  }
 }
 exit 1
}

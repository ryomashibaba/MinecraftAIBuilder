# B198M Windows LOCAL model pilot. Never contacts Minecraft or a paid model API.
[CmdletBinding()]
param(
 [ValidateSet('Pilot','Full','Preflight')][string]$Mode='Pilot',
 [string]$Model='',
 [string]$Endpoint='http://127.0.0.1:11434/v1/chat/completions',
 [string]$SourceDirectory='',
 [string]$OutputDirectory='',
 [ValidateRange(1,12)][int]$Cases=1,
 [ValidateRange(30,900)][int]$TimeoutSeconds=360,
 [switch]$IncludePilotRevision,
 [switch]$NoRevisions
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$branch='feature/b198p-measured-local-model-timeouts'
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
 Write-Host "Selected LOCAL model: $Model"
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
 foreach($rel in @('scripts\b198k-local-comparison.mjs','scripts\b198m-pilot-summary.mjs')){
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
 Write-Host 'B198P Pilot is one original Japanese creation task by default; revisions are opt-in.'
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
  [IO.File]::WriteAllText($diag,$reason+[Environment]::NewLine)
  Write-Host "Diagnostic: $diag"
 }
 exit 1
}

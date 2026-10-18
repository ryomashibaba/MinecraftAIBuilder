# B198V one-time local source-only workbench. Does NOT run an LLM.
[CmdletBinding()]
param(
 [string]$InstallRoot='',
 [string]$SourceDirectory='',
 [string]$Model='',
 [string]$Endpoint='http://127.0.0.1:11434/v1/chat/completions'
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$branch='feature/b198v-persistent-offline-workbench'
$temporary=$null
$stage=$null
function Hold([string]$reason){throw "B198V_INSTALL_HOLD_$reason"}
function VerifyCache([string]$engine){
 $verifier=Join-Path $engine 'scripts\b198v-cache-integrity.mjs'
 if(-not (Test-Path -LiteralPath $verifier -PathType Leaf)){Hold 'ENGINE_MISSING'}
 & node $verifier '--verify' $engine
 if($LASTEXITCODE -ne 0){Hold 'CACHE_INTEGRITY'}
}
function Shortcut([string]$file,[string]$mode,[string]$modelId,[string]$endpoint){
 $lines=@(
  '@echo off',
  'setlocal',
  'node "%~dp0engine\scripts\b198v-cache-integrity.mjs" --verify "%~dp0engine"',
  'if errorlevel 1 goto BAD_CACHE'
 )
 if($mode -eq 'ReplayLatest'){
  $lines+='powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0engine\tools\B198M_RUN_LOCAL.ps1" -Mode ReplayLatest -SourceDirectory "%~dp0engine" %*'
 }else{
  $lines+=('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0engine\tools\B198M_RUN_LOCAL.ps1" -Mode SourceProbe -SourceDirectory "%~dp0engine" -Model "{0}" -Endpoint "{1}" %*' -f $modelId,$endpoint)
 }
 $lines+=@(
  'set "B198V_WORKBENCH_EXIT=%errorlevel%"',
  'if not "%B198V_NONINTERACTIVE%"=="1" pause',
  'exit /b %B198V_WORKBENCH_EXIT%',
  ':BAD_CACHE',
  'echo B198V_CACHE_INTEGRITY_HOLD',
  'if not "%B198V_NONINTERACTIVE%"=="1" pause',
  'exit /b 1'
 )
 [IO.File]::WriteAllText($file,(($lines -join [Environment]::NewLine)+[Environment]::NewLine),[Text.Encoding]::ASCII)
}
try{
 Write-Host 'B198V ONE-TIME OFFLINE WORKBENCH INSTALL (NO LLM)' -ForegroundColor Cyan
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){Hold 'NODE_22_PLUS_REQUIRED'}
 $version=[string](& node --version)
 if($LASTEXITCODE -ne 0 -or $version -notmatch '^v([0-9]+)\.'){Hold 'NODE_22_PLUS_REQUIRED'}
 $major=[int]$Matches[1]
 if($major -lt 22){Hold 'NODE_22_PLUS_REQUIRED'}
 if($Endpoint -notmatch '^http://127\.0\.0\.1:([0-9]{2,5})/v1/chat/completions$'){
  Hold 'LOOPBACK_ENDPOINT_ONLY'
 }
 $port=[int]$Matches[1]
 if($port -lt 1 -or $port -gt 65535){Hold 'INVALID_LOCAL_PORT'}
 if($Model -and $Model -notmatch '^[A-Za-z0-9._:/-]{2,140}$'){Hold 'INVALID_MODEL_ID'}
 if(-not $InstallRoot){
  $docs=[Environment]::GetFolderPath('MyDocuments')
  if(-not $docs){$docs=$env:USERPROFILE}
  $InstallRoot=Join-Path $docs 'MinecraftAIBuilder-B198V'
 }
 $InstallRoot=[IO.Path]::GetFullPath($InstallRoot)
 New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
 $kit=Join-Path $InstallRoot 'offline-workbench-v1'
 $engine=Join-Path $kit 'engine'
 if(Test-Path -LiteralPath $kit){
  VerifyCache $engine
  Write-Host 'B198V_EXISTING_WORKBENCH_VERIFIED (NO DOWNLOAD, NO OVERWRITE)' -ForegroundColor Green
  Write-Host ('Offline shortcut: {0}' -f (Join-Path $kit 'REPLAY_LATEST_OFFLINE.cmd'))
  if(Test-Path -LiteralPath (Join-Path $kit 'RUN_ONE_REAL_MODEL_ONCE.cmd')){
   Write-Host ('Explicit local model shortcut: {0}' -f (Join-Path $kit 'RUN_ONE_REAL_MODEL_ONCE.cmd'))
  }
  return
 }
 if(-not $SourceDirectory){
  $temporary=Join-Path ([IO.Path]::GetTempPath()) ('B198V-'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $temporary | Out-Null
  $zip=Join-Path $temporary 'source.zip'
  Write-Host 'Downloading GitHub source once for offline reuse...'
  $url='https://codeload.github.com/ryomashibaba/MinecraftAIBuilder/zip/refs/heads/'+$branch
  Invoke-WebRequest -Uri $url -OutFile $zip -TimeoutSec 120
  Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $temporary 'unpacked') -ErrorAction Stop
  $folders=@(Get-ChildItem -LiteralPath (Join-Path $temporary 'unpacked') -Directory)
  if($folders.Count -ne 1){Hold 'GITHUB_ARCHIVE_INVALID'}
  $SourceDirectory=$folders[0].FullName
 }
 $SourceDirectory=(Resolve-Path -LiteralPath $SourceDirectory).Path
 foreach($file in @('tools\B198M_RUN_LOCAL.ps1',
  'scripts\b198v-cache-integrity.mjs',
  'scripts\b198u-offline-replay.mjs',
  'source\ai\b143-building-dsl.mjs')){
  if(-not (Test-Path -LiteralPath (Join-Path $SourceDirectory $file) -PathType Leaf)){
   Hold 'SOURCE_ENGINE_MISSING_REQUIRED_FILE'
  }
 }
 $stage=Join-Path $InstallRoot ('offline-kit-staging-'+[guid]::NewGuid().ToString('N'))
 New-Item -ItemType Directory -Path $stage | Out-Null
 $stageEngine=Join-Path $stage 'engine'
 New-Item -ItemType Directory -Path $stageEngine | Out-Null
 foreach($item in @(Get-ChildItem -LiteralPath $SourceDirectory -Force)){
  if(@('.git','node_modules').Contains($item.Name)){continue}
  Copy-Item -LiteralPath $item.FullName -Destination $stageEngine -Recurse -Force
 }
 $verifier=Join-Path $stageEngine 'scripts\b198v-cache-integrity.mjs'
 & node $verifier '--seal' $stageEngine
 if($LASTEXITCODE -ne 0){Hold 'SEAL_FAILED'}
 & node $verifier '--verify' $stageEngine
 if($LASTEXITCODE -ne 0){Hold 'PREINSTALL_INTEGRITY_FAILED'}
 Shortcut (Join-Path $stage 'REPLAY_LATEST_OFFLINE.cmd') 'ReplayLatest' '' ''
 if($Model){
  Shortcut (Join-Path $stage 'RUN_ONE_REAL_MODEL_ONCE.cmd') 'SourceProbe' $Model $Endpoint
 }
 $info=[ordered]@{
  schema='minecraftaibuilder-b198v-offline-one-click-v1'
  baseBranch=$branch
  model=if($Model){$Model}else{$null}
  sourceEngine='engine'
  replayShortcut='REPLAY_LATEST_OFFLINE.cmd'
  modelShortcut=if($Model){'RUN_ONE_REAL_MODEL_ONCE.cmd'}else{$null}
  installModelRequests=0
  offlineReplayModelRequests=0
  worldContacts=0
  worldWrites=0
  readiness='NOT_PREPARED'
 }
 [IO.File]::WriteAllText((Join-Path $stage 'B198V_WORKBENCH_INFO.json'),
  ($info|ConvertTo-Json -Depth 6),[Text.Encoding]::UTF8)
 if(Test-Path -LiteralPath $kit){Hold 'CONCURRENT_INSTALL_REFUSE_OVERWRITE'}
 Move-Item -LiteralPath $stage -Destination $kit
 $stage=$null
 VerifyCache $engine
 Write-Host 'B198V_INSTALL_FINISHED OFFLINE_SOURCE_CACHE_READY_NO_MODEL_CALLED' -ForegroundColor Green
 Write-Host ('OFFLINE REPLAY: {0}' -f (Join-Path $kit 'REPLAY_LATEST_OFFLINE.cmd'))
 if($Model){
  Write-Host ('ONE REAL LLM RUN (ONLY WHEN YOU CHOOSE): {0}' -f (Join-Path $kit 'RUN_ONE_REAL_MODEL_ONCE.cmd'))
 }
 Write-Host 'No model inference, paid API, or Minecraft world writes during installation.'
}catch{
 Write-Host ('B198V_INSTALL_FINISHED HOLD: {0}' -f $_.Exception.Message) -ForegroundColor Yellow
 exit 1
}finally{
 if($stage -and (Test-Path -LiteralPath $stage)){
  Remove-Item -LiteralPath $stage -Recurse -Force
 }
 if($temporary -and (Test-Path -LiteralPath $temporary)){
  Remove-Item -LiteralPath $temporary -Recurse -Force
 }
}

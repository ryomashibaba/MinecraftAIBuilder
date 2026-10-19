# R20: USER-APPROVED one local Qwen 27B inference, NEVER Minecraft.
# Bootstrap verifies immutable R16/R17 files and performs a read-only
# Ollama tags check BEFORE the R17 one-shot approval-consumed lock is created.
# The model is invoked ONLY by the separately verified R17 launcher after
# the operator types its one-time confirmation.
$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $MyInvocation.MyCommand.Path
$Model='qwen3.8:27b'
$Items=@(
 @{File='INSTALL_R16_MINI.ps1';Sha='8f4224bac2fc2fde9c5ac311052a5887174a9402'},
 @{File='RUN_R17_ONCE_AFTER_FRESH_APPROVAL.cmd';Sha='0b9abe4fd95baccc62bf38b7557409e8a3f15b98'},
 @{File='RUN_R17_ONCE_AFTER_FRESH_APPROVAL.ps1';Sha='bf16acada09ac9980be1a7c186ee8b3676192a7c'}
)
function GitBlobSha([byte[]]$bytes){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$bytes.Length+[char]0)
 $all=New-Object byte[] ($prefix.Length+$bytes.Length)
 [Array]::Copy($prefix,0,$all,0,$prefix.Length)
 [Array]::Copy($bytes,0,$all,$prefix.Length,$bytes.Length)
 $sha=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($sha.ComputeHash($all))).Replace('-','').ToLowerInvariant()}
 finally{$sha.Dispose()}
}
function CheckPinned([string]$path,[string]$sha){
 if(-not (Test-Path -LiteralPath $path -PathType Leaf)){throw 'PINNED_FILE_MISSING'}
 if((GitBlobSha ([IO.File]::ReadAllBytes($path))) -cne $sha){
  throw 'PINNED_FILE_HASH_MISMATCH'
 }
}
try{
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_MISSING'}
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'NODE24_REQUIRED'}
 if(-not (Get-Command powershell.exe -ErrorAction SilentlyContinue)){throw 'WINDOWS_POWERSHELL_REQUIRED'}
 foreach($item in $Items){
  CheckPinned (Join-Path $Root $item.File) $item.Sha
 }
 $cacheDir=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\R16_SetupCache'
 [void](New-Item -ItemType Directory -Path $cacheDir -Force)
 $cache=Join-Path $cacheDir 'INSTALL_R16_8675fb2ca2aa.ps1'
 if(Test-Path -LiteralPath $cache){
  CheckPinned $cache $Items[0].Sha
 }else{
  $staged=$cache+'.part-'+[guid]::NewGuid().ToString('N')
  try{
   [IO.File]::WriteAllBytes($staged,
    [IO.File]::ReadAllBytes((Join-Path $Root $Items[0].File)))
   CheckPinned $staged $Items[0].Sha
   Move-Item -LiteralPath $staged -Destination $cache -ErrorAction Stop
  }finally{
   if(Test-Path -LiteralPath $staged){Remove-Item -LiteralPath $staged -Force}
  }
 }
 Write-Host '[PREP] R16 installer SHA pinned. Offline installation & mock QA starting.'
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $cache
 if($LASTEXITCODE -ne 0){throw 'R16_PINNED_OFFLINE_PREPARATION_FAILED'}
 # A GET to /api/tags only: no generation POST, no Minecraft contact,
 # no models are downloaded or loaded. If unavailable, NO one-shot lock.
 Write-Host '[PREFLIGHT] Read-only localhost Ollama model listing (NO inference).'
 try{
  $tags=Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 8 -ErrorAction Stop
 }catch{
  throw 'OLLAMA_TAGS_UNAVAILABLE_NO_ONE_SHOT_LOCK_USED'
 }
 $present=@($tags.models|Where-Object {$_.name -ceq $Model})
 if($present.Count -ne 1){throw 'EXACT_QWEN_MODEL_NOT_LISTED_NO_ONE_SHOT_LOCK_USED'}
 Write-Host '[READY] Exact local model listed. VRAM readiness is not yet certified.'
 Write-Host '[READY] Next step asks for the NEW, one-time typed confirmation.'
 Write-Host '[READY] After confirmation, at most ONE local generation request.'
 $launch=Join-Path $Root 'RUN_R17_ONCE_AFTER_FRESH_APPROVAL.cmd'
 & $launch
 $code=$LASTEXITCODE
 if($code -ne 0){
  Write-Host '[HOLD] See the single diagnostic evidence ZIP if one was created.'
  exit $code
 }
 Write-Host '[DONE] One-shot evidence ZIP created. Upload that ZIP to ChatGPT.'
 exit 0
}catch{
 Write-Host ('[PREPARATION HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host '[SAFE] No automatic retries, no Minecraft world read/write.'
 exit 1
}

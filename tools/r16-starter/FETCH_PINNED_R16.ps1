# R16 tiny bootstrap. Downloads a pinned, hash-checked LOCAL-ONLY installer.
# This runs no AI model and touches no Minecraft world.
$ErrorActionPreference='Stop'
$revision='8675fb2ca2aad9e631246a5c429dd82756cab322'
$expected='8f4224bac2fc2fde9c5ac311052a5887174a9402'
function BlobHash([byte[]]$bytes){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$bytes.Length+[char]0)
 $all=New-Object byte[] ($prefix.Length+$bytes.Length)
 [Array]::Copy($prefix,0,$all,0,$prefix.Length)
 [Array]::Copy($bytes,0,$all,$prefix.Length,$bytes.Length)
 $algo=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($algo.ComputeHash($all))).Replace('-','').ToLowerInvariant()}
 finally{$algo.Dispose()}
}
try{
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_NOT_AVAILABLE'}
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'NODEJS_REQUIRED'}
 $dir=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\R16_SetupCache'
 [void](New-Item -ItemType Directory -Force -Path $dir)
 $install=Join-Path $dir ('INSTALL_R16_'+$revision.Substring(0,12)+'.ps1')
 if(Test-Path -LiteralPath $install){
  if((BlobHash ([IO.File]::ReadAllBytes($install))) -ne $expected){
   throw 'CACHED_INSTALLER_SHA_MISMATCH'
  }
 }else{
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  $web=New-Object Net.WebClient
  try{
   $b=$web.DownloadData('https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+$revision+'/tools/r16-mini/INSTALL_R16_MINI.ps1')
  }finally{$web.Dispose()}
  if($b.Length -lt 1 -or $b.Length -gt 25000 -or (BlobHash $b) -ne $expected){
   throw 'REMOTE_INSTALLER_SHA_MISMATCH'
  }
  [IO.File]::WriteAllBytes($install,$b)
 }
 Write-Host '[R16] Trusted source-only installer verified.'
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install
 if($LASTEXITCODE -ne 0){throw 'OFFLINE_SOURCE_TESTS_FAILED'}
 Write-Host '[R16] PREPARATION_PASS. Qwen generation 0. Minecraft writes 0.'
 exit 0
}catch{
 Write-Host ('[R16 HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'No actual Qwen model or Minecraft world was touched.'
 exit 1
}

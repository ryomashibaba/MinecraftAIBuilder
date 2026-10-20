# R48 source ONLY; no local model request, no Minecraft.
# Reuse the already validated R46 source on the user's OMEN.
# 5 SHA-pinned overlay paths: replaces 1 and adds 4, total 453 files.
param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$Revision='5c54d0f43fc31dd591e8d7122e40911bb33b896b'
$R46Rev='214fec3002de6837a6e6174687a5047ffb6d6c7c'
$R46InstallerRev='6f39d96880efe34515eea39e04310003255df92c'
$R46InstallerSha='b00ead462f633c6671772a4fab59994dcabb3579'
$Overlay=@(
 @{Path='source/ai/b198s-native-ollama-source.mjs';Sha='af732c1d3fde3bf64cad307855c9e897a67bffca'},
 @{Path='source/ai/b198zr47-json-schema-format-gate.mjs';Sha='72d83f8eaa54c27fdf3a28fcce87c4acf0c0f080'},
 @{Path='scripts/b198zr48-consented-schema-qwen-once.mjs';Sha='4ec495a203b60f34f5d986e67b74a915ea413000'},
 @{Path='scripts/b198zr48-consented-schema-qwen-once.test.mjs';Sha='147137fae1f4dc9133d70e6eab62bd9279dfa59d'},
 @{Path='scripts/b198zr47-json-schema-format-gate.test.mjs';Sha='bf2a3fe103c2284c67cdb98daeb7066d8c44792f'}
)
function Blob([byte[]]$b){
 $p=[Text.Encoding]::ASCII.GetBytes('blob '+$b.Length+[char]0)
 $a=New-Object byte[] ($p.Length+$b.Length)
 [Array]::Copy($p,0,$a,0,$p.Length)
 [Array]::Copy($b,0,$a,$p.Length,$b.Length)
 $h=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($h.ComputeHash($a))).Replace('-','').ToLowerInvariant()}
 finally{$h.Dispose()}
}
function Check([string]$file,[string]$sha){
 if(-not(Test-Path -LiteralPath $file -PathType Leaf)){throw 'R48_PINNED_SOURCE_MISSING'}
 if((Blob ([IO.File]::ReadAllBytes($file))) -cne $sha){
  throw 'R48_PINNED_SOURCE_SHA_MISMATCH'
 }
}
function DownloadPinned([string]$rev,[string]$p,[string]$sha){
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 $web=New-Object Net.WebClient
 try{$b=$web.DownloadData('https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+$rev+'/'+$p)}
 finally{$web.Dispose()}
 if($b.Length -lt 20 -or $b.Length -gt 250000 -or (Blob $b) -cne $sha){
  throw ('R48_DOWNLOAD_PIN_MISMATCH_'+$p)
 }
 return ,$b
}
function VerifySource([string]$source){
 if(-not(Test-Path -LiteralPath $source -PathType Container)){
  throw 'R48_SOURCE_MISSING'
 }
 $files=@(Get-ChildItem -LiteralPath $source -Recurse -File)
 if($files.Count -ne 453){throw ('R48_SOURCE_EXPECTED_453_ACTUAL_'+$files.Count)}
 foreach($o in $Overlay){
  Check (Join-Path $source ($o.Path.Replace('/','\'))) $o.Sha
 }
 # A separate R46 base inspection is mandatory BEFORE copying the 449 files.
 Write-Host '[R48] 453/453 files, overlay 5/5 immutable SHA PASS.'
}
try{
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_REQUIRED'}
 $v=(& node --version).Trim()
 if($LASTEXITCODE -ne 0 -or $v -notmatch '^v(2[4-9]|[3-9][0-9])\.'){
  throw 'NODE24_REQUIRED'
 }
 $root=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder'
 [void](New-Item -ItemType Directory -Force -Path $root)
 $base=Join-Path $root ('R46_Source_'+$R46Rev.Substring(0,12))
 $dest=Join-Path $root ('R48_Source_'+$Revision.Substring(0,12))
 $r46=Join-Path $root 'R48_PINNED_R46_OFFLINE_INSTALLER.ps1'
 if(-not(Test-Path -LiteralPath $r46 -PathType Leaf)){
  if($CheckOnly){throw 'R48_BASE_INSTALLER_NOT_AVAILABLE_FOR_CHECK'}
  $bytes=DownloadPinned $R46InstallerRev 'tools/r46-approved/INSTALL_R46_SOURCE_ONLY.ps1' $R46InstallerSha
  [IO.File]::WriteAllBytes($r46,$bytes)
 }
 Check $r46 $R46InstallerSha
 if(-not(Test-Path -LiteralPath $base -PathType Container)){
  if($CheckOnly){throw 'R48_R46_BASE_NOT_INSTALLED'}
  # R46 offline setup may download source files but it CANNOT run real Qwen.
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $r46
  if($LASTEXITCODE -ne 0){throw 'R48_BASE_INSTALL_HOLD'}
 }
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $r46 -CheckOnly
 if($LASTEXITCODE -ne 0){throw 'R48_BASE_SHA_AUDIT_HOLD'}
 if(-not(Test-Path -LiteralPath $dest -PathType Container)){
  if($CheckOnly){throw 'R48_SOURCE_NOT_PREPARED'}
  $stage=$dest+'.part-'+[guid]::NewGuid().ToString('N')
  try{
   Copy-Item -LiteralPath $base -Destination $stage -Recurse -ErrorAction Stop
   foreach($o in $Overlay){
    $target=Join-Path $stage ($o.Path.Replace('/','\'))
    [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target))
    $bytes=DownloadPinned $Revision $o.Path $o.Sha
    [IO.File]::WriteAllBytes($target,$bytes)
   }
   VerifySource $stage
   Move-Item -LiteralPath $stage -Destination $dest -ErrorAction Stop
  }finally{
   if(Test-Path -LiteralPath $stage){
    Remove-Item -LiteralPath $stage -Recurse -Force
   }
  }
 }
 VerifySource $dest
 if($CheckOnly){
  Write-Host '[R48] READ-ONLY CHECK PASS; real Ollama POST=0.'
  exit 0
 }
 & node --test (Join-Path $dest 'scripts\b198zr48-consented-schema-qwen-once.test.mjs') (Join-Path $dest 'scripts\b198zr47-json-schema-format-gate.test.mjs')
 if($LASTEXITCODE -ne 0){throw 'R48_FAKE_ONLY_QA_HOLD'}
 Write-Host '[R48] OFFLINE SOURCE PREP PASS. Real Qwen 0, Minecraft 0.'
 exit 0
}catch{
 Write-Host ('[R48 INSTALL HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host '[R48] DO NOT claim any real Qwen inference from this installer.'
 exit 1
}

# R24 Windows offline installation: never calls a real model or Minecraft.
# Reuse the immutable R16 32-file base; fetch 7 SHA-pinned R23 deltas.
# Keep previous R16, R17 and R20 working directories untouched.
param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$Rev='44108944d0d9b0f892d01729c3fa3c76d006fe55'
$R16Rev='a0438d8fa2504564351f8ebafbe9ecc14575dc95'
$R16InstallerRev='8675fb2ca2aad9e631246a5c429dd82756cab322'
$R16InstallerBlob='8f4224bac2fc2fde9c5ac311052a5887174a9402'
$Overlays=@(
 @{Path='scripts/b198zr6-authorized-single-r4-capture.mjs';Sha='4a57f860763a81169779d59ec0f03dd84f0ed37c'},
 @{Path='source/ai/b198s-native-ollama-source.mjs';Sha='247603a5a27f9edaa23c25d7ec46e39981548a86'},
 @{Path='source/ai/b198zr21-future-architecture-guide.mjs';Sha='a842729c49f902d11ef52f1e248bb5b544300dd2'},
 @{Path='source/ai/b198zr21-offline-forensics.mjs';Sha='6b2af7670aa6aa0999a35203db3bc3bd7368c141'},
 @{Path='scripts/b198zr23-future-one-shot.mjs';Sha='cd05695cb25c9bacee667bdfbd4a98dff3f569b4'},
 @{Path='scripts/b198zr23-future-one-shot.test.mjs';Sha='cbb4d3770ddadb51f20a9b2a37b3f67312c703e3'},
 @{Path='scripts/b198zr22-profile-offline.test.mjs';Sha='a7fdedd142c8a66680fe1557bd44152f1ef48b59'}
)
function GitBlobSha([byte[]]$bytes){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$bytes.Length+[char]0)
 $full=New-Object byte[] ($prefix.Length+$bytes.Length)
 [Array]::Copy($prefix,0,$full,0,$prefix.Length)
 [Array]::Copy($bytes,0,$full,$prefix.Length,$bytes.Length)
 $sha=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($sha.ComputeHash($full))).Replace('-','').ToLowerInvariant()}
 finally{$sha.Dispose()}
}
function VerifiedBytes([string]$path,[string]$hash){
 if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw 'PINNED_FILE_MISSING'}
 $bytes=[IO.File]::ReadAllBytes($path)
 if((GitBlobSha $bytes) -cne $hash){throw 'PINNED_BLOB_SHA_MISMATCH'}
 return $bytes
}
function PinnedInstaller(){
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_MISSING'}
 $cacheDir=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\R16_SetupCache'
 [void](New-Item -ItemType Directory -Path $cacheDir -Force)
 $dest=Join-Path $cacheDir ('INSTALL_R16_'+$R16InstallerRev.Substring(0,12)+'.ps1')
 if(Test-Path -LiteralPath $dest){
  [void](VerifiedBytes $dest $R16InstallerBlob)
  return $dest
 }
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+
  $R16InstallerRev+'/tools/r16-mini/INSTALL_R16_MINI.ps1'
 $web=New-Object System.Net.WebClient
 try{$bytes=$web.DownloadData($url)}finally{$web.Dispose()}
 if($bytes.Length -lt 1000 -or $bytes.Length -gt 18000 -or
  (GitBlobSha $bytes) -cne $R16InstallerBlob){
  throw 'R16_INSTALLER_DOWNLOAD_INTEGRITY'
 }
 $temp=$dest+'.part-'+[guid]::NewGuid().ToString('N')
 try{
  [IO.File]::WriteAllBytes($temp,$bytes)
  Move-Item -LiteralPath $temp -Destination $dest -ErrorAction Stop
 }finally{
  if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force}
 }
 return $dest
}
function Pins([string]$installer){
 # Read the SHA-pinned R16 manifest as TEXT, not as executable content.
 $text=[IO.File]::ReadAllText($installer)
 $matches=[regex]::Matches($text,"@\{Path='([^']+)'; Sha='([0-9a-f]{40})'\}")
 if($matches.Count -ne 32){throw 'R16_EXACT_32_PIN_MANIFEST_REQUIRED'}
 $pins=@{}
 foreach($match in $matches){
  $key=$match.Groups[1].Value
  if($pins.ContainsKey($key)){throw 'R16_DUPLICATE_PIN'}
  $pins[$key]=$match.Groups[2].Value
 }
 foreach($item in $Overlays){$pins[$item.Path]=$item.Sha}
 if($pins.Count -ne 37){throw 'R24_EXACT_37_PIN_COUNT'}
 return $pins
}
function Verify([string]$dir,[hashtable]$pins){
 if(-not (Test-Path -LiteralPath $dir -PathType Container))
  {throw 'R24_SOURCE_FOLDER_MISSING'}
 foreach($item in $pins.GetEnumerator()){
  $file=Join-Path $dir ($item.Key.Replace('/','\'))
  [void](VerifiedBytes $file $item.Value)
 }
 $actual=@(Get-ChildItem -LiteralPath $dir -Recurse -File)
 if($actual.Count -ne $pins.Count){throw 'R24_UNKNOWN_OR_MISSING_FILES'}
 if(Test-Path -LiteralPath (Join-Path $dir 'scripts\RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd')){
  throw 'R24_LEGACY_REAL_MODEL_LAUNCHER_FORBIDDEN'
 }
}
function OfflineQA([string]$dir){
 $suite=@(
  'scripts/b198zr23-future-one-shot.test.mjs',
  'scripts/b198zr22-profile-offline.test.mjs',
  'scripts/b198zr6-authorized-single-r4-capture.test.mjs'
 )
 $files=@($suite|ForEach-Object {Join-Path $dir ($_.Replace('/','\'))})
 $stdout=(& node --test $files 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or
  -not [regex]::IsMatch($stdout,'(?m)^\s*(?:#|ℹ)\s*fail\s+0\s*$')){
  throw ('R24_SYNTHETIC_QA_FAILED: '+$stdout.Substring(0,[Math]::Min(600,$stdout.Length)))
 }
 Write-Host '[R24] Fake-server R23 / R22 / R6 regressions: PASS.'
 Write-Host '[R24] Real Qwen POST 0; Minecraft world read/write 0.'
}
try{
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_MISSING'}
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'NODE_REQUIRED'}
 $root=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder'
 $target=Join-Path $root ('R24_Mini_'+$Rev.Substring(0,12))
 $installer=PinnedInstaller
 $pins=Pins $installer
 if($CheckOnly){
  Verify $target $pins
  Write-Host '[R24] SHA CHECK ONLY: 37/37 pinned; NO model call.'
  exit 0
 }
 # Immutable R16 installer verifies all 32 base files before we copy them.
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer
 if($LASTEXITCODE -ne 0){throw 'R16_PINNED_SOURCE_OR_QA_FAILED'}
 $base=Join-Path $root ('R16_Mini_'+$R16Rev.Substring(0,12))
 if(Test-Path -LiteralPath $target){
  Verify $target $pins
  Write-Host '[R24] Existing 37-file isolated package unchanged.'
 }else{
  $temp=$target+'.part-'+[guid]::NewGuid().ToString('N')
  try{
   Copy-Item -LiteralPath $base -Destination $temp -Recurse -ErrorAction Stop
   [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
   $web=New-Object System.Net.WebClient
   try{
    foreach($item in $Overlays){
     $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+
       $Rev+'/'+$item.Path
     $bytes=$web.DownloadData($url)
     if($bytes.Length -lt 1 -or $bytes.Length -gt 35000 -or
      (GitBlobSha $bytes) -cne $item.Sha){throw 'R24_OVERLAY_INTEGRITY'}
     $dest=Join-Path $temp ($item.Path.Replace('/','\'))
     [IO.File]::WriteAllBytes($dest,$bytes)
    }
   }finally{$web.Dispose()}
   Verify $temp $pins
   Move-Item -LiteralPath $temp -Destination $target -ErrorAction Stop
  }catch{
   if(Test-Path -LiteralPath $temp){
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
   }
   throw
  }
  Write-Host '[R24] Isolated 37-file SHA-pinned source installed.'
 }
 OfflineQA $target
 Write-Host '[R24] OFFLINE PREPARED. No fresh approval to run Qwen was given.'
 Write-Host ('[R24] Folder: '+$target)
 exit 0
}catch{
 Write-Host ('[R24 HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host '[SAFE] No real-model inference and no Minecraft world operations.'
 exit 1
}

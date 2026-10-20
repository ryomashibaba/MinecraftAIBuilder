# R44: stage a SHA-pinned, isolated source-only R41-guided real-Qwen runner.
# NO real Qwen/Ollama inference in this installer (fake Node CI tests only).
# Real Qwen is triggered ONLY by separately invoked R44 approved launcher.
param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$R44Rev='539daac020143efe2f24f981727f8dc5d6beeb50'
$R24Rev='44108944d0d9b0f892d01729c3fa3c76d006fe55'
$R24InstallerSha='65c6b5308a1921629d0a656dd0b1c0e81cea621b'
$Overlay=@(
 @{Path='source/ai/b198s-native-ollama-source.mjs';Sha='5a833ceeeb98283c87ac9f93a90f3c95829af015'},
 @{Path='source/ai/b198zr28-space-first-future-guide.mjs';Sha='685731f0d6ee99fda2bc5a624ddb4d98ca704c4d'},
 @{Path='source/ai/b198zr30-generalized-space-guide.mjs';Sha='f0b7c08d0a8ec01bb5e2cb612b51add1a7109a13'},
 @{Path='source/ai/b198zr41-architecture-authoring-candidate.mjs';Sha='3122c231fbd82258025b6ac7211e513a7cce4aa7'},
 @{Path='source/ai/b198zr42-lossless-drafting-budget.mjs';Sha='3d453b95ac73f70f17d25af4efab940afa12bae9'},
 @{Path='source/ai/b198zr43-sectional-architecture-review.mjs';Sha='68e83bb51c4327c41be6e3e10b58f893f65db8bb'},
 @{Path='scripts/b198zr32-synthetic-geometry-fixtures.mjs';Sha='53596b211828ca12c1d73863a5d28da7d93e6c8a'},
 @{Path='scripts/b198zr43-sectional-architecture-review.test.mjs';Sha='cfab37f645754289e7a8cf1f6bd4f5ed7917a630'},
 @{Path='scripts/b198zr44-consented-single-qwen.mjs';Sha='07f25c1083f058bce952a639d9972124f9ea0145'},
 @{Path='scripts/b198zr44-consented-single-qwen.test.mjs';Sha='95f0a04c534b3835a4bb50a94a658bdb874dbb6d'}
)
function GitBlobSha([byte[]]$b){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$b.Length+[char]0)
 $all=New-Object byte[] ($prefix.Length+$b.Length)
 [Array]::Copy($prefix,0,$all,0,$prefix.Length)
 [Array]::Copy($b,0,$all,$prefix.Length,$b.Length)
 $obj=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($obj.ComputeHash($all))).Replace('-','').ToLowerInvariant()}
 finally{$obj.Dispose()}
}
function VerifyBlob([string]$file,[string]$expected){
 if(-not (Test-Path -LiteralPath $file -PathType Leaf)){throw ('FILE_MISSING_'+$file)}
 if((GitBlobSha ([IO.File]::ReadAllBytes($file))) -cne $expected){
  throw ('SHA_INTEGRITY_HOLD_'+$file)
 }
}
function DownloadPinned([string]$rev,[string]$file,[string]$sha){
 $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+$rev+'/'+$file
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 $client=New-Object Net.WebClient
 try{$bytes=$client.DownloadData($url)}finally{$client.Dispose()}
 if($bytes.Length -lt 10 -or $bytes.Length -gt 250000 -or
  (GitBlobSha $bytes) -cne $sha){throw ('PINNED_DOWNLOAD_REJECTED_'+$file)}
 return ,$bytes
}
function VerifyTarget([string]$target,[string]$base){
 if(-not (Test-Path -LiteralPath $target -PathType Container)){
  throw 'R44_TARGET_MISSING'
 }
 $expected=@{}
 $baseFiles=@(Get-ChildItem -LiteralPath $base -Recurse -File)
 if($baseFiles.Count -ne 37){throw 'R24_BASE_FILE_COUNT_MISMATCH'}
 foreach($item in $baseFiles){
  $relative=$item.FullName.Substring($base.Length+1).Replace('\','/')
  $expected[$relative]=(GitBlobSha ([IO.File]::ReadAllBytes($item.FullName)))
 }
 foreach($item in $Overlay){
  $relative=$item.Path.Replace('\','/')
  $expected[$relative]=$item.Sha
 }
 if($expected.Count -ne 46){
  throw ('R44_EXACT_SOURCE_COUNT_EXPECTED_46_ACTUAL_'+$expected.Count+
   '_BASE_'+$baseFiles.Count+'_OVERLAY_'+$Overlay.Count)
 }
 $actual=@(Get-ChildItem -LiteralPath $target -Recurse -File)
 if($actual.Count -ne $expected.Count){throw 'R44_UNKNOWN_OR_MISSING_SOURCE_FILES'}
 foreach($item in $expected.GetEnumerator()){
  VerifyBlob (Join-Path $target ($item.Key.Replace('/','\'))) $item.Value
 }
 if(Test-Path -LiteralPath (Join-Path $target 'scripts\RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd')){
  throw 'LEGACY_UNCONTROLLED_LAUNCHER_IN_SOURCE'
 }
}
try{
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_MISSING'}
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'NODE24_REQUIRED'}
 $root=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder'
 [void](New-Item -ItemType Directory -Path $root -Force)
 $target=Join-Path $root ('R44_Source_'+$R44Rev.Substring(0,12))
 $base=Join-Path $root ('R24_Mini_'+$R24Rev.Substring(0,12))
 $installer=Join-Path $root 'R44_R24_Pinned_Installer.ps1'
 if(-not(Test-Path -LiteralPath $installer -PathType Leaf)){
  $bytes=DownloadPinned $R44Rev 'tools/r24-future/INSTALL_R24_OFFLINE_ONLY.ps1' $R24InstallerSha
  [IO.File]::WriteAllBytes($installer,$bytes)
 }
 VerifyBlob $installer $R24InstallerSha
 # R24 CheckOnly is a read-only SHA audit; no model call.
 if($CheckOnly){
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -CheckOnly
  if($LASTEXITCODE -ne 0){throw 'R24_BASE_SHA_AUDIT_HOLD'}
  VerifyTarget $target $base
  Write-Host '[R44] PINNED SOURCE 46/46 PASS. NO real Qwen invoked.'
  exit 0
 }
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer
 if($LASTEXITCODE -ne 0){throw 'R24_OFFLINE_INSTALL_OR_QA_HOLD'}
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -CheckOnly
 if($LASTEXITCODE -ne 0){throw 'R24_BASE_SHA_AUDIT_HOLD'}
 if(-not(Test-Path -LiteralPath $target -PathType Container)){
  $stage=$target+'.part-'+[guid]::NewGuid().ToString('N')
  try{
   Copy-Item -LiteralPath $base -Destination $stage -Recurse -ErrorAction Stop
   foreach($item in $Overlay){
    $dest=Join-Path $stage ($item.Path.Replace('/','\'))
    [void](New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force)
    $bytes=DownloadPinned $R44Rev $item.Path $item.Sha
    [IO.File]::WriteAllBytes($dest,$bytes)
   }
   VerifyTarget $stage $base
   Move-Item -LiteralPath $stage -Destination $target -ErrorAction Stop
  }catch{
   if(Test-Path -LiteralPath $stage){
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
   }
   throw
  }
 }
 VerifyTarget $target $base
 # Mock transport binds its own ephemeral port; it cannot contact a real
 # local model at 11434. This preflight cannot consume actual model consent.
 $suite=@(
  (Join-Path $target 'scripts\b198zr44-consented-single-qwen.test.mjs'),
  (Join-Path $target 'scripts\b198zr43-sectional-architecture-review.test.mjs')
 )
 & node --test $suite
 if($LASTEXITCODE -ne 0){throw 'R44_FAKE_ONLY_PREFLIGHT_HOLD'}
 Write-Host '[R44] 46/46 SHA pins and fake-only QA PASS.'
 Write-Host '[R44] NO real Qwen request has been started by installation.'
 Write-Host ('R44_SOURCE_DIR='+$target)
 exit 0
}catch{
 Write-Host ('[R44 INSTALL HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'No real Qwen has been requested by this installer. No Minecraft interaction.'
 exit 1
}

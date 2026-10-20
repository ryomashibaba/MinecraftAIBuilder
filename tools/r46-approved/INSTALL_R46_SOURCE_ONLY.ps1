# R46 — source-only SHA-pinned Windows installer. ZERO actual Ollama/Qwen.
# Uses audited R24 37-file prerequisite and immutable R46 overlay blobs.
param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$R46Rev='214fec3002de6837a6e6174687a5047ffb6d6c7c'
$R24Rev='44108944d0d9b0f892d01729c3fa3c76d006fe55'
$R24InstallerBlob='65c6b5308a1921629d0a656dd0b1c0e81cea621b'
$Overlay=@(
 @{Path='source/ai/b198s-native-ollama-source.mjs';Sha='f882de658143041a9a1d48382741d51cc34151c5'},
 @{Path='source/ai/b198zr28-space-first-future-guide.mjs';Sha='685731f0d6ee99fda2bc5a624ddb4d98ca704c4d'},
 @{Path='source/ai/b198zr30-generalized-space-guide.mjs';Sha='f0b7c08d0a8ec01bb5e2cb612b51add1a7109a13'},
 @{Path='source/ai/b198zr41-architecture-authoring-candidate.mjs';Sha='3122c231fbd82258025b6ac7211e513a7cce4aa7'},
 @{Path='source/ai/b198zr42-lossless-drafting-budget.mjs';Sha='3d453b95ac73f70f17d25af4efab940afa12bae9'},
 @{Path='source/ai/b198zr43-sectional-architecture-review.mjs';Sha='68e83bb51c4327c41be6e3e10b58f893f65db8bb'},
 @{Path='source/ai/b198zr45-original-grammar-and-program-audit.mjs';Sha='fe7348229b3ef769da3d4f2cf3bbec34b3d27b5c'},
 @{Path='source/ai/b198zr46-corrected-architecture-guide.mjs';Sha='1041c2b6c52abf099cf3a6fb463ee5ab34bcc4fc'},
 @{Path='scripts/b198zr32-synthetic-geometry-fixtures.mjs';Sha='53596b211828ca12c1d73863a5d28da7d93e6c8a'},
 @{Path='scripts/b198zr46-consented-single-qwen.mjs';Sha='3b81375386408e713ee43dd073a3db6e6a2fcb14'},
 @{Path='scripts/b198zr46-consented-single-qwen.test.mjs';Sha='edb9abc2b838735eca05f2a127a3e28995a10034'}
)
function Blob([byte[]]$b){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$b.Length+[char]0)
 $a=New-Object byte[] ($prefix.Length+$b.Length)
 [Array]::Copy($prefix,0,$a,0,$prefix.Length)
 [Array]::Copy($b,0,$a,$prefix.Length,$b.Length)
 $h=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($h.ComputeHash($a))).Replace('-','').ToLowerInvariant()}
 finally{$h.Dispose()}
}
function Check([string]$p,[string]$sha){
 if(-not(Test-Path -LiteralPath $p -PathType Leaf)){throw 'R46_PINNED_SOURCE_MISSING'}
 if((Blob ([IO.File]::ReadAllBytes($p))) -cne $sha){
  throw 'R46_PINNED_SOURCE_SHA_MISMATCH'
 }
}
function GetPinned([string]$rev,[string]$rel,[string]$expected){
 $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+$rev+'/'+$rel
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 $web=New-Object Net.WebClient
 try{$b=$web.DownloadData($url)}finally{$web.Dispose()}
 if($b.Length -lt 10 -or $b.Length -gt 250000 -or
  (Blob $b) -cne $expected){throw 'R46_SOURCE_DOWNLOAD_INTEGRITY_HOLD'}
 return ,$b
}
function VerifyInstalled([string]$target,[string]$base){
 if(-not(Test-Path -LiteralPath $target -PathType Container)){
  throw 'R46_TARGET_MISSING'
 }
 $baseFiles=@(Get-ChildItem -LiteralPath $base -Recurse -File)
 if($baseFiles.Count -ne 37){throw 'R24_PREREQUISITE_EXPECTED_37'}
 $expected=@{}
 foreach($f in $baseFiles){
  # Windows separators can differ in text APIs; normalize to slash keys.
  $rel=$f.FullName.Substring($base.Length+1).Replace('\','/')
  $expected[$rel]=(Blob ([IO.File]::ReadAllBytes($f.FullName)))
 }
 foreach($e in $Overlay){$expected[$e.Path]=$e.Sha}
 $actual=@(Get-ChildItem -LiteralPath $target -Recurse -File)
 if($actual.Count -ne $expected.Count){
  throw ('R46_PINNED_SOURCE_COUNT_MISMATCH_ACTUAL_'+$actual.Count+
   '_EXPECTED_'+$expected.Count)
 }
 foreach($e in $expected.GetEnumerator()){
  Check (Join-Path $target ($e.Key.Replace('/','\'))) $e.Value
 }
 if(Test-Path -LiteralPath (Join-Path $target 'scripts\RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd')){
  throw 'R46_LEGACY_LAUNCHER_NOT_ALLOWED'
 }
 Write-Host ('[R46] SHA pins verified: '+$expected.Count+' files.')
}
try{
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_REQUIRED'}
 if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw 'NODE24_REQUIRED'}
 $root=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder'
 [void](New-Item -ItemType Directory -Path $root -Force)
 $base=Join-Path $root ('R24_Mini_'+$R24Rev.Substring(0,12))
 $target=Join-Path $root ('R46_Source_'+$R46Rev.Substring(0,12))
 $installer=Join-Path $root 'R46_R24_Pinned_Installer.ps1'
 if(-not(Test-Path -LiteralPath $installer -PathType Leaf)){
  if($CheckOnly){throw 'R24_INSTALLER_NOT_PRESENT_FOR_CHECK'}
  $bytes=GetPinned $R24Rev 'tools/r24-future/INSTALL_R24_OFFLINE_ONLY.ps1' $R24InstallerBlob
  [IO.File]::WriteAllBytes($installer,$bytes)
 }
 Check $installer $R24InstallerBlob
 if($CheckOnly){
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -CheckOnly
  if($LASTEXITCODE -ne 0){throw 'R24_READ_ONLY_AUDIT_HOLD'}
  VerifyInstalled $target $base
  Write-Host '[R46] CHECK ONLY — no model calls or Minecraft contact.'
  exit 0
 }
 # R24 installer calls only fake-model offline tests and refuses altered pins.
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer
 if($LASTEXITCODE -ne 0){throw 'R24_SOURCE_SETUP_HOLD'}
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -CheckOnly
 if($LASTEXITCODE -ne 0){throw 'R24_SOURCE_INTEGRITY_HOLD'}
 if(-not(Test-Path -LiteralPath $target -PathType Container)){
  $stage=$target+'.part-'+[guid]::NewGuid().ToString('N')
  try{
   Copy-Item -LiteralPath $base -Destination $stage -Recurse -ErrorAction Stop
   foreach($e in $Overlay){
    $dest=Join-Path $stage ($e.Path.Replace('/','\'))
    [void](New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force)
    $b=GetPinned $R46Rev $e.Path $e.Sha
    [IO.File]::WriteAllBytes($dest,$b)
   }
   VerifyInstalled $stage $base
   Move-Item -LiteralPath $stage -Destination $target -ErrorAction Stop
  }catch{
   if(Test-Path -LiteralPath $stage){
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
   }
   throw
  }
 }
 VerifyInstalled $target $base
 # All actual requests in this QA go only to a fake in-process ephemeral port.
 & node --test (Join-Path $target 'scripts\b198zr46-consented-single-qwen.test.mjs')
 if($LASTEXITCODE -ne 0){throw 'R46_FAKE_SOURCE_QA_FAILED'}
 Write-Host '[R46] OFFLINE PREP PASS. REAL QWEN POST 0.'
 exit 0
}catch{
 Write-Host ('[R46 INSTALL HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'No real Qwen inference is performed by this installer.'
 exit 1
}

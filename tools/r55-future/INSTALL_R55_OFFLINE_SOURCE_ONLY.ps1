# R55 SOURCE ONLY. SHA-checked incremental copy of user's R48.
# This script NEVER calls real Qwen, Ollama or Minecraft.
param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$Revision='385137010d86d9e7acc824c792f8d99ea0500982'
$R48Revision='68396b9483fd426f6764621ac48bcfd62c6c384d'
$R48InstallerRevision=$Revision
$R48InstallerBlob='22daa43c5697773be60d7d0bb4b918f6a69f48b7'
$ExpectedCount=467
$Overlay=@(
 @{Path='source/ai/b198s-native-ollama-source.mjs';Sha='bd81e722d0c6b52096226c56eb7bbca04b1a5111'},
 @{Path='source/ai/b198zr49-global-source-consistency.mjs';Sha='6977a00483d1af0fc92e95cfe5079d6f3ebeb921'},
 @{Path='source/ai/b198zr50-program-first-architecture-guide.mjs';Sha='49b29f7e9d0670324b1a06b722235ff64e4bba0e'},
 @{Path='source/ai/b198zr51-uncompiled-storyboard-template.html';Sha='472cb5c8811490cb318c968786b31da26e096fec'},
 @{Path='scripts/b198zr49-global-source-consistency.test.mjs';Sha='da4e730bf91b109e05e0902872c194d218584910'},
 @{Path='scripts/b198zr50-program-first-architecture-guide.test.mjs';Sha='3e2efa9c3d1c9b3fb48b4d5d6adb1247c26b07b4'},
 @{Path='scripts/b198zr51-uncompiled-envelope-storyboard.mjs';Sha='472d8207ef3a040d08d648c11c6eaa861ecc8e46'},
 @{Path='scripts/b198zr51-uncompiled-envelope-storyboard.test.mjs';Sha='a1538a610247a09c676b00b19ea567c419c649e4'},
 @{Path='scripts/b198zr52-postcapture-auto-storyboard.mjs';Sha='9e92d6948974f8a0a102c2ac43e1f9af749c5713'},
 @{Path='scripts/b198zr52-postcapture-auto-storyboard.test.mjs';Sha='62d90e294142451fdeb62a800a4751fd45276f1e'},
 @{Path='scripts/b198zr53-fake-one-shot-to-zip.integration.test.mjs';Sha='a8f55916b680c1b0bea89da26cc1db426c5a3726'},
 @{Path='scripts/b198zr54-future-program-first-once.mjs';Sha='fa27be60f85b3724ecb2aaa07dcc569c2b43e03f'},
 @{Path='scripts/b198zr54-future-program-first-once.test.mjs';Sha='5e77447b492d3e7229e6aae7ec488edb10ab0cc1'},
 @{Path='scripts/b198zr54-future-one-shot-auto-zip.fake.test.mjs';Sha='32e157b2c134001d5a75a8cd1105ecc5734a4ad3'},
 @{Path='tools/r52-future/ARCHIVE_WITH_R51_DIAGNOSTIC_OFFLINE.ps1';Sha='f585f381facda9526305c996ba9395a453af81aa'}
)
function Blob([byte[]]$data){
 $head=[Text.Encoding]::ASCII.GetBytes('blob '+$data.Length+[char]0)
 $buf=New-Object byte[] ($head.Length+$data.Length)
 [Array]::Copy($head,0,$buf,0,$head.Length)
 [Array]::Copy($data,0,$buf,$head.Length,$data.Length)
 $hash=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($hash.ComputeHash($buf))).Replace('-','').ToLowerInvariant()}
 finally{$hash.Dispose()}
}
function Check([string]$file,[string]$sha){
 if(-not(Test-Path -LiteralPath $file -PathType Leaf)){throw 'R55_REQUIRED_FILE_MISSING'}
 if((Blob ([IO.File]::ReadAllBytes($file))) -cne $sha){throw 'R55_GIT_BLOB_MISMATCH'}
}
function Download([string]$revision,[string]$rel,[string]$sha){
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 $web=New-Object Net.WebClient
 try{$bytes=$web.DownloadData('https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+$revision+'/'+$rel)}
 finally{$web.Dispose()}
 if($bytes.Length -lt 15 -or $bytes.Length -gt 350000 -or (Blob $bytes) -cne $sha){
  throw ('R55_PINNED_DOWNLOAD_MISMATCH_'+$rel)
 }
 return ,$bytes
}
function Verify([string]$folder){
 if(-not(Test-Path -LiteralPath $folder -PathType Container)){throw 'R55_SOURCE_MISSING'}
 $n=@(Get-ChildItem -LiteralPath $folder -Recurse -File).Count
 if($n -ne $ExpectedCount){throw ('R55_EXPECTED_467_FILES_GOT_'+$n)}
 foreach($item in $Overlay){
  Check (Join-Path $folder ($item.Path.Replace('/','\'))) $item.Sha
 }
 Write-Host ('[R55] '+$n+' source files; 15 SHA-pinned R54 files PASS.')
}
try{
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_REQUIRED'}
 if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw 'NODE24_REQUIRED'}
 $ver=(& node --version).Trim()
 if($LASTEXITCODE -ne 0 -or $ver -notmatch '^v(2[4-9]|[3-9][0-9])\.'){
  throw 'NODE24_OR_NEWER_REQUIRED'
 }
 $root=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder'
 [void](New-Item -Path $root -ItemType Directory -Force)
 $base=Join-Path $root ('R48_Source_'+$R48Revision.Substring(0,12))
 $dest=Join-Path $root ('R55_Source_'+$Revision.Substring(0,12))
 $oldInstaller=Join-Path $root 'R55_PINNED_R48_SOURCE_ONLY.ps1'
 if(-not(Test-Path -LiteralPath $oldInstaller -PathType Leaf)){
  if($CheckOnly){throw 'R55_BASE_INSTALLER_NOT_PREPARED'}
  [IO.File]::WriteAllBytes($oldInstaller,(Download $R48InstallerRevision 'tools/r48-approved/INSTALL_R48_OFFLINE_SOURCE_ONLY.ps1' $R48InstallerBlob))
 }
 Check $oldInstaller $R48InstallerBlob
 if(-not(Test-Path -LiteralPath $base -PathType Container)){
  if($CheckOnly){throw 'R55_R48_BASE_NOT_PRESENT'}
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $oldInstaller
  if($LASTEXITCODE -ne 0){throw 'R55_R48_PREP_FAILED'}
 }
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $oldInstaller -CheckOnly
 if($LASTEXITCODE -ne 0){throw 'R55_BASE_BLOB_HOLD'}
 if(-not(Test-Path -LiteralPath $dest -PathType Container)){
  if($CheckOnly){throw 'R55_SOURCE_NOT_PREPARED'}
  $stage=$dest+'.part-'+[guid]::NewGuid().ToString('N')
  try{
   Copy-Item -LiteralPath $base -Destination $stage -Recurse -ErrorAction Stop
   foreach($item in $Overlay){
    $file=Join-Path $stage ($item.Path.Replace('/','\'))
    [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $file))
    [IO.File]::WriteAllBytes($file,(Download $Revision $item.Path $item.Sha))
   }
   Verify $stage
   Move-Item -LiteralPath $stage -Destination $dest -ErrorAction Stop
  }finally{if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Recurse -Force}}
 }
 Verify $dest
 if($CheckOnly){Write-Host '[R55] PREPARED READ-ONLY; REAL QWEN=0.';exit 0}
 $tests=@(
  (Join-Path $dest 'scripts\b198zr54-future-program-first-once.test.mjs'),
  (Join-Path $dest 'scripts\b198zr54-future-one-shot-auto-zip.fake.test.mjs'),
  (Join-Path $dest 'scripts\b198zr52-postcapture-auto-storyboard.test.mjs'))
 # Tests use relative paths only within their own SHA-pinned source tree.
 # Running with arbitrary user's current directory would silently pick up
 # unrelated files or fail to find the R52 ZIP helper.
 Push-Location $dest
 try{
  & node --test @tests
  $testExit=$LASTEXITCODE
 }finally{Pop-Location}
 if($testExit -ne 0){throw 'R55_FAKE_QA_FAILED'}
 Write-Host '[R55] ALL OFFLINE QA PASS. NO REAL MODEL REQUEST. NO MINECRAFT.'
 exit 0
}catch{
 Write-Host ('[R55 INSTALL HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host '[R55] No model or Minecraft request was permitted.'
 exit 1
}

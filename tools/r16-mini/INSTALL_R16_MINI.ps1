# R16 MINI — SHA-verified Windows source-only installer.
# This package NEVER invokes Ollama/Qwen or Minecraft. 127.0.0.1 fake
# HTTP servers may run ONLY as fixtures inside Node test suites.
param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$Revision='a0438d8fa2504564351f8ebafbe9ecc14575dc95'
$files=@(
 @{Path='scripts/b198zr6-authorized-single-r4-capture.mjs'; Sha='ecaa85c8d82c5c73d01827b52cca0f3a37cf3de0'}
 @{Path='scripts/b198zr7-offline-visual-review.mjs'; Sha='7a75d5dba81ecdb5237f074dcd9a940d81c96745'}
 @{Path='scripts/b143-gallery-core.mjs'; Sha='a72026f80bc23a2262540e7285cd77d9f8d307cf'}
 @{Path='scripts/b198w-quality-review.mjs'; Sha='508ab909653ed251c5fa886f8f7ddacfd117f80d'}
 @{Path='source/ai/b198b-benchmark-cases.mjs'; Sha='21b7dcadc9dd88d14d42138d75e8262114dc88a6'}
 @{Path='source/ai/b143-building-dsl.mjs'; Sha='207ee3439f913bea3ce1768350e1dfa086dbe435'}
 @{Path='source/ai/b198s-native-ollama-source.mjs'; Sha='41672e4d69354fd991923d3e67c0d54138280650'}
 @{Path='source/ai/b198g-local-model-adapter.mjs'; Sha='108266df5a2fa2da0bc105a99e1888de621e9cd0'}
 @{Path='source/ai/b198zr4-planned-source.mjs'; Sha='cc6f0967476c96bcde92aadfb239f2397034013b'}
 @{Path='source/ai/b198zr3-functional-review-contract.mjs'; Sha='c5427586397420183c3edeff183695a9cb381767'}
 @{Path='source/ai/b198zr8-read-only-model-preflight.mjs'; Sha='78117b6babae5576ab356fdd0002b26956809dba'}
 @{Path='source/ai/b198-natural-language-design.mjs'; Sha='c154d2711016a0097be7fc8eced1d78f7506242d'}
 @{Path='source/ai/b198u-bounds-only-repair.mjs'; Sha='ef970141973649e6854d49e85db045c33874244b'}
 @{Path='source/ai/b198zr2-generic-quality-guide.mjs'; Sha='82d19050afc9a04a844abc27bfc9206a45ddf214'}
 @{Path='source/ai/b198t-metadata-only-repair.mjs'; Sha='10ef9c25d854175d54f4e29afeb63a0ecdde5ce1'}
 @{Path='source/ai/b198b-architecture-quality.mjs'; Sha='b41caf2b54462b2d92b62a776247b2eb8e88d75d'}
 @{Path='source/ai/b198c-spatial-critic.mjs'; Sha='840a03c01ee21a5d2917f90ad81906534e3c0c08'}
 @{Path='source/ai/b143-viewer-template.html'; Sha='f716c45095313b0267e6509dbae34e16bb70b578'}
 @{Path='source/ai/b198w-review-board-template.html'; Sha='bd45aa98c031a36f16fba70084aa179fbdd8746b'}
 @{Path='source/ai/b198zr11-compact-r4-output.mjs'; Sha='6a44291fa20d7a6f396f4c4f639d0f278d7fe4aa'}
 @{Path='scripts/b198zr12-local-offline-qa.mjs'; Sha='f2670914a6561ee6d31cef30fa1d813f5845e3ca'}
 @{Path='source/ai/b198zr13-quality-decision.mjs'; Sha='38720deacb45bc4f634d3ed8d55350b889d1c2f9'}
 @{Path='source/ai/b198zr15-evidence-quality-target.mjs'; Sha='f17deae42ea4c71bbc5422d04bc887e4709c3746'}
 @{Path='scripts/b198zr13-review-saved-capture.mjs'; Sha='628bd72bcc53de1384f539fe8074571fabaa643e'}
 @{Path='scripts/b198zr15-compare-saved-reviews.mjs'; Sha='5e90c957a8a633d34c31998f1e2c2a3e72ef23c5'}
 @{Path='scripts/b198zr6-authorized-single-r4-capture.test.mjs'; Sha='8ec3852da4b2e7a8dc11e3bf0f6a28cbed48523b'}
 @{Path='scripts/b198zr11-output-budget.test.mjs'; Sha='8c61e9bbe50f330ab7026297f013deb61671dead'}
 @{Path='scripts/b198zr13-quality-decision.test.mjs'; Sha='d57c8eb8e89184a590dcea122dd6ad508bc2c906'}
 @{Path='scripts/b198zr15-evidence-quality-target.test.mjs'; Sha='75f9eececb62d4fcd5542a0d015483a1832abff2'}
 @{Path='scripts/b198zr16-offline-preflight.mjs'; Sha='3b650e61e4d7032d9e9c7c123faffdac7bec3694'}
 @{Path='evidence/b198zr2/assistant-revised-library-r2.json'; Sha='83bb38728357fb4de08f02165e2145fb8489c086'}
 @{Path='evidence/b198zr3/r2-functional-review-contract.json'; Sha='b255add4e78951d92c2fb8e9958aabc10bf24aee'}
)
function GitBlobSha([byte[]]$b){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$b.Length+[char]0)
 $full=New-Object byte[] ($prefix.Length+$b.Length)
 [Array]::Copy($prefix,0,$full,0,$prefix.Length)
 [Array]::Copy($b,0,$full,$prefix.Length,$b.Length)
 $sha=[Security.Cryptography.SHA1]::Create()
 try {return ([BitConverter]::ToString($sha.ComputeHash($full))).Replace('-','').ToLowerInvariant()}
 finally{$sha.Dispose()}
}
function Verify([string]$root){
 foreach($f in $files){
  $dest=Join-Path $root ($f.Path.Replace('/','\'))
  if(-not (Test-Path -LiteralPath $dest -PathType Leaf)){throw ('MISSING_'+$f.Path)}
  if((GitBlobSha ([IO.File]::ReadAllBytes($dest))) -ne $f.Sha){
   throw ('INTEGRITY_MISMATCH_'+$f.Path)
  }
 }
 $actual=@(Get-ChildItem -LiteralPath $root -Recurse -File)
 if($actual.Count -ne $files.Count){throw 'UNKNOWN_FILES_IN_INSTALLATION'}
 if(Test-Path (Join-Path $root 'scripts\RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd')){
  throw 'UNAPPROVED_MODEL_LAUNCHER_PRESENT'
 }
}
function RunQA([string]$root){
 $entry=Join-Path $root 'scripts\b198zr16-offline-preflight.mjs'
 $stdout=(& node $entry 2>&1 | Out-String)
 if($LASTEXITCODE -ne 0 -or -not $stdout.Contains('R16_OFFLINE_PREPARED_NO_QWEN')){
  throw ('OFFLINE_QA_FAILED: '+$stdout.Substring(0,[Math]::Min(850,$stdout.Length)))
 }
 Write-Host '[R16] R6/R11/R13/R15 fake-server + geometry QA: PASS.'
 Write-Host '[R16] Real Qwen 0, Minecraft read/write 0.'
}
if($CheckOnly){
 Write-Host ('R16_MINI_MANIFEST_PASS: '+$files.Count+' SHA-verified files; offline only')
 exit 0
}
try{
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_MISSING'}
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'NODEJS_REQUIRED'}
 $root=Join-Path $env:LOCALAPPDATA ('MinecraftAIBuilder\R16_Mini_'+$Revision.Substring(0,12))
 if(Test-Path -LiteralPath $root){
  Verify $root
  Write-Host '[R16] Existing package SHA verified, no overwrite.'
 }else{
  [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $root))
  $temp=$root+'.part-'+[guid]::NewGuid().ToString('N')
  [void](New-Item -ItemType Directory -Path $temp)
  try{
   [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
   $web=New-Object System.Net.WebClient
   try{
    foreach($f in $files){
     $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+$Revision+'/'+$f.Path
     $dest=Join-Path $temp ($f.Path.Replace('/','\'))
     [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest))
     $bytes=$web.DownloadData($url)
     if($bytes.Length -lt 1 -or $bytes.Length -gt 250000){
      throw ('SOURCE_SIZE_LIMIT_'+$f.Path)
     }
     if((GitBlobSha $bytes) -ne $f.Sha){throw ('REMOTE_SHA_MISMATCH_'+$f.Path)}
     [IO.File]::WriteAllBytes($dest,$bytes)
    }
   }finally{$web.Dispose()}
   Verify $temp
   Move-Item -LiteralPath $temp -Destination $root -ErrorAction Stop
  }catch{
   if(Test-Path -LiteralPath $temp){
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
   }
   throw
  }
  Write-Host ('[R16] '+$files.Count+' pinned source files installed without whole-repo ZIP.')
 }
 RunQA $root
 Write-Host '[R16] OFFLINE ONLY READY — further REAL MODEL GENERATION REQUIRES NEW APPROVAL.'
 Write-Host ('[R16] Folder: '+$root)
 if($env:CI -ne 'true'){
  Start-Process explorer.exe -ArgumentList ('"'+$root+'"')
 }
 exit 0
}catch{
 Write-Host ('[R16 HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'No real model run or Minecraft world operation has started.'
 exit 1
}

# R46 repaired Windows source-only installer — no dead historical commit dependencies.
# Installer itself NEVER contacts Ollama/Qwen, Minecraft, or user worlds.
# Download one immutable pinned GitHub archive, extract ONLY 449 small
# module/fixture files, validate 12 critical Git blob SHA, run fake-only QA.
param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$Revision='214fec3002de6837a6e6174687a5047ffb6d6c7c'
$ExpectedFileCount=449
$Pinned=@(
 @{Path='scripts/b198zr46-consented-single-qwen.mjs';Sha='3b81375386408e713ee43dd073a3db6e6a2fcb14'},
 @{Path='scripts/b198zr46-consented-single-qwen.test.mjs';Sha='edb9abc2b838735eca05f2a127a3e28995a10034'},
 @{Path='scripts/b198zr7-offline-visual-review.mjs';Sha='7a75d5dba81ecdb5237f074dcd9a940d81c96745'},
 @{Path='scripts/b143-gallery-core.mjs';Sha='a72026f80bc23a2262540e7285cd77d9f8d307cf'},
 @{Path='source/ai/b143-building-dsl.mjs';Sha='207ee3439f913bea3ce1768350e1dfa086dbe435'},
 @{Path='source/ai/b198s-native-ollama-source.mjs';Sha='f882de658143041a9a1d48382741d51cc34151c5'},
 @{Path='source/ai/b198zr46-corrected-architecture-guide.mjs';Sha='1041c2b6c52abf099cf3a6fb463ee5ab34bcc4fc'},
 @{Path='source/ai/b198zr45-original-grammar-and-program-audit.mjs';Sha='fe7348229b3ef769da3d4f2cf3bbec34b3d27b5c'},
 @{Path='source/ai/b198zr4-planned-source.mjs';Sha='cc6f0967476c96bcde92aadfb239f2397034013b'},
 @{Path='source/ai/b198zr3-functional-review-contract.mjs';Sha='c5427586397420183c3edeff183695a9cb381767'},
 @{Path='source/ai/b198b-benchmark-cases.mjs';Sha='21b7dcadc9dd88d14d42138d75e8262114dc88a6'},
 @{Path='source/ai/b143-viewer-template.html';Sha='f716c45095313b0267e6509dbae34e16bb70b578'}
)
function BlobHash([byte[]]$data){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$data.Length+[char]0)
 $v=New-Object byte[] ($prefix.Length+$data.Length)
 [Array]::Copy($prefix,0,$v,0,$prefix.Length)
 [Array]::Copy($data,0,$v,$prefix.Length,$data.Length)
 $sha=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($sha.ComputeHash($v))).Replace('-','').ToLowerInvariant()}
 finally{$sha.Dispose()}
}
function VerifySource([string]$source){
 if(-not(Test-Path -LiteralPath $source -PathType Container)){throw 'R46_SOURCE_FOLDER_MISSING'}
 $files=@(Get-ChildItem -LiteralPath $source -Recurse -File)
 if($files.Count -ne $ExpectedFileCount){
  throw ('R46_EXACT_FILE_COUNT_HOLD_EXPECTED_'+$ExpectedFileCount+'_FOUND_'+$files.Count)
 }
 foreach($item in $Pinned){
  $file=Join-Path $source ($item.Path.Replace('/','\'))
  if(-not(Test-Path -LiteralPath $file -PathType Leaf)){throw 'R46_PINNED_FILE_MISSING'}
  if((BlobHash ([IO.File]::ReadAllBytes($file))) -cne $item.Sha){
   throw ('R46_PINNED_BLOB_SHA_MISMATCH_'+$item.Path)
  }
 }
 Write-Host ('[R46] '+$ExpectedFileCount+' source files present; '+$Pinned.Count+' critical hashes verified.')
}
function InstallPinned([string]$target){
 $root=Split-Path -Parent $target
 $temp=Join-Path $root ('R46_STAGE_'+[guid]::NewGuid().ToString('N'))
 $archive=Join-Path $root ('R46_DOWNLOAD_'+[guid]::NewGuid().ToString('N')+'.zip')
 [void](New-Item -ItemType Directory -Path $temp -ErrorAction Stop)
 try{
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  $url='https://codeload.github.com/ryomashibaba/MinecraftAIBuilder/zip/'+$Revision
  $web=New-Object Net.WebClient
  try{$web.DownloadFile($url,$archive)}finally{$web.Dispose()}
  if(-not(Test-Path -LiteralPath $archive -PathType Leaf)){
   throw 'R46_GITHUB_SOURCE_ARCHIVE_UNAVAILABLE'
  }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip=[IO.Compression.ZipFile]::OpenRead($archive)
  $extracted=0
  try{
   $prefix='MinecraftAIBuilder-'+$Revision.Substring(0,7)+'/'
   foreach($entry in $zip.Entries){
    $p=$entry.FullName
    if(-not $p.StartsWith($prefix,[StringComparison]::Ordinal)){
     # Some archive distributions use a 40-character root suffix.
     $slash=$p.IndexOf('/')
     if($slash -lt 0){continue}
     $p=$p.Substring($slash+1)
    }else{$p=$p.Substring($prefix.Length)}
    if(-not @('scripts/','source/ai/','evidence/b198zr2/','evidence/b198zr3/')|
      Where-Object {$p.StartsWith($_,[StringComparison]::Ordinal)}){continue}
    if($p.EndsWith('/')){continue}
    if($p.StartsWith('/') -or $p.Contains('\') -or
      @($p.Split('/')|Where-Object {$_ -eq '..' -or $_ -eq '.'}).Count -gt 0){
      throw 'R46_UNSAFE_ARCHIVE_ENTRY'
    }
    $dest=Join-Path $temp ($p.Replace('/','\'))
    [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest))
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$dest,$false)
    $extracted++
   }
  }finally{$zip.Dispose()}
  if($extracted -ne $ExpectedFileCount){
   throw ('R46_ARCHIVE_ENTRY_COUNT_HOLD_'+$extracted)
  }
  VerifySource $temp
  Move-Item -LiteralPath $temp -Destination $target -ErrorAction Stop
 }finally{
  if(Test-Path -LiteralPath $archive){Remove-Item -LiteralPath $archive -Force}
  if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Recurse -Force}
 }
}
try{
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_REQUIRED'}
 $node=Get-Command node -ErrorAction SilentlyContinue
 if(-not $node){throw 'NODE24_REQUIRED'}
 $version=(& node --version).Trim()
 if($version -notmatch '^v(2[4-9]|[3-9][0-9])\.'){throw 'NODE24_OR_NEWER_REQUIRED'}
 $root=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder'
 [void](New-Item -Path $root -ItemType Directory -Force)
 $target=Join-Path $root ('R46_Source_'+$Revision.Substring(0,12))
 if(-not(Test-Path -LiteralPath $target -PathType Container)){
  if($CheckOnly){throw 'R46_NOT_INSTALLED'}
  InstallPinned $target
 }
 VerifySource $target
 if($CheckOnly){
  Write-Host '[R46] SOURCE SHA CHECK ONLY. Real Qwen 0. Minecraft 0.'
  exit 0
 }
 & node --test (Join-Path $target 'scripts\b198zr46-consented-single-qwen.test.mjs')
 if($LASTEXITCODE -ne 0){throw 'R46_FAKE_ONLY_QA_FAILED'}
 Write-Host '[R46] OFFLINE PREP PASS. No real Qwen invoked.'
 exit 0
}catch{
 Write-Host ('[R46 INSTALL HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host '[R46] Installer never sends a real Qwen POST or contacts Minecraft.'
 exit 1
}

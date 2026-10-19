# R12 MINI one-click installer / PowerShell 5.1 compatible.
# READ-ONLY NETWORK: pinned source download; ZERO Ollama or Minecraft calls.
# Never executes remotely supplied PowerShell. Every byte is Git blob checked.
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$Revision = '0e40f08e4bfd95867a18a099903a6e2c52be2d31'
$files = @(
 @{ Path = 'scripts/b198zr6-authorized-single-r4-capture.mjs'; Sha = '1096ad5d9d4c77e52aa22d934a6531aab3920bfe' }
 @{ Path = 'scripts/b198zr7-offline-visual-review.mjs'; Sha = '7a75d5dba81ecdb5237f074dcd9a940d81c96745' }
 @{ Path = 'scripts/b143-gallery-core.mjs'; Sha = 'a72026f80bc23a2262540e7285cd77d9f8d307cf' }
 @{ Path = 'scripts/b198w-quality-review.mjs'; Sha = '508ab909653ed251c5fa886f8f7ddacfd117f80d' }
 @{ Path = 'source/ai/b198b-benchmark-cases.mjs'; Sha = '21b7dcadc9dd88d14d42138d75e8262114dc88a6' }
 @{ Path = 'source/ai/b143-building-dsl.mjs'; Sha = '207ee3439f913bea3ce1768350e1dfa086dbe435' }
 @{ Path = 'source/ai/b198s-native-ollama-source.mjs'; Sha = '41672e4d69354fd991923d3e67c0d54138280650' }
 @{ Path = 'source/ai/b198g-local-model-adapter.mjs'; Sha = '108266df5a2fa2da0bc105a99e1888de621e9cd0' }
 @{ Path = 'source/ai/b198zr4-planned-source.mjs'; Sha = 'cc6f0967476c96bcde92aadfb239f2397034013b' }
 @{ Path = 'source/ai/b198zr3-functional-review-contract.mjs'; Sha = 'c5427586397420183c3edeff183695a9cb381767' }
 @{ Path = 'source/ai/b198zr8-read-only-model-preflight.mjs'; Sha = '78117b6babae5576ab356fdd0002b26956809dba' }
 @{ Path = 'source/ai/b198-natural-language-design.mjs'; Sha = 'c154d2711016a0097be7fc8eced1d78f7506242d' }
 @{ Path = 'source/ai/b198u-bounds-only-repair.mjs'; Sha = 'ef970141973649e6854d49e85db045c33874244b' }
 @{ Path = 'source/ai/b198zr2-generic-quality-guide.mjs'; Sha = '82d19050afc9a04a844abc27bfc9206a45ddf214' }
 @{ Path = 'source/ai/b198t-metadata-only-repair.mjs'; Sha = '10ef9c25d854175d54f4e29afeb63a0ecdde5ce1' }
 @{ Path = 'source/ai/b198b-architecture-quality.mjs'; Sha = 'b41caf2b54462b2d92b62a776247b2eb8e88d75d' }
 @{ Path = 'source/ai/b198c-spatial-critic.mjs'; Sha = '840a03c01ee21a5d2917f90ad81906534e3c0c08' }
 @{ Path = 'source/ai/b143-viewer-template.html'; Sha = 'f716c45095313b0267e6509dbae34e16bb70b578' }
 @{ Path = 'source/ai/b198w-review-board-template.html'; Sha = 'bd45aa98c031a36f16fba70084aa179fbdd8746b' }
 @{ Path = 'source/ai/b198zr11-compact-r4-output.mjs'; Sha = '6a44291fa20d7a6f396f4c4f639d0f278d7fe4aa' }
 @{ Path = 'scripts/b198zr12-local-offline-qa.mjs'; Sha = 'f2670914a6561ee6d31cef30fa1d813f5845e3ca' }
 @{ Path = 'tools/r12-mini/VERIFY_R12_OFFLINE_ONLY.cmd'; Sha = '7eb6f0942348fc303e0f019b0ff3a65f6555f31c' }
)
function GitBlobSha([byte[]]$b) {
 $prefix = [Text.Encoding]::ASCII.GetBytes('blob '+$b.Length+[char]0)
 $data = New-Object byte[] ($prefix.Length+$b.Length)
 [Array]::Copy($prefix,0,$data,0,$prefix.Length)
 [Array]::Copy($b,0,$data,$prefix.Length,$b.Length)
 $sha = [Security.Cryptography.SHA1]::Create()
 try { return [BitConverter]::ToString($sha.ComputeHash($data)).Replace('-','').ToLowerInvariant() }
 finally { $sha.Dispose() }
}
function VerifyAll([string]$folder) {
 foreach($f in $files) {
  $path = Join-Path $folder ($f.Path.Replace('/','\'))
  if(-not (Test-Path -LiteralPath $path -PathType Leaf)) {
   throw ('Missing pinned file: '+$f.Path)
  }
  if((GitBlobSha ([IO.File]::ReadAllBytes($path))) -ne $f.Sha) {
   throw ('Integrity mismatch: '+$f.Path)
  }
 }
 $actual=@(Get-ChildItem -LiteralPath $folder -Recurse -File)
 if($actual.Count -ne $files.Count) {throw 'Unexpected extra files in pinned source package'}
}
function RunOfflineQa([string]$folder) {
 $qa=Join-Path $folder 'scripts\b198zr12-local-offline-qa.mjs'
 $output=& node $qa 2>&1 | Out-String
 if($LASTEXITCODE -ne 0 -or -not $output.Contains('R12_OFFLINE_ONLY_PASS')) {
  throw ('Synthetic QA HOLD: '+$output.Substring(0,[Math]::Min(1000,$output.Length)))
 }
 Write-Host '[R12 MINI] Source-only geometry+route+prompt QA: PASS'
 Write-Host '[R12 MINI] Ollama/Qwen requests=0, Minecraft writes=0.'
}
if($CheckOnly) {
 Write-Host ('R12_MINI_MANIFEST_PASS: '+$files.Count+' pinned files; no network or model operations')
 exit 0
}
try {
 if(-not $env:LOCALAPPDATA) {throw 'Windows LOCALAPPDATA not found'}
 if(-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js missing. No files downloaded, no model started.'
 }
 $root=Join-Path $env:LOCALAPPDATA ('MinecraftAIBuilder\R12_Mini_'+$Revision.Substring(0,12))
 if(Test-Path -LiteralPath $root) {
  VerifyAll $root
  Write-Host '[R12 MINI] Existing installation integrity verified.'
 }else{
  [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $root))
  $temp=$root+'.part-'+[Guid]::NewGuid().ToString('N')
  [void](New-Item -ItemType Directory -Path $temp)
  try {
   [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
   $client=New-Object Net.WebClient
   try{
    foreach($f in $files) {
     $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+$Revision+'/'+$f.Path
     $destination=Join-Path $temp ($f.Path.Replace('/','\'))
     [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination))
     $b=$client.DownloadData($url)
     if($b.Length -lt 1 -or $b.Length -gt 250000) {throw ('Unexpected file size: '+$f.Path)}
     if((GitBlobSha $b) -ne $f.Sha) {throw ('Downloaded SHA mismatch: '+$f.Path)}
     [IO.File]::WriteAllBytes($destination,$b)
    }
   }finally{$client.Dispose()}
   VerifyAll $temp
   Move-Item -LiteralPath $temp -Destination $root -ErrorAction Stop
  }catch{
   if(Test-Path -LiteralPath $temp){
    Remove-Item -LiteralPath $temp -Force -Recurse -ErrorAction SilentlyContinue
   }
   throw
  }
  Write-Host ('[R12 MINI] Downloaded and SHA-verified '+$files.Count+' small source files.')
 }
 RunOfflineQa $root
 Write-Host ('[R12 MINI] READY (OFFLINE QA ONLY): '+$root)
 Write-Host '[R12 MINI] No model-run launch file is distributed.'
 if($env:CI -ne 'true'){
  Start-Process explorer.exe -ArgumentList ('"'+$root+'"')
 }
 exit 0
}catch{
 Write-Host ('[R12 MINI HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'No real Qwen request and no Minecraft world action were started.'
 exit 1
}

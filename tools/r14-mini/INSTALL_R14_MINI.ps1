# R14 Mini: only pinned GitHub read-only Node architectural auditor sources.
# NEVER installs Ollama or runs an actual model. All files SHA-checked.
param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$Revision='b320b25353741676df9c2e4ac19f60f29871f519'
$files=@(
 @{ Path='source/ai/b198zr13-quality-decision.mjs'; Sha='38720deacb45bc4f634d3ed8d55350b889d1c2f9' }
 @{ Path='scripts/b198zr13-review-saved-capture.mjs'; Sha='628bd72bcc53de1384f539fe8074571fabaa643e' }
 @{ Path='source/ai/b198b-benchmark-cases.mjs'; Sha='21b7dcadc9dd88d14d42138d75e8262114dc88a6' }
 @{ Path='source/ai/b143-building-dsl.mjs'; Sha='207ee3439f913bea3ce1768350e1dfa086dbe435' }
 @{ Path='source/ai/b198zr4-planned-source.mjs'; Sha='cc6f0967476c96bcde92aadfb239f2397034013b' }
 @{ Path='source/ai/b198-natural-language-design.mjs'; Sha='c154d2711016a0097be7fc8eced1d78f7506242d' }
 @{ Path='source/ai/b198zr3-functional-review-contract.mjs'; Sha='c5427586397420183c3edeff183695a9cb381767' }
 @{ Path='scripts/b198w-quality-review.mjs'; Sha='508ab909653ed251c5fa886f8f7ddacfd117f80d' }
 @{ Path='source/ai/b198b-architecture-quality.mjs'; Sha='b41caf2b54462b2d92b62a776247b2eb8e88d75d' }
 @{ Path='source/ai/b198c-spatial-critic.mjs'; Sha='840a03c01ee21a5d2917f90ad81906534e3c0c08' }
 @{ Path='source/ai/b198w-review-board-template.html'; Sha='bd45aa98c031a36f16fba70084aa179fbdd8746b' }
)
function GitSha([byte[]]$b){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$b.Length+[char]0)
 $merged=New-Object byte[] ($prefix.Length+$b.Length)
 [Array]::Copy($prefix,0,$merged,0,$prefix.Length)
 [Array]::Copy($b,0,$merged,$prefix.Length,$b.Length)
 $hasher=[Security.Cryptography.SHA1]::Create()
 try{ return ([BitConverter]::ToString($hasher.ComputeHash($merged))).Replace('-','').ToLowerInvariant() }
 finally{ $hasher.Dispose() }
}
function Verify([string]$folder){
 foreach($item in $files){
  $p=Join-Path $folder ($item.Path.Replace('/','\'))
  if(-not (Test-Path -LiteralPath $p -PathType Leaf)){throw ('MISSING_SOURCE_'+$item.Path)}
  $actual=GitSha ([IO.File]::ReadAllBytes($p))
  if($actual -ne $item.Sha){throw ('SOURCE_SHA_MISMATCH_'+$item.Path)}
 }
 $found=@(Get-ChildItem -LiteralPath $folder -File -Recurse)
 if($found.Count -ne $files.Count){throw 'SOURCE_PACKAGE_HAS_UNEXPECTED_FILES'}
}
if($CheckOnly){
 Write-Host ('R14_MINI_MANIFEST_PASS: '+$files.Count+' SHA-pinned source files; NO model or Minecraft')
 exit 0
}
try{
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_UNAVAILABLE'}
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'NODEJS_REQUIRED'}
 $destination=Join-Path $env:LOCALAPPDATA ('MinecraftAIBuilder\R14_Mini_'+$Revision.Substring(0,12))
 if(Test-Path -LiteralPath $destination){
  Verify $destination
  Write-Host '[R14] Existing offline-audit code hashes verified.'
  exit 0
 }
 [void](New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force)
 $temp=$destination+'.part-'+[Guid]::NewGuid().ToString('N')
 [void](New-Item -ItemType Directory -Path $temp)
 try{
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  $client=New-Object System.Net.WebClient
  try{
   foreach($item in $files){
    $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+$Revision+'/'+$item.Path
    $b=$client.DownloadData($url)
    if($b.Length -lt 1 -or $b.Length -gt 250000){throw ('SOURCE_SIZE_INVALID_'+$item.Path)}
    if((GitSha $b) -ne $item.Sha){throw ('DOWNLOADED_SHA_MISMATCH_'+$item.Path)}
    $dest=Join-Path $temp ($item.Path.Replace('/','\'))
    [void](New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force)
    [IO.File]::WriteAllBytes($dest,$b)
   }
  }finally{$client.Dispose()}
  Verify $temp
  Move-Item -LiteralPath $temp -Destination $destination -ErrorAction Stop
 }catch{
  if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue}
  throw
 }
 Write-Host ('[R14] Installed '+$files.Count+' small pinned offline-auditor source files.')
 Write-Host '[R14] No model launch script, Ollama, Minecraft connection or world write.'
 exit 0
}catch{
 Write-Host ('[R14 INSTALL HOLD] '+$_.Exception.Message) -ForegroundColor Red
 exit 1
}

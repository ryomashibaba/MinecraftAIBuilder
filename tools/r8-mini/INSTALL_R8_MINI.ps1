# R8 MINI - Installer only. NEVER contacts Ollama or starts inference.
# All source files are locked to an immutable GitHub commit and checked
# against the Git blob SHA-1. No repo checkout or archive extraction.
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$Revision = '4fe41899ce52aee69225c994e68ca42372647c5c'
$files = @(
  @{ Path = 'scripts/RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd'; Sha = '482fe62db02b3299c19454358c515f80f1bfb666' }
  @{ Path = 'scripts/b198zr6-authorized-single-r4-capture.mjs'; Sha = 'ec3e9b78f00254bc6a5ddb4cb5664a05b6a8422f' }
  @{ Path = 'scripts/b198zr7-offline-visual-review.mjs'; Sha = '7a75d5dba81ecdb5237f074dcd9a940d81c96745' }
  @{ Path = 'scripts/b143-gallery-core.mjs'; Sha = 'a72026f80bc23a2262540e7285cd77d9f8d307cf' }
  @{ Path = 'scripts/b198w-quality-review.mjs'; Sha = '508ab909653ed251c5fa886f8f7ddacfd117f80d' }
  @{ Path = 'source/ai/b198b-benchmark-cases.mjs'; Sha = '21b7dcadc9dd88d14d42138d75e8262114dc88a6' }
  @{ Path = 'source/ai/b143-building-dsl.mjs'; Sha = '0595fa0db9cb1efaf5698ddc959523c4e2f50d68' }
  @{ Path = 'source/ai/b198s-native-ollama-source.mjs'; Sha = '86bfd9d1f7e4260427ef094962132e303cadb774' }
  @{ Path = 'source/ai/b198g-local-model-adapter.mjs'; Sha = 'ed60811797c176fe4c706b982b675980c4409a65' }
  @{ Path = 'source/ai/b198zr4-planned-source.mjs'; Sha = '23076fcd050f9f7af681449715f16f69eda8bd22' }
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
)
function Get-GitBlobSha([byte[]]$bytes) {
  $prefix = [System.Text.Encoding]::ASCII.GetBytes('blob ' + $bytes.Length + [char]0)
  $buffer = New-Object byte[] ($prefix.Length + $bytes.Length)
  [Array]::Copy($prefix,0,$buffer,0,$prefix.Length)
  [Array]::Copy($bytes,0,$buffer,$prefix.Length,$bytes.Length)
  $sha = [System.Security.Cryptography.SHA1]::Create()
  try { return [BitConverter]::ToString($sha.ComputeHash($buffer)).Replace('-','').ToLowerInvariant() }
  finally { $sha.Dispose() }
}
function Assert-Files([string]$root) {
  foreach ($f in $files) {
    $local = Join-Path $root ($f.Path.Replace('/','\'))
    if (-not (Test-Path -LiteralPath $local -PathType Leaf)) { throw ('Missing file: ' + $f.Path) }
    $actual = Get-GitBlobSha ([System.IO.File]::ReadAllBytes($local))
    if ($actual -ne $f.Sha) { throw ('Integrity mismatch: ' + $f.Path) }
  }
}
if ($CheckOnly) {
  Write-Host ('R8 MINI MANIFEST OK: ' + $files.Count + ' pinned files, no inference, no download')
  exit 0
}
if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA unavailable' }
$root = Join-Path $env:LOCALAPPDATA ('MinecraftAIBuilder\R8_Mini_' + $Revision.Substring(0,12))
if (Test-Path -LiteralPath $root) {
  Assert-Files $root
  Write-Host '[R8 MINI] Already installed, file integrity VERIFIED.'
  Write-Host ('Folder: ' + $root)
  Start-Process explorer.exe -ArgumentList ('"' + $root + '"')
  exit 0
}
$parent = Split-Path -Parent $root
[void](New-Item -ItemType Directory -Force -Path $parent)
$temp = $root + '.part-' + [guid]::NewGuid().ToString('N')
[void](New-Item -ItemType Directory -Path $temp)
try {
  # No remote script execution: only download predeclared pinned source files.
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $client = New-Object System.Net.WebClient
  try {
    foreach ($f in $files) {
      $uri = 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/' + $Revision + '/' + $f.Path
      $destination = Join-Path $temp ($f.Path.Replace('/','\'))
      [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination))
      $bytes = $client.DownloadData($uri)
      if ($bytes.Length -lt 1 -or $bytes.Length -gt 250000) { throw ('Invalid size for ' + $f.Path) }
      $actual = Get-GitBlobSha $bytes
      if ($actual -ne $f.Sha) { throw ('Integrity mismatch: ' + $f.Path) }
      [System.IO.File]::WriteAllBytes($destination,$bytes)
    }
  } finally { $client.Dispose() }
  Assert-Files $temp
  Move-Item -LiteralPath $temp -Destination $root -ErrorAction Stop
  Write-Host ('[R8 MINI] VERIFIED: ' + $files.Count + ' source files. No Qwen inference.')
  Write-Host 'This SETUP only downloads local review code. It does NOT run Qwen.'
  Write-Host ('Open folder: ' + $root)
  Write-Host 'The model-run CMD inside scripts requires SEPARATE fresh permission.'
  Start-Process explorer.exe -ArgumentList ('"' + $root + '"')
} catch {
  if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue }
  Write-Host ('[R8 MINI] HOLD: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host 'No model was loaded and no Minecraft world was touched.'
  exit 1
}

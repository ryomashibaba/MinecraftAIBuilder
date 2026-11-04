# One operation: prepare exactly one pinned real project research clone.
# No local model call, Docker installation, source mutation or GitHub push.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('minecraftaibuilder', 'browser-ink-tps')]
  [string] $Project
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$rev = '98d33ce641ac29b2850df6ccfacb711c0b6d0478'
$ownerRepo = 'ryomashibaba/MinecraftAIBuilder'
$manifest = 'REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json'
$scriptName = 'prepare_pinned_real_project.py'
$files = @(
  @{ Name = $manifest; SHA = '0e601f25dd14d4475bcdb31efda1d5041a34b005' },
  @{ Name = $scriptName; SHA = 'ce4d56452ec0a1d513dfa419a80780eed1283894' }
)
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  throw 'PYTHON_NOT_FOUND_NO_AUTO_INSTALL'
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'GIT_NOT_FOUND_NO_AUTO_INSTALL'
}
if (-not $env:LOCALAPPDATA) {
  throw 'WINDOWS_LOCALAPPDATA_REQUIRED'
}
$dir = Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\PinnedStarterDownloads\' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $dir -Force | Out-Null
foreach ($item in $files) {
  $name = $item.Name
  $outFile = Join-Path $dir $name
  $url = 'https://raw.githubusercontent.com/' + $ownerRepo + '/' + $rev + '/tools/free-autonomy-solo/' + $name
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $outFile
  $actual = ((& git hash-object $outFile) | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $actual -ne $item.SHA) {
    throw ('PINNED_SOURCE_INTEGRITY_HOLD_' + $name)
  }
}
Write-Host ('SOURCE_PINS_VERIFIED; ONE_SELECTED_PROJECT=' + $Project)
& python (Join-Path $dir $scriptName) --project $Project
if ($LASTEXITCODE -ne 0) {
  throw 'PRIVATE_RESEARCH_CLONE_PREPARE_HOLD'
}
Write-Host 'PINNED_PRIVATE_SOURCE_PREPARED__NO_MODEL_RUN__NO_PROJECT_ORIGIN_CHANGED'

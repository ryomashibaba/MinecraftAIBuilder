<#
.SYNOPSIS
  MAB V11: one command for a bounded, sequential three-building real local
  ArchitecturePlan trial. Requires already running local Ollama/LM Studio.
.DESCRIPTION
  Does not create/start/stop model servers, change OS settings, fetch code,
  touch Minecraft worlds, or upload PRIVATE results. Work can run this in the
  user's existing research checkout. Outputs are local PrivateModelStudies.
  -CheckOnly: GitHub CI / local dry run, no model HTTP, no new files.
#>
[CmdletBinding()]
param(
 [string]$Model = 'qwen3:14b',
 [string]$Endpoint = 'http://127.0.0.1:11434/v1/chat/completions',
 [switch]$CheckOnly,
 [switch]$NoOpen
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$studyBranch = 'research/r125-v6-readonly-facade-diagnostic-20261111'
$runner = Join-Path $repo 'scripts\r125-local-architecture-plan-batch.mjs'
$pilot = Join-Path $repo 'scripts\r125-v11-pilot-three.json'
$viewer = 'BATCH_COMPARE_3D.html'
if ($Model -notmatch '^[A-Za-z0-9._:/-]{2,140}$') {
 throw 'V11_PILOT_INVALID_MODEL_ID'
}
$uri = [regex]::Match($Endpoint,
 '^http://127\.0\.0\.1:([0-9]{1,5})/v1/chat/completions$')
if (-not $uri.Success -or [int]$uri.Groups[1].Value -lt 1 -or
    [int]$uri.Groups[1].Value -gt 65535) {
 throw 'V11_PILOT_LOOPBACK_ENDPOINT_REQUIRED'
}
foreach ($target in @($runner, $pilot,
  (Join-Path $repo 'scripts\r125-batch-compare.mjs'))) {
 if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
  throw ('V11_PILOT_MISSING_SOURCE: ' + $target)
 }
}
$node = (Get-Command 'node' -ErrorAction Stop).Source
$versionText = (& $node '--version')
$match = [regex]::Match([string]$versionText, '^v([0-9]+)\.')
if ($LASTEXITCODE -ne 0 -or -not $match.Success -or
    [int]$match.Groups[1].Value -lt 20) {
 throw 'V11_PILOT_NODE_20_REQUIRED'
}
if ($CheckOnly) {
 & $node '--check' $runner
 if ($LASTEXITCODE -ne 0) { throw 'V11_PILOT_BATCH_SYNTAX_FAILED' }
 Write-Output 'V11_PILOT_CHECK_ONLY_PASS: no server, HTTP, model, world or output.'
 return
}
if ($env:OS -cne 'Windows_NT') { throw 'V11_PILOT_WINDOWS_REQUIRED' }
$git = (Get-Command 'git' -ErrorAction Stop).Source
$currentBranch = (& $git '-C' $repo 'branch' '--show-current')
if ($LASTEXITCODE -ne 0 -or
    $currentBranch.Trim() -cne $studyBranch) {
 throw 'V11_PILOT_RESEARCH_BRANCH_REQUIRED'
}
$commit = (& $git '-C' $repo 'rev-parse' 'HEAD')
if ($LASTEXITCODE -ne 0 -or
    $commit.Trim() -cnotmatch '^[0-9a-f]{40}$') {
 throw 'V11_PILOT_UNVERIFIED_HEAD'
}
# A clean source checkout avoids running an unreviewed local edit. No git
# checkout, stash, reset, fetch or mutation is performed here.
$dirty = @(& $git '-C' $repo 'status' '--porcelain' '--untracked-files=no')
if ($LASTEXITCODE -ne 0 -or
    @($dirty | Where-Object { $_ -and $_.Trim() }).Count -gt 0) {
 throw 'V11_PILOT_DIRTY_TRACKED_SOURCE'
}
if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA) -or
    -not (Test-Path -LiteralPath $env:LOCALAPPDATA -PathType Container)) {
 throw 'V11_PILOT_LOCALAPPDATA_REQUIRED'
}
if ($Endpoint -ceq 'http://127.0.0.1:11434/v1/chat/completions') {
 # Probe only the already-running Ollama service. No daemon launch, model
 # preload, extra generation, change to another app or paid request.
 try {
  $tags = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' `
   -TimeoutSec 8 -Method Get
 } catch { throw 'V11_PILOT_EXISTING_OLLAMA_NOT_REACHABLE' }
 $listed = @($tags.models | Where-Object {
   $_.name -ceq $Model -or $_.model -ceq $Model })
 if ($listed.Count -eq 0) { throw 'V11_PILOT_MODEL_NOT_INSTALLED' }
}
$root = Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\PrivateModelStudies'
[void](New-Item -Path $root -ItemType Directory -Force)
$out = Join-Path $root ('V11_3Genre_' +
 (Get-Date -Format 'yyyyMMdd_HHmmss_fff') + '_' +
 [Guid]::NewGuid().ToString('N').Substring(0,8))
if (Test-Path -LiteralPath $out) { throw 'V11_PILOT_OUTPUT_COLLISION' }
Write-Output ('V11_PILOT_RUN_HEAD=' + $commit.Trim())
Write-Output ('V11_PRIVATE_RESULT=' + $out)
Write-Output 'Single model; up to three sequential originals; continue after a design rejection, not a provider failure.'
& $node $runner '--model' $Model '--pilot-three' '--out' $out `
 '--endpoint' $Endpoint
$nodeExit = $LASTEXITCODE
$reportFile = Join-Path $out 'BATCH_REPORT.json'
if (-not (Test-Path -LiteralPath $reportFile -PathType Leaf)) {
 throw 'V11_PILOT_NO_REPORT_PRESERVE_LOCAL_FILES'
}
$report = Get-Content -LiteralPath $reportFile -Raw | ConvertFrom-Json
if ($report.schema -cne 'r125-local-plan-batch-v1' -or
    [int]$report.worldWrites -ne 0 -or
    [int]$report.attempted -gt 3 -or
    [int]$report.attempted -lt 1) {
 throw 'V11_PILOT_UNEXPECTED_REPORT'
}
Write-Output ('V11_PILOT_ATTEMPTED=' + $report.attempted)
Write-Output ('V11_PILOT_ALL_SOURCE=' + $report.allSourceVerified)
Write-Output ('V11_PILOT_SOURCE_PASSES=' + $report.sourcePassCount)
Write-Output ('V11_PILOT_EXPERIMENT=' + $report.experimentOutcome)
Write-Output ('V11_PILOT_STOP_REASON=' + [string]$report.stopReason)
Write-Output ('V11_PILOT_B143_REVIEW=' + (Join-Path $out $viewer))
Write-Output 'ART_NOT_REVIEWED. MINECRAFT_NOT_TESTED. PRIVATE_SOURCE_NOT_UPLOADED.'
if (-not $NoOpen) {
 $page = Join-Path $out $viewer
 if (Test-Path -LiteralPath $page -PathType Leaf) {
  try { Start-Process -FilePath $page }
  catch { Write-Warning 'V11_REVIEW_PAGE_OPEN_FAILED_USE_PRINTED_PATH' }
 }
}
if ($nodeExit -ne 0 -or $report.allSourceVerified -ne $true -or
    $report.geometryHashesDistinct -eq $false -or
    $report.modelAuthoredFormFamiliesDistinct -eq $false) { exit 2 }

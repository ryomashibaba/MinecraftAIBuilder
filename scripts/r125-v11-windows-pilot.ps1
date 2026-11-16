<#
.SYNOPSIS
  MAB V11: one command for a bounded local ArchitecturePlan trial.
  Requires an already running local Ollama/LM Studio.
.DESCRIPTION
  Does not create/start/stop model servers, change OS settings, fetch code,
  touch Minecraft worlds, or upload PRIVATE results. Work can run this in the
  user's existing research checkout. Outputs are local PrivateModelStudies.
  -SingleNewBrief: one new functional brief, with no prescribed architecture.
  -CheckOnly: GitHub CI / local dry run, no model HTTP, no new files.
#>
[CmdletBinding()]
param(
 [string]$Model = 'qwen3:14b',
 [string]$Endpoint = 'http://127.0.0.1:11434/v1/chat/completions',
 [switch]$CheckOnly,
 [switch]$OnlyHousingRetail,
 [switch]$SingleNewBrief,
 [switch]$NoOpen
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$studyBranch = 'research/r125-v6-readonly-facade-diagnostic-20261111'
$runner = Join-Path $repo 'scripts\r125-local-architecture-plan-batch.mjs'
$pilot = Join-Path $repo 'scripts\r125-v11-pilot-three.json'
$single = Join-Path $repo 'scripts\r125-v11-single-unknown.json'
if ($SingleNewBrief -and $OnlyHousingRetail) {
 throw 'V11_PILOT_CONFLICTING_TRIAL_MODES'
}
$expectedCount = if ($SingleNewBrief) { 1 } elseif ($OnlyHousingRetail) { 2 } else { 3 }
$viewer = 'BATCH_COMPARE_3D.html'
# Re-evaluate only the two genuine SOURCE failures; reuse the exact existing
# authored briefs, never reinterpret or regenerate the successful research brief.
$selectedBriefs = @()
if ($OnlyHousingRetail) {
 $jsonText = Get-Content -LiteralPath $pilot -Raw -Encoding UTF8
 $parsed = ConvertFrom-Json -InputObject $jsonText
 # Windows PowerShell 5.1 may emit a JSON array as one pipeline object.
 # foreach explicitly flattens a JSON array without relying on pipelines.
 $all = @(foreach ($entry in $parsed) { $entry })
 $ids = @($all | ForEach-Object { $_.id })
 if ($all.Count -ne 3 -or
     ($ids -join ',') -cne 'housing,retail,research') {
  throw ('V11_RECHECK_PILOT_BRIEF_DRIFT count=' + $all.Count +
   ' ids=' + ($ids -join ','))
 }
 $selectedBriefs = @($all[0],$all[1])
 if ($selectedBriefs.Count -ne 2 -or
     $selectedBriefs[0].id -cne 'housing' -or
     $selectedBriefs[1].id -cne 'retail') {
  throw 'V11_RECHECK_NEEDS_TWO_BRIEFS'
 }
}

if ($SingleNewBrief) {
 # Read UTF-8 explicitly on Windows PowerShell 5.1; no hardcoded roof/shape.
 $jsonText = Get-Content -LiteralPath $single -Raw -Encoding UTF8
 $parsed = ConvertFrom-Json -InputObject $jsonText
 $all = @(foreach ($entry in $parsed) { $entry })
 if ($all.Count -ne 1 -or $all[0].id -cne 'tide-observatory' -or
     -not ($all[0].prompt -is [string]) -or $all[0].prompt.Length -lt 80) {
  throw 'V11_PILOT_SINGLE_BRIEF_DRIFT'
 }
}

if ($Model -notmatch '^[A-Za-z0-9._:/-]{2,140}$') {
 throw 'V11_PILOT_INVALID_MODEL_ID'
}
$uri = [regex]::Match($Endpoint,
 '^http://127\.0\.0\.1:([0-9]{1,5})/v1/chat/completions$')
if (-not $uri.Success -or [int]$uri.Groups[1].Value -lt 1 -or
    [int]$uri.Groups[1].Value -gt 65535) {
 throw 'V11_PILOT_LOOPBACK_ENDPOINT_REQUIRED'
}
foreach ($target in @($runner, $pilot, $single,
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
 Write-Output ('V11_PILOT_CHECK_ONLY_PASS: '+$(if($SingleNewBrief){'one unseen functional brief'}elseif($OnlyHousingRetail){'two original failure briefs'}else{'three original briefs'})+'; no server, HTTP, model, world or output.')
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
$studyName = if ($SingleNewBrief) { 'V11_UnseenSingle_' } else { 'V11_3Genre_' }
$out = Join-Path $root ($studyName +
 (Get-Date -Format 'yyyyMMdd_HHmmss_fff') + '_' +
 [Guid]::NewGuid().ToString('N').Substring(0,8))
if (Test-Path -LiteralPath $out) { throw 'V11_PILOT_OUTPUT_COLLISION' }
Write-Output ('V11_PILOT_RUN_HEAD=' + $commit.Trim())
Write-Output ('V11_PRIVATE_RESULT=' + $out)
Write-Output ('One existing local model, '+$expectedCount+' bounded original POST(s), no automatic retries.')
$batchArgs = @($runner, '--model', $Model)
if ($SingleNewBrief) {
 $batchArgs += @('--briefs', $single)
} elseif ($OnlyHousingRetail) {
 $briefFile = Join-Path $root ('V11_2Failure_Briefs_'+[Guid]::NewGuid().ToString('N')+'.json')
 $json = ConvertTo-Json -InputObject $selectedBriefs -Depth 6
 [System.IO.File]::WriteAllText($briefFile, $json,
  [System.Text.UTF8Encoding]::new($false))
 $batchArgs += @('--briefs', $briefFile)
} else {
 $batchArgs += '--pilot-three'
}
$batchArgs += @('--out', $out, '--endpoint', $Endpoint)
try {
 & $node @batchArgs
 $nodeExit = $LASTEXITCODE
} finally {
 if ($OnlyHousingRetail -and (Test-Path -LiteralPath $briefFile -PathType Leaf)) {
  Remove-Item -LiteralPath $briefFile -Force
 }
}
$reportFile = Join-Path $out 'BATCH_REPORT.json'
if (-not (Test-Path -LiteralPath $reportFile -PathType Leaf)) {
 throw 'V11_PILOT_NO_REPORT_PRESERVE_LOCAL_FILES'
}
$report = Get-Content -LiteralPath $reportFile -Raw -Encoding UTF8 | ConvertFrom-Json
if ($report.schema -cne 'r125-local-plan-batch-v1' -or
    [int]$report.worldWrites -ne 0 -or
    [int]$report.attempted -gt $expectedCount -or
    [int]$report.attempted -lt 1 -or
    [int]$report.planned -ne $expectedCount) {
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

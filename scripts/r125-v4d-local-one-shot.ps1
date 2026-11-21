<#
.SYNOPSIS
  V4D: one private, bounded local Ollama design trial from the correct Git branch.
.DESCRIPTION
  No checkout, download, model install, file upload, Minecraft I/O or repeated
  generation. -CheckOnly validates the Windows launch path WITHOUT model calls
  or creating private output. Failed runs retain a private report and a safe
  minimal shareable receipt. This PowerShell file contains ASCII only for
  compatibility with Windows PowerShell 5.1.
#>
[CmdletBinding()]
param(
  [string]$Model = 'qwen3:14b',
  [string]$Prompt = 'Design an original small civic learning center with a functional arrival room, an independent making space and a sheltered open-air public courtyard.',
  [switch]$Detailed,
  [switch]$CheckOnly,
  [string]$ReplayStudy = ''
)

$ErrorActionPreference = 'Stop'
$expectedBranch = 'feature/b198zr1-protected-architectural-revision'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$runner = Join-Path $repo 'scripts\r125-v4d-local-architect.mjs'
$compact = Join-Path $repo 'source\ai\r125-v4d-compact-model-ir.mjs'
$safeReceipt = Join-Path $repo 'scripts\r125-v4d-shareable-receipt.mjs'
foreach ($target in @($runner, $compact, $safeReceipt)) {
  if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
    throw ('V4D_PRECHECK_MISSING_LOCAL_SOURCE: ' + $target)
  }
}
$gitTool = Get-Command git -ErrorAction Stop
$nodeTool = Get-Command node -ErrorAction Stop
$branch = (& $gitTool.Source -C $repo branch --show-current)
if ($LASTEXITCODE -ne 0 -or $branch.Trim() -ne $expectedBranch) {
  throw 'V4D_PRECHECK_WRONG_BRANCH: research branch only, no auto-checkout.'
}
$gitHead = (& $gitTool.Source -C $repo rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $gitHead -notmatch '^[0-9a-f]{40}$') {
  throw 'V4D_PRECHECK_NO_VERIFIABLE_COMMIT'
}
$dirty = @(& $gitTool.Source -C $repo status --porcelain --untracked-files=no)
if ($LASTEXITCODE -ne 0 -or ($dirty | Where-Object { $_ -and $_.Trim() }).Count -gt 0) {
  throw 'V4D_PRECHECK_DIRTY_TRACKED_SOURCES: no auto-stash/clean/reset.'
}
$nodeVersion = (& $nodeTool.Source --version)
$nodeMatch = [regex]::Match([string]$nodeVersion, '^v([0-9]+)\.')
if ($LASTEXITCODE -ne 0 -or -not $nodeMatch.Success) {
  throw 'V4D_PRECHECK_NODE_VERSION'
}
if ([int]$nodeMatch.Groups[1].Value -lt 20) {
  throw 'V4D_PRECHECK_NODE_20_OR_LATER_REQUIRED'
}
if ($Model -notmatch '^[A-Za-z0-9._:/-]{2,140}$') {
  throw 'V4D_PRECHECK_INVALID_MODEL_NAME'
}
if ($Prompt.Length -lt 8 -or $Prompt.Length -gt 4000) {
  throw 'V4D_PRECHECK_INVALID_USER_PROMPT'
}
if ($CheckOnly) {
  Write-Output 'CHECK_ONLY_SAFE_NO_MODEL_CALL_NO_WORLD_WRITE'
  Write-Output ('RESEARCH_HEAD=' + $gitHead.Trim())
  Write-Output ('AUTHOR_MODE=' + $(if ($Detailed) { 'DETAILED' } else { 'COMPACT' }))
  Write-Output ('RUN_MODE=' + $(if ($ReplayStudy) { 'OFFLINE_REPLAY' } else { 'ONE_LOCAL_MODEL_POST_MAX' }))
  return
}

# LocalAppData is normally a local/private application-data path, unlike
# Documents, which may be redirected to synced cloud folders.
if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA) -or
    -not (Test-Path -LiteralPath $env:LOCALAPPDATA -PathType Container)) {
  throw 'V4D_PRECHECK_LOCALAPPDATA_UNAVAILABLE'
}
$privateRoot = Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\PrivateModelStudies'
[void](New-Item -Path $privateRoot -ItemType Directory -Force)
$studyName = 'V4D_' + (Get-Date -Format 'yyyyMMdd_HHmmss_fff') + '_' +
  [Guid]::NewGuid().ToString('N').Substring(0, 8)
$out = Join-Path $privateRoot $studyName
if (Test-Path -LiteralPath $out) { throw 'V4D_PRECHECK_OUTPUT_COLLISION' }

if ($ReplayStudy) {
  $replayRunner = Join-Path $repo 'scripts\r125-v4d-replay-private.mjs'
  if (-not (Test-Path -LiteralPath $replayRunner -PathType Leaf)) {
    throw 'V4D_REPLAY_RUNNER_MISSING'
  }
  Write-Output ('V4D_OFFLINE_REPLAY_START - repo commit ' + $gitHead.Trim())
  & $nodeTool.Source $replayRunner '--study' $ReplayStudy '--out' $out
  $replayExit = $LASTEXITCODE
  $receiptFile = Join-Path $out 'REPLAY_SHAREABLE_STATUS.json'
  if (-not (Test-Path -LiteralPath $receiptFile -PathType Leaf)) {
    throw 'V4D_REPLAY_NO_STATUS: preserve original source; no model calls.'
  }
  $receipt = Get-Content -LiteralPath $receiptFile -Raw | ConvertFrom-Json
  if ($receipt.worldWrites -ne 0 -or
      $receipt.schema -ne 'minecraftaibuilder-v4d-offline-replay-minimal-share-v1' -or
      $receipt.additionalModelCalls -ne 0) {
    throw 'V4D_REPLAY_STATUS_SAFETY_HOLD'
  }
  Write-Output ('V4D_REPLAY_STATUS=' + $receipt.replayStatus)
  Write-Output ('SHAREABLE_SUMMARY=' + $receiptFile)
  Write-Output 'ORIGINAL_MODEL_TEXT_REMAINED_PRIVATE. No model or world call.'
  if ($replayExit -ne 0) {
    throw 'V4D_OFFLINE_REPLAY_HOLD: share only REPLAY_SHAREABLE_STATUS.json if useful.'
  }
  return
}

$argsForNode = @($runner, '--model', $Model, '--out', $out, '--prompt', $Prompt)
if (-not $Detailed) { $argsForNode += '--compact' }
Write-Output ('V4D_PRIVATE_STUDY_START - repo commit ' + $gitHead.Trim())
& $nodeTool.Source @argsForNode
$nodeExit = $LASTEXITCODE

$receiptFile = Join-Path $out 'REVIEW_SUMMARY_SHAREABLE.json'
if (-not (Test-Path -LiteralPath $receiptFile -PathType Leaf)) {
  throw 'V4D_SOURCE_FAILURE_WITHOUT_SHAREABLE_RECEIPT: keep private study folder; never publish raw response.'
}
$receipt = Get-Content -LiteralPath $receiptFile -Raw | ConvertFrom-Json
if ($receipt.worldWrites -ne 0 -or $receipt.constructionApproved -ne $false -or
    $receipt.schema -ne 'minecraftaibuilder-v4d-minimal-shareable-receipt-v1') {
  throw 'V4D_RECEIPT_SAFETY_HOLD'
}

Write-Output ('V4D_STATUS=' + $receipt.reportedStatus)
Write-Output ('MODEL_POST_ATTEMPTS=' + $receipt.modelCallAttempts)
Write-Output ('SHAREABLE_SUMMARY=' + $receiptFile)
Write-Output 'PRIVATE_ORIGINAL_AND_B143_STAY_LOCAL. No automatic upload.'
if ($nodeExit -ne 0) {
  throw 'V4D_MODEL_OR_SOURCE_HOLD: share only REVIEW_SUMMARY_SHAREABLE.json if desired.'
}
Write-Output 'V4D_SOURCE_CANDIDATE_ONLY: human ART and Minecraft walking remain NOT_TESTED.'

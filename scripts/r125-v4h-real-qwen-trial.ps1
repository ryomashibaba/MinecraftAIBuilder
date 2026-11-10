#Requires -Version 5.1
<#
  R125 V4H independent PRIVATE local-Qwen SOURCE audition.
  One explicitly invoked model POST at most; no retry, API payment, Work,
  Minecraft connection, world manipulation or automatic ART promotion.
  The pinned research commit MUST match a fresh readonly single-branch clone.
  This script NEVER modifies existing project directories.
#>
[CmdletBinding()]
param(
    [switch] $CheckOnly,
    [string] $ExpectedCommit,
    [string] $Model = 'qwen3:14b',
    [string] $Brief = 'Design an original public cultural learning centre with a coherent two-level reception hall, meaningful upper gallery, daylight, an outdoor civic garden, and visually distinctive architecture. Create a working building, not a stack of coloured boxes.'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/ryomashibaba/MinecraftAIBuilder.git'
$Branch = 'feature/b198zr1-protected-architectural-revision'
$Schema = 'minecraftaibuilder-r125-v4h-one-local-qwen-audition-handoff-v1'
$OriginalTestFlag = ($env:MAB_V4D_TEST_DOUBLE_MODE -eq '1')
function Assert-Command([string] $Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $cmd) { throw ('V4H_MISSING_COMMAND_' + $Name) }
    return $cmd.Source
}
$git = Assert-Command 'git.exe'
$node = Assert-Command 'node.exe'
if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
    throw 'V4H_LOCALAPPDATA_REQUIRED'
}
if ($CheckOnly) {
    Write-Output 'V4H_CHECK_ONLY_PASS_NO_CLONE_NO_MODEL_NO_WORLD'
    Write-Output 'MODEL_GENERATION_REQUESTS=0'
    Write-Output 'WORK_AND_PAID_API=DISALLOWED'
    return
}
# V4H legacy runner lacks V7's live resource monitor and server unload proof.
# Fail closed before any clone or PRIVATE directory allocation. Do not treat
# -CheckOnly or model-list GET as permission to send a real model request.
# The GitHub CI FAKE HTTP test is the sole exception; it is NOT real-model QA.
$fakeOnlyCI = $false
if ($env:GITHUB_ACTIONS -ceq 'true' -and $env:CI -ceq 'true' -and
    $OriginalTestFlag -and
    -not [string]::IsNullOrWhiteSpace($env:MAB_V4D_FAKE_READY_FILE) -and
    -not [string]::IsNullOrWhiteSpace($env:MAB_V4D_FAKE_POST_LOG) -and
    (Test-Path -LiteralPath $env:MAB_V4D_FAKE_READY_FILE -PathType Leaf)) {
    try {
        $fakeOnlyCI = ([System.IO.File]::ReadAllText(
            $env:MAB_V4D_FAKE_READY_FILE) -ceq "GITHUB_CI_ONLY_FAKE_OLLAMA_READY`n")
    } catch {
        $fakeOnlyCI = $false
    }
}
if (-not $fakeOnlyCI) {
    throw 'V4H_REAL_POST_REQUIRES_MONITORED_GATEC_PATH'
}
# Only GitHub's fake CI may choose the additional research ref. Exact SHA is
# checked after clone, and real user launches never reach this block.
if ($env:GITHUB_REF_NAME -ceq 'research/r125-entry-nearest-safe-source-20261109') {
    $Branch = $env:GITHUB_REF_NAME
}
if ($ExpectedCommit -cnotmatch '^[a-f0-9]{40}$') {
    throw 'V4H_PINNED_40_HEX_COMMIT_REQUIRED'
}
if ($Model -cnotmatch '^[A-Za-z0-9._:/-]{2,140}$') {
    throw 'V4H_MODEL_ID_INVALID'
}
if ($Brief.Length -lt 8 -or $Brief.Length -gt 4000) {
    throw 'V4H_ARCHITECTURE_BRIEF_INVALID'
}
$versionText = (& $node --version)
if ($LASTEXITCODE -ne 0 -or $versionText -notmatch '^v(\d+)\.') {
    throw 'V4H_NODE_VERSION_UNKNOWN'
}
if ([int]$Matches[1] -lt 20) { throw 'V4H_NODE20_OR_NEWER_REQUIRED' }

$base = Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder'
$sourceRoot = Join-Path $base 'IsolatedV4H'
$privateRoot = Join-Path $base 'PrivateModelStudies'
# All paths use fresh random UUIDs. No existing checkout, Minecraft world,
# cached original artwork or hand-authored source can be overwritten.
$runId = [guid]::NewGuid().ToString('N')
$workDir = Join-Path $sourceRoot ('v4h-' + $runId)
$studyDir = Join-Path $privateRoot ('V4H_' + $runId)
$replayDir = Join-Path $privateRoot ('V4H_REPLAY_' + $runId)
$sharePath = Join-Path $privateRoot ('V4H_HANDOFF_' + $runId + '.json')
foreach ($dir in @($sourceRoot,$privateRoot)) {
    if (-not (Test-Path -LiteralPath $dir -PathType Container)) {
        New-Item -ItemType Directory -Path $dir -ErrorAction Stop | Out-Null
    }
}
foreach ($path in @($workDir,$studyDir,$replayDir,$sharePath)) {
    if (Test-Path -LiteralPath $path) { throw 'V4H_NEW_DESTINATION_REQUIRED' }
}
# Never prompt for credentials; never accept a moved branch as this pinned run.
$env:GIT_TERMINAL_PROMPT = '0'
$env:GIT_LFS_SKIP_SMUDGE = '1'
& $git -c credential.interactive=never clone --quiet --depth 1 --single-branch --branch $Branch -- $RepoUrl $workDir
if ($LASTEXITCODE -ne 0) { throw 'V4H_READONLY_GIT_CLONE_FAILED' }
$remote = (& $git -C $workDir remote get-url origin).Trim()
$branchActual = (& $git -C $workDir branch --show-current).Trim()
$head = (& $git -C $workDir rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $remote -cne $RepoUrl -or
    $branchActual -cne $Branch -or $head -cne $ExpectedCommit) {
    throw 'V4H_PINNED_BRANCH_OR_HEAD_MISMATCH_NO_MODEL_POST'
}
$runner = Join-Path $workDir 'scripts\r125-v4d-local-architect.mjs'
$replay = Join-Path $workDir 'scripts\r125-v4d-replay-private.mjs'
$author = Join-Path $workDir 'source\ai\r125-v4h-mezzanine-author-ir.mjs'
foreach ($file in @($runner,$replay,$author)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        throw 'V4H_EXPECTED_RESEARCH_FILE_MISSING'
    }
}
# Only THIS explicit invocation is permitted to send one POST via loopback.
# The runner checks 127.0.0.1, preflights Ollama tags, and independently
# preserves the private raw response BEFORE any B143/source validation.
Write-Output 'V4H_PINNED_SOURCE_VERIFIED'
Write-Output ('V4H_RESEARCH_HEAD=' + $head)
Write-Output 'V4H_ONE_LOCAL_MODEL_POST_MAX_NO_AUTO_RETRY'
& $node $runner --authored-mezzanine --model $Model --out $studyDir --prompt $Brief
$runExit = $LASTEXITCODE
$attemptShare = Join-Path $studyDir 'REVIEW_SUMMARY_SHAREABLE.json'
$raw = Join-Path $studyDir 'MODEL_RESPONSE_ORIGINAL.txt'
$diagShare = Join-Path $replayDir 'REPLAY_SHAREABLE_STATUS.json'
if (-not (Test-Path -LiteralPath $attemptShare -PathType Leaf)) {
    throw 'V4H_RUNNER_DID_NOT_WRITE_SAFE_RECEIPT_NO_PROMOTION'
}
$attempt = Get-Content -LiteralPath $attemptShare -Raw -Encoding UTF8 | ConvertFrom-Json
if ($attempt.authorContract -cne 'minecraftaibuilder-r125-v4h-mezzanine-author-v1' -or
    $attempt.modelCallAttempts -gt 1 -or
    $attempt.worldWrites -ne 0 -or
    $attempt.worldContacts -ne 0 -or
    $attempt.readiness -cne 'NOT_PREPARED' -or
    $attempt.nineSafetyGates -cne '9 BLOCKED' -or
    $attempt.buildPlanOperations -ne 0 -or
    $attempt.rawModelTextIncluded -ne $false) {
    throw 'V4H_SHAREABLE_RECEIPT_INVARIANTS_FAILED'
}
$diagnosis = $null
if ($runExit -ne 0 -and (Test-Path -LiteralPath $raw -PathType Leaf)) {
    Write-Output 'V4H_SOURCE_HOLD_OFFLINE_REPLAY_ZERO_ADDITIONAL_MODEL_REQUESTS'
    & $node $replay --study $studyDir --out $replayDir | Out-Null
    if (Test-Path -LiteralPath $diagShare -PathType Leaf) {
        $diagnosis = Get-Content -LiteralPath $diagShare -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($diagnosis.additionalModelCalls -ne 0 -or $diagnosis.worldWrites -ne 0) {
            throw 'V4H_OFFLINE_DIAGNOSTIC_INVARIANTS_FAILED'
        }
    }
}
# Deliberately only an allowlisted SHAREABLE single JSON: no prompt, API URL,
# source path, raw model text, local username, architecture JSON or 3D scene.
$share = [ordered]@{
    schema = $Schema
    researchHead = $head
    sourceOnly = $true
    oneModelGenerationMaximum = 1
    modelId = $attempt.modelId
    modelIdentityCryptographicallyVerified = $false
    explicitlyInjectedTestResponse = [bool]$attempt.explicitlyInjectedTestResponse
    modelGenerationAttempts = [int]$attempt.modelCallAttempts
    authorContract = $attempt.authorContract
    reportedStatus = $attempt.reportedStatus
    sourceCandidateVerified = [bool]$attempt.sourceCandidateVerified
    originalRawSavedPrivately = [bool]$attempt.originalRawSavedPrivately
    originalRawSha256 = $attempt.originalRawSha256
    compiledB143SourceSha256 = $attempt.compiledB143SourceSha256
    finalGeometrySha256 = $attempt.finalGeometrySha256
    finalB143VoxelCount = $attempt.finalB143VoxelCount
    sourceCirculation = $attempt.sourceCirculation
    failureCategory = $attempt.failureCategory
    offlineReplayStatus = if ($null -ne $diagnosis) { $diagnosis.replayStatus } else { 'NOT_NEEDED_OR_NO_RAW' }
    offlineReplayAdditionalModelCalls = 0
    humanArchitecturalArt = 'NOT_REVIEWED'
    actualMinecraftWalking = 'NOT_TESTED'
    constructionApproved = $false
    readiness = 'NOT_PREPARED'
    nineSafetyGates = '9 BLOCKED'
    worldContacts = 0
    worldWrites = 0
    instruction = 'Share ONLY this JSON. Keep private model responses, full evidence folders and architecture source on your own PC. SOURCE is not ART PASS.'
}
$share | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $sharePath -Encoding UTF8 -NoNewline
Write-Output ('V4H_SHARE_ONLY_THIS_FILE=' + $sharePath)
if ($attempt.sourceCandidateVerified) {
    Write-Output 'V4H_SOURCE_CANDIDATE_ART_HOLD_NEEDS_HUMAN_REVIEW'
} else {
    Write-Output 'V4H_SOURCE_HOLD_DO_NOT_RETRY_AUTOMATICALLY'
}
if (-not $OriginalTestFlag) {
    Start-Process -FilePath explorer.exe -ArgumentList ('/select,"' + $sharePath + '"') -ErrorAction SilentlyContinue | Out-Null
}
if ($runExit -ne 0) { exit 2 }

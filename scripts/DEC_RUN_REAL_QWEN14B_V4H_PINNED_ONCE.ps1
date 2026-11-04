# Dec 2026: fixed research SOURCE, one genuine installed Qwen14B V4H author attempt.
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
    [string] $Model = 'qwen3:14b',
    [string] $Brief = 'Design an original accessible public learning and space-science center for families and student rocket builders in Minecraft Education. Invent the entire architectural layout, meaningful public activities, covered reception, an open public garden, a connected exterior wing, a covered public atrium, and a real functional upper learning mezzanine with public service desk. Compose an expressive coherent building, not a preselected template. Follow all exact spatial and safety constraints in the provided system contract. Return one complete original JSON author decision, with no host repair.'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/ryomashibaba/MinecraftAIBuilder.git'
$Branch = 'research/dec-v4h-one-response-author-contract-20261105'
$ExpectedCommit = 'de28d50c9240dbb95c47732b0456625a70f8a785'
$SourceBlob = '934292ca75aed1cc6e374350b9e2fa20121719f8'
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
& $git init --quiet -- $workDir
if ($LASTEXITCODE -ne 0) { throw 'V4H_CLONE_INIT_HOLD' }
& $git -C $workDir config core.autocrlf false
& $git -C $workDir remote add origin $RepoUrl
if ($LASTEXITCODE -ne 0) { throw 'V4H_REMOTE_INIT_HOLD' }
& $git -C $workDir -c credential.interactive=never fetch --quiet --depth 1 --no-tags origin $ExpectedCommit
if ($LASTEXITCODE -ne 0) { throw 'V4H_IMMUTABLE_COMMIT_FETCH_HOLD_NO_MODEL' }
& $git -C $workDir checkout --quiet --detach FETCH_HEAD
if ($LASTEXITCODE -ne 0) { throw 'V4H_IMMUTABLE_CHECKOUT_HOLD_NO_MODEL' }
$remote = (& $git -C $workDir remote get-url origin).Trim()
$head = (& $git -C $workDir rev-parse HEAD).Trim()
$dirty = @(& $git -C $workDir status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0 -or $remote -cne $RepoUrl -or
    $head -cne $ExpectedCommit -or $dirty.Count -gt 0) {
    throw 'V4H_IMMUTABLE_SOURCE_HEAD_MISMATCH_NO_MODEL'
}
$runner = Join-Path $workDir 'scripts\r125-v4d-local-architect.mjs'
$replay = Join-Path $workDir 'scripts\r125-v4d-replay-private.mjs'
$author = Join-Path $workDir 'source\ai\r125-v4h-mezzanine-author-ir.mjs'
foreach ($file in @($runner,$replay,$author)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        throw 'V4H_EXPECTED_RESEARCH_FILE_MISSING'
    }
}
$sourceSha = ((& $git -C $workDir hash-object --no-filters -- $author) | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $sourceSha -cne $SourceBlob) {
    throw 'V4H_SOURCE_BLOB_HASH_MISMATCH_NO_MODEL'
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
$fullPath = Join-Path $studyDir 'V4D_LOCAL_AUTHOR_REPORT.json'
$privateReport = if (Test-Path -LiteralPath $fullPath -PathType Leaf) { Get-Content -LiteralPath $fullPath -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
if ($null -eq $privateReport -or $privateReport.testInjectionPresent -ne $false -or
    $attempt.modelId -cne $Model -or
    $attempt.authorContract -cne 'minecraftaibuilder-r125-v4h-mezzanine-author-v1' -or
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
    referenceBranch = $Branch
    pinnedAuthorSourceBlob = $SourceBlob
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
    systemPromptSha256 = $privateReport.systemPromptSha256
    reasonCode = if ([string]$privateReport.reason -cmatch '^R125_[A-Z0-9_]{1,125}    offlineReplayStatus = if ($null -ne $diagnosis) { $diagnosis.replayStatus } else { 'NOT_NEEDED_OR_NO_RAW' }
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
) { [string]$privateReport.reason } else { 'PRIVATE_REASON_NOT_SHAREABLE' }
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

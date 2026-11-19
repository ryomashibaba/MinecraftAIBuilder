<#
.SYNOPSIS
  MAB V11: one command for a bounded local ArchitecturePlan trial.
  Requires an already running local Ollama/LM Studio.
.DESCRIPTION
  Does not create/start/stop model servers, change OS settings, fetch code,
  touch Minecraft worlds, or upload PRIVATE results. Work can run this in the
  user's existing research checkout. Outputs are local PrivateModelStudies.
  -SingleNewBrief: one new functional brief, with no prescribed architecture.
  -SingleNewBrief -Prompt TEXT: ONE custom original Japanese brief, no templates.
  -BriefsFile PATH: 1..3 user-authored Japanese briefs in one sequential batch.
  The input remains owned by the caller, not deleted or uploaded.
  Original prompt stays in the PRIVATE output; no uploads.
  -ComparePriorTide: one SAME-BRIEF Qwen recheck then A/B PNG review
  using the frozen PRIVATE 2026-11-16 tide result read-only. No extra POST.
  -RepairOnce: one new brief only; allow one genuine model revision after
  fixture-related SOURCE HOLD, while preserving the first response.
  -CheckOnly: GitHub CI / local dry run, no model HTTP, no new files.
#>
[CmdletBinding()]
param(
 [string]$Model = 'qwen3:14b',
 [string]$ExpectedHead = '',
 [string]$Endpoint = 'http://127.0.0.1:11434/v1/chat/completions',
 [switch]$CheckOnly,
 [switch]$OnlyHousingRetail,
 [switch]$SingleNewBrief,
 [string]$Prompt = '',
 [string]$BriefsFile = '',
 [switch]$ComparePriorTide,
 [switch]$RepairOnce,
 [switch]$NoOpen
)
$ErrorActionPreference = 'Stop'
# Validate image bytes on Windows PowerShell 5.1 without module auto-loading.
function Get-V11FileSha256([string]$FilePath) {
 $stream = [System.IO.File]::OpenRead($FilePath)
 $hash = [System.Security.Cryptography.SHA256]::Create()
 try {
  return ([System.BitConverter]::ToString(
   $hash.ComputeHash($stream))).Replace('-','').ToLowerInvariant()
 } finally { $hash.Dispose(); $stream.Dispose() }
}
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$studyBranch = 'research/r125-v6-readonly-facade-diagnostic-20261111'
# Explicit exact SHA pin is an opt-in for one genuine batch. A stale or
# accidentally mismatched checkout must never consume a model POST.
if ($ExpectedHead -ne '' -and $ExpectedHead -cnotmatch '^[0-9a-f]{40}$') {
 throw 'V11_PILOT_EXPECTED_HEAD_INVALID'
}
$runner = Join-Path $repo 'scripts\r125-local-architecture-plan-batch.mjs'
$pilot = Join-Path $repo 'scripts\r125-v11-pilot-three.json'
$single = Join-Path $repo 'scripts\r125-v11-single-unknown.json'
$abRenderer = Join-Path $repo 'scripts\r125-static-art-review.mjs'
$floorRenderer = Join-Path $repo 'scripts\r125-v11-saved-floor-review.mjs'
# True B143 SOURCE renders are created for either single-brief path.
# No extra model call, remote data access or Minecraft contact.
$staticRenderer = $abRenderer
$customBrief = $PSBoundParameters.ContainsKey('Prompt')
$batchBriefs = $PSBoundParameters.ContainsKey('BriefsFile')
$singleArt = $SingleNewBrief
$singleId = if ($customBrief) { 'custom-brief' } else { 'tide-observatory' }
$singleLabel = if ($customBrief) { 'CUSTOM' } else { 'SINGLE' }
if ($batchBriefs -and ($SingleNewBrief -or $OnlyHousingRetail -or
    $ComparePriorTide -or $customBrief)) {
 throw 'V11_PILOT_BRIEFS_FILE_CONFLICTS_WITH_OTHER_MODES'
}
$batchFilePath = ''
$batchBriefCount = 0
if ($batchBriefs) {
 if ([string]::IsNullOrWhiteSpace($BriefsFile) -or
     -not (Test-Path -LiteralPath $BriefsFile -PathType Leaf) -or
     (Get-Item -LiteralPath $BriefsFile).Length -gt 30000) {
  throw 'V11_PILOT_BRIEFS_FILE_NOT_FOUND_OR_TOO_LARGE'
 }
 $batchFilePath = (Resolve-Path -LiteralPath $BriefsFile).Path
 try {
  $batchJson = Get-Content -LiteralPath $batchFilePath -Raw -Encoding UTF8
  if (-not $batchJson.Trim().StartsWith('[')) {
   throw 'NOT_JSON_ARRAY'
  }
  $batchParsed = ConvertFrom-Json -InputObject $batchJson
 } catch { throw 'V11_PILOT_BRIEFS_FILE_INVALID_JSON_ARRAY' }
 $batchRows = @(foreach ($entry in $batchParsed) { $entry })
 if ($batchRows.Count -lt 1 -or $batchRows.Count -gt 3) {
  throw 'V11_PILOT_BRIEFS_COUNT_1_TO_3'
 }
 $seenIds = @{}
 foreach ($entry in $batchRows) {
  if ($null -eq $entry -or $entry.id -cnotmatch '^[a-z][a-z0-9-]{2,39}$' -or
      -not ($entry.prompt -is [string]) -or
      $entry.prompt.Length -lt 8 -or $entry.prompt.Length -gt 8000 -or
      $seenIds.ContainsKey([string]$entry.id)) {
   throw 'V11_PILOT_BRIEFS_INVALID_ENTRY'
  }
  $seenIds[[string]$entry.id] = $true
 }
 $batchBriefCount = $batchRows.Count
}
if ($customBrief -and (-not $SingleNewBrief -or $ComparePriorTide -or
    [string]::IsNullOrWhiteSpace($Prompt) -or $Prompt.Length -lt 8 -or
    $Prompt.Length -gt 8000)) {
 throw 'V11_PILOT_CUSTOM_PROMPT_REQUIRES_SINGLE_NEW_BRIEF_8_TO_8000'
}
if ($SingleNewBrief -and $OnlyHousingRetail) {
 throw 'V11_PILOT_CONFLICTING_TRIAL_MODES'
}
if ($RepairOnce -and (-not $SingleNewBrief -or $OnlyHousingRetail -or
    $ComparePriorTide -or $batchBriefs)) {
 throw 'V11_REPAIR_REQUIRES_ONE_NEW_BRIEF'
}
if ($ComparePriorTide -and (-not $SingleNewBrief -or $OnlyHousingRetail -or
 $Model -cne 'qwen3:14b' -or
 $Endpoint -cne 'http://127.0.0.1:11434/v1/chat/completions')) {
 throw 'V11_TIDE_AB_REQUIRES_ONE_SAME_QWEN14B_BRIEF'
}
$expectedCount = if ($batchBriefs) { $batchBriefCount } elseif ($SingleNewBrief) { 1 } elseif ($OnlyHousingRetail) { 2 } else { 3 }
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

if ($SingleNewBrief -and -not $customBrief) {
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
foreach ($target in @($runner, $pilot, $single, $abRenderer, $floorRenderer,
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
 if ($ComparePriorTide -or $singleArt -or $batchBriefs) {
  & $node '--check' $staticRenderer
  if ($LASTEXITCODE -ne 0) { throw 'V11_TIDE_AB_RENDERER_SYNTAX_FAILED' }
 }
 if ($singleArt) {
  & $node '--check' $floorRenderer
  if ($LASTEXITCODE -ne 0) { throw 'V11_CUSTOM_FLOOR_RENDERER_SYNTAX_FAILED' }
 }
 Write-Output ('V11_PILOT_CHECK_ONLY_PASS: '+$(if($batchBriefs){"$expectedCount supplied original briefs"}elseif($SingleNewBrief){'one unseen functional brief'}elseif($OnlyHousingRetail){'two original failure briefs'}else{'three original briefs'})+'; no server, HTTP, model, world or output.')
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
if ($ExpectedHead -ne '' -and $commit.Trim() -cne $ExpectedHead) {
 throw ('V11_PILOT_EXPECTED_HEAD_MISMATCH expected=' + $ExpectedHead +
  ' actual=' + $commit.Trim())
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
# Verify the EXACT previous genuine Qwen response BEFORE any new model POST.
# Never quietly switch the prompt, model, original or provider.
if ($ComparePriorTide) {
 $baseline = Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\PrivateModelStudies\V11_UnseenSingle_20261116_143908_937_0bf923c6'
 $oldOne = Join-Path $baseline 'tide-observatory'
 $oldReportPath = Join-Path $baseline 'BATCH_REPORT.json'
 $oldRaw = Join-Path $oldOne 'MODEL_RESPONSE_ORIGINAL.txt'
 $oldRequest = Join-Path $oldOne 'REQUEST_ORIGINAL.txt'
 $oldSource = Join-Path $oldOne 'B143_SOURCE_REVIEW_ONLY.json'
 $oldDiagnosisPath = Join-Path $oldOne 'SOURCE_DIAGNOSIS.json'
 foreach ($needed in @($oldReportPath,$oldRaw,$oldRequest,$oldSource,$oldDiagnosisPath)) {
  if (-not (Test-Path -LiteralPath $needed -PathType Leaf)) {
   throw 'V11_TIDE_AB_BASELINE_FILE_MISSING'
  }
 }
 $oldReport = Get-Content -LiteralPath $oldReportPath -Raw -Encoding UTF8 | ConvertFrom-Json
 $oldDiag = Get-Content -LiteralPath $oldDiagnosisPath -Raw -Encoding UTF8 | ConvertFrom-Json
 $oldRows = @($oldReport.completed)
 $briefFile = Get-Content -LiteralPath $single -Raw -Encoding UTF8 | ConvertFrom-Json
 $brief = @(foreach ($item in $briefFile) { $item })
 $savedPrompt = [System.IO.File]::ReadAllText($oldRequest,[System.Text.Encoding]::UTF8)
 $oldRawSha = (Get-FileHash -LiteralPath $oldRaw -Algorithm SHA256).Hash.ToLowerInvariant()
 if ($oldReport.schema -cne 'r125-local-plan-batch-v1' -or
     $oldReport.model -cne $Model -or
     [int]$oldReport.attempted -ne 1 -or
     [int]$oldReport.originalResponseCount -ne 1 -or
     $oldReport.allSourceVerified -ne $true -or
     [int]$oldReport.worldWrites -ne 0 -or
     $oldRows.Count -ne 1 -or
     $oldRows[0].id -cne 'tide-observatory' -or
     $oldRows[0].sourceVerified -ne $true -or
     $oldDiag.sourceVerified -ne $true -or
     $brief.Count -ne 1 -or
     $savedPrompt -cne [string]$brief[0].prompt -or
     $oldRawSha -cne 'd71eb74c74fda1d959059f5f1a46ef9e6c41f52a2f538b46116c703a7c2a5688' -or
     $oldRows[0].originalSha256 -cne $oldRawSha -or
     $oldRows[0].sourceSha256 -cne '8f25eb7ff967c0ea8e7269757bde96b83a05c5ad42f79608c47cf113404e1f6a' -or
     $oldRows[0].geometrySha256 -cne '754d9c845553a1ef566fbb430bfad94231fb4fbe81265938f631d010cb22a753' -or
     $oldDiag.sourceSha256 -cne $oldRows[0].sourceSha256 -or
     $oldDiag.geometrySha256 -cne $oldRows[0].geometrySha256) {
  throw 'V11_TIDE_AB_NOT_THE_EXACT_SAME_VERIFIED_BASELINE'
 }
 Write-Output 'V11_TIDE_AB_BASELINE_VERIFIED: SAME original brief and Qwen14B.'
}
$root = Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\PrivateModelStudies'
[void](New-Item -Path $root -ItemType Directory -Force)
$studyName = if ($batchBriefs) { 'V11_CustomBatch_' }
 elseif ($customBrief) { 'V11_CustomBrief_' }
 elseif ($SingleNewBrief) { 'V11_UnseenSingle_' } else { 'V11_3Genre_' }
$out = Join-Path $root ($studyName +
 (Get-Date -Format 'yyyyMMdd_HHmmss_fff') + '_' +
 [Guid]::NewGuid().ToString('N').Substring(0,8))
if (Test-Path -LiteralPath $out) { throw 'V11_PILOT_OUTPUT_COLLISION' }
Write-Output ('V11_PILOT_RUN_HEAD=' + $commit.Trim())
Write-Output ('V11_PRIVATE_RESULT=' + $out)
Write-Output ('One existing local model, '+$expectedCount+' bounded original POST(s), no automatic retries.')
$batchArgs = @($runner, '--model', $Model)
if ($batchBriefs) {
 # Preserve caller-authored input and original model bytes in the PRIVATE
 # result. The Node runner revalidates the JSON before any local POST.
 $batchArgs += @('--briefs', $batchFilePath)
} elseif ($customBrief) {
 # The exact user prompt is copied to BRIEFS_ORIGINAL.json by the existing
 # batch runner before POST. This transient input is in PRIVATE and is
 # removed after use. No model rewriting or architectural assumptions.
 $briefFile = Join-Path $root ('V11_CustomBrief_Input_' +
  [Guid]::NewGuid().ToString('N')+'.json')
 $customRows = @([pscustomobject]@{id='custom-brief';prompt=$Prompt})
 $json = ConvertTo-Json -InputObject $customRows -Depth 6
 [System.IO.File]::WriteAllText($briefFile, $json,
  [System.Text.UTF8Encoding]::new($false))
 $batchArgs += @('--briefs', $briefFile)
} elseif ($SingleNewBrief) {
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
if ($RepairOnce) { $batchArgs += '--repair-once' }
try {
 & $node @batchArgs
 $nodeExit = $LASTEXITCODE
} finally {
 if (($OnlyHousingRetail -or $customBrief) -and
     (Test-Path -LiteralPath $briefFile -PathType Leaf)) {
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
if ($RepairOnce -and @($report.completed).Count -eq 1) {
 Write-Output ('V11_PILOT_MODEL_CALL_ATTEMPTS=' + $report.totalModelCallAttempts)
 Write-Output ('V11_PILOT_REVISED=' + $report.completed[0].modelRevisionApplied)
 Write-Output ('V11_PILOT_FIRST_ORIGINAL_SHA=' + $report.completed[0].originalSha256)
}
Write-Output ('V11_PILOT_EXPERIMENT=' + $report.experimentOutcome)
Write-Output ('V11_PILOT_STOP_REASON=' + [string]$report.stopReason)
if (@($report.completed).Count -eq 1 -and
    $null -ne $report.completed[0].baselineSourceHold) {
 $hold = $report.completed[0].baselineSourceHold
 Write-Output ('V11_UPSTREAM_SOURCE_HOLD=' +
  ($hold | ConvertTo-Json -Compress -Depth 6))
 Write-Output 'V11_UPSTREAM_HOLD_BEFORE_DAYLIGHT; PRIVATE original preserved; no retry or world write.'
}
if (@($report.completed).Count -eq 1 -and
    $null -ne $report.completed[0].invalidSetbackOriginal) {
 $bad = $report.completed[0].invalidSetbackOriginal
 Write-Output ('V11_ORIGINAL_SETBACK_HOLD: levels=' +
  [string]$bad.levelCount + '; side=' + [string]$bad.setbackSide +
  '; depth=' + [string]$bad.setbackDepth +
  '; required=' + [string]$bad.requiredRule +
  '; original preserved; no repair or retry.')
}
# SOURCE may be valid while strict Education material evidence is missing.
# Prepare the EXISTING single-cell, non-running material probe in PRIVATE;
# never certify glowstone or alter the user's original B143 design here.
# Explicit /mabprobe in a dedicated test world is a SEPARATE user action.
if ($customBrief -and [int]$report.attempted -eq 1 -and
    @($report.completed).Count -eq 1 -and
    $report.completed[0].sourceVerified -eq $true -and
    $report.completed[0].makeCodeStatus -ceq 'HOLD_EDUCATION_EXPORT' -and
    $report.completed[0].makeCodeReason -ceq
      'R125_EDUCATION_EXPORT_UNVERIFIED_MATERIAL_GLOW') {
 $probeRunner = Join-Path $repo 'scripts\r125-material-probe.mjs'
 $probeDir = Join-Path $out 'EDUCATION_GLOWSTONE_PROBE_OFFLINE'
 $probeFile = Join-Path $probeDir 'MAKECODE_MATERIAL_PROBE.ts'
 if (-not (Test-Path -LiteralPath $probeDir) -and
     (Test-Path -LiteralPath $probeRunner -PathType Leaf)) {
  & $node $probeRunner '--block' 'glowstone' '--out' $probeDir | Out-Null
  if ($LASTEXITCODE -eq 0 -and
      (Test-Path -LiteralPath $probeFile -PathType Leaf)) {
   Write-Output ('V11_EDUCATION_MISSING_ATTESTATION=glowstone')
   Write-Output ('V11_EDUCATION_PROBE_PRIVATE_CODE=' + $probeFile)
   Write-Output 'V11_EDUCATION_PROBE_GENERATED_ONLY; use an empty backed-up test world; Minecraft unchanged.'
   Write-Output 'V11_EDUCATION_STRICT_EXPORT_HOLD; only actual screenshot and block identity evidence may update verified palette.'
  } else { Write-Warning 'V11_EDUCATION_GLOWSTONE_PROBE_NOT_GENERATED; SOURCE preserved.' }
 }
}
if ($ComparePriorTide) {
 # One POST already happened above. Never retry if it did not yield SOURCE.
 if ($nodeExit -ne 0 -or $report.allSourceVerified -ne $true -or
     [int]$report.attempted -ne 1 -or
     [int]$report.originalResponseCount -ne 1 -or
     @($report.completed).Count -ne 1 -or
     $report.completed[0].sourceVerified -ne $true) {
  Write-Output ('V11_TIDE_AB_ART_HOLD_PRESERVE_PRIVATE=' + $out)
  throw 'V11_TIDE_AB_NEW_SOURCE_NOT_VERIFIED_NO_RETRY'
 }
 $newOne = Join-Path $out 'tide-observatory'
 $newRequest = Join-Path $newOne 'REQUEST_ORIGINAL.txt'
 $newSource = Join-Path $newOne 'B143_SOURCE_REVIEW_ONLY.json'
 if (-not (Test-Path -LiteralPath $newRequest -PathType Leaf) -or
     -not (Test-Path -LiteralPath $newSource -PathType Leaf) -or
     [System.IO.File]::ReadAllText($newRequest,[System.Text.Encoding]::UTF8) -cne
      $savedPrompt) {
  throw 'V11_TIDE_AB_NEW_REQUEST_OR_SOURCE_MISMATCH'
 }
 $abOut = Join-Path $out 'SAME_BRIEF_AB_REVIEW'
 & $node $abRenderer '--before' $oldSource '--after' $newSource '--out' $abOut
 if ($LASTEXITCODE -ne 0) { throw 'V11_TIDE_AB_RENDER_FAILED_KEEP_ORIGINALS' }
 $abReportPath = Join-Path $abOut 'AB_REPORT.json'
 if (-not (Test-Path -LiteralPath $abReportPath -PathType Leaf)) {
  throw 'V11_TIDE_AB_NO_REPORT'
 }
 $ab = Get-Content -LiteralPath $abReportPath -Raw -Encoding UTF8 | ConvertFrom-Json
 if ($ab.schema -cne 'r125-same-brief-ab-v1' -or
     $ab.before.sourceSha256 -cne $oldDiag.sourceSha256 -or
     $ab.before.geometrySha256 -cne $oldDiag.geometrySha256 -or
     $ab.after.sourceSha256 -cne $report.completed[0].sourceSha256 -or
     $ab.after.geometrySha256 -cne $report.completed[0].geometrySha256 -or
     [int]$ab.modelCalls -ne 0 -or [int]$ab.worldWrites -ne 0) {
  throw 'V11_TIDE_AB_REPORT_PROVENANCE_MISMATCH'
 }
 Write-Output ('V11_TIDE_AB_OLD_SOURCE=' + $ab.before.sourceSha256)
 Write-Output ('V11_TIDE_AB_NEW_SOURCE=' + $ab.after.sourceSha256)
 Write-Output ('V11_TIDE_AB_IMAGE=' + (Join-Path $abOut 'AB_OLD_LEFT_NEW_RIGHT.png'))
 Write-Output ('V11_TIDE_AB_VOXELS_OLD_NEW=' +
  $ab.before.occupiedVoxels + '/' + $ab.after.occupiedVoxels)
 Write-Output ('V11_TIDE_AB_FINAL_VOXEL_DELTA=' +
  (ConvertTo-Json -InputObject $ab.finalVoxelDifference -Compress))
 Write-Output 'V11_TIDE_AB_ART_HOLD. HUMAN REVIEW REQUIRED.'
 if (-not $NoOpen) {
  try { Start-Process -FilePath (Join-Path $abOut 'AB_OLD_LEFT_NEW_RIGHT.png') }
  catch { Write-Warning 'V11_TIDE_AB_IMAGE_OPEN_FAILED_USE_PRINTED_PATH' }
 }
}
# Keep failed-but-compiled batch buildings inspectable. SOURCE HOLD remains a
# HOLD; rendering existing B143 voxels makes no model call or world write.
# This applies ONLY to an explicitly supplied private batch, never defaults.
if ($batchBriefs) {
 $artRoot = Join-Path $out 'BATCH_4_VIEW_SOURCE_ART'
 foreach ($row in @($report.completed)) {
  if ([string]$row.id -cnotmatch '^[a-z][a-z0-9-]{2,39}$') {
   throw 'V11_BATCH_ART_INVALID_ID'
  }
  $entry = Join-Path $out ([string]$row.id)
  $source = Join-Path $entry $(if ($row.modelRevisionApplied -eq $true) {
    'B143_REVISED_SOURCE_REVIEW_ONLY.json' } else { 'B143_SOURCE_REVIEW_ONLY.json' })
  $diagnosis = Join-Path $entry $(if ($row.modelRevisionApplied -eq $true) {
    'SOURCE_DIAGNOSIS_REVISED.json' } else { 'SOURCE_DIAGNOSIS.json' })
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
   Write-Output ('V11_BATCH_ART_NOT_GENERATED_NO_B143=' + [string]$row.id)
   continue
  }
  if (-not (Test-Path -LiteralPath $diagnosis -PathType Leaf)) {
   throw 'V11_BATCH_ART_DIAGNOSIS_MISSING'
  }
  $diag = Get-Content -LiteralPath $diagnosis -Raw -Encoding UTF8 |
   ConvertFrom-Json
  if ($diag.sourceSha256 -cne $row.sourceSha256 -or
      $diag.geometrySha256 -cne $row.geometrySha256 -or
      [int]$diag.worldWrites -ne 0) {
   throw 'V11_BATCH_ART_SOURCE_SHA_DRIFT'
  }
  if (-not (Test-Path -LiteralPath $artRoot)) {
   [void](New-Item -Path $artRoot -ItemType Directory)
  }
  $artDir = Join-Path $artRoot ([string]$row.id)
  & $node $staticRenderer '--source' $source '--out' $artDir | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'V11_BATCH_ART_RENDER_FAILED' }
  $manifestPath = Join-Path $artDir 'STATIC_REVIEW.json'
  $image = Join-Path $artDir 'CONTACT_4_VIEWS.png'
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf) -or
      -not (Test-Path -LiteralPath $image -PathType Leaf)) {
   throw 'V11_BATCH_ART_MANIFEST_OR_IMAGE_MISSING'
  }
  $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 |
   ConvertFrom-Json
  if ($manifest.sourceSha256 -cne $row.sourceSha256 -or
      $manifest.geometrySha256 -cne $row.geometrySha256 -or
      $manifest.contactSheet.sha256 -cne (Get-V11FileSha256 $image) -or
      [int]$manifest.modelCalls -ne 0 -or
      [int]$manifest.worldWrites -ne 0) {
   throw 'V11_BATCH_ART_PROVENANCE_HOLD'
  }
  Write-Output ('V11_BATCH_TRUE_B143_IMAGE=' + [string]$row.id + ';' + $image)
  Write-Output ('V11_BATCH_ART_ONLY_NOT_ACCEPTED=' + [string]$row.id +
   ';SOURCE_VERIFIED=' + [string]$row.sourceVerified)
  if (-not $NoOpen) {
   try { Start-Process -FilePath $image }
   catch { Write-Warning 'V11_BATCH_ART_IMAGE_OPEN_FAILED_USE_PRINTED_PATH' }
  }
 }
}
# Complete BOTH single-brief modes without another user command:
# genuine model original -> strict B143 -> 4-view + per-floor PNG.
# A SOURCE rejection remains a HOLD; do not invent a proxy building.
if ($singleArt) {
 if ($nodeExit -eq 0 -and $report.allSourceVerified -eq $true -and
     [int]$report.attempted -eq 1 -and
     @($report.completed).Count -eq 1 -and
     $report.completed[0].id -ceq $singleId -and
     $report.completed[0].sourceVerified -eq $true) {
  $revised = $report.completed[0].modelRevisionApplied -eq $true
  $sourceFile = if ($revised) { 'B143_REVISED_SOURCE_REVIEW_ONLY.json' } else {
    'B143_SOURCE_REVIEW_ONLY.json' }
  $diagnosisFile = if ($revised) { 'SOURCE_DIAGNOSIS_REVISED.json' } else {
    'SOURCE_DIAGNOSIS.json' }
  $rawFile = if ($revised) { 'MODEL_RESPONSE_REVISED.txt' } else {
    'MODEL_RESPONSE_ORIGINAL.txt' }
  $sourcePath = Join-Path (Join-Path $out $singleId) $sourceFile
  $diagnosisPath = Join-Path (Join-Path $out $singleId) $diagnosisFile
  if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf) -or
      -not (Test-Path -LiteralPath $diagnosisPath -PathType Leaf)) {
   throw 'V11_CUSTOM_SOURCE_OR_DIAGNOSIS_MISSING'
  }
  $diag = Get-Content -LiteralPath $diagnosisPath -Raw -Encoding UTF8 |
   ConvertFrom-Json
  if ($diag.sourceVerified -ne $true -or
      $diag.sourceSha256 -cne $report.completed[0].sourceSha256 -or
      $diag.geometrySha256 -cne $report.completed[0].geometrySha256) {
   throw 'V11_CUSTOM_DIAGNOSIS_OR_SOURCE_MISMATCH'
  }
  $artDir = Join-Path $out ($singleLabel + '_4_VIEW_SOURCE_ART')
  & $node $staticRenderer '--source' $sourcePath '--out' $artDir | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'V11_CUSTOM_STATIC_RENDER_HOLD' }
  $manifestFile = Join-Path $artDir 'STATIC_REVIEW.json'
  $contact = Join-Path $artDir 'CONTACT_4_VIEWS.png'
  if (-not (Test-Path -LiteralPath $manifestFile -PathType Leaf) -or
      -not (Test-Path -LiteralPath $contact -PathType Leaf)) {
   throw 'V11_CUSTOM_ART_REPORT_MISSING'
  }
  $manifest = Get-Content -LiteralPath $manifestFile -Raw -Encoding UTF8 |
   ConvertFrom-Json
  # Works on native Windows PowerShell 5.1 even in an isolated
  # LOCALAPPDATA, where Get-FileHash module auto-loading may be unavailable.
  $actualArtSha = Get-V11FileSha256 $contact
  if ($manifest.schema -cne 'r125-b143-offline-static-review-v1' -or
      $manifest.sourceSha256 -cne $diag.sourceSha256 -or
      $manifest.geometrySha256 -cne $diag.geometrySha256 -or
      $manifest.contactSheet.sha256 -cne $actualArtSha -or
      [int]$manifest.modelCalls -ne 0 -or
      [int]$manifest.worldWrites -ne 0 -or
      $manifest.humanArt -cne 'NOT_REVIEWED') {
   throw 'V11_CUSTOM_ART_PROVENANCE_HOLD'
  }
  # Inspect the original author's real room geometry, not just the exterior.
  # No second model request and no modification to original PRIVATE evidence.
  $rawPath = Join-Path (Join-Path $out $singleId) $rawFile
  if (-not (Test-Path -LiteralPath $rawPath -PathType Leaf)) {
   throw 'V11_CUSTOM_ORIGINAL_MISSING_FOR_FLOOR_REVIEW'
  }
  $floorDir = Join-Path $out ($singleLabel + '_FLOOR_SOURCE_ART')
  & $node $floorRenderer '--raw' $rawPath '--source' $sourcePath `
   '--diagnosis' $diagnosisPath '--out' $floorDir | Out-Null
  if ($LASTEXITCODE -ne 0) {
   throw 'V11_CUSTOM_FLOOR_RENDER_HOLD_PRESERVE_ORIGINAL'
  }
  $floorPng = Join-Path $floorDir 'FLOOR_CONTACT_4_VIEWS.png'
  $floorJson = Join-Path $floorDir 'FLOOR_REVIEW.json'
  if (-not (Test-Path -LiteralPath $floorPng -PathType Leaf) -or
      -not (Test-Path -LiteralPath $floorJson -PathType Leaf)) {
   throw 'V11_CUSTOM_FLOOR_OUTPUT_MISSING'
  }
  $floorReport = Get-Content -LiteralPath $floorJson -Raw -Encoding UTF8 |
   ConvertFrom-Json
  if ($floorReport.schema -cne 'r125-v11-saved-two-floor-review-v1' -or
      $floorReport.originalSha256 -cne $(if ($revised) {
       $report.completed[0].revisedOriginalSha256
      } else { $report.completed[0].originalSha256 }) -or
      $floorReport.sourceSha256 -cne $diag.sourceSha256 -or
      $floorReport.geometrySha256 -cne $diag.geometrySha256 -or
      $floorReport.sourceFileSha256 -cne (Get-V11FileSha256 $sourcePath) -or
      $floorReport.contact.sha256 -cne (Get-V11FileSha256 $floorPng) -or
      [int]$floorReport.occupiedVoxels -ne [int]$diag.occupiedVoxels -or
      [int]$floorReport.modelCalls -ne 0 -or
      [int]$floorReport.worldContacts -ne 0 -or
      [int]$floorReport.worldWrites -ne 0 -or
      @($floorReport.gates).Count -ne 9 -or
      @($floorReport.gates | Where-Object { $_ -cne 'BLOCKED' }).Count -ne 0 -or
      $floorReport.humanArt -cne 'NOT_REVIEWED' -or
      $floorReport.minecraftWalking -cne 'NOT_TESTED') {
   throw 'V11_CUSTOM_FLOOR_SHA_OR_SOURCE_HOLD'
  }
  Write-Output ('V11_' + $singleLabel + '_TRUE_B143_4_VIEW_IMAGE=' + $contact)
  Write-Output ('V11_' + $singleLabel + '_TRUE_B143_FLOOR_IMAGE=' + $floorPng)
  Write-Output ('V11_' + $singleLabel + '_HUMAN_ART_PENDING; no Minecraft execution.')
  if (-not $NoOpen) {
   try { Start-Process -FilePath $contact; Start-Process -FilePath $floorPng }
   catch { Write-Warning 'V11_CUSTOM_ART_OPEN_FAILED_USE_PRINTED_PATH' }
  }
 } else {
  # Review exact B143 geometry even when visitor circulation remains HOLD.
  # No repairs, new model requests, Education export or world interaction.
  $entry = Join-Path $out $singleId
  $sourcePath = Join-Path $entry 'B143_SOURCE_REVIEW_ONLY.json'
  $diagnosisPath = Join-Path $entry 'SOURCE_DIAGNOSIS.json'
  $rawPath = Join-Path $entry 'MODEL_RESPONSE_ORIGINAL.txt'
  $holdRows = @($report.completed | Where-Object { $_.id -ceq $singleId -and $_.sourceVerified -eq $false -and $_.status -like 'HOLD_*' })
  if ($holdRows.Count -eq 1 -and
      (Test-Path -LiteralPath $sourcePath -PathType Leaf) -and
      (Test-Path -LiteralPath $diagnosisPath -PathType Leaf) -and
      (Test-Path -LiteralPath $rawPath -PathType Leaf)) {
   $floorDir = Join-Path $out ($singleLabel + '_HOLD_FLOOR_ART')
   & $node $floorRenderer '--raw' $rawPath '--source' $sourcePath '--diagnosis' $diagnosisPath '--out' $floorDir | Out-Null
   if ($LASTEXITCODE -ne 0) { throw 'V11_CUSTOM_HOLD_FLOOR_GEOMETRY_MISMATCH' }
   $floorPng = Join-Path $floorDir 'FLOOR_CONTACT_4_VIEWS.png'
   $floorJson = Join-Path $floorDir 'FLOOR_REVIEW.json'
   if (-not (Test-Path -LiteralPath $floorPng -PathType Leaf) -or
       -not (Test-Path -LiteralPath $floorJson -PathType Leaf)) {
    throw 'V11_CUSTOM_HOLD_FLOOR_OUTPUT_MISSING'
   }
   $floor = Get-Content -LiteralPath $floorJson -Raw -Encoding UTF8 | ConvertFrom-Json
   if ($floor.schema -cne 'r125-v11-saved-two-floor-review-v1' -or
       $floor.sourceVerified -ne $false -or
       $floor.sourceStatus -cne $holdRows[0].status -or
       $floor.reviewScope -cne 'HOLD_SOURCE_GEOMETRY_ONLY_NOT_FUNCTIONALLY_VERIFIED' -or
       $floor.originalSha256 -cne $holdRows[0].originalSha256 -or
       $floor.sourceSha256 -cne $holdRows[0].sourceSha256 -or
       $floor.geometrySha256 -cne $holdRows[0].geometrySha256 -or
       $floor.contact.sha256 -cne (Get-V11FileSha256 $floorPng) -or
       [int]$floor.modelCalls -ne 0 -or
       [int]$floor.worldWrites -ne 0 -or
       @($floor.gates).Count -ne 9 -or
       @($floor.gates | Where-Object { $_ -cne 'BLOCKED' }).Count -ne 0) {
    throw 'V11_CUSTOM_HOLD_FLOOR_PROVENANCE_MISMATCH'
   }
   Write-Output ('V11_' + $singleLabel + '_HOLD_FLOOR_IMAGE=' + $floorPng)
   Write-Output ('V11_' + $singleLabel + '_HOLD_REASON=' + $holdRows[0].status)
   if (-not $NoOpen) {
    try { Start-Process -FilePath $floorPng }
    catch { Write-Warning 'V11_CUSTOM_HOLD_FLOOR_OPEN_FAILED_USE_PRINTED_PATH' }
   }
  }
  Write-Output ('V11_' + $singleLabel + '_ART_HOLD_PRESERVE_PRIVATE=' + $out)
 }
}
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

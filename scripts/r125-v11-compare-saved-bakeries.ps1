<#
.SYNOPSIS
 MAB V11: compare TWO previously saved genuine Qwen bakery studies offline.
.DESCRIPTION
 Zero model POSTs, world IO, uploads or original rewrites. Reuses strict
 per-study B143 / floor / Education-material checks, then optionally runs
 the existing opt-in HOST spatial-v1 comparison on the newer source.
 The two prompts can differ: this is a VISUAL SHORTLIST, not a controlled
 same-brief benchmark or proof of ART / Education / Minecraft success.
#>
[CmdletBinding()]
param(
 [string]$OlderStudy = 'V11_CustomBrief_20261117_152121_795_c6437901',
 [string]$NewerStudy = 'V11_CustomBrief_20261117_200728_941_673b2381',
 [switch]$CheckOnly,
 [switch]$SkipSpatial,
 [switch]$NoOpen
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$review = Join-Path $repo 'scripts\r125-v11-review-existing.ps1'
$spatial = Join-Path $repo 'scripts\r125-v11-spatial-art.mjs'
$branch = 'research/r125-v6-readonly-facade-diagnostic-20261111'
foreach ($file in @($review,$spatial)) {
 if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
  throw 'V11_BAKERY_REQUIRED_REVIEW_SOURCE_MISSING'
 }
}
$node = (Get-Command 'node' -ErrorAction Stop).Source
$nodeVersion = (& $node '--version')
$match = [regex]::Match([string]$nodeVersion, '^v([0-9]+)\.')
if ($LASTEXITCODE -ne 0 -or -not $match.Success -or
    [int]$match.Groups[1].Value -lt 20) {
 throw 'V11_BAKERY_NODE_20_REQUIRED'
}
if ($CheckOnly) {
 & $review -CheckOnly -NoOpen
 & $node '--check' $spatial
 if ($LASTEXITCODE -ne 0) { throw 'V11_BAKERY_SPATIAL_SYNTAX_HOLD' }
 Write-Output 'V11_BAKERY_COMPARE_CHECK_ONLY_PASS (no PRIVATE/model/world access)'
 $global:LASTEXITCODE = 0
 return
}
if ($env:OS -cne 'Windows_NT' -or
    [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
 throw 'V11_BAKERY_WINDOWS_PRIVATE_STORE_REQUIRED'
}
$git = (Get-Command 'git' -ErrorAction Stop).Source
$activeBranch = (& $git '-C' $repo 'branch' '--show-current')
if ($LASTEXITCODE -ne 0 -or $activeBranch.Trim() -cne $branch) {
 throw 'V11_BAKERY_PROTECTED_RESEARCH_BRANCH_REQUIRED'
}
$dirty = @(& $git '-C' $repo 'status' '--porcelain' '--untracked-files=no')
if ($LASTEXITCODE -ne 0 -or
    @($dirty | Where-Object { $_ -and $_.Trim() }).Count -gt 0) {
 throw 'V11_BAKERY_DIRTY_TRACKED_CHECKOUT'
}
$base = Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\PrivateModelStudies'
if (-not (Test-Path -LiteralPath $base -PathType Container)) {
 throw 'V11_BAKERY_PRIVATE_STUDIES_NOT_FOUND'
}
$base = (Resolve-Path -LiteralPath $base).Path.TrimEnd('\')
function Get-SavedStudy([string]$name) {
 if ([string]::IsNullOrWhiteSpace($name)) { throw 'V11_BAKERY_STUDY_REQUIRED' }
 $candidate = if ([System.IO.Path]::IsPathRooted($name)) {
  $name
 } else {
  Join-Path $base $name
 }
 $folder = (Resolve-Path -LiteralPath $candidate -ErrorAction Stop).Path
 if (-not $folder.StartsWith($base + '\',
   [System.StringComparison]::OrdinalIgnoreCase) -or
   -not (Test-Path -LiteralPath $folder -PathType Container)) {
  throw 'V11_BAKERY_ONLY_PRIVATE_STUDIES'
 }
 $batchFile = Join-Path $folder 'BATCH_REPORT.json'
 if (-not (Test-Path -LiteralPath $batchFile -PathType Leaf)) {
  throw 'V11_BAKERY_MISSING_BATCH_REPORT'
 }
 $batch = Get-Content -LiteralPath $batchFile -Raw -Encoding UTF8 | ConvertFrom-Json
 $completed = @($batch.completed)
 if ($batch.schema -cne 'r125-local-plan-batch-v1' -or
     [int]$batch.planned -ne 1 -or [int]$batch.attempted -ne 1 -or
     [int]$batch.originalResponseCount -ne 1 -or
     [int]$batch.sourcePassCount -ne 1 -or
     $batch.allSourceVerified -ne $true -or
     [int]$batch.worldWrites -ne 0 -or $completed.Count -ne 1 -or
     $completed[0].sourceVerified -ne $true) {
  throw 'V11_BAKERY_SINGLE_GENUINE_SOURCE_NOT_VERIFIED'
 }
 $id = [string]$completed[0].id
 if ($id -cnotmatch '^[a-z][a-z0-9-]{2,23}$') {
  throw 'V11_BAKERY_INVALID_AUTHOR_ID'
 }
 $one = Join-Path $folder $id
 $raw = Join-Path $one 'MODEL_RESPONSE_ORIGINAL.txt'
 $src = Join-Path $one 'B143_SOURCE_REVIEW_ONLY.json'
 $diagFile = Join-Path $one 'SOURCE_DIAGNOSIS.json'
 foreach ($f in @($raw,$src,$diagFile)) {
  if (-not (Test-Path -LiteralPath $f -PathType Leaf)) {
   throw 'V11_BAKERY_ORIGINAL_SOURCE_DIAGNOSIS_MISSING'
  }
 }
 $diag = Get-Content -LiteralPath $diagFile -Raw -Encoding UTF8 | ConvertFrom-Json
 $rawSha = (Get-FileHash -LiteralPath $raw -Algorithm SHA256).Hash.ToLowerInvariant()
 if ($diag.status -cne 'B143_SOURCE_CANDIDATE_ART_HOLD' -or
     $diag.sourceVerified -ne $true -or
     $diag.originalEdited -ne $false -or
     $diag.originalSha256 -cne $rawSha -or
     $diag.sourceSha256 -cne [string]$completed[0].sourceSha256 -or
     [int]$diag.worldWrites -ne 0) {
  throw 'V11_BAKERY_DIAGNOSIS_OR_AUTHOR_SHA_MISMATCH'
 }
 return [pscustomobject]@{
  folder=$folder; id=$id; one=$one; raw=$raw; source=$src
  diagnostic=$diag; originalSha=$rawSha
  exterior=(Join-Path $one 'STATIC_ART_REVIEW_CONTACT_V1\CONTACT_4_VIEWS.png')
  interior=(Join-Path $one 'STATIC_FLOOR_REVIEW_V1\FLOOR_CONTACT_4_VIEWS.png')
 }
}
$old = Get-SavedStudy $OlderStudy
$new = Get-SavedStudy $NewerStudy
if ($old.folder -ceq $new.folder -or $old.originalSha -ceq $new.originalSha) {
 throw 'V11_BAKERY_TWO_DISTINCT_ORIGINALS_REQUIRED'
}
# The existing review independently compiles and hashes the persisted B143
# source and renders four exterior / four floor views. Do not auto-accept ART.
foreach ($study in @($old,$new)) {
 & $review -StudyDirectory $study.folder -NoOpen | Out-Null
 foreach ($png in @($study.exterior,$study.interior)) {
  if (-not (Test-Path -LiteralPath $png -PathType Leaf)) {
   throw 'V11_BAKERY_REVIEW_IMAGE_NOT_VERIFIED'
  }
 }
}
$spatialImage = ''
$spatialOutcome = 'NOT_REQUESTED'
if (-not $SkipSpatial) {
 $out = Join-Path $new.one 'SPATIAL_ART_V1_COMPARISON'
 $manifest = Join-Path $out 'SPATIAL_ART_REPORT.json'
 if (-not (Test-Path -LiteralPath $out)) {
  & $node $spatial '--raw' $new.raw '--source' $new.source '--out' $out
  if ($LASTEXITCODE -ne 0) {
   $spatialOutcome = 'HOLD_NOT_ART_SUCCESS'
  }
 }
 if (Test-Path -LiteralPath $manifest -PathType Leaf) {
  $studyReport = Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 | ConvertFrom-Json
  $spatialImage = Join-Path $out ($studyReport.photo -replace '/','\')
  $imageSha = if (Test-Path -LiteralPath $spatialImage -PathType Leaf) {
   (Get-FileHash -LiteralPath $spatialImage -Algorithm SHA256).Hash.ToLowerInvariant()
  } else { '' }
  if ($studyReport.status -cne 'SOURCE_VERIFIED_HOST_DERIVED_ART_HOLD' -or
      $studyReport.originalSha256 -cne $new.originalSha -or
      $studyReport.baselineSourceSha256 -cne $new.diagnostic.sourceSha256 -or
      $studyReport.photoSha256 -cne $imageSha -or
      [int]$studyReport.modelCalls -ne 0 -or
      [int]$studyReport.worldWrites -ne 0 -or
      @($studyReport.nineWorldGates | Where-Object { $_ -cne 'BLOCKED' }).Count -ne 0 -or
      @($studyReport.nineWorldGates).Count -ne 9) {
   throw 'V11_BAKERY_SPATIAL_PROVENANCE_HOLD'
  }
  $spatialOutcome = 'HOST_DERIVED_SOURCE_ONLY_ART_HOLD'
 } elseif ($spatialOutcome -ne 'HOLD_NOT_ART_SUCCESS') {
  $spatialOutcome = 'HOLD_INCOMPLETE_LOCAL_STUDY'
 }
}
Write-Output 'V11_BAKERY_COMPARISON=SOURCE_ONLY_NO_MODEL_NO_WORLD'
Write-Output ('OLD_SOURCE_SHA=' + $old.diagnostic.sourceSha256)
Write-Output ('NEW_SOURCE_SHA=' + $new.diagnostic.sourceSha256)
Write-Output ('OLD_EXTERIOR=' + $old.exterior)
Write-Output ('NEW_EXTERIOR=' + $new.exterior)
Write-Output ('OLD_FLOORS=' + $old.interior)
Write-Output ('NEW_FLOORS=' + $new.interior)
Write-Output ('NEW_SPATIAL_STATUS=' + $spatialOutcome)
if ($spatialImage) { Write-Output ('NEW_SPATIAL_AB=' + $spatialImage) }
Write-Output 'ART=HOLD; EDUCATION_REAL=NOT_TESTED; WORLD_WRITES=0'
Write-Output 'NOTE=Different author briefs; visual shortlist only, not same-brief causal A/B.'
if (-not $NoOpen) {
 foreach ($png in @($old.exterior,$new.exterior,$old.interior,
    $new.interior,$spatialImage)) {
  if ($png -and (Test-Path -LiteralPath $png -PathType Leaf)) {
   try { Start-Process -FilePath $png }
   catch { Write-Warning 'V11_BAKERY_IMAGE_OPEN_HOLD_USE_PRINTED_PATH' }
  }
 }
}
$global:LASTEXITCODE = 0

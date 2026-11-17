<#
.SYNOPSIS
  MAB V11: review the already captured one-brief genuine Qwen B143 source.
.DESCRIPTION
  Offline only: 0 model requests, 0 world calls, 0 uploads.
  Finds the newest V11_UnseenSingle_* in LOCALAPPDATA unless -StudyDirectory
  is supplied. Verifies raw and SOURCE hashes against PRIVATE reports and
  generates one 4-view contact sheet. Originals are never overwritten.
#>
[CmdletBinding()]
param(
 [string]$StudyDirectory = '',
 [switch]$CheckOnly,
 [switch]$NoOpen
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$renderer = Join-Path $repo 'scripts\r125-static-art-review.mjs'
$floorRenderer = Join-Path $repo 'scripts\r125-v11-saved-floor-review.mjs'
$finishRenderer = Join-Path $repo 'scripts\r125-v11-finish-art-ab.mjs'
if (-not (Test-Path -LiteralPath $renderer -PathType Leaf)) {
 throw 'V11_ART_RENDERER_MISSING'
}
$node = (Get-Command node -ErrorAction Stop).Source
$versionText = (& $node '--version')
$versionMatch = [regex]::Match([string]$versionText,'^v([0-9]+)\.')
if ($LASTEXITCODE -ne 0 -or -not $versionMatch.Success -or
    [int]$versionMatch.Groups[1].Value -lt 20) {
 throw 'V11_ART_NODE_20_REQUIRED'
}
if ($CheckOnly) {
 & $node '--check' $renderer
 if ($LASTEXITCODE -ne 0) { throw 'V11_ART_SYNTAX_HOLD' }
 & $node '--check' $floorRenderer
 if ($LASTEXITCODE -ne 0) { throw 'V11_ART_FLOOR_SYNTAX_HOLD' }
 & $node '--check' $finishRenderer
 if ($LASTEXITCODE -ne 0) { throw 'V11_ART_FINISH_SYNTAX_HOLD' }
 Write-Output 'V11_ART_CHECK_ONLY_PASS: No PRIVATE access, model, browser or world calls.'
 return
}
if ($env:OS -cne 'Windows_NT') { throw 'V11_ART_WINDOWS_REQUIRED' }
if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
 throw 'V11_ART_LOCALAPPDATA_REQUIRED'
}
$base = Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\PrivateModelStudies'
if (-not (Test-Path -LiteralPath $base -PathType Container)) {
 throw 'V11_ART_PRIVATE_RESULTS_NOT_FOUND'
}
if ([string]::IsNullOrWhiteSpace($StudyDirectory)) {
 $candidates = @(Get-ChildItem -LiteralPath $base -Directory -Filter 'V11_UnseenSingle_*' | Sort-Object LastWriteTime -Descending)
 if ($candidates.Count -lt 1) { throw 'V11_ART_UNSEEN_RESULT_NOT_FOUND' }
 $study = $candidates[0].FullName
} else {
 $study = (Resolve-Path -LiteralPath $StudyDirectory -ErrorAction Stop).Path
}
$basePath = (Resolve-Path -LiteralPath $base).Path.TrimEnd('\')
if (-not $study.StartsWith($basePath + '\',
 [System.StringComparison]::OrdinalIgnoreCase) -or
    -not (Test-Path -LiteralPath $study -PathType Container)) {
 throw 'V11_ART_ONLY_PRIVATE_STUDY_DIRECTORY'
}
$reportFile = Join-Path $study 'BATCH_REPORT.json'
if (-not (Test-Path -LiteralPath $reportFile -PathType Leaf)) {
 throw 'V11_ART_MISSING_BATCH_REPORT'
}
$batch = Get-Content -LiteralPath $reportFile -Raw -Encoding UTF8 | ConvertFrom-Json
$completed = @($batch.completed)
if ($batch.schema -cne 'r125-local-plan-batch-v1' -or
    [int]$batch.planned -ne 1 -or [int]$batch.attempted -ne 1 -or
    [int]$batch.originalResponseCount -ne 1 -or
    [int]$batch.sourcePassCount -ne 1 -or
    $batch.allSourceVerified -ne $true -or
    [int]$batch.worldWrites -ne 0 -or
    $completed.Count -ne 1 -or $completed[0].sourceVerified -ne $true) {
 throw 'V11_ART_NOT_SINGLE_VERIFIED_SOURCE'
}
$id = [string]$completed[0].id
if ($id -cnotmatch '^[a-z][a-z0-9-]{2,23}$') {
 throw 'V11_ART_INVALID_STUDY_ID'
}
$one = Join-Path $study $id
$src = Join-Path $one 'B143_SOURCE_REVIEW_ONLY.json'
$diagFile = Join-Path $one 'SOURCE_DIAGNOSIS.json'
$rawFile = Join-Path $one 'MODEL_RESPONSE_ORIGINAL.txt'
foreach ($file in @($src,$diagFile,$rawFile)) {
 if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
  throw 'V11_ART_ORIGINAL_SOURCE_OR_DIAGNOSIS_MISSING'
 }
}
$diag = Get-Content -LiteralPath $diagFile -Raw -Encoding UTF8 | ConvertFrom-Json
if ($diag.sourceVerified -ne $true -or
    $diag.sourceSha256 -cne $completed[0].sourceSha256 -or
    $diag.geometrySha256 -cne $completed[0].geometrySha256 -or
    [int]$diag.occupiedVoxels -lt 1) {
 throw 'V11_ART_SOURCE_DIAGNOSIS_MISMATCH'
}
$actualOriginalHash = (Get-FileHash -LiteralPath $rawFile -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualOriginalHash -cne [string]$completed[0].originalSha256) {
 throw 'V11_ART_ORIGINAL_SHA_MISMATCH'
}
$out = Join-Path $one 'STATIC_ART_REVIEW_CONTACT_V1'
$contactFile = Join-Path $out 'CONTACT_4_VIEWS.png'
$manifestFile = Join-Path $out 'STATIC_REVIEW.json'
if (-not (Test-Path -LiteralPath $out)) {
 & $node $renderer '--source' $src '--out' $out | Out-Null
 if ($LASTEXITCODE -ne 0) { throw 'V11_ART_OFFLINE_RENDER_FAILED' }
}
if (-not (Test-Path -LiteralPath $manifestFile -PathType Leaf) -or
    -not (Test-Path -LiteralPath $contactFile -PathType Leaf)) {
 throw 'V11_ART_CONTACT_OUTPUT_INCOMPLETE'
}
$manifest = Get-Content -LiteralPath $manifestFile -Raw -Encoding UTF8 | ConvertFrom-Json
$actualImageHash = (Get-FileHash -LiteralPath $contactFile -Algorithm SHA256).Hash.ToLowerInvariant()
if ($manifest.schema -cne 'r125-b143-offline-static-review-v1' -or
    $manifest.sourceSha256 -cne $diag.sourceSha256 -or
    $manifest.geometrySha256 -cne $diag.geometrySha256 -or
    [int]$manifest.occupiedVoxels -ne [int]$diag.occupiedVoxels -or
    $manifest.contactSheet.sha256 -cne $actualImageHash -or
    [int]$manifest.modelCalls -ne 0 -or [int]$manifest.worldWrites -ne 0) {
 throw 'V11_ART_STATIC_MANIFEST_MISMATCH'
}
# Provide both floors of the SAME saved author and show missing Education
# material attestations, without modifying the existing contact or original.
$floorOut = Join-Path $one 'STATIC_FLOOR_REVIEW_V1'
$floorPNG = Join-Path $floorOut 'FLOOR_CONTACT_4_VIEWS.png'
$floorJSON = Join-Path $floorOut 'FLOOR_REVIEW.json'
if (-not (Test-Path -LiteralPath $floorOut)) {
 & $node $floorRenderer '--raw' $rawFile '--source' $src '--diagnosis' $diagFile '--out' $floorOut | Out-Null
 if ($LASTEXITCODE -ne 0) { throw 'V11_ART_FLOOR_GENERATION_HOLD' }
}
if (-not (Test-Path -LiteralPath $floorPNG -PathType Leaf) -or
    -not (Test-Path -LiteralPath $floorJSON -PathType Leaf)) {
 throw 'V11_ART_FLOOR_OUTPUT_MISSING'
}
$floorReport = Get-Content -LiteralPath $floorJSON -Raw -Encoding UTF8 | ConvertFrom-Json
$floorSHA = (Get-FileHash -LiteralPath $floorPNG -Algorithm SHA256).Hash.ToLowerInvariant()
if ($floorReport.originalSha256 -cne $actualOriginalHash -or
    $floorReport.sourceSha256 -cne $diag.sourceSha256 -or
    $floorReport.geometrySha256 -cne $diag.geometrySha256 -or
    $floorReport.contact.sha256 -cne $floorSHA -or
    [int]$floorReport.modelCalls -ne 0 -or [int]$floorReport.worldWrites -ne 0) {
 throw 'V11_ART_FLOOR_PROVENANCE_HOLD'
}
# Source-gated same-model ART A/B. Any unsupported activity policy is
# logged as HOLD without hiding the original two-floor evidence.
$finishOut = Join-Path $one 'FINISH_ART_AB_V1'
$finishJSON = Join-Path $finishOut 'FINISH_AB_REPORT.json'
$finishPNG = Join-Path $finishOut 'ART_AB\AB_OLD_LEFT_NEW_RIGHT.png'
if (-not (Test-Path -LiteralPath $finishOut)) {
 & $node $finishRenderer '--raw' $rawFile '--source' $src '--out' $finishOut
 if ($LASTEXITCODE -ne 0) {
  Write-Output 'V11_FINISH_ART_HOLD_SOURCE_POLICY_NOT_PASSED'
 }
}
if (Test-Path -LiteralPath $finishJSON -PathType Leaf) {
 $finishReport = Get-Content -LiteralPath $finishJSON -Raw -Encoding UTF8 | ConvertFrom-Json
 if ($finishReport.originalSha256 -cne $actualOriginalHash -or
     $finishReport.baselineSourceSha256 -cne $diag.sourceSha256 -or
     $finishReport.photoSha256 -cne (Get-FileHash -LiteralPath $finishPNG -Algorithm SHA256).Hash.ToLowerInvariant() -or
     [int]$finishReport.modelCalls -ne 0 -or
     [int]$finishReport.worldWrites -ne 0) {
  throw 'V11_FINISH_ART_PROVENANCE_HOLD'
 }
 Write-Output ('V11_FINISH_ART_AB=' + $finishPNG)
 Write-Output ('V11_FINISH_ART_UNVERIFIED=' + ($finishReport.educationMaterials.unverified -join ','))
}
Write-Output ('V11_ART_FLOORS=' + $floorPNG)
Write-Output ('V11_ART_EDUCATION_UNVERIFIED=' + ($floorReport.educationMaterials.unverified -join ','))
Write-Output ('V11_ART_RESULT=' + $out)
Write-Output ('V11_ART_CONTACT=' + $contactFile)
Write-Output ('V11_ART_VOXELS=' + $manifest.occupiedVoxels)
Write-Output 'V11_ART_REVIEW_PENDING. No model, Minecraft or upload performed.'
if (-not $NoOpen) {
 try { Start-Process -FilePath $floorPNG; if (Test-Path -LiteralPath $finishPNG -PathType Leaf) { Start-Process -FilePath $finishPNG } }
 catch { Write-Warning 'V11_ART_OPEN_PNG_FAILED_USE_PRINTED_PATH' }
}

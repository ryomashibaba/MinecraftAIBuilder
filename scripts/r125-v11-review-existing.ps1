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
 [switch]$NoOpen,
 [switch]$RidgeContrast,
 [switch]$ActivityInlays
)
$ErrorActionPreference = 'Stop'
# Avoid Get-FileHash, unavailable in the user's PS5.1 environment.
# Exact SHA-256 via .NET's built-in cryptography implementation.
function Get-V11Sha256([string]$FilePath) {
 if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
  throw 'V11_ART_SHA_INPUT_NOT_FOUND'
 }
 $stream = [System.IO.File]::Open($FilePath,[System.IO.FileMode]::Open,
  [System.IO.FileAccess]::Read,[System.IO.FileShare]::Read)
 $sha = [System.Security.Cryptography.SHA256]::Create()
 try {
  return [System.BitConverter]::ToString(
   $sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant()
 } finally {
  $sha.Dispose()
  $stream.Dispose()
 }
}
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
 # Exercise SHA code in Windows CI, without accessing PRIVATE results.
 $selfHash=Get-V11Sha256 $PSCommandPath
 if ($selfHash -cnotmatch '^[0-9a-f]{64}
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
if (($RidgeContrast -or $ActivityInlays) -and
    [string]::IsNullOrWhiteSpace($StudyDirectory)) {
 $StudyDirectory = Join-Path $base 'V11_CustomBrief_20261117_200728_941_673b2381'
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
$actualOriginalHash = (Get-V11Sha256 $rawFile)
if (($RidgeContrast -or $ActivityInlays) -and $actualOriginalHash -cne
 '2cd969f87d3efdf767d514f1c0c4e45663afcd91f84631887b71f07fc4d67a72') {
 throw 'V11_RIDGE_1117_AUTHOR_SHA_MISMATCH'
}
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
$actualImageHash = (Get-V11Sha256 $contactFile)
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
$floorSHA = (Get-V11Sha256 $floorPNG)
if ($floorReport.originalSha256 -cne $actualOriginalHash -or
    $floorReport.sourceSha256 -cne $diag.sourceSha256 -or
    $floorReport.geometrySha256 -cne $diag.geometrySha256 -or
    $floorReport.contact.sha256 -cne $floorSHA -or
    [int]$floorReport.modelCalls -ne 0 -or [int]$floorReport.worldWrites -ne 0) {
 throw 'V11_ART_FLOOR_PROVENANCE_HOLD'
}
# Source-gated same-model ART A/B. Any unsupported activity policy is
# logged as HOLD without hiding the original two-floor evidence.
$finishOut = Join-Path $one 'FIXTURE_FORM_ART_AB'
$finishJSON = Join-Path $finishOut 'FINISH_AB_REPORT.json'
$finishPNG = Join-Path $finishOut 'ART_AB\AB_OLD_LEFT_NEW_RIGHT.png'
if (-not (Test-Path -LiteralPath $finishOut)) {
 & $node $finishRenderer '--raw' $rawFile '--source' $src '--out' $finishOut
 if ($LASTEXITCODE -ne 0) {
  Write-Output 'V11_FINISH_ART_HOLD_SOURCE_POLICY_NOT_PASSED'
 }
} elseif (-not (Test-Path -LiteralPath $finishJSON -PathType Leaf)) {
 Write-Output 'V11_FINISH_ART_HOLD_INCOMPLETE_PREVIOUS_OUTPUT'
}
if (Test-Path -LiteralPath $finishJSON -PathType Leaf) {
 $finishReport = Get-Content -LiteralPath $finishJSON -Raw -Encoding UTF8 | ConvertFrom-Json
 if ($finishReport.originalSha256 -cne $actualOriginalHash -or
     $finishReport.baselineSourceSha256 -cne $diag.sourceSha256 -or
     $finishReport.photoSha256 -cne (Get-V11Sha256 $finishPNG) -or
     [int]$finishReport.modelCalls -ne 0 -or
     [int]$finishReport.worldWrites -ne 0) {
  throw 'V11_FINISH_ART_PROVENANCE_HOLD'
 }
 Write-Output ('V11_FIXTURE_FORM_ART_AB=' + $finishPNG)
 Write-Output ('V11_FINISH_ART_UNVERIFIED=' + ($finishReport.educationMaterials.unverified -join ','))
}
$roofPNG = ''
if ($RidgeContrast) {
 # Existing strict JS checks original archived B143 and the two SOURCEs.
 $roofOut = Join-Path $one 'RIDGE_MATCHED_CAMERA_ROOM_SCALE_V2_AB'
 $roofManifest = Join-Path $roofOut 'RIDGE_ONLY_AB_REPORT.json'
 if (-not (Test-Path -LiteralPath $roofOut)) {
  & $node $finishRenderer '--raw' $rawFile '--source' $src '--out' $roofOut '--roof-contrast-v2' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'V11_RIDGE_AB_SOURCE_OR_GEOMETRY_HOLD' }
 }
 if (-not (Test-Path -LiteralPath $roofManifest -PathType Leaf)) {
  throw 'V11_RIDGE_AB_INCOMPLETE_OUTPUT_HOLD'
 }
 $roof = Get-Content -LiteralPath $roofManifest -Raw -Encoding UTF8 | ConvertFrom-Json
 $roofPNG = Join-Path $roofOut 'ART_AB\AB_OLD_LEFT_NEW_RIGHT.png'
 if (-not (Test-Path -LiteralPath $roofPNG -PathType Leaf)) {
  throw 'V11_RIDGE_AB_PREVIEW_MISSING'
 }
 $imageHash = (Get-V11Sha256 $roofPNG)
 if ($roof.schema -cne 'r125-v11-room-scale-v2-ridge-only-contrast-v1' -or
     $roof.originalSha256 -cne $actualOriginalHash -or
     $roof.archivedSourceSha256 -cne $diag.sourceSha256 -or
     $roof.policyA.fixtureForm -cne 'room-scale-v2' -or
     $roof.policyB.fixtureForm -cne 'room-scale-v2' -or
     $roof.policyB.roofMassing -cne 'steep-ridge-review' -or
     $roof.sourceVerifiedA -ne $true -or $roof.sourceVerifiedB -ne $true -or
     $roof.belowRoofGeometryAndMaterialIdentical -ne $true -or
     [int]$roof.changedRoofCells -le 0 -or
     [int]$roof.fixtureCountA -ne [int]$diag.modelChosenFixtures -or
     [int]$roof.fixtureCountB -ne [int]$diag.modelChosenFixtures -or
     $roof.sourceSha256A -ceq $roof.sourceSha256B -or
     $roof.modelOriginalUnchanged -ne $true -or
     $roof.photo -cne 'ART_AB/AB_OLD_LEFT_NEW_RIGHT.png' -or
     $roof.photoPhysicalScale -cne 'PAIRED_SAME_PIXELS_PER_BLOCK_AND_CENTER' -or
     $roof.photoSha256 -cne $imageHash -or
     [int]$roof.modelCalls -ne 0 -or [int]$roof.worldWrites -ne 0 -or
     @($roof.nineWorldGates).Count -ne 9 -or
     @($roof.nineWorldGates | Where-Object { $_ -cne 'BLOCKED' }).Count -ne 0 -or
     $roof.art -cne 'NOT_HUMAN_REVIEWED' -or
     $roof.education -cne 'NOT_TESTED') {
  throw 'V11_RIDGE_AB_SHA_OR_POLICY_HOLD'
 }
 Write-Output 'V11_RIDGE_AB_SOURCE_PASS_NOT_ART'
 Write-Output ('V11_RIDGE_AB_REPORT=' + $roofManifest)
 Write-Output ('V11_RIDGE_AB_IMAGE=' + $roofPNG)
 Write-Output ('V11_RIDGE_AB_CHANGED_ROOF_CELLS=' + [string]$roof.changedRoofCells)
 Write-Output 'V11_RIDGE_AB_EDUCATION_AND_MINECRAFT=NOT_TESTED'
}

$activityPNG=''
if ($ActivityInlays) {
 # Same genuine Qwen original, SAME v2 stations, material-only zone cues.
 $activityOut=Join-Path $one 'ACTIVITY_FLOOR_ONLY_V2_AB'
 $activityJSON=Join-Path $activityOut 'FINISH_AB_REPORT.json'
 if (-not (Test-Path -LiteralPath $activityOut)) {
  & $node $finishRenderer '--raw' $rawFile '--source' $src '--out' $activityOut '--activity-inlays-v2' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'V11_ACTIVITY_INLAY_SOURCE_HOLD' }
 }
 if (-not (Test-Path -LiteralPath $activityJSON -PathType Leaf)) {
  throw 'V11_ACTIVITY_INLAY_INCOMPLETE_HOLD'
 }
 $activity=Get-Content -LiteralPath $activityJSON -Raw -Encoding UTF8 | ConvertFrom-Json
 $activityPNG=Join-Path $activityOut 'ART_AB\AB_OLD_LEFT_NEW_RIGHT.png'
 if (-not (Test-Path -LiteralPath $activityPNG -PathType Leaf)) {
  throw 'V11_ACTIVITY_INLAY_MISSING_PNG'
 }
 $imgHash=(Get-V11Sha256 $activityPNG)
 if ($activity.contrast -cne 'SAME_MODEL_SAME_STATIONS_INLAY_FLOOR_ONLY' -or
     $activity.originalSha256 -cne $actualOriginalHash -or
     $activity.archivedSourceSha256 -cne $diag.sourceSha256 -or
     $activity.unchangedOccupancy -ne $true -or
     [int]$activity.changedFloorMaterialCells -lt 1 -or
     $activity.physicalScale -cne 'PAIRED_SAME_PIXELS_PER_BLOCK_AND_CENTER' -or
     $activity.candidatePolicy.fixtureArt -cne 'activity-layout-inlays' -or
     $activity.policy.fixtureForm -cne 'room-scale-v2' -or
     $activity.photoSha256 -cne $imgHash -or
     $activity.originalAuthorUnchanged -ne $true -or
     [int]$activity.modelCalls -ne 0 -or [int]$activity.worldWrites -ne 0 -or
     @($activity.nineWorldGates).Count -ne 9 -or
     @($activity.nineWorldGates | Where-Object { $_ -cne 'BLOCKED' }).Count -ne 0) {
  throw 'V11_ACTIVITY_INLAY_SHA_OR_SOURCE_HOLD'
 }
 Write-Output 'V11_ACTIVITY_INLAY_SOURCE_AB_PASS_NOT_ART'
 Write-Output ('V11_ACTIVITY_INLAY_PNG=' + $activityPNG)
 Write-Output ('V11_ACTIVITY_INLAY_REPORT=' + $activityJSON)
}
Write-Output ('V11_ART_FLOORS=' + $floorPNG)
Write-Output ('V11_ART_EDUCATION_UNVERIFIED=' + ($floorReport.educationMaterials.unverified -join ','))
Write-Output ('V11_ART_RESULT=' + $out)
Write-Output ('V11_ART_CONTACT=' + $contactFile)
Write-Output ('V11_ART_VOXELS=' + $manifest.occupiedVoxels)
Write-Output 'V11_ART_REVIEW_PENDING. No model, Minecraft or upload performed.'
if (-not $NoOpen) {
 try { if ($RidgeContrast) { Start-Process -FilePath $roofPNG }; if ($ActivityInlays) { Start-Process -FilePath $activityPNG }; Start-Process -FilePath $floorPNG; if (Test-Path -LiteralPath $finishPNG -PathType Leaf) { Start-Process -FilePath $finishPNG } }
 catch { Write-Warning 'V11_ART_OPEN_PNG_FAILED_USE_PRINTED_PATH' }
}
# Optional ART HOLD is a valid reviewed outcome. All mandatory validation
# already threw on failure; never leak the last child node status to caller.
$global:LASTEXITCODE = 0
) {
  throw 'V11_ART_DOTNET_SHA256_CHECK_ONLY_HOLD'
 }
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
if (($RidgeContrast -or $ActivityInlays) -and
    [string]::IsNullOrWhiteSpace($StudyDirectory)) {
 $StudyDirectory = Join-Path $base 'V11_CustomBrief_20261117_200728_941_673b2381'
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
$actualOriginalHash = (Get-V11Sha256 $rawFile)
if (($RidgeContrast -or $ActivityInlays) -and $actualOriginalHash -cne
 '2cd969f87d3efdf767d514f1c0c4e45663afcd91f84631887b71f07fc4d67a72') {
 throw 'V11_RIDGE_1117_AUTHOR_SHA_MISMATCH'
}
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
$actualImageHash = (Get-V11Sha256 $contactFile)
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
$floorSHA = (Get-V11Sha256 $floorPNG)
if ($floorReport.originalSha256 -cne $actualOriginalHash -or
    $floorReport.sourceSha256 -cne $diag.sourceSha256 -or
    $floorReport.geometrySha256 -cne $diag.geometrySha256 -or
    $floorReport.contact.sha256 -cne $floorSHA -or
    [int]$floorReport.modelCalls -ne 0 -or [int]$floorReport.worldWrites -ne 0) {
 throw 'V11_ART_FLOOR_PROVENANCE_HOLD'
}
# Source-gated same-model ART A/B. Any unsupported activity policy is
# logged as HOLD without hiding the original two-floor evidence.
$finishOut = Join-Path $one 'FIXTURE_FORM_ART_AB'
$finishJSON = Join-Path $finishOut 'FINISH_AB_REPORT.json'
$finishPNG = Join-Path $finishOut 'ART_AB\AB_OLD_LEFT_NEW_RIGHT.png'
if (-not (Test-Path -LiteralPath $finishOut)) {
 & $node $finishRenderer '--raw' $rawFile '--source' $src '--out' $finishOut
 if ($LASTEXITCODE -ne 0) {
  Write-Output 'V11_FINISH_ART_HOLD_SOURCE_POLICY_NOT_PASSED'
 }
} elseif (-not (Test-Path -LiteralPath $finishJSON -PathType Leaf)) {
 Write-Output 'V11_FINISH_ART_HOLD_INCOMPLETE_PREVIOUS_OUTPUT'
}
if (Test-Path -LiteralPath $finishJSON -PathType Leaf) {
 $finishReport = Get-Content -LiteralPath $finishJSON -Raw -Encoding UTF8 | ConvertFrom-Json
 if ($finishReport.originalSha256 -cne $actualOriginalHash -or
     $finishReport.baselineSourceSha256 -cne $diag.sourceSha256 -or
     $finishReport.photoSha256 -cne (Get-V11Sha256 $finishPNG) -or
     [int]$finishReport.modelCalls -ne 0 -or
     [int]$finishReport.worldWrites -ne 0) {
  throw 'V11_FINISH_ART_PROVENANCE_HOLD'
 }
 Write-Output ('V11_FIXTURE_FORM_ART_AB=' + $finishPNG)
 Write-Output ('V11_FINISH_ART_UNVERIFIED=' + ($finishReport.educationMaterials.unverified -join ','))
}
$roofPNG = ''
if ($RidgeContrast) {
 # Existing strict JS checks original archived B143 and the two SOURCEs.
 $roofOut = Join-Path $one 'RIDGE_MATCHED_CAMERA_ROOM_SCALE_V2_AB'
 $roofManifest = Join-Path $roofOut 'RIDGE_ONLY_AB_REPORT.json'
 if (-not (Test-Path -LiteralPath $roofOut)) {
  & $node $finishRenderer '--raw' $rawFile '--source' $src '--out' $roofOut '--roof-contrast-v2' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'V11_RIDGE_AB_SOURCE_OR_GEOMETRY_HOLD' }
 }
 if (-not (Test-Path -LiteralPath $roofManifest -PathType Leaf)) {
  throw 'V11_RIDGE_AB_INCOMPLETE_OUTPUT_HOLD'
 }
 $roof = Get-Content -LiteralPath $roofManifest -Raw -Encoding UTF8 | ConvertFrom-Json
 $roofPNG = Join-Path $roofOut 'ART_AB\AB_OLD_LEFT_NEW_RIGHT.png'
 if (-not (Test-Path -LiteralPath $roofPNG -PathType Leaf)) {
  throw 'V11_RIDGE_AB_PREVIEW_MISSING'
 }
 $imageHash = (Get-V11Sha256 $roofPNG)
 if ($roof.schema -cne 'r125-v11-room-scale-v2-ridge-only-contrast-v1' -or
     $roof.originalSha256 -cne $actualOriginalHash -or
     $roof.archivedSourceSha256 -cne $diag.sourceSha256 -or
     $roof.policyA.fixtureForm -cne 'room-scale-v2' -or
     $roof.policyB.fixtureForm -cne 'room-scale-v2' -or
     $roof.policyB.roofMassing -cne 'steep-ridge-review' -or
     $roof.sourceVerifiedA -ne $true -or $roof.sourceVerifiedB -ne $true -or
     $roof.belowRoofGeometryAndMaterialIdentical -ne $true -or
     [int]$roof.changedRoofCells -le 0 -or
     [int]$roof.fixtureCountA -ne [int]$diag.modelChosenFixtures -or
     [int]$roof.fixtureCountB -ne [int]$diag.modelChosenFixtures -or
     $roof.sourceSha256A -ceq $roof.sourceSha256B -or
     $roof.modelOriginalUnchanged -ne $true -or
     $roof.photo -cne 'ART_AB/AB_OLD_LEFT_NEW_RIGHT.png' -or
     $roof.photoPhysicalScale -cne 'PAIRED_SAME_PIXELS_PER_BLOCK_AND_CENTER' -or
     $roof.photoSha256 -cne $imageHash -or
     [int]$roof.modelCalls -ne 0 -or [int]$roof.worldWrites -ne 0 -or
     @($roof.nineWorldGates).Count -ne 9 -or
     @($roof.nineWorldGates | Where-Object { $_ -cne 'BLOCKED' }).Count -ne 0 -or
     $roof.art -cne 'NOT_HUMAN_REVIEWED' -or
     $roof.education -cne 'NOT_TESTED') {
  throw 'V11_RIDGE_AB_SHA_OR_POLICY_HOLD'
 }
 Write-Output 'V11_RIDGE_AB_SOURCE_PASS_NOT_ART'
 Write-Output ('V11_RIDGE_AB_REPORT=' + $roofManifest)
 Write-Output ('V11_RIDGE_AB_IMAGE=' + $roofPNG)
 Write-Output ('V11_RIDGE_AB_CHANGED_ROOF_CELLS=' + [string]$roof.changedRoofCells)
 Write-Output 'V11_RIDGE_AB_EDUCATION_AND_MINECRAFT=NOT_TESTED'
}

$activityPNG=''
if ($ActivityInlays) {
 # Same genuine Qwen original, SAME v2 stations, material-only zone cues.
 $activityOut=Join-Path $one 'ACTIVITY_FLOOR_ONLY_V2_AB'
 $activityJSON=Join-Path $activityOut 'FINISH_AB_REPORT.json'
 if (-not (Test-Path -LiteralPath $activityOut)) {
  & $node $finishRenderer '--raw' $rawFile '--source' $src '--out' $activityOut '--activity-inlays-v2' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'V11_ACTIVITY_INLAY_SOURCE_HOLD' }
 }
 if (-not (Test-Path -LiteralPath $activityJSON -PathType Leaf)) {
  throw 'V11_ACTIVITY_INLAY_INCOMPLETE_HOLD'
 }
 $activity=Get-Content -LiteralPath $activityJSON -Raw -Encoding UTF8 | ConvertFrom-Json
 $activityPNG=Join-Path $activityOut 'ART_AB\AB_OLD_LEFT_NEW_RIGHT.png'
 if (-not (Test-Path -LiteralPath $activityPNG -PathType Leaf)) {
  throw 'V11_ACTIVITY_INLAY_MISSING_PNG'
 }
 $imgHash=(Get-V11Sha256 $activityPNG)
 if ($activity.contrast -cne 'SAME_MODEL_SAME_STATIONS_INLAY_FLOOR_ONLY' -or
     $activity.originalSha256 -cne $actualOriginalHash -or
     $activity.archivedSourceSha256 -cne $diag.sourceSha256 -or
     $activity.unchangedOccupancy -ne $true -or
     [int]$activity.changedFloorMaterialCells -lt 1 -or
     $activity.physicalScale -cne 'PAIRED_SAME_PIXELS_PER_BLOCK_AND_CENTER' -or
     $activity.candidatePolicy.fixtureArt -cne 'activity-layout-inlays' -or
     $activity.policy.fixtureForm -cne 'room-scale-v2' -or
     $activity.photoSha256 -cne $imgHash -or
     $activity.originalAuthorUnchanged -ne $true -or
     [int]$activity.modelCalls -ne 0 -or [int]$activity.worldWrites -ne 0 -or
     @($activity.nineWorldGates).Count -ne 9 -or
     @($activity.nineWorldGates | Where-Object { $_ -cne 'BLOCKED' }).Count -ne 0) {
  throw 'V11_ACTIVITY_INLAY_SHA_OR_SOURCE_HOLD'
 }
 Write-Output 'V11_ACTIVITY_INLAY_SOURCE_AB_PASS_NOT_ART'
 Write-Output ('V11_ACTIVITY_INLAY_PNG=' + $activityPNG)
 Write-Output ('V11_ACTIVITY_INLAY_REPORT=' + $activityJSON)
}
Write-Output ('V11_ART_FLOORS=' + $floorPNG)
Write-Output ('V11_ART_EDUCATION_UNVERIFIED=' + ($floorReport.educationMaterials.unverified -join ','))
Write-Output ('V11_ART_RESULT=' + $out)
Write-Output ('V11_ART_CONTACT=' + $contactFile)
Write-Output ('V11_ART_VOXELS=' + $manifest.occupiedVoxels)
Write-Output 'V11_ART_REVIEW_PENDING. No model, Minecraft or upload performed.'
if (-not $NoOpen) {
 try { if ($RidgeContrast) { Start-Process -FilePath $roofPNG }; if ($ActivityInlays) { Start-Process -FilePath $activityPNG }; Start-Process -FilePath $floorPNG; if (Test-Path -LiteralPath $finishPNG -PathType Leaf) { Start-Process -FilePath $finishPNG } }
 catch { Write-Warning 'V11_ART_OPEN_PNG_FAILED_USE_PRINTED_PATH' }
}
# Optional ART HOLD is a valid reviewed outcome. All mandatory validation
# already threw on failure; never leak the last child node status to caller.
$global:LASTEXITCODE = 0

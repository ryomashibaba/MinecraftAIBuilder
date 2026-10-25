# R157 one-click local Qwen/Gemma genuine three-use study + strict provenance ZIP.
# ALL inference is localhost via unchanged R134. No Minecraft/world writes.
param([string]$Model = 'qwen3:14b')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$branch = 'feature/b198zr1-protected-architectural-revision'
$repo = Split-Path -Parent $PSScriptRoot
Push-Location $repo
try {
    if (-not (Test-Path '.git')) { throw 'R157_HOLD_NOT_GIT_REPOSITORY' }
    $current = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $current -ne $branch) {
        throw "R157_HOLD_WRONG_BRANCH: $current"
    }
    & git diff --quiet
    if ($LASTEXITCODE -ne 0) { throw 'R157_HOLD_DIRTY_TRACKED_WORK' }
    & git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) { throw 'R157_HOLD_STAGED_WORK' }
    & git pull --ff-only origin $branch
    if ($LASTEXITCODE -ne 0) { throw 'R157_HOLD_FF_ONLY_FAILED' }
    $head = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'R157_HOLD_UNKNOWN_HEAD' }
    $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ')
    $folder = "r157-unknown-use-$stamp"
    $archive = "$folder.zip"
    if ((Test-Path $folder) -or (Test-Path $archive)) {
        throw 'R157_HOLD_OUTPUT_COLLISION'
    }
    Write-Host "R157: THREE new local Ollama trials with model $Model."
    Write-Host 'The same B143 compiler handles home, shop and laboratory.'
    & node scripts/r156-unknown-use-study.mjs --model $Model --architecture topology --out $folder
    $studyExit = $LASTEXITCODE
    $studyFile = Join-Path $folder 'R156_STUDY_MANIFEST.json'
    $reviewExit = 2
    $independentExit = 2
    if (Test-Path $studyFile) {
        & node scripts/r157-comparative-review.mjs --study $folder
        $reviewExit = $LASTEXITCODE
        & node scripts/r165-local-model-architecture-audit.mjs --study $folder
        $independentExit = $LASTEXITCODE
    }
    if (-not (Test-Path $folder)) {
        throw "R157_HOLD_NO_EVIDENCE_FOLDER (nodeExit=$studyExit)"
    }
    $summary = $null
    $review = $null
    if (Test-Path $studyFile) {
        $summary = Get-Content $studyFile -Raw | ConvertFrom-Json
    }
    $independent = $null
    $independentFile = Join-Path $folder 'R165_INDEPENDENT_AUDIT.json'
    if (Test-Path $independentFile) {
        $independent = Get-Content $independentFile -Raw | ConvertFrom-Json
    }
    $reviewFile = Join-Path $folder 'R157_SPATIAL_AUDIT.json'
    if (Test-Path $reviewFile) {
        $review = Get-Content $reviewFile -Raw | ConvertFrom-Json
    }
    $provenance = [ordered]@{
        schema = 'minecraftaibuilder-r157-user-local-evidence-bundle-v1'
        commit = $head
        branch = $branch
        requestedModel = $Model
        inferenceHost = '127.0.0.1'
        expectedIndependentUseCalls = 3
        recordedUseResults = if ($null -ne $summary) { @($summary.cases).Count } else { 0 }
        studyStatus = if ($null -ne $summary) { $summary.status } else { 'HOLD_STUDY_MANIFEST_MISSING' }
        spatialStatus = if ($null -ne $review) { $review.status } else { 'HOLD_SPATIAL_AUDIT_MISSING' }
        nodeExit = $studyExit
        spatialReviewExit = $reviewExit
        independent3dReviewExit = $independentExit
        independent3dStatus = if ($null -ne $independent) { $independent.status } else { 'HOLD_NO_R165_3D_REVIEW' }
        independentB143Cases = if ($null -ne $independent) { $independent.geometryEvidenceCases } else { 0 }
        archiveContainsRawOriginalsIfCaptured = $true
        modelProvenance = 'LOCAL_HTTP_PROVIDER_UNATTESTED'
        artReview = 'ART_HOLD'
        minecraftWalking = 'NOT_TESTED'
        readiness = 'NOT_PREPARED'
        constructionApproved = $false
        executionAllowed = $false
        gates = @('BLOCKED','BLOCKED','BLOCKED','BLOCKED','BLOCKED',
                  'BLOCKED','BLOCKED','BLOCKED','BLOCKED')
        BuildPlan = @{ operations = @() }
        worldContacts = 0
        worldWrites = 0
    }
    $provenance | ConvertTo-Json -Depth 8 |
        Set-Content (Join-Path $folder 'R157_BUNDLE_PROVENANCE.json') -Encoding UTF8
    Compress-Archive -Path $folder -DestinationPath $archive -CompressionLevel Optimal
    if (-not (Test-Path $archive)) { throw 'R157_HOLD_NO_ARCHIVE' }
    Write-Host ''
    Write-Host "R157_STUDY_STATUS: $($provenance.studyStatus)"
    Write-Host "R157_SPATIAL_STATUS: $($provenance.spatialStatus)"
    Write-Host "R165_REAL_B143_STATUS: $($provenance.independent3dStatus)"
    Write-Host "REVIEW_HTML: $(Join-Path $repo (Join-Path $folder 'R157_COMPARE.html'))"
    Write-Host "REAL_3D_AUDIT_HTML: $(Join-Path $repo (Join-Path $folder 'R165_COMPARE.html'))"
    Write-Host "EVIDENCE_ZIP: $(Join-Path $repo $archive)"
    Write-Host 'Minecraft world operations: ZERO. ART HOLD.'
    if ($studyExit -ne 0 -or $reviewExit -ne 0 -or $independentExit -ne 0) {
        Write-Warning 'Partial evidence/HOLD preserved. No automatic model retries.'
    }
} finally {
    Pop-Location
}

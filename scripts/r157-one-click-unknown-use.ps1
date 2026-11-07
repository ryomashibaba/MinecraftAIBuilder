# R157 one-click local Qwen/Gemma genuine three-use study + strict provenance ZIP.
# ALL inference is localhost via unchanged R134. No Minecraft/world writes.
param([string]$Model = '', [switch]$Fresh, [switch]$ReuseOnly)
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
    if ($Fresh -and $ReuseOnly) { throw 'R166_HOLD_INCOMPATIBLE_FRESH_AND_REUSE_ONLY' }
    # R166: preferentially inspect saved local model results (no new model calls).
    # -Fresh forces three fresh requests, -Model limits reuse to that exact tag.
    $existing = $null
    $existingManifest = $null
    if (-not $Fresh) {
        $candidates = @(Get-ChildItem -LiteralPath $repo -Directory -Filter 'r157-unknown-use-*' |
            Sort-Object LastWriteTimeUtc -Descending)
        foreach ($candidate in $candidates) {
            $manifestFile = Join-Path $candidate.FullName 'R156_STUDY_MANIFEST.json'
            if (-not (Test-Path -LiteralPath $manifestFile)) { continue }
            try { $manifest = Get-Content -LiteralPath $manifestFile -Raw -Encoding UTF8 | ConvertFrom-Json }
            catch { continue }
            if ($manifest.schema -ne 'r156-unknown-use-v1' -or
                $manifest.architectureMode -ne 'topology' -or
                $manifest.injectedFakeHttp -ne $false -or
                @($manifest.cases).Count -ne 3) { continue }
            if ($Model -and $manifest.model -ne $Model) { continue }
            $existing = $candidate
            $existingManifest = $manifest
            break
        }
    }
    $reusedStudy = $null -ne $existing
    if ($ReuseOnly -and -not $reusedStudy) {
        throw 'R166_HOLD_NO_REUSABLE_EVIDENCE_NO_MODEL_CALLS'
    }
    if ($reusedStudy) {
        $folder = $existing.Name
        $archive = "$folder.zip"
        $Model = [string]$existingManifest.model
        $studyExit = 0
        Write-Host "R166: saved $folder ($Model) selected, no new inference."
        Write-Host 'To request new model output instead, pass -Fresh.'
    } else {
        # Check only localhost. Never create an evidence directory if Ollama/model
        # is absent; never pull/download a model or silently change an explicit tag.
        try {
            $ollamaTags = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -Method Get -TimeoutSec 10 -ErrorAction Stop
        } catch {
            throw 'R166_HOLD_LOCAL_OLLAMA_NOT_AVAILABLE'
        }
        $installed = @($ollamaTags.models | ForEach-Object { $_.name } |
            Where-Object { $_ -is [string] -and $_ -match '^[A-Za-z0-9._:/-]{2,140}$' })
        if (-not $Model) {
            foreach ($name in @('qwen3:14b','qwen3.8:27b','gemma4:26b','qwen3.5:4b','gemma4:e4b')) {
                if ($installed -contains $name) { $Model = $name; break }
            }
            if (-not $Model) {
                $alternatives = @($installed | Where-Object { $_ -match '^(qwen|gemma)' } | Sort-Object)
                if ($alternatives.Count -gt 0) { $Model = [string]$alternatives[0] }
            }
        }
        if (-not $Model -or $installed -notcontains $Model) {
            throw "R166_HOLD_MODEL_NOT_INSTALLED: requested=$Model; available=$($installed -join ',')"
        }
        $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ')
        $folder = "r157-unknown-use-$stamp"
        $archive = "$folder.zip"
        if ((Test-Path $folder) -or (Test-Path $archive)) { throw 'R157_HOLD_OUTPUT_COLLISION' }
        Write-Host "R166: three new local Ollama trials with installed model $Model."
        Write-Host 'Same B143 generator: home, shop, laboratory; no Minecraft writes.'
        & node scripts/r156-unknown-use-study.mjs --model $Model --architecture topology --out $folder
        $studyExit = $LASTEXITCODE
    }
    $studyFile = Join-Path $folder 'R156_STUDY_MANIFEST.json'
    $reviewExit = 2
    $independentExit = 2
    $newReviewFiles = $false
    if (Test-Path $studyFile) {
        if (Test-Path (Join-Path $folder 'R157_SPATIAL_AUDIT.json')) {
            $reviewExit = 0
            Write-Host 'R166: existing R157 review preserved.'
        } else {
            & node scripts/r157-comparative-review.mjs --study $folder
            $reviewExit = $LASTEXITCODE
            $newReviewFiles = $true
        }
        if (Test-Path (Join-Path $folder 'R165_INDEPENDENT_AUDIT.json')) {
            $independentExit = 0
            Write-Host 'R166: existing R165 review preserved.'
        } else {
            & node scripts/r165-local-model-architecture-audit.mjs --study $folder
            $independentExit = $LASTEXITCODE
            $newReviewFiles = $true
        }
    }
    # Explain *why* each genuine local model result is HOLD without another
    # request or modifying any MODEL_RAW_ORIGINAL.txt. Read Node UTF-8 explicitly
    # on Windows PowerShell 5.1, whose default text decoder may be ANSI.
    foreach ($useId in @('home', 'shop', 'laboratory')) {
        $modelReportFile = Join-Path $folder "$useId/R134_MODEL_REPORT.json"
        if (-not (Test-Path -LiteralPath $modelReportFile)) {
            Write-Host "R166_$($useId)_RESULT: HOLD_NO_MODEL_REPORT"
            continue
        }
        try {
            $modelReport = Get-Content -LiteralPath $modelReportFile -Raw -Encoding UTF8 | ConvertFrom-Json
            $reasonProp = $modelReport.PSObject.Properties['reason']
            $reason = if ($null -ne $reasonProp) { [string]$reasonProp.Value } else { 'NO_RECORDED_REASON' }
            Write-Host "R166_$($useId)_RESULT: $($modelReport.status) / $reason"
        } catch {
            Write-Host "R166_$($useId)_RESULT: HOLD_REPORT_UNREADABLE"
        }
    }
    # R167: offline exploration of original genuine local replies (0 calls).
    # The new folder and ZIP are separate from all R156/R157/R165 evidence.
    $r167Archive = ''
    if (Test-Path $studyFile) {
        $completeRaw = @('home','shop','laboratory') | ForEach-Object {
            Test-Path -LiteralPath (Join-Path $folder "$_/MODEL_RAW_ORIGINAL.txt")
        }
        if (@($completeRaw | Where-Object { $_ -eq $false }).Count -eq 0) {
            $r167Folder = "$folder-r171-room-volumes-offline"
            $r167Archive = "$r167Folder.zip"
            if (-not (Test-Path $r167Folder)) {
                & node scripts/r167-offline-replay.mjs --study $folder --out $r167Folder
                $r167Exit = $LASTEXITCODE
                if ($r167Exit -ne 0) {
                    Write-Warning 'R167 offline host-derived geometry could not be generated; originals unchanged.'
                }
            } else {
                Write-Host 'R167: existing derived review folder preserved.'
            }
            if ((Test-Path $r167Folder) -and -not (Test-Path $r167Archive)) {
                Compress-Archive -Path $r167Folder -DestinationPath $r167Archive -CompressionLevel Optimal
            }
        } else {
            Write-Host 'R167: original model replies incomplete; derived replay skipped.'
        }
    }
    # When an old ZIP already exists, preserve it even if extra reviews were
    # generated from the saved originals during this invocation.
    if ($newReviewFiles -and (Test-Path $archive)) {
        $archive = "$folder-r166-review.zip"
        if (Test-Path $archive) { throw 'R166_HOLD_REVIEW_ARCHIVE_ALREADY_EXISTS' }
    }
    if (-not (Test-Path $folder)) {
        throw "R157_HOLD_NO_EVIDENCE_FOLDER (nodeExit=$studyExit)"
    }
    $summary = $null
    $review = $null
    if (Test-Path $studyFile) {
        $summary = Get-Content $studyFile -Raw -Encoding UTF8 | ConvertFrom-Json
    }
    $independent = $null
    $independentFile = Join-Path $folder 'R165_INDEPENDENT_AUDIT.json'
    if (Test-Path $independentFile) {
        $independent = Get-Content $independentFile -Raw -Encoding UTF8 | ConvertFrom-Json
    }
    $reviewFile = Join-Path $folder 'R157_SPATIAL_AUDIT.json'
    if (Test-Path $reviewFile) {
        $review = Get-Content $reviewFile -Raw -Encoding UTF8 | ConvertFrom-Json
    }
    $provenance = [ordered]@{
        schema = 'minecraftaibuilder-r157-user-local-evidence-bundle-v1'
        commit = if ($reusedStudy) { 'SAVED_STUDY_COMMIT_NOT_ATTESTED_HERE' } else { $head }
        branch = $branch
        requestedModel = $Model
        savedEvidenceReused = $reusedStudy
        newModelCallsInThisInvocation = if ($reusedStudy) { 0 } else { $null }
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
    if (-not (Test-Path (Join-Path $folder 'R157_BUNDLE_PROVENANCE.json'))) {
        $provenance | ConvertTo-Json -Depth 8 |
            Set-Content (Join-Path $folder 'R157_BUNDLE_PROVENANCE.json') -Encoding UTF8
    }
    if (-not (Test-Path $archive)) {
        Compress-Archive -Path $folder -DestinationPath $archive -CompressionLevel Optimal
    } else {
        Write-Host 'R166: saved ZIP preserved; no overwrite.'
    }
    if (-not (Test-Path $archive)) { throw 'R157_HOLD_NO_ARCHIVE' }
    Write-Host ''
    Write-Host "R157_STUDY_STATUS: $($provenance.studyStatus)"
    Write-Host "R157_SPATIAL_STATUS: $($provenance.spatialStatus)"
    Write-Host "R165_REAL_B143_STATUS: $($provenance.independent3dStatus)"
    Write-Host "REVIEW_HTML: $(Join-Path $repo (Join-Path $folder 'R157_COMPARE.html'))"
    Write-Host "REAL_3D_AUDIT_HTML: $(Join-Path $repo (Join-Path $folder 'R165_COMPARE.html'))"
    Write-Host "EVIDENCE_ZIP: $(Join-Path $repo $archive)"
    if ($r167Archive -and (Test-Path $r167Archive)) {
        Write-Host "R171_VOLUME_EVIDENCE_ZIP: $(Join-Path $repo $r167Archive)"
        Write-Host "R171_VOLUME_REVIEW: $(Join-Path $repo (Join-Path $r167Folder 'R167_COMPARE.html'))"
    }
    Write-Host 'Minecraft world operations: ZERO. ART HOLD.'
    if ($studyExit -ne 0 -or $reviewExit -ne 0 -or $independentExit -ne 0) {
        Write-Warning 'Partial evidence/HOLD preserved. No automatic model retries.'
    }
} finally {
    Pop-Location
}

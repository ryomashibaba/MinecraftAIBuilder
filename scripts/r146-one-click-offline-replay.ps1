# R146: Rebuild the original saved real Qwen graph WITHOUT calling Ollama.
# Never write to Minecraft, never overwrite old raw/model output.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$branch = 'feature/b198zr1-protected-architectural-revision'
Push-Location $repo
try {
    if ((& git branch --show-current).Trim() -ne $branch) {
        throw "R146_WRONG_BRANCH: expected $branch"
    }
    & git diff --quiet
    if ($LASTEXITCODE -ne 0) { throw 'R146_TRACKED_WORKTREE_DIRTY' }
    & git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) { throw 'R146_STAGED_CHANGES_PRESENT' }
    & git pull --ff-only origin $branch
    if ($LASTEXITCODE -ne 0) { throw 'R146_FAST_FORWARD_FAILED' }
    # Import-only smoke test catches ESM top-level circular initialization
    # BEFORE creating an output folder. This makes zero Ollama calls.
    & node --input-type=module --eval "await import('./scripts/r146-replay-saved-qwen.mjs')"
    if ($LASTEXITCODE -ne 0) {
        throw 'R147_MODULE_IMPORT_PRECHECK_FAILED_NO_OUTPUT_CREATED'
    }
    Write-Host 'R147_MODULE_IMPORT_OK (zero model calls)'
    $folder = 'r146-offline-qwen-review-' + (Get-Date -Format 'yyyyMMdd-HHmmssfff')
    & node scripts/r146-replay-saved-qwen.mjs --out $folder
    $nodeExit = $LASTEXITCODE
    $reportPath = Join-Path $folder 'R146_REPORT.json'
    if (-not (Test-Path $reportPath)) {
        throw "R146_STARTUP_FAILED_NO_REPORT (Node exit code $nodeExit; see Node error above)"
    }
    $report = Get-Content $reportPath -Raw | ConvertFrom-Json
    Write-Host ''
    Write-Host "R146_STATUS: $($report.status)"
    Write-Host "REPLAY_MODEL_CALLS: $($report.modelCalls)"
    Write-Host "SOURCE_AUDIT: $($report.independentGraphSourceAudit)"
    Write-Host "QWEN_RAW_SHA256: $($report.originalQwenRawSha256)"
    Write-Host "REVIEW_FOLDER: $(Join-Path $repo $folder)"
    # A successful R146 report intentionally omits failureReason. Under
    # Set-StrictMode -Version Latest, direct access to an absent property
    # raises PropertyNotFoundStrict AFTER the model and 3D audit succeeded.
    $reasonProperty = $report.PSObject.Properties['failureReason']
    if ($null -ne $reasonProperty -and
        -not [string]::IsNullOrWhiteSpace([string]$reasonProperty.Value)) {
        Write-Host "HOLD_REASON: $($reasonProperty.Value)"
    }
    $sourcePass = $nodeExit -eq 0 -and
        $report.status -eq 'REAL_QWEN_PROGRAM_HOST_CORRECTED_MATERIAL_REAL_3D_SOURCE_REVIEW_REQUIRED' -and
        $report.independentGraphSourceAudit -eq 'SOURCE_ROOM_GRAPH_VERIFIED'
    if ($sourcePass) {
        $viewer = Join-Path (Join-Path $repo $folder) 'index.html'
        if (-not (Test-Path $viewer)) {
            throw 'R146_SOURCE_PASSED_BUT_3D_VIEWER_MISSING'
        }
        Write-Host "R146_VIEWER: $viewer"
        Write-Host 'R146_SOURCE_ONLY_SUCCESS. Review in browser; no Minecraft execution approved.'
    } else {
        Write-Warning 'Offline replay HOLD. Preserve R146_REPORT.json; do not rerun Qwen.'
        throw "R146_SOURCE_HOLD_OR_NODE_ERROR (exit=$nodeExit, status=$($report.status))"
    }
} finally {
    Pop-Location
}

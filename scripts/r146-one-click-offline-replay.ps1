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
    $folder = 'r146-offline-qwen-review-' + (Get-Date -Format 'yyyyMMdd-HHmmssfff')
    & node scripts/r146-replay-saved-qwen.mjs --out $folder
    $nodeExit = $LASTEXITCODE
    $reportPath = Join-Path $folder 'R146_REPORT.json'
    if (-not (Test-Path $reportPath)) { throw 'R146_NO_REPORT' }
    $report = Get-Content $reportPath -Raw | ConvertFrom-Json
    Write-Host ''
    Write-Host "R146_STATUS: $($report.status)"
    Write-Host "REPLAY_MODEL_CALLS: $($report.modelCalls)"
    Write-Host "SOURCE_AUDIT: $($report.independentGraphSourceAudit)"
    Write-Host "QWEN_RAW_SHA256: $($report.originalQwenRawSha256)"
    Write-Host "REVIEW_FOLDER: $(Join-Path $repo $folder)"
    if ($report.failureReason) {
        Write-Host "HOLD_REASON: $($report.failureReason)"
    }
    if ($nodeExit -eq 0) {
        Write-Host "Open index.html in the review folder to inspect real B143 3D."
    } else {
        Write-Warning 'Offline replay HOLD. Preserve R146_REPORT.json; do not rerun Qwen.'
    }
} finally {
    Pop-Location
}

# R145: genuine localhost Ollama -> ONE model reply -> real B143 graph 3D
# -> independently audited rooms/doors/equipment -> ZIP evidence.
# No model-generated code execution and NO Minecraft/world network access.
# Invoke from the repo root: powershell -NoProfile -ExecutionPolicy Bypass
#    -File .\scripts\r145-one-command-real-graph.ps1 [-Model qwen3:14b]
param([string]$Model = 'qwen3:14b')

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$branch = 'feature/b198zr1-protected-architectural-revision'
$repo = Split-Path -Parent $PSScriptRoot
Push-Location $repo
try {
    if (-not (Test-Path '.git')) { throw 'R145_HOLD_NOT_GIT_REPOSITORY' }
    $current = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $current -ne $branch) {
        throw "R145_HOLD_WRONG_BRANCH: current=$current, required=$branch"
    }
    # Never overwrite tracked work. Untracked old evidence folders are OK.
    & git diff --quiet
    if ($LASTEXITCODE -ne 0) { throw 'R145_HOLD_UNCOMMITTED_TRACKED_CHANGES' }
    & git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) { throw 'R145_HOLD_STAGED_CHANGES' }
    & git pull --ff-only origin $branch
    if ($LASTEXITCODE -ne 0) { throw 'R145_HOLD_GIT_FAST_FORWARD_ONLY_FAILED' }

    $head = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'R145_HOLD_NO_GIT_HEAD' }
    $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ')
    $folder = "r145-real-qwen-graph-$stamp"
    $archive = "$folder.zip"
    if (Test-Path $folder) { throw 'R145_HOLD_OUTPUT_EXISTS' }
    if (Test-Path $archive) { throw 'R145_HOLD_ARCHIVE_EXISTS' }

    # All generated files are under a fresh, non-overwriting output folder.
    # The called Node script only accesses Ollama over 127.0.0.1 and NEVER
    # imports an Education / Bedrock / SocketBE world-writing adapter.
    $args = @('scripts/r141-local-graph-evidence.mjs',
       '--model', $Model, '--out', $folder)
    & node @args
    $nodeExit = $LASTEXITCODE
    if (-not (Test-Path "$folder/R141_REPORT.json")) {
        throw 'R145_HOLD_REPORT_NOT_WRITTEN'
    }
    $report = Get-Content "$folder/R141_REPORT.json" -Raw | ConvertFrom-Json
    $metadata = [ordered]@{
        schema = 'r145-user-local-qwen-graph-evidence-bundle-v1'
        revision = $head
        requiredBranch = $branch
        requestedModel = $Model
        localInferenceAttempted = ($report.modelCalls -eq 1)
        recordedTrialStatus = $report.status
        archiveContainsVerbatimModelReplyIfAvailable = $report.rawReplyCaptured
        independentVoxelAudit = $report.independentVoxelAuditStatus
        acceptanceIsSourceOnly = $true
        constructionApproved = $false
        readiness = 'NOT_PREPARED'
        worldContacts = 0
        worldWrites = 0
        gates = @('BLOCKED','BLOCKED','BLOCKED','BLOCKED','BLOCKED',
            'BLOCKED','BLOCKED','BLOCKED','BLOCKED')
    }
    $metadata | ConvertTo-Json -Depth 5 |
        Set-Content -Path "$folder/R145_BUNDLE_PROVENANCE.json" -Encoding UTF8
    Compress-Archive -Path $folder -DestinationPath $archive -CompressionLevel Optimal
    if (-not (Test-Path $archive)) { throw 'R145_HOLD_ARCHIVE_NOT_CREATED' }
    Write-Host ""
    Write-Host "R145_STATUS: $($report.status)"
    Write-Host "LOCAL_QWEN_MODEL: $Model"
    Write-Host "MODEL_CALLS: $($report.modelCalls)"
    Write-Host "INDEPENDENT_AUDIT: $($report.independentVoxelAuditStatus)"
    Write-Host "UPLOAD_THIS_ZIP: $(Join-Path $repo $archive)"
    Write-Host "Minecraft world writes: ZERO"
    if ($nodeExit -ne 0) {
        Write-Warning 'Trial returned HOLD. Evidence ZIP was preserved for diagnosis. Never call this a successful real graph.'
    }
} finally {
    Pop-Location
}

# R125 real local Qwen -> short ArchitecturePlan -> true B143.
# Windows PowerShell 5.1+. Preserves a dirty canonical checkout by using a
# detached worktree at the fetched research HEAD. No pull/reset/stash/checkout,
# no public model evidence, no Minecraft world writes, no automatic retry.
param(
  [string]$Repository = (Join-Path $env:USERPROFILE "Projects\MinecraftAIBuilder"),
  [switch]$CheckOnly,
  [switch]$ReviewLatest,
  [switch]$PrepareLatest
)
if ((@($CheckOnly, $ReviewLatest, $PrepareLatest) | Where-Object { $_ }).Count -gt 1) { throw 'HOLD_INCOMPATIBLE_MODES' }
$ErrorActionPreference = "Stop"
$branch = "feature/b198zr1-protected-architectural-revision"
$work = $null
$added = $false
$out = $null

if (-not (Test-Path -LiteralPath (Join-Path $Repository ".git"))) {
  throw "HOLD_REPOSITORY_NOT_FOUND: $Repository"
}
$repo = (Resolve-Path -LiteralPath $Repository).Path
Push-Location -LiteralPath $repo
try {
  $top = (& git rev-parse --show-toplevel).Trim()
  if ($LASTEXITCODE -ne 0 -or
      [IO.Path]::GetFullPath($top).TrimEnd('\') -ine
      [IO.Path]::GetFullPath($repo).TrimEnd('\')) {
    throw "HOLD_NOT_REPOSITORY_ROOT"
  }
  $current = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or $current -cne $branch) {
    throw "HOLD_WRONG_BRANCH: $current"
  }
  $origin = (& git remote get-url origin).Trim()
  if ($LASTEXITCODE -ne 0 -or
      $origin -notmatch '(?i)^(https://github[.]com/ryomashibaba/MinecraftAIBuilder([.]git)?|git@github[.]com:ryomashibaba/MinecraftAIBuilder([.]git)?)$') {
    throw "HOLD_UNEXPECTED_GITHUB_REMOTE: $origin"
  }
  $localChanges = @(& git status --porcelain)
  if ($LASTEXITCODE -ne 0) { throw "HOLD_GIT_STATUS_FAILED" }
  Write-Host "Original checkout: $($localChanges.Count) existing status entries PRESERVED."
  Write-Host "Fetching research branch without modifying tracked working files..."
  & git fetch --no-tags origin $branch
  if ($LASTEXITCODE -ne 0) { throw "HOLD_GIT_FETCH_FAILED" }
  $revision = (& git rev-parse --verify "FETCH_HEAD^{commit}").Trim()
  if ($LASTEXITCODE -ne 0 -or $revision -cnotmatch '^[0-9a-f]{40}$') {
    throw "HOLD_UNVERIFIED_FETCH_HEAD"
  }
  Write-Host "Pinned fetched research HEAD: $revision"
  $work = Join-Path $env:TEMP ("MAB-R125-" + [guid]::NewGuid().ToString("N"))
  & git worktree add --detach $work $revision
  if ($LASTEXITCODE -ne 0) { throw "HOLD_WORKTREE_CREATION_FAILED" }
  $added = $true

  Push-Location -LiteralPath $work
  try {
    & node --version
    if ($LASTEXITCODE -ne 0) { throw "HOLD_NODE_UNAVAILABLE" }
    & node --test scripts/r125-semantic-pilot.test.mjs
    if ($LASTEXITCODE -ne 0) { throw "HOLD_R125_REGRESSION" }
    & node --test scripts/r125-roof-interior-study.test.mjs
    if ($LASTEXITCODE -ne 0) { throw "HOLD_ROOF_REGRESSION" }

    & node --test scripts/r125-saved-semantic-review.test.mjs
    if ($LASTEXITCODE -ne 0) { throw "HOLD_PRIVATE_REVIEW_REGRESSION" }
    & node --test scripts/r125-saved-education-preflight.test.mjs
    if ($LASTEXITCODE -ne 0) { throw "HOLD_EDUCATION_PREFLIGHT_REGRESSION" }
    if ($ReviewLatest -or $PrepareLatest) {
      $privateRoot = Join-Path $env:USERPROFILE "Documents\MAB_Private_Runs"
      if (-not (Test-Path -LiteralPath $privateRoot)) { throw "HOLD_PRIVATE_RUNS_NOT_FOUND" }
      $previous = Get-ChildItem -LiteralPath $privateRoot -Directory -Filter "r125-lab-*" |
        Where-Object { $_.Name -cmatch '^r125-lab-[0-9]{8}-[0-9]{6}-[0-9a-f]{8}
      if (-not $previous) { throw "HOLD_NO_SAVED_R125_RUN" }
      $reportFile = Join-Path $previous.FullName "R125_SEMANTIC_REPORT.json"
      if (-not (Test-Path -LiteralPath $reportFile)) { throw "HOLD_LATEST_RUN_MISSING_REPORT" }
      if ($PrepareLatest) {
        $sibling = Join-Path $privateRoot ($previous.Name + "-education-preflight-" + $revision.Substring(0,12))
        if (Test-Path -LiteralPath $sibling) { throw "HOLD_PREFLIGHT_OUTPUT_ALREADY_EXISTS" }
        Write-Host "OFFLINE SOURCE route + strict material preflight (NO Ollama/Minecraft writes):"
        & node scripts/r125-saved-education-preflight.mjs --study $previous.FullName --out $sibling
        if ($LASTEXITCODE -ne 0) { throw "HOLD_EDUCATION_PREFLIGHT" }
        $out = $sibling
      } else {
        Write-Host "READ-ONLY source replay (0 Ollama requests): $($previous.FullName)"
        & node scripts/r125-saved-semantic-review.mjs --study $previous.FullName
        if ($LASTEXITCODE -ne 0) { throw "HOLD_PRIVATE_REVIEW" }
        $out = $previous.FullName
      }
    } elseif ($CheckOnly) {
      Write-Host "CHECK_ONLY_PASS: no model call, no model output, no world writes."
    } else {
      # The private location is OUTSIDE GitHub and the original checkout.
      $privateRoot = Join-Path $env:USERPROFILE "Documents\MAB_Private_Runs"
      New-Item -ItemType Directory -Path $privateRoot -Force | Out-Null
      $suffix = [guid]::NewGuid().ToString("N").Substring(0,8)
      $out = Join-Path $privateRoot ("r125-lab-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
      if (Test-Path -LiteralPath $out) { throw "HOLD_OUTPUT_ALREADY_EXISTS" }
      $prompt = "小さな平屋の研究施設を独自に設計してください。外部入口、実験室と観測記録室、窓、十分な支持床と内部動線を設けてください。鋸歯状屋根の下には実際に使える高天井の空間を確保してください。店舗や住宅の使い回しではなく、用途に即した独創的な設計にしてください。"
      Write-Host "Requesting ONE real qwen3:14b local Ollama answer. No retries."
      & node scripts/r125-semantic-pilot.mjs --model "qwen3:14b" --out $out --prompt $prompt --require-usable-roof-volume
      $modelExitCode = $LASTEXITCODE
      $reportPath = Join-Path $out "R125_SEMANTIC_REPORT.json"
      if (Test-Path -LiteralPath $reportPath) {
        $r = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
        [pscustomobject]@{
          gitRevision = $revision
          model = $r.model
          status = $r.status
          reason = $r.reason
          providerFinishReason = $r.providerFinishReason
          modelCalls = $r.modelCalls
          originalRawCaptured = $r.originalRawCaptured
          sourceCirculationStatus = $r.sourceCirculationStatus
          programFloorStatus = $r.programFloorStatus
          roofSourceEvidencePresent = ($null -ne $r.roofInteriorSourceEvidence)
          sourceSha256 = $r.sourceSha256
          geometrySha256 = $r.geometrySha256
          worldWrites = $r.world.worldWrites
          exitCode = $modelExitCode
          outputFolder = $out
        } | ConvertTo-Json -Depth 5
        if ($modelExitCode -ne 0) {
          Write-Warning "Model returned HOLD. Original evidence is preserved, not repaired or retried."
        }
      } else {
        Write-Warning "No R125 report found; inspect model startup diagnostics. No retry was made."
      }
    }
  } finally {
    Pop-Location
  }
} finally {
  if ($added -and $work -and (Test-Path -LiteralPath $work)) {
    & git worktree remove -- $work
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Temporary worktree retained because Git found changes: $work"
    }
  }
  Pop-Location
  if ($out -and (Test-Path -LiteralPath $out)) {
    try { Invoke-Item -LiteralPath $out }
    catch { Write-Warning "Open the preserved evidence folder manually: $out" }
    $viewer = Join-Path $out "index.html"
    if (Test-Path -LiteralPath $viewer) {
      try { Invoke-Item -LiteralPath $viewer }
      catch { Write-Warning "Viewer was saved but could not be opened: $viewer" }
    }
  }
} -and
          (Test-Path -LiteralPath (Join-Path $_.FullName "R125_SEMANTIC_REPORT.json")) } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
      if (-not $previous) { throw "HOLD_NO_SAVED_R125_RUN" }
      $reportFile = Join-Path $previous.FullName "R125_SEMANTIC_REPORT.json"
      if (-not (Test-Path -LiteralPath $reportFile)) { throw "HOLD_LATEST_RUN_MISSING_REPORT" }
      if ($PrepareLatest) {
        $sibling = Join-Path $privateRoot ($previous.Name + "-education-preflight-" + $revision.Substring(0,12))
        if (Test-Path -LiteralPath $sibling) { throw "HOLD_PREFLIGHT_OUTPUT_ALREADY_EXISTS" }
        Write-Host "OFFLINE SOURCE route + strict material preflight (NO Ollama/Minecraft writes):"
        & node scripts/r125-saved-education-preflight.mjs --study $previous.FullName --out $sibling
        if ($LASTEXITCODE -ne 0) { throw "HOLD_EDUCATION_PREFLIGHT" }
        $out = $sibling
      } else {
        Write-Host "READ-ONLY source replay (0 Ollama requests): $($previous.FullName)"
        & node scripts/r125-saved-semantic-review.mjs --study $previous.FullName
        if ($LASTEXITCODE -ne 0) { throw "HOLD_PRIVATE_REVIEW" }
        $out = $previous.FullName
      }
    } elseif ($CheckOnly) {
      Write-Host "CHECK_ONLY_PASS: no model call, no model output, no world writes."
    } else {
      # The private location is OUTSIDE GitHub and the original checkout.
      $privateRoot = Join-Path $env:USERPROFILE "Documents\MAB_Private_Runs"
      New-Item -ItemType Directory -Path $privateRoot -Force | Out-Null
      $suffix = [guid]::NewGuid().ToString("N").Substring(0,8)
      $out = Join-Path $privateRoot ("r125-lab-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
      if (Test-Path -LiteralPath $out) { throw "HOLD_OUTPUT_ALREADY_EXISTS" }
      $prompt = "小さな平屋の研究施設を独自に設計してください。外部入口、実験室と観測記録室、窓、十分な支持床と内部動線を設けてください。鋸歯状屋根の下には実際に使える高天井の空間を確保してください。店舗や住宅の使い回しではなく、用途に即した独創的な設計にしてください。"
      Write-Host "Requesting ONE real qwen3:14b local Ollama answer. No retries."
      & node scripts/r125-semantic-pilot.mjs --model "qwen3:14b" --out $out --prompt $prompt --require-usable-roof-volume
      $modelExitCode = $LASTEXITCODE
      $reportPath = Join-Path $out "R125_SEMANTIC_REPORT.json"
      if (Test-Path -LiteralPath $reportPath) {
        $r = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
        [pscustomobject]@{
          gitRevision = $revision
          model = $r.model
          status = $r.status
          reason = $r.reason
          providerFinishReason = $r.providerFinishReason
          modelCalls = $r.modelCalls
          originalRawCaptured = $r.originalRawCaptured
          sourceCirculationStatus = $r.sourceCirculationStatus
          programFloorStatus = $r.programFloorStatus
          roofSourceEvidencePresent = ($null -ne $r.roofInteriorSourceEvidence)
          sourceSha256 = $r.sourceSha256
          geometrySha256 = $r.geometrySha256
          worldWrites = $r.world.worldWrites
          exitCode = $modelExitCode
          outputFolder = $out
        } | ConvertTo-Json -Depth 5
        if ($modelExitCode -ne 0) {
          Write-Warning "Model returned HOLD. Original evidence is preserved, not repaired or retried."
        }
      } else {
        Write-Warning "No R125 report found; inspect model startup diagnostics. No retry was made."
      }
    }
  } finally {
    Pop-Location
  }
} finally {
  if ($added -and $work -and (Test-Path -LiteralPath $work)) {
    & git worktree remove -- $work
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Temporary worktree retained because Git found changes: $work"
    }
  }
  Pop-Location
  if ($out -and (Test-Path -LiteralPath $out)) {
    try { Invoke-Item -LiteralPath $out }
    catch { Write-Warning "Open the preserved evidence folder manually: $out" }
    $viewer = Join-Path $out "index.html"
    if (Test-Path -LiteralPath $viewer) {
      try { Invoke-Item -LiteralPath $viewer }
      catch { Write-Warning "Viewer was saved but could not be opened: $viewer" }
    }
  }
}
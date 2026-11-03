# R125 real local Qwen -> short ArchitecturePlan -> true B143.
# Windows PowerShell 5.1+. Preserves a dirty canonical checkout by using a
# detached worktree at the fetched research HEAD. No pull/reset/stash/checkout,
# no public model evidence, no Minecraft world writes, no automatic retry.
param(
  [string]$Repository = (Join-Path $env:USERPROFILE "Projects\MinecraftAIBuilder"),
  [switch]$CheckOnly,
  [switch]$ReviewLatest,
  [switch]$PrepareLatest,
  [switch]$DiagnoseCrossGenreLatest,
  [switch]$CompareCrossGenreLatest,
  [ValidateSet('Lab','Retail','CrossGenre')][string]$UseCase = 'Lab'
)
if ((@($CheckOnly, $ReviewLatest, $PrepareLatest, $DiagnoseCrossGenreLatest, $CompareCrossGenreLatest) | Where-Object { $_ }).Count -gt 1) { throw 'HOLD_INCOMPATIBLE_MODES' }
if (($DiagnoseCrossGenreLatest -or $CompareCrossGenreLatest) -and $UseCase -ne 'CrossGenre') { throw 'HOLD_REVIEW_REQUIRES_CROSS_GENRE' }
if ($UseCase -in @('Retail','CrossGenre') -and ($ReviewLatest -or $PrepareLatest)) { throw 'HOLD_RETAIL_REQUIRES_NEW_MODEL_RUN' }
$ErrorActionPreference = "Stop"
$branch = "feature/b198zr1-protected-architectural-revision"
$work = $null
$added = $false
$out = $null
$reviewViewer = $null
$runHold = $false

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
    if ($UseCase -eq 'CrossGenre') {
      & node --test scripts/r125-cross-genre-pilot.test.mjs scripts/r125-cross-genre-offline-diagnostic.test.mjs scripts/r125-five-genre-source-comparison.test.mjs
      if ($LASTEXITCODE -ne 0) { throw 'HOLD_CROSS_GENRE_REGRESSION' }
    }
    if ($ReviewLatest -or $PrepareLatest) {
      $privateRoot = Join-Path $env:USERPROFILE "Documents\MAB_Private_Runs"
      if (-not (Test-Path -LiteralPath $privateRoot)) { throw "HOLD_PRIVATE_RUNS_NOT_FOUND" }
      $previous = Get-ChildItem -LiteralPath $privateRoot -Directory -Filter "r125-lab-*" |
        Where-Object { $_.Name -cmatch '^r125-lab-[0-9]{8}-[0-9]{6}-[0-9a-f]{8}$' -and
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
    } elseif ($DiagnoseCrossGenreLatest) {
      $privateRoot = Join-Path $env:USERPROFILE "Documents\MAB_Private_Runs"
      if (-not (Test-Path -LiteralPath $privateRoot)) { throw "HOLD_PRIVATE_RUNS_NOT_FOUND" }
      $previous = Get-ChildItem -LiteralPath $privateRoot -Directory -Filter "r125-cross-genre-*" |
        Where-Object { $_.Name -cmatch '^r125-cross-genre-[0-9]{8}-[0-9]{6}-[0-9a-f]{8}$' -and
          (Test-Path -LiteralPath (Join-Path $_.FullName "CROSS_GENRE_REPORT.json")) } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
      if (-not $previous) { throw "HOLD_NO_SAVED_CROSS_GENRE_RUN" }
      $out = Join-Path $privateRoot ($previous.Name + "-diagnostic-" + $revision.Substring(0,12) + "-" + [guid]::NewGuid().ToString("N").Substring(0,8))
      Write-Host "OFFLINE_DIAGNOSTIC: preserving 5 original model records, zero Ollama calls, zero world writes."
      & node scripts/r125-cross-genre-offline-diagnostic.mjs --study $previous.FullName --out $out
      if ($LASTEXITCODE -ne 0) {
        $runHold = $true
        Write-Warning "DIAGNOSTIC_HOLD: Source evidence could not be independently read. No new model request."
      } else {
        # Open the new source-derived preview if a preserved original is
        # newly compilable. Do not edit or promote the historical HOLD.
        $candidate = Get-ChildItem -LiteralPath $out -Directory -Filter "recovered-*" |
          Sort-Object Name | Select-Object -First 1
        if ($candidate) {
          $preview = Join-Path $candidate.FullName "index.html"
          if (Test-Path -LiteralPath $preview) { $reviewViewer = $preview }
        }
      }
    } elseif ($CompareCrossGenreLatest) {
      $privateRoot = Join-Path $env:USERPROFILE "Documents\MAB_Private_Runs"
      if (-not (Test-Path -LiteralPath $privateRoot)) { throw "HOLD_PRIVATE_RUNS_NOT_FOUND" }
      $previous = Get-ChildItem -LiteralPath $privateRoot -Directory -Filter "r125-cross-genre-*" |
        Where-Object { $_.Name -cmatch '^r125-cross-genre-[0-9]{8}-[0-9]{6}-[0-9a-f]{8}      Write-Host "CHECK_ONLY_PASS: no model call, no model output, no world writes."
    } else {
      # The private location is OUTSIDE GitHub and the original checkout.
      $privateRoot = Join-Path $env:USERPROFILE "Documents\MAB_Private_Runs"
      New-Item -ItemType Directory -Path $privateRoot -Force | Out-Null
      $suffix = [guid]::NewGuid().ToString("N").Substring(0,8)
      if ($UseCase -eq 'CrossGenre') {
        $out = Join-Path $privateRoot ("r125-cross-genre-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
        Write-Host "Five independent real local Qwen designs, sequential GPU requests, no Minecraft writes."
        & node scripts/r125-cross-genre-pilot.mjs --model "qwen3:14b" --out $out
        if ($LASTEXITCODE -ne 0) {
          $runHold = $true
          Write-Warning "CROSS_GENRE_HOLD: All original evidence and shared-failure report preserved."
        }
      } else {
      if ($UseCase -eq 'Retail') {
        $out = Join-Path $privateRoot ("r125-retail-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
        # Only the intended brief is HOST-authored. The model must author
        # both functional room purposes, proportions, entry zone and silhouette.
        $prompt = "初見の独立した小さな平屋店舗を設計してください。客が買物しレジで会計する売場と、在庫を保管しスタッフが補充作業するバックヤードを、目的が明確に異なる二つの部屋にしてください。公道側の入口、両室をつなぐ内部動線、窓、支持床、雨を防ぐ屋根を備え、売場の表情が外観から読み取れるようにしてください。研究施設・住宅の単なる名前替えを避け、屋根形状、外壁の表現、素材、規模、両室の分け方は自分で決定してください。座標やMinecraft命令ではなく設計意図を短く出力してください。"
      } else {
        $out = Join-Path $privateRoot ("r125-lab-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
        $prompt = "小さな平屋の研究施設を独自に設計してください。外部入口、実験室と観測記録室、窓、十分な支持床と内部動線を設けてください。鋸歯状屋根の下には実際に使える高天井の空間を確保してください。店舗や住宅の使い回しではなく、用途に即した独創的な設計にしてください。"
      }
      if (Test-Path -LiteralPath $out) { throw "HOLD_OUTPUT_ALREADY_EXISTS" }
      Write-Host "Requesting ONE real qwen3:14b local Ollama answer for $UseCase. No retries."
      if ($UseCase -eq 'Retail') {
        & node scripts/r125-semantic-pilot.mjs --model "qwen3:14b" --out $out --prompt $prompt
      } else {
        & node scripts/r125-semantic-pilot.mjs --model "qwen3:14b" --out $out --prompt $prompt --require-usable-roof-volume
      }
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
          $runHold = $true
          Write-Warning "Model returned HOLD. Original evidence is preserved, not repaired or retried."
        } elseif ($UseCase -eq 'Retail') {
          $reviewViewer = Join-Path $out "index.html"
          $pilot = Join-Path $privateRoot ("r125-retail-education-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
          if (Test-Path -LiteralPath $pilot) { throw "HOLD_RETAIL_PILOT_ALREADY_EXISTS" }
          Write-Host "Checking NEW model-authored retail roles, TRUE source routes, 3D and strict v26.33 materials (NO WORLD writes)..."
          & node scripts/r125-saved-education-preflight.mjs --study $out --out $pilot --usecase retail
          if ($LASTEXITCODE -ne 0) {
            $runHold = $true
            Write-Warning "RETAIL_HOLD: Keep original Qwen and 3D study intact. No MakeCode candidate can be used."
          } else {
            $out = $pilot
            Write-Host "RETAIL_SOURCE_READY: separate offline MakeCode candidate (NOT Minecraft-approved)."
          }
        }
      } else {
        $runHold = $true
        Write-Warning "No R125 report found; inspect model startup diagnostics. No retry was made."
      }
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
    if ($reviewViewer -and (Test-Path -LiteralPath $reviewViewer)) {
      try { Invoke-Item -LiteralPath $reviewViewer }
      catch { Write-Warning "Retail viewer preserved: $reviewViewer" }
    }
  }
}

# Do not report a model/preflight HOLD as a successful launcher invocation.
# Cleanup and automatic evidence-folder opening above must still run first.
if ($runHold) {
  throw "R125_RUN_HOLD: Inspect the preserved evidence folder. No automatic retry or Minecraft world write occurred."
}
 -and
          (Test-Path -LiteralPath (Join-Path $_.FullName "CROSS_GENRE_REPORT.json")) } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
      if (-not $previous) { throw "HOLD_NO_SAVED_CROSS_GENRE_RUN" }
      $diagnostic = Get-ChildItem -LiteralPath $privateRoot -Directory -Filter ($previous.Name + "-diagnostic-*") |
        Where-Object { $_.Name -cmatch '^r125-cross-genre-[0-9]{8}-[0-9]{6}-[0-9a-f]{8}-diagnostic-[0-9a-f]{12}-[0-9a-f]{8}      Write-Host "CHECK_ONLY_PASS: no model call, no model output, no world writes."
    } else {
      # The private location is OUTSIDE GitHub and the original checkout.
      $privateRoot = Join-Path $env:USERPROFILE "Documents\MAB_Private_Runs"
      New-Item -ItemType Directory -Path $privateRoot -Force | Out-Null
      $suffix = [guid]::NewGuid().ToString("N").Substring(0,8)
      if ($UseCase -eq 'CrossGenre') {
        $out = Join-Path $privateRoot ("r125-cross-genre-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
        Write-Host "Five independent real local Qwen designs, sequential GPU requests, no Minecraft writes."
        & node scripts/r125-cross-genre-pilot.mjs --model "qwen3:14b" --out $out
        if ($LASTEXITCODE -ne 0) {
          $runHold = $true
          Write-Warning "CROSS_GENRE_HOLD: All original evidence and shared-failure report preserved."
        }
      } else {
      if ($UseCase -eq 'Retail') {
        $out = Join-Path $privateRoot ("r125-retail-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
        # Only the intended brief is HOST-authored. The model must author
        # both functional room purposes, proportions, entry zone and silhouette.
        $prompt = "初見の独立した小さな平屋店舗を設計してください。客が買物しレジで会計する売場と、在庫を保管しスタッフが補充作業するバックヤードを、目的が明確に異なる二つの部屋にしてください。公道側の入口、両室をつなぐ内部動線、窓、支持床、雨を防ぐ屋根を備え、売場の表情が外観から読み取れるようにしてください。研究施設・住宅の単なる名前替えを避け、屋根形状、外壁の表現、素材、規模、両室の分け方は自分で決定してください。座標やMinecraft命令ではなく設計意図を短く出力してください。"
      } else {
        $out = Join-Path $privateRoot ("r125-lab-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
        $prompt = "小さな平屋の研究施設を独自に設計してください。外部入口、実験室と観測記録室、窓、十分な支持床と内部動線を設けてください。鋸歯状屋根の下には実際に使える高天井の空間を確保してください。店舗や住宅の使い回しではなく、用途に即した独創的な設計にしてください。"
      }
      if (Test-Path -LiteralPath $out) { throw "HOLD_OUTPUT_ALREADY_EXISTS" }
      Write-Host "Requesting ONE real qwen3:14b local Ollama answer for $UseCase. No retries."
      if ($UseCase -eq 'Retail') {
        & node scripts/r125-semantic-pilot.mjs --model "qwen3:14b" --out $out --prompt $prompt
      } else {
        & node scripts/r125-semantic-pilot.mjs --model "qwen3:14b" --out $out --prompt $prompt --require-usable-roof-volume
      }
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
          $runHold = $true
          Write-Warning "Model returned HOLD. Original evidence is preserved, not repaired or retried."
        } elseif ($UseCase -eq 'Retail') {
          $reviewViewer = Join-Path $out "index.html"
          $pilot = Join-Path $privateRoot ("r125-retail-education-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
          if (Test-Path -LiteralPath $pilot) { throw "HOLD_RETAIL_PILOT_ALREADY_EXISTS" }
          Write-Host "Checking NEW model-authored retail roles, TRUE source routes, 3D and strict v26.33 materials (NO WORLD writes)..."
          & node scripts/r125-saved-education-preflight.mjs --study $out --out $pilot --usecase retail
          if ($LASTEXITCODE -ne 0) {
            $runHold = $true
            Write-Warning "RETAIL_HOLD: Keep original Qwen and 3D study intact. No MakeCode candidate can be used."
          } else {
            $out = $pilot
            Write-Host "RETAIL_SOURCE_READY: separate offline MakeCode candidate (NOT Minecraft-approved)."
          }
        }
      } else {
        $runHold = $true
        Write-Warning "No R125 report found; inspect model startup diagnostics. No retry was made."
      }
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
    if ($reviewViewer -and (Test-Path -LiteralPath $reviewViewer)) {
      try { Invoke-Item -LiteralPath $reviewViewer }
      catch { Write-Warning "Retail viewer preserved: $reviewViewer" }
    }
  }
}

# Do not report a model/preflight HOLD as a successful launcher invocation.
# Cleanup and automatic evidence-folder opening above must still run first.
if ($runHold) {
  throw "R125_RUN_HOLD: Inspect the preserved evidence folder. No automatic retry or Minecraft world write occurred."
}
 -and
          (Test-Path -LiteralPath (Join-Path $_.FullName "DIAGNOSTIC_REPORT.json")) } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
      if (-not $diagnostic) { throw "HOLD_NO_MATCHING_DIAGNOSTIC_EVIDENCE" }
      $out = Join-Path $privateRoot ($previous.Name + "-comparison-" + $revision.Substring(0,12) + "-" + [guid]::NewGuid().ToString("N").Substring(0,8))
      Write-Host "Building five-genre 3D SOURCE comparison from frozen model originals; zero Qwen requests, zero world writes."
      & node scripts/r125-five-genre-source-comparison.mjs --study $previous.FullName --diagnostic (Join-Path $diagnostic.FullName "DIAGNOSTIC_REPORT.json") --out $out
      if ($LASTEXITCODE -ne 0) {
        $runHold = $true
        Write-Warning "CROSS_GENRE_COMPARE_HOLD: Source/diagnostic SHA mismatch or genuine B143 failure. No retry."
      } else {
        $reviewViewer = Join-Path $out "index.html"
      }
    } elseif ($CheckOnly) {
      Write-Host "CHECK_ONLY_PASS: no model call, no model output, no world writes."
    } else {
      # The private location is OUTSIDE GitHub and the original checkout.
      $privateRoot = Join-Path $env:USERPROFILE "Documents\MAB_Private_Runs"
      New-Item -ItemType Directory -Path $privateRoot -Force | Out-Null
      $suffix = [guid]::NewGuid().ToString("N").Substring(0,8)
      if ($UseCase -eq 'CrossGenre') {
        $out = Join-Path $privateRoot ("r125-cross-genre-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
        Write-Host "Five independent real local Qwen designs, sequential GPU requests, no Minecraft writes."
        & node scripts/r125-cross-genre-pilot.mjs --model "qwen3:14b" --out $out
        if ($LASTEXITCODE -ne 0) {
          $runHold = $true
          Write-Warning "CROSS_GENRE_HOLD: All original evidence and shared-failure report preserved."
        }
      } else {
      if ($UseCase -eq 'Retail') {
        $out = Join-Path $privateRoot ("r125-retail-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
        # Only the intended brief is HOST-authored. The model must author
        # both functional room purposes, proportions, entry zone and silhouette.
        $prompt = "初見の独立した小さな平屋店舗を設計してください。客が買物しレジで会計する売場と、在庫を保管しスタッフが補充作業するバックヤードを、目的が明確に異なる二つの部屋にしてください。公道側の入口、両室をつなぐ内部動線、窓、支持床、雨を防ぐ屋根を備え、売場の表情が外観から読み取れるようにしてください。研究施設・住宅の単なる名前替えを避け、屋根形状、外壁の表現、素材、規模、両室の分け方は自分で決定してください。座標やMinecraft命令ではなく設計意図を短く出力してください。"
      } else {
        $out = Join-Path $privateRoot ("r125-lab-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
        $prompt = "小さな平屋の研究施設を独自に設計してください。外部入口、実験室と観測記録室、窓、十分な支持床と内部動線を設けてください。鋸歯状屋根の下には実際に使える高天井の空間を確保してください。店舗や住宅の使い回しではなく、用途に即した独創的な設計にしてください。"
      }
      if (Test-Path -LiteralPath $out) { throw "HOLD_OUTPUT_ALREADY_EXISTS" }
      Write-Host "Requesting ONE real qwen3:14b local Ollama answer for $UseCase. No retries."
      if ($UseCase -eq 'Retail') {
        & node scripts/r125-semantic-pilot.mjs --model "qwen3:14b" --out $out --prompt $prompt
      } else {
        & node scripts/r125-semantic-pilot.mjs --model "qwen3:14b" --out $out --prompt $prompt --require-usable-roof-volume
      }
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
          $runHold = $true
          Write-Warning "Model returned HOLD. Original evidence is preserved, not repaired or retried."
        } elseif ($UseCase -eq 'Retail') {
          $reviewViewer = Join-Path $out "index.html"
          $pilot = Join-Path $privateRoot ("r125-retail-education-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $suffix)
          if (Test-Path -LiteralPath $pilot) { throw "HOLD_RETAIL_PILOT_ALREADY_EXISTS" }
          Write-Host "Checking NEW model-authored retail roles, TRUE source routes, 3D and strict v26.33 materials (NO WORLD writes)..."
          & node scripts/r125-saved-education-preflight.mjs --study $out --out $pilot --usecase retail
          if ($LASTEXITCODE -ne 0) {
            $runHold = $true
            Write-Warning "RETAIL_HOLD: Keep original Qwen and 3D study intact. No MakeCode candidate can be used."
          } else {
            $out = $pilot
            Write-Host "RETAIL_SOURCE_READY: separate offline MakeCode candidate (NOT Minecraft-approved)."
          }
        }
      } else {
        $runHold = $true
        Write-Warning "No R125 report found; inspect model startup diagnostics. No retry was made."
      }
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
    if ($reviewViewer -and (Test-Path -LiteralPath $reviewViewer)) {
      try { Invoke-Item -LiteralPath $reviewViewer }
      catch { Write-Warning "Retail viewer preserved: $reviewViewer" }
    }
  }
}

# Do not report a model/preflight HOLD as a successful launcher invocation.
# Cleanup and automatic evidence-folder opening above must still run first.
if ($runHold) {
  throw "R125_RUN_HOLD: Inspect the preserved evidence folder. No automatic retry or Minecraft world write occurred."
}

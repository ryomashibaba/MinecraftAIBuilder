# R190-BO genuine local-model experiment: one brief, two models, serial execution.
# No model request occurs in -PrepareOnly mode. Each POST requires separately
# pasting the preflight's exact SHA+UUID consent phrase. Never pushes to GitHub.
param(
  [switch]$PrepareOnly,
  [string]$OutputRoot = ''
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$bo = Join-Path $PSScriptRoot 'r190bo-spatial-local.mjs'
$cd = Join-Path $PSScriptRoot 'r190cd-bo-capture-review.mjs'
$ce = Join-Path $PSScriptRoot 'r190ce-offline-visual-evidence.mjs'
if (-not (Test-Path -LiteralPath $bo) -or -not (Test-Path -LiteralPath $cd) -or -not (Test-Path -LiteralPath $ce)) {
  throw 'R190BO_SCRIPT_MISSING: update the protected development branch first'
}
if (-not $PrepareOnly -and $env:NODE_OPTIONS -match 'r190bo-deny-network') {
  throw 'R190BO_NODE_NETWORK_GUARD_ACTIVE: stop before consuming a one-use approval'
}
$node = Get-Command node -ErrorAction Stop
$null = $node
$models = @('qwen3:14b', 'gemma4:26b')
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $userHome = [Environment]::GetFolderPath('UserProfile')
  $OutputRoot = Join-Path $userHome ('MinecraftAIBuilder-BO-REAL-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))
}
$root = [System.IO.Path]::GetFullPath($OutputRoot)
if (Test-Path -LiteralPath $root) { throw ('R190BO_FRESH_OUTPUT_REQUIRED: ' + $root) }
if (-not (Test-Path -LiteralPath (Split-Path -Parent $root))) { throw 'R190BO_PARENT_MISSING' }
$null = New-Item -ItemType Directory -Path $root -ErrorAction Stop
$briefPath = Join-Path $root 'ORIGINAL_JAPANESE_BRIEF.txt'
$brief = @'
住宅街に建つ、小さな二階建ての地域交流アトリエを設計して。
一階には誰でも立ち寄れる展示・交流の場所、二階には静かに制作できる場所が欲しい。
外から自然に入れる入口と、二階まで人が移動できる階段を設けて。
昼の光が気持ちよく入る窓と、雨を防ぐ屋根も必要。
見た目はただの箱の積み重ねではなく、使いやすさと美しさが一体になった建築を目指して。
外形、材料、室の配置、空間のつながり、屋根と開口の設計はあなた自身が決めて。
'@
[System.IO.File]::WriteAllText($briefPath, $brief, [System.Text.UTF8Encoding]::new($false))
$briefSHA = (Get-FileHash -LiteralPath $briefPath -Algorithm SHA256).Hash.ToLowerInvariant()
$gitHead = (& git -C $repoRoot rev-parse HEAD 2>$null)
if ($LASTEXITCODE -ne 0) { $gitHead = 'UNKNOWN_GIT_HEAD' }
$summary = New-Object 'System.Collections.Generic.List[object]'
Write-Host ('R190BO private output: ' + $root)
Write-Host ('Brief SHA256: ' + $briefSHA)
Write-Host ('Git HEAD: ' + ($gitHead -join ''))
foreach ($model in $models) {
  $slug = $model.Replace(':','-')
  $dir = Join-Path $root $slug
  $null = New-Item -ItemType Directory -Path $dir -ErrorAction Stop
  $prepared = Join-Path $dir 'preflight'
  $capture = Join-Path $dir 'capture'
  $cdReview = Join-Path $dir 'cd-review'
  $visual = Join-Path $dir 'visual'
  # Same model-neutral settings for comparison, without fixing the design.
  $prepOutput = & node $bo prepare --brief $briefPath --model $model --out $prepared --schema-prompt native-only --think false --temperature 0.35 --seed 23 --max-tokens 16384 --context-tokens 32768 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw ('R190BO_PREPARE_FAILED ' + $model + ': ' + ($prepOutput | Out-String))
  }
  $preflight = Get-Content -LiteralPath (Join-Path $prepared 'PREFLIGHT.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($preflight.status -ne 'OFFLINE_READY_AWAITING_SEPARATE_HUMAN_APPROVAL' -or
      $preflight.approvalGranted -ne $false -or $preflight.networkRequests -ne 0) {
    throw ('R190BO_UNSAFE_PREFLIGHT: ' + $model)
  }
  $row = [ordered]@{
    model=$model;status='PREFLIGHT_ONLY';originalBriefSha256=$preflight.briefSha256
    exactRequestSha256=$preflight.requestSha256
    outputDirectory=$dir;sourceGitHead=($gitHead -join '')
    actualProviderRequests=0;derivedGeometrySha256=$null
    cdStatus='NOT_RUN';ceStatus='NOT_RUN'
  }
  Write-Host ''
  Write-Host ('Model: ' + $model)
  Write-Host ('EXACT REQUEST SHA: ' + $preflight.requestSha256)
  Write-Host ('One-use approval phrase: ' + $preflight.approvalPhrase)
  if ($PrepareOnly) {
    $summary.Add([pscustomobject]$row)
    continue
  }
  Write-Host 'Check EXACT_REQUEST.json and PREFLIGHT_JA.md before consenting.'
  Write-Host 'Paste the exact phrase to approve ONE local Ollama POST; Enter alone skips this model.'
  $entered = Read-Host ('Approve '+ $model)
  if ($entered -cne $preflight.approvalPhrase) {
    Write-Host ('SKIPPED: '+$model+'; no model inference performed')
    $row.status='NOT_APPROVED_SKIPPED'
    $summary.Add([pscustomobject]$row)
    continue
  }
  # runBO atomically consumes the one-shot approval BEFORE a network attempt.
  & node $bo run --prepared $prepared --approval $entered --out $capture
  $runExit = $LASTEXITCODE
  $row.actualProviderRequests = 1
  if (Test-Path -LiteralPath (Join-Path $capture 'CAPTURE.json')) {
    $cap = Get-Content -LiteralPath (Join-Path $capture 'CAPTURE.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $row.status = $cap.status
    $row.derivedGeometrySha256 = $cap.geometrySha256
    if (Test-Path -LiteralPath (Join-Path $capture 'MODEL_ORIGINAL.txt')) {
      & node $cd --capture $capture --out $cdReview
      $cdExit = $LASTEXITCODE
      if (Test-Path -LiteralPath (Join-Path $cdReview 'ASSESSMENT.json')) {
        $assess = Get-Content -LiteralPath (Join-Path $cdReview 'ASSESSMENT.json') -Raw -Encoding UTF8 | ConvertFrom-Json
        $row.cdStatus = $assess.status
      }
      if (Test-Path -LiteralPath (Join-Path $cdReview 'CD_SCORECARD.json')) {
        & node $ce --review $cdReview --out $visual
        if ($LASTEXITCODE -eq 0) { $row.ceStatus='EIGHT_VIEWS_WRITTEN_ART_HOLD' }
        else { $row.ceStatus='CE_FAILED_REVIEW_LOGS' }
      }
    } else { $row.cdStatus='NO_SAVED_MODEL_ORIGINAL' }
  } else {
    $row.status = 'HOLD_NO_CAPTURE_REVIEW_TRANSPORT_HOLD'
  }
  if ($runExit -ne 0) { Write-Host ('BO rejected/held as evidence; exit=' + $runExit + '; NO AUTOMATIC RETRY') }
  $summary.Add([pscustomobject]$row)
}
$report = [ordered]@{
  schema='minecraftaibuilder-r190bo-real-two-model-local-report-v1'
  originalBriefSha256=$briefSHA
  sourceGitHead=($gitHead -join '')
  modelCallsOnlyAfterSeparateApproval=$true
  automaticRetryCount=0
  localModelEndpoint='127.0.0.1:11434/api/chat'
  capturedEvidenceKeptPrivate=$true
  automaticGitHubUpload=$false
  modelResults=$summary.ToArray()
  artisticPass='NOT_CERTIFIED'
  minecraftWalking='NOT_TESTED'
  readiness='NOT_PREPARED'
  worldContacts=0
  worldWrites=0
  officialArtAdoptions=0
}
$summaryFile = Join-Path $root 'RESULT_SUMMARY.json'
[System.IO.File]::WriteAllText($summaryFile, ($report|ConvertTo-Json -Depth 10) + [Environment]::NewLine,
  [System.Text.UTF8Encoding]::new($false))
Write-Host ''
Write-Host ('R190BO RESULT SUMMARY: ' + $summaryFile)
Write-Host 'Private evidence remains in the output directory. No GitHub publication.'
Write-Host 'A green SOURCE result is not an architectural/artistic or Minecraft pass.'

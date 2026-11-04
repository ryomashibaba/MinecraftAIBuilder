# One selected project, one installed LOCAL model, two PRIVATE real-source drafts.
# No untrusted generated code is executed. No paid API, pull, Docker, git push.
# CLI arguments remain supported; no arguments opens a one-step selection menu.
[CmdletBinding()]
param(
  [ValidateSet('minecraftaibuilder', 'browser-ink-tps')]
  [string] $Project = '',

  [ValidatePattern('^(auto|[A-Za-z0-9_.:/-]{1,100})$')]
  [string] $Model = 'auto'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Immutable, reviewed source bundle. Do not replace with mutable branch HEAD.
$revision = '9297aa7e711613be03cca257671e6820508a4557'
$repo = 'ryomashibaba/MinecraftAIBuilder'
$files = @(
  @{ Name = 'draft_real_project_local14b.py'; GitBlob = 'f8539d764c15217f70d0c17c5b5629cc6e9dddeb' },
  @{ Name = 'prepare_pinned_real_project.py'; GitBlob = 'ce4d56452ec0a1d513dfa419a80780eed1283894' },
  @{ Name = 'local_qwen_no_docker_two_step.py'; GitBlob = 'ec98a13b7191a3f70f58af3bf3c08f85c8e60503' },
  @{ Name = 'REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json'; GitBlob = '64092643467a6fb07753d669839106eed3be6102' }
)

if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA_REQUIRED' }
$private = Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\QwenRealProjectPilotSource\' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $private -Force | Out-Null
$sharePath = Join-Path $private 'SHAREABLE_FIRST_PILOT_STATUS.json'
$receiptPath = $null
$summary = [ordered]@{
  schema = 'dec-first-genuine-private-pilot-status-v1'
  status = 'HOLD'
  project = $null
  selected_model = $null
  original_project_changed = $false
  generated_code_executed = $false
  github_pushes = 0
  paid_api_calls = 0
  private_receipt_present = $false
  model_calls_attempted = 0
  model_drafts = 0
  source_pinned_commit = $null
  stages = @()
  reason = $null
}
try {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'GIT_NOT_INSTALLED' }
  if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'PYTHON_NOT_INSTALLED' }
  if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { throw 'OLLAMA_CLI_NOT_INSTALLED' }

  if (-not $Project) {
    Write-Host 'Select ONE project for a PRIVATE source-draft pilot:'
    Write-Host '  1. MinecraftAIBuilder'
    Write-Host '  2. Browser Ink TPS'
    $choice = (Read-Host 'Enter 1 or 2').Trim()
    if ($choice -eq '1') { $Project = 'minecraftaibuilder' }
    elseif ($choice -eq '2') { $Project = 'browser-ink-tps' }
    else { throw 'PROJECT_SELECTION_REQUIRED_1_OR_2' }
  }
  $summary.project = $Project

  # List already-installed local tags; never pull an unknown or large model.
  $modelRows = @(& ollama list 2>&1)
  if ($LASTEXITCODE -ne 0) { throw 'OLLAMA_NOT_RUNNING_OR_MODEL_LIST_FAILED' }
  $installed = @()
  foreach ($line in @($modelRows | Select-Object -Skip 1)) {
    $name = (([string]$line).Trim() -split '\s+')[0]
    if ($name -cmatch '^[A-Za-z0-9_.:/-]{1,100}$') { $installed += $name }
  }
  if ($installed.Count -eq 0) { throw 'NO_INSTALLED_LOCAL_MODELS_NO_AUTO_PULL' }
  if ($Model -eq 'auto') {
    if ($installed -contains 'qwen3:14b') {
      $Model = 'qwen3:14b'
    } elseif ($installed.Count -eq 1) {
      $Model = [string]$installed[0]
    } else {
      Write-Host 'Installed Ollama models:'
      $installed | ForEach-Object { Write-Host ('  ' + $_) }
      $Model = (Read-Host 'Enter one installed model tag (no model download)').Trim()
    }
  }
  if ($Model -cnotmatch '^[A-Za-z0-9_.:/-]{1,100}$' -or $installed -cnotcontains $Model) {
    throw 'SELECTED_MODEL_NOT_INSTALLED_NO_AUTO_PULL'
  }
  $summary.selected_model = $Model
  foreach ($file in $files) {
    $name = $file.Name
    $destination = Join-Path $private $name
    $url = "https://raw.githubusercontent.com/$repo/$revision/tools/free-autonomy-solo/$name"
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $destination
    $hash = ((& git hash-object $destination) | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $hash -cne $file.GitBlob) {
      throw "PINNED_SOURCE_INTEGRITY_HOLD_$name"
    }
  }
  Write-Host "PINNED_SOURCE_INTEGRITY_PASS; SINGLE_PROJECT=$Project; MODEL=$Model"
  $output = @(& python (Join-Path $private 'draft_real_project_local14b.py') --project $Project --model $Model 2>&1)
  $exitCode = $LASTEXITCODE
  $output | ForEach-Object { Write-Host ([string]$_) }
  $receiptLines = @($output | Where-Object { ([string]$_).StartsWith('PRIVATE_RESULT_PATH=') })
  if ($receiptLines.Count -eq 1) {
    $receiptPath = ([string]$receiptLines[0]).Substring('PRIVATE_RESULT_PATH='.Length)
    if (Test-Path -LiteralPath $receiptPath -PathType Leaf) {
      $summary.private_receipt_present = $true
      # Copy ONLY bounded, non-source diagnostic fields. Never include any
      # generated source text, patch, diff, token, prompt, or local home path.
      $rawReceipt = Get-Content -LiteralPath $receiptPath -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($rawReceipt.schema -ne 'real-project-qwen-local-private-draft-v1' -or
          $rawReceipt.project -ne $Project) {
        throw 'PRIVATE_RECEIPT_IDENTITY_MISMATCH'
      }
      $summary.model_calls_attempted = $rawReceipt.model_calls_attempted
      $summary.model_drafts = $rawReceipt.model_drafts
      if ($rawReceipt.PSObject.Properties['pinned_source_commit']) {
        $summary.source_pinned_commit = $rawReceipt.pinned_source_commit
      }
      foreach ($item in @($rawReceipt.stages)) {
        $safeStage = [ordered]@{}
        foreach ($key in @('stage', 'attempt', 'result',
                           'reason', 'attempt_wall_seconds',
                           'reported_eval_count',
                           'reported_output_tokens_per_second')) {
          $property = $item.PSObject.Properties[$key]
          if ($null -ne $property) { $safeStage[$key] = $property.Value }
        }
        $summary.stages += $safeStage
      }
      if ($rawReceipt.PSObject.Properties['hold_reason']) {
        $summary.reason = [string]$rawReceipt.hold_reason
      }
    }
  }
  if ($exitCode -ne 0) { throw 'LOCAL_MODEL_PRIVATE_DRAFT_HOLD_SEE_RESULT' }
  if (-not $summary.private_receipt_present) { throw 'SHAREABLE_DRAFT_RECEIPT_NOT_FOUND' }
  $summary.status = 'TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY'
  Write-Host 'PRIVATE_DRAFTS_SAVED__NOT_EXECUTED__NO_QA_OR_GIT_COMMIT__NO_GITHUB_PUSH'
} catch {
  $summary.status = 'HOLD'
  $reason = [string]$_.Exception.Message
  if (-not $summary.reason) {
    $summary.reason = $reason.Substring(0, [Math]::Min(160, $reason.Length))
  }
  Write-Host ('PILOT_HOLD: ' + $summary.reason)
} finally {
  $summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $sharePath -Encoding UTF8
  Write-Host ('UPLOAD_THIS_SMALL_STATUS_JSON=' + $sharePath)
  # Explorer is a local convenience, not a source/model/Qa execution gate.
  # Always keep the JSON on disk even when Explorer is unavailable.
  try {
    Start-Process -FilePath explorer.exe -ArgumentList ('/select,"' + $sharePath + '"') -ErrorAction Stop
    Write-Host 'RESULT_FILE_SHOWN_IN_EXPLORER'
  } catch {
    Write-Host ('RESULT_EXPLORER_UNAVAILABLE__OPEN_MANUALLY=' + $private)
  }
  if ($summary.private_receipt_present) {
    Write-Host 'PRIVATE_DRAFT_RECEIPT_RETAINED_LOCALLY__DO_NOT_UPLOAD_SOURCE'
  }
}
if ($summary.status -ne 'TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY') { exit 2 }

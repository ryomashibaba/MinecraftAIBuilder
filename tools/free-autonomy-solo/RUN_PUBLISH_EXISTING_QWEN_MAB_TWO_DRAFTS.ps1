# User-authorized PUBLIC GitHub research publication of EXACTLY two existing MAB Qwen drafts.
# This deliberately publishes both model-generated source snapshots to public Git history.
# No re-inference, paid API, local Docker, user source writes, main or production deployment.
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repo = 'ryomashibaba/MinecraftAIBuilder'
$branch = 'research/dec-free-autonomy-solo-pilot-20261104'
$project = 'minecraftaibuilder'
$model = 'qwen3:14b'
$origin = 'fe1682e15ffa063f4dc415b06c4d76a54737a06e'
$stage1 = '03b73c926cb507b9fc0bed50c3a9b38cf5cada631b15a428b9e3f240fe8098cc'
$stage2 = '5b8468783df8126d6e053bf7d37b4c9b74fd543bdd345d5898ac88fe022df6d6'
$report = [ordered]@{
  schema = 'dec-real-qwen-public-github-source-qa-handoff-v1'
  status = 'HOLD'
  project = $project
  model_reported_only = $model
  pinned_source_commit = $origin
  stage1_sha256 = $stage1
  stage2_sha256 = $stage2
  research_repository = $repo
  research_branch = $branch
  public_submission_commit = $null
  public_submission_confirmed = $false
  github_qa_run_id = $null
  github_qa_run_url = $null
  github_qa_workflow_status = $null
  candidate_executed_on_windows = $false
  source_or_main_mutated_by_launcher = $false
  local_docker_used = $false
  additional_model_calls = 0
  paid_api_calls = 0
  independent_art_certified = $false
  reason = $null
}
$reportDir = $null
try {
  if (-not $env:LOCALAPPDATA) { throw 'WINDOWS_LOCALAPPDATA_REQUIRED' }
  foreach ($tool in @('git','python','node')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
      throw ('REQUIRED_INSTALLED_TOOL_MISSING_' + $tool.ToUpperInvariant())
    }
  }
  $base = Join-Path $env:LOCALAPPDATA 'FreeAutonomyPrivate\Local14BRealProjectDrafts\PrivateClones'
  if (-not (Test-Path -LiteralPath $base -PathType Container)) {
    throw 'PINNED_PRIVATE_DRAFT_DIRECTORY_NOT_FOUND'
  }
  $eligible = @()
  foreach ($folder in @(Get-ChildItem -LiteralPath $base -Directory -Filter 'minecraftaibuilder-*')) {
    if (($folder.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
    $receiptPath = Join-Path $folder.FullName 'SHAREABLE_DRAFT_RESULT.json'
    $syntaxPath = Join-Path $folder.FullName 'SHAREABLE_MJS_SYNTAX_RESULT.json'
    $staticPath = Join-Path $folder.FullName 'SHAREABLE_STATIC_PREFLIGHT.json'
    if (-not (Test-Path -LiteralPath $receiptPath -PathType Leaf) -or
        -not (Test-Path -LiteralPath $syntaxPath -PathType Leaf) -or
        -not (Test-Path -LiteralPath $staticPath -PathType Leaf)) { continue }
    try {
      $receipt = Get-Content -LiteralPath $receiptPath -Raw -Encoding UTF8 | ConvertFrom-Json
      $syntax = Get-Content -LiteralPath $syntaxPath -Raw -Encoding UTF8 | ConvertFrom-Json
      $static = Get-Content -LiteralPath $staticPath -Raw -Encoding UTF8 | ConvertFrom-Json
      $stages = @($receipt.stages | Where-Object { $_.result -eq 'PRIVATE_UNVERIFIED_DIFF' })
      $syntaxStages = @($syntax.stages)
      $staticStages = @($static.checked_stages)
      if ($receipt.status -ceq 'TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY' -and
          $receipt.project -ceq $project -and $receipt.model_requested -ceq $model -and
          $receipt.pinned_source_commit -ceq $origin -and
          $static.status -ceq 'STATIC_PRIVATE_DRAFTS_ADMISSIBLE_FOR_ISOLATED_QA_ONLY' -and
          $static.project -ceq $project -and $static.source_commit -ceq $origin -and
          $syntax.status -ceq 'PRIVATE_MAB_MODULE_SYNTAX_ONLY_PASS' -and
          $syntax.project -ceq $project -and $syntax.source_commit -ceq $origin -and
          $syntax.baseline_module_syntax_passed -eq $true -and
          $syntax.source_code_executed -eq $false -and
          $stages.Count -eq 2 -and $syntaxStages.Count -eq 2 -and $staticStages.Count -eq 2 -and
          $stages[0].stage -eq 1 -and $stages[1].stage -eq 2 -and
          $stages[0].candidate_sha256 -ceq $stage1 -and
          $stages[1].candidate_sha256 -ceq $stage2 -and
          $syntaxStages[0].candidate_sha256 -ceq $stage1 -and
          $syntaxStages[1].candidate_sha256 -ceq $stage2 -and
          $syntaxStages[0].module_syntax_parsed -eq $true -and
          $syntaxStages[1].module_syntax_parsed -eq $true -and
          $staticStages[0].candidate_sha256 -ceq $stage1 -and
          $staticStages[1].candidate_sha256 -ceq $stage2) {
        $eligible += [pscustomobject]@{
          Directory = $folder.FullName
          Updated = (Get-Item -LiteralPath $receiptPath).LastWriteTimeUtc
        }
      }
    } catch {
      # Bad receipts cannot authorize a public upload.
    }
  }
  if ($eligible.Count -lt 1) { throw 'EXACT_TWO_QWEN_DRAFTS_AND_PRIOR_QA_EVIDENCE_NOT_FOUND' }
  $receiptDir = [string](@($eligible | Sort-Object -Property Updated -Descending)[0].Directory)
  $reportDir = $receiptDir

  # Exactly the following audited public scripts are executable on Windows.
  $revision = '72edb629f2aead398327ec311429007357016d45'
  $files = @(
    @{Name='submit_public_research_qa.py';Blob='ed08b6fe475e48d0c417ea44227906df8c4f58e3'},
    @{Name='public_qa_handoff_protocol.py';Blob='25c79a24881b94540332722367bc05aafa25ebaf'},
    @{Name='promote_private_real_drafts_docker.py';Blob='b1675da4dbae2fb9b3e7115507777c5104f8dd98'},
    @{Name='docker_sandbox.py';Blob='20b6817b1e50c99435cdb29a13beafdb4fbcf4dd'},
    @{Name='draft_real_project_local14b.py';Blob='3651e8e8bf145c755db3fbe91c8288b99165dc46'},
    @{Name='prepare_pinned_real_project.py';Blob='ce4d56452ec0a1d513dfa419a80780eed1283894'},
    @{Name='local_qwen_no_docker_two_step.py';Blob='ec98a13b7191a3f70f58af3bf3c08f85c8e60503'},
    @{Name='REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json';Blob='64092643467a6fb07753d669839106eed3be6102'},
    @{Name='verify_public_research_qa.py';Blob='2ffdb415541a710bd3734745575a2e4cc5fb73b6'}
  )
  $sourceDir = Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\PublicExistingDraftSource\' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $sourceDir | Out-Null
  foreach ($file in $files) {
    $target = Join-Path $sourceDir $file.Name
    $url = "https://raw.githubusercontent.com/$repo/$revision/tools/free-autonomy-solo/$($file.Name)"
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $target
    $hash = ((& git hash-object $target) | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $hash -cne $file.Blob) {
      throw ('AUDITED_PYTHON_BLOB_MISMATCH_' + $file.Name)
    }
  }
  Write-Host "SOURCE_PINS_PASS; SELECTED_PROJECT=$project; EXACT_STAGE_HASHES_VERIFIED"
  Write-Host 'PUBLICATION_NOTICE: Both complete Qwen-generated draft snapshots will become PERMANENTLY PUBLIC Git history in the specified RESEARCH branch.'
  Write-Host 'USER_PUBLICATION_AUTHORIZATION: given in current conversation. No model re-run or main push.'
  # Independently re-check existing candidates on the same Windows system,
  # including Node syntax parsing without execution, immediately before publishing.
  & python (Join-Path $sourceDir 'promote_private_real_drafts_docker.py') --receipt-dir $receiptDir --project $project --model $model --mjs-syntax-only | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'FINAL_PRIVATE_MJS_PREPUBLICATION_QA_HOLD' }
  $recheck = Get-Content -LiteralPath (Join-Path $receiptDir 'SHAREABLE_MJS_SYNTAX_RESULT.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($recheck.status -cne 'PRIVATE_MAB_MODULE_SYNTAX_ONLY_PASS' -or
      @($recheck.stages).Count -ne 2 -or
      $recheck.stages[0].candidate_sha256 -cne $stage1 -or
      $recheck.stages[1].candidate_sha256 -cne $stage2) {
    throw 'EXACT_PREPUBLICATION_CANDIDATE_HASHES_CHANGED'
  }
  # The established sender requires explicit --publish-public-code, pins one
  # existing public research branch, and pushes one JSON addition only.
  $submittedLines = @(& python (Join-Path $sourceDir 'submit_public_research_qa.py') --receipt-dir $receiptDir --project $project --model $model --publish-public-code)
  $submittedExit = $LASTEXITCODE
  if ($submittedExit -ne 0) {
    throw 'PUBLIC_RESEARCH_SUBMISSION_HOLD_OR_UNKNOWN_CHECK_GITHUB'
  }
  try { $submitted = ($submittedLines -join "`n") | ConvertFrom-Json } catch {
    throw 'PUBLIC_SUBMISSION_JSON_UNKNOWN_CHECK_GITHUB'
  }
  if ($submitted.status -cne 'PUBLIC_RESEARCH_QA_SUBMITTED' -or
      $submitted.git_remote -cne $repo -or
      $submitted.git_branch -cne $branch -or
      [string]$submitted.commit -cnotmatch '^[0-9a-f]{40}$') {
    throw 'PUBLIC_SUBMISSION_IDENTITY_INVALID_CHECK_GITHUB'
  }
  $report.public_submission_commit = [string]$submitted.commit
  $report.public_submission_confirmed = $true
  $report.status = 'PUBLIC_RESEARCH_SUBMITTED_GITHUB_QA_PENDING'
  Write-Host ('PUBLIC_QA_SUBMISSION_COMMIT=' + $report.public_submission_commit)
  Write-Host ('PUBLIC_QA_RESEARCH_BRANCH=' + $branch)

  # Exact-sha, exact-workflow, exact-branch, exact-push-event observation.
  & python (Join-Path $sourceDir 'verify_public_research_qa.py') --receipt-dir $receiptDir --commit $report.public_submission_commit --wait-seconds 1800 | Out-Null
  $qaFile = Join-Path $receiptDir 'SHAREABLE_GITHUB_QA_STATUS.json'
  if (-not (Test-Path -LiteralPath $qaFile -PathType Leaf)) {
    throw 'EXACT_GITHUB_QA_STATUS_UNAVAILABLE'
  }
  $qa = Get-Content -LiteralPath $qaFile -Raw -Encoding UTF8 | ConvertFrom-Json
  $report.github_qa_workflow_status = [string]$qa.status
  $report.github_qa_run_id = $qa.github_run_id
  $report.github_qa_run_url = $qa.github_run_url
  if ($qa.status -cne 'EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY') {
    throw 'PUBLIC_RESEARCH_SUBMITTED_BUT_INDEPENDENT_GITHUB_QA_NOT_SUCCESS'
  }
  $report.status = 'EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY'
  Write-Host ('EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY=' + $report.github_qa_run_url)
} catch {
  $reason = [string]$_.Exception.Message
  $report.reason = $reason.Substring(0, [Math]::Min($reason.Length, 160))
  if ($report.public_submission_confirmed) {
    $report.status = 'PUBLIC_RESEARCH_SUBMITTED_INDEPENDENT_QA_HOLD'
  } else {
    # A failed/uncertain Git push result can still leave the data public.
    $report.status = 'PUBLIC_SUBMISSION_NOT_CONFIRMED_VERIFY_RESEARCH_BRANCH'
  }
  Write-Host ('HANDOFF_HOLD=' + $report.reason)
} finally {
  if (-not $reportDir) {
    $reportDir = Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\PublicHandoffStatus\' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
  }
  $statusPath = Join-Path $reportDir 'SHAREABLE_REAL_QWEN_PUBLIC_QA_HANDOFF.json'
  $report | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $statusPath -Encoding UTF8
  Write-Host ('UPLOAD_THIS_SMALL_PUBLIC_QA_HANDOFF_JSON=' + $statusPath)
  try {
    Start-Process -FilePath explorer.exe -ArgumentList ('/select,"' + $statusPath + '"') -ErrorAction Stop
  } catch {
    Write-Host 'RESULT_EXPLORER_UNAVAILABLE__USE_REPORTED_JSON_PATH'
  }
}
if ($report.status -ne 'EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY') { exit 2 }

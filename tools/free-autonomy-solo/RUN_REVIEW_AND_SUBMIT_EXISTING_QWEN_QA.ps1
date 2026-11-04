# One selected existing LOCAL private MAB Qwen run -> EXPLICIT reviewed PUBLIC research QA.
# No Qwen/model inference, no model pull, no Docker install, no paid API or main write.
# Actual publication requires inspecting local diffs and typing uppercase PUBLIC.
[CmdletBinding()]
param([switch]$CiParseOnly)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($CiParseOnly) {
  Write-Host 'PUBLIC_REVIEW_LAUNCHER_PARSER_ONLY_NO_DOWNLOAD_OR_PUBLISH'
  exit 0
}
if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA_REQUIRED' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'GIT_REQUIRED_NO_AUTO_INSTALL' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'PYTHON_REQUIRED_NO_AUTO_INSTALL' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'NODE_REQUIRED_NO_AUTO_INSTALL' }

$revision = 'f4fe15208303c195b3eced20ae354da7360e2e2a'
$repo = 'ryomashibaba/MinecraftAIBuilder'
$files = @(
  @{ Name = 'submit_existing_mab_qwen_qa.py'; Blob = '59cd532f74c914e9fa353dcc16f4c67bd7dd3d45' },
  @{ Name = 'submit_public_research_qa.py'; Blob = 'ed08b6fe475e48d0c417ea44227906df8c4f58e3' },
  @{ Name = 'public_qa_handoff_protocol.py'; Blob = '25c79a24881b94540332722367bc05aafa25ebaf' },
  @{ Name = 'promote_private_real_drafts_docker.py'; Blob = 'b1675da4dbae2fb9b3e7115507777c5104f8dd98' },
  @{ Name = 'draft_real_project_local14b.py'; Blob = '3651e8e8bf145c755db3fbe91c8288b99165dc46' },
  @{ Name = 'docker_sandbox.py'; Blob = '20b6817b1e50c99435cdb29a13beafdb4fbcf4dd' },
  @{ Name = 'prepare_pinned_real_project.py'; Blob = 'ce4d56452ec0a1d513dfa419a80780eed1283894' },
  @{ Name = 'local_qwen_no_docker_two_step.py'; Blob = 'ec98a13b7191a3f70f58af3bf3c08f85c8e60503' },
  @{ Name = 'REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json'; Blob = '64092643467a6fb07753d669839106eed3be6102' },
  @{ Name = 'verify_public_research_qa.py'; Blob = '2ffdb415541a710bd3734745575a2e4cc5fb73b6' }
)
$dir = Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\ReviewedExistingQwenQA\' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $dir -Force | Out-Null
foreach ($file in $files) {
  $output = Join-Path $dir $file.Name
  $url = "https://raw.githubusercontent.com/$repo/$revision/tools/free-autonomy-solo/$($file.Name)"
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $output
  $actual = ((& git hash-object $output) | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $actual -cne $file.Blob) {
    throw ('REVIEWED_PYTHON_BUNDLE_INTEGRITY_HOLD_' + $file.Name)
  }
}
Write-Host 'ALL_10_REVIEWED_FILES_HASH_MATCH'
Write-Host 'Existing MinecraftAIBuilder Qwen3:14B exact TWO draft hashes only.'
Write-Host 'First the actual code differences are displayed LOCALLY for review.'
Write-Host 'ONLY if you type uppercase PUBLIC will the full two drafts be permanently published to the PUBLIC GitHub research branch.'
Write-Host 'The user original, main, and PR are not changed. The GitHub Actions runner handles isolated Docker QA.'
$env:PYTHONNOUSERSITE = '1'
$env:PYTHONPATH = ''
& python (Join-Path $dir 'submit_existing_mab_qwen_qa.py')
$exitCode = $LASTEXITCODE
Write-Host ('PUBLIC_RESEARCH_QA_EXIT=' + $exitCode)
if ($exitCode -ne 0) {
  Write-Host 'No success assumed; see the saved small JSON for whether publication occurred.'
  exit 2
}
Write-Host 'EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY; NOT BUILDING ART CERTIFICATION'

# One selected project: local Qwen14B -> 2 private source drafts -> PUBLIC GitHub QA.
# Requires EXPLICIT opt-in because all published source persists in PUBLIC Git history.
# No Docker is needed on Windows. GitHub Actions runs network-none Docker QA.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('minecraftaibuilder','browser-ink-tps')]
  [string] $Project,

  [ValidatePattern('^[A-Za-z0-9_.:/-]{1,100}$')]
  [string] $Model = 'qwen3:14b',

  [switch] $PublishPublicCode
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $PublishPublicCode) {
  throw 'PUBLIC_GITHUB_SOURCE_DISCLOSURE_NOT_AUTHORIZED__USE_EXISTING_PRIVATE_DRAFT_TOOL_INSTEAD'
}
if (-not $env:LOCALAPPDATA) { throw 'WINDOWS_LOCALAPPDATA_REQUIRED' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'GIT_REQUIRED_NO_AUTO_INSTALL' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'PYTHON_REQUIRED_NO_AUTO_INSTALL' }

# Immutable reviewed research code; these are checked by Git blob SHA before use.
$rev = '36b55a8b9f7b5f65884b5d722a34496e66d97362'
$origin = 'ryomashibaba/MinecraftAIBuilder'
$items = @(
  @{ Name = 'draft_real_project_local14b.py'; Blob = 'fad5f00994f467e65891319a202edbe407a2d4aa' },
  @{ Name = 'prepare_pinned_real_project.py'; Blob = 'ce4d56452ec0a1d513dfa419a80780eed1283894' },
  @{ Name = 'local_qwen_no_docker_two_step.py'; Blob = 'ec98a13b7191a3f70f58af3bf3c08f85c8e60503' },
  @{ Name = 'REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json'; Blob = '64092643467a6fb07753d669839106eed3be6102' },
  @{ Name = 'submit_public_research_qa.py'; Blob = 'ed08b6fe475e48d0c417ea44227906df8c4f58e3' },
  @{ Name = 'public_qa_handoff_protocol.py'; Blob = '25c79a24881b94540332722367bc05aafa25ebaf' },
  @{ Name = 'promote_private_real_drafts_docker.py'; Blob = '233cedaac2ccb292f2951148e115c3fd7ba08db8' },
  @{ Name = 'docker_sandbox.py'; Blob = 'e68c8e2c4f356d2741105aee6ff5660abdb7a294' }
)
$directory = Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\PublicQASourceBootstrap\' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $directory | Out-Null
foreach ($item in $items) {
  $filename = $item.Name
  $destination = Join-Path $directory $filename
  $uri = "https://raw.githubusercontent.com/$origin/$rev/tools/free-autonomy-solo/$filename"
  Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $destination
  $found = ((& git hash-object $destination) | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $found -ne $item.Blob) {
    throw "PINNED_SOURCE_BLOB_MISMATCH_$filename"
  }
}
Write-Host 'PUBLIC_GITHUB_CODE_WARNING: The chosen public-repo source and model edits will be committed to PUBLIC Git history forever.'
Write-Host "FIXED_SOURCE_SHA_VERIFIED; CHOSEN_PROJECT=$Project; MODEL=$Model"
$lines = @(& python (Join-Path $directory 'draft_real_project_local14b.py') --project $Project --model $Model)
$code = $LASTEXITCODE
$lines | ForEach-Object { Write-Host $_ }
if ($code -ne 0) { throw 'LOCAL_QWEN_PRIVATE_DRAFT_HOLD__NO_PUBLIC_GITHUB_UPLOAD' }

$paths = @($lines | Where-Object { $_ -is [string] -and $_.StartsWith('PRIVATE_RESULT_PATH=') })
if ($paths.Count -ne 1) { throw 'PRIVATE_SOURCE_RECEIPT_PATH_UNAVAILABLE' }
$receiptPath = [string]$paths[0].Substring('PRIVATE_RESULT_PATH='.Length)
if (-not (Test-Path -LiteralPath $receiptPath -PathType Leaf)) {
  throw 'PRIVATE_SOURCE_RECEIPT_NOT_FOUND'
}
$receiptDir = Split-Path -LiteralPath $receiptPath -Parent
& python (Join-Path $directory 'submit_public_research_qa.py') --receipt-dir $receiptDir --project $Project --model $Model --publish-public-code
if ($LASTEXITCODE -ne 0) {
  throw 'PUBLIC_RESEARCH_QA_SUBMISSION_HOLD__NO_GITHUB_SUCCESS_CLAIM'
}
Write-Host 'PUBLIC_RESEARCH_BRANCH_SOURCE_UPLOADED; GITHUB_ACTIONS_QA_RESULT_NOT_YET_VERIFIED'

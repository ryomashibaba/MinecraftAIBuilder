# One-shot, integrity-pinned LOCAL Qwen two-source-draft pilot.
# The user explicitly selects ONE of the two equally prioritized projects.
# No model pull, Docker install, QA execution of generated code, Git commit/push.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('minecraftaibuilder', 'browser-ink-tps')]
  [string] $Project,

  [ValidatePattern('^[A-Za-z0-9_.:/-]{1,100}$')]
  [string] $Model = 'qwen3:14b'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$revision = '28acf39dbae5649835c0e4d4441cd82d07dcb2fe'
$repo = 'ryomashibaba/MinecraftAIBuilder'
$files = @(
  @{ Name = 'draft_real_project_local14b.py'; GitBlob = 'fad5f00994f467e65891319a202edbe407a2d4aa' },
  @{ Name = 'prepare_pinned_real_project.py'; GitBlob = 'ce4d56452ec0a1d513dfa419a80780eed1283894' },
  @{ Name = 'local_qwen_no_docker_two_step.py'; GitBlob = 'ec98a13b7191a3f70f58af3bf3c08f85c8e60503' },
  @{ Name = 'REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json'; GitBlob = '64092643467a6fb07753d669839106eed3be6102' }
)

if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA_REQUIRED' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'GIT_NOT_INSTALLED' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'PYTHON_NOT_INSTALLED' }

$private = Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\QwenRealProjectPilotSource\' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $private -Force | Out-Null

foreach ($file in $files) {
  $name = $file.Name
  $destination = Join-Path $private $name
  $url = "https://raw.githubusercontent.com/$repo/$revision/tools/free-autonomy-solo/$name"
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $destination
  $hash = ((& git hash-object $destination) | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $hash -ne $file.GitBlob) {
    throw "PINNED_SOURCE_INTEGRITY_HOLD_$name"
  }
}
Write-Host "PINNED_SOURCE_INTEGRITY_PASS; SINGLE_PROJECT=$Project; MODEL=$Model"
& python (Join-Path $private 'draft_real_project_local14b.py') --project $Project --model $Model
$code = $LASTEXITCODE
if ($code -ne 0) {
  throw 'LOCAL_MODEL_SOURCE_DRAFT_HOLD__SEE_SHAREABLE_RECEIPT'
}
Write-Host 'PRIVATE_DRAFTS_SAVED__NOT_EXECUTED__NO_QA_OR_GIT_COMMIT__NO_GITHUB_PUSH'

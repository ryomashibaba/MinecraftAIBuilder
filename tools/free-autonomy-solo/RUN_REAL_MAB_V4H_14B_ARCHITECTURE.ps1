# 2026 December contingency: one Windows operation, genuine EXISTING Ollama 14B
# authors 1..3 independent V4H building designs. No model pull, Docker, or push.
# Trusted source comes from immutable pinned MAB commit; generated content PRIVATE.
[CmdletBinding()]
param(
  [ValidatePattern('^[A-Za-z0-9_.:/-]{1,100}$')]
  [string] $Model = 'qwen3:14b',
  [ValidateRange(1,3)]
  [int] $Cases = 3,
  [switch] $CiSelfTest
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($CiSelfTest) {
  Write-Host 'PRIVATE_V4H_14B_WINDOWS_LAUNCHER_STATIC_ONLY_NO_MODEL_NO_NETWORK'
  exit 0
}
foreach ($program in @('python','git','node','ollama')) {
  if (-not (Get-Command $program -ErrorAction SilentlyContinue)) {
    throw ('REQUIRED_INSTALLED_PROGRAM_MISSING_NO_AUTO_INSTALL_' + $program)
  }
}
if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA_REQUIRED' }
$rev = 'ed112fd250959acfbc07094f2c51d25cd288ebbd'
$origin = 'ryomashibaba/MinecraftAIBuilder'
$files = @(
  @{ Name='real_mab_original_architecture_batch.py'; Blob='REPLACE_RUNNER_BLOB' },
  @{ Name='draft_real_project_local14b.py'; Blob='f8539d764c15217f70d0c17c5b5629cc6e9dddeb' },
  @{ Name='prepare_pinned_real_project.py'; Blob='ce4d56452ec0a1d513dfa419a80780eed1283894' },
  @{ Name='local_qwen_no_docker_two_step.py'; Blob='ec98a13b7191a3f70f58af3bf3c08f85c8e60503' },
  @{ Name='REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json'; Blob='45c51152eff0c12e0deb7f213a04c78bdc2ae41a' }
)
$download = Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\V4H14BVerifiedRunner\' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $download -Force | Out-Null
foreach ($item in $files) {
  $where = Join-Path $download $item.Name
  $url = 'https://raw.githubusercontent.com/' + $origin + '/' + $rev + '/tools/free-autonomy-solo/' + $item.Name
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $where
  $sha = ((& git hash-object $where) | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $sha -cne $item.Blob) {
    throw ('V4H_RUNNER_PINNED_BLOB_MISMATCH_' + $item.Name)
  }
}
Write-Host ('PINNED_PRIVATE_V4H_AUTHOR_RUNNER_READY MODEL=' + $Model + ' CASES=' + $Cases)
$lines = @(& python (Join-Path $download 'real_mab_original_architecture_batch.py') --model $Model --cases $Cases 2>&1)
$rc = $LASTEXITCODE
$lines | ForEach-Object { Write-Host ([string]$_) }
$receipts = @($lines | Where-Object { ([string]$_).StartsWith('PRIVATE_SHAREABLE_RESULT_PATH=') })
if ($receipts.Count -eq 1) {
  $statusFile = ([string]$receipts[0]).Substring('PRIVATE_SHAREABLE_RESULT_PATH='.Length)
  if (Test-Path -LiteralPath $statusFile -PathType Leaf) {
    try { Start-Process explorer.exe -ArgumentList ('/select,"' + $statusFile + '"') } catch {}
  }
}
if ($rc -ne 0) { throw 'GENUINE_V4H_AUTHOR_HOLD__PRIVATE_RECEIPT_PRESERVED' }
Write-Host 'V4H_SOURCE_ONLY_PRIVATE_ART_HOLD__NOT_MINECRAFT_WORLD_OR_HUMAN_ART_PASS'

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
$rev = '1294d4e71bb21845756ac90043b680b87a3d09a3'
$origin = 'ryomashibaba/MinecraftAIBuilder'
$files = @(
  @{ Name='real_mab_original_architecture_batch.py'; Blob='0546f94c05d98b2f1d1839cb12760ba396260809' },
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
# Open only the trusted, locally generated static comparison gallery.
# Its authored HTML contains no scripts; the B143 SVGs remain private images.
$views = @($lines | Where-Object { ([string]$_).StartsWith('PRIVATE_SOURCE_COMPARISON_HTML=') })
if ($views.Count -eq 1) {
  $viewPath = ([string]$views[0]).Substring('PRIVATE_SOURCE_COMPARISON_HTML='.Length)
  $base = [System.IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'FreeAutonomyPrivate\RealOriginalV4H14B'))
  $resolved = [System.IO.Path]::GetFullPath($viewPath)
  if ($resolved.StartsWith($base + [System.IO.Path]::DirectorySeparatorChar,
                           [System.StringComparison]::OrdinalIgnoreCase) -and
      (Split-Path -Path $resolved -Leaf) -ceq 'V4H_PRIVATE_SOURCE_COMPARE.html' -and
      (Test-Path -LiteralPath $resolved -PathType Leaf)) {
    try {
      Start-Process -FilePath $resolved -ErrorAction Stop
      Write-Host 'PRIVATE_V4H_SOURCE_COMPARISON_OPENED__ART_NOT_APPROVED'
    } catch {
      Write-Host ('PRIVATE_COMPARE_SAVED_OPEN_MANUALLY=' + $resolved)
    }
  } else {
    Write-Host 'PRIVATE_REVIEW_PATH_NOT_WHITELISTED_NO_OPEN'
  }
}
if ($rc -ne 0) { throw 'GENUINE_V4H_ARCHITECTURE_ALL_CASES_NOT_VERIFIED__PRIVATE_RESULTS_SAVED' }
Write-Host 'ALL_SELECTED_CASES_SOURCE_ONLY_PASS__HUMAN_ART_AND_MINECRAFT_WORLD_STILL_HOLD'

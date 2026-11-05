#Requires -Version 5.1
<#
  One MinecraftAIBuilder only: installed local Qwen3:14B -> private two
  source revisions -> real offline Docker QA -> private Git diffs/commits.
  No installs, model pulls, paid APIs, generated host-code execution or push.
  Rejected or partial evidence remains private and is never a SOURCE PASS.
#>
[CmdletBinding()]
param(
  [switch] $CiSelfTest,
  [ValidatePattern('^[A-Za-z0-9_.:/-]{1,100}$')]
  [string] $Model = 'qwen3:14b'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($CiSelfTest) {
  Write-Host 'PRIVATE_MAB_SINGLE_SESSION_STATIC_ONLY_NO_MODEL_NO_DOWNLOAD_NO_DOCKER'
  return
}
if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA_REQUIRED' }
foreach ($name in @('git','python')) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw ('MAB_PRIVATE_SOURCE_MISSING_' + $name + '_NO_AUTO_INSTALL')
  }
}
# Immutable audited source bundle; never use moving branch tip or main.
$revision = '6410cc2aaef09d7895159c03abfdefb0ef4402d0'
$origin = 'ryomashibaba/MinecraftAIBuilder'
$files = @(
  @{ Name='run_mab_private_autonomy_once.py'; Blob='ff741ebe62be4f1c7b5b420456df3559d5963d66' },
  @{ Name='draft_real_project_local14b.py'; Blob='f727db8d07a871969f9bb92f6278b53d57b614b7' },
  @{ Name='promote_private_real_drafts_docker.py'; Blob='ce668f1e4901a701ec2a0b09812b74c7e7398a1e' },
  @{ Name='private_verified_source_evidence.py'; Blob='94c71a1cb983e89981ea6b89302e14653f986dea' },
  @{ Name='prepare_pinned_real_project.py'; Blob='ce4d56452ec0a1d513dfa419a80780eed1283894' },
  @{ Name='local_qwen_no_docker_two_step.py'; Blob='ec98a13b7191a3f70f58af3bf3c08f85c8e60503' },
  @{ Name='docker_sandbox.py'; Blob='20b6817b1e50c99435cdb29a13beafdb4fbcf4dd' },
  @{ Name='REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json'; Blob='45c51152eff0c12e0deb7f213a04c78bdc2ae41a' }
)
$download = Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\MABPrivateSessionBootstrap\' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $download | Out-Null
foreach ($entry in $files) {
  $name = $entry.Name
  $filename = Join-Path $download $name
  $url = 'https://raw.githubusercontent.com/' + $origin + '/' + $revision + '/tools/free-autonomy-solo/' + $name
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $filename
  $blob = ((& git hash-object --no-filters $filename) | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $blob -cne $entry.Blob) {
    throw ('MAB_SINGLE_SESSION_DEPENDENCY_BLOB_MISMATCH_' + $name)
  }
}
Write-Host 'IMMUTABLE_MAB_SOURCE_SUPERVISOR_VERIFIED'
Write-Host 'ONE_PROJECT_PRIVATE_QWEN_AND_DOCKER_SOURCE_QA_ONLY'
Write-Host 'DOCKER_ABSENCE_HOLDS_BEFORE_ANY_LOCAL_MODEL_GENERATION'
$lines = @(& python (Join-Path $download 'run_mab_private_autonomy_once.py') --model $Model 2>&1)
$code = $LASTEXITCODE
$lines | ForEach-Object { Write-Host ([string]$_) }
$recs = @($lines | Where-Object {
  ([string]$_).StartsWith('PRIVATE_SHAREABLE_RESULT_PATH=')
})
if ($recs.Count -eq 1) {
  $json = ([string]$recs[0]).Substring('PRIVATE_SHAREABLE_RESULT_PATH='.Length)
  if (Test-Path -LiteralPath $json -PathType Leaf) {
    try {
      Start-Process explorer.exe -ArgumentList ('/select,"' + $json + '"') -ErrorAction Stop | Out-Null
    } catch {
      Write-Host ('PRIVATE_RECEIPT_PATH=' + $json)
    }
  }
}
if ($code -ne 0) {
  throw 'MAB_SOURCE_PRIVATE_SESSION_HOLD__NO_PUBLIC_CODE_OR_SOURCE_CERTIFICATION'
}
Write-Host 'ONLY_2_QA_VERIFIED_PRIVATE_GIT_COMMITS__HUMAN_REVIEW_AND_GAMEPLAY_STILL_HOLD'

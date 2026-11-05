#Requires -Version 5.1
<#
  MinecraftAIBuilder only: Qwen3:14b may make 3 cumulative pairs of
  independently QA-verified PRIVATE source revisions.
  No Docker/model installation, paid API or public source upload.
#>
[CmdletBinding()]
param(
  [switch]$CiSelfTest,
  [switch]$ResumeLatest,
  [ValidatePattern('^[A-Za-z0-9_.:/-]{1,100}$')]
  [string]$Model='qwen3:14b'
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if ($CiSelfTest) {
  Write-Host 'MAB_CUMULATIVE_6_SOURCE_REVISIONS_STATIC_NO_MODEL_NO_NETWORK'
  return
}
if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA_REQUIRED' }
foreach ($program in @('git','python')) {
  if (-not (Get-Command $program -ErrorAction SilentlyContinue)) {
    throw ('MISSING_COMMAND_' + $program + '_NO_AUTO_INSTALL')
  }
}
$revision='31ef7b5ac8b2fea9fc4ead07caaddbf6b8588eec'
$repo='ryomashibaba/MinecraftAIBuilder'
$items=@(
  @{ Name='run_mab_private_continuous.py'; Blob='2745a9bab3ddd56ee8f1fa83e11c710200a654b1' },
  @{ Name='run_mab_private_autonomy_once.py'; Blob='ff741ebe62be4f1c7b5b420456df3559d5963d66' },
  @{ Name='draft_real_project_local14b.py'; Blob='e06af88b4c47a13df8b1ce7c59b635caa35fada6' },
  @{ Name='promote_private_real_drafts_docker.py'; Blob='89a038891996c52fc153935f58ba14439c11ac21' },
  @{ Name='private_verified_source_evidence.py'; Blob='94c71a1cb983e89981ea6b89302e14653f986dea' },
  @{ Name='prepare_pinned_real_project.py'; Blob='ce4d56452ec0a1d513dfa419a80780eed1283894' },
  @{ Name='local_qwen_no_docker_two_step.py'; Blob='ec98a13b7191a3f70f58af3bf3c08f85c8e60503' },
  @{ Name='docker_sandbox.py'; Blob='20b6817b1e50c99435cdb29a13beafdb4fbcf4dd' },
  @{ Name='REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json'; Blob='45c51152eff0c12e0deb7f213a04c78bdc2ae41a' }
)
$base=Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\MABCumulativeBootstrap\' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $base | Out-Null
foreach ($entry in $items) {
  $name=$entry.Name
  $target=Join-Path $base $name
  $url='https://raw.githubusercontent.com/' + $repo + '/' + $revision + '/tools/free-autonomy-solo/' + $name
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $target
  $sha=((& git hash-object --no-filters $target) | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $sha -cne $entry.Blob) {
    throw ('IMMUTABLE_CUMULATIVE_SOURCE_BLOB_MISMATCH_' + $name)
  }
}
Write-Host 'MAB_IMMUTABLE_CUMULATIVE_SOURCE_VERIFIED'
Write-Host 'ONE_PROJECT_MAX_3_CYCLES_6_QA_SOURCE_REVISIONS'
Write-Host 'NO_MODEL_PULL_NO_PAID_API_NO_GITHUB_PUSH'
$pythonArgs=@('--model',$Model,'--cycles','3')
if ($ResumeLatest) {
  $pythonArgs+= '--resume-latest'
  Write-Host 'RESUME_ONLY_PREVIOUS_FULLY_VERIFIED_PRIVATE_QA__NO_REGENERATE_PRIOR_STAGES'
}
$lines=@(& python (Join-Path $base 'run_mab_private_continuous.py') @pythonArgs 2>&1)
$exitCode=$LASTEXITCODE
$lines | ForEach-Object { Write-Host ([string]$_) }
$resultRows=@($lines | Where-Object {
  ([string]$_).StartsWith('PRIVATE_SHAREABLE_RESULT_PATH=')
})
if ($resultRows.Count -eq 1) {
  $json=([string]$resultRows[0]).Substring('PRIVATE_SHAREABLE_RESULT_PATH='.Length)
  if (Test-Path -LiteralPath $json -PathType Leaf) {
    try {
      Start-Process explorer.exe -ArgumentList ('/select,"' + $json + '"') -ErrorAction Stop | Out-Null
    } catch {
      Write-Host ('PRIVATE_STATUS_JSON=' + $json)
    }
  }
}
if ($exitCode -ne 0) { throw 'MAB_CUMULATIVE_PRIVATE_SOURCE_HOLD__SEE_SAFE_RECEIPT' }
Write-Host 'SIX_CUMULATIVE_SOURCE_QA_REVISIONS_PRIVATE_ONLY__ART_GAMEPLAY_HOLD'

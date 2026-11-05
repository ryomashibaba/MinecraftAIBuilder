#Requires -Version 5.1
<#
  Dec current-V6 PRIVATE local Qwen research, one click.
  Default: ONE textual model proposal, never executed or published.
  -WithDockerQa: use the existing network-none Docker independent SOURCE QA.
  No install, model pull, paid API, Work, source push or world write.
#>
[CmdletBinding()]
param(
  [switch]$WithDockerQa,
  [switch]$CiSelfTest
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($CiSelfTest) {
  Write-Host 'DEC_V6_CURRENT_PRIVATE_BOOTSTRAP_STATIC_NO_MODEL'
  return
}
if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA_REQUIRED_NO_MODEL' }
foreach ($program in @('git', 'python')) {
  if (-not (Get-Command $program -ErrorAction SilentlyContinue)) {
    throw ('MISSING_' + $program + '_NO_AUTO_INSTALL')
  }
}
$repo='ryomashibaba/MinecraftAIBuilder'
$commit='b03cd958242afaabe5c0fac442df35f574aeb3d1'
$entries=@(
  @{ Name='dec_current_v6_private.py'; Blob='a6f7329a73a94e5b8474d172cd44ae239cd2aeec' },
  @{ Name='prepare_pinned_real_project.py'; Blob='ce4d56452ec0a1d513dfa419a80780eed1283894' },
  @{ Name='local_ollama_patch_loop.py'; Blob='f063712259f67deaa0c0d8017b06e75299075514' },
  @{ Name='docker_sandbox.py'; Blob='20b6817b1e50c99435cdb29a13beafdb4fbcf4dd' },
  @{ Name='solo_agent.py'; Blob='c97ee68936516a99b95e143e014b72ece0a22e0d' },
  @{ Name='local_ollama_real_probe.py'; Blob='a793ae298d5ecf35330c01d336266eea313b6132' },
  @{ Name='REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json'; Blob='45c51152eff0c12e0deb7f213a04c78bdc2ae41a' }
)
$base=Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\DecV6Bootstrap\' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $base | Out-Null
foreach ($item in $entries) {
  $target=Join-Path $base $item.Name
  $url='https://raw.githubusercontent.com/' + $repo + '/' + $commit + '/tools/free-autonomy-solo/' + $item.Name
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $target
  $blob=((& git hash-object --no-filters $target) | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $blob -cne $item.Blob) {
    throw ('DEC_V6_IMMUTABLE_SOURCE_MISMATCH_' + $item.Name + '_NO_MODEL')
  }
}
Write-Host 'CURRENT_V6_BOOTSTRAP_IMMUTABLE_PINS_PASS'
Write-Host 'PROJECT=MinecraftAIBuilder RESEARCH_SOURCE=V4J_V6'
Write-Host 'No original source writes, no paid API, no public model output, no world writes.'
if ($WithDockerQa) {
  Write-Host 'MODE=INDEPENDENT_DOCKER_QA_PRIVATE_ONLY'
  Write-Host 'Existing Docker and node:22-bookworm-slim are required; no installation.'
} else {
  Write-Host 'MODE=ONE_PRIVATE_TEXT_DRAFT_NO_QA_NO_EXECUTION'
}
Write-Host 'Do not run concurrently with Strata inference or other heavy local models.'
$answer=Read-Host 'Type Y to start the explicitly selected PRIVATE Qwen session (anything else cancels)'
if ($answer -cne 'Y' -and $answer -cne 'y') {
  Write-Host 'HOLD_USER_DID_NOT_AUTHORIZE_LOCAL_MODEL'
  return
}
$argsRun=@('--draft-only')
if ($WithDockerQa) { $argsRun=@('--run') }
$output=@(& python (Join-Path $base 'dec_current_v6_private.py') @argsRun 2>&1)
$rc=$LASTEXITCODE
$output | ForEach-Object { Write-Host ([string]$_) }
$paths=@($output | Where-Object {
  ([string]$_).StartsWith('PRIVATE_SHAREABLE_RESULT_PATH=')
})
if ($paths.Count -eq 1) {
  $p=([string]$paths[0]).Substring('PRIVATE_SHAREABLE_RESULT_PATH='.Length)
  if (Test-Path -LiteralPath $p -PathType Leaf) {
    try {
      Start-Process explorer.exe -ArgumentList ('/select,"' + $p + '"') -ErrorAction Stop | Out-Null
    } catch {
      Write-Host ('SHARE_ONLY_THIS_JSON=' + $p)
    }
  }
}
if ($rc -ne 0) { throw 'DEC_V6_PRIVATE_SOURCE_HOLD_SEE_SAFE_RECEIPT' }
Write-Host 'PRIVATE_SOURCE_ONLY; no certification or publication performed.'

# READ-ONLY private source preflight for previously generated Qwen drafts.
# No model invocation, no Docker, no source execution, no network upload, no git push.
[CmdletBinding()]
param(
  [ValidateSet('minecraftaibuilder','browser-ink-tps')]
  [string] $Project = 'minecraftaibuilder',
  [ValidatePattern('^[A-Za-z0-9_.:/-]{1,100}$')]
  [string] $Model = 'qwen3:14b'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $env:LOCALAPPDATA) { throw 'WINDOWS_LOCALAPPDATA_REQUIRED' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'GIT_REQUIRED_NO_INSTALL' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'PYTHON_REQUIRED_NO_INSTALL' }

$base = Join-Path $env:LOCALAPPDATA 'FreeAutonomyPrivate\Local14BRealProjectDrafts\PrivateClones'
if (-not (Test-Path -LiteralPath $base -PathType Container)) {
  throw 'NO_PREVIOUS_PRIVATE_CLONES_NO_MODEL_RERUN'
}
$eligible = @()
foreach ($folder in @(Get-ChildItem -LiteralPath $base -Directory -Filter ($Project + '-*'))) {
  if (($folder.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
  $receipt = Join-Path $folder.FullName 'SHAREABLE_DRAFT_RESULT.json'
  if (-not (Test-Path -LiteralPath $receipt -PathType Leaf)) { continue }
  $item = Get-Item -LiteralPath $receipt
  if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
  try {
    $data = Get-Content -LiteralPath $receipt -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($data.schema -eq 'real-project-qwen-local-private-draft-v1' -and
        $data.status -eq 'TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY' -and
        $data.project -eq $Project -and
        $data.model_requested -eq $Model -and
        [int]$data.model_drafts -eq 2) {
      $eligible += [pscustomobject]@{
        Folder = $folder.FullName
        Updated = $item.LastWriteTimeUtc
      }
    }
  } catch {
    # Unreadable/invalid prior receipts are never promoted.
  }
}
if ($eligible.Count -eq 0) {
  throw 'NO_SUCCESSFUL_PRIVATE_DRAFTS_FOUND_NO_MODEL_RERUN'
}
$chosen = @($eligible | Sort-Object -Property Updated -Descending)[0]
$root = [string]$chosen.Folder

# Immutable reviewed Python bundle: verify each Git blob before import.
$revision = '18fe21c5e13b2166f4e0d03da7e0e0f832e6f84c'
$repo = 'ryomashibaba/MinecraftAIBuilder'
$items = @(
  @{ Name = 'promote_private_real_drafts_docker.py'; Blob = '906ff96a31a5cf89ac9c5405b37328ec58fb7099' },
  @{ Name = 'docker_sandbox.py'; Blob = '20b6817b1e50c99435cdb29a13beafdb4fbcf4dd' },
  @{ Name = 'prepare_pinned_real_project.py'; Blob = 'ce4d56452ec0a1d513dfa419a80780eed1283894' },
  @{ Name = 'draft_real_project_local14b.py'; Blob = '3651e8e8bf145c755db3fbe91c8288b99165dc46' },
  @{ Name = 'local_qwen_no_docker_two_step.py'; Blob = 'ec98a13b7191a3f70f58af3bf3c08f85c8e60503' },
  @{ Name = 'REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json'; Blob = '64092643467a6fb07753d669839106eed3be6102' }
)
$sourceFolder = Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\StaticAuditSource\' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $sourceFolder | Out-Null
foreach ($file in $items) {
  $destination = Join-Path $sourceFolder $file.Name
  $url = "https://raw.githubusercontent.com/$repo/$revision/tools/free-autonomy-solo/$($file.Name)"
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $destination
  $found = ((& git hash-object $destination) | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $found -cne $file.Blob) {
    throw ('PINNED_AUDITOR_INTEGRITY_HOLD_' + $file.Name)
  }
}
Write-Host ('SINGLE_PROJECT=' + $Project + '; EXISTING_PRIVATE_DRAFTS_ONLY; NO_NEW_MODEL_REQUEST')
Write-Host 'STATIC CHECK: receipt hashes, exact source origin, Git identity, bounded changes, protected anchors'
& python (Join-Path $sourceFolder 'promote_private_real_drafts_docker.py') --receipt-dir $root --project $Project --model $Model --static-only
$code = $LASTEXITCODE
$statusFile = Join-Path $root 'SHAREABLE_STATIC_PREFLIGHT.json'
if (-not (Test-Path -LiteralPath $statusFile -PathType Leaf)) {
  throw 'STATIC_PREFLIGHT_RESULT_MISSING'
}
Write-Host ('UPLOAD_THIS_SMALL_STATIC_PREFLIGHT_JSON=' + $statusFile)
try {
  Start-Process -FilePath explorer.exe -ArgumentList ('/select,"' + $statusFile + '"') -ErrorAction Stop
  Write-Host 'STATIC_RESULT_SHOWN_IN_EXPLORER'
} catch {
  Write-Host 'EXPLORER_UNAVAILABLE__USE_REPORTED_JSON_PATH'
}
if ($code -ne 0) { throw 'STATIC_PREFLIGHT_HOLD_SEE_SHAREABLE_RESULT' }
Write-Host 'STATIC_ADMISSION_ONLY__REAL_SOURCE_QA_NOT_RUN__NO_GIT_COMMIT_OR_PUSH'

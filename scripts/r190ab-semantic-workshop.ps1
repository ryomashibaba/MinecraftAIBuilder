# R190-AB semantic-space local study: preserves the user's existing checkout.
# Windows PowerShell 5.1-compatible. No remote APIs beyond git fetch and
# explicit Ollama loopback request via the existing tested R190-AB runner.
# Default check-only; -Run calls ONE model. -Replay: zero model calls, isolated output.
param(
 [switch]$Run,
 [switch]$Replay,
 [switch]$Expressive,
 [string]$Repository = "",
 [string]$Study = "",
 [string]$ExpectedSha = "61f01f9e43f4da60533367bf2304ac7a817ee51c7ee0d9508dca01a67544a8a0"
)
$ErrorActionPreference = "Stop"
if ($Run -and $Replay) { throw "-Run and -Replay are mutually exclusive" }
if ($Expressive -and (-not $Run -or $Replay)) {
 throw "-Expressive requires -Run and must not be combined with -Replay"
}
if (-not $Study) {
 $Study = if ($Expressive) { "expressive-workshop-01" } else { "semantic-workshop-01" }
}
if ($Replay -and $ExpectedSha -cnotmatch '^[0-9a-f]{64}$') {
 throw "Replay must pin the existing 64-digit original SHA256"
}
$branch = "feature/b198zr1-protected-architectural-revision"
$repo = if ($Repository) { [IO.Path]::GetFullPath($Repository) } else {
 [IO.Path]::GetFullPath((Get-Location).Path)
}
$allowedStudy = $Study -cmatch '^[a-z][a-z0-9-]{2,39}$'
if (-not $allowedStudy -or $Study -eq "contract-01") {
 throw "Unsafe or reserved study name: $Study"
}
function Invoke-CheckedGit([string[]]$Arguments) {
 & git @Arguments
 if ($LASTEXITCODE -ne 0) {
  throw "git command failed: $($Arguments -join ' ')"
 }
}
if (-not (Test-Path -LiteralPath (Join-Path $repo ".git"))) {
 throw "Run from the canonical MinecraftAIBuilder repository: $repo"
}
Push-Location -LiteralPath $repo
$work = $null
$preserveWorktree = $false
try {
 $top = (& git rev-parse --show-toplevel).Trim()
 if ($LASTEXITCODE -ne 0 -or
     [IO.Path]::GetFullPath($top).TrimEnd('\') -ine
     [IO.Path]::GetFullPath($repo).TrimEnd('\')) {
  throw "Not the repository root: $repo"
 }
 $currentBranch = (& git branch --show-current).Trim()
 if ($LASTEXITCODE -ne 0 -or $currentBranch -cne $branch) {
  throw "Wrong branch; stop without changing files: $currentBranch"
 }
 $targetParent = Join-Path $repo "r190ab-local-evidence"
 $target = Join-Path $targetParent $Study
 if ($Replay) {
  if (-not (Test-Path -LiteralPath $target)) {
   throw "No archived study to replay: $target"
  }
 } elseif (Test-Path -LiteralPath $target) {
  throw "Study already exists; no overwrite/retry: $target"
 }
 Write-Host "Existing Windows working tree, NOT altered:"
 & git status --short
 if ($LASTEXITCODE -ne 0) { throw "git status failed" }
 Write-Host "Fetching reviewed branch without pull/reset/checkout..."
 Invoke-CheckedGit -Arguments @("fetch","--no-tags","origin",$branch)
 $revision = (& git rev-parse FETCH_HEAD).Trim()
 if ($LASTEXITCODE -ne 0 -or $revision -cnotmatch '^[0-9a-f]{40}$') {
  throw "FETCH_HEAD could not be pinned"
 }
 Write-Host "Fetched exact source revision: $revision"
 # A separate detached worktree avoids overwriting the user's two dirty AA
 # source files, obsolete local scripts, and prior model evidence.
 $work = Join-Path $env:TEMP ("MinecraftAIBuilder-R190AB-" + [guid]::NewGuid().ToString("N"))
 Invoke-CheckedGit -Arguments @("worktree","add","--detach",$work,$revision)
 Push-Location -LiteralPath $work
 try {
  Write-Host "Run original-source regression suites before any model call..."
  & node --test scripts/r190ab-structured-output-pilot.test.mjs
  if ($LASTEXITCODE -ne 0) { throw "AB regression FAILED. No inference." }
  & node --test scripts/r190ac-offline-source-review.test.mjs
  if ($LASTEXITCODE -ne 0) { throw "AC regression FAILED. No inference." }
  Write-Host "AB+AC regression PASS at pinned revision $revision"
  if ($Expressive) {
   & node --test scripts/r190ad-expressive-semantic.test.mjs
   if ($LASTEXITCODE -ne 0) {
    throw "Expressive geometric/contract regression FAILED. No Qwen inference."
   }
   Write-Host "R190-AD expressive source regression PASS."
  }
  if ($Replay) {
   & node --test scripts/r190ab-saved-semantic-replay.test.mjs
   if ($LASTEXITCODE -ne 0) { throw "Replay regression FAILED. No inference." }
   $replayOut = Join-Path $targetParent ($Study + "-replay-" + $revision.Substring(0,12))
   if (Test-Path -LiteralPath $replayOut) {
    throw "Replay output already exists; no overwrite: $replayOut"
   }
   & node scripts/r190ab-saved-semantic-replay.mjs --study $target --out $replayOut --expected-sha $ExpectedSha
   if ($LASTEXITCODE -ne 0) {
    throw "Replay HOLD: original archived study kept, inspect diagnostics"
   }
   Write-Host "REPLAY SOURCE ONLY, no Qwen calls. Output: $replayOut"
   return
  }
  if (-not $Run) {
   Write-Host "CHECK ONLY: Ollama untouched, original checkout unchanged."
   return
  }
  $generated = Join-Path (Join-Path $work "r190ab-local-evidence") $Study
  if (Test-Path -LiteralPath $generated) {
   throw "Unexpected preexisting detached-worktree study"
  }
  $contract = if ($Expressive) { "semantic-space-expressive" } else { "semantic-space" }
  Write-Host "Requesting at most one local Qwen3:14b response with $contract..."
  & node scripts/r190ab-structured-output-pilot.mjs --run --contract $contract --study $Study --task tidal-workshop --model qwen3:14b
  $runCode = $LASTEXITCODE
  if (-not (Test-Path -LiteralPath $generated)) {
   throw "No saved response; Ollama preflight may have failed. Exit: $runCode"
  }
  # Never discard even a failed/partial Ollama study after provider contact.
  $preserveWorktree = $true
  if (Test-Path -LiteralPath $target) {
   throw "Canonical evidence appeared concurrently; not overwriting"
  }
  if (-not (Test-Path -LiteralPath $targetParent)) {
   New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
  }
  Copy-Item -LiteralPath $generated -Destination $target -Recurse -ErrorAction Stop
  foreach ($original in (Get-ChildItem -LiteralPath $generated -Recurse -File)) {
   $relative = $original.FullName.Substring($generated.Length).TrimStart('\','/')
   $copy = Join-Path $target $relative
   if (-not (Test-Path -LiteralPath $copy)) {
    throw "Copy missing required evidence: $relative"
   }
   $h1 = (Get-FileHash -LiteralPath $original.FullName -Algorithm SHA256).Hash
   $h2 = (Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash
   if ($h1 -cne $h2) { throw "Evidence SHA mismatch: $relative" }
  }
  Write-Host "Immutable result copied and SHA verified: $target"
  if ($runCode -ne 0) {
   Write-Warning "Model study returned HOLD/nonzero ($runCode); evidence kept."
  }
  if ($Expressive) {
   Write-Host "R190-AD expressive audit is in its immutable result; R190-AC legacy reviewer is incompatible and is not run."
   Write-Host "Independent art, live walking and weather checks remain HOLD."
  } else {
   Write-Host "R190-AC saved comparison (read-only):"
   & node scripts/r190ac-offline-source-review.mjs --ab $target
   $reviewCode = $LASTEXITCODE
   if ($reviewCode -ne 0) {
    Write-Warning "AC review returned HOLD; see preserved original evidence."
   }
  }
  $preserveWorktree = $false
 }finally{ Pop-Location }
}finally {
 if ($work -and (Test-Path -LiteralPath $work)) {
  if ($preserveWorktree) {
   Write-Warning "Temporary worktree preserved to prevent evidence loss: $work"
  }else{
   & git worktree remove --force -- $work
   if ($LASTEXITCODE -ne 0) {
    Write-Warning "Could not remove temporary worktree: $work"
   }
  }
 }
 Pop-Location
}

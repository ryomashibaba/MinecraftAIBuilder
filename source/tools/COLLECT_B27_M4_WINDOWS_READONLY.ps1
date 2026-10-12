#requires -version 5.1
<#
B27/M4 one-pass LOCAL read-only evidence capture. No API, no HTTP, no Minecraft,
no construction or world interaction. Only anonymous signal COUNTS are exported; no raw user paths, block test coordinates,
command lines or material evidence payloads in exported JSON.
This collector is not proof that a process has loaded the on-disk files.
#>
[CmdletBinding()]
param(
  [string]$ProjectRoot = (Join-Path $env:USERPROFILE 'Documents\MinecraftAIBuilder'),
  [string]$OutputDir = (Join-Path $env:USERPROFILE 'Downloads')
)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($ProjectRoot).TrimEnd([char[]]@('\','/'))
$outDir=[IO.Path]::GetFullPath($OutputDir).TrimEnd([char[]]@('\','/'))
$downloads=[IO.Path]::GetFullPath((Join-Path $env:USERPROFILE 'Downloads')).TrimEnd([char[]]@('\','/'))
if (-not $outDir.Equals($downloads,[StringComparison]::OrdinalIgnoreCase)) {throw 'B27_OUTPUT_MUST_BE_DOWNLOADS'}
if (-not (Test-Path -LiteralPath $root -PathType Container)) {throw 'B27_PROJECT_ROOT_MISSING'}
if (-not (Test-Path -LiteralPath $outDir -PathType Container)) {throw 'B27_DOWNLOADS_MISSING'}
if ($outDir.Equals($root,[StringComparison]::OrdinalIgnoreCase) -or $outDir.StartsWith(($root+'\'),[StringComparison]::OrdinalIgnoreCase)) {throw 'B27_OUTPUT_IN_PROJECT'}
foreach ($dir in @($root,$outDir)) {
  if (((Get-Item -LiteralPath $dir).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {throw 'B27_REPARSE_DIR'}
}
$marker=Join-Path $root 'scripts\step7r-qa.js'
# Every input path must be a direct file, not a reparse point.
foreach ($file in @($marker,(Join-Path $root 'package.json'))) {
  if ((Test-Path -LiteralPath $file) -and ((Get-Item -LiteralPath $file).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {throw 'B27_INPUT_REPARSE_BLOCKED'}
}
if (-not (Test-Path -LiteralPath $marker -PathType Leaf)) {throw 'B27_PROJECT_MARKER_MISSING'}
$p=Join-Path $root 'package.json'
if (-not (Test-Path -LiteralPath $p -PathType Leaf)) {throw 'B27_PACKAGE_MISSING'}
$pkg=Get-Content -LiteralPath $p -Raw | ConvertFrom-Json
if ($pkg.name -cne 'minecraft-ai-builder') {throw 'B27_PACKAGE_ID_MISMATCH'}
$keys=@(
  'engine/src/general-building-planner.js',
  'engine/src/build-anchor.js',
  'engine/src/block-states.js',
  'engine/src/block-catalog.js',
  'engine/src/safety.js',
  'bridge/src/general-building.js',
  'catalog/education.json',
  'catalog/semantic.json',
  'modules/architectural-library.js'
)
$checks=New-Object 'System.Collections.Generic.List[object]'
foreach ($key in $keys) {
  $relative=$key.Replace('/','\');$current=$root;$status='MISSING';$digest=$null
  $unsafe=$false
  foreach ($seg in ($relative -split '\\')) {
    $current=Join-Path $current $seg
    if ((Test-Path -LiteralPath $current) -and ((Get-Item -LiteralPath $current).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {$unsafe=$true;break}
  }
  if ($unsafe) {throw 'B27_SOURCE_REPARSE_BLOCKED'}
  if (Test-Path -LiteralPath $current -PathType Leaf) {
    try {
      $before=Get-Item -LiteralPath $current
      $beforeTime=$before.LastWriteTimeUtc; $beforeLength=$before.Length
      $digest=(Get-FileHash -LiteralPath $current -Algorithm SHA256).Hash.ToLowerInvariant()
      $after=Get-Item -LiteralPath $current
      if ($beforeTime -ne $after.LastWriteTimeUtc -or $beforeLength -ne $after.Length) {$status='CHANGED_DURING_READ';$digest=$null}
      else {$status='OK'}
    } catch {$status='UNREADABLE';$digest=$null}
  }
  $checks.Add([pscustomobject]@{key=$key;status=$status;sha256=$digest})
}
# Only COUNT archived profile statuses; never export the stored test-area positions.
$profile=[ordered]@{status='UNAVAILABLE';version=$null;recordCount=$null;statusCounts=$null;doorStateRecords=$null}
try {
  $education=Join-Path $root 'catalog\education.json'
  $json=Get-Content -LiteralPath $education -Raw | ConvertFrom-Json
  if ($json.records -isnot [array]) {throw 'B27_BAD_PROFILE'}
  $counts=@{}
  foreach ($rec in $json.records) {
    $status=[string]$rec.status
    if (-not $counts.ContainsKey($status)) {$counts[$status]=0}
    $counts[$status]++
  }
  $doorCount=0
  foreach ($rec in $json.records) {if ([string]$rec.id -match '_door$') {$doorCount++}}
  $profile=[ordered]@{status='OK';version=[string]$json.educationVersion;recordCount=[int]$json.records.Count;statusCounts=$counts;doorStateRecords=$doorCount}
} catch {$profile.status='UNAVAILABLE'}
# OS metadata only; no connection to ports, no command-line capture.
$process=[ordered]@{status='UNAVAILABLE';nodeProcessCount=$null;listenerStatus='UNAVAILABLE';listenerPortCount8000=0;listenerPortCount8765=0;rootPathHintCount=0;entrypointHintCount=0}
try {
  # CommandLine is inspected only in memory and NEVER included in output JSON.
  $nodes=Get-CimInstance -Query "SELECT ProcessId,CommandLine FROM Win32_Process WHERE Name='node.exe'" -ErrorAction Stop
  $process.nodeProcessCount=0
  foreach ($node in $nodes) {
    $process.nodeProcessCount++
    $line=[string]$node.CommandLine
    $normal=$line.Replace('/','\')
    if ($normal.IndexOf(($root+'\'),[StringComparison]::OrdinalIgnoreCase) -ge 0) { $process.rootPathHintCount++ }
    foreach ($hint in @('bridge\src\server-step7j.js','bridge\src\server-step7o.js','scripts\start-dedicated-canary.js','engine\src\general-building-planner.js')) {
      if ($normal.IndexOf($hint,[StringComparison]::OrdinalIgnoreCase) -ge 0) { $process.entrypointHintCount++;break }
    }
  }
  $process.status='OK'
} catch {
  $process.status='UNAVAILABLE'
  $process.nodeProcessCount=$null
  $process.rootPathHintCount=0
  $process.entrypointHintCount=0
}
try {
  # Kernel metadata only, no sockets are opened and no HTTP/Bridge API is contacted.
  $ports=Get-NetTCPConnection -State Listen -ErrorAction Stop
  $process.listenerStatus='OK'
  foreach ($port in $ports) {
    if ($port.LocalPort -eq 8000) { $process.listenerPortCount8000++ }
    if ($port.LocalPort -eq 8765) { $process.listenerPortCount8765++ }
  }
} catch { $process.listenerStatus='UNAVAILABLE';$process.listenerPortCount8000=0;$process.listenerPortCount8765=0 }
$payload=[ordered]@{
  schema='minecraftaibuilder-step8b-b27-m4-readonly-probe-v1'
  collectedAt=[DateTimeOffset]::Now.ToString('o')
  intent='LOCAL_FILES_AND_OS_METADATA_READ_ONLY'
  projectIdentity='minecraft-ai-builder'
  sourceChecks=$checks.ToArray()
  materialProfile=$profile
  processSummary=$process
  safety=[ordered]@{notPrepared=$true;constructionApproved=$false;executionAllowed=$false;worldAccess=$false;bridgeContact=$false;projectFilesModified=$false;buildOperations=0}
}
$name='MinecraftAIBuilder_Step8B_B27_M4_RuntimeEvidence_'+(Get-Date).ToString('yyyyMMdd_HHmmss')+'_'+[guid]::NewGuid().ToString('N').Substring(0,8)+'.json'
$dest=Join-Path $downloads $name
$bytes=[Text.UTF8Encoding]::new($false).GetBytes(($payload|ConvertTo-Json -Depth 10))
$stream=[IO.File]::Open($dest,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
try {$stream.Write($bytes,0,$bytes.Length)} finally {$stream.Dispose()}
Write-Host ('B27_M4_READONLY_EVIDENCE_CREATED '+$dest)
Write-Host 'NO_MINECRAFT_NO_BRIDGE_NO_NETWORK_NO_CONSTRUCTION_NOT_PREPARED'
Write-Host 'Source fingerprints, hints and port counts are NOT loaded-runtime attestation.'

#requires -version 5.1
<#
Step8B/B4 read-only provenance collector.
Does NOT call the engine, Bridge, MCP, Minecraft, network, scan, plan or build.
Reads only 8 allowlisted source files, package marker and Win32_Process node.exe metadata.
Does not export CommandLine, physical paths, environment or project contents.
Writes ONE new sanitized JSON to Downloads with exclusive CreateNew semantics.
Source match does NOT prove modules loaded into memory or authorization to build.
#>
[CmdletBinding()]
param(
  [string]$ProjectRoot = (Join-Path $env:USERPROFILE 'Documents\MinecraftAIBuilder'),
  [string]$OutputDir = (Join-Path $env:USERPROFILE 'Downloads')
)
$ErrorActionPreference='Stop'
$root=[System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd([char[]]@('\','/'))
if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw 'B4_PROJECT_NOT_FOUND' }
if (-not (Test-Path -LiteralPath $OutputDir -PathType Container)) { throw 'B4_OUTPUT_DIRECTORY_NOT_FOUND' }
$downloads=[System.IO.Path]::GetFullPath((Join-Path $env:USERPROFILE 'Downloads')).TrimEnd([char[]]@('\','/'))
$normalizedOutput=[System.IO.Path]::GetFullPath($OutputDir).TrimEnd([char[]]@('\','/'))
if (-not $normalizedOutput.Equals($downloads,[System.StringComparison]::OrdinalIgnoreCase)) { throw 'B4_OUTPUT_MUST_BE_DOWNLOADS' }
if (((Get-Item -LiteralPath $normalizedOutput).Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'B4_OUTPUT_REPARSE_POINT_BLOCKED' }
if ($normalizedOutput.Equals($root,[System.StringComparison]::OrdinalIgnoreCase) -or $normalizedOutput.StartsWith(($root+'\'),[System.StringComparison]::OrdinalIgnoreCase)) { throw 'B4_OUTPUT_OVERLAPS_PROJECT' }
if (((Get-Item -LiteralPath $root).Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'B4_ROOT_REPARSE_POINT_BLOCKED' }
$marker=Join-Path $root 'scripts\step7r-qa.js'
if (-not (Test-Path -LiteralPath $marker -PathType Leaf)) { throw 'B4_PROJECT_IDENTITY_NOT_PROVEN' }
$packagePath=Join-Path $root 'package.json'
if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) { throw 'B4_PACKAGE_NOT_FOUND' }
$pkg=Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
if ($pkg.name -cne 'minecraft-ai-builder') { throw 'B4_PROJECT_NAME_MISMATCH' }
$keys=@(
  'package.json',
  'bridge/src/server-step7j.js',
  'bridge/src/server-step7o.js',
  'bridge/src/general-building.js',
  'engine/src/general-building-planner.js',
  'engine/src/building-grammar.js',
  'engine/src/build-anchor.js',
  'scripts/start-dedicated-canary.js'
)
$checks=New-Object 'System.Collections.Generic.List[object]'
$timestampMap=@{}
foreach ($key in $keys) {
  $p=Join-Path $root $key.Replace('/','\')
  $relative=$p.Substring($root.Length+1)
  $parts=$relative -split '[\\/]'
  $cur=$root; $unsafe=$false
  foreach ($part in $parts) {
    $cur=Join-Path $cur $part
    if (Test-Path -LiteralPath $cur) {
      if (((Get-Item -LiteralPath $cur).Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { $unsafe=$true;break }
    }
  }
  if ($unsafe) { throw 'B4_SOURCE_REPARSE_POINT_BLOCKED' }
  $status='MISSING'; $hash=$null
  if (Test-Path -LiteralPath $p -PathType Leaf) {
    try {
      $before=(Get-Item -LiteralPath $p).LastWriteTimeUtc
      $hash=(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()
      $after=(Get-Item -LiteralPath $p).LastWriteTimeUtc
      if ($before -ne $after) { $status='CHANGED_DURING_READ';$hash=$null }
      else { $status='OK';$timestampMap[$key]=$after }
    } catch { $status='UNREADABLE';$hash=$null }
  }
  $checks.Add([pscustomobject]@{key=$key;status=$status;sha256=$hash})
}
$processStatus='OK'
$processItems=New-Object 'System.Collections.Generic.List[object]'
$nodeCount=0
try {
  # WMI/CIM is local and read-only; no HTTP, no socket, no Bridge request.
  $nodes=Get-CimInstance -Query "SELECT ProcessId,Name,CommandLine,CreationDate FROM Win32_Process WHERE Name='node.exe'" -ErrorAction Stop
  foreach ($proc in $nodes) {
    $nodeCount++
    if ($processItems.Count -ge 100) { continue }
    $line=[string]$proc.CommandLine
    if ([string]::IsNullOrEmpty($line)) { continue }
    $normalized=$line.Replace('/','\')
    $entry=$null
    foreach ($known in @('bridge/src/server-step7j.js','bridge/src/server-step7o.js','mcp/src/server-step7f.js')) {
      $escaped=[regex]::Escape($known.Replace('/','\'))
      if ($normalized -match ('(?i)' + $escaped + '(?![A-Za-z0-9_.-])')) { $entry=$known;break }
    }
    if (-not $entry) { continue }
    $mode='RELATIVE_REFERENCE_UNBOUND'
    $absolute=(Join-Path $root $entry.Replace('/','\'))
    if ($normalized.IndexOf($absolute,[System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
      $mode='PROJECT_ABSOLUTE_REFERENCE'
    }
    $created=$null; $modifiedAfter=$null
    try {
      if ($proc.CreationDate) {
        $started=[datetime]$proc.CreationDate
        $created=$started.ToUniversalTime().ToString('o')
        $modifiedAfter=$false
        foreach ($t in $timestampMap.Values) {
          if ($t -gt $started.ToUniversalTime()) { $modifiedAfter=$true;break }
        }
        if ($timestampMap.Count -lt $keys.Count) { $modifiedAfter=$null }
      }
    } catch { $created=$null;$modifiedAfter=$null }
    $processItems.Add([pscustomobject]@{
      pid=[int64]$proc.ProcessId;entrypoint=$entry;launchMode=$mode;
      createdAt=$created;modifiedAfterStart=$modifiedAfter
    })
  }
} catch {
  $processStatus='ACCESS_DENIED_OR_UNAVAILABLE'
  $processItems.Clear()
  $nodeCount=0
}
# Every exported property is explicit and sanitized. In particular, NO command line or local paths.
$payload=[ordered]@{
  schema='minecraftaibuilder-step8b-b4-probe-v1'
  collectedAt=[datetimeoffset]::Now.ToString('o')
  intent='LOCAL_READ_ONLY_NO_API_CALLS'
  projectIdentity=[ordered]@{packageName='minecraft-ai-builder';present=$true;rootMarkerPresent=$true}
  sourceChecks=$checks.ToArray()
  processDiscovery=[ordered]@{status=$processStatus;nodeProcessCount=$nodeCount;candidates=$processItems.ToArray()}
  safety=[ordered]@{
    notPrepared=$true;executionAllowed=$false;constructionApproved=$false;
    worldAccess=$false;bridgeContact=$false;projectFilesModified=$false
  }
}
$out=Join-Path $OutputDir ('MinecraftAIBuilder_Step8B_B4_RuntimeEvidence_' + (Get-Date).ToString('yyyyMMdd_HHmmss') + '_' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.json')
$bytes=[System.Text.UTF8Encoding]::new($false).GetBytes(($payload | ConvertTo-Json -Depth 12))
$stream=[System.IO.File]::Open($out,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write,[System.IO.FileShare]::None)
try { $stream.Write($bytes,0,$bytes.Length) } finally { $stream.Dispose() }
Write-Host ('STEP8B_B4_READONLY_REPORT_CREATED ' + $out)
Write-Host ('SOURCE_CHECKS ' + $checks.Count + '; NODE_PROCESS_COUNT ' + $nodeCount + '; MATCHING_CANDIDATES ' + $processItems.Count)
Write-Host 'NOT_PREPARED / NO_BRIDGE / NO_MINECRAFT / NO_COMMANDS / NO_BUILD'
Write-Host 'Evidence is process metadata, NOT proof of loaded code or execution compatibility.'

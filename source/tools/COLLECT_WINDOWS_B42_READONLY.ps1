#requires -version 5.1
<#
Step8B/B4.2 read-only process identity evidence collector.
Does NOT call the engine, Bridge, MCP, Minecraft, network, scan, plan or build.
Reads only 8 allowlisted source files, package marker, local process metadata and local listening-port ownership.
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
# Read-only, bounded process signals. CommandLine is inspected in memory and NEVER exported.
# Listener inspection reads local kernel TCP metadata only; no socket/HTTP connection is made.
$processStatus='OK'
$processItems=New-Object 'System.Collections.Generic.List[object]'
$nodeCount=0
$listenerStatus='OK'
$pidPorts=@{}
try {
  $listeners=Get-NetTCPConnection -State Listen -ErrorAction Stop
  foreach ($listener in $listeners) {
    if (($listener.LocalPort -eq 8000 -or $listener.LocalPort -eq 8765) -and [int64]$listener.OwningProcess -gt 0) {
      $key=[string][int64]$listener.OwningProcess
      if (-not $pidPorts.ContainsKey($key)) { $pidPorts[$key]=New-Object 'System.Collections.Generic.List[int]' }
      $port=[int]$listener.LocalPort
      if (-not $pidPorts[$key].Contains($port)) { $pidPorts[$key].Add($port) }
    }
  }
} catch {
  $listenerStatus='UNAVAILABLE'
  $pidPorts=@{}
}
try {
  $nodes=Get-CimInstance -Query "SELECT ProcessId,ParentProcessId,Name,CommandLine,CreationDate FROM Win32_Process WHERE Name='node.exe'" -ErrorAction Stop |
    Sort-Object ProcessId
  $known=@(
    'bridge/src/server-step7j.js',
    'bridge/src/server-step7o.js',
    'mcp/src/server-step7f.js',
    'scripts/start-dedicated-canary.js',
    'bridge/src/server.js'
  )
  foreach ($proc in $nodes) {
    $nodeCount++
    if ($processItems.Count -ge 100) { continue }
    $line=[string]$proc.CommandLine
    $normalized=$line.Replace('/','\')
    $entry=$null
    $launch='NONE'
    foreach ($knownEntry in $known) {
      $rel=$knownEntry.Replace('/','\')
      $escaped=[regex]::Escape($rel)
      if ($normalized -match ('(?i)(?<![A-Za-z0-9_.-])' + $escaped + '(?![A-Za-z0-9_.-])')) {
        $entry=$knownEntry
        $absolute=(Join-Path $root $rel)
        if ($normalized.IndexOf($absolute,[System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
          $launch='ABSOLUTE_PROJECT_ENTRYPOINT'
        } else {
          $launch='RELATIVE_ENTRYPOINT_UNBOUND'
        }
        break
      }
    }
    if ($launch -eq 'NONE' -and $normalized.IndexOf(($root+'\'),[System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
      $launch='PROJECT_ROOT_ONLY'
    }
    # A script name alone does not bind an npm invocation to the project directory.
    $script='NONE'
    $npmCli=$line -match '(?i)(?:npm-cli\.js|pnpm\.cjs|yarn\.js|npm(?:\.cmd)?|pnpm(?:\.cmd)?|yarn(?:\.cmd)?)'
    if ($npmCli -and $line -match '(?i)(?:^|\s)(?:run|run-script)\s+(?:bridge:canary)(?:\s|$|")') {
      $script='CANARY_SCRIPT'
    } elseif ($npmCli -and $line -match '(?i)(?:^|\s)(?:run|run-script)\s+(?:bridge)(?:\s|$|")') {
      $script='BRIDGE_SCRIPT'
    } elseif ($npmCli -and $line -match '(?i)(?:^|\s)(?:run|run-script)\s+(?:mcp)(?:\s|$|")') {
      $script='MCP_SCRIPT'
    }
    $parentClass='UNKNOWN'
    if ($proc.ParentProcessId) {
      try {
        $parent=Get-CimInstance -ClassName Win32_Process -Filter ('ProcessId=' + [int64]$proc.ParentProcessId) -ErrorAction Stop
        if ($parent) {
          $pn=[string]$parent.Name
          if ($pn -ieq 'node.exe') { $parentClass='NODE' }
          elseif ($pn -ieq 'cmd.exe') { $parentClass='CMD' }
          elseif ($pn -ieq 'powershell.exe' -or $pn -ieq 'pwsh.exe') { $parentClass='POWERSHELL' }
          else { $parentClass='OTHER' }
        }
      } catch { $parentClass='UNKNOWN' }
    }
    $created=$null;$modifiedAfter=$null
    try {
      if ($proc.CreationDate) {
        $started=([datetime]$proc.CreationDate).ToUniversalTime()
        $created=$started.ToString('o')
        if ($timestampMap.Count -eq $keys.Count) {
          $modifiedAfter=$false
          foreach ($t in $timestampMap.Values) {
            if ($t -gt $started) { $modifiedAfter=$true;break }
          }
        }
      }
    } catch { $created=$null;$modifiedAfter=$null }
    $listenerPorts=@()
    $pidKey=[string][int64]$proc.ProcessId
    if ($pidPorts.ContainsKey($pidKey)) { $listenerPorts=@($pidPorts[$pidKey].ToArray() | Sort-Object) }
    $processItems.Add([pscustomobject]@{
      pid=[int64]$proc.ProcessId;entrypoint=$entry;launchMode=$launch;scriptHint=$script;
      parentClass=$parentClass;createdAt=$created;modifiedAfterStart=$modifiedAfter;listenerPorts=$listenerPorts
    })
  }
} catch {
  $processStatus='ACCESS_DENIED_OR_UNAVAILABLE'
  $processItems.Clear();$nodeCount=0
}
# Every exported property is explicit and sanitized. In particular, NO command line or local paths.
$payload=[ordered]@{
  schema='minecraftaibuilder-step8b-b42-readonly-probe-v1'
  collectedAt=[datetimeoffset]::Now.ToString('o')
  intent='LOCAL_READ_ONLY_NO_API_CALLS'
  projectIdentity=[ordered]@{packageName='minecraft-ai-builder';present=$true;rootMarkerPresent=$true}
  sourceChecks=$checks.ToArray()
  processDiscovery=[ordered]@{status=$processStatus;nodeProcessCount=$nodeCount;records=$processItems.ToArray();truncated=($nodeCount -gt 100);listenerQueryStatus=$listenerStatus;listenerPortsProbed=@(8000,8765)}
  safety=[ordered]@{
    notPrepared=$true;executionAllowed=$false;constructionApproved=$false;
    worldAccess=$false;bridgeContact=$false;projectFilesModified=$false
  }
}
$out=Join-Path $OutputDir ('MinecraftAIBuilder_Step8B_B42_RuntimeEvidence_' + (Get-Date).ToString('yyyyMMdd_HHmmss') + '_' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.json')
$bytes=[System.Text.UTF8Encoding]::new($false).GetBytes(($payload | ConvertTo-Json -Depth 12))
$stream=[System.IO.File]::Open($out,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write,[System.IO.FileShare]::None)
try { $stream.Write($bytes,0,$bytes.Length) } finally { $stream.Dispose() }
Write-Host ('STEP8B_B42_READONLY_REPORT_CREATED ' + $out)
Write-Host ('SOURCE_CHECKS ' + $checks.Count + '; NODE_PROCESS_COUNT ' + $nodeCount + '; INSPECTED_NODE_PROCESSES ' + $processItems.Count)
Write-Host 'NOT_PREPARED / NO_BRIDGE / NO_MINECRAFT / NO_COMMANDS / NO_BUILD'
Write-Host 'Evidence is OS process/port metadata only; NOT proof of loaded code, project identity, or execution compatibility.'

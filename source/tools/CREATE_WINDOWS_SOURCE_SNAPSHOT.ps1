#requires -version 5.1
<#
MinecraftAIBuilder Step 7S - OPTIONAL read-only source snapshot collector.
- Reads selected source code and package metadata only.
- Writes a NEW ZIP under Downloads. Never writes under the project folder.
- No Minecraft, Bridge, scan, test, build command, or construction.
- Does not collect work/, logs/, config/, .env, node_modules, worlds, Git.
- Run only when the next chat requests current Windows source.
#>
[CmdletBinding()]
param(
    [string]$ProjectRoot = (Join-Path $env:USERPROFILE 'Documents\MinecraftAIBuilder'),
    [string]$OutputDir = (Join-Path $env:USERPROFILE 'Downloads')
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd([char[]]@('\','/'))
if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw "PROJECT_NOT_FOUND: $root" }
if (-not (Test-Path -LiteralPath (Join-Path $root 'package.json') -PathType Leaf)) { throw 'NO_PACKAGE_JSON: wrong project folder' }
if (-not (Test-Path -LiteralPath (Join-Path $root 'scripts\step7r-qa.js') -PathType Leaf)) { throw 'NO_STEP7R_QA: cannot identify installed project' }
if (-not (Test-Path -LiteralPath $OutputDir -PathType Container)) { throw "OUTPUT_DIR_NOT_FOUND: $OutputDir" }

$prefixes = @('scripts', 'tests', 'bridge\src', 'engine', 'modules', 'mcp', 'palettes', 'styles', 'docs', 'catalog')
$rootFiles = @('package.json', 'package-lock.json', 'README.md', 'AGENTS.md')
$extensions = @('.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.json', '.md', '.txt', '.ps1', '.yml', '.yaml', '.toml', '.css', '.html')
$blockedSegments = @('node_modules', '.git', '.env', 'work', 'logs', 'secrets', 'private', '.ssh', '.codex', 'worlds', 'minecraftWorlds')
$files = New-Object 'System.Collections.Generic.List[System.IO.FileInfo]'

foreach ($relativeDir in $prefixes) {
    $dir = Join-Path $root $relativeDir
    if (-not (Test-Path -LiteralPath $dir -PathType Container)) { continue }
    foreach ($file in (Get-ChildItem -LiteralPath $dir -Recurse -File -ErrorAction Stop)) {
        if ($file.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { continue }
        $relative = $file.FullName.Substring($root.Length + 1)
        $parts = $relative -split '[\\/]'
        $skip = $false
        foreach ($segment in $parts) {
            if ($blockedSegments -contains $segment -or $segment.StartsWith('.env')) { $skip = $true; break }
        }
        if ($skip) { continue }
        if ($extensions -notcontains $file.Extension.ToLowerInvariant()) { continue }
        $files.Add($file)
    }
}
foreach ($relative in $rootFiles) {
    $path = Join-Path $root $relative
    if (Test-Path -LiteralPath $path -PathType Leaf) {
        $files.Add((Get-Item -LiteralPath $path))
    }
}

# Conservative source-only size cap. Record any oversized files as excluded, never pretend complete capture.
$maxPerFile = 5MB
$maxTotal = 40MB
$total = [int64]0
$records = New-Object 'System.Collections.Generic.List[object]'
$excluded = New-Object 'System.Collections.Generic.List[object]'
$stage = Join-Path $env:TEMP ('MinecraftAIBuilder-Step7S-Snapshot-' + [guid]::NewGuid().ToString('N'))
$out = Join-Path $OutputDir ('MinecraftAIBuilder_Step7S_Windows_SourceSnapshot_' + (Get-Date).ToString('yyyyMMdd_HHmmss') + '_' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.zip')

try {
    New-Item -Path $stage -ItemType Directory -Force | Out-Null
    foreach ($file in @($files | Sort-Object FullName -Unique)) {
        $relative = $file.FullName.Substring($root.Length + 1)
        if ($file.Length -gt $maxPerFile -or ($total + $file.Length) -gt $maxTotal) {
            $excluded.Add([pscustomobject]@{ path=$relative; bytes=$file.Length; reason='SIZE_LIMIT' })
            continue
        }
        $destination = Join-Path $stage $relative
        New-Item -Path (Split-Path -Path $destination -Parent) -ItemType Directory -Force | Out-Null
        $shaBefore = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        Copy-Item -LiteralPath $file.FullName -Destination $destination -ErrorAction Stop
        $shaAfter = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($shaBefore -ne $shaAfter) { throw "SOURCE_CHANGED_WHILE_COPYING: $relative" }
        $records.Add([pscustomobject]@{path=($relative -replace '\\','/'); bytes=$file.Length; sha256=$shaBefore})
        $total += $file.Length
    }
    $manifest = [ordered]@{
        schema = 'minecraftaibuilder-step7s-windows-source-only-snapshot-v1'
        createdAtLocal = (Get-Date).ToString('o')
        intent = 'Source review only - no modification, no QA proof, no construction approval'
        filesIncluded = $records.Count
        includedBytes = $total
        filesExcludedBySize = $excluded.Count
        excluded = $excluded.ToArray()
        files = $records.ToArray()
        excludedRoots = @('work', 'logs', 'config', 'node_modules', '.git', '.env', 'worlds', 'Minecraft saves')
        notPrepared = $true
        executionAllowed = $false
    }
    $manifestPath = Join-Path $stage 'WINDOWS_SNAPSHOT_MANIFEST.json'
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $out -CompressionLevel Optimal -ErrorAction Stop
    if (-not (Test-Path -LiteralPath $out -PathType Leaf)) { throw 'ZIP_CREATION_FAILED' }
    Write-Host ('WINDOWS_SOURCE_SNAPSHOT_CREATED ' + $out)
    Write-Host ('SOURCE_FILES ' + $records.Count + '; EXCLUDED_OVERSIZE ' + $excluded.Count + '; BYTES ' + $total)
    Write-Host 'READ_ONLY_SOURCE_EXPORT_NOT_PREPARED: no scan, test, Bridge, or construction.'
    if ($excluded.Count -gt 0) {
        Write-Host 'CAUTION: oversized source files were omitted; see WINDOWS_SNAPSHOT_MANIFEST.json.'
    }
    Write-Host 'Privacy: review copied source for hardcoded passwords, API keys or other sensitive data before uploading.'
}
finally {
    if (Test-Path -LiteralPath $stage -PathType Container) {
        Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    }
}

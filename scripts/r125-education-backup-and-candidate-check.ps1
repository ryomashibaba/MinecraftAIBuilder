# R125 Education v26.33 TEST-world + offline MakeCode receipt, READ ONLY.
# Never modifies, imports, copies, or builds any world; no Ollama calls.
# Uses the actual user-exported .mcworld instead of assuming a filename suffices.
param(
 [string]$BackupFile = "",
 [string]$CandidateFolder = "",
 [string]$WorldName = "minecraftaibuildertest のコピー",
 [switch]$NoFolderOpen
)
$ErrorActionPreference = "Stop"
function Stop-Hold([string]$Code) { throw ("HOLD_R125_WORLD_GATE_" + $Code) }
function IsLinked($item) {
 return ($null -ne $item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)
}
function Read-SmallJson([string]$Path) {
 if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { Stop-Hold "MISSING_RECEIPT" }
 $item = Get-Item -LiteralPath $Path
 if ((IsLinked $item) -or $item.Length -lt 2 -or $item.Length -gt 100000) {
  Stop-Hold "UNSAFE_RECEIPT"
 }
 return (Get-Content -LiteralPath $Path -Encoding UTF8 -Raw | ConvertFrom-Json)
}
function Read-ZipEntry([System.IO.Compression.ZipArchiveEntry]$Entry,[int]$Limit) {
 if ($null -eq $Entry -or $Entry.Length -le 0 -or $Entry.Length -gt $Limit) {
  Stop-Hold "INVALID_ARCHIVE_ENTRY"
 }
 $stream = $Entry.Open()
 try {
  $reader = New-Object System.IO.StreamReader($stream,([Text.Encoding]::UTF8),$true,1024,$true)
  try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
 } finally { $stream.Dispose() }
}
$storeRoot = Join-Path $env:LOCALAPPDATA "Packages\Microsoft.MinecraftEducationEdition_8wekyb3d8bbwe\LocalState\games\com.mojang\minecraftWorlds"
if (-not (Test-Path -LiteralPath $storeRoot -PathType Container)) {
 Stop-Hold "STORE_WORLDS_ROOT_NOT_FOUND"
}
$match = @(
 Get-ChildItem -LiteralPath $storeRoot -Directory -Force | Where-Object {
  if (IsLinked $_) { return $false }
  $n = Join-Path $_.FullName "levelname.txt"
  $d = Join-Path $_.FullName "level.dat"
  if (-not (Test-Path -LiteralPath $n -PathType Leaf) -or
      -not (Test-Path -LiteralPath $d -PathType Leaf)) { return $false }
  $nameFile = Get-Item -LiteralPath $n
  if ((IsLinked $nameFile) -or $nameFile.Length -gt 4096) { return $false }
  return ([IO.File]::ReadAllText($n,[Text.Encoding]::UTF8).Trim() -ceq $WorldName)
 }
)
if ($match.Count -ne 1) { Stop-Hold ("WORLD_NAME_NOT_UNIQUE_" + $match.Count) }
$liveWorld = $match[0]
if (-not $BackupFile) {
 $documents = [Environment]::GetFolderPath("MyDocuments")
 if (-not $documents) { $documents = Join-Path $env:USERPROFILE "Documents" }
 $BackupFile = Join-Path $documents "MAB_research_lab_before_build.mcworld"
}
if (-not (Test-Path -LiteralPath $BackupFile -PathType Leaf)) {
 Write-Host "Export file not found at: $BackupFile"
 Write-Host "If saved elsewhere, rerun with -BackupFile 'absolute path to your .mcworld'."
 Stop-Hold "EXPORTED_BACKUP_NOT_FOUND"
}
$backup = Get-Item -LiteralPath $BackupFile
if ((IsLinked $backup) -or $backup.Extension -ine ".mcworld" -or
    $backup.Length -lt 1024 -or $backup.Length -gt 4294967296) {
 Stop-Hold "BACKUP_NOT_VALID_FILE_OR_SIZE"
}
# Keep exported backup outside live Minecraft world folders.
if ($backup.FullName.StartsWith($storeRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) {
 Stop-Hold "BACKUP_INSIDE_LIVE_WORLD_ROOT"
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($backup.FullName)
try {
 $names = @($archive.Entries | Where-Object {
   $_.FullName -eq "levelname.txt"
 })
 $levels = @($archive.Entries | Where-Object {
   $_.FullName -eq "level.dat"
 })
 if ($names.Count -ne 1 -or $levels.Count -ne 1) {
  Stop-Hold "BACKUP_MISSING_ROOT_WORLD_FILES"
 }
 $exportedName = (Read-ZipEntry $names[0] 4096).Trim()
 if ($exportedName -cne $WorldName) { Stop-Hold "BACKUP_WORLD_NAME_DIFFERENT" }
 if ($levels[0].Length -lt 64) { Stop-Hold "BACKUP_LEVEL_DAT_TOO_SMALL" }
 # Read the whole compressed level.dat to check decompressibility, without
 # parsing format or claiming this is a successful world restore.
 $s = $levels[0].Open()
 try {
  $buf = New-Object byte[] 8192
  $readTotal = [long]0
  while (($bytes = $s.Read($buf,0,$buf.Length)) -gt 0) {
   $readTotal += $bytes
   if ($readTotal -gt 33554432) { Stop-Hold "BACKUP_LEVEL_DAT_OVERSIZE" }
  }
  if ($readTotal -ne $levels[0].Length) { Stop-Hold "BACKUP_LEVEL_DAT_INCOMPLETE" }
 } finally { $s.Dispose() }
} finally { $archive.Dispose() }
$backupHash = (Get-FileHash -LiteralPath $backup.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
$root = Join-Path $env:USERPROFILE "Documents\MAB_Private_Runs"
if (-not $CandidateFolder) {
 if (-not (Test-Path -LiteralPath $root -PathType Container)) {
  Stop-Hold "PRIVATE_CANDIDATES_ROOT_NOT_FOUND"
 }
 $dirs = @(Get-ChildItem -LiteralPath $root -Directory -Filter "r125-lab-*-education-preflight-*" |
  Where-Object { -not (IsLinked $_) } |
  Sort-Object LastWriteTime -Descending)
 $selected = @()
 foreach ($d in $dirs) {
  $f = Join-Path $d.FullName "SOURCE_REPORT.json"
  if (-not (Test-Path -LiteralPath $f -PathType Leaf)) { continue }
  $receipt = Read-SmallJson $f
  if ($receipt.sourceSha256 -ceq "be0510039769319840820f6d94aa24cc911c5f2fdb4499f5703eb11923967821" -and
      $receipt.geometrySha256 -ceq "0d1788e45f5632461a2733b28caa9c655197e0db2a672bce1e088ce4e8ac4028") {
   $selected += $d
  }
 }
 if ($selected.Count -ne 1) { Stop-Hold ("PRIVATE_CANDIDATE_NOT_UNIQUE_" + $selected.Count) }
 $CandidateFolder = $selected[0].FullName
}
if (-not (Test-Path -LiteralPath $CandidateFolder -PathType Container)) {
 Stop-Hold "CANDIDATE_FOLDER_NOT_FOUND"
}
$folder = Get-Item -LiteralPath $CandidateFolder
if (IsLinked $folder) { Stop-Hold "LINKED_CANDIDATE_DIR" }
$r = Read-SmallJson (Join-Path $folder.FullName "SOURCE_REPORT.json")
$e = Read-SmallJson (Join-Path $folder.FullName "EXPORT_REPORT.json")
$routes = Read-SmallJson (Join-Path $folder.FullName "R125_SOURCE_ROUTES.json")
$codeFile = Join-Path $folder.FullName "MAKECODE_EDUCATION.ts"
if (-not (Test-Path -LiteralPath $codeFile -PathType Leaf)) { Stop-Hold "MAKECODE_FILE_MISSING" }
$ci = Get-Item -LiteralPath $codeFile
if ((IsLinked $ci) -or $ci.Length -gt 180000 -or $ci.Length -lt 100) {
 Stop-Hold "MAKECODE_FILE_INVALID"
}
$codeHash = (Get-FileHash -LiteralPath $codeFile -Algorithm SHA256).Hash.ToLowerInvariant()
if ($r.schema -cne "r125-private-education-source-preflight-v1" -or
    $r.status -cne "OFFLINE_MAKECODE_CANDIDATE_WORLD_GATE_BLOCKED" -or
    $r.sourceSha256 -cne "be0510039769319840820f6d94aa24cc911c5f2fdb4499f5703eb11923967821" -or
    $r.geometrySha256 -cne "0d1788e45f5632461a2733b28caa9c655197e0db2a672bce1e088ce4e8ac4028" -or
    $r.entranceRoutes -cne "SOURCE_ROUTES_REACH_ALL_ZONES" -or
    @($r.zoneAccess).Count -ne 2 -or
    @($r.zoneAccess | Where-Object { $_.reachedFromEntrance -ne $true }).Count -ne 0 -or
    $r.plannedVoxels -ne 2089 -or $r.plannedCuboids -ne 62 -or
    $r.materialMode -cne "STRICT_USER_ATTESTED" -or
    $r.makecodeSourceSha256 -cne $codeHash -or
    $e.makecodeSourceSha256 -cne $codeHash -or
    $r.worldWrites -ne 0 -or $r.executionAllowed -ne $false -or
    $r.constructionApproved -ne $false -or
    $r.readiness -cne "NOT_PREPARED" -or
    @($r.gates | Where-Object { $_ -ne "BLOCKED" }).Count -ne 0 -or
    @($r.gates).Count -ne 9 -or
    @($r.BuildPlan.operations).Count -ne 0 -or
    $routes.status -cne "SOURCE_ROUTES_REACH_ALL_ZONES") {
 Stop-Hold "SOURCE_OR_MAKECODE_RECEIPT_MISMATCH"
}
$blocks = @($r.usedMaterials)
if ($blocks.Count -ne 3 -or
    @($blocks | Where-Object { 
      ($_.material -eq 'concrete' -and $_.blockName -eq 'white_concrete' -and $_.plannedCount -eq 660) -or
      ($_.material -eq 'metal' -and $_.blockName -eq 'iron_block' -and $_.plannedCount -eq 1413) -or
      ($_.material -eq 'glass' -and $_.blockName -eq 'glass' -and $_.plannedCount -eq 16)
    }).Count -ne 3) { Stop-Hold "MATERIAL_COUNT_MISMATCH" }
Write-Host ""
Write-Host "MAB READ-ONLY WORLD + BACKUP + MAKECODE PREFLIGHT: SOURCE VERIFIED"
Write-Host "World name (Store version): $WorldName"
Write-Host "World folder suffix: $($liveWorld.Name)"
Write-Host "Exported backup: $($backup.FullName)"
Write-Host "Export bytes: $($backup.Length)"
Write-Host "Backup SHA256: $backupHash"
Write-Host "Backup root level.dat and world name: READABLE (restore NOT TESTED)"
Write-Host "B143 voxels: 2089; cuboids: 62; strict 3-material mapping: VERIFIED"
Write-Host "All requested zones reachable in SOURCE graph: YES"
Write-Host "MakeCode SHA256 match: YES"
Write-Host "WORLD STATUS: NOT_PREPARED / 9 BLOCKED / 0 WRITES"
Write-Host "Next: inspect the designated test world and choose empty flat ground."
Write-Host "Do NOT run mabbuild until game-side site clearance, backup and world copy are verified."
if (-not $NoFolderOpen) { Invoke-Item -LiteralPath $folder.FullName }

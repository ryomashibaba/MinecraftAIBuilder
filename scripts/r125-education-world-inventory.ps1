# MinecraftAIBuilder — Minecraft Education world inventory (READ ONLY).
# Windows PowerShell 5.1+; official Microsoft Store and Desktop EXE roots.
# Does not modify a world, create a backup, launch a game, or run MakeCode.
param(
  [string[]]$WorldRoots = @()
)
$ErrorActionPreference = "Stop"
if ($WorldRoots.Count -eq 0) {
  $WorldRoots = @(
    (Join-Path $env:APPDATA "Minecraft Education Edition\games\com.mojang\minecraftWorlds"),
    (Join-Path $env:LOCALAPPDATA "Packages\Microsoft.MinecraftEducationEdition_8wekyb3d8bbwe\LocalState\games\com.mojang\minecraftWorlds")
  )
}
$records = New-Object 'System.Collections.Generic.List[object]'
$rootIndex = 0
foreach ($root in $WorldRoots) {
  $rootIndex++
  if (-not (Test-Path -LiteralPath $root -PathType Container)) { continue }
  $rootInfo = Get-Item -LiteralPath $root
  if (($rootInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    Write-Warning "Skipping linked root (not inspected): $rootIndex"
    continue
  }
  $children = @(Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction Stop)
  foreach ($candidate in $children) {
    if (($candidate.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
    $levelName = Join-Path $candidate.FullName "levelname.txt"
    $levelDat = Join-Path $candidate.FullName "level.dat"
    if (-not (Test-Path -LiteralPath $levelName -PathType Leaf) -or
        -not (Test-Path -LiteralPath $levelDat -PathType Leaf)) { continue }
    $nameInfo = Get-Item -LiteralPath $levelName
    $dataInfo = Get-Item -LiteralPath $levelDat
    if ($nameInfo.Length -le 0 -or $nameInfo.Length -gt 4096 -or
        ($nameInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or
        ($dataInfo.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
    $name = [IO.File]::ReadAllText($levelName, [Text.Encoding]::UTF8).Trim()
    $name = ($name -replace '[\x00-\x1f\x7f]', ' ').Trim()
    if ([string]::IsNullOrWhiteSpace($name)) { $name = "(Unnamed)" }
    if ($name.Length -gt 72) { $name = $name.Substring(0,72) + "..." }
    $edition = if ($WorldRoots.Count -eq 2 -and $rootIndex -eq 1) {
      "Desktop EXE"
    } elseif ($WorldRoots.Count -eq 2 -and $rootIndex -eq 2) {
      "Microsoft Store"
    } else {
      "Root $rootIndex"
    }
    $records.Add([pscustomobject]@{
      WorldName = $name
      Install = $edition
      LastChanged = $candidate.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
      FolderSuffix = if ($candidate.Name.Length -gt 8) {
        $candidate.Name.Substring($candidate.Name.Length - 8)
      } else { $candidate.Name }
    })
  }
}
Write-Host "MAB Minecraft Education world inventory (READ ONLY; zero world writes)"
Write-Host "Examined $($WorldRoots.Count) possible world root(s); found $($records.Count) world folder(s)."
if ($records.Count -eq 0) {
  Write-Host "No local worlds recognized. HOLD: do not guess a test world."
  Write-Host "Use Minecraft Education > Play > View My Worlds and identify the test world there."
} else {
  $records | Sort-Object LastChanged -Descending |
    Format-Table WorldName, Install, LastChanged, FolderSuffix -AutoSize |
    Out-String -Width 180 | Write-Host
}
Write-Host "NEXT: Identify the existing TEST world by name; do not select any main/classroom world."
Write-Host "Before any construction, use Minecraft Education's Manage > Copy and Export World."
Write-Host "Keep the exported .mcworld outside the live world directory and verify its existence."
Write-Host "The inventory does NOT certify backup, restore, anchor, terrain, or MakeCode execution."

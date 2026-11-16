# MAB V11 — one-command Windows preparation for the first real Education test.
# Never creates/changes Minecraft worlds, presses keys, or runs MakeCode.
# Probe: copies a 7-material verification script. Retail: copies the saved
# reviewed shop MakeCode. Launches Education's official URI to the MAIN MENU.
param(
    [ValidateSet('Probe','Retail','Movement')][string]$Mode = 'Probe',
    [string]$MakeCodeFile = '',
    [switch]$CheckOnly,
    [switch]$NoOpen
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$privateRoot = Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\PrivateModelStudies'
function Require([bool]$condition, [string]$reason) {
    if (-not $condition) { throw "MAB_EDUCATION_LAUNCH_HOLD: $reason" }
}
function Sha256File([string]$file) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
    } finally { $sha.Dispose() }
}
function LocateRetailCode {
    # The true saved 3-building PRIVATE comparison stays off GitHub.
    Require (Test-Path -LiteralPath $privateRoot -PathType Container) 'PRIVATE_STUDIES_NOT_FOUND'
    $recent = @(Get-ChildItem -LiteralPath $privateRoot -Directory |
        Where-Object { $_.Name -like 'V11_MakeCode_8c2d914_*' } |
        Sort-Object LastWriteTime -Descending)
    foreach ($parent in $recent) {
        $matches = @(Get-ChildItem -LiteralPath $parent.FullName -Directory |
            Where-Object { $_.Name -match '(retail|shop|store|店舗)' -and $_.Name -match 'makecode' })
        if ($matches.Count -eq 1) {
            return (Join-Path $matches[0].FullName 'MAKECODE_EDUCATION.ts')
        }
    }
    throw 'MAB_EDUCATION_LAUNCH_HOLD: RETAIL_PATH_NOT_UNAMBIGUOUS: use -MakeCodeFile'
}
function VerifyRetailPacket([string]$file) {
    Require (Test-Path -LiteralPath $file -PathType Leaf) 'MAKECODE_NOT_FOUND'
    $folder = Split-Path -Parent $file
    $reportPath = Join-Path $folder 'EXPORT_REPORT.json'
    $reviewPath = Join-Path $folder 'SOURCE_WALKABILITY_REVIEW.json'
    $designPath = Join-Path $folder 'B143_SOURCE.json'
    foreach ($p in @($reportPath,$reviewPath,$designPath)) {
        Require (Test-Path -LiteralPath $p -PathType Leaf) ('MISSING_PACKET_FILE ' + $p)
    }
    $report = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $review = Get-Content -LiteralPath $reviewPath -Raw -Encoding UTF8 | ConvertFrom-Json
    Require ($report.status -eq 'OFFLINE_CODE_GENERATED_ONLY') 'NOT_OFFLINE_CODE'
    Require ($report.materialMode -eq 'UNVERIFIED_TEST_WORLD_PREVIEW') 'NOT_DISPOSABLE_PREVIEW'
    Require ($report.actualEducationExecution -eq 'NOT_TESTED') 'GAME_EXECUTION_PROVENANCE_UNEXPECTED'
    Require ($report.worldWrites -eq 0 -and $report.programExecuted -eq $false) 'WORLD_WRITE_METADATA_DRIFT'
    Require ($report.sourceSha256 -eq $review.sourceSha256) 'SOURCE_SHA_MISMATCH'
    Require ($report.geometrySha256 -eq $review.geometrySha256) 'GEOMETRY_SHA_MISMATCH'
    Require ($review.status -eq 'SOURCE_ROUTE_CANDIDATE') 'SOURCE_WALKABILITY_HOLD'
    Require ($review.hostDetail -eq 'spatial-v1') 'WRONG_SAVED_SPATIAL_MODE'
    Require ($report.plannedVoxelCount -gt 100) 'MISSING_BUILDING_VOXELS'
    Require ((Sha256File $file) -eq $report.makecodeSourceSha256) 'MAKECODE_FILE_HASH_MISMATCH'
    Write-Host ('Verified offline retail MakeCode: ' + $report.plannedVoxelCount +
        ' blocks; SOURCE ' + $report.sourceSha256)
}

if ($Mode -eq 'Movement') {
    Require ([string]::IsNullOrWhiteSpace($MakeCodeFile) 'MOVEMENT_TAKES_NO_CUSTOM_PACKET'
    $codeFile = Join-Path $repo 'scripts\R125_V11_EDUCATION_INPUT_CHECK.ts'
    Require (Test-Path -LiteralPath $codeFile -PathType Leaf) 'MOVEMENT_CODE_MISSING'
    $movementCode = Get-Content -LiteralPath $codeFile -Raw -Encoding UTF8
    Require ($movementCode.Contains('player.onChat("mabwhere"') -and
        $movementCode.Contains('player.onChat("mabwalk"')) 'MOVEMENT_COMMANDS_MISSING'
} elseif ($Mode -eq 'Retail') {
    Require (-not $CheckOnly) 'RETAIL_CHECKONLY_REQUIRES_PRIVATE_PACKET'
    if ([string]::IsNullOrWhiteSpace($MakeCodeFile)) {
        $MakeCodeFile = LocateRetailCode
    }
    $MakeCodeFile = [System.IO.Path]::GetFullPath($MakeCodeFile)
    VerifyRetailPacket $MakeCodeFile
    $codeFile = $MakeCodeFile
} else {
    Require ([string]::IsNullOrWhiteSpace($MakeCodeFile)) 'PROBE_DOES_NOT_TAKE_MAKECODE_FILE'
    if ($CheckOnly) {
        $parent = Join-Path $env:TEMP 'mab-education-probe-check'
    } else {
        $parent = $privateRoot
    }
    [void](New-Item -ItemType Directory -Path $parent -Force)
    $output = Join-Path $parent ('V11_EducationProbe_' + [guid]::NewGuid().ToString('N'))
    try {
        & node (Join-Path $repo 'scripts\r125-material-probe.mjs') --preview-palette --out $output
        Require ($LASTEXITCODE -eq 0) 'PROBE_CODE_GENERATION_FAILED'
        $codeFile = Join-Path $output 'MAKECODE_MATERIAL_PROBE.ts'
        $reportPath = Join-Path $output 'PROBE_REPORT.json'
        Require ((Test-Path -LiteralPath $codeFile -PathType Leaf) -and
            (Test-Path -LiteralPath $reportPath -PathType Leaf)) 'PROBE_PACKET_INCOMPLETE'
        $report = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
        Require ($report.schema -eq 'r125-education-preview-palette-material-probe-v1') 'PROBE_SCHEMA'
        Require ($report.blockNames.Count -eq 7) 'PREVIEW_MATERIAL_COUNT'
        Require ($report.worldWrites -eq 0 -and $report.inGameResult -eq 'NOT_TESTED') 'PROBE_PROVENANCE'
        $code = Get-Content -LiteralPath $codeFile -Raw -Encoding UTF8
        Require ($code.Contains('player.onChat("mb"')) 'PROBE_COMMAND_MISSING'
        Write-Host ('Prepared actual 7-material preview probe: ' + $output)
    } finally {
        if ($CheckOnly -and (Test-Path -LiteralPath $output)) {
            Remove-Item -LiteralPath $output -Recurse -Force
        }
    }
}

if ($CheckOnly) {
    Write-Host 'MAB_EDUCATION_LAUNCH_CHECK_ONLY_PASS: no clipboard, game, world or model access'
    exit 0
}

# Windows owns this clipboard; this script does NOT control Code Builder.
$code = Get-Content -LiteralPath $codeFile -Raw -Encoding UTF8
Set-Clipboard -Value $code
Write-Host 'MakeCode JavaScript copied to Windows clipboard.'
if (-not $NoOpen) {
    try {
        Start-Process -FilePath 'minecraftedu://open' -ErrorAction Stop
        Write-Host 'Requested Minecraft Education main menu via official minecraftedu://open URI.'
    } catch {
        Write-Warning 'Minecraft Education was not opened. Start it manually from Windows Start; clipboard is ready.'
    }
}
Write-Host 'In Minecraft Education: reuse ONE dedicated creative flat test world (enable cheats). For each new trial while standing on the ground: /tp @s ~256 ~ ~, confirm clear site; press C, open MakeCode JavaScript, and paste.'
if ($Mode -eq 'Movement') {
    Write-Host 'Read-only test: in the EXISTING creative flat test world, press C, MakeCode JavaScript, paste, Run, then Resume Game. Chat mabwhere; chat mabwalk and hold W in an open flat area. Repeat mabwalk just inside the building. If outdoor movement works but indoor does not, investigate physical obstruction. No world writes.'
} elseif ($Mode -eq 'Probe') {
    Write-Host 'At an unused flat site in the dedicated test world only: run MakeCode, then chat mb. Confirm 7/7 matching and visually inspect blocks.'
    Write-Host 'Do NOT paste a building script until this first material test is evaluated.'
} else {
    Write-Host 'At an unused flat site in the dedicated test world only: run MakeCode, chat mabset, then mabbuild, then mabverify. Teleport only before mabset; the clearance preflight rejects occupied sites.'
    Write-Host 'A SOURCE or MakeCode PASS does not prove the in-game walk or architecture quality.'
}
Write-Host ('Copied source file: ' + $codeFile)

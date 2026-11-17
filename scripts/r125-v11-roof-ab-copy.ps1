# MAB V11: copy either of two existing PRIVATE, source-matched MakeCode packets.
# No model, new design generation, Minecraft control, or world writes.
[CmdletBinding()]
param(
 [string]$ComparisonDirectory='',
 [ValidateSet('BASELINE','COMPACT')][string]$Variant='COMPACT',
 [switch]$CheckOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Require([bool]$condition,[string]$reason){
 if(-not $condition){throw ('MAB_V11_ROOF_COPY_HOLD_'+$reason)}
}
function Hash([string]$file){
 return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
}
if($CheckOnly){
 Write-Output 'MAB_V11_ROOF_COPY_CHECK_ONLY_PASS: no PRIVATE, clipboard, game or world contact.'
 return
}
Require (-not [string]::IsNullOrWhiteSpace($ComparisonDirectory)) 'COMPARISON_DIRECTORY_REQUIRED'
Require (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) 'LOCALAPPDATA_REQUIRED'
$private=(Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\PrivateModelStudies')
Require (Test-Path -LiteralPath $private -PathType Container) 'PRIVATE_ROOT_MISSING'
$root=(Resolve-Path -LiteralPath $private).Path.TrimEnd('\')
$folder=(Resolve-Path -LiteralPath $ComparisonDirectory -ErrorAction Stop).Path
Require ($folder.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)) 'NOT_PRIVATE_COMPARISON'
$manifestPath=Join-Path $folder 'REVIEW.json'
Require (Test-Path -LiteralPath $manifestPath -PathType Leaf) 'REVIEW_MISSING'
$report=Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
Require ($report.schema -ceq 'mab-v11-roof-massing-ab-v1' -and
 $report.massing -ceq 'compact-sawtooth' -and
 $report.originalEdited -eq $false -and
 [int]$report.modelCalls -eq 0 -and [int]$report.worldWrites -eq 0 -and
 $report.education.worldExecution -ceq 'NOT_TESTED') 'COMPARISON_PROVENANCE'
$choice=@($report.education.packets | Where-Object {$_.variant -ceq $Variant})
Require ($choice.Count -eq 1) 'VARIANT_NOT_UNAMBIGUOUS'
$row=$choice[0]
$codeName='MAKECODE_'+$Variant+'.ts'
$reportName='EXPORT_'+$Variant+'.json'
Require ($row.codeFile -ceq $codeName -and $row.reportFile -ceq $reportName) 'PACKET_NAMES_DRIFT'
$codeFile=Join-Path $folder $codeName
$exportFile=Join-Path $folder $reportName
Require ((Test-Path -LiteralPath $codeFile -PathType Leaf) -and
 (Test-Path -LiteralPath $exportFile -PathType Leaf)) 'PACKET_FILES_MISSING'
$export=Get-Content -LiteralPath $exportFile -Raw -Encoding UTF8 | ConvertFrom-Json
$actualHash=Hash $codeFile
Require ($actualHash -ceq $row.makecodeSourceSha256 -and
 $actualHash -ceq $export.makecodeSourceSha256 -and
 $row.sourceSha256 -ceq $export.sourceSha256 -and
 $export.materialMode -ceq 'STRICT_USER_ATTESTED' -and
 $export.actualEducationExecution -ceq 'NOT_TESTED' -and
 [int]$export.worldWrites -eq 0 -and
 $export.programExecuted -eq $false) 'PACKET_HASH_OR_SOURCE_MISMATCH'
$expectedSource=if($Variant -ceq 'BASELINE'){$report.sourceSha256Before}else{$report.sourceSha256After}
Require ($expectedSource -ceq $export.sourceSha256) 'VARIANT_SOURCE_MISMATCH'
$code=Get-Content -LiteralPath $codeFile -Raw -Encoding UTF8
Require ($code.Contains('player.onChat("mabset"') -and
 $code.Contains('player.onChat("mabbuild"') -and
 $code.Contains('player.onChat("mabverify"') -and
 $code.Contains('player.onChat("mabwhere"') -and
 $code.Contains('player.onChat("mabwalk"')) 'REQUIRED_COMMANDS_MISSING'
Set-Clipboard -Value $code
Write-Output ('MAB_V11_COPIED_VARIANT='+$Variant)
Write-Output ('MAB_V11_COPIED_SHA='+$actualHash)
Write-Output ('MAB_V11_COMPARE_SOURCE='+$export.sourceSha256)
Write-Output 'In the existing flat test world, choose a NEW empty site (for the second variant use /tp @s ~256 ~ ~ on ground); paste MakeCode and run mabset, mabbuild, mabverify. Run mabwalk outside then inside. Compare roof, daylight and room equipment visually.'

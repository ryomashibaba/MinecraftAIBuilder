# MAB V11: one-command PRIVATE recovered-Qwen roof shape A/B + two offline MakeCode packets.
# Never calls a model, touches a world, opens Code Builder or uploads PRIVATE artifacts.
[CmdletBinding()]
param(
 [switch]$CheckOnly,
 [string]$RecoveryDirectory='',
 [string]$OutDirectory='',
 [switch]$NoOpen
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Require([bool]$condition,[string]$reason) {
 if(-not $condition){throw ('MAB_V11_TIDE_ROOF_AB_HOLD_'+$reason)}
}
function Hash([string]$file) {
 return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
}
$repo=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$runner=Join-Path $repo 'scripts\r125-roof-ribbon-ab.mjs'
$node=(Get-Command node -ErrorAction Stop).Source
Require (Test-Path -LiteralPath $runner -PathType Leaf) 'RUNNER_MISSING'
if($CheckOnly) {
 & $node --check $runner
 Require ($LASTEXITCODE -eq 0) 'RUNNER_SYNTAX'
 Write-Output 'MAB_V11_TIDE_ROOF_AB_CHECK_ONLY_PASS: no PRIVATE, model, clipboard, or world access.'
 return
}
Require (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) 'WINDOWS_LOCALAPPDATA_MISSING'
$private=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\PrivateModelStudies'
Require (Test-Path -LiteralPath $private -PathType Container) 'PRIVATE_ROOT_MISSING'
$expectedSource='b38e6203d0d7dc5df476ca7e5d6db54ca5f96e59544c9e6741c2ca79a747d71c'
function LoadStudy([string]$folder) {
 $reportPath=Join-Path $folder 'RECOVERY_ART_REPORT.json'
 $originalPath=Join-Path $folder 'RECOVERED_SOURCE\MODEL_RESPONSE_ORIGINAL.txt'
 if(-not (Test-Path -LiteralPath $reportPath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $originalPath -PathType Leaf)) {return $null}
 try {
  $report=Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if($report.schema -cne 'r125-recovered-source-art-review-v1' -or
     $report.model -cne 'qwen3:14b' -or
     $report.artifactStatus -cne 'SOURCE_PASS_ART_REVIEW_READY' -or
     $report.after.sourceSha256 -cne $expectedSource -or
     $report.after.sourceVerified -ne $true -or
     $report.after.originalSha256 -cne (Hash $originalPath) -or
     [int]$report.modelCalls -ne 0 -or [int]$report.worldWrites -ne 0) {return $null}
  return @{Directory=$folder;Raw=$originalPath;Manifest=$report}
 }catch{return $null}
}
$root=(Resolve-Path -LiteralPath $private).Path.TrimEnd('\')
if(-not [string]::IsNullOrWhiteSpace($RecoveryDirectory)) {
 $choice=(Resolve-Path -LiteralPath $RecoveryDirectory -ErrorAction Stop).Path
 Require ($choice.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)) 'RECOVERY_NOT_PRIVATE'
 $study=LoadStudy $choice
 Require ($null -ne $study) 'INVALID_PRIVATE_TIDE_RECOVERY'
}else{
 $study=$null
 $choices=@(Get-ChildItem -LiteralPath $private -Directory -Filter 'V11_EducationRecovered_*' |
  Sort-Object LastWriteTime -Descending)
 foreach($item in $choices){
  $study=LoadStudy $item.FullName
  if($null -ne $study){break}
 }
 Require ($null -ne $study) 'PINNED_PRIVATE_TIDE_RECOVERY_NOT_FOUND'
}
if([string]::IsNullOrWhiteSpace($OutDirectory)){
 $out=Join-Path $private ('V11_TideRoof_AB_'+[guid]::NewGuid().ToString('N'))
}else{
 $out=[System.IO.Path]::GetFullPath($OutDirectory)
 Require ($out.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)) 'OUTPUT_NOT_PRIVATE'
}
Require (-not (Test-Path -LiteralPath $out)) 'OUTPUT_EXISTS'
Require (Test-Path -LiteralPath (Split-Path -Parent $out) -PathType Container) 'OUTPUT_PARENT_MISSING'
Require (-not $out.StartsWith($study.Directory+'\',[StringComparison]::OrdinalIgnoreCase)) 'OUTPUT_INSIDE_RECOVERY'
& $node $runner --raw $study.Raw --out $out --massing compact-sawtooth --education
Require ($LASTEXITCODE -eq 0) 'OFFLINE_AB_FAILED'
$review=Get-Content -LiteralPath (Join-Path $out 'REVIEW.json') -Raw -Encoding UTF8 | ConvertFrom-Json
Require ($review.originalSha256 -cne '' -and
 $review.originalSha256 -ceq (Hash $study.Raw)) 'AUTHOR_ORIGINAL_CHANGED'
Require ($review.massing -ceq 'compact-sawtooth' -and
 $review.originalEdited -eq $false -and $review.worldWrites -eq 0 -and
 $review.education.worldExecution -ceq 'NOT_TESTED' -and
 @($review.education.packets).Count -eq 2) 'RESULT_NOT_REVIEW_READY'
foreach($row in @($review.education.packets)) {
 $codeFile=Join-Path $out $row.codeFile
 $reportFile=Join-Path $out $row.reportFile
 Require ((Hash $codeFile) -ceq $row.makecodeSourceSha256) 'CODE_HASH_MISMATCH'
 $pkt=Get-Content -LiteralPath $reportFile -Raw -Encoding UTF8 | ConvertFrom-Json
 Require ($pkt.sourceSha256 -ceq $row.sourceSha256 -and
  $pkt.materialMode -ceq 'STRICT_USER_ATTESTED' -and
  $pkt.actualEducationExecution -ceq 'NOT_TESTED' -and
  $pkt.worldWrites -eq 0) 'PACKET_INVALID'
}
Write-Output ('MAB_V11_TIDE_ROOF_AB_READY='+$out)
Write-Output ('MAB_V11_ROOF_BEFORE='+$review.roofCrestY.before)
Write-Output ('MAB_V11_ROOF_AFTER='+$review.roofCrestY.after)
Write-Output ('MAB_V11_ART_PREVIEW='+$review.image)
Write-Output ('MAB_V11_MAKECODE_BASELINE='+(Join-Path $out 'MAKECODE_BASELINE.ts'))
Write-Output ('MAB_V11_MAKECODE_COMPACT='+(Join-Path $out 'MAKECODE_COMPACT.ts'))
Write-Output 'NO GAME EXECUTION: compare image first; in existing flat test world use two separate unused sites, one packet at a time, mabset/mabbuild/mabverify. Actual walking and art need visual test.'
if(-not $NoOpen) {
 try {Start-Process -FilePath $review.image -ErrorAction Stop}
 catch {Write-Warning 'Preview not opened automatically; see MAB_V11_ART_PREVIEW path.'}
}

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
# Verify a real archived study from its ORIGINAL and SOURCE replay evidence.
# Do not hardcode a guessed SOURCE SHA from unavailable PRIVATE content.
$expectedBeforeOriginal='d71eb74c74fda1d959059f5f1a46ef9e6c41f52a2f538b46116c703a7c2a5688'
function LoadStudy([string]$folder) {
 $reportPath=Join-Path $folder 'RECOVERY_ART_REPORT.json'
 $originalPath=Join-Path $folder 'RECOVERED_SOURCE\MODEL_RESPONSE_ORIGINAL.txt'
 $diagnosticPath=Join-Path $folder 'RECOVERED_SOURCE\SOURCE_DIAGNOSIS.json'
 $sourcePath=Join-Path $folder 'RECOVERED_SOURCE\B143_SOURCE_REVIEW_ONLY.json'
 foreach($p in @($reportPath,$originalPath,$diagnosticPath,$sourcePath)){
  if(-not (Test-Path -LiteralPath $p -PathType Leaf)){return $null}
 }
 try {
  $report=Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $diagnosis=Get-Content -LiteralPath $diagnosticPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $source=Get-Content -LiteralPath $sourcePath -Raw -Encoding UTF8 | ConvertFrom-Json
  $originalHash=Hash $originalPath
  if($report.schema -cne 'r125-recovered-source-art-review-v1' -or
     $report.model -cne 'qwen3:14b' -or
     $report.artifactStatus -cne 'SOURCE_PASS_ART_REVIEW_READY' -or
     $report.originalRequestsIdentical -ne $true -or
     $report.sourceOriginalsEdited -ne $false -or
     $report.before.originalSha256 -cne $expectedBeforeOriginal -or
     $report.after.sourceVerified -ne $true -or
     $diagnosis.sourceVerified -ne $true -or
     $source.id -cne 'tide-observatory' -or
     $report.after.originalSha256 -cne $originalHash -or
     $diagnosis.originalSha256 -cne $originalHash -or
     $report.after.sourceSha256 -cne $diagnosis.sourceSha256 -or
     $report.after.geometrySha256 -cne $diagnosis.geometrySha256 -or
     $report.after.status -cne 'B143_SOURCE_CANDIDATE_ART_HOLD' -or
     $diagnosis.status -cne 'B143_SOURCE_CANDIDATE_ART_HOLD' -or
     $report.after.sourceSha256 -cnotmatch '^[0-9a-f]{64}$' -or
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
# Genuine art remains reviewable even when one of the used Education blocks
# has not yet been attested. Do not silently claim verified MakeCode.
$missing=@()
if($null -ne $study.Manifest.education -and
   $null -ne $study.Manifest.education.missingInGameAttestation){
 $missing=@($study.Manifest.education.missingInGameAttestation)
}
$artOnly=$missing.Count -gt 0
if($artOnly){
 & $node $runner --raw $study.Raw --out $out --massing compact-sawtooth
}else{
 & $node $runner --raw $study.Raw --out $out --massing compact-sawtooth --education
}
Require ($LASTEXITCODE -eq 0) 'OFFLINE_AB_FAILED'
$review=Get-Content -LiteralPath (Join-Path $out 'REVIEW.json') -Raw -Encoding UTF8 | ConvertFrom-Json
Require ($review.originalSha256 -cne '' -and
 $review.originalSha256 -ceq (Hash $study.Raw)) 'AUTHOR_ORIGINAL_CHANGED'
Require ($review.massing -ceq 'compact-sawtooth' -and
 $review.originalEdited -eq $false -and $review.worldWrites -eq 0 -and
 $review.roofAir.enclosedEavesAndSteps -eq $true -and
 $review.belowRoofGeometryAndMaterialIdentical -eq $true) 'RESULT_NOT_REVIEW_READY'
if($artOnly){
 Require ($null -eq $review.education) 'UNVERIFIED_MATERIAL_CODE_NOT_ALLOWED'
}else{
 Require ($review.education.worldExecution -ceq 'NOT_TESTED' -and
  @($review.education.packets).Count -eq 2) 'RESULT_NO_STRICT_PACKETS'
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
}
Write-Output ('MAB_V11_TIDE_ROOF_AB_READY='+$out)
Write-Output ('MAB_V11_ROOF_BEFORE='+$review.roofCrestY.before)
Write-Output ('MAB_V11_ROOF_AFTER='+$review.roofCrestY.after)
$dashboard=Join-Path $out $review.artDashboard.file
Require (Test-Path -LiteralPath $dashboard -PathType Leaf) 'DASHBOARD_MISSING'
Require ((Hash $dashboard) -ceq $review.artDashboard.sha256) 'DASHBOARD_HASH'
Write-Output ('MAB_V11_ART_PREVIEW='+$review.image)
Write-Output ('MAB_V11_ART_DASHBOARD='+$dashboard)
if($artOnly){
 Write-Output ('MAB_V11_ART_ONLY_MISSING_ATTESTED_MATERIALS='+
  (($missing | ForEach-Object {$_.material}) -join ', '))
 Write-Output 'MAB_V11_NO_STRICT_BUILDING_CODE: review real B143 geometry only.'
 $probe=Join-Path $study.Directory 'EDUCATION_DISPOSABLE_PREVIEW\MAKECODE_MISSING_MATERIAL_PROBE.ts'
 if((Test-Path -LiteralPath $probe -PathType Leaf) -and
    $null -ne $study.Manifest.education.missingMaterialProbe){
  Require ((Hash $probe) -ceq
   $study.Manifest.education.missingMaterialProbe.codeSha256) 'MATERIAL_PROBE_SHA_MISMATCH'
  Set-Clipboard -Value (Get-Content -LiteralPath $probe -Raw -Encoding UTF8)
  Write-Output 'MAB_V11_MATERIAL_PROBE_COPIED: in the test world run chat mb.'
 }
 Write-Output 'UNVERIFIED MATERIALS: no code for either building until the block probe is reviewed.'
}else{
 Write-Output ('MAB_V11_MAKECODE_BASELINE='+(Join-Path $out 'MAKECODE_BASELINE.ts'))
 Write-Output ('MAB_V11_MAKECODE_COMPACT='+(Join-Path $out 'MAKECODE_COMPACT.ts'))
 $baseline=Join-Path $out 'MAKECODE_BASELINE.ts'
 Set-Clipboard -Value (Get-Content -LiteralPath $baseline -Raw -Encoding UTF8)
 Write-Output 'MAB_V11_BASELINE_COPIED_TO_CLIPBOARD: paste into Code Builder / MakeCode JavaScript.'
 Write-Output 'MAB_V11_NEXT_VARIANT_COMMAND:'
 Write-Output ('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "'+
  (Join-Path $repo 'scripts\r125-v11-roof-ab-copy.ps1')+
  '" -ComparisonDirectory "'+$out+'" -Variant COMPACT')
 Write-Output 'NO GAME EXECUTION: use two empty sites in the same flat world; run mabset/mabbuild/mabverify then mabwalk outdoors and indoors.'
}
if(-not $NoOpen) {
 try {Start-Process -FilePath $dashboard -ErrorAction Stop}
 catch {Write-Warning '3D comparison not opened automatically; see MAB_V11_ART_DASHBOARD path.'}
}

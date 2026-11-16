# MAB V11: one-command REAL saved-Qwen -> Minecraft Education test preparation.
# Never calls a model, starts a world, pastes into Code Builder, or writes blocks.
# -Stage Probe: prepare ONLY materials missing Education 26.33 attestation.
# -Stage Preview: prepare saved SOURCE-matched building for an empty site in ONE reusable dedicated flat test world.
[CmdletBinding()]
param(
 [ValidateSet('Probe','Preview')][string]$Stage='Probe',
 [string]$RecoveryDirectory='',
 [switch]$CheckOnly,
 [switch]$NoOpen
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Require([bool]$ok,[string]$reason){
 if(-not $ok){throw ('MAB_V11_EDU_RECOVERED_HOLD_'+$reason)}
}
function Sha([string]$p){
 return (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()
}
$repo=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$runner=Join-Path $repo 'scripts\r125-recovered-art-review.mjs'
$export=Join-Path $repo 'source\ai\r125-education-makecode-export.mjs'
Require (Test-Path -LiteralPath $runner -PathType Leaf) 'RUNNER_NOT_FOUND'
Require (Test-Path -LiteralPath $export -PathType Leaf) 'EDU_EXPORT_NOT_FOUND'
$node=(Get-Command node -ErrorAction Stop).Source
$nodeVersion=(& $node --version)
$nodeMatch=[regex]::Match([string]$nodeVersion,'^v(\d+)\.')
Require ($LASTEXITCODE -eq 0 -and $nodeMatch.Success -and
 [int]$nodeMatch.Groups[1].Value -ge 20) 'NODE20_REQUIRED'
if($CheckOnly){
 & $node --check $runner
 Require ($LASTEXITCODE -eq 0) 'RECOVERY_RUNNER_SYNTAX'
 & $node --check $export
 Require ($LASTEXITCODE -eq 0) 'EXPORT_SYNTAX'
 Write-Output 'MAB_V11_EDU_RECOVERED_CHECK_ONLY_PASS: no PRIVATE, model, clipboard or world operation.'
 return
}
Require ($env:OS -ceq 'Windows_NT') 'WINDOWS_REQUIRED'
Require (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) 'LOCALAPPDATA_REQUIRED'
$private=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\PrivateModelStudies'
Require (Test-Path -LiteralPath $private -PathType Container) 'PRIVATE_MISSING'
$old=Join-Path $private 'V11_UnseenSingle_20261116_143908_937_0bf923c6'
$failed=Join-Path $private 'V11_UnseenSingle_20261116_162853_058_321c3732'
function GoodPacket([string]$dir){
 try{
  $manifest=Join-Path $dir 'RECOVERY_ART_REPORT.json'
  if(-not (Test-Path -LiteralPath $manifest -PathType Leaf)){return $false}
  $m=Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 | ConvertFrom-Json
  if($m.schema -cne 'r125-recovered-source-art-review-v1' -or
   $m.artifactStatus -cne 'SOURCE_PASS_ART_REVIEW_READY' -or
   $m.model -cne 'qwen3:14b' -or
   $m.originalRequestsIdentical -ne $true -or
   $m.before.originalSha256 -cne 'd71eb74c74fda1d959059f5f1a46ef9e6c41f52a2f538b46116c703a7c2a5688' -or
   $m.after.sourceVerified -ne $true -or
   [int]$m.modelCalls -ne 0 -or [int]$m.worldWrites -ne 0 -or
   $m.education.sourceSha256 -cne $m.after.sourceSha256 -or
   $m.education.geometrySha256 -cne $m.after.geometrySha256 -or
   [int]$m.education.worldWrites -ne 0 -or
   -not ($m.education.status -like 'DISPOSABLE_PREVIEW_ONLY_*')){return $false}
  $code=Join-Path $dir 'EDUCATION_DISPOSABLE_PREVIEW\MAKECODE_EDUCATION_PREVIEW_ONLY.ts'
  $packet=Join-Path $dir 'EDUCATION_DISPOSABLE_PREVIEW\MAKECODE_EXPORT_REPORT.json'
  if(-not (Test-Path -LiteralPath $code -PathType Leaf) -or
     -not (Test-Path -LiteralPath $packet -PathType Leaf)){return $false}
  $p=Get-Content -LiteralPath $packet -Raw -Encoding UTF8 | ConvertFrom-Json
  if($p.sourceSha256 -cne $m.after.sourceSha256 -or
     $p.geometrySha256 -cne $m.after.geometrySha256 -or
     $p.materialMode -cne 'UNVERIFIED_TEST_WORLD_PREVIEW' -or
     $p.actualEducationExecution -cne 'NOT_TESTED' -or
     [int]$p.worldWrites -ne 0 -or $p.programExecuted -ne $false -or
     $p.makecodeSourceSha256 -cne (Sha $code)){return $false}
  return $true
 }catch{return $false}
}
if([string]::IsNullOrWhiteSpace($RecoveryDirectory)){
 $choices=@(Get-ChildItem -LiteralPath $private -Directory -Filter 'V11_EducationRecovered_*' |
  Sort-Object LastWriteTime -Descending)
 $selected=$null
 foreach($candidate in $choices){if(GoodPacket $candidate.FullName){$selected=$candidate.FullName;break}}
 if($null -eq $selected){
  foreach($p in @($old,$failed)){Require (Test-Path -LiteralPath $p -PathType Container) 'ORIGINAL_STUDIES_NOT_FOUND'}
  $selected=Join-Path $private ('V11_EducationRecovered_'+[guid]::NewGuid().ToString('N'))
  & $node $runner --before-study $old --failed-study $failed --out $selected | Out-Null
  Require ($LASTEXITCODE -eq 0) 'OFFLINE_RECOVERY_FAILED'
  Require (GoodPacket $selected) 'RECOVERY_PACKET_INCOMPLETE'
 }
}else{
 $selected=(Resolve-Path -LiteralPath $RecoveryDirectory -ErrorAction Stop).Path
 $privResolved=(Resolve-Path -LiteralPath $private).Path.TrimEnd('\')
 Require ($selected.StartsWith($privResolved+'\',
  [StringComparison]::OrdinalIgnoreCase)) 'RESULT_MUST_BE_PRIVATE'
 Require (GoodPacket $selected) 'RESULT_UNVERIFIED'
}
$manifest=Get-Content -LiteralPath (Join-Path $selected 'RECOVERY_ART_REPORT.json') -Raw -Encoding UTF8 |
 ConvertFrom-Json
if($Stage -ceq 'Probe'){
 $missing=@($manifest.education.missingInGameAttestation)
 if($missing.Count -eq 0){
  Write-Output 'MAB_EDU_NO_MISSING_MATERIALS: no material probe needed.'
  Write-Output ('MAB_EDU_REVIEW='+$selected)
  return
 }
 $p=$manifest.education.missingMaterialProbe
 Require ($null -ne $p) 'MISSING_PROBE_PACKET'
 $codeFile=Join-Path $selected 'EDUCATION_DISPOSABLE_PREVIEW\MAKECODE_MISSING_MATERIAL_PROBE.ts'
 $probeReport=Join-Path $selected 'EDUCATION_DISPOSABLE_PREVIEW\MISSING_MATERIAL_PROBE_REPORT.json'
 Require ((Test-Path -LiteralPath $codeFile -PathType Leaf) -and
  (Test-Path -LiteralPath $probeReport -PathType Leaf)) 'PROBE_FILES_MISSING'
 $meta=Get-Content -LiteralPath $probeReport -Raw -Encoding UTF8 | ConvertFrom-Json
 Require ($meta.schema -ceq 'r125-recovered-used-material-probe-v1') 'PROBE_SCHEMA'
 Require ($meta.sourceSha256 -ceq $manifest.after.sourceSha256) 'PROBE_SOURCE'
 Require ($meta.geometrySha256 -ceq $manifest.after.geometrySha256) 'PROBE_GEOMETRY'
 Require ((Sha $codeFile) -ceq $meta.codeSha256 -and
  $meta.codeSha256 -ceq $p.codeSha256) 'PROBE_HASH'
 Require (@($meta.previewBlockNames).Count -eq $missing.Count -and
  [int]$meta.worldWrites -eq 0 -and
  $meta.actualEducationMaterialResults -ceq 'NOT_TESTED') 'PROBE_SCOPE'
 $chat='mb'
 Write-Output ('MAB_EDU_UNVERIFIED_MATERIALS='+(
  ($missing | ForEach-Object { $_.material+':'+$_.previewOnlyGuess }) -join ', '))
}else{
 $codeFile=Join-Path $selected 'EDUCATION_DISPOSABLE_PREVIEW\MAKECODE_EDUCATION_PREVIEW_ONLY.ts'
 Require ((Sha $codeFile) -ceq $manifest.education.packetSha256) 'PREVIEW_HASH'
 $chat='mabset, mabbuild, mabverify'
 if(@($manifest.education.missingInGameAttestation).Count -gt 0){
  Write-Warning 'MAB_PREVIEW_MATERIALS_UNVERIFIED: inspect missing materials with -Stage Probe first; use a clear site in the dedicated flat test world.'
 }
}
$codeText=Get-Content -LiteralPath $codeFile -Raw -Encoding UTF8
Set-Clipboard -Value $codeText
Write-Output ('MAB_EDU_CODE_READY='+$codeFile)
Write-Output ('MAB_EDU_SOURCE_SHA='+$manifest.after.sourceSha256)
Write-Output ('MAB_EDU_COMMANDS='+$chat)
Write-Output ('MAB_EDU_REVIEW='+$selected)
if(-not $NoOpen){
 try{Start-Process -FilePath 'minecraftedu://open' -ErrorAction Stop}
 catch{Write-Warning 'MAB_EDU_OPEN_FAILED: launch Minecraft Education manually'}
}
Write-Output 'Reuse the dedicated CREATIVE FLAT TEST WORLD. For each new trial, stand on ground, chat /tp @s ~256 ~ ~, verify empty flat space, then paste into Code Builder / MakeCode JavaScript. This launcher did not teleport or place blocks.'

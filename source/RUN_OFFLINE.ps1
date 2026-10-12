#requires -Version 5.1
<# Step8A.5 offline volumetric design. No project checkout, Bridge or world operations. #>
[CmdletBinding()]
param(
  [string]$Request = '幅24×奥行20の6階建てオフィス。和モダンのガラス張り',
  [string]$OutputDir = ''
)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeCmd=Get-Command node -ErrorAction SilentlyContinue
if(-not $nodeCmd){throw 'NODE_NOT_FOUND: Node.js >=20 required'}
if([string]::IsNullOrWhiteSpace($OutputDir)){
  $OutputDir=Join-Path $env:USERPROFILE ('Downloads\MinecraftAIBuilder_Step8A5_Review_'+(Get-Date -Format 'yyyyMMdd_HHmmss')+'_'+[guid]::NewGuid().ToString('N').Substring(0,6))
}
& $nodeCmd.Source (Join-Path $root 'verify-package.mjs')
if($LASTEXITCODE -ne 0){throw 'STEP8A4_INTEGRITY_BLOCKED'}
& $nodeCmd.Source --test (Join-Path $root 'tests\step8a-design.test.mjs') (Join-Path $root 'tests\step8a-review.test.mjs') (Join-Path $root 'tests\step8a-architecture.test.mjs') (Join-Path $root 'tests\step8a-detail.test.mjs') (Join-Path $root 'tests\step8a-physical.test.mjs') (Join-Path $root 'tests\step8a-optimize.test.mjs')
if($LASTEXITCODE -ne 0){throw 'STEP8A4_SELFTEST_BLOCKED'}
& $nodeCmd.Source (Join-Path $root 'runner\step8a-review.mjs') $Request $OutputDir
if($LASTEXITCODE -ne 0){throw 'STEP8A4_REVIEW_BLOCKED'}
Write-Host ('STEP8A4_REPORT '+(Join-Path $OutputDir 'review.json'))
Write-Host ('STEP8A4_VIEWER '+(Join-Path $OutputDir 'VIEWER.html'))
Write-Host ('STEP8A4_FLOOR_PLANS '+(Join-Path $OutputDir 'FLOOR_PLANS.html'))
Write-Host ('STEP8A4_DETAIL_COORDINATES '+(Join-Path $OutputDir 'DETAIL_COORDINATES.html'))
Write-Host ('STEP8A4_PHYSICAL_REVIEW '+(Join-Path $OutputDir 'PHYSICAL_REVIEW.html'))
Write-Host 'STEP8A4_OFFLINE_NOT_PREPARED_COMPLETE'

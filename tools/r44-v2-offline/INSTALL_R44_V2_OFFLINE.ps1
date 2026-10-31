# New independent release. No legacy installer/approval/lock execution.
param(
 [Parameter(Mandatory=$true)][string]$Base,
 [Parameter(Mandatory=$true)][string]$Overlay,
 [Parameter(Mandatory=$true)][string]$Out
)
$ErrorActionPreference='Stop'
$entry=Join-Path $PSScriptRoot 'install.mjs'
& node $entry --base $Base --overlay $Overlay --out $Out
if($LASTEXITCODE -ne 0){throw 'R44V2_OFFLINE_INSTALL_HOLD'}

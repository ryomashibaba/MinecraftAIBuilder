#requires -Version 5.1
<#
B56 convenience wrapper, no Minecraft operations. Tries a small fixed list of local folders (no recursive search).
Pass -ProjectRoot to choose a nonstandard location. Calls the frozen B55 pinned-source collector unchanged.
The collector writes only one ZIP in Downloads and never edits project files.
Review source code for secrets before uploading the result.
#>
[CmdletBinding()]
param([string]$ProjectRoot = '')
$ErrorActionPreference = 'Stop'
$legacy=Join-Path $PSScriptRoot '..\..\b55\main\COLLECT_B55_PINNED_SOURCE_READONLY.ps1'
if (-not (Test-Path -LiteralPath $legacy -PathType Leaf)) {throw 'B56_B55_COLLECTOR_NOT_FOUND'}
if ($ProjectRoot.Trim().Length -eq 0) {
 $paths=@(
  (Join-Path $env:USERPROFILE 'Documents\MinecraftAIBuilder'),
  (Join-Path $env:USERPROFILE 'Documents\minecraft-ai-builder'),
  (Join-Path $env:USERPROFILE 'Desktop\MinecraftAIBuilder'),
  (Join-Path $env:USERPROFILE 'MinecraftAIBuilder'),
  (Join-Path $env:USERPROFILE 'Projects\minecraft-ai-builder'),
  (Join-Path $env:USERPROFILE 'Downloads\MinecraftAIBuilder')
 )
 $matches=New-Object 'System.Collections.Generic.List[string]'
 foreach($p in $paths) {
  $package=Join-Path $p 'package.json'
  if(-not (Test-Path -LiteralPath $package -PathType Leaf)) {continue}
  try {
   $obj=Get-Content -LiteralPath $package -Raw | ConvertFrom-Json
   if($obj.name -cne 'minecraft-ai-builder') {continue}
  }catch {continue}
  $normalized=[IO.Path]::GetFullPath($p).TrimEnd([char[]]@('\','/'))
  if(-not $matches.Contains($normalized)) {$matches.Add($normalized)}
 }
 if ($matches.Count -eq 0) {throw 'B56_PROJECT_ROOT_NOT_FOUND_SPECIFY_ProjectRoot'}
 if ($matches.Count -gt 1) {throw 'B56_MULTIPLE_PROJECT_ROOTS_SPECIFY_ProjectRoot'}
 $ProjectRoot=$matches[0]
}
& $legacy -ProjectRoot $ProjectRoot
Write-Host 'B56_ONEPASS_READONLY_COMPLETE. REVIEW_ZIP_FOR_SECRETS_BEFORE_SHARING.'

#requires -Version 5.1
<#
B55 local source-only intake. Reads 5 explicitly named files, writes one ZIP to Downloads.
Never imports/evaluates the files. No HTTP, Minecraft, WebSocket, bridge, scanning, build commands,
world interaction, or modifications to the project. Review source contents for secrets before sharing.
#>
[CmdletBinding()]
param(
 [string]$ProjectRoot = (Join-Path $env:USERPROFILE 'Documents\MinecraftAIBuilder'),
 [string]$OutputDir = (Join-Path $env:USERPROFILE 'Downloads')
)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($ProjectRoot).TrimEnd([char[]]@('\','/'))
$out=[IO.Path]::GetFullPath($OutputDir).TrimEnd([char[]]@('\','/'))
$downloads=[IO.Path]::GetFullPath((Join-Path $env:USERPROFILE 'Downloads')).TrimEnd([char[]]@('\','/'))
if (-not $out.Equals($downloads,[StringComparison]::OrdinalIgnoreCase)) {throw 'B55_OUTPUT_DOWNLOADS_ONLY'}
if (-not (Test-Path -LiteralPath $root -PathType Container)) {throw 'B55_PROJECT_FOLDER_NOT_FOUND'}
if (-not (Test-Path -LiteralPath $out -PathType Container)) {throw 'B55_DOWNLOADS_NOT_FOUND'}
if ($out.Equals($root,[StringComparison]::OrdinalIgnoreCase) -or $out.StartsWith(($root+'\'),[StringComparison]::OrdinalIgnoreCase)) {throw 'B55_OUTPUT_IN_SOURCE_TREE'}
function Assert-NoLink([string]$p) {
 $q=[IO.Path]::GetFullPath($p)
 while($true) {
  if(Test-Path -LiteralPath $q) {
   if(((Get-Item -LiteralPath $q -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {throw 'B55_REPARSE_POINT_REFUSED'}
  }
  $up=[IO.Path]::GetDirectoryName($q)
  if([string]::IsNullOrEmpty($up) -or $up.Equals($q,[StringComparison]::OrdinalIgnoreCase)) {break}
  $q=$up
 }
}
Assert-NoLink $root
Assert-NoLink $out
$pkgPath=Join-Path $root 'package.json'
Assert-NoLink $pkgPath
if (-not (Test-Path -LiteralPath $pkgPath -PathType Leaf)) {throw 'B55_PACKAGE_JSON_MISSING'}
$pkg=Get-Content -LiteralPath $pkgPath -Raw -ErrorAction Stop | ConvertFrom-Json
if ($pkg.name -cne 'minecraft-ai-builder') {throw 'B55_PROJECT_ID_MISMATCH'}
$pins=[ordered]@{
 'engine/src/general-building-planner.js'='23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8'
 'engine/src/building-grammar.js'='71c0e2bda3e7a044285d681b38d9d4373e3c0aa417808a2f54c652d05ff47d1a'
 'engine/src/architectural-quality.js'='5cadf22d51867a18fd35f6e9ec2e1318732eca2f2e666d2cfc4b2b32cbede530'
 'modules/architectural-library.js'='19fa126051a687bfb5c5f6bdf199a6d42aa70b475d908dd38a99e9f354532eee'
 'styles/urban_japanese.json'='cefb23009e7a96f8d5900e44242c5fa426646be64c5391048f52e29506f1ceec'
}
$items=New-Object 'System.Collections.Generic.List[object]'
$contents=New-Object 'System.Collections.Generic.List[object]'
foreach ($key in $pins.Keys) {
 $file=Join-Path $root $key.Replace('/','\')
 Assert-NoLink $file
 $status='MISSING';$found=$null;$data=$null
 if(Test-Path -LiteralPath $file -PathType Leaf) {
  $before=Get-Item -LiteralPath $file
  if($before.Length -gt 2000000) { $status='OVERSIZE' }
  else {
   $data=[IO.File]::ReadAllBytes($file)
   $after=Get-Item -LiteralPath $file
   if($before.Length -ne $after.Length -or $before.LastWriteTimeUtc -ne $after.LastWriteTimeUtc) {throw 'B55_FILE_CHANGED_WHILE_READING'}
   $sha=[Security.Cryptography.SHA256]::Create()
   try {$found=([BitConverter]::ToString($sha.ComputeHash($data))).Replace('-','').ToLowerInvariant()} finally {$sha.Dispose()}
   if($found -eq $pins[$key]) {$status='PINNED_MATCH'} else {$status='VERSION_MISMATCH'}
   $contents.Add([pscustomobject]@{key=$key;bytes=$data})
  }
 }
 $items.Add([pscustomobject]@{key=$key;status=$status;expectedSha256=$pins[$key];observedSha256=$found})
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$name='MinecraftAIBuilder_B55_Readonly_SourceEvidence_'+(Get-Date -Format 'yyyyMMdd_HHmmss')+'_'+[guid]::NewGuid().ToString('N').Substring(0,8)+'.zip'
$destination=Join-Path $out $name
if(Test-Path -LiteralPath $destination) {throw 'B55_OUTPUT_ALREADY_EXISTS'}
$zip=[IO.Compression.ZipFile]::Open($destination,[IO.Compression.ZipArchiveMode]::Create)
try {
 foreach($item in $contents) {
  $entry=$zip.CreateEntry($item.key,[IO.Compression.CompressionLevel]::Optimal)
  $stream=$entry.Open()
  try { $stream.Write($item.bytes,0,$item.bytes.Length) } finally {$stream.Dispose()}
 }
 $metadata=[ordered]@{schema='minecraftaibuilder-b55-readonly-source-evidence-v1';intent='LOCAL_SOURCE_FILES_ONLY_NO_EXECUTION';projectIdentity='minecraft-ai-builder';sourceChecks=$items.ToArray();safety=[ordered]@{projectFilesModified=$false;gameAccess=$false;scans=0;executionAllowed=$false;buildOperations=0}}
 $json=($metadata|ConvertTo-Json -Depth 8)
 $bytes=[Text.UTF8Encoding]::new($false).GetBytes($json)
 $entry=$zip.CreateEntry('B55_CAPTURE_SUMMARY.json',[IO.Compression.CompressionLevel]::Optimal)
 $stream=$entry.Open()
 try { $stream.Write($bytes,0,$bytes.Length) } finally {$stream.Dispose()}
} finally {$zip.Dispose()}
Write-Host ('B55_SOURCE_EVIDENCE_ZIP '+$destination)
Write-Host ('FILES_COLLECTED '+$contents.Count+'/'+$pins.Count)
Write-Host 'READ_ONLY_NO_MINECRAFT_NO_NETWORK_NO_CONSTRUCTION_NOT_PREPARED'
Write-Host 'CHECK_THE_ZIP_FOR_SECRETS_BEFORE_SHARING. HASH_MATCH_IS_NOT_RUNTIME_PARITY.'

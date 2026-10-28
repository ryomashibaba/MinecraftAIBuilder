# Read-only R44 Windows stage path forensics. Never invokes a provider or launcher.
param([Parameter(Mandatory=$true)][string]$Base)
$ErrorActionPreference='Stop'
if(-not(Test-Path -LiteralPath $Base -PathType Container)){throw 'R44_STAGE_NOT_FOUND'}
$rawBase=$Base.TrimEnd('\')
$canonicalBase=(Get-Item -LiteralPath $Base).FullName.TrimEnd('\')
$files=@(Get-ChildItem -LiteralPath $Base -Recurse -File)
$old=@();$canonical=@();$unmapped=@()
foreach($item in $files){
 $full=$item.FullName
 $legacyRel=''
 if($full.Length -gt $rawBase.Length){
  $legacyRel=$full.Substring($rawBase.Length+1).Replace('\','/')
 }
 $prefix=$canonicalBase+'\'
 if(-not $full.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){
  $unmapped+=@{name=$item.Name;fullLength=$full.Length;baseLength=$canonicalBase.Length}
  continue
 }
 $canonicalRel=$full.Substring($prefix.Length).Replace('\','/')
 $old+=$legacyRel
 $canonical+=$canonicalRel
}
$oldMatch=@($old|Where-Object {$_ -ieq 'source/ai/b198s-native-ollama-source.mjs'})
$canonMatch=@($canonical|Where-Object {$_ -ieq 'source/ai/b198s-native-ollama-source.mjs'})
[ordered]@{
 schema='minecraftaibuilder-r44-windows-stage-path-v1'
 rawBaseLength=$rawBase.Length
 canonicalBaseLength=$canonicalBase.Length
 baseStringsIdentical=($rawBase -ceq $canonicalBase)
 enumeratedFiles=$files.Count
 parsedKeys=$canonical.Count
 legacyOverlayMatchCount=$oldMatch.Count
 canonicalOverlayMatchCount=$canonMatch.Count
 inconsistentKeys=@(for($i=0;$i -lt $old.Count;$i++){
  if($old[$i] -cne $canonical[$i]){
   @{legacy=$old[$i];canonical=$canonical[$i]}
  }
 })
 unmapped=@($unmapped)
 sourceChanged=$false;modelCalls=0;worldContacts=0;worldWrites=0
} | ConvertTo-Json -Depth 8

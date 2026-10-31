# R25 Work Local bootstrap: reconstruct a NEW source-pinned ZIP on the OMEN.
# This does not run real Qwen, Ollama, or Minecraft.
# Equivalent source files to the Chat R25 ZIP; archive bytes are NOT asserted
# to equal the original chat ZIP due to ZIP timestamps/line endings.
param([string]$DestinationRoot='')
$ErrorActionPreference='Stop'
$PinnedCommit='36cf8c95c93c10395ad982f6269c2afe6e96f221'
$Files=@(
 @{Name='INSTALL_R24_OFFLINE_ONLY.ps1';Blob='65c6b5308a1921629d0a656dd0b1c0e81cea621b'},
 @{Name='PREPARE_R24_OFFLINE_ONLY.cmd';Blob='1ce0680271b8ec159cfbb9871b87318e54810a3e'},
 @{Name='RUN_R24_ONCE_ONLY_AFTER_NEW_APPROVAL.ps1';Blob='67a5b8765658b7ccdde0b81d3a48ff2d438e89c3'},
 @{Name='RUN_R24_FUTURE_AFTER_NEW_APPROVAL.cmd';Blob='adb381e9465ca4edd408a82eb5029268bff3c1be'}
)
function ShaGitBlob([byte[]]$data){
 $prefix=[Text.Encoding]::ASCII.GetBytes('blob '+$data.Length+[char]0)
 $combined=New-Object byte[] ($prefix.Length+$data.Length)
 [Array]::Copy($prefix,0,$combined,0,$prefix.Length)
 [Array]::Copy($data,0,$combined,$prefix.Length,$data.Length)
 $sha=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($sha.ComputeHash($combined))).Replace('-','').ToLowerInvariant()}
 finally{$sha.Dispose()}
}
function Sha256([byte[]]$data){
 $sha=[Security.Cryptography.SHA256]::Create()
 try{return ([BitConverter]::ToString($sha.ComputeHash($data))).Replace('-','').ToLowerInvariant()}
 finally{$sha.Dispose()}
}
try{
 if(-not $DestinationRoot){
  if(-not $env:LOCALAPPDATA){throw 'R25_LOCALAPPDATA_REQUIRED'}
  $DestinationRoot=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder\R25_Work_Pickup'
 }
 if(-not [IO.Path]::IsPathRooted($DestinationRoot)){throw 'R25_ABSOLUTE_DESTINATION_REQUIRED'}
 $DestinationRoot=[IO.Path]::GetFullPath($DestinationRoot)
 [void](New-Item -ItemType Directory -Path $DestinationRoot -Force)
 $run='R25_Pinned_'+[guid]::NewGuid().ToString('N')
 $stage=Join-Path $DestinationRoot $run
 [void](New-Item -ItemType Directory -Path $stage -ErrorAction Stop)
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 $client=New-Object Net.WebClient
 $record=@()
 try{
  foreach($item in $Files){
   $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+
    $PinnedCommit+'/tools/r24-future/'+$item.Name
   $bytes=$client.DownloadData($url)
   if($bytes.Length -lt 100 -or $bytes.Length -gt 35000){throw 'R25_SOURCE_SIZE'}
   if((ShaGitBlob $bytes) -cne $item.Blob){throw ('R25_GIT_BLOB_MISMATCH_'+$item.Name)}
   $dest=Join-Path $stage $item.Name
   [IO.File]::WriteAllBytes($dest,$bytes)
   $record+=@{name=$item.Name;gitBlob=$item.Blob;sha256=(Sha256 $bytes);
    bytes=$bytes.Length;origin=$url}
  }
 }finally{$client.Dispose()}
 $manifest=[ordered]@{
  schema='minecraftaibuilder-r25-work-local-reconstructed-source-bundle-v1'
  sourceCommit=$PinnedCommit
  files=@($record)
  originalChatZipByteIdentical=$false
  originalChatZipSha256='cc5e4b6be887da160312bbaf917c3bf10114be9f0ce22ac59c40a5fa2b8ced53'
  originalChatZipComparisonPerformed=$false
  sourceFileBlobShaVerified=$true
  qwenModelRequests=0
  minecraftWorldContacts=0
  minecraftWorldWrites=0
  r17ApprovalReused=$false
  r25NewSingleLocalQwenConsentGivenInChat=$true
  r25ConsentConsumedByBootstrap=$false
  worldConstructionApproved=$false
  readiness='NOT_PREPARED'
  gates=@('BLOCKED','BLOCKED','BLOCKED','BLOCKED','BLOCKED',
   'BLOCKED','BLOCKED','BLOCKED','BLOCKED')
  BuildPlan=@{operations=@()}
 }
 [IO.File]::WriteAllText((Join-Path $stage 'R25_PINNED_SOURCE_MANIFEST.json'),
  (($manifest|ConvertTo-Json -Depth 8)+[Environment]::NewLine),
  (New-Object Text.UTF8Encoding($false)))
 $zip=Join-Path $DestinationRoot ($run+'_APPROVED_R25_SOURCE_ONLY.zip')
 if(Test-Path -LiteralPath $zip){throw 'R25_NEVER_OVERWRITE'}
 Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
 if(-not(Test-Path -LiteralPath $zip -PathType Leaf)){throw 'R25_ZIP_NOT_CREATED'}
 $zipBytes=[IO.File]::ReadAllBytes($zip)
 Write-Host '[R25] Pinned source files: 4/4 VERIFIED'
 Write-Host '[R25] Work bootstrap has made NO real model or Minecraft request.'
 Write-Host ('R25_WORK_ZIP_PATH='+$zip)
 Write-Host ('R25_WORK_ZIP_SHA256='+(Sha256 $zipBytes))
 Write-Host ('R25_WORK_MANIFEST_PATH='+(Join-Path $stage 'R25_PINNED_SOURCE_MANIFEST.json'))
 Write-Host '[R25] A NEW package was reconstructed from immutable GitHub blobs.'
 Write-Host '[R25] It is NOT byte-identical to the old Chat ZIP; do not compare whole ZIP hashes.'
 exit 0
}catch{
 Write-Host ('[R25 HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host '[SAFE] No Ollama POST or Minecraft world contact has been made by this bootstrap.'
 exit 1
}

# Tiny approved R20 starter: downloads FOUR SHA-pinned code files only.
# Each source is pinned to an immutable GitHub commit, verified against its
# git blob SHA1, and never updated in place. Never talks to a real model
# itself. PREPARE handles read-only tags, then asks the user to approve R17.
$ErrorActionPreference='Stop'
$Revision='647fda80a7dbdcdfdabcefb525f678a8fee6e29f'
$Expected=@(
 @{Path='tools/r20-approved-once/PREPARE_AND_START_APPROVED_ONCE.ps1';Name='PREPARE_AND_START_APPROVED_ONCE.ps1';Sha='14d4b84ee5f3f8bdeae4d7abbca86bfbba0b7065'},
 @{Path='tools/r16-mini/INSTALL_R16_MINI.ps1';Name='INSTALL_R16_MINI.ps1';Sha='8f4224bac2fc2fde9c5ac311052a5887174a9402'},
 @{Path='tools/r17-gated/RUN_R17_ONCE_AFTER_FRESH_APPROVAL.cmd';Name='RUN_R17_ONCE_AFTER_FRESH_APPROVAL.cmd';Sha='0b9abe4fd95baccc62bf38b7557409e8a3f15b98'},
 @{Path='tools/r17-gated/RUN_R17_ONCE_AFTER_FRESH_APPROVAL.ps1';Name='RUN_R17_ONCE_AFTER_FRESH_APPROVAL.ps1';Sha='bf16acada09ac9980be1a7c186ee8b3676192a7c'}
)
function GitBlobSha([byte[]]$bytes){
 $p=[Text.Encoding]::ASCII.GetBytes('blob '+$bytes.Length+[char]0)
 $all=New-Object byte[] ($p.Length+$bytes.Length)
 [Array]::Copy($p,0,$all,0,$p.Length)
 [Array]::Copy($bytes,0,$all,$p.Length,$bytes.Length)
 $sha=[Security.Cryptography.SHA1]::Create()
 try{return ([BitConverter]::ToString($sha.ComputeHash($all))).Replace('-','').ToLowerInvariant()}
 finally{$sha.Dispose()}
}
function Verify([string]$folder){
 foreach($item in $Expected){
  $f=Join-Path $folder $item.Name
  if(-not (Test-Path -LiteralPath $f -PathType Leaf)){throw 'PINNED_BOOTSTRAP_FILE_MISSING'}
  if((GitBlobSha ([IO.File]::ReadAllBytes($f))) -cne $item.Sha){
   throw 'PINNED_BOOTSTRAP_FILE_HASH_MISMATCH'
  }
 }
 if(@(Get-ChildItem -LiteralPath $folder -File).Count -ne $Expected.Count){
  throw 'UNEXPECTED_BOOTSTRAP_FILE'
 }
}
try{
 if(-not $env:LOCALAPPDATA){throw 'LOCALAPPDATA_MISSING'}
 $parent=Join-Path $env:LOCALAPPDATA 'MinecraftAIBuilder'
 [void](New-Item -ItemType Directory -Path $parent -Force)
 $target=Join-Path $parent ('R20_PinnedRunner_'+$Revision.Substring(0,12))
 if(Test-Path -LiteralPath $target){
  Verify $target
  Write-Host '[R20] Cached four-file runner verified.'
 }else{
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  $part=$target+'.part-'+[guid]::NewGuid().ToString('N')
  [void](New-Item -ItemType Directory -Path $part)
  try{
   $web=New-Object System.Net.WebClient
   try{
    foreach($item in $Expected){
     $url='https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/'+$Revision+'/'+$item.Path
     $bytes=$web.DownloadData($url)
     if($bytes.Length -lt 1 -or $bytes.Length -gt 30000){
      throw 'PINNED_BOOTSTRAP_FILE_TOO_LARGE'
     }
     if((GitBlobSha $bytes) -cne $item.Sha){
      throw 'PINNED_BOOTSTRAP_DOWNLOAD_HASH_MISMATCH'
     }
     [IO.File]::WriteAllBytes((Join-Path $part $item.Name),$bytes)
    }
   }finally{$web.Dispose()}
   Verify $part
   Move-Item -LiteralPath $part -Destination $target -ErrorAction Stop
  }catch{
   if(Test-Path -LiteralPath $part){
    Remove-Item -LiteralPath $part -Recurse -Force -ErrorAction SilentlyContinue
   }
   throw
  }
  Write-Host '[R20] Four exact pinned scripts fetched. Full repository ZIP not needed.'
 }
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $target 'PREPARE_AND_START_APPROVED_ONCE.ps1')
 exit $LASTEXITCODE
}catch{
 Write-Host ('[R20 HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host '[SAFE] No inference from bootstrap. No automatic retries.'
 exit 1
}

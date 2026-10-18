# B198X — Prepare a source-proven quality revision plan from a HUMAN
# B198W review, entirely offline. NEVER invokes Ollama or Minecraft.
[CmdletBinding()]
param(
 [string]$ReviewFile='',
 [string]$SourceFolder='',
 [string]$ProtectedElementIds='',
 [string]$SourceDirectory='',
 [string]$OutputDirectory=''
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
function Hold([string]$reason){throw "B198X_QUALITY_REVIEW_HOLD_$reason"}
try{
 Write-Host 'B198X OFFLINE HUMAN REVIEW -> NEXT REVISION DRAFT (NO LLM)' -ForegroundColor Cyan
 if(-not $SourceDirectory){Hold 'EXPLICIT_CACHED_ENGINE_REQUIRED'}
 $SourceDirectory=(Resolve-Path -LiteralPath $SourceDirectory).Path
 $program=Join-Path $SourceDirectory 'scripts\b198x-offline-review-to-revision.mjs'
 $verify=Join-Path $SourceDirectory 'scripts\b198v-cache-integrity.mjs'
 if(-not (Test-Path $program -PathType Leaf)){Hold 'B198X_ENGINE_NOT_INSTALLED'}
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){Hold 'NODE_MISSING'}
 # Integrity verification is performed by the .cmd launcher before calling
 # this script. When invoked directly from a versioned installation, seal
 # must also verify or no planning action is performed.
 $seal=Join-Path (Split-Path $SourceDirectory -Parent) 'B198V_OFFLINE_ENGINE_SEAL.json'
 if(Test-Path -LiteralPath $seal){
  & node $verify '--verify' $SourceDirectory
  if($LASTEXITCODE -ne 0){Hold 'MODIFIED_ENGINE'}
 }
 if(-not $ReviewFile){$ReviewFile=Read-Host 'B198Wで保存した評価JSONのフルパスを入力'}
 $ReviewFile=$ReviewFile.Trim('"')
 if(-not (Test-Path -LiteralPath $ReviewFile -PathType Leaf)){
  Hold 'HUMAN_RATING_FILE_NOT_FOUND'
 }
 $review=Get-Content -LiteralPath $ReviewFile -Raw -Encoding UTF8 | ConvertFrom-Json
 if($review.schema -ne 'minecraftaibuilder-b198w-human-source-rating-v1' -or
  $review.sourceSha256 -notmatch '^[a-f0-9]{64}$'){
  Hold 'INVALID_OR_MISSING_HUMAN_RATING_SHA'
 }
 $docs=[Environment]::GetFolderPath('MyDocuments')
 if(-not $docs){$docs=$env:USERPROFILE}
 if(-not $SourceFolder){
  $results=Join-Path $docs 'MinecraftAIBuilder-B198M'
  if(-not (Test-Path -LiteralPath $results)){Hold 'NO_SAVED_B198W_SOURCE_YET'}
  $candidates=@(Get-ChildItem -LiteralPath $results -File -Recurse -ErrorAction SilentlyContinue |
   Where-Object { $_.Name -eq 'B198W_SOURCE_QUALITY_EVIDENCE.json' -or
                   $_.Name -eq 'c01_B198W_SOURCE_QUALITY_EVIDENCE.json' } |
   Sort-Object LastWriteTime -Descending)
  foreach($candidate in $candidates){
   $data=Get-Content -LiteralPath $candidate.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
   if($data.independentlyCompiled.sourceSha256 -eq $review.sourceSha256){
    $parent=Split-Path $candidate.FullName -Parent
    if((Test-Path -LiteralPath (Join-Path $parent 'c01_source-design.json')) -or
       (Test-Path -LiteralPath (Join-Path $parent 'source-design.json'))){
     $SourceFolder=$parent;break
    }
   }
  }
  if(-not $SourceFolder){Hold 'NO_EXACT_SHA_MATCHING_SAVED_MODEL_SOURCE'}
 }
 $SourceFolder=(Resolve-Path -LiteralPath $SourceFolder).Path
 if(-not $OutputDirectory){
  $outParent=Join-Path $docs 'MinecraftAIBuilder-B198M\quality-revisions'
  New-Item -ItemType Directory -Force -Path $outParent | Out-Null
  $OutputDirectory=Join-Path $outParent ('review-'+[guid]::NewGuid().ToString('N'))
 }
 if(Test-Path -LiteralPath $OutputDirectory){Hold 'REFUSE_TO_OVERWRITE_OLD_REVIEW'}
 if(-not (Test-Path -LiteralPath (Split-Path $OutputDirectory -Parent))){
  Hold 'OUTPUT_PARENT_REQUIRED'
 }
 $args=@('scripts/b198x-offline-review-to-revision.mjs',
  '--folder',$SourceFolder,'--review',$ReviewFile,'--out',$OutputDirectory)
 if($ProtectedElementIds){
  $args+=@('--protect',$ProtectedElementIds)
 }
 $old=Get-Location
 try{
  Set-Location -LiteralPath $SourceDirectory
  & node @args
  if($LASTEXITCODE -ne 0){Hold 'INVALID_REVIEW_OR_STALE_SOURCE'}
 }finally{Set-Location -LiteralPath $old}
 $sum=Get-Content -LiteralPath (Join-Path $OutputDirectory 'B198X_RUN_SUMMARY.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 $outRoot=Split-Path $OutputDirectory -Parent
 $archive=Join-Path $outRoot ('B198X_UPLOAD_THIS_QUALITY_PLAN_'+[guid]::NewGuid().ToString('N')+'.zip')
 Compress-Archive -Path (Join-Path $OutputDirectory '*') -DestinationPath $archive -CompressionLevel Optimal -ErrorAction Stop
 Write-Host ('B198X_QUALITY_PLAN_FINISHED {0}' -f $sum.status) -ForegroundColor Green
 Write-Host 'LLM requests: 0 / Minecraft world writes: 0'
 if($sum.humanProtectionSelectionRequired){
  Write-Host 'Source-preservation IDs have not been explicitly selected; this is a draft ONLY.' -ForegroundColor Yellow
 }
 Write-Host "Upload to ChatGPT: $archive"
}catch{
 Write-Host ('B198X_QUALITY_PLAN_FINISHED HOLD: {0}' -f $_.Exception.Message) -ForegroundColor Yellow
 exit 1
}

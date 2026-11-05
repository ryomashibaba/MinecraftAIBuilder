#Requires -Version 5.1
<#
 Review the SAVED original Qwen14B V6 PRIVATE proposal.
 No Ollama call or new model text. No public source upload.
 One explicit invocation: --qa-existing reuses already saved model candidate,
 checks its digest and lineage, then network-none Docker QA if available.
 Missing Docker preserves saved proposal; no automatic install or retry.
#>
[CmdletBinding()]
param([switch]$InspectOnly,[switch]$CiSelfTest)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if ($CiSelfTest) {Write-Host 'DEC_REUSE_V6_SAVED_PRIVATE_SOURCE_NO_MODEL_STATIC'; return}
if (-not $env:LOCALAPPDATA) {throw 'LOCALAPPDATA_REQUIRED'}
foreach($cmd in @('git','python')) {
 if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
  throw ('MISSING_COMMAND_'+$cmd+'_NO_AUTO_INSTALL')
 }
}
$repo='ryomashibaba/MinecraftAIBuilder'
$revision='0544361ad70a41ba899fdb6a281e76d2e65f038b'
$items=@(
 @{Name='review_saved_v6_private.py';Blob='bc83afd67bdec1fbd4b9798f389c7a8503598498'},
 @{Name='dec_current_v6_private.py';Blob='d4790ecd626c7606ce3641de4a01fc8e326b1571'},
 @{Name='prepare_pinned_real_project.py';Blob='ce4d56452ec0a1d513dfa419a80780eed1283894'},
 @{Name='local_ollama_patch_loop.py';Blob='f063712259f67deaa0c0d8017b06e75299075514'},
 @{Name='docker_sandbox.py';Blob='20b6817b1e50c99435cdb29a13beafdb4fbcf4dd'},
 @{Name='solo_agent.py';Blob='c97ee68936516a99b95e143e014b72ece0a22e0d'},
 @{Name='local_ollama_real_probe.py';Blob='a793ae298d5ecf35330c01d336266eea313b6132'},
 @{Name='REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json';Blob='45c51152eff0c12e0deb7f213a04c78bdc2ae41a'}
)
$base=Join-Path $env:LOCALAPPDATA ('FreeAutonomyPrivate\DecV6SavedReviewBootstrap\'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $base | Out-Null
foreach($item in $items) {
 $dest=Join-Path $base $item.Name
 $url='https://raw.githubusercontent.com/'+$repo+'/'+$revision+'/tools/free-autonomy-solo/'+$item.Name
 Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dest
 $hash=((& git hash-object --no-filters $dest)|Out-String).Trim()
 if($LASTEXITCODE -ne 0 -or $hash -cne $item.Blob) {
   throw ('DEC_EXISTING_V6_SOURCE_BLOB_MISMATCH_'+$item.Name)
 }
}
Write-Host 'REVIEW_SAVED_V6_SOURCE_BLOBS_PASS'
Write-Host 'MODEL_CALLS=0; ORIGINAL_AND_GITHUB_WRITES=0; PAID_API=0'
$pyArgs=@('--qa-existing')
if($InspectOnly){$pyArgs=@()}
$lines=@(& python (Join-Path $base 'review_saved_v6_private.py') @pyArgs 2>&1)
$rc=$LASTEXITCODE
$lines|ForEach-Object {Write-Host ([string]$_)}
$reports=@($lines|Where-Object {([string]$_).StartsWith('PRIVATE_SHAREABLE_RESULT_PATH=')})
if($reports.Count -eq 1) {
 $p=([string]$reports[0]).Substring('PRIVATE_SHAREABLE_RESULT_PATH='.Length)
 if(Test-Path -LiteralPath $p -PathType Leaf) {
  try {Start-Process explorer.exe -ArgumentList ('/select,"'+$p+'"') -ErrorAction Stop|Out-Null}
  catch {Write-Host ('SHARE_ONLY_SAFE_JSON='+$p)}
 }
}
if($rc -ne 0){throw 'DEC_REUSE_EXISTING_PRIVATE_CANDIDATE_HOLD_SEE_SHAREABLE_RESULT'}
Write-Host 'PRIVATE_ONLY_SOURCE_CHECK_FINISHED_NO_ART_OR_GAME_CERTIFICATION'

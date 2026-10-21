# R53 repairs R52 offline future one-shot ZIP helper.
# NO model request, Ollama, Minecraft, world read, or world write.
# Only runs after a separately approved future one-shot model capture.
param(
 [Parameter(Mandatory=$true)][string]$EvidenceDir,
 [Parameter(Mandatory=$true)][string]$SourceRoot,
 [Parameter(Mandatory=$true)][string]$ZipOutput
)
$ErrorActionPreference='Stop'
try {
 $e=[IO.Path]::GetFullPath($EvidenceDir)
 $src=[IO.Path]::GetFullPath($SourceRoot)
 $dest=[IO.Path]::GetFullPath($ZipOutput)
 $runner=Join-Path $src 'scripts\b198zr52-postcapture-auto-storyboard.mjs'
 if(-not (Test-Path -LiteralPath $e -PathType Container)) {
  throw 'EVIDENCE_DIRECTORY_NOT_FOUND'
 }
 if(-not (Test-Path -LiteralPath $runner -PathType Leaf)) {
  throw 'PINNED_R52_RUNNER_NOT_FOUND'
 }
 if([IO.Path]::GetExtension($dest).ToLowerInvariant() -ne '.zip') {
  throw 'ZIP_EXTENSION_REQUIRED'
 }
 if((Test-Path -LiteralPath $dest) -or
  -not (Test-Path -LiteralPath (Split-Path -Parent $dest) -PathType Container) -or
  $dest.StartsWith(($e.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar),
   [StringComparison]::OrdinalIgnoreCase)) {
  throw 'ZIP_MUST_BE_NEW_AND_OUTSIDE_EVIDENCE_FOLDER'
 }
 # No original? A failed transport still deserves ONE evidence ZIP.
 # If any original exists, all capture SHA links must match or no ZIP is made.
 $rawFiles=@(Get-ChildItem -LiteralPath $e -File |
  Where-Object { $_.Name -match '^R[0-9]+_ORIGINAL_MODEL_RESPONSE_UNMODIFIED[.]txt$' })
 if($rawFiles.Count -eq 0) {
  $logs=@(Get-ChildItem -LiteralPath $e -File)
  if($logs.Count -eq 0) { throw 'NO_CAPTURE_OR_EARLY_FAILURE_EVIDENCE' }
  Write-Host '[R52] No raw model response; packaging existing early-failure evidence WITHOUT diagram.'
 } else {
  # Fail closed if raw source differs from either capture/manifest/audit.
  # Never regenerate source or auto-retry inference.
  & node $runner --evidence-dir $e
  if($LASTEXITCODE -ne 0) { throw 'R52_DIAGNOSTIC_SHA_OR_SOURCE_HOLD' }
 }
 Compress-Archive -LiteralPath $e -DestinationPath $dest -CompressionLevel Optimal -ErrorAction Stop
 if(-not (Test-Path -LiteralPath $dest -PathType Leaf)) {
  throw 'R52_ARCHIVE_NOT_WRITTEN'
 }
 Write-Host ('R52_UPLOAD_THIS_RESULT_ZIP='+$dest)
 Write-Host '[R52] R51 storyboard included if strict B143 compiler failed.'
 Write-Host '[R52] Model request 0, world read/write 0, no retry.'
 exit 0
} catch {
 Write-Host ('[R52 ZIP HOLD] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host '[R52] Captured model original and previous ZIPs have not been rewritten.'
 exit 1
}

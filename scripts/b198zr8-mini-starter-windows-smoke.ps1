# Windows PowerShell 5.1 smoke of the EXACT uploaded MINI ZIP installer.
# The two tracked scripts' Git-blob hashes equal the attached ZIP members.
# Never launches Ollama, model inference, or Minecraft.
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$launcher=Join-Path $root 'tools\r8-mini\SETUP_R8_MINI.cmd'
$installer=Join-Path $root 'tools\r8-mini\INSTALL_R8_MINI.ps1'
if (-not (Test-Path $launcher) -or -not (Test-Path $installer)) { throw 'Missing starter scripts' }
$expected=@{
 'SETUP_R8_MINI.cmd'='60158b38ecd15378f169ba07c832758434fc0081f00780cc85ab662f3b2fe49d';
 'INSTALL_R8_MINI.ps1'='aac14c5d42650552ea8aa8d977ad6b6458b05c12998db59fc5a204cc45e7e51e'
}
foreach($p in @($launcher,$installer)){
 $expectedHash=$expected[[IO.Path]::GetFileName($p)]
 $hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $p).Hash.ToLowerInvariant()
 if ($hash -ne $expectedHash) { throw ('Installer does not match attached ZIP member: ' + $p) }
}
$checkOutput=& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -CheckOnly 2>&1 | Out-String
if ($LASTEXITCODE -ne 0 -or -not $checkOutput.Contains('20 pinned files')) {
 throw ('CheckOnly failed: ' + $checkOutput)
}
$temp=Join-Path $env:RUNNER_TEMP ('r8-mini-installer-smoke-'+[guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $temp)
$previous=$env:LOCALAPPDATA
$env:LOCALAPPDATA=$temp
$target=Join-Path $temp 'MinecraftAIBuilder\R8_Mini_4fe41899ce52'
try {
 # Run the user's real CMD with stdin piped to its "pause" prompt.
 $output=('' | & $launcher 2>&1 | Out-String)
 if ($LASTEXITCODE -ne 0 -or -not $output.Contains('[DONE]')) {
  throw ('Windows CMD failed: '+$output)
 }
 $actual=@(Get-ChildItem -LiteralPath $target -Recurse -File)
 if ($actual.Count -ne 20) { throw ('Installed file count should be 20, got '+$actual.Count) }
 if (-not (Test-Path (Join-Path $target 'scripts\RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd'))) {
  throw 'Missing launch script in installed source'
 }
 # Every previously downloaded byte must be verified on a repeat install.
 $again=& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer 2>&1 | Out-String
 if ($LASTEXITCODE -ne 0 -or -not $again.Contains('integrity VERIFIED')) {
  throw ('Second install/revalidation failed: '+$again)
 }
 # Tamper must be rejected, never silently overwritten.
 $tampered=Join-Path $target 'source\ai\b143-building-dsl.mjs'
 [IO.File]::AppendAllText($tampered,'INVALID EXTRA BYTE')
 # Native stderr from an intentionally failing child should be captured,
 # not elevated by THIS smoke test's $ErrorActionPreference='Stop'.
 $previousAction=$ErrorActionPreference
 try {
  $ErrorActionPreference='Continue'
  $tamperOutput=(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer 2>&1 | Out-String)
  $tamperExit=$LASTEXITCODE
 }finally{ $ErrorActionPreference=$previousAction }
 if ($tamperExit -eq 0 -or -not $tamperOutput.Contains('Integrity mismatch')) {
  throw ('Tampering was not blocked: '+$tamperOutput)
 }
 Write-Host 'R8_MINI_REAL_WINDOWS_INSTALL_PASS'
 Write-Host 'Same ZIP bytes, 20 installed source files, no inference, idempotent verification, tampering rejected.'
}finally{
 $env:LOCALAPPDATA=$previous
 if (Test-Path $temp) { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue }
}

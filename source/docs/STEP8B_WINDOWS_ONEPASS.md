# Step8B — Windows one-pass B1 source acquisition

**Windows operation: one PowerShell paste. Minecraft does not need to be running.**

This step is needed to check **your current installed source**, which is absent from the handoff. The separate B0 tests run in the isolated package and cannot establish compatibility of your real Windows engine. This collector has only file-read, hash, TEMP staging and ZIP-output operations. It does not call Node, Minecraft, Bridge, pack generators or the building engine. The **source in its ZIP may still contain secrets**. You must inspect before uploading.

Run in PowerShell (not admin) after downloading this *integrated* handoff ZIP into Downloads. This fast path extracts **only the collector script**, not the large nested history ZIPs:

```powershell
$ErrorActionPreference = 'Stop'
$z = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter 'MinecraftAIBuilder_Step8B_B0_Integrated_Handoff_*.zip' -File |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $z) { throw 'STEP8B_ZIP_NOT_FOUND_IN_DOWNLOADS' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$scriptFile = Join-Path $env:TEMP ('Step8B_ReadOnlyCollector_' + [guid]::NewGuid().ToString('N') + '.ps1')
$archive = $null
try {
  $archive = [System.IO.Compression.ZipFile]::OpenRead($z.FullName)
  $entry = $archive.GetEntry('tools/CREATE_WINDOWS_SOURCE_SNAPSHOT.ps1')
  if (-not $entry) { throw 'STEP8B_COLLECTOR_NOT_IN_ZIP' }
  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $scriptFile)
  $archive.Dispose(); $archive = $null
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptFile
  if ($LASTEXITCODE -ne 0) { throw 'STEP8B_READONLY_SNAPSHOT_BLOCKED' }
} finally {
  if ($archive) { $archive.Dispose() }
  if (Test-Path -LiteralPath $scriptFile) { Remove-Item -LiteralPath $scriptFile -Force }
}
```

The collector defaults to `Documents\MinecraftAIBuilder`, already observed in prior Step7S Windows logs, and requires a recognizable `package.json` and `scripts\step7r-qa.js`. If your root moved, do **not** copy or reinstall anything: add `-ProjectRoot 'C:\actual\project\root'` after `$scriptFile` on the collector invocation line above. It creates `MinecraftAIBuilder_Step7S_Windows_SourceSnapshot_*.zip` in Downloads. **This filename is historical schema compatibility, not a new Step7S test**.

Before sharing the output: review filenames and source text for hard-coded keys/passwords/token strings, private addresses, server URLs or personal details; if unsure, stop and ask how to safely redact. The collector excludes `.env`, `config`, `work`, `logs`, `worlds`, `node_modules`, `.git` and oversized files. Omission causes Step8B compatibility status to remain UNKNOWN. It collects source from `scripts`, `tests`, `bridge/src`, `engine`, `modules`, `mcp`, `palettes`, `styles`, `docs`, `catalog` and basic package metadata only. Project data and protected/frozen assets are never modified.

**Upload only the newly created Windows SourceSnapshot ZIP**, not world files, evidence, or existing scan packs. Windows-side collection has not been performed by ChatGPT and is not a passing compatibility test.

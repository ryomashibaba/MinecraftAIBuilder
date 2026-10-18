# B198O — Actual Windows PowerShell 5.1 ZIP extraction blocker

## User's reproduced failure

Two different **already installed** Ollama models, `gemma4:26b` and `qwen3.8:27b`, both reached `Downloading separate GitHub SOURCE snapshot...` before throwing:

```text
B198M_TEST_FINISHED HOLD: 型 [System.IO.Compression.ZipFile] が見つかりません。
```

This proves that model selection was not the cause. Ollama enumeration and local model ID selection already worked. No real model source generation started and **no upload result ZIP was produced**.

## Actual fix

The B198N launcher called `[System.IO.Compression.ZipFile]::ExtractToDirectory(...)`, a .NET type not automatically loaded in all Windows PowerShell 5.1 environments. B198O replaces that with native PS5.1 `Expand-Archive -LiteralPath ... -DestinationPath ... -ErrorAction Stop`.

Do not use old B198M/B198N script URLs. Re-download the B198O script:

```powershell
$p = Join-Path $env:TEMP 'B198M_RUN_LOCAL.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/feature/b198o-powershell51-zip-extraction/tools/B198M_RUN_LOCAL.ps1' -OutFile $p
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p
```

When it lists the user's installed Ollama models, **number 3 `qwen3.8:27b` is a reasonable first pilot choice** for structured JSON architecture source. The recommendation is not a measured quality comparison; `gemma4:26b` may be tested on the same task afterwards. All actual model quality remains unverified.

## Reproduced actual Windows 5.1 end-to-end test

Unlike B198N's CI, the B198O workflow deliberately **omits** `-SourceDirectory`; it downloads the real GitHub archive, executes `Expand-Archive` via `powershell.exe`, and then runs original-vs-directed source generation through a deterministic loopback mock server. The CI asserts independently compiled source SHA, summary and final upload ZIP output. The mock has no live model intelligence; CI pass cannot certify the real Qwen/Gemma output.

After a truly successful local model run, the launcher prints the exact ZIP path starting with `Upload to ChatGPT:`. By default it is in the active Windows Documents folder under `MinecraftAIBuilder-B198M\pilot-...\B198M_UPLOAD_THIS_RESULT.zip`, not directly in `C:\windows\System32` or the current terminal directory.

No Minecraft world writes, paid API, Work, changes to historic architecture or main merge.

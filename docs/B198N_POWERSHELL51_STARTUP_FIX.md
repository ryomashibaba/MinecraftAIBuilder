# B198N — Windows PowerShell 5.1 startup hotfix

User-reported first run:
```
process.versions.node.split(.)[0]
SyntaxError: Unexpected token '.'
Node.js v24.18.1
B198M_TEST_FINISHED HOLD: B198M_HOLD_NODE_22_PLUS_REQUIRED
```

## Verified cause

B198M used `node -p 'process.versions.node.split(".")[0]'`. Windows PowerShell 5.1 strips the nested double quotes when passing the expression to a native executable, yielding `split(.)`. Node.js v24.18.1 is already supported: upgrading Node is **not** the fix. Earlier B198M CI validated modern `pwsh` 7, not this older Windows PowerShell 5.1 invocation.

## Repair

The B198N launcher uses a plain native command `node --version`, then parses the returned text **inside PowerShell** using `^v([0-9]+)\.` and rejects unsupported versions cleanly. This avoids the native argument quoting issue. It retains existing Model, Endpoint, Pilot, Full and Preflight options and still permits only localhost model inference.

## Retry in Windows PowerShell

```powershell
$p = Join-Path $env:TEMP 'B198M_RUN_LOCAL.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/feature/b198n-windows-powershell51-hotfix/tools/B198M_RUN_LOCAL.ps1' -OutFile $p
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p
```

Ollama must be running locally and have at least one installed, compatible model for the default auto-selection. If not, the script prints a specific HOLD rather than inventing a model. A working local model will be invoked explicitly when this Pilot mode runs; the model's Japanese comprehension and architectural quality are **not yet verified**.

The ZIP is normally located in the user's Windows Documents folder: `<Documents>\MinecraftAIBuilder-B198M\pilot-YYYYMMDD-HHMMSS-XXXXXX\B198M_UPLOAD_THIS_RESULT.zip`. The script prints its **exact** real path as `Upload to ChatGPT: ...` after success.

The reported original failure happened **before a result directory or ZIP was generated**.

This branch stacks on B198M #115 without editing it. `main`, older source assets and Minecraft worlds are unchanged.

## New regression test

`.github/workflows/b198n-powershell51.yml` invokes the launcher with the actual Windows `powershell.exe` (not just `pwsh`), first in `Preflight`, then against a strictly local, visibly labeled **MOCK** model transport server, checking creation of the expected ZIP, recompiled source pair and world safety. This is compatibility evidence, **not** proof of real LLM output or aesthetic quality.

No paid API, Work, Minecraft world contact/write, or main merge. Source safety remains `NOT_PREPARED`, nine `BLOCKED`.

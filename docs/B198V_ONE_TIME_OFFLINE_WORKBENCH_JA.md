# B198V — persistent offline source workbench: quality-preserving, minimal Windows operations

## Motivation and verified B198U base

B198U Draft #123 already stores the FULL unmodified local model response, corrects strictly bounded metadata and declared bounds without rewriting model-authored geometry, and supports offline B143 revalidation with ZERO local LLM calls. All B198U inherited source CI passed 127 tests and Windows PowerShell 5.1 replay after stopping its mock provider.

The remaining waste is operational: `tools/B198M_RUN_LOCAL.ps1 -Mode ReplayLatest` still fetches and expands the entire versioned GitHub source ZIP each time unless the user supplies `-SourceDirectory`. The user also had to copy PowerShell commands and find ZIPs repeatedly. B198V removes **repeated source downloading**, the need to type CLI commands each time, and ambiguity about whether a command will run an expensive local LLM.

## New B198V workbench

- One-time `tools/B198V_INSTALL_OFFLINE.ps1` installer, designed for stock Windows PowerShell 5.1 and Node.js >=22. It downloads the selected B198V branch from GitHub **once**, copies the source tree to a new versioned user Documents folder, and refuses to overwrite an existing workbench.
- Seals all cached files (relative path, byte count, SHA-256) with `scripts/b198v-cache-integrity.mjs`; re-verifies them before each shortcut execution. This provides **accidental stale/tampered file detection**, not a cryptographic defense against a malicious actor able to edit both the local verifier and its seal. It refuses symlinks in the cached engine.
- Shortcut `REPLAY_LATEST_OFFLINE.cmd`: **zero Ollama/API calls and no GitHub source downloads**. Replays the latest saved B198U source through deterministic B143 validation, geometry integrity and HTML 3D preview; output stays a separate timestamped run in `Documents/MinecraftAIBuilder-B198M` and new review ZIP. The shortcut can also accept optional `-ReplaySourceFile` and `-OutputDirectory` CLI arguments.
- Shortcut `RUN_ONE_REAL_MODEL_ONCE.cmd`: created only when an explicit local `-Model` ID is provided to the one-time installer; one controlled `-Mode SourceProbe`, no source download, native `127.0.0.1` Ollama only. **This calls the user's real local model and may take minutes.** Never execute automatically when replaying or installing.
- Two shortcuts are deliberately separated; no scheduler, silent auto inference, repository merge, Minecraft world contact or block writes.
- A second invocation of the installer validates the existing cache and **does not re-download or overwrite it**. Updates/new phases require explicit installation of a new version; no silent software update.

### One-time user setup (does NOT run Qwen or install a model)

```powershell
$p = Join-Path $env:TEMP 'B198V_INSTALL_OFFLINE.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/feature/b198v-persistent-offline-workbench/tools/B198V_INSTALL_OFFLINE.ps1' -OutFile $p
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p -Model 'qwen3.8:27b'
```

Upon success, script prints the actual full paths under Windows Documents:

- `MinecraftAIBuilder-B198V/offline-workbench-v1/REPLAY_LATEST_OFFLINE.cmd` — double-click **offline revalidation**, zero model calls.
- `MinecraftAIBuilder-B198V/offline-workbench-v1/RUN_ONE_REAL_MODEL_ONCE.cmd` — double-click only when genuinely **requesting a new locally model-authored architecture**.

Both default to the existing B198U user Documents results folder, refuse overwriting old evidence, and print exact result ZIP paths. New output is never automatically uploaded to external services. The offline replay shortcut requires a B198U-or-later raw source file, so it will legitimately HOLD until the first real source proposal has been captured. The older B198T ZIP, which omitted its raw response, cannot be recovered from summary hashes.

## Implementation and rigor

- `scripts/b198v-cache-integrity.mjs`: deterministic seal and verification of all regular source tree files, reject new/changed/missing code, symlinks, `.git`, `node_modules`, incomplete snapshots and out-of-range file count. Strictly zero network/model/world operations.
- `tools/B198V_INSTALL_OFFLINE.ps1`: staged new-only source copy; on error only the newly created installer staging directory is removed, not previous kits or model results. Validates source existence and SHA integrity before exposing the shortcuts.
- The inherited Windows launcher on the B198V branch remains **unchanged in source-only behavior**, apart from its GitHub default branch pin; both shortcuts explicitly supply the cached `-SourceDirectory` and therefore skip all GitHub downloads.
- CI exercises an actual Windows PowerShell 5.1 installation with real GitHub archive, verifies a second no-download install, executes the optional source shortcut once against a **deterministic NON-LLM Ollama HTTP mock**, stops the mock, then double-click-equivalent CMD offline replay, verifies matching independent B143 source SHA, zero model calls and viewer ZIP, and verifies an intentionally modified cached engine is BLOCKED.
- The fixture is only a transport/validation test double. Actual Qwen quality and real inference speed in B198V are NOT measured or certified.
- All previous B198A–U regression tests run on Ubuntu. No default new model call or automatic geometry changes.

## Continuation gates

**Gate 1 (B198V now):** installer and both shortcuts pass Windows PS5.1, no Minecraft writes, SHA seal, source provenance. **Gate 2 (future, optional user action):** generate just ONE actual new Qwen source through explicit `RUN_ONE_REAL_MODEL_ONCE.cmd`; upload the result ZIP (even on HOLD, raw source is retained). **Gate 3:** source and screenshot/3D review in Chat, offline repair before any new model call. **Gate 4:** only after independent B143 validity and visual quality evidence, discuss geometry-driven model-guided iteration. No merge into main or world construction without approval.

## Policy/efficiency audit

| Item | Assessment |
|---|---|
| Design policy | Preserved: language model authors original free-form geometry, B143 remains strict, no preset building substitution |
| Planning | B198U keeps generated source; B198V makes cheap replay practical via persistent verified source; next step is actual visual review, not more infrastructure loops |
| Efficiency | First source download/install happens once; subsequent double-click offline replays require zero inference and no code downloads. Real new source is a separate explicit shortcut |
| Quality | No automatic aesthetic PASS. Human review, checksums, topology and strict compiler remain required |
| Security | Work not used, no paid API, no model installation, no Minecraft/world writes, all nine safety gates BLOCKED / NOT_PREPARED |

Success in mocked CI does **not** imply actual model-authored architecture success. B198V is a workflow-reduction phase, not a claim that 27B produces a better building.

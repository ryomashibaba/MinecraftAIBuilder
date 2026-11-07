# MinecraftAIBuilder B198Z — R12 MINI 22-file source-only Windows package
2026-10-19 / PR #128 / User approved only preparation and synthetic QA; previously authorized R6 Qwen one-run has already been consumed

## Scope
- R9 compact `staircase`, R10 generic `repeat`, and opt-in R11 compact JSON profile are all included in the pinned **local source** package.
- Distribution is intentionally **INSTALL + OFFLINE QA ONLY**. It does NOT include the user-friendly old `RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd` model-generation launch file. The source-only R6 review library is included for compatibility but SETUP and OFFLINE QA never call the provider.
- User operation is **one double click** on `SETUP_R12_MINI.cmd` after unzipping a three-file mini starter. The installer requires Node.js, uses Windows PowerShell 5.1-compatible code, downloads only 22 fixed GitHub source files over TLS from raw.githubusercontent.com, verifies every Git blob SHA-1 and complete path set, and then runs local synthetic R9+R10+R11 QA. It also launches Explorer only for interactive Windows (not CI).
- No expensive real `qwen3.8:27b` call, no Ollama `GET /api/tags`, no native POST, no automatic model downloads, no Minecraft reads or writes. Any future real Qwen generation needs **new explicit user consent**.

## Delivered artifact
`MinecraftAIBuilder_R12_MINI_OFFLINE_20261019.zip`
- ZIP: **4,750 bytes**, SHA-256 **`0f2e9ad3c728704b3cc98fd5555c794d93fed1f2ccd94a71e35c6bd690c52a2d`**
- Exactly three files, ZIP CRC/decompression PASS:
  - `SETUP_R12_MINI.cmd` — 941 bytes, verified Git blob `bfbb4ffa978be22a7f3a3524db26265e583653c9`
  - `INSTALL_R12_MINI.ps1` — 6,226 bytes, verified Git blob `8456b7e6f16cf40b9df41aac6a79d3ebe3c9db95`
  - `README_FIRST_JA.txt` — 1,793 UTF-8 bytes, verified Git blob `9b743f33417c1881dab8f3919031c9813fc36973`
- The exact three script/docs versions are tracked under `tools/r12-mini/`, byte-for-byte the same as the user's archive. **No source scripts are altered when packaged**.
- Immutable source pin: commit **`0e40f08e4bfd95867a18a099903a6e2c52be2d31`**, 22 expected source files total ≈160,227 bytes before any compression. All 22 paths and declared SHA-1 hashes matched the GitHub commit's actual recursive Git tree. It deliberately does not track the much larger 1,800+ files in the whole repository.

## Real Windows test
- Source: `scripts/b198zr12-windows-installer-smoke.ps1`
- Workflow: `.github/workflows/r12-mini-offline-windows.yml`, job `actual-windows-mini-offline-only` on Windows-latest + Node 24 + PowerShell 5.1.
- The real `SETUP_R12_MINI.cmd` downloads actual immutable source files and checks all 22 hashes (not just mocks); the installed `scripts/b198zr12-local-offline-qa.mjs` compiles a clearly synthetic R9 staircase and R10 columns using the real B143 compiler, checks material/voxel parity, route viability with the independent R3 evaluator, inspects R11 complete JSON, checks the guide SHA, creates an inert native bridge and asserts request trace length 0.
- Reinstallation in an unchanged folder verifies hashes and reruns the synthetic QA; forced local file alteration yields explicit `Integrity mismatch` and HOLD without covertly overwriting or inferring Qwen results. The model-generation launcher is asserted absent.
- CI on **HEAD `22679a94eb6deaed74173ed39ee9e12f50a4fff7`** reported two successful `actual-windows-mini-offline-only` jobs with zero failures for these tests.

## Important remaining uncertainty and safety
- GitHub Actions tested a Windows runner, NOT the user's personal OMEN PC or its Ollama installation.
- The separate R11 profile is an optional design-output instruction, and cannot guarantee successful 4-key JSON completion or aesthetic quality on actual Qwen. Until explicit approval, user should run **only this setup and synthetic test**.
- Abstract voxel route PASS does **NOT** equal actual Minecraft stairs/avatar walking PASS.
- **NOT_PREPARED, nine BLOCKED, BuildPlan.operations=[], worldContacts/worldWrites=0** stay frozen. No merges to main, changes to c01 real-model original, B99/B100 freeze, or live worlds.

# B198M — One-run real local-model architecture quality pilot

## Goal and continuity

B198K already implemented direct-vs-directed 12-creation+4-revision source-backed A/B evaluation. B198L improved conservatively verified source-level floor-step connectivity. However, the central unanswered question remains **how an actual local model handles arbitrary Japanese architecture instructions and whether the resulting buildings are aesthetically and functionally better**. All B198G–L CI model generation was test-double-backed. Do not claim that quality was measured.

B198M adds a genuine opt-in, one-command LOCAL **model run handoff** that the user can execute on a Windows machine where a compatible model is already installed and serving. It removes the manual source checkout, model-ID guesswork, fragile output path work and large-result packaging. The GitHub CI validates the same path against an explicitly labeled fake HTTP server. It cannot access or run any models installed on the user's PC.

No fixed building templates, paid remote API calls, unapproved Minecraft construction, Work, existing PR base changes, historical NEBULA ARK modifications or B143 DSL cap increases.

## One Windows command for a user with Ollama

If Ollama and Node.js 22+ are installed and the Ollama local server is running on its default 127.0.0.1:11434, the user can paste the following **one PowerShell command** (only after inspecting the linked repository script):

~~~powershell
$p = Join-Path $env:TEMP 'B198M_RUN_LOCAL.ps1'; Invoke-WebRequest 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/feature/b198m-one-run-real-local-model-pilot/tools/B198M_RUN_LOCAL.ps1' -OutFile $p; powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p
~~~

The script reads the LOCAL Ollama /api/tags names, selects the sole installed model automatically or asks for a one-number choice when there are multiple. It **never invents a model ID** or auto-downloads a new model. It checks Node.js >=22 and a literal 127.0.0.1 HTTP endpoint. A model started in a different local server can be specified through \`-Model MODEL_ID -Endpoint 'http://127.0.0.1:PORT/v1/chat/completions'\`, provided that service supports OpenAI-compatible JSON chat completions. No assumption is made about Qwen/Gemma/Ollama/LM Studio actual model IDs, inference speed or model quality.

If no local server is running, the script prints \`B198M_TEST_FINISHED HOLD: B198M_HOLD_OLLAMA_NOT_RUNNING_START_LOCAL_SERVER_FIRST\`. This is a **precondition**, not a model-quality failure.

### What happens

The one command downloads a fresh source-only GitHub branch ZIP into a new temporary folder (unless given an existing \`-SourceDirectory\`), **without changing any existing local project or GitHub branch**. It runs the inherited B198K engine on the *unchanged frozen c01 Japanese future-library prompt plus its r01 revision* using both direct and directed workflows. It uses local CPU/GPU resources for actual model inference and may therefore be computationally expensive even without paid API tokens. To keep the initial probe bounded, directed design attempts are capped at two, with zero extra topology-repair rounds.

It writes an entirely new Documents/MinecraftAIBuilder-B198M/pilot-... folder, refusing to overwrite old results. Within it:

- \`source-study/index.html\`: human comparison of TWO REAL MODEL-RETURNED source-backed 3D buildings per case, if the model actually produced them. Human ratings and user-intent compliance remain UNREVIEWED until inspected.
- \`B198M_UPLOAD_THIS_SUMMARY.json\`: independent recompile/hash verification of all kept B143 source variants, case statuses, provider protocol provenance, source counts, no automatic quality winner and nine world BLOCKED gates.
- \`B198M_UPLOAD_THIS_RESULT.zip\`: compact ChatGPT upload package with the summary, frozen A/B manifest and successful B143 source JSON examples. Does NOT include model weights, credentials, previous world data, or the entire HTML gallery.
- \`B198M_RUN_LOG.txt\`: local diagnostic information; not included by default in upload ZIP. The user may inspect it before sharing.
- On failure, a clear \`B198M_TEST_FINISHED HOLD\` status and \`B198M_LAST_STATUS.txt\` if an output folder has already been created.

The printed \`B198M_TEST_FINISHED SOURCE_CAPTURED_HUMAN_QUALITY_NOT_REVIEWED\` means **source capture has finished**, not that the model produced high-quality architecture. The independent summary may still say HOLD when fewer than one genuine comparable source pair was compiled.

After a successful run, upload \`B198M_UPLOAD_THIS_RESULT.zip\` to this ChatGPT project so the actual source geometry can be inspected. Open \`source-study/index.html\` on the user's computer to visually inspect the original B143 3D geometry before attempting larger model studies.

### Other opt-in modes

- \`-Mode Preflight\`: checks Node/model selection only, does **not** call any model or download source.
- \`-Mode Pilot -Cases 1 -NoRevisions\`: one creation prompt in two pipelines, avoiding r01.
- \`-Mode Full\`: all original 12+4 frozen prompts, two workflows, potentially substantial local inference usage; do not use until the small pilot succeeds.
- \`-SourceDirectory <EXISTING_REPO_PATH>\`: skip source download, use a checked-out B198M source tree.
- \`-Model <EXACT_INSTALLED_ID>\`: avoid interactive selection.

## Quality evidence, not simulation claims

\`scripts/b198m-pilot-summary.mjs\` strictly checks the existing B198K 16 frozen-case tracking, output status and model-origin labels, independently re-compiles every successful source JSON and compares the SHA. It does NOT call the model, mark human quality PASS, certify provider identity, or contact Minecraft.

CI executes:
1. Node strict source-integrity and real HTTP **loopback transport** tests against a deterministic *local HTTP mock* (not an actual LLM);
2. all inherited B198A–L regressions;
3. the actual Windows PowerShell launcher calling the exact source-only B198K CLI against another mock-local HTTP service, then checking generated source SHA summary and compact ZIP packaging.

CI cannot certify Ollama compatibility across all installed versions, completion speed, valid planning output from a real model, Japanese intent understanding, aesthetic quality or real Minecraft walkability. Those remain **NOT_RUN** until actual local-model data is returned.

## Boundaries and next decisions

If the pilot fails due to model JSON format or insufficient output, improve the provider/structured-format compatibility based on actual logs without relaxing the strict B143 160 elements/160000 occupied voxel budgets, original source protection or source SHA verification. If source compiles successfully, prioritize actual 3D aesthetics, coherent space organization, functional routes and frozen-rubric human scoring. Avoid another generic evaluation layer unless a real model exposes a specific failure.

All nine Minecraft execution gates remain BLOCKED, readiness NOT_PREPARED, BuildPlan empty, worldCoordinates null, worldContacts/worldWrites 0. B198L PR #114, preceding PRs and main are not modified.

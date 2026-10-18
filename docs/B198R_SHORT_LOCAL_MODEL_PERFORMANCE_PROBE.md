# B198R — short real-Ollama performance probe before attempting another large original building

## Why this phase replaces another 6-minute blind architecture run

The actual uploaded user ZIP, `B198M_UPLOAD_THIS_RESULT(2).zip`, contains one fresh `qwen3.8:27b` request ending after exactly **360,013 ms** with `B198Q_LOCAL_TRANSPORT_MODEL_DEADLINE_EXPIRED`. The repaired B198Q local HTTP path avoided the earlier generic 302-second `fetch failed` pattern, and correctly skipped the directed second arm, but it **did not yield a single B143 source building**. The sole viable conclusion is that the full original-source task did not return within this particular six-minute limit; memory placement, token speed, context handling, excessive reasoning and local Ollama health were **not measured**. No human aesthetic judgment is supported.

Do not solve this by further increasing model timeouts blindly or re-running frozen 12+4. The essential next decision is: **can the actual installed model produce a tiny, correctly formatted JSON answer quickly, and how many tokens per second does it deliver?**

## New Windows one-command mode — bounded Diagnose

With an already running local Ollama and Node.js 22 or newer:

```powershell
$p = Join-Path $env:TEMP 'B198M_RUN_LOCAL.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/feature/b198r-bounded-local-inference-probe/tools/B198M_RUN_LOCAL.ps1' -OutFile $p
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p -Mode Diagnose -Model 'qwen3.8:27b'
```

`-Mode Diagnose` makes only ONE short native localhost `/api/chat` completion request (up to 128 tokens) with **60 seconds maximum elapsed for the main model request**, plus separately bounded model metadata lookups. The completion requests `think:false` and a 2048 context; the model's actual compliance with the no-thinking request is **not independently guaranteed** and its advertised controls are collected when the server supplies them. JSON format is requested, then a strict small expected answer is checked. No external/cloud model calls, no model download, no model-switch or model-server startup.

The script still downloads a fresh B198R-only source ZIP into a separate temporary folder, preserving earlier user repos and PR branches. It writes a NEW Documents/MinecraftAIBuilder-B198M/pilot-... directory, refusing overwrite.

Upload the printed `B198R_UPLOAD_THIS_DIAGNOSTIC.zip` into ChatGPT. It contains one small JSON report with:

- actual 60-second probe status, duration and explicit error (without model answer text);
- `total_duration`, `load_duration`, `prompt_eval_count`, `prompt_eval_duration`, `eval_count`, `eval_duration`, computed output tokens/sec when Ollama supplies them;
- loaded model `/api/ps` size, size_vram, estimated ratio, context length; metadata only, not exact GPU utilization or guarantee that all model layers execute on GPU;
- `/api/show` advertised thinking values when provided; `thinkingDisabledRequested:true` and `thinkingDisabledGuaranteed:false`;
- `didNotAttemptFullBuilding:true`, `frozenArchitectureCasesAttempted:0`, status and locked world safety state.

If the short request returns no JSON, its result is clearly `HOLD_MODEL_REQUEST` or `HOLD_SMALL_JSON_VALIDATION`, **not** a model success. If it passes, the success is only **small JSON request PASS**, not a working Minecraft building. Only real B143 source compiled/verified from full prompts will establish architecture output.

Alternative for checking the speed tradeoff with an already installed smaller model: `-Mode Diagnose -Model 'qwen3:14b'`; separate results are not identical-model A/B quality evidence. For Qwen 27B a short probe may still take up to 60 seconds. If the model needs a long cold load, its timed-out performance will remain unknown; this bounded diagnostic prevents multiple six-minute attempts.

## Technical implementation

- `scripts/b198r-local-diagnostic.mjs`: direct built-in Node `http` to **numeric `127.0.0.1` only**, allowed paths exactly `/api/chat`, `/api/ps`, `/api/show`, 128-token requested output, explicit 15–120 sec configurable deadline, strict 128KiB response cap, no arbitrary URLs or redirects, no credentials or world connection, output refuses overwrite.
- `tools/B198M_RUN_LOCAL.ps1`: new `-Mode Diagnose` and `-ProbeTimeoutSeconds 60`; auto-packs `B198R_UPLOAD_THIS_DIAGNOSTIC.zip`; prints exact real path.
- `scripts/b198r-ollama-fixture-server.mjs` / `scripts/b198r-local-diagnostic.test.mjs`: deterministic fake Ollama HTTP protocol and no fake model-quality claims.
- `.github/workflows/b198r-speed-probe.yml`: actual Windows PowerShell 5.1 with GitHub source ZIP download and mock native Ollama diagnostic, plus inherited 103 source/QC tests. The fixture is **NOT an actual LLM**.

## After real B198R data arrives

Estimate achievable time for 1024–4096 B143 JSON output tokens using measured post-load throughput (only a rough estimate; real source prompts and inference mode can change it). Investigate partial CPU offload when size_vram is smaller than running model size, or model thinking-mode support when no-thinking was refused. Choose between efficient, real model authored **one-building source** generation with smaller output budgets versus explicitly running a smaller local model. Do not insert fixed building templates or let quality drop to buy speed.

Sources: official Ollama local API thinking controls (`https://github.com/ollama/ollama/blob/main/docs/capabilities/thinking.mdx`), performance metrics (`https://github.com/ollama/ollama/blob/main/docs/api/usage.mdx`), and model offload (`https://github.com/ollama/ollama/blob/main/docs/faq.mdx`).

All Minecraft world contacts and writes remain zero; NOT_PREPARED, nine BLOCKED gates, no paid API, Work, or merges to main.

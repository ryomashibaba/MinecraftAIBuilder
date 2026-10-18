# B198S — First calibrated ORIGINAL building source, single live Ollama call

## Decision grounded in the user's REAL B198R diagnostic

The uploaded `B198R_UPLOAD_THIS_DIAGNOSTIC.zip` is user-supplied, real local Qwen3.8 27B evidence, NOT a ChatGPT benchmark or mock result:

| Measurement | Actual diagnostic |
|---|---:|
| Short JSON schema | PASS |
| Wall time | 17.972 seconds |
| Model load | 16.383 seconds |
| Input processing | 0.903 seconds, 54 tokens |
| Model generation | 0.676 seconds, 14 tokens |
| Output speed | **20.71 tokens / second** |
| Ollama model size | 18,253,306,917 bytes |
| Reported model size in VRAM | 12,884,503,427 bytes |
| Ratio of model bytes reported in VRAM | approximately 70.6% |
| Reported context length | 2048 tokens |
| Server-advertised thinking controls | false, low, medium, xhigh |

The diagnostic establishes small valid JSON generation and suggests partial CPU/off-GPU model residency. The ratio is not GPU utilization or a precise CPU layer-count measurement. Large architecture throughput cannot be guaranteed from 14 tokens. Do not claim the full model already built anything. The original B198Q full design ran exactly 360 seconds then was explicitly aborted.

At a hypothetical **constant** measured rate, 3072 output tokens would need roughly 148 seconds of generation before input processing/model loading. This is an illustration only; real prompt size, context expansion, KV memory, GPU offload and thinking behavior may change it substantially.

## Why B198S is a single frozen case and not an entire A/B study

Earlier B198M–Q workflows ran direct creation plus planner and multi-attempt directed repairs. The user spent many minutes without receiving a valid compiled architecture. B198S **cuts only the evaluation overhead**, not the model-authored free-form geometry: ONE source creation of original frozen Japanese c01 future civic library, WITHOUT a separate planner, retry, or automatic source deletion. All actual geometry still comes from a real explicitly requested local model, with no keyword parser or predefined library shape.

New `source/ai/b198s-native-ollama-source.mjs` adapts the inherited strict B198G model proposer from the OpenAI-compatible /v1/chat/completions shape to Ollama's native `/api/chat` endpoint on numeric `127.0.0.1` only. It requests:

- `think:false` because the actual user model advertised support for it;
- `format:'json'` and nonstreaming, with strict B198A parsing of exact design/explanation/assumptions fields;
- `options.num_predict:3072` output-token cap (user-configurable from 512 to 4096) and `num_ctx:6144` (configurable 4096 to 8192; reserves >=2048 tokens for prompt);
- `keep_alive:'10m'` so the same loaded model may be reused during subsequent intentionally requested tests;
- temperature 0.35; one model request with independently enforced 300-second default deadline (configurable 60..360), no auto retry or hidden 300-second Undici header cutoff.

If the model reaches its token cap (`done_reason=length`) or emits structurally wrong source, it gets a plain **HOLD**, not a passing building. The native bridge collects real measured generation tokens/second, load time, reasoning text length when present, completion status and HTTP error codes, with bounded local payload sizes. This does **not** mathematically prove the model complied with thinking-off.

The actual source is passed through existing `createB198GLocalModelAdapter` -> B198A `proposeArchitecture` -> frozen B198B source-quality runner -> independently recompiled B143 SHA -> source-backed 3D viewer. No Minecraft block placements or world calls; architecture semantics and aesthetics require human review, and actual game walking remains untested. **This is an initial design-synthesis evidence gate, not the final complexity target**; subsequent stages may increase output budget or use staged model-directed refinement after a first validated source.

## One-command Windows test (optional actual GPU inference)

```powershell
$p = Join-Path $env:TEMP 'B198M_RUN_LOCAL.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/feature/b198s-calibrated-single-source-ollama/tools/B198M_RUN_LOCAL.ps1' -OutFile $p
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p -Mode SourceProbe -Model 'qwen3.8:27b'
```

**This is a real local model run** and may take several minutes; the 300-second limit applies to its single main inference request, plus downloading/unpacking source and source validation. Do NOT describe the measured 17.97-second tiny diagnostic as a promise that real 3D architecture will also take 18 seconds.

Successful run prints `B198S_TEST_FINISHED SOURCE_COMPILED_HUMAN_ARCHITECTURE_REVIEW_REQUIRED` and the path to `B198S_UPLOAD_THIS_RESULT.zip`. The ZIP includes B198S summary, benchmark evidence, actual B143 `c01_source-design.json` and an offline `c01_index.html` for 3D review. If unsuccessful, the same ZIP contains accurate HOLD reasons and run telemetry, not a fake generated building. Send that ZIP for the next evidence-based quality improvement.

## Internal safeguards and verified tests

- One canonical case c01 with no planner or revision dependency, one request maximum even when invalid JSON;
- Explicit model ID; no implicit model choice / auto downgrade;
- No remote or cloud endpoint, no redirect, no credentials, no paid API, no shell execution or Minecraft connectors;
- Previously approved source-only compiler and human-review gates stay strict; no automatic construction;
- For all previous Draft PRs/main branches, untouched; B198S stacks only on B198R;
- The exact Windows PowerShell 5.1 GitHub download -> native Ollama **TEST FIXTURE** -> independently compiled B143 original source -> offline viewer -> upload ZIP is covered by `.github/workflows/b198s-single-native-source.yml`. The fixture is visibly labeled NON-LLM, not claimed actual architecture intelligence.

Reference: Ollama native ChatRequest `think`, `format`, `keep_alive` and `options.num_predict/num_ctx` documented at https://github.com/ollama/ollama/blob/main/api/types.go and https://github.com/ollama/ollama/blob/main/docs/openapi.yaml . Read `ollama ps` to inspect actual CPU/GPU offload: https://github.com/ollama/ollama/blob/main/docs/faq.mdx .

# B198P — Measured model latency / safe local pilot speed controls

## Actual local-model evidence from the user's ZIP

The file `B198M_UPLOAD_THIS_RESULT.zip` produced on the user's local Windows computer contains the original frozen B198K A/B manifest plus independent source summary (no valid source design JSON). The locally selected model was `qwen3.8:27b`. The reported wall time was ~5 minutes.

Original direct c01 returned `B198A_CANDIDATE_REJECTED_AFTER_1_ATTEMPTS_This operation was aborted`; original directed c01 architectural planning returned `This operation was aborted`. Original r01 was not executed because c01 did not compile. There were exactly TWO actual loopback requests (direct design = 1, planner = 1, directed design = 0) and ZERO successfully compiled source pairs. Summary `HOLD_NO_COMPARABLE_SOURCE_PAIRS`. The ZIP did not include per-request timing. Thus the 120-second **per-request** built-in adapter timeouts strongly explain most of ~5 minutes, but startup, cold model loads and actual server token rates cannot be derived precisely from the old evidence. This is an **infrastructure/time-budget failure**, not a measured assessment of Qwen architecture quality.

## B198P changes

1. The previous B198G source-model and B198I architecture-plan adapters silently used `timeoutMs=120000`, max 180000. New B198K CLI defaults explicitly to `--timeout-seconds 360` and accepts 30..900 sec. The adapters permit caller-supplied values up to 900000 milliseconds. **Longer timeouts do not accelerate inference**: they just avoid prematurely aborting a valid slow response. User can override for a bounded short test. The remote surface remains hard-blocked except explicit HTTP 127.0.0.1 v1/chat/completions.
2. The inherited frozen B198K paired study now records **actual monotonic per-request duration**, arm, phase, return/abort/error reason, and total abort count. The local CLI prints `B198P_MODEL_CALL START/END` events in real time without repeating full prompts or private model responses. The independent B198M compact ZIP summary now retains this timing evidence for future diagnosis; still no hallucinated token-per-second or live-model success.
3. `--stop-on-timeout` preserves the previous direct c01 failed-source evidence and marks the directed arm `NOT_RUN_PRIOR_ARM_TIMEOUT` instead of wasting another expensive local model request when the paired quality comparison already cannot be scored. No fake source, no auto model switch, no discarding of available data. The full suite can still choose to continue both arms by omitting this flag.
4. The Windows PowerShell 5.1 launcher retains B198O's proven `Expand-Archive`, and **defaults Pilot to creation-only** (`c01`, no unnecessary r01). `-IncludePilotRevision` restores c01+r01. Full still covers the original frozen 12+4. Pilot sets `--stop-on-timeout`, and `-TimeoutSeconds 360` may be overridden 30..900.
5. The launcher reads the independently verified summary and **prints `B198M_TEST_FINISHED HOLD_NO_COMPARABLE_SOURCE_PAIRS` when nothing compiled**. It still produces the diagnostic ZIP so the error can be analyzed and repaired. In contrast, B198O incorrectly printed `SOURCE_CAPTURED` after the user's failed two model calls.

## User test command

Only if the user chooses to retry the optional local inference (which uses CPU/GPU and may take more than five minutes for 27B):

```powershell
$p = Join-Path $env:TEMP 'B198M_RUN_LOCAL.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/feature/b198p-measured-local-model-timeouts/tools/B198M_RUN_LOCAL.ps1' -OutFile $p
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p -Model 'qwen3.8:27b'
```

For a shorter responsiveness **diagnostic**, choose `-Model 'qwen3:14b'` (already shown in the user's installed Ollama list), or `-TimeoutSeconds 90` to cap the wait **but risk another abort**; no architectural quality superiority is implied. Changing the model invalidates identical-model A/B quality comparisons and must be reported as such. For quality-focused comparisons, use one fixed model for both arms. No automatic model downgrade.

## Verified regression

Dedicated B198P CI tests actual abort-stop without invoking the fake planner, boundaries 30..900s, all historical B198A–M tests, independent summary, and Windows PowerShell 5.1 with **real GitHub source ZIP download/extraction** + deterministic local HTTP mock. The mock is not a real language model and does not certify the user's Qwen inference speed or actual building quality. The user's original ~5-min test results are not rewritten.

No Work, paid API, Minecraft Education contacts/writes, unauthorized construction, source deletion, previous Draft PR modification or main merge. Existing `NOT_PREPARED`, nine BLOCKED and `worldWrites=0` stay intact.

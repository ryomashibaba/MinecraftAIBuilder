# MinecraftAIBuilder Step 8B — B4.3 + B4.4 + B5 (non-construction)

Date: 2026-10-10 JST. All work performed offline. **No Minecraft, Bridge, API, world, new construction, deployment, original project source, Legacy settings or frozen evidence changed.**

## Bundle of three engineering steps (one response)

- **B4.3** `runner/step8b-evidence-b43.mjs`: Correlate actual B4.1 Windows metadata with a *future, if provided* B4.2 read-only evidence capture. Re-evaluates pinning of 249-file source snapshot and 8 critical files; compares timestamps, process-count shifts, source-drifts, partial inventory. Never identifies loaded modules with certainty or unlocks execution.
- **B4.4** `tests/step8b-guardrails-b44.test.mjs`: Security/negative-path suite covering impossible process chronology, source unreadability, truncated inventory, privacy of output PID, historical source hash changes, fake process signals, source pin preservation and lack of execution/network primitives.
- **B5** `runner/step8b-readiness-b5.mjs`: A static pre-construction gate matrix for Hotel / Apartment / Office. Revalidates pinned B3 hashes, 288 geometrical source-prediction cases, B4 static API, identifies asymmetric office mismatch. Produces only gates, zero operations and no coordinates or materials.

## Evidence and known outcome

- Previous Windows source ZIP: SHA-256 `62d1de7d0148d514fded1544c254a9beab4299018dc054aff353557df0809a1f`; 249 files verified. Not included in this lightweight package.
- Previous B4.1 Windows JSON SHA-256 `ad52851136bb0125d7901ed35d8ee40937eeb4e82d5668bb22158900d5320253`; sources 8/8 match; 4 Node processes; actual running engine unresolved. Original sanitized B4.1 JSON included for reproducibility.
- B4.2 Windows JSON: **NOT UPLOADED / NOT RUN IN THIS TURN**. B43 baseline-only report must not be misrepresented as a new Windows verification.
- B5 baseline: 8 gates, 7 BLOCKED, 1 `EVIDENCED_AT_B4_1_ONLY`; all deployment paths BLOCKED.
- B3 Office candidate-02 asymmetric geometry: 22 cells removed on floors 1–5, 13 on floor 6, per existing conceptual vs source-projected comparison. That discrepancy is not resolved by this step.
- Old Step 7S Windows PASS and 8A.5 80/80 PASS retained as historical claims; 8A tests also rerun offline this turn.

## QA

- Step8B B0+B2+B3+B4+B4.2: 67.
- Step8B new B4.3: 10, B4.4: 8, B5: 8 = 26.
- **Step8B total 93/93 PASS**, Step8A family 80/80 PASS; **all 173/173 PASS, 0 fail, 0 skip** on Node.js v22 Linux offline test harness.
- Windows PowerShell B4.2 read-only collector is NOT yet field-tested in Windows; no claim of Windows runtime PASS.

## Reproducible non-destructive offline command

Requires an independently preserved, verified source snapshot **folder** (not ZIP) and the package copy of B4.1 JSON. The output directory must not already exist.

```bash
STEP8B_SOURCE_DIR=/path/to/verified_snapshot node --test tests/*.test.mjs
node tools/RUN_B43_B5_OFFLINE.mjs /path/to/verified_snapshot reports/B4_1_ORIGINAL_WINDOWS_CAPTURE.json NONE /path/to/new_results
```

When the user provides B4.2 Windows JSON, replace `NONE` with the exact uploaded JSON path and choose a **new** output directory. If the evidence is stale/invalid, the evaluator blocks. No build/scan/Bridge/Minecraft API is ever accessed.

## Windows collection: one user action only

Use the *same* B4.2 stand-alone collector included at `tools/COLLECT_WINDOWS_B42_READONLY.ps1`. Run it only once when desired and send back `MinecraftAIBuilder_Step8B_B42_RuntimeEvidence_*.json`. That JSON contains limited process metadata such as PID/timestamps and hashes; review for sensitive information before sending. Do NOT run engine, restart Bridge, start Minecraft or perform construction for this evidence collection.

## Frozen safety contract

`BuildPlan.status=NOT_PREPARED`, `operations=[]`, `commandCount=0`, `deploymentGate=BLOCKED`, `executionAllowed=false`, `constructionApproved=false`.
No world, anchor, facing, material ID/state, permission, scan, or live runtime attestation is established. Keep Legacy builds, existing world, frozen evidence, original sources immutable.

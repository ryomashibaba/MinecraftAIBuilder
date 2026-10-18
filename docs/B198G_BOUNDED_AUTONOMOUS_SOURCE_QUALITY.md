# B198G — Bounded Autonomous Source Architecture Quality (Phase 1)

## Scope

B198G inherits B198A–F and the B143 strict source compiler. This is **not** an unattended GPT-6 performance benchmark. The new model-driven architecture quality loop connects independently compiled B143 source, real B198C voxel-space critique and bounded model-authored repair.

Primary entry point: `generateArchitectureWithFeedback({prompt,generator,maxRepairRounds,minimumConnectedGain,maxAddedSourceVoxels,maxChangedElements})` in `source/ai/b198g-autonomous-quality.mjs`.

## Implementation

- A caller must supply a model generator; there is no keyword-to-shape route, no silent fallback and no API call on import.
- After a strict original B143 source candidate, the original B198C 2-wide floor graph determines whether source-geometric high-risk findings exist. Only then is a new model-authored source revision requested.
- Original element IDs alone are not deemed protection. All original occupied material voxels and all previously usable 2-wide standing-floor squares with two headroom layers must be preserved in the new compiled source.
- A proposal is accepted only if it stays within the voxel and element budgets, does not introduce more HIGH risks, and improves an objectively measured high-risk count or connected-floor count. A cosmetic change without source topology improvement is rejected. The original or last safely improved source remains available even after rejection.
- Bounded rounds: default 2, maximum 3; the inherited B198A strict source proposal validator remains responsible for source retries.
- All outputs are **source-only candidates**. A geometric improvement is **not** proof of request comprehension, aesthetic merit, in-game walking, working stairs or realistic structural stability.
- Safety remains `NOT_PREPARED`, nine `BLOCKED`, `worldWrites=0`, no world coordinates, no BuildPlan operations, no real-world contact, no auto-approval.

## Verification and provenance

The new `scripts/b198g-autonomous-quality.test.mjs` uses **deterministic test doubles**, not a live language model. Tests check that an independently compiled three-island source layout becomes genuinely connected through a newly authored two-wide promenade, destructive headroom changes are rejected even when old source elements remain unchanged, cosmetic no-gain edits do not count as success, missing provider fails closed, and human review is never auto-certified.

The new GitHub Actions workflow runs B198A–F Node regressions and B198G tests, then syntax checks. A green build proves bounded orchestration correctness, **not** that any live model understood the Japanese prompts.

B198E's four original buildings and four revisions are preserved unchanged. The full 12+4 true-model Japanese task benchmark, independent human semantic/aesthetic scores and Minecraft world placement/readback remain unverified.

## Optional real local model source generation (not exercised in CI)

The optional `createB198GLocalModelAdapter` accepts an **explicit** model ID and a literal loopback-only URL `http://127.0.0.1:PORT/v1/chat/completions` (default port 11434). The adapter sends a JSON-only strict B143 architecture request through an OpenAI-compatible local chat-completions protocol, then validates returned structured content against the original B198A strict grammar and compiler. It performs no HTTP until the user invokes a generation call. This is **not** proof that a particular local server or model supports this protocol, nor proof that the model can produce good architecture.

After a compatible model is already running locally, users may explicitly run a command like:

```sh
node scripts/b198g-local-design.mjs --model YOUR_LOCAL_MODEL_ID --prompt "中央が吹き抜けの公共図書館。大きな閲覧床と明るい上部ラウンジを備える" --out ./b198g-my-review
```

The CLI refuses pre-existing output directories and writes only `DESIGN_SOURCE_REVIEW_ONLY.json` and `SOURCE_QUALITY_REPORT.json` in a new directory, without contacting Minecraft or any paid remote model API. The local endpoint can be overridden only with an explicit numeric loopback address and the exact `/v1/chat/completions` path.

The local adapter tests use **mock HTTP responses only**. Real local-model quality and protocol compatibility remain NOT_RUN. All source is human-review-only even after successful local generation.

## Next step after B198G

Test a separately authorized real local provider with the new loop (and integrate it into the Studio), then run all 12+4 frozen tasks with exact per-output provenance, provide real source-rendered comparisons for independent human review, and improve 3D quality from the observed failures. No paid API or Work mode is authorized by this phase. Protect the existing 160-element/160,000 occupied voxel B143 limits, B197 NEBULA ARK and historical designs, and all existing stacked Draft PRs.

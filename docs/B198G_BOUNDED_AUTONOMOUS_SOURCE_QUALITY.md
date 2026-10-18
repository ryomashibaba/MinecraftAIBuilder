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

## Next step after B198G

Connect a separately authorized real provider (potentially a locally hosted no-charge model) to the new loop and Studio, run all 12+4 frozen tasks with exact per-output provenance, provide real source-rendered comparisons for independent human review, and improve 3D quality from the observed failures. No paid API or Work mode is authorized by this phase. Protect the existing 160-element/160,000 occupied voxel B143 limits, B197 NEBULA ARK and historical designs, and all existing stacked Draft PRs.

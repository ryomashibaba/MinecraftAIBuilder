# MinecraftAIBuilder — B32 / floor emitter seam + envelope invariants

## Scope (2026-10-11)

This checkpoint advances B31 by making a *dev-only, source-based integration seam* and a tested, pure mask selector. Neither the planner, Minecraft, Bridge, engine, live world, legacy config nor frozen evidence is invoked or modified.

## What was built

1. `runner/step8b-floor-seam-b32.mjs` independently computes 30 floor boolean masks, selecting a reduced mask **only for the floor consumer**. Foundation, walls/exterior, exposed roofs and parapet-envelope calculations keep the untouched original mask.
2. `dev/reference-engine-general-building-planner.js` is the 2026-10-10 archived Windows snapshot of `engine/src/general-building-planner.js` (SHA-256 `23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8`). Never a live checkout.
3. `dev/general-building-planner.B32_GUARDED_DEV_COPY.txt` is a **source-only sketch** of the seam, inserted at the exact `plate(mask, base, "floor", "floor")` site. Its method includes an unconditional throw, and its selector throws; the copy is not wired or executable. It must not be copied over the actual engine.
4. `reports/B32_FLOOR_SEAM_LEDGER.json` stores mask fingerprints by building and floor, original-to-proposed cutout coordinates, and unchanged building-envelope input fingerprints. `reports/B32_SUMMARY.json` excludes floor-by-floor data.
5. `tests/step8b-floor-seam-b32.test.mjs` tests safety, mask conservation, unchanged other consumers, baseline immutability, source guard, anti-tampering, and exclusive-create behavior.

## Results and caveats

- 5 buildings / 30 floors; floor plate mask cells **12,778 -> 12,728** for an uncommitted 50-cell proposal.
- **5 cutout candidates adjacent to the outer envelope**: apartment/candidate-01, floors 2–6, one each. They are not approved: exterior-wall support or floor edge stability are not measured.
- A source-only semantic check shows `foundation`, `roof`, `exterior` and `parapet` *inputs* unaffected if the hook replaces only the floor-plate argument. This does **not** prove the resulting roof or structure is physically safe.
- 314 door ports remain unresolved: no verified door block ID, facing, hinge, upper half or Minecraft Education state acceptance.
- Nine M4 blockers remain blocked, plus explicit edge-adjacent floor-cutout and roof/headroom review warnings.
- Office/candidate-02 still has 123 outline mismatch cells and 18 out-of-envelope concept corridor cells.
- **The actual planner is never imported/called; no BuildPlan, placement operations, world coordinates or block IDs are emitted.**

## QA in this checkpoint

- B32 new: 39/39 PASS.
- B29 (37) + B30 (38) + B31 (41) focused regression: 116/116 PASS.
- Total newly executed: 155/155 PASS, 0 fail/skip. Older unrelated test groups not rerun.
- Frozen B31 553-file manifest checked byte-for-byte. Outputs are exclusive-create; regeneration in a new throwaway copy only.

## Priority next (B33)

1. Build a **dry, geometry-only planner fixture** using exact `footprint`, `rectangles`, `edges` contracts, or an isolated minimal harness. Compare the original floor emitter rectangle decomposition to the candidate. Do not load a live planner or call Bridge.
2. Revisit five perimeter-adjacent proposed cutouts and support/roof/headroom impact; propose solutions as unapproved candidates only.
3. Validate version-specific door state schemas and floor/partition material roles using trusted evidence if/when available. Never invent block IDs or state numbers.
4. Only after sufficient offline verification, stage a **non-deployed** integration branch for explicit code review. Any live construction remains subject to separate, explicit M5 authorization.

**NOT PREPARED / BLOCKED / 0 BuildPlan.operations / 0 engine calls / 0 live edits.**

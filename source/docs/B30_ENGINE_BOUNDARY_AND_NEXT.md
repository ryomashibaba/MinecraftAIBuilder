# MinecraftAIBuilder B30 — engine boundary adapter (READ-ONLY / NOT PREPARED)

## Actual change from B29

B29 consolidated interior design as *inert* Assembly IR. B30 adds a typed, source-fingerprint-bound **engine-side contract observer**. The observer reads pinned B7/B17/B29 reports and maps the assembly to the verified source code's `createComposition(input)` normalization boundary, the `fromComposition` synthesis boundary, and the `validateBuildPlan` final guard **without importing or invoking the planner**. It intentionally cannot generate any placement operation.

- New code: `runner/step8b-engine-boundary-b30.mjs`, `tools/RUN_B30_OFFLINE.mjs`.
- New evidence: `reports/B30_ENGINE_BOUNDARY_REPORT.json`, `reports/B30_SUMMARY.json`, `qa/B30_SNAPSHOT_INSPECTION.json`.
- Snapshot evidence is from **2026-10-10**. Nine pinned disk files matched SHA-256 during B30 development. This does not attest to the current running Node.js process or Minecraft instance.
- Floors: The archived planner uses `plate(mask, base, "floor", "floor")` for each level, while all **50/50** candidate stair cutout cells are inside source-predicted upper floor footprints. This is an important **predicted slab conflict**, *not* a live BuildPlan collision measurement. B30 never cuts slabs.
- Door 314, wall panels 5,704, stairs 25, 5 buildings/30 floors. Material mappings 0, verified physical doors 0, actual slab cuts 0, engine calls 0, emitted operations 0.
- Office candidate 02 original differences remain 123 outline / 18 corridor cells. Frozen designs are not modified.

## Engine boundary and unresolved interfaces

1. `createComposition(input)`: abstract selection of building type, shape, dimensions, orientation and style. B30 records these fields as **observations** only. They are NOT returned as an executable planner input, and no palette or material assignments are created.
2. `GeneralBuildingPlanner.fromComposition`: produces wall/floor/roof/entrance operations. **Calling this would generate a BuildPlan and is explicitly forbidden here.** No interior partition, interior door, or stair cutout emitter integration is proven.
3. `validateBuildPlan`: final executable-plan validation. Its use is **not evidence of interior physical compatibility**. B30 does not call it.
4. The original M4-01–M4-09 remain BLOCKED: loaded runtime identity, material roles, wall junction material, lower/upper/facing/hinge, exact door states, staircase support/headroom/floor cutout, world anchor/site, office02 mismatch, and explicit approval.

## QA: evidence boundaries

- B30 new tests: 38/38 PASS.
- B29 + B26–B28 related regressions: 155/155 PASS.
- B29 checkpoint verifier: 526/526 original SHA-256 PASS.
- B30 full-manifest and ZIP restore verified; do not interpret this as real Windows runtime, actual Minecraft construction, or safe occupancy certification.
- The full B0–B25 regression suite was NOT re-executed this time. Prior logs remain in preserved source.

## One-command offline regeneration

From restored ZIP: `cd source && node verify-b30-package.mjs`.

To regenerate (in a **fresh copy only**, not overwriting evidence): delete nothing in frozen original; instead unpack to a fresh folder, omit the two B30 report files and run `node tools/RUN_B30_OFFLINE.mjs`. Already-present output is refused. `node --test tests/step8b-engine-boundary-b30.test.mjs` runs focused QA.

## Development priority, minimizing repeated QA

B31: implement an isolated local-only floor-mask overlay and door-state contract validator without invoking the executable planner, then assess whether material/block-state source evidence resolves any *static* interface issues. Do not claim current acceptance by Minecraft without live verification. Reuse the 9-file snapshot fingerprint instead of repeatedly asking the user for Windows collection. M5 remains unapproved, and any live construction requires a new explicit approval in an isolated test world.

**NOT PREPARED / BLOCKED / NO WORLD / NO BRIDGE / NO LIVE ENGINE CALL / NO OPERATIONS**.

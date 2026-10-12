# Step 8B/B21 — M3-C Integer-grid interior candidate review

## What was genuinely added

- `runner/step8b-blockscale-b21.mjs`: B17 frozen IR, B18 hypothetical stair path, B20 model-only aperture, source-predicted footprint are combined into **new independent integer-grid interior design candidates**.
- No `floor`/`ceil`/`round` of B18's 0.125/0.8/0.25 model geometry. A one-cell partition, two-cell-high opening and one-unit-per-riser hypothetical route are explicitly new *design assumptions*, not faithful conversions.
- The whole estate is 5 conceptual buildings, 30 floors, 5,704 wall boundary columns, 314 door openings, 105 proposed stair tread cells on 25 vertical links and 50 upper-slab cutout *review* cells.
- Collision detection is at discrete model-cell level. Source data shows 118 distinct nominal doors (236 opening voxels) overlapped by other candidate partition columns. For 104 interfering walls, switching to the opposite neighboring cell would conflict with a reserved corridor, stair, or elevator cell; 14 other opposite-cell cases also remain unapproved.
- Stair candidate vs wall-cell occupancy: 0 overlaps in this particular hypothetical model. This **does not** validate physical stairs, slabs, headroom, support, Minecraft stair orientation, actual walkability, material or world anchor.
- `tools/RUN_B21_OFFLINE.mjs`: creates only two review JSON files in a new empty-path output folder; refuses overwrite or source-local output. No Bridge, no Minecraft, no live engine imports or commands.

## Test evidence collected in this turn

- B21 new suite **44/44 PASS** (includes malicious flags, geometry mismatches, bad doors, non-overwriting CLI, re-hashed tampering).
- B18+B19+B20 regression **95/95 PASS**, including B19's 7-file Windows source hash check from an external read-only extraction of user-provided snapshot. This raw snapshot is NOT bundled.
- B20 frozen files must remain unchanged; B21's verifier checks all 404 B20 contents against B20's original SHA-256 manifest. Former `verify-b20-package.mjs` is inventory-exact and should not be run on the expanded B21 root; use `node verify-b21-package.mjs`.
- Older B0–B17 comprehensive regression was **not rerun** in this step. The recorded tests from earlier checkpoints remain historical evidence only.

## Non-negotiable blockers

- The 118 door-grid conflicts must be addressed through real interior topology redesign or verified thinner/nonstandard voxel details before candidate approval.
- Stair landings, slab bearing and ceiling openings are not engineered. 50 masked cells are REVIEW ONLY and must never be interpreted as destructive floor operations.
- Office02 concept vs predicted exterior (123 cells) and corridor (18 cells) remain **unapplied**.
- No current live Windows engine attestation; no Minecraft Education block-ID/state/allowlist attestation; no verified local-to-world anchor/site scan.
- No module implementation is attached to the actual general-building planner.
- Explicit user approval to construct has NOT been granted.

## Next priority — M3-D and M4

1. Build a **read-only planner contract simulator** that combines source envelope, source floor slabs, wall/door voxel candidate, stair cutout model, and collision veto. The simulator must refuse to emit BuildPlan/operations.
2. Compare candidate wall-placement variants against protected corridors and door openings; do not make repairs to immutable source rooms.
3. Only after a useful non-executable M3-D integration contract, prepare ONE Windows collection run for missing actual material-state, engine identity and map-anchor evidence (no mutating APIs).
4. Isolated in-world construction remains M5, BLOCKED until user approval.

## Safety

`NOT PREPARED`; `BLOCKED`; `BuildPlan.operations=[]`; `commandCount=0`.
Legacy, existing buildings, frozen reports and previous manifests are untouched.

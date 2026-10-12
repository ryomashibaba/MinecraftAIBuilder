# MinecraftAIBuilder — B22 / M3-D read-only planner negotiation

## What was implemented (not just reviewed)

- `runner/step8b-m3d-contract-b22.mjs`: deterministic join of **frozen B21 integer wall/door/stair candidates**, **B17 nominal room/corridor reservations**, and **B7 source-predicted footprint masks**.
- `reviewAlternateWall`: analyzes the other side of each partition. Rejects crossing a protected corridor/stair/EV reservation, leaving the predicted envelope, or blocking a second door.
- `evaluateB22Floor`: models all door void vs competing partition voxel collisions for each floor; records non-executed alternate-side moves and conditional aperture relief hypotheses. Computes independent hypothetical residual check without changing source geometry.
- Source-slab contract: 25 upper-floor interfaces / 50 review cutout cells are still **not actually cut**. Floor support/ceiling clearance is unknown.
- `validateB22M3D`: fail-closed safety flags, digest and replay verification; no BuildPlan, world coordinates, block IDs, material states, network access, or live engine imports.
- `tools/RUN_B22_OFFLINE.mjs`: outputs two reports to a never-before-existing absolute folder; cannot overwrite project files.

## Actual results for frozen estate

- 5 buildings / 30 floors / 5,704 nominal wall elements / 314 door ports.
- Unaltered B21 design still has 118 conflicted door ports / 236 voxel overlaps.
- **0** wall-side moves passed the full reservation, predicted-footprint and all-door-void checks. Do not re-label B21's '14 alternate other' as 14 safe solutions.
- 118 **unapproved** proposed junction relief panels / 236 **hypothetical** lower-wall voxels to omit. A hypothetical 0 overlap after removing those voxels is *only* a tautologically narrower conflict check; continuity of the affected walls, room privacy, corner geometry, passage clearance, roof/floor support and actual constructability remain UNVERIFIED. Physical repair count remains **0**.
- Office02 exterior 123-cell / corridor 18-cell mismatch persists and remains unmodified.
- Ground truth: B19 pinned static engine-source evidence; NOT a running Windows process or API capability proof.

## QA performed this turn

- B22 new suite 30/30 PASS (includes attacks on approval, operations, source mismatches, replay, output overwrite).
- B21 related suite 44/44 PASS (unmodified).
- The heavyweight B20 suite was attempted but did NOT complete in allotted time, and is not counted as PASS.
- Preserve all B21 tracked files by byte-for-byte SHA-256; do NOT recalculate frozen prior evidence into new baselines.

## Next engineering milestone — M3-E then M4

1. **M3-E**: introduce a separate editable, candidate-only interior-topology layer. Solve 118 doors with explicit room-boundary modifications rather than marking junction relief as ready. Recompute door reachability, wall continuity, 1–2-cell clearance, stair landing headspace, and source-predicted exterior inclusion. Reject proposals breaking these constraints. Keep frozen building designs untouched.
2. **M3/E planner adapter**: when eligible candidates exist, bind the separate candidate-only layer to a strict read-only normalized planner interface. Never import/call the actual production planner or generate BuildPlan until authorization and material/anchor proofs.
3. **M4**: ONE Windows read-only attestation run covering actual Node runtime identity, local project source hash, Education material/block states allowlist, and world-anchor readiness. If required evidence is not obtainable read-only, mark UNKNOWN rather than touching the Minecraft world.
4. **M5 isolated actual build**: requires explicit, separate user permission. Currently BLOCKED.

## Non-negotiable safety

`NOT PREPARED`; `BLOCKED`; `operations=[]`; `commandCount=0`; no Bridge/World calls; no mutations to any B21 and earlier frozen source, Legacy settings or existing builds.

# Step 8B/B23 — M3-E Door-topology relocation review (2026-10-11)

## Scope and design changes

B22 established that moving a blocking wall to its opposite adjacent cell is NOT admissible (0 fully permitted attempts); hypothetically carving 236 wall voxels clears door-wall overlap but leaves 118 partition continuity questions. B23 takes a different approach: for each obstructed room door, find an existing non-door wall boundary on **the same room's perimeter** that faces an existing stair-connected corridor cell. Candidate proposals are held in a **separate delta**, not written back into B17/B21/B22.

The pure module `runner/step8b-m3e-door-topology-b23.mjs`:

1. Loads pinned B17 IR, B21 integer-grid models, B22 baseline audit, and B7 predicted footprint; pins source hashes before use.
2. Checks the existing per-floor collision metric (118 conflicted doors, 236 modeled lower-voxel hits across all 30 floors).
3. For each obstructed door, tests a new boundary with same `roomId`, available one-block-wide opening, two vertical low cells, inside predicted footprint, connecting to a stair-reachable existing corridor/stair reservation. Requires new door room and hall cells free of other wall solids at opening height; closing old door must not block any other port.
4. Tries a complete **non-applied** occupancy update (old aperture closed, new aperture opened), rejects new collision pairs and candidates failing to strictly reduce the overlap count. Deterministic sort: move distance, avoided overlaps, boundary ID.
5. Emits only local schematic coordinates, room/boundary IDs and candidate deltas. No `BuildPlan` operations, block IDs, world coordinates, network calls, server API, or editing of frozen data.

## Observed measurements (frozen five-building 30-floor review)

| Scope | Baseline | Candidate-only simulation | Physically approved |
|---|---:|---:|---:|
| Doors with wall overlap | 118 | 0 | 0 |
| Lower-voxel overlap hits | 236 | 0 | 0 |
| Door relocations | 0 | 118 | 0 |
| Door displacement | — | exactly one schematic XZ cell each | none |
| Rooms / floor topology / corridor and stair reservation cells edited | 0 | 0 | 0 |
| Existing door inventory | 314 | 314 | none placed |
| Stair floor cutouts | 50 candidate cells | unchanged, never cut | 0 |

**Important**: this is a demonstrable improvement to the *integer schematic doorway design only*. It does not prove Minecraft block-door placement, stable room partitions, physical 2-block headroom, 3D accessibility, material compatibility, floor support, or wall continuity. Remaining shared-wall junction geometry and actual planner emitters are not implemented. In particular, office02's 123-cell exterior mismatch and 18-cell conceptual corridor mismatch persist unchanged. The candidate simulation's zero overlap is NOT authorization to construct.

## QA and evidence

- 34/34 B23 new tests PASS, including independent implementation of the full lower-voxel occupancy replay from frozen B21 panels and all 118 candidate boundary deltas; tampered candidate positions, source hashes, permission flags, BuildPlan ops and overwrite attempts rejected.
- 44/44 prior B21 tests PASS; 30/30 prior B22 tests PASS. Total **108/108** tests rerun this turn.
- Earlier B0–B20 test suites not rerun, prior evidence retained but not claimed as freshly rerun.
- Package inventory SHA-256 and B22 byte-for-byte frozen original checks must pass; ZIP extraction test required.

## Next priority: M3-F -> M4

1. Implement a **nonexecuting engine-normalization adapter** that reads the new candidate-only old/new port boundary deltas and generates a strict **separate** review IR for planned partitions, openings, slabs, and stairs. Verify adjoining walls/junction continuity, room privacy, and source engine floor layer collisions. Use a block-oriented partition representation if the current 1-cell raster forces overlapping junctions.
2. Validate a truly block-native 1×2 doorway (hinge, facing, Education block-state compatibility), nearby stair landing support and full 2-cell clearances. These require the real Windows runtime/material allowlist for proof.
3. Design one Windows **read-only** attestation run for engine version, material/state identifiers, runtime source identity and anchor readiness. No world access without separate authorization.
4. M5 construction remains **BLOCKED** until explicit user approval; no sandbox construction has been authorized or performed.

## Immutable safety contract

`NOT PREPARED`, `BLOCKED`, `BuildPlan.operations=[]`, `commandCount=0`, no runtime/Bridge/world access, no materials/world coordinates, no changes to historical buildings, Legacy settings, or frozen B22-and-earlier artifacts. If proof missing, classify UNKNOWN, not PASS.

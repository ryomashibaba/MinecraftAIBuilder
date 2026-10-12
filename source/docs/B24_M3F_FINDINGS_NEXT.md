# B24 / M3-F — Integrated partition ownership, doorway and stair/slab ledger

## Why this work matters

B23's candidate relocation is useful, but checking only *door versus wall* overlap cannot prove an integrated wall assembly. B24 independently replays the pinned B17/B21/B23 local cell ownership with the candidate old port filled and new port opened. It **retains the ID of every wall panel claiming each voxel** instead of silently merging or deleting duplicates. Stair slab opening review is layered onto this same candidate-only wall occupancy. It does not call Minecraft, Node servers, a GeneralBuildingPlanner emitter, Bridge, or any user Windows environment.

## Measured results — static integer-grid review only

| Item | Baseline | Candidate-only combined layout |
|---|---:|---:|
| Door-wall lower voxel overlaps | 236 | 0 |
| Wall voxels claimed by more than one panel | 3,754 | **3,990** |
| Excess wall ownership claims | 3,754 | **3,990** |
| Door move proposals | 0 | 118 |
| Door installations / approved changes | 0 | 0 |

Wall overlap is **not** a proven physical defect: shared wall junctions may be legitimate if their material and ownership rules match. The extra 236 owner claims appear when nominal old door apertures are closed again in the candidate model. B24 **does not auto-deduplicate those cells** or claim that rooms retain privacy. Ownership and material constraints must be defined before the real planner can accept this layout.

The 25 vertical links carry **50 proposed upper-slab cutout cells**; all remain uncut. In the frozen integer-grid candidate model, wall occupancy intersected neither hypothetical stair tread cells nor hypothetical two-cell headspace, and every reviewed upper-slab headspace contact matches a candidate cutout cell. This does not demonstrate actual slab cutting, landing supports, walkable stairs, sufficient physical headspace, or Education block-state compatibility. The source/concept shape mismatch of office02 (123 exterior cells, 18 corridor cells) remains unmodified.

## What was built

- New `runner/step8b-m3f-assembly-b24.mjs`: pinned, deterministic local occupancy/ownership compiler and replay validator; independent counts and per-floor sample panel owners.
- New `tools/RUN_B24_OFFLINE.mjs`: separate new-directory-only JSON export. Never overwrites source or an existing path.
- New `tests/step8b-m3f-b24.test.mjs`: 35 tests for source pins, ownership reassembly, slab evidence, BuildPlan denial, tamper/fake approval, and read-only CLI.
- Saved `reports/B24_M3F_ASSEMBLY_LEDGER.json`, `reports/B24_SUMMARY.json` and QA TAP evidence; no new visualization needed.

B23 original source files have been preserved with exact SHA-256 verification. An unchanged frozen original is not replaced with a new interpretation.

## Remaining engineering blockers

1. **Shared partition ownership**: 3,990 voxel addresses in candidate model have multiple panel owners; must design a deterministic, material-aware junction/ownership policy and prove room separation. No source mutations permitted.
2. **Real-block door API**: block material allowlist, door upper/lower half and hinge/facing semantics, jamb support and frame clearance unknown.
3. **Floor slabs and stair supports**: 50 candidate holes, 0 physical slab edits; must verify support/load assumptions and headroom from runtime geometry.
4. **Planner normalization and anchor**: no bridge/engine runtime identity, no world anchor/coords; no executable interior emitter in this checkpoint.
5. **Office02 original geometry mismatch**: 123 external and 18 corridor cells remain.
6. **Authorization**: no approval for any new construction, including sandbox builds.

## M3-G fast track

Implement one **material-neutral junction ownership normalization** with explicit per-voxel provenance; count accepted shared junctions *only after* a formally defined single-owner equivalence rule, without guessing materials. Then integrate the result with block-door state contract and nominal floor plate cutout contract in a single offline compiler. Run focused differential tests + snapshot hashes. After M3-G design review, prepare a **single Windows read-only attestation** of engine runtime and Education material-state allowlist (M4), but only if meaningful unresolved inputs are identified. Do not schedule repeated manual probing or start any construction. M5 remains BLOCKED pending explicit user approval.

## Testing and exact distinction

New B24 tests 35/35 PASS; B21 44/44, B22 30/30, B23 34/34 PASS during this run; **143/143 relevant tests**. B20-and-earlier large suites not rerun; historical records remain in the original archive. No Windows runtime verification was performed here. `NOT PREPARED / BLOCKED / commandCount=0`.

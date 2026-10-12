# B25 / M3-G: One-owner review ledger for the integrated interior candidate

## Source provenance and critical boundaries

- All original B24 checkpoint files remain immutable and are verified against `B24_FILE_SHA256.json`.
- The B24 manifest itself is byte-pinned by SHA-256 inside `runner/step8b-m3g-junction-compiler-b25.mjs`.
- B25 imports B24's deterministic ledger/replay and independently reconstructs the candidate wall owner map from pinned B17 IR, B21 integer schematic walls, and B23 proposed door relocations.
- NO Minecraft, Bridge, engine runtime, materials, real world anchor, BuildPlan operations, or permission change.

## Actual B25 static results

| Field | Result | Meaning |
|---|---:|---|
| Building/floors | 5 / 30 | Frozen review inputs |
| Wall panels | 5,704 | Candidate schematic panels |
| Door ports | 314 | Nominal ports with physical block state **UNKNOWN** |
| Door relocation candidates | 118 | Nominal adjustments, **not applied** |
| Unique occupied local wall voxels | 13,658 | Candidate schematic occupancy after B23 proposals |
| Shared voxels with multiple owner claims | 3,990 | All original claims retained in report |
| Canonical (provisional) labels | 13,658 | In-memory one owner per occupied voxel. Only the 3,990 contested records are exported with full provenance; uncontested labels are regenerable from pinned inputs |
| Shared voxels with identical room scope | 3,990 | Owner boundaries reference identical room ID sets; **not** physical evidence of join validity |
| Shared voxels with intersecting or disjoint room scope | 0 | In this specific frozen model only |
| Material-verified shared junctions | **0** | Must not be inferred from room scope |
| Stair links / proposed slab cutout cells | 25 / 50 | Coordinates recorded; actual slab cuts **0** |
| BuildPlan operations / commands | **0 / 0** | Strictly NOT PREPARED / BLOCKED |

## Contract implemented

1. Build a material-neutral map of local integer voxels claimed by wall panels.
2. Replay B23's 118 relocated nominal openings **without mutating the input**. Confirm the B24 overlap and ownership counts exactly.
3. For a cell with multiple panel claims, select the lexicographically smallest panel ID as a **canonical bookkeeping label only**. Preserve every claimant and its source boundary/room scope. All 3,990 contested cells retain `materialEquality=UNKNOWN` and `physicalJoinApproved=false`.
4. Track 314 nominal doors with distinct `stateLower`, `stateUpper`, hinge, facing and material UNKNOWN. Nominal opening 1 wide x 2 high does not imply Minecraft door placement compatibility.
5. Preserve upper slab candidate hole coordinates from all 25 stairs (50 cutout cells) without cutting or altering slabs. Supports/headroom/walkability remain unverified.
6. Reject source changes and any attempt to promote the result to an executable or approved plan, including resigned report content, using a frozen replay.

## Why this is progress, but NOT physical resolution

Deterministic ownership removes ambiguities from the **data representation**. It DOES NOT settle what material is on any contested cell, if wall joints support actual partitions, whether a door can be installed with block-state semantics, whether each staircase remains head-clear, or whether office02's 123 exterior / 18 corridor cells need redesign. All remain explicitly blocked.

## M4: single read-only Windows compatibility check (future, not run)

After the material/door/geometry hypotheses are consolidated, one Windows-side **read-only** collection pass should gather trusted installed engine version/source fingerprints, documented Education material/block-state capability, and safely observable process identity. Do not call building endpoints or world commands. If material/block states cannot be proven by a read-only source inspection, remain BLOCKED instead of querying the world. Explicit approval is required separately for any sandbox construction.

## QA performed this turn

- B25 new: **48/48 PASS**.
- B21 full: **44/44 PASS**.
- B24 full: **35/35 PASS**.
- B22 targeted: **16/16 PASS** (not all 30; complete suite timed out during initial attempt).
- B23 targeted: **16/16 PASS** (not all 34).
- **159/159 completed tests PASS**. This is not a claim that the entire historical regression was re-run.
- Original B24 inventory verified separately. B25 output/replay + package hash recovery validated.

## Safety freeze

`NOT PREPARED / BLOCKED / BuildPlan.operations=[] / commandCount=0`.
Existing world, Legacy, frozen data, material allowlist, live API and Windows process remain untouched. No new construction is authorized.

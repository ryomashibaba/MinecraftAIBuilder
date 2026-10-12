# B26 — M4 compatibility evidence gate / source-derived findings

## Grounding / scope

- The unchanged B25 normalized local candidate and B25 frozen manifest serve as the only design input.
- `reports/B26_ENGINE_SOURCE_FACTS.json` is a **privacy-filtered derivative** of the user-supplied `MinecraftAIBuilder_Step7S_Windows_SourceSnapshot_20261010_182754_46acb598.zip`, hash `62d1de7d0148d514fded1544c254a9beab4299018dc054aff353557df0809a1f`. The original snapshot is NOT included in this checkpoint.
- Nine explicit source SHA-256 digests from that ZIP are kept in the facts file. Facts JSON is byte-pinned in `step8b-m4-static-gate-b26.mjs`.
- The archive profile is Education v26.3 **at capture time**, NOT live material support in a newly started game or loaded Bridge code.

## Concrete source findings

1. The engine provides `validateBlockStates` and `transformBlockStates` in its source. Token names `upper_block_bit`, `door_hinge_bit`, `open_bit`, `direction` occur in the source. These do **not** establish exact live door-half placement support.
2. In the archived education profile, there are 966 records: `verified=827`, `unsupported=139`; `*_door` records **0**, `*_trapdoor` records **128 verified**. Do not substitute a trapdoor for an ordinary room door; do not infer unknown blocks are supported.
3. `rotateLocal` supports four local-to-direction rotations. B26 checks only **symbolic local basis vectors** and intentionally has NO numeric world anchor.
4. B25 remains 5 buildings / 30 floors / 5704 nominal wall panels / 314 door ports / 3990 shared wall voxels / 25 stair links / 50 candidate cutout cells. Physical joins, door state, slab cutting, walkability unverified. Office02 123 exterior / 18 corridor cells are not fixed.
5. `validateBuildPlan` in the Windows source requires non-empty operations; B26 never creates such a plan and does not import or call it. Any signed report that claims operation readiness is rejected.

## The nine fail-closed gates

| ID | Still needed |
|---|---|
| M4-01 | Actual running Node/engine identity + loaded source attestation |
| M4-02 | Interior role → exact material and block-state contract |
| M4-03 | Shared wall material equality and joint robustness |
| M4-04 | Door lower/upper, facing, hinge, opening support |
| M4-05 | Exact v26.3-or-current door state verification evidence |
| M4-06 | Slab openings, support, headroom, stair walkability |
| M4-07 | World anchor and site safety |
| M4-08 | Office02 exterior/corridor mismatch |
| M4-09 | Explicit user authorization to build in a scoped safe sandbox |

B26 deliberately keeps all `confirmed=false`. The collector **cannot** authorize construction even if all files match; it only provides new evidence for review.

## Next efficient engineering batch

1. When the user is ready to run Windows-side verification, use ONE sanitized, read-only M4 collector. The provided PowerShell 5.1 collector has not yet been verified on Windows; it should be reviewed before use. No game start, API calls or world commands are required. If it finds no Node process, report only that fact at capture time.
2. Diff actual Windows file hashes and the **archived profile counts** against B26. Source identity remains distinct from loaded-runtime identity. Reject missing/changed hash before any changes to module adapters.
3. Build exact door material/state *hypotheses* from verified local source definitions, but require separate proof of the actual lower/upper states in a specifically authorized isolated test before calling those supported.
4. Implement floor cutout/structure collision checks as non-executable integer candidate proposals. Resolve office02 explicitly; then separately request user permission for construction.

## QA and unchanged inputs

This checkpoint adds **58/58 B26 tests** and reruns **48/48 B25 tests**, checks `verify-b25-package.mjs`, and records source/safety facts. Historical QA counts are not relabeled as current-pass numbers. Baseline hashes are verified; B25 original files are never edited.

`NOT PREPARED / BLOCKED / no operations / no material selection / no world coordinate / no legacy changes.`

## Next-upload JSON assessment adapter

`runner/step8b-m4-windows-assessment-b26.mjs` requires a sanitized 9-hash B26 Windows evidence document, compares source values and archived status counts, and retains all 9 construction blockers. `tests/step8b-m4-windows-assessment-b26.test.mjs` has **18/18 offline tests**. This is a prepared comparison path only; the collector has not run on Windows.

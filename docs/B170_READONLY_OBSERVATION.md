# B170 — Read-only stair observation kit

**Status:** offline kit complete; no live-world calibration. Minecraft Education NOT_PREPARED / 9 BLOCKED / world writes 0. No Work, no merge to main.

## What the kit does

The generated browser form covers **18 exact stair checkpoints** for the B165/B166 DOPPLER terminal:
- North: local entry (30,19,15); seven treads at Y20–26; upper landing (30,26,30)
- South: local entry (79,19,73); seven treads at Y20–26; upper landing (79,26,88)

Each checkpoint lists four full 2×2 floor cells and eight standing/body-headroom cells. These coordinates are **local design space**, not mapped coordinates in an existing Minecraft Education world. The source-pinned checksum prevents silently accepting another design.

## What the kit does NOT do

- It does **not** connect to Minecraft, open sockets, query files, simulate a human, set blocks, or change world or game state.
- It does **not** establish any local→world coordinate transform. None is available.
- It does **not** know the actual Education stair ID, facing, top/bottom state, or corner state.
- It does **not** certify physical traversal, force a 2×2 body across stairs, or turn a manually supplied observation into a trusted runtime attestation.
- A fully populated input still receives **COMPLETE_USER_SUPPLIED_UNAUTHENTICATED**, with runtime verification and construction permission false.

## Fastest supported use

1. Download `B170-ReadOnly-Education-Stair-Kit` from this PR's successful workflow; open `index.html` locally.
2. Only enter already-observed information. Blank fields are accepted; default provenance is `example_only`.
3. Save `B170_OBSERVATIONS.json` (one action). You do not need to type JSON manually.
4. For offline validation, run:
   ```bash
   node scripts/b170-review-submission.mjs B170_PROBE_PACKET.json B170_OBSERVATIONS.json B170_REVIEW.json
   ```
   Input files are never overwritten. Unknown, forged, duplicated or mismatched observations fail closed.
5. **Do not use the displayed local positions as Minecraft world coordinates.** A separately authorized, non-writing, read-only local→world calibration must be completed before any direct live observation can be attributed to these 18 checkpoints.

## Later verified read-only client probe (not implemented or authorized)

A future direct Minecraft Education probe must be bound to a **known running client** with an explicitly confirmed immutable transform, a documented and tested read-only interface, approved world/source, and exact version. Before connection, show the user the proposed scope and distinguish reads from writes. It should return block IDs, facing, vertical half, corner neighbor connection, and player test observations, with immutable timestamps/provenance. Fail closed if any block state cannot be read. No auto-construction and no changing the 15-building/66-floor/102-stair overall goal.

## Reproducible checks

```bash
node --test scripts/b170-readonly-probe.test.mjs
node scripts/b170-build-capture-kit.mjs
node scripts/b170-review-submission.mjs b170-readonly-kit/B170_PROBE_PACKET.json b170-readonly-kit/B170_EMPTY_SUBMISSION.json
```

The independent fast workflow executes these commands and archives `index.html`, the 18-point packet, empty safe sample, and provenance review. Original DOPPLER geometry and all world data remain unchanged.

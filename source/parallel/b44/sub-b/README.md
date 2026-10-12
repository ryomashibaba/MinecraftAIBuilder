# B44 / SubB — Non-Executable Structure Review

**Ownership:** `source/parallel/b44/sub-b/` only. B43 baseline remains immutable.

## What this does

- Reads B17, B29, B31, B32, B33, and B43 pinned report files from an unchanged B43 source root, verifying their hashes against the pinned B43 file manifest (the manifest's SHA-256 is also pinned in the loader).
- Builds a **symbolic** 5-building / 30-floor review graph, using B31 source masks and exact B33 rectangle reconstruction, with B17 partition-boundary adjacencies, B29/B31 door ports, and 25 B29 stair link declarations.
- Computes source footprint exterior/courtyard boundary runs; roof *exposure footprints* where the next floor has no source mask; floor-over-floor differences; uncut floor-opening candidates.
- Includes an explicit 118-port mismatch audit between older B17 door locations and B29/B31 door locations. B29/B31 hints are kept separately; no opening is created and no B17 room corridor replan is attempted.
- Keeps every roof style, color, physical window, support and material ID `UNKNOWN`/`UNVERIFIED`/`null`; never generates any construction or engine operation.

## Files

- `structure-b44.mjs`: pure geometric converter, compiler, report validator (no I/O).
- `generate-b44.mjs`: **read-only** pinned source loader and generator. The optional JSON output may only be a new file directly inside this SubB folder; `wx` forbids overwrites.
- `B44_STRUCTURE_REVIEW.json`: generated complete machine-readable design report for 5 buildings / 30 levels.
- `structure-b44.test.mjs`: 15 focused tests (real 30-level reconciliation, 2D geometry, fail-closed cases, pinned input hash tamper detection).
- `qa/`: exact test TAP and baseline verification logs.

## Reproduction after merging with B43 main source

Run from the source root:

```sh
node verify-b43-package.mjs
node --test parallel/b44/sub-b/structure-b44.test.mjs
node parallel/b44/sub-b/generate-b44.mjs .
```

The final command prints the summary but **does not overwrite any file**. To intentionally regenerate the shipped JSON inside the SubB folder, first move the old file to a safe external location and pass a **new filename** in that same SubB folder as the second argument. Do not use any Minecraft/Bridge/Windows commands.

The ZIP deliberately does not include any original B43 files. `changes/` must be merged into the B43 source root while preserving the `source/` prefix; the main chat decides whether/how to merge and does not auto-promote this report to a real planner.

## Semantics and hard safety boundary

- Local mask cells are 2D **nominal** footprint intent; counted exterior edges are NOT placed facade blocks.
- `roof.sourceExposedCells` describes uncovered **source footprint** cells, not built roof tiles or roof waterproofing.
- `candidateRectangles` account for 50 **unapplied** stair cutout candidate cells. They do not represent a committed floor modification.
- `partitionAdjacencies` are from older B17 concept boundaries and may not match B29/B31 revised door port candidates. Never use them directly as actual walls.
- There is no world coordinate, material ID, actual block state, block plan, bridge call, or approved floor support.
- **NOT_PREPARED / BLOCKED / M4 all 9 gates BLOCKED / construction operations 0** remain mandatory and unchanged.

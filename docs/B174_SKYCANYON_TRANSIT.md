# B174 — NEBULA ARK / Skycanyon Transit

**Tangible modular 3D city expansion; strictly OFFLINE / DESIGN ONLY.**

This is a significant continuation of B173's 37th candidate, **not** a fictitious 38th model. It preserves the B172 and B173 source and the existing 36 Pages scenes unchanged. The legacy B143 single-document authoring limit of 160 elements remains intact. Instead of deleting previous work or relaxing the safety checks, B174 compiles **two separately validated strict B143 documents**, then composites their actual occupied voxel cells, with the parent design taking precedence at coinciding coordinates.

## New authored spaces
- New longitudinal *Skycanyon Transit* stair-shaped visual structure: 15 distinct raised levels, three-block-tall? No — **3-block-long, 3-block-wide, 1-block-thick solid treads**, providing individually verified 2×2 stationary footprints. Rise between stations is one design cell. This is not vanilla Minecraft stair-block collision and neither continuous movement nor legal jumping is certified.
- Large monumental end pier and entrance link, wide rear canyon promenade, suspended overlooks and industrial atrium spines.
- Three extensive new Y57 panoramic public floors, Y64 crown terraces, Y65 sky gardens, and real high cross-terminal glass bridges.
- Three enormous vertical halo frames and three new shell-glass umbrella roofs, plus dramatic tall exposed facade pylons and diagonal mega-trusses.

Every part is an actual B143 volumetric add element and produces an inspectable source-pinned geometry delta. No construction commands are produced by compositing. Parent 2×2 flat-corridor proofs at Y14 (102 moves) and Y26 (98 moves) must continue to pass. The independent 15-station footprint proof measures only those stationary locations, not the physical route between them.

## Validation and preview
- `source/ai/b174-skycanyon.mjs` — independent B143 addon, source-hashed composite, parent-priority overlap policy, real delta comparison and fail-closed safety report.
- `scripts/b174-fast-probe.mjs` — generates exact new occupied voxel counts, geometry hashes and safety status.
- `scripts/b174-macro.test.mjs` — deterministic geometry, budget, footprint, old-corridor regression, fake-world-safety rejection.
- `scripts/b174-build-preview.mjs` — independent offline interactive 3D HTML viewer and BOTH separately authored B143 design documents.
- `scripts/b174-browser-qa.mjs` — actual desktop/mobile Chromium canvas capture and interactive view controls.
- `.github/workflows/b174-fast.yml` — focused fast two-job CI; avoids historic 36-model Pages rebuild.

**Not certified:** genuine Minecraft stair collisions, inter-floor movement, player continuous walkability, fall safety, structural support, local placement, world block-state availability. Source coordinates are **design-local**, never live world coordinates. `NOT_PREPARED`, nine `BLOCKED`, `constructionApproved=false`, `worldContacts=0`, `worldWrites=0`, `BuildPlan.operations=[]`. No Work, user operations, main merges, Pages releases or Minecraft writes.

## Next B175
Improve usable connected vertical movement with explicit neighboring voxel collision intervals or a dedicated conservative stair-body model; use rendered screen evidence to prioritize visual composition while preserving modular separation. Do not claim actual Minecraft Education traversal until real block states and authorized in-game measurements exist.

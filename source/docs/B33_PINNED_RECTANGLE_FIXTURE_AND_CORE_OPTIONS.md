# MinecraftAIBuilder — B33 pinned envelope rectangle fixture

**Basis:** B32 checkpoint; first read `../README_B33_FIRST_JA.md`. Offline source only, **not an engine integration or Minecraft build**.

## Implemented

1. Extracted the exact, unchanged `modules/walls/building-envelope.js` source bytes from the user's 2026-10-10 Windows snapshot and stored an inert pure-source copy at `dev/pinned-building-envelope.B33.mjs`. SHA-256 `c63037c51937b0e5ec03b17274452bf1771fe47f8fe01dcececda6a8508766a0`. This helper implements `footprint`, `inside`, `rectangles` and `edges` but has no planner, Bridge, blocks, material pipeline or world connectivity. **No live source is imported or modified.**
2. Ran that pinned `rectangles(mask)` on original and 50-hole floor *candidate* masks for 5 buildings x 6 floors. Independent cell-level reconstruction checks every rectangle, absence of overlapping rectangles and exact coverage; output is local `{x,z,width,depth}` geometry only, *not* `fill` operations.
3. Rechecked the exposed roof mask against B32's **original** untouched input hash for all 30 floors, and preserved foundation/exterior inputs.
4. Split footprint boundary adjacency into (a) boundary-connected void and (b) enclosed interior void using 4-neighbor flood-fill on each 2D mask. The five previously reported edge-adjacent cutouts are all on the enclosed-interior-void side in this 2D mask. **Do not interpret this as proven physical courtyard access, support, or weather exposure.**
5. Generated up to 6 *unapproved* single-offset full-vertical-stair-stack shift options for the apartment example. Four remove adjacent-to-void cells in the 2D masks; all require shaft, room and corridor redesign. No candidate is adopted or applied.

## Observed offline numbers

- 30 source floor masks, 12,778 occupied cells -> 12,728 occupied candidate cells after 50 unexecuted holes.
- Pinned source's rectangle decomposition: **58 original rectangles -> 128 candidate rectangles**; all candidate rectangles cover precisely 12,728 local floor cells with zero duplicates or missing cells.
- Five boundary-adjacent cutouts, **5 enclosed-void-side / 0 boundary-connected exterior-side** at 2D footprint topology level.
- Six apartment vertical-stack shift variants, four with zero local void adjacency. These are *shape-only possibilities*, never approved designs.
- No physical roof/headroom/stair support, wall joint, doorway state, material ID, world anchor, live engine process or Minecraft behaviour has been demonstrated.

## Safety and evidence handling

- Frozen B32 file manifest (`B32_FILE_SHA256.json`, **566** hashes) is verified in its entirety before B33 report generation; all prior frozen files are preserved byte-for-byte.
- B33's report itself is deterministic and self-hashed; validation regenerates it from frozen inputs and rejects changes even after rehashing.
- The constructor emits *no BuildPlan operations*, no actual block IDs, no world coordinates and no runnable planner fixture. Do not rename or reuse this as an execution plan.
- Inherited **nine M4 blockers remain BLOCKED**. Additional courtyard-side support and relocated-shaft connectivity review blockers are also OPEN.
- `NOT PREPARED`, `BLOCKED`, `BuildPlan.operations=[]`, no Legacy/world changes and zero engine/Bridge calls.

## Next practical step (B34)

Add **cross-floor shaft and access corridor constraints** to the interior rectangle fixture. Reject relocated shafts that intersect known room/wall reservations or lose path connectivity, while keeping the original input frozen. Only if those contracts are supported should a *non-deployed* planner-development branch be prepared for explicit review. Windows runtime and any live construction remain separately blocked, and M5 requires the user's explicit approval.

# B169 — collision-shape provenance and stair-replacement gate

**Status:** DESIGN-ONLY / NOT_PREPARED / 9 BLOCKED. All data is local to GitHub Actions. There is no live Minecraft world contact.

## Why this exists

B167's joined 1×1 discrete stair routes succeed, while the whole-journey 2×2 full-voxel routes fail. B168's synthetic partial-height body collision experiments distinguish a 0.5-block step from a 1.0-block rise. These are different movement models, not conflicting Minecraft runtime certifications.

B169 adds a parser for **documented Bedrock custom-block `minecraft:collision_box` data**, not a scraper/guesser of vanilla stair collisions. All coordinates are integer pixel units; 16 pixels = one block. `true` maps to one full collision box and `false` to none. Multiple boxes, including two-box straight-stair **examples**, are read under the Bedrock 1.26.0+ **documentation assumption**. The exact Minecraft Education version and current feature availability have not been verified.

### Sources verified on October 17, 2026

- [Microsoft Learn: `minecraft:collision_box`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_collision_box): explicit collision volumes, full/empty boolean, pixel coordinates and arrays
- [Microsoft Learn: Bedrock 1.26.0 notes](https://learn.microsoft.com/en-us/minecraft/creator/documents/update1.26.0): multi-box collision released outside the experimental toggle for that version
- [Microsoft Learn: `minecraft:support`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_support): **structural support component**, different from actor collisions
- [Microsoft Learn: placement_position trait](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/traits/placement_position): vertical-half block-state provenance used by slab/stair-like customs

**Limits:** These describe Bedrock creator components. They do not show the runtime hitboxes of ordinary vanilla stairs/slabs in Minecraft Education, nor certify that Education 26.3 matches every Bedrock 1.26 feature. Vanilla inner/outer stair corners and orientation-dependent neighbor shapes are not included. Synthetic two-box stair shape is an explicitly **modeled candidate**, not proof of vanilla geometry.

## Source boundary

The original DOPPLER generated design remains immutable. The B143 DSL compiles voxels as solid full cells, and **does not capture vanilla block identifiers, stair orientation, vertical half or live entity colliders**. B169 therefore has no basis for silently replacing those cells with stair-shaped block instances.

The source-backed report records:
1. Eight synthetic straight-stair AABB combinations (four directions × upper/lower).
2. One slab AABB and the full/empty collision_box defaults.
3. Missing actual Minecraft block states and missing Education multi-box compatibility confirmation.
4. Nine BLOCKED construction gates, world contacts 0, BuildPlan.operations empty.

## Next actual-game evidence needed

Before changing any world blocks or claiming a functional stair:
- Identify the exact Minecraft Education release/build and the IDs/placement states of the **actual intended** stair and slab variants.
- In an **isolated, user-approved** probe area, collect read-only block state/provenance and real player movement observations across both wings (head clearance, corner joins, stair top and bottom).
- Distinguish full 1×1, partial-foot-contact 2×2 and physically realistic actor width (which may be fractional), rather than treating a 2×2 integer rectangle as the real player.
- Author an explicit material+state→collision-shape mapping only for observed/grounded IDs; all unknown block variants must HOLD.
- Never auto-construct or paste from this review. Prior requirements (15 buildings, 66 floors, 102 stairs) remain subject to live-world protection.

## Open offline review

Run `node scripts/b169-fast-probe.mjs` followed by
`node --test scripts/b169-geometry.test.mjs` and
`node scripts/b169-shape-review.mjs`. The generated `b169-fast-evidence/index.html` is a self-contained static comparator, also attached to GitHub Actions under `B169-Bedrock-Collision-Pixel-Review`.

**Work not used; Draft PR only; no merge to main.**

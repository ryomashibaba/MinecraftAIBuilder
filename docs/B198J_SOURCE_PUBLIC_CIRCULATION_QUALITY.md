# B198J — Public-circulation quality improvement from true compiled source

## Why this matters

The existing B198I model-directed architecture workflow verified that a model-authored plan's selected points corresponded to real B143 solids, air and 2×2 floors. However, two isolated floating 2×2 areas could pass *all* their separate spatial point checks even though there was no supported public route between them. Such disconnected designs are weak for a library, museum, station, school or any other intended publicly accessible building.

B198J fixes this specific architectural-quality blind spot. It does **not** produce fixed types of buildings or add a keyword/template generator; architecture remains genuinely proposed by the independently injected model. It also avoids repeating the pre-existing global source critic: B198C scores topology in general, whereas B198J measures whether the actual model-chosen public floor locations in its plan are mutually connected.

## New engineering

- `source/ai/b198j-circulation-proof.mjs` computes genuine two-wide supported source floor candidates directly from compiled B143 occupied voxels (a 2×2 solid surface with the next **two** layers of 2×2 headroom empty). Four-connected breadth-first traversal groups candidates on the same exact elevation.
- For each pair of model-declared `SUPPORTED_FLOOR` plan anchors **at the same elevation**, B198J reports the verified graph component membership, number of source support squares and whether a path of adjacent supported two-wide footprints exists. A pair of individually valid, isolated floor locations is reported as `NO_CONTIGUOUS_SOURCE_TWO_WIDE_SAME_ELEVATION_ROUTE`.
- `source/ai/b198i-design-director.mjs` now uses independent circulation evidence to select a stronger generated candidate and drive bounded original-design regeneration. If the current best model output matches all anchors but has a disconnected declared same-level route, the **actual missed pair** is returned as source evidence in the next real model call. The model remains responsible for designing a suitable public connector; the evaluator does not fabricate a corridor or overwrite an older source.
- Plan-anchor matching takes priority, then number of verified connected pairs, then existing source critic HIGH findings. At most three B198I original-source attempts, preserving original B143 strict validator and B198G guards.
- A design that has all individual plan points correct yet no contiguous public source route is now `HOLD_SOURCE_CIRCULATION`. If there are no same-elevation anchor pairs to evaluate, it remains `HOLD_SOURCE_CIRCULATION_UNTESTED`.
- **Vertical circulation** is never falsely claimed: a building with multiple declared floor elevations but no real stair/transition certification is `HOLD_SOURCE_VERTICAL_CIRCULATION_UNVERIFIED`, even if all the source anchors and the same-level floor pairs pass. The model is not repeatedly invoked in an attempt to fake a source-only proof of real vertical movement.
- Results are added to the B198I source report as `circulationProof`, which is written alongside the model-authored plan and compiled-source SHA by the existing opt-in `--directed` local Studio path. Existing Studio interaction, 3D review, human Draft approval/rejection and Undo/Redo remain untouched.

## Regression evidence and truthful limits

New `scripts/b198j-circulation.test.mjs` checks that a genuine compiled design with two separated public islands has **all five B198I plan anchors PASS but B198J reports disconnected same-height floors**; a correctly supported wide promenade actually joins those islands, and a model test double proposing the second design is selected in a bounded retry. Repeating the disconnected source remains HOLD. A floor blocked by a new ceiling fails, and multi-elevation transitions remain explicitly uncertified.

This is **independent compiled voxel source evidence**, not a person physically walking in Minecraft. A graph edge across source-floor squares does not demonstrate stair/ladder access, real movement physics, safety, construction feasibility or wheelchair accessibility. Nor do matching floor anchors imply correct Japanese language intent, attractive architecture or independent human semantic/aesthetic approval.

GitHub CI runs all existing B198A–I source and local-Studio tests plus new B198J source circulation tests. Real desktop/mobile Chromium reviews continue to check actual B143 3D rendering, Draft source comparison, approval/reject and history; they use clearly labeled deterministic model test doubles. CI never calls a live LLM or an actual Minecraft world. `NOT_PREPARED`, all nine `BLOCKED`, worldCoordinates null, worldContacts/worldWrites 0, BuildPlan empty.

## Real quality measurement still pending

The previously established next empirical gate is **real** explicit local model invocation, ideally identical frozen Japanese prompts with direct B198H vs. directed B198I+B198J routes and source-rendered independent human ratings. Without access to the user's local model, this phase cannot claim measured improvement in live-model architectural aesthetics or Japanese prompt compliance. The true B198B frozen 12+4 benchmark, B198F independent human evidence, the historic B197 NEBULA ARK and 36 gallery designs are preserved.

## User-approved project boundaries

Chat/GitHub as default; no Work without advance consultation. No paid API, unapproved world construction, destructive asset updates or main merge. New Draft PR stacks on B198I #111; B143 160-element and 160,000 occupied cell caps unchanged. No automatic source revision approvals. The opt-in original prompt-to-Studio `--directed` workflow continues to function without new user operations.

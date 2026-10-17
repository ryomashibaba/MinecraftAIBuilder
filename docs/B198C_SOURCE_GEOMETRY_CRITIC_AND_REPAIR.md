# B198C — Source-geometric architecture critic + bounded real-geometry repair

## Mission

Build real design quality rather than increase the number of independent buildings. NEBULA ARK #37 and the original 21 source modules remain unchanged. This B198C module makes B198A's genuine LLM candidate pathway substantially more useful by providing **real connected-footprint evidence and a guarded correction loop** rather than a model saying "this is walkable" without proof.

## New source geometry audit

The deterministic spatial auditor reads exact B143 **compiled occupied voxel coordinates**, never the LLM explanation.

- Finds every two-wide contiguous 2x2 standing square with **all four floor blocks present** and both body and head layers unoccupied; clusters squares using exact four-direction **same-elevation** adjacency.
- Reports the number of distinct source-supported floor elevations, connected components, the largest connected area, source bounding extents and indicative adjacent elevation changes. The latter are explicitly **not** certification for real Minecraft stairs, ramps or movement.
- Performs a bounded 3D six-neighbor air flood over the padded actual occupied bounding box to distinguish **closed enclosed air spaces** from outside-reachable open space. A sealed chamber may still be completely unusable; it is not automatically called a useful atrium. For huge air grids beyond the bounded scan, reports a precise audit HOLD instead of a fabricated result.
- Raises source-evidenced risks for disconnected galleries, essentially absent two-wide source floors, lack of elevation-adjacency candidates and visual primitive uniformity. Does not equate these risks with a reliable human aesthetic judgment.

### Concrete correction and veto gates

The model receives the source findings, the original complete design and a measurable goal. It must return a **real strict B143 revised source**; there is **no hard-coded prompt keyword to bridge/box mapping** in production.

No accepted candidate may:
- fail strict B143 schema or 160 authored elements / 160,000 source occupied cells,
- mismatch the inherited source SHA or change protected IDs,
- erase or repaint original compiled geometry belonging to protected architectural elements (including destructive added cuts),
- close even one original 2x2 genuinely source-clear standing square,
- exceed explicit source voxel growth budget,
- fail to improve the largest same-elevation connected two-wide source region by the requested minimum,
- overwrite previous user design outputs, access Minecraft world coordinates, contact Minecraft, or approve construction.

A candidate failing any gate is rejected. The model may receive **one** bounded second correction attempt with diagnostic feedback. The final output is an **offline source repair proposal pending visual human review**, never a true in-world build.

## Source demonstration with intentionally mocked model outputs

The adversarial CI fixture contains two disjoint wide original public platforms, a separated upper hall and an unrelated beacon. The (explicitly TEST-ONLY) proposed new width-four connecting metal deck joins the platforms as genuinely compiled 3D. The baseline and revised scene render actual source geometry, and the largest source-supported same-height component increases **184 footprint stations**.

The unit tests also show:
- sealed hollow architectural chamber has actual enclosed air volume; a carved entrance joins it to the exterior and loses its sealed-cavity status,
- a proposed repair adding only decorative lights is rejected despite otherwise valid B143 geometry,
- a new CUT that erases original protected flooring is rejected even when the original protected element IDs remain unchanged,
- a new obstructing ceiling over old clear floor is rejected even if a bridge improved some other region,
- wrong historical SHA is rejected before a model is called,
- a missing model adapter cannot be silently replaced with fabricated deterministic natural-language inference.

The dedicated CI runs **27/27 real tests** (B198A+B198B+B198C) and real desktop/mobile Chromium checks of before and after source models, cutaway controls, reset controls, user-visible mock labels and no JavaScript errors. Browser screenshots are evidence for rendering, not proof that a live model understood Japanese.

## Optional manual real-model repair CLI

When a model provider is separately authorized and configured in a trusted environment, the existing B198A provider can be used without assuming any model ID:

    node scripts/b198c-repair-cli.mjs --base ORIGINAL/source-design.json --goal "２つの高架回廊を接続し元の構造と吹抜けを守って" --protect west-original-platform,east-original-platform --model YOUR_MODEL_ID --minimum-gain 2 --out REPAIR_01

- Requires a private environment OPENAI_API_KEY and an explicitly accessible model ID. It is separately billed; this phase performs **no live paid model inference**.
- No source approval bypass: the existing design's original SHA, exact protected materials and all prior 2wide clear footprints remain intact.
- Produces original-design.json, repaired-design.json, source-critique.json, index.html with actual *two-scene* interactive 3D before/after comparison.
- To avoid duplicate scene IDs, the **viewer** gets separate before/after labels; the saved original and repaired **source** retain exactly the same design ID and full authentic SHA provenance.
- Never overwrite an existing folder; never write the Minecraft Education world.

## Honest limitations

This stage does **not** certify prompts were semantically followed, aesthetic beauty, inhabitable rooms, navigable steps between elevation levels, fall safety, real collision behavior, functioning elevators, or approved Minecraft deployment. The quality diagnosis uses exact voxel topology and some *heuristic risk hints*. More architecture-specific prompts, true model inference and human 3D evaluations remain required before a general AI architect can be called high quality.

### Next planned work

B198D — visual source editor and model-driven revision experience: clear feedback for what was preserved/modified, before/after side-by-side views, version rollback and change proposal controls. Include later live-model semantic evaluation for all 12 B198B categories once explicitly authorized. The core goal remains natural-language design and revision of arbitrary original architecture, not creating a sixth unrelated mega-building.

### Locked safeguards

B197 original NEBULA ARK, all 21 authored strict source modules, previous five conceptual city models, 36 historical gallery concepts, GitHub main and Draft PRs untouched. No Work, no Pages deployment, Minecraft world coordinates absent, no actual Education world contact or writes, NOT_PREPARED, nine BLOCKED gates, BuildPlan.operations=[].

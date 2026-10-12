# B18 / M2 — Pure interior geometry emitters (non-construction)

## Implementation delivered

- One *schematic-local, floating-coordinate* normalized geometry representation for interior partition panels, including axis-aligned bounds for wall thickness.
- Each nominal room door is cut out of its own wall panel, creating two jamb segments and an upper lintel. Validates the referenced boundary, hall side, width/height and detects any non-owning wall solids intersecting the resulting opening.
- Vertical interfaces generate deterministic 1-rise-per-cell hypothetical stair paths inside the shared reserved stair cells, connecting the lower and upper conceptual corridor adjacency. Separate box volumes represent treads and nominated headroom. Detects intersections with **modeled partition panels only**.
- Pure functions; no engine or Bridge import, no material ID, absolute world coordinate, construction operation, or game execution.
- All geometry hypotheses remain explicit parameters. Defaults: wall thickness 0.125 local model units; door clear width 0.8, height 2.2; stair tread thickness 0.25, lateral inset 0.1, nominal headroom 2. These numbers are **design hypotheses**, not Education-approved block specifications.

## Offline static baseline results

| Metric | Result | Interpretation |
|---|---:|---|
| Buildings / floors | 5 / 30 | Immutable conceptual samples |
| Wall panel boundaries | 5,704 | Hypothetical solids, NOT block placements |
| Door voids | 314 | Geometry cutouts, NOT installable doors |
| Stair interfaces / candidate routes found | 25 / 25 | Only reserved-local paths, NOT accessible/usable stair assemblies |
| Door void intersects another modeled partition | 0 | No contact in this simplified model; not structural validation |
| Hypothetical stair path has contact with modeled partition solids | 0 | Does not evaluate slab cuts, windows, roof, actual stair block orientation |

Known issue remains **office/candidate-02 123 footprint cells and 18 corridor cells**, neither is changed. Reviewing candidate geometry is not authorization to apply it. M2 status is `COMPLETE_OFFLINE_GEOMETRY_CANDIDATE`; no physical / engine / runtime verification.

## Fast verification strategy

The former B17 report was regenerated many times from B10-B16; that was slow and unnecessary for each isolated M2 call. B18 now pins the exact B17 report file bytes to `e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d`, also cross-checks the unchanged B17 manifest and the report's own SHA-256. `verify-b18-package.mjs` separately verifies all original 369 files and all B18 package files before validating the generated report. This removes expensive replays without relaxing the immutable-source contract. It does not replace full legacy regression at a release gate.

Tests: 35/35 PASS in this turn; old 408 tests are **not claimed** to have been rerun. Original B17 prior QA: 46/46 is retained as historical evidence. The new tests cover provenance, geometry, stair paths, door opening trimming, negative cases, sealed gate, tamper after rehash, offline CLI output and no network/Bridge imports.

## M3 next (highest value)

1. Define *read-only* adaptation boundary for `general-building-planner` between source-local geometry and existing planner `create` / `fromComposition` and validation flow.
2. Reproduce the engine's **normalization and collision rules** using pinned source evidence; compare with B18 candidate solids. No modifications to frozen engine or live Bridge.
3. Produce a complete list of missing runtime inputs: verified Education material identifiers, world anchor, floor slab openings and clearance, actual door/hinge orientation, stairs landing/facing, and authorization.
4. Build a **dry-run adapter** that refuses to produce executable world commands until all prerequisites are externally verified. Any canary/world mutation stays blocked until the user approves.

No new review UI necessary. Prefer batch development and focused regression. Use Windows once at M4, only if required.

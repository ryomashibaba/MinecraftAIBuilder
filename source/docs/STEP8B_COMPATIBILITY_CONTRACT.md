# MinecraftAIBuilder Step8B — Offline compatibility contract B0

Date: 2026-10-10 | Gate: B0 only | **NOT PREPARED**

## Sources and status

- Latest design source: preserved Step8A.5 original ZIP, source schema `minecraftaibuilder-step8a-review-v3`.
- Historical engine reference: Step7Q `reference_source/engine/src/general-building-planner.js`, `building-grammar.js`, `bridge/src/general-building.js`, `docs/building-grammar.md`. These are **old reference copies**, never the current Windows authoritative source.
- Current installed Windows source: **not supplied**, compatibility **UNKNOWN**. No assumptions of matching Git tree, runtime API, Education version, palette or world.

## Contract by layer

| Layer | Available/verified in Step8A.5 | Still unknown for Windows integration |
|---|---|---|
| Request | constrained Japanese natural-language request, office/apartment/hotel | parser/engine version skew |
| Composition | footprint 15–48 × 12–40 conceptual blocks, 2–10 floors; floor height 4 for office/apartment, 5 for hotel; eight massings | exact registered grammar, variations, round trips |
| Geometry | massing rectangles, local X positive east, local Z positive south, floor Y origin 0 | Minecraft world anchor, facing rotation, signed axes, terrain elevation |
| Detailed plan | rooms, corridors, 2D door intent, staircase/elevator *reservations* | actual doors, passable stairs, lift movement, support, headroom, safety |
| Facade | design intent, style color swatches | physical Education block ID/states, palette and runtime-probed support |
| Optimization | original kept, proposal quality rejection & physical voxel reservation | actual placement geometry and world collision avoidance |
| Safety | build `status=NOT_PREPARED`, `operations=[]`, `commandCount=0` | site identity/session/readiness. All stay false. |

## Historical engine mapping (unproven for currently installed Windows)

Older Step7Q reference source shows `createBuildingPlan(input,options)` exported from `engine/src/general-building-planner.js`. A Bridge route imports it in `bridge/src/general-building.js`. The historical planner expects buildingType, width, depth, floors, floorHeight, style, quality, massing, facadeStrategy, groundFloorStrategy, roofStrategy, orientation, seed, and may produce executable operations. **Do not call it in Step8B**; static inspection only.

Old `building-grammar.js` registers the same three programs and eight massing *names*. Matching names **do not prove matching geometry or material IDs**. In particular historical planner applies seed-derived variations, transforms geometry for orientation and material rules, whereas Step8A.5's concept rectangles are only local reservation geometry. Changes to palette/composition revisions could invalidate old assumptions.

The Step8A.5 `EngineCompatibility.parameters` must not be passed into production planner without validating input schema, origin orientation and each output semantic against **fresh Windows source**. No world placement transform and no block IDs are provided by this B0 adapter.

## Allowed outcomes and evidence threshold

- `UNKNOWN`: snapshot absent, incomplete, outdated/unaligned, or API behavior unproven. Current release deliberately stays `UNKNOWN` even if source file hashes are verified; byte presence is not behavioral proof.
- `ADAPTER_NEEDED`: only after direct source/API evidence shows a precise, safely mappable difference; requires a separately reviewed, offline mapping test.
- `UNSUPPORTED`: source/API clearly rejects one or more required concepts; material/geometry safety must not be silently degraded.
- `BLOCKED`: corrupt/unsafe input, checksum mismatch, protected region mutation, unexpected operation, source inventory unsafe.
- `COMPATIBLE`: **not emitted by B0**. Requires fresh source/API compatibility, materials/states, dimensions/orientation, safe nonexecuting validation, negative cases. Even if earned in a future stage, this does not authorize Minecraft construction.

## Strict invariant set

1. No Minecraft, Bridge, scan, `.mcpack`, world access or construction. No invocation of production planner because it emits operations.
2. No writes to reference source/old evidence, Legacy, config, logs, frozen artifacts or installed Windows project.
3. Missing unknown/mismatch/version skew/freshness failures → no PASS.
4. Contract rejects tampered hash, wrong schema, nonzero command count, any operations, approval flag or unproven provenance flags.
5. The emitted compatibility envelope is intent-only. It holds no world coordinates, block IDs/states, commands or executable plan.
6. SNAPSHOT/B1 is read-only and should be shared only after checking it for embedded secrets. File SHA does not guarantee privacy.

## Exact gate status

B0 SOURCE SCHEMA CHECKED, static Step7Q historical reference examined; B1 Windows authoritative snapshot **PENDING**; B2 cross-version ABI/API/material/axis and dry-run **NOT RUN**; B3 Windows/engine acceptance **NOT RUN**. Step8C construction **NOT AUTHORIZED**.

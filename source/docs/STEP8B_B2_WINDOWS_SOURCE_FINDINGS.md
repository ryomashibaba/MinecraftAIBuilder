# MinecraftAIBuilder Step8B/B2 — Windows latest-source static compatibility audit

**2026-10-10 JST | Status: SOURCE STATIC REVIEW COMPLETED, ADAPTER_NEEDED | Construction: NOT PREPARED**

## Verified evidence and limits

- Windows source snapshot captured by the user at **2026-10-10 18:27:57+09:00**.
- Source ZIP integrity: CRC PASS; manifest has **249 included files / 4,521,313 bytes / 0 size-excluded**; **249/249 SHA-256** PASS. This count is only within the collector's allowlist, not the whole installed project.
- The PS5.1 manifest uses a UTF-8 BOM. B0 source auditor was updated to handle it. The bundled collector script was fixed to use `.ToArray()` instead of `@($records)` and `@($excluded)`; **the previously captured original ZIP was not changed**.
- Current source contains `createBuildingPlan`, `createComposition`, `/plan/building`, a separate live `/build/building` path, `rotatePlanPoint`, `rotateLocal`, `worldPoint` and four-way facing grammar. The four critical source files were pinned by full SHA-256; all inspected source bytes were checked against the supplied manifest.
- **This is static source inspection, not a runtime/Bridge/planner call**. The observed source tree is not proof of the currently running binary, Minecraft session, bound world, site scan, installed Education version, or safe materials.
- Baseline Step8A.5 original: inherited 80/80 tests and package SHA 45/45 from B0 provenance. Current B2 differential: B0 **21/21** + B2 **10/10**, combined **31/31 PASS**, no Windows engine execution. Any previous historical Step7S PASS remains historical only.

## Three sample design compatibility results

| Scenario | Source-pinned conceptual massing prediction | Other findings |
|---|---|---|
| Hotel / slab / north | Rectangles align at local conceptual level | `slab` explicitly requested though absent from hotel's automatic selection; source `massings.get()` does allow explicit registered massings. World anchor/materials unknown. |
| Apartment / courtyard / south | Local rectangles align | Rotation required; global signed axes, anchor, blocks/states unknown. |
| Office / tower_on_podium / south | Local rectangles align | Rotation required; materials/anchor unknown. |
| Office / asymmetric_block / south | **MISMATCH** | Step8A.5 wing = 5, source-pinned `urban_japanese` style variation wing = 6. Local rectangle depths/offsets differ by one block in that formula; need a preview adapter before any use. |
| Office / slab / south | Local rectangles align | Rotation required; materials/anchor unknown. |

This independent rectangle calculator is deliberately source-pinned and never returns a construction plan. The real planner's behavior is **not** claimed to be tested; voxel details, stairs, doors, structure and terrain remain unverified.

## Safety invariant

`BuildPlan.status = NOT_PREPARED`; `operations = []`; `commandCount = 0`; constructionApproved = false; executionAllowed = false. No writes to original Step8A.5, Windows project, legacy files, frozen evidence, world or source snapshot. No Minecraft/Bridge connections or test world builds; no `.mcpack` generation.

## B3 proposed safe next gate

1. Create a **separate** optional conceptual preview adapter reflecting source-pinned style variation while keeping original design immutable; mark only static predictions.
2. Cross-check all eight massing formulas and north/east/south/west directional transforms in independent non-execution tests, including same/different dimensions, seed and style variants.
3. Define explicit source-version + material-validation handshake before any true engine compatibility result. Treat active Bridge/session, Education block states, fresh world/site scan and approval as separate gates.
4. Prevent ANY build routes from consuming intent-only `EngineCompatibility.parameters`; never auto-trigger `/plan/building`, `/build/building`, Minecraft, Bridge or shell scripts as part of B2.

## Windows operation

None required to finish B2. The source snapshot already supplied is enough for this static review. If a later stage requires proof of the **active installed runtime**, a separately approved **read-only** diagnostic may be needed; the source ZIP alone cannot prove runtime identity.

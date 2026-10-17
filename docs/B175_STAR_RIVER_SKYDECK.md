# B175 — NEBULA ARK / STAR RIVER SKYDECK

**Strictly offline modular 3D architecture. Actual new volumetric geometry, not QA-only progress.**

B174 is inherited without modifying original B172/B173/B174 source files. A new **third** strict B143 module creates one enormous 100+-block uninterrupted Sky River public promenade, three towering glazed canopy plazas, cantilevered viewing islands, elevated sky gardens and gallery decks, physical pillar grids, bridge vaults and dramatic diagonals. The 36 historic Pages models remain untouched. This is still an iteration of the **37th** independent candidate, not a fictitious 38th.

### 3D additions / modular boundary
- New `source/ai/b175-star-river.mjs` holds genuinely authored `box`, `ellipsoid`, `beam`, and `torus` geometry.
- B173's 151 elements, B174's 74-element second module and B175's own new third module are separately strict-B143 validated, and merged deterministically with parent-volume occupancy precedence. No arbitrary increase of the B143 **160-elements-per-document**, **160k occupied voxel**, **1.75m work** or **500k bounding cells** caps.
- The actual new voxels are quantified after full compilation and compared with the B174 source geometry, using SHA256 pinned source and merged-geometry hashes.

### Circulation geometry versus actual Minecraft walkability
- A **targeted three-cell local design cut** at (72,39,46..48) removes an inherited upper arrival-deck collision at the final staircase interface. Original B174 source remains frozen and the cut is explicitly whitelisted in the B175 composer; this is not an approved Minecraft block deletion. Regression tests assert exactly which old cells existed and that the new composite clears them.
- The B174 Skycanyon's 15 individually supported 2x2 stations are upgraded with **14 adjacent mixed-height step-interface validations**: a contiguous lower/upper tread edge, one-cell nominal rise, two-cell upper headroom, staging support and future station clearance.
- These are offline voxel/collision *proxies only*, not certified continuous movement, vanilla stairs or player step mechanics; in fact, the interface's two floor columns are at different heights. In-game walking, jumping, fall risk and collision calibration remain **HOLD**.
- The B175 promenade is located at design Z3–4 instead of Z11–12: the inherited protected B172 orbital ring crosses the latter positions at Y60, so this routing deliberately avoids that obstruction without changing B172.
- The new high Sky River horizontal gallery at design Y60 has a **100-move uninterrupted, 2x2 fully supported flat route** with two blocks of clear headroom. Old flat lower (102) and upper (98) routes remain supported and unobstructed.
- Source XYZ are local design cells, **never actual Minecraft world coordinates**.

### Lightweight proof + visual QA
- `scripts/b175-fast-probe.mjs` captures actual new cells, three-module safety report and computed stair-interface evidence.
- `scripts/b175-macro.test.mjs` guards exact cell geometry, inherited flat corridors, B143 validation, fail-closed world gates, and offline viewer integrity.
- `scripts/b175-build-preview.mjs` exports fully self-contained interactive offline canvas viewer plus all three source modules.
- `scripts/b175-browser-qa.mjs` uses actual Chromium on desktop and mobile to check 3D canvas painting and focus controls, and save screenshots.
- `.github/workflows/b175-fast.yml` runs these targeted jobs without the slow all-history Pages rebuild.

**Nonnegotiable safety:** `readiness=NOT_PREPARED`, all nine `BLOCKED`, `constructionApproved=false`, `worldContacts=0`, `worldWrites=0`, `worldCoordinates=null`, `BuildPlan.operations=[]`. No Work, no Education-world write, no main merge, no publication claim. No in-game mobility or physical structural certification.

Next B176: prioritize genuinely connected, realistic step movement using measured Bedrock/Education collision only once approved read-only evidence becomes available; meanwhile expand expressive multi-floor geometry and interior gallery composition. Avoid repeatedly creating documentation without building.

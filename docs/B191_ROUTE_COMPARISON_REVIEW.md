# B191 — Dual-route source inspection and interactive comparison

B191 advances the prior B190 source-only virtual gateway between the independently compiled **NEBULA ARK (142,773 cells)** and **HORIZON DOCK (19,152 cells)**. The original two buildings remain completely untouched, and all 17 historical independent B143 authoring designs remain individually capped at 160 elements and the main global strict B143 MAX_CELLS=160,000.

## What actually changes
Previous B190 reports Y73 and Y61 as strict HOLD (no uninterrupted 2wide source path), and Y69/Y65 as both geometrically valid. B191 independently rebuilds the 3D voxel occupancy source at each **valid** height and derives an exact **x-z coordinate-by-coordinate source route**, rather than pretending the two destinations are already connected in a Minecraft world.

For each source-only route, a deterministic bounded heading-aware Dijkstra searches 2wide player standing-squares against the real voxel occupancy of both original models, virtually offset by the same explicitly labelled review-local X=132 (NOT game coordinates). It considers 2 empty vertical body/head cells, nearest standing collision positions, approximate new floor needs and turns. It then recomputes the exact UNIQUE new source floor cell set beneath the recovered route, verifies all original/annex cells unchanged, audits every step and exactly reports route path SHA-256, source floor SHA-256, steps, turns, floor cells, blocker counts, and a transparent cost formula. This model can identify a shorter or less expensive candidate versus earlier unweighted B190 BFS; do not claim improvement without actual measured values.

The preferred one of Y69/Y65 is selected on measured score. B190 invalid levels Y73/Y61 remain HOLD, not forcibly connected.

## Visual review output
Preserve the complete independent B189 original five-scene 3D orbit viewer: whole NEBULA ARK, three genuine independent view cuts of its real source district cells, and the independently compiled HORIZON DOCK building. Do not insert a fake combined >160k-monolith into that renderer.

Add a TWO-LEVEL explicit source-topology XY/XZ floorplan panel computed from the actual route steps and actual neighbouring source-collision footprints at standing Y69 and Y65. A one-click Y69/Y65 switch updates the visible plan and metrics (full route length, bends, number of hypothetical floor cells, near obstacles, comparison score), with desktop/mobile Chromium direct-control tests and screenshots of both source-grounded charts.

This planning visual represents a potential conceptual connection ONLY; the full combined Minecraft Education environment, world terrain, real player physics, dynamic collision, structural/fall protections and actual construction permission remain NOT VERIFIED. No world BuildPlan, no actual Minecraft XYZ deployment, no location-to-world mapping.

## Enforced safety
B190 historic positives/negatives and original B187 21 source-level nodes / 30 predecessor-backed links preserved. Each original model remains under 160k cells, 17 B143 modules intact, no merged >160k source model, no originals rewritten, all 9 construction gates BLOCKED, readiness NOT_PREPARED, constructionApproved=false, worldCoordinates=null, worldContacts=0, worldWrites=0, BuildPlan.operations=[]. Draft PR only, no merge to main, Pages deployment, Work mode, or actual Minecraft contact.

## Recommended B192
Use B191 exact route traces to model alternative skybridge designs (visually supported trusses, rails, light fixtures) under their own source module budgets and align conceptual relative heights; perform physical walking validation only in an explicitly approved safe test-world workflow, separate from these protected main design sources.

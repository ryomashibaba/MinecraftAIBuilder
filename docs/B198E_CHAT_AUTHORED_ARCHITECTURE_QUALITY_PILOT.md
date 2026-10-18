# B198E — GPT-6 Chat-authored original architecture quality pilot

## Purpose / deliberate scope

The current MinecraftAIBuilder program is **free-form natural-language architecture generation and safe revision**, NOT merely creating an endless number of hand-authored showcase buildings.

The user prioritizes QUALITY. B198A–D created a genuine optional LLM provider boundary, strict B143 compiled source geometry, source-only corrective audit, and an interactive versioned approval studio. However, all prior design semantic benchmarks used fixed test fixtures rather than new responses to real Japanese architecture tasks. B198E addresses that gap with an **actual GPT-6 Chat-based architectural source-authoring pilot on four real frozen B198B Japanese benchmark prompts and their four Japanese follow-up revisions**, entirely inside Chat/GitHub.

This is a useful true model-assisted architectural design attempt, **NOT** a production unattended API-provider benchmark. It is four targeted cases out of twelve; eight new-design benchmark prompts remain NOT_RUN. We do not claim that model consistency, unseen genres, Japanese comprehension accuracy, human-rated aesthetic beauty or real in-game construction is proven.

### Four individually designed source buildings

| B198B benchmark | GPT-6-authored original concept | Source occupied voxels | Authored geometric operations |
| --- | --- | ---: | ---: |
| c01 | Coastal public library: separated multilevel reading wings, central source-air atrium, curved translucent elliptical roof, upper star-viewing glass lounge | 23,833 | 38 |
| c03 | Industrial harbor: distinct cargo quay / passenger promenade, five cargo modules, tall two-legged traveling gantry silhouette and hoist, raised glass control sphere | 22,710 | 27 |
| c05 | Three-roof Japanese temple: three procession gates, long sando, wooden Great Hall, three progressively smaller roof tiers, hanging gardens and a secondary light beacon | 29,908 | 34 |
| c08 | Aerial exchange station: three wide source-supported horizontal station platforms, upper concourse and crosswalk, huge exterior diagonal structural ribs and a vaulted glass suspended roof | 39,193 | 34 |

These eight detailed original/revised designs are authored as exact, editable B143 geometric source — boxes, beams, elliptical roofs, cylindrical towers, glass shells and orbital rings; never screenshots drawn to appear like 3D and never mere keyword-to-geometry rule tables in production. Their source operations, materials and exact local coordinates are authored specifically from the B198B prompts.

### Four real follow-up source revisions

- **r01 library**: preserved original dome and added a significantly larger circular glass stargazing ring and upper light ring. *Important honest semantic gap*: this does NOT create a newly enclosed larger spherical lounge; it is a transparent, open architectural expansion. Request completeness remains **PARTIAL / HUMAN REVIEW REQUIRED**, NOT full PASS.
- **r02 harbor**: added raised, slanted gantry upper braces and crane jib *without cutting the original cargo platforms, passenger promenade or control tower*. Machine movement and load-bearing remain NOT_CERTIFIED.
- **r03 temple**: added one outer ring around the side light tower, preserving the original approach and central temple roof tiers.
- **r04 station**: added a dramatically broader higher floating roof tier, leaving original platforms and old atrium clear. *Honest limitation*: the new highest canopy is not yet structurally attached and would be a critical structural HOLD for real building use. We do NOT claim a working constructed canopy.

### Independent source facts, not flattering LLM explanations

Each new design is recompiled by the ORIGINAL B143 strict compiler and independently checked for legal DSL geometry, material and primitive variety, source height, source actual occupied volume and 2x2 genuinely floor-supported squares with two headroom voxel layers. Four sampled task-specific geometric proof points per model (where relevant) verify actual occupied/empty coordinates, e.g. central atrium void vs visible reading wing floors, separated port zones, distinct main temple roof levels and station platforms plus raised concourse.

**4/4 selected creation tasks satisfy the predeclared generic source goals.** This is a source syntax/shape result, **not** a score for whether the building looks like a good Japanese temple.

All four revisions are separately validated by the B198A true candidate acceptance path with exactly inherited source IDs and exact original SHA. We recompile exact source geometry of named protected parts and compare all original material voxels after revisions; crucially we additionally re-scan **all source-supported 2-wide clear floor squares** of the original full geometry and require zero newly obstructed prior source-floor locations. The initially authored r01/r02/r04 edits had interference and were **revised until the original floor-interference counts were exactly zero**; this is actual design iteration prompted by verification, not concealed failed cases. B198B "same element ID" does NOT excuse a destructive later CUT.

### Candid limitations / missing evidence

- The c01 library star lounge has architecture but no proven stairs/elevator and its r01 ring is not a larger **enclosed** spherical room.
- The c03 harbor is not a physically working port; waters, lifting, player circulation, block palettes and cargo mechanics are conceptual.
- The c05 temple has slab-based layered roof tiers rather than fully faithful curved Japanese tiled roofing; cultural fidelity and realism require human review.
- The c08 station's raised canopy is not load-certified; the revised very high additional canopy is **unattached** pending structural design. This is explicitly flagged rather than celebrated as a finished real station.
- The eight other B198B original creation tasks — **c02, c04, c06, c07, c09, c10, c11, c12** — have NO executed AI-generated result in this phase.
- Actual provider-backed repeated unattended natural-language-to-source inference, human semantic scores, artistic aesthetic evaluation, zero-shot generalization and multiplayer Minecraft Education deployment have NOT been tested.

There are no claims of high-quality final architecture simply because voxel counts are large.

## Real user-review deliverables

GitHub Actions exports:
- a **single offline source-backed 3D HTML gallery of eight actual compiled architectural scenes**, original and revised pairs for four benchmark cases, with interactive case buttons, floor cutaway, materials and orbit controls;
- eight *authentic original* editable B143 design JSON documents, no preview-only changed IDs in these source files;
- SHA-checked full machine-readable independent source audit: source occupancy, historic floor protection, human rubric placeholders, objective/frozen source goal results, warnings and exact case provenance;
- a source-pinned manifest explicitly listing the eight unattempted creation cases;
- an **optional browser-based human rating panel** for each of the eight scenes. This panel starts at UNREVIEWED. A reviewer must fill every 0–4 original frozen B198B criterion and at least 15 characters of visible evidence before JSON export is enabled. No data is sent to a network service. Export declares human identity not independently verified and records the exact source SHA; CI intentionally does NOT retain or pass off its synthetic UI test ratings as real human evaluations;
- actual Chrome desktop/mobile screenshots for each of four original-and-revision source pairs, with evidence of distinct *rendered pixels*, not fabricated claims based only on source count.

The separate dedicated CI executes all existing B198A–D regression tests plus new source provenance/geometry tests. Actual browser tests verify source images and rating controls, NOT that the given design is aesthetically impressive.

## Reproducibility

Source module: source/ai/b198e-chat-authored-pilot.mjs
Independent audits: source/ai/b198e-source-evidence.mjs
One command to generate exactly eight source-backed preview scenes:

    node scripts/b198e-build-review.mjs

The output is saved to b198e-evidence/. The script refuses to overwrite pre-existing outputs. CI archives files and desktop/mobile screenshots. No user local steps were necessary to complete B198E's GitHub implementation and CI.

## Strict safety and original-project protection

Nothing in this phase connects to a real Minecraft Education world, a socket, WorldEdit, a mutable built city, or the existing NEBULA ARK site. Construction is NOT_PREPARED, all nine gates BLOCKED, worldCoordinates null, worldWrites=worldContacts=0, constructionApproved false, BuildPlan.operations empty.

Existing NEBULA ARK B197 main, other 21 strict source modules, all 36 historical gallery designs and the five independent macro concepts are not modified. All new modules are in the B198E-specific research branch, stacked on the previous B198D Draft PR; no main merge, no Pages publication, no automatic Work usage and no paid model API calls.

## Next quality-first phase

**B198F** should focus on (a) the other eight frozen B198B creation tasks, (b) changing from one-off manually Chat-authored code into a genuinely repeatable model-driven **automatic arbitrary Japanese free-form prompt-to-DSL** run, optionally via a private self-hosted OpenAI-compatible local model endpoint with explicit user control; and (c) truly independent human observation using the optional rubric with source-linked evidence and bounded repair. The important next step is demonstrating real *repeatability and semantic correctness* rather than another new megastructure or self-awarded score.

Do NOT mark the full 12-genre real-model benchmark PASS merely because this four-genre chat pilot and browser renderer passed.

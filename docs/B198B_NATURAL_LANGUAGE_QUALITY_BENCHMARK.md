# B198B — Quality-first real-model architecture benchmark

## Scope and truthful completion status

B198A introduced the genuine model-to-B143 architecture boundary. B198B builds a **frozen, diverse natural-language quality evaluation pipeline**, geometry introspection, a stronger voxel-level revision protection proof, and separate evidence-based human semantic scoring. It does **not** claim a model understood Japanese unless real provider responses and human review have been observed.

The benchmark has **12 original Japanese design briefs** (library, amphitheater, industrial harbor, housing, temple, observatory, aquarium, transit hub, botanical complex, art museum, school, alpine shelter) and **4 context-dependent source revisions**. Each task has three or four distinct human-reviewed requirements. These criteria are not keyword-to-geometry generation rules.

## Three independent evidence levels

1. **Strict source creation:** B143 compiles exact model-authored box / beam / cylinder / ellipsoid / torus cells within unchanged limits. B198B checks actual occupied voxels, source hash, material variety, source-bounds spans, shape family variety and *source-supported* 2×2 floor-footprint squares with two free headroom rows. The longest contiguous row is reported as a local geometric fact only.
2. **Meaning, aesthetics and useful internal layout:** All per-case Japanese requirements remain **UNREVIEWED** until someone actually examines the generated 3D and scores every criterion from 0–4 with written observations. A code-generated quantity or self-assessment is not a substitute. Even after human input it is marked self-reported, not independently authenticated.
3. **Actual Minecraft Education:** source floor support is not proof of walking, connected stairs, guardrails, structural safety or construction. All real-world gates remain NOT_PREPARED / 9 BLOCKED / worldWrites=0.

An important novel integrity check: **simply retaining a protected design element's ID is NOT enough**. A new CUT can erase its compiled voxels while its original JSON is unchanged. B198B independently re-compiles protected source elements, intersects actual parent occupancy, and compares their original material and coordinate footprints with the fully revised compiled output. Missing or repainted protected voxels force HOLD.

## Live inference is optional, explicit and separately billed

There is no authorized provider key available to GitHub CI. The only way to run a genuine LLM quality evaluation is to set the API credential in a trusted environment and explicitly select an accessible model. No model ID is assumed. No live model was invoked in this phase.

Examples, only when independently authorized:

    node scripts/b198b-quality-benchmark.mjs --model MODEL_ID --out B198B_SAMPLE --case-limit 2

For the complete evaluation:

    node scripts/b198b-quality-benchmark.mjs --model MODEL_ID --out B198B_FULL --case-limit 12 --with-revisions

One proposal attempt per prompt is the default, to measure first-attempt reliability. Opt in to a bounded repair attempt with --attempts 2. A large evaluation can consume API tokens and is NOT silently scheduled.

Successful proposals receive source-design.json, source-audit.json, and a complete offline interactive index.html. Invalid candidates receive explicit diagnostic HOLD. Every run receives B198B_RESULTS.json, a human-score placeholder for each attempted case, and hard-coded construction prohibition. Existing output directories are never overwritten.

The CI uses a deliberately unrelated theater fixture for a library prompt, to demonstrate **source compilation can PASS while the design does NOT match the user's request**. Fixture previews visibly state this is NOT real AI model inference. No false label of AI comprehension or completed design quality is given.

## What B198B really tests

- 12-genre / four-revision frozen natural-language and evaluation structure
- source-coordinate geometry, 2x2 floor support and head clearance, exact contiguous runs
- actual compiled protective voxel integrity across revisions, including malicious new CUT elements
- source goals vs natural-language semantics vs real-world execution as separate statuses
- per-criterion 0–4 human rubric requiring written visual evidence
- two fixture-mode genuinely compiled source designs and one source revision with standalone 3D review pages
- malformed model output becomes HOLD, never a fake 3D success
- inherits all B198A prompt/revision schema, retry and zero-world safety tests

**A green B198B CI means these evaluation mechanisms work. It does NOT mean that any actual LLM passed the 12 real architectural challenges.**

## Next quality milestones

B198C: inspect and improve internal usable space, voids, circulation, ramps and stair-like transitions in the strict source geometry, plus a bounded critic-driven correction loop; identify unsupported Minecraft physics instead of fake PASS.

B198D: streamline real user-controlled conversational revisions, versioning and 3D before/after comparisons, with minimal actions.

B199 onward: optional explicitly world-approved construction preview / journal and readback. Do not connect source-only design proof to Minecraft Education commands without separate authorization.

## Non-negotiable protection

B197 original main NEBULA ARK, all prior 21 B143 modules, five independent architectural concepts, the historical 36 source designs, GitHub main, Draft PR ancestry, physical Education experiment and all Minecraft world files remain unchanged. No Work, no Pages publication, no merge to main, no world writes or permissions inferred from prior test worlds.

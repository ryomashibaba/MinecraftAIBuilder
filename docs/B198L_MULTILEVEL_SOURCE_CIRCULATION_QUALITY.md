# B198L — Multilevel Source Circulation Quality (Conservative Step-Chain Evidence)

## Objective and preserved architecture project policy

B198J provided real strict B143-voxel evidence for same-elevation public floor connections. But multiple separate, individually usable floors at *different heights* were always `HOLD_SOURCE_VERTICAL_CIRCULATION_UNVERIFIED`, with no possibility of targeted model feedback. B198L adds bounded **candidate two-wide stepped source connectivity**, addressing a real functional-design gap. No fixed building genre/template is generated; the model designs its own geometry.

**This is source-only evidence.** Neither this new graph nor a successful unit test proves real Minecraft walking, valid full stairs, collision safety, player jumping, access from the ground, aesthetics or user instruction comprehension.

## Exact mechanics

- New `source/ai/b198l-step-chain-proof.mjs` independently verifies original source and compiled geometry hashes using the unchanged B143 compiler, with the unchanged 160 element/160000 occupied voxel limits.
- Builds every 2×2 source support candidate (all four floor cells occupied; all eight headroom cells across the two next Y levels are air). A roof or upper material over a stepping footprint invalidates that candidate.
- Same-level adjacency: footprints offset by one cell along X or Z. A candidate +1 or −1 elevation transition requires two full 2×2 footprints sharing a **side** (offset exactly two cells on X or Z), with both standing headroom volumes clear. Does **not** traverse diagonals, floating gaps, or multi-block jumps.
- Derives candidate connected components across all source elevations. For the model-declared floor anchor pairs at *different elevations*, explicitly records whether their surface footprints share a source-supported stepped component, which pairs are disconnected, and actual source hashes.
- Additional strict proof `allSourceSupportedFloorsInOneSteppedComponent` is true **only when** every supported 2×2 square in the entire strict compilation belongs to a *single stepped source component*. Hidden isolated floors therefore prevent this certificate even if model-selected public anchors connect.

## Correction to inherited B198C false-positive classification

B198C's original same-level source critic reports `FRAGMENTED_PUBLIC_SOURCE_FLOORS` as HIGH when its largest **single-level** component accounts for less than half of all supported standing squares. This can be accurate about horizontal geography but misleading for a multilevel layout joined by successive small steps.

B198L **does not modify B198C** or automatically relabel architectural quality. B198I keeps the original B198C HIGH risk count and findings for audit. It may *mitigate only that one same-level fragmentation finding* when:
(1) all model-declared cross-height public floor pairs are linked by the conservative two-wide step graph **and**
(2) absolutely all source-wide supported standing squares belong to the same step-connected component.
Other HIGH problems remain intact. Reports include raw B198C and effective source-level risk separately. The result label is `SOURCE_MULTILEVEL_STEP_CHAIN_REVIEW_REQUIRED`, **never** Minecraft walking PASS.

## Model iteration and Studio integration

The existing `--directed` local source workflow from B198I and B198J automatically calls the B198L source analyzer. The returned source-SHA-pinned JSON report now includes `multiLevelSourceProof`, detected disconnected upper/lower public floor anchor pairs and mitigated-vs-original B198C risk.

Failed cross-height routes are fed back as grounded model-correction requests bounded by B198I (up to three original-source attempts and B198G's existing limited repairs). The AI, not a fixed geometry generator, must independently propose a better staircase/landing layout. When it simply repeats an identical B143 source SHA without objective progress, source generation stops early, avoiding additional unnecessary local-model calls.

Status distinctions:
- `HOLD_SOURCE_PLAN_OR_TOPOLOGY`: real source anchors fail or unresolved HIGH source risk remains.
- `HOLD_SOURCE_CIRCULATION`: required same-height public floor anchors lack a source-level path.
- `HOLD_SOURCE_VERTICAL_CIRCULATION_UNVERIFIED`: multi-height anchors exist but no supported step chain links them.
- `SOURCE_MULTILEVEL_STEP_CHAIN_REVIEW_REQUIRED`: all declared cross-height anchor pairs and source floors have a conservatively source-supported step chain, yet stair mechanics and in-game access remain untested.
- `SOURCE_PLAN_ANCHORS_PASS_HUMAN_REVIEW_REQUIRED`: single-level path and source geometry checks, still no human architectural certification.

The generated building is still only an original source design candidate. The existing B198D Studio revision interface, human approval/reject/Undo/Redo and B198K direct-vs-directed 12+4 frozen benchmark persist untouched. No new Minecraft build execution or approval path.

## Actual CI evidence / nonclaims

`scripts/b198l-step-chain.test.mjs` exercises split floors that pass all individual B198I plan anchors, an independently compiled realistic stepped 2-wide middle landing, intentionally blocked step headroom, real missing-floor and forged-source-hash refusal, diagonal/corner-only non-route, bounded model-directed retry driven by exact failed pair evidence, and conservative HOLD when a model does not improve.

GitHub Actions re-runs inherited B198A–K tests, real desktop/mobile Chromium source-view, Studio history and A/B review form. These are **explicit test doubles**, not a live Qwen, Gemma, GPT-6 or other provider output.

## What must happen before claiming genuine architectural progress from AI

A **real** model-backed run of the existing B198K A/B 12 creation+4 revision tasks remains necessary. The `scripts/b198k-local-comparison.mjs --model MODEL_ID --out NEW_DIR` entry point targets an explicitly started compatible local server on `127.0.0.1` and records source/provenance/human-review HOLD. It is not auto-run here. The next validation gate should examine actual generated 3D scenes and independent human observations before introducing more source-risk logic.

No Work use, no paid API tokens, no Minecraft Education world I/O, no deletion of NEBULA ARK or historic 36 gallery designs, no earlier Draft PR base changes, and no main merge. All nine gates remain `BLOCKED`, `NOT_PREPARED`, world writes and contacts 0.

# B198H — Local-model architecture Studio + full 12+4 benchmark

## Objective

Bring the existing B198D user-facing source-only 3D approval Studio and B198B frozen 12-Japanese-architecture + 4-follow-up-revision tests onto the real, explicitly requested, no-paid-API localhost adapter from B198G. Retain all B197–G history, NEBULA ARK, B143 maximum 160 elements/160,000 occupied voxels, the existing Draft PR sequence and real-world construction ban.

This phase **implements integration**. The tests use deterministic generator doubles. **No actual local language model or API ran in CI**. Real arbitrary Japanese instruction comprehension, visual aesthetics, stairs, Minecraft walking and in-world placement are not certified.

## Source-only interactive Studio

After starting a compatible local OpenAI-style chat-completions model separately (typically listening on 127.0.0.1), initialize a fresh Studio with an existing original, strict B143 JSON:

```sh
node scripts/b198h-local-workflow.mjs studio --project ./my-architecture-project --design ./original-design.json --local-model YOUR_EXPLICIT_MODEL_ID
```

For subsequent sessions omit `--design` to open the same versioned studio. If no `--local-model` is supplied, the 3D viewer and stored source version history remain available, **but creating AI proposals is disabled** rather than faked.

The launcher injects only the B198G loopback `127.0.0.1` model adapter into the unchanged B198D source approval Studio. The user can propose Japanese edits, protect named parts, preview before/after source-backed 3D scenes, and **separately approve, reject, Undo or Redo**. The approved design does not change until explicit source-design approval. This is **not** Minecraft world build approval. The existing local-only Host, Origin, CSRF and request size protections remain active. Optional `--port 0` lets the Studio choose a free local browser port.

This Studio integrates live model authorship via B198D's existing strict source revision approval contract. The separate B198G bounded geometry-improvement loop is available for new creation via `scripts/b198g-local-design.mjs`; **automatic topology repair is not silently applied to every B198D user revision**, since that might violate the user's intended localized change.

## Frozen Japanese 12+4 model quality test

After explicitly starting an appropriate local model:

```sh
node scripts/b198h-local-workflow.mjs benchmark --local-model YOUR_EXPLICIT_MODEL_ID --out ./new-b198h-evidence
```

Default: attempt all **12 original** and **4 dependent revisions** in frozen B198B order. Use `--cases 1..12` for a bounded partial run, `--no-revisions` to omit revisions, or `--endpoint http://127.0.0.1:PORT/v1/chat/completions` for an explicit alternative loopback port.

The CLI will not silently call a remote or paid model. It refuses nonexistent model arguments and previously existing output destinations. In B198H, the reused B198B runner writes independently compiled editable B143 sources, individual source QA files and standalone real source-backed 3D HTML viewers to an **offline** directory. It does not write to Minecraft.

B198H adds `B198H_INDEPENDENT_SOURCE_EVIDENCE.json`, which preserves all 16 frozen case IDs and classifies not-run tasks separately from model/DSL failures. Every saved successful source is recompiled, independently source-critic assessed, source- and geometry-SHA pinned, and explicitly labeled `humanSemantics: UNREVIEWED` and `humanAesthetics: UNREVIEWED`. A genuine output may pass objective voxel-shape goals without passing human visual or semantic evaluation.

For dependent revisions, the real new model's full candidate source is rejected **before B198B persists the candidate** if it deletes any original material voxel, alters any original material or obstructs any previously two-wide/two-headroom original supported floor. The B198A strict validation and B198B individual source checks remain in place. This conservative contract may refuse legitimate large-scale redesigns: such repairs require a separate, explicitly reviewed project direction rather than weakening the original preservation gate.

The benchmark result never reports automatic aesthetic certification, real in-game walking or approved construction, regardless of model source counts or quality-gate compliance. Even a complete 16-source run is only `ALL_16_SOURCE_COMPILED_HUMAN_QUALITY_HOLD` until actual independent human reviews are supplied. Errors remain `MODEL_OR_SOURCE_HOLD` and unattempted cases `NOT_RUN`. The local provider label identifies the requested protocol but is *not* independently attested model identity.

## Security and usage boundaries

- The localhost provider only accepts an explicit model ID and a literal `http://127.0.0.1:PORT/v1/chat/completions` endpoint. B198H additionally disallows following HTTP redirects to remote hosts.
- No API credentials, no remote paid endpoints, no private world sockets, no WorldEdit, no world coordinates, no BuildPlan operations.
- `NOT_PREPARED`, nine `BLOCKED`, `constructionApproved=false`, `worldContacts=worldWrites=0`.
- The historical B197 NEBULA ARK, 36 galleries, earlier strict source modules and existing Draft PR bases remain unchanged.

## Evidence

The B198H new integration tests exercise the inherited versioned Studio with an injected deterministic model reply over its actual local HTTP API; verify that unapproved model output stays in Draft and rejection leaves the original SHA untouched; verify the disabled-without-model UI; run an actual frozen B198B selected original+revision pipeline using deterministic source fixtures and independent compilations; enforce full 16-ID reporting with 14 NOT_RUN for partial tests; confirm dangerous added source ceiling over an original floor causes a revision HOLD rather than a false quality PASS; and test refusal to overwrite an existing output directory.

CI also runs all B198A–G regressions and real desktop/mobile Chromium browser automation of the original B198D approval/reject/Undo/Redo interface. **Browser rendering and fixture-model tests are not evidence of true local-model architectural quality.**

## Next, quality-first

Next B198I should first obtain explicit user approval for a concrete, already-running local-model target before using local resources, run the genuine 12+4 suite and source-backed desktop/mobile review, compare architecture aesthetics and Japanese intent against frozen rubric, then feed observed failures into bounded model-source repair. Only after actual human/visual evidence should quality claims be elevated. No need to build another unrelated giant showcase in place of AI generality.

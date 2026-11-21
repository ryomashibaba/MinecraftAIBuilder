# MinecraftAIBuilder — B198Z-R91
2026年10月23日 JST | Branch `feature/b198zr1-protected-architectural-revision` | Existing Draft PR #128.

## Architectural challenge
The R90 source-registered review identifies an actual geometric flaw at **right wing reading tier 2**: one side of an R88 gallery end lies outside its true source R84 landing triangle (minimum barycentric approximately −0.01037). This is not repaired by adding a visually overlapping bridge or ignoring a small epsilon.

## R91 independent ACTIVE visual variant
Rebuild only the final R88 right-tier2 research bay as a **gradually narrowing lantern-gallery turnout**:
- Keep R88 gallery entrance and intermediate width/edges, historical right tier2 R84 actual pad, surrounding full R87 wing architecture, original R88 shell bracket, and the other 6 tiers.
- Search final-edge taper factors 0.95 down to 0.7; require both endpoint projected barycentric weights to have 0.07 positive margin, vertical deviation no more than 0.003 research units, and zero sampled intersection with original outer/inner shell, roof, and R87 furniture.
- At factor **0.75**, the terminal width becomes **0.024** normalized research units (was 0.032), and minimum true-pad barycentric is approximately **+0.07556**.
- Model 2 replacement source bay faces, 3 within-true-pad threshold faces, and 6 compatible alternative rail/upright surfaces = **11 new triangles**. The ACTIVE OBJ excludes only 8 obsolete research triangles (2 R88 failed end facets and 6 R89 associated rail/upright facets), retaining the rest as-is. The R90 original and complete evidence chain are preserved separately without mutation. Do not describe the active replacement as preserving all R90 faces bitwise: the filtered visual variant intentionally differs.
- Source R90 has **4,291 triangles**, the active replacement view has **4,294**. This is a parametric art prototype, not proof of physically safe walking.

## Strict provenance and intermittent CI
R90 Windows/Ubuntu CI in runs `39857833079` and `39857839912` suffered intermittent R85-to-R84 horizontalLength mismatch, although Ubuntu in one run passed. 65 repeated R84 source builds were deterministic in the current JS evaluation, so root cause remains open across CI runtimes. R91 extends metadata-only R85 strict-mismatch diagnostics to include the saved/recomputed test distance and corresponding synthetic source/target points; **full JSON equality is still required**. Never suppress or accept mismatches by tolerant assertion, skip tests, or weaken source SHA evidence.

## Existing one-step output
Keep R60 review integration. Add:
- `R91_TRUE_PAD_TAPERED_RIGHT_TIER2_EVIDENCE.json`
- `R91_TRUE_PAD_TAPERED_RIGHT_TIER2_ACTIVE_VARIANT.obj`
- `R91_TRUE_PAD_TAPERED_RIGHT_TIER2_ARCHITECTURAL_REVIEW.html`
Historical R90 comparison and original failed tip remain inspectable via their existing outputs, alongside the corrected alternative model.

## Boundaries
R91 is **NOT_PREPARED**, nine gates **BLOCKED**, `BuildPlan.operations=[]`, world read/write/contact 0, real Qwen/Gemma calls 0, independent artistic review NOT_REVIEWED. The source Qwen c01 raw SHA remains frozen. No main/Freeze/world/construction changes and no ready/merge/close for Draft PR #128. Neither a 0.024 unit corridor nor positive barycentrics certify real human width, clearance, safe stairs, railings, load transfer or Minecraft avatar travel. The c01 architectural sample is not the universal design algorithm for natural-language building generation.

Next: inspect front/oblique/side/aerial/inside artistically and programmatically confirm global entry-to-lounge connection, realistic bookstack floor expansion and actual visitor circulation; trace numeric CI mismatch with captured witnesses if it recurs.

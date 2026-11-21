# B198Z-R90 — source-surface doorway, genuine source deck/pad seams

2026-10-23 JST. Continuation of MinecraftAIBuilder, Draft PR #128, `feature/b198zr1-protected-architectural-revision`. NOT a new independent construction project.

## R90A: Stable source-terrace candidate selection
Prior R84 evidence mismatch was identified at `tiers[*].connectionReview.horizontalLength`. The R89A integer sqrt made plan length deterministic, but some historical CI runs still intermittently failed. An unstable nearest-face choice can also change endpoint coordinates. R90A chooses the candidate via a **coarsened, quantized research score** with explicit segment-index/triangle-index tie order instead of comparing the lowest binary bits of `Math.hypot`. Added 15 repeat source-geometry builds as regression. The full historic source SHA + JSON equality remains mandatory; no tolerance around source provenance. Do not claim root cause cured before independent Windows/Ubuntu repeated CI.

## R90B: Real 3D landing interfaces
7 R88 galleries were checked against REAL R80 `switchback_deck` and `flat_landing` triangle elevations via projected XZ barycentric interpolation (not proximity labels or LLM narrative). Both width endpoints for all 7 have underlying deck faces, but their normalized heights differ slightly. For nonzero seams within 0.003 normalized units, create two 3D triangles sharing the original source cross-section with its supporting research face.

At destination use actual R84 PAD triangle. Compute both R88 cross-section endpoints' projected barycentric weights and vertical deviation. Only if both are INSIDE the source triangle and the deviation is within 0.003, add a tapered room entry made of three triangles sharing the original R88 edge and ending on an interior source pad sample. If furniture/hull reference probes hit, omit the taper. The R88 sheet is kept byte-for-byte; the formerly false claim that all seven gallery ends are really joined is explicitly superseded.

Observed direct research geometry: 7/7 real-source deck anchors; 6/7 accepted source-pad entries; the right tier 2 tip lies OUTSIDE the R84 landing triangle (small negative barycentric component) and must remain `UNRESOLVED_TRUE_3D_SEAM`. Added 30 research triangles, 4261 original R89 faces preserved. This is NOT a certified walking path or 3D structural proof. Old R88 source tip overhang is NOT patched or hidden.

## One-step review
Add to existing R60 ZIP review; no new user manual action:
- `R90_SOURCE_SURFACE_SEAM_EVIDENCE.json`: per-tier origin/deck vertical gaps, terminal barycentric proof and BLOCKED status.
- `R90_SOURCE_DECK_TO_PAD_3D_SEAMS.obj`: R89 source plus gated new source-registered seam triangles.
- `R90_GALLERY_THRESHOLD_VALIDITY_REVIEW.html`: 7-tier review with explicit right tier2 unresolved.

This remains only the c01 architectural exploratory research, not an authorization to use this as a fixed design template for all user prompts. Source captured Qwen/Gemma data and raw SHA unchanged. B143 HOLD, human architecture NOT_REVIEWED, 9 gates BLOCKED, `NOT_PREPARED`, `BuildPlan.operations=[]`, modelCalls 0, world reads/writes 0, construction NEVER invoked, PR open/draft/unmerged.

Next work: redesign the problematic right tier 2 original ribbon termination without widening pad or altering historic mesh; verify R80 route-connected entrance and actual floor support, source-bound doorway and lounge access, visual proportions. Do not overfocus on accumulating guard test counts.

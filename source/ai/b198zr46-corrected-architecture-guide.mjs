/**
 * R46 — one-trial corrective space-first guide, distinct from frozen R41/R45.
 * The user explicitly approved ONE future local Qwen call in this turn;
 * importing or inspecting this module NEVER invokes a model or Minecraft.
 */
import {createHash} from 'node:crypto';
import {R41_DRAFT_GUIDE,GUIDE_SHA256 as R41_SHA}
 from './b198zr41-architecture-authoring-candidate.mjs';
import {R45_CORRECTIVE_GUIDE_SHA256}
 from './b198zr45-original-grammar-and-program-audit.mjs';

export const SCHEMA='minecraftaibuilder-b198zr46-corrected-architecture-guide-v1';
export const PROFILE='R46_ONE_EXPLICITLY_APPROVED_LOCAL_TRIAL';
export const R46_GUIDE=[
 // Reuse geometry/space contract but make the actual R44 violations unmistakable.
 R41_DRAFT_GUIDE,
 'CRITICAL B143 FLAT SOURCE SYNTAX: every element shape is a STRING, e.g. {"id":"floor","shape":"box","mode":"add","material":"concrete","origin":[0,0,0],"size":[8,1,8]}. NEVER use {"shape":{"origin":...,"size":...}}. For each shape put its origin/center/axis/size/radii/etc beside shape, NOT inside it.',
 'CRITICAL R3 PLAN TYPES: spatialPlan.entrance is exactly [x,y,z] (one EMPTY standing cell with occupied floor at y-1). spatialPlan.headroom is exactly the NUMBER 2 or 3. Neither is a shape, box, or object.',
 'PRESERVE FUNCTIONAL MASSES: if ADD creates a bookshelf, floor, wall, gallery or lounge feature, no later CUT may remove its full occupied geometry. Order cuts through hollow building masses, not through the usable bookshelf/room solids.',
 'PRESERVE REAL VOIDS: central atrium protectedVoids remain truly unoccupied after ALL operations; do not refill claimed 0-occupied volumes with lounge slabs, beams, glass or glow. Put needed bridges/lounges at actual OTHER coordinates or define honest smaller air regions, without dishonest low thresholds.',
 'ENTRY + ROUTES: do not refill entrance after the doorway CUT, even with transparent glass or glow. Support floor y-1 and keep 2-3 headroom AIR. End staircase at an actual connected landing; every destination must be reachable in final voxels.',
 'Before finishing JSON, privately cross-check each element has flat shape-string syntax, each CUT omits material, and every protected space survives all later ADDs. No self-correction of evidence after output, and never claim independent verification.'
].join('\n');
export const GUIDE_SHA256=createHash('sha256').update(R46_GUIDE).digest('hex');
export const UTF8_BYTES=Buffer.byteLength(R46_GUIDE);
export function inspectR46Guide(){
 return {schema:SCHEMA,profile:PROFILE,guideSha256:GUIDE_SHA256,
  guideBytes:UTF8_BYTES,baselineR41Sha256:R41_SHA,
  basisR45Sha256:R45_CORRECTIVE_GUIDE_SHA256,
  actualTokenizerBudgetMeasured:false,qualityImprovementProven:false,
  modelCalls:0,worldContacts:0,worldWrites:0,
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]}}};
}

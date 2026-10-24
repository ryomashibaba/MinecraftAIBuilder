/**
 * R28 — space-first advisory prompt candidate. NOT enabled for live inference.
 * Never mutate the frozen R11/R21/R23 profiles or the R25 saved original.
 * The model remains architect of every element; no fixed building template.
 */
import {createHash} from 'node:crypto';
import {R21_FUTURE_GUIDE,R21_FUTURE_GUIDE_SHA256}
 from './b198zr21-future-architecture-guide.mjs';

export const SCHEMA='minecraftaibuilder-b198zr28-space-first-advisory-v1';
export const R28_PROFILE='r28-space-first-future-proposal-not-enabled';
export const R28_ADDITIONAL_GUIDE=[
 'Design SPACE FIRST, then solids. Before writing JSON, privately sketch: original exterior silhouette, at least one walkable room, an entry standing cell, connected corridors, real floors and landings, and non-solid furniture. Keep the design original to the Japanese request; do not copy any fixed template.',
 'A building element is NOT a usable room. A solid ADD box is entirely filled unless shell is explicitly a positive thickness. A name such as base-shell, room, lounge or bookshelf does NOT make a void. Create true interior air using supported shell or ordered CUT geometry, and ensure no later ADD fills it again.',
 'Treat spatialPlan functionalZones as AIR-AND-FLOOR occupancy volumes, not bounding boxes of furniture. A person must be able to stand on a supporting floor immediately BELOW a candidate standing cell and have headroom 2 or 3 empty cells. Put bookshelf and lounge furnishings BESIDE these walkable cells, never fill 100% of a claimed usable zone.',
 'Entrance must be a real empty standing cell with y>=1, solid LOCAL floor at y-1 and all headroom cells clear. The entrance door CUT must actually intersect the entrance route at the same x,z and appropriate y; a door at z=45 does not open a route for a declared entrance at z=44. No reliance on unknown outside terrain for support.',
 'Design ONE continuous abstract route from the declared entrance to each declared destination and meaningful functional zone. Verify that every successive standable cell moves horizontally by one and changes elevation by at most one with supported floor and clear headroom. Stairs require actual aligned lower/upper landings and open approach/exit.',
 'For every functionalZone, privately count whether at least the declared minimumReachablePositions and minimumReachablePercent can be occupied by supported, empty, connected standing cells. A furniture-filled region with 0 standable cells must NEVER be claimed as a reading room or lounge.',
 'Check final ordered geometry, not element names: ADD fills, CUT removes, and later ADD can refill. Distinguish actual shell, cut opening, solid supports, furniture and open air. Large massing may be curved or asymmetric as the brief requires, but never sacrifice circulation for visual bulk.',
 'Validate the strict B143 grammar before output: each ADD must have material in stone/concrete/metal/glass/wood/glow/accent, each CUT MUST omit the material field entirely, every primitive and repeat instance must fit inside bounds, and the output must be exactly one complete four-key JSON object.',
 'The final explanation must never claim independent validation, a completed Minecraft build, real avatar walking, or a quality PASS. The evaluator will judge the actual compiled voxels and route, not the prose.'
].join('\n');
export const R28_SPACE_FIRST_GUIDE=R21_FUTURE_GUIDE+'\n'+R28_ADDITIONAL_GUIDE;
const hash=s=>createHash('sha256').update(s).digest('hex');
export const R28_ADDITIONAL_GUIDE_SHA256=hash(R28_ADDITIONAL_GUIDE);
export const R28_SPACE_FIRST_GUIDE_SHA256=hash(R28_SPACE_FIRST_GUIDE);
export const R28_FROZEN_R21_SHA256=R21_FUTURE_GUIDE_SHA256;
export const R28_MODEL_REQUESTS_AUTHORIZED=0;
export const R28_AUTOMATIC_RETRIES_AUTHORIZED=0;
export const R28_MINECRAFT_OPERATIONS_AUTHORIZED=0;
export const R28_ACTIVATION_STATUS='NOT_ENABLED';
export function inspectR28Advisory(){
 return {schema:SCHEMA,profile:R28_PROFILE,
  activationStatus:R28_ACTIVATION_STATUS,
  parentGuideSha256:R28_FROZEN_R21_SHA256,
  additionalGuideSha256:R28_ADDITIONAL_GUIDE_SHA256,
  candidateGuideSha256:R28_SPACE_FIRST_GUIDE_SHA256,
  doesNotAlterHistoricalPromptProfiles:true,
  doesNotAuthorizeAnyLocalModelCall:true,
  automaticArchitecturalApproval:false,
  minecraftConstructionApproved:false,
  modelCalls:0,worldContacts:0,worldWrites:0,
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,worldContacts:0,worldWrites:0,
   gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}}};
}

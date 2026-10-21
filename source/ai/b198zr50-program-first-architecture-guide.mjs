/**
 * R50 — one-pass architectural choreography, isolated future-consent profile.
 * Read-only authoring guidance. NOT ACTIVATED for any previous real Qwen trial.
 * No fixed typology, shape recipe, coordinates, two-call pipeline or world API.
 *
 * The independent (human-required) benchmark criteria are separate from the
 * model's self-declared spatialPlan. They never become a passing verifier.
 */
import {createHash} from 'node:crypto';
import {CREATION_CASES} from './b198b-benchmark-cases.mjs';
import {R47_JSON_SCHEMA_SHA256}
 from './b198zr47-json-schema-format-gate.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export const SCHEMA='minecraftaibuilder-b198zr50-program-first-one-pass-v1';
export const PROFILE='R50_ONE_PASS_ARCHITECTURE_CANDIDATE_NOT_ENABLED';
export const R50_ARCHITECTURE_GUIDE=[
 'You are a daring architect of inhabitable spaces. Invent a specific fresh architectural IDEA answering the current Japanese brief. The exterior massing and interior routes must express the SAME idea, not a decorated cuboid, copied building or predefined template. Your own design chooses form, dimensions, material and circulation.',
 'IN ONE RESPONSE, mentally sequence: (A) clear volumes to inhabit + principal public/functional spaces; (B) ground-supported entrance, level floors, vertical circulation and landings; (C) a striking, cohesive exterior with substantial physical mass and purposeful curvature/asymmetry where appropriate; (D) exact B143 ADD/CUT solids; (E) spatialPlan coordinates that match the FINAL solids. Do NOT request a second model turn.',
 'Practical meaning: a solid ADD box is a solid block of material, NOT an accessible room, library shelf aisle, lobby or atrium. Hollow rooms/voids must exist after every ordered ADD/CUT; never refill a required air region with glass, glow, floor slabs, decoration or structure. Shelves, exhibits and furniture should be real positive solids BESIDE reachable air, not the same region. A claim in prose is not geometry.',
 'Lay out paths BEFORE outputting coordinates. The entrance [x,y,z] has supported occupied floor y-1, air at feet and 2 or 3 air blocks above. Choose one or several naturally navigable routes to each required floor and landmark. B143 staircase ends at y+steps-1 and moves steps*treadDepth along its x/z axis, with width and direction; match BOTH ends to actual supported landings. Never send stair flights below zero or outside the specified bounds.',
 'Coordinate discipline: bounds width,height,depth are exclusive upper limits: 0<=x<width, 0<=y<height, 0<=z<depth. Entire volume of EVERY shape, shell, beam thickness and final repeat copy must remain inside. A box ends at origin+size-1; ellipsoid at center+/-radii; stair flight ends at origin+direction*(steps*treadDepth-1) and climbs steps-1. A roof at y=height is OUTSIDE. Do not silently clip shapes.',
 'Cross-check the spatialPlan BEFORE reply: destination IDs/void IDs/functional-zone IDs are unique across ALL three arrays. Every claimed standing destination is inside bounds and actually standable after final operations. If entrance=[ex,ey,ez], destination=[x,y,z], the R3 minimum possible route length is at least max(abs(x-ex)+abs(z-ez),abs(y-ey)); declare maximumPathSteps no smaller than that mathematical lower bound, and allow realistic detours rather than gaming thresholds.',
 'For protectedVoids, claim only air that REALLY stays air throughout the complete final model; never include floors, a stairwell solid or overhead lounge in a zero-occupied void. FunctionalZones measure reachable standable AIR, not architectural mass or furniture. No dishonest claims of verification.',
 'Write one minified complete JSON object with exactly design,spatialPlan,explanation,assumptions. Follow the supplied native B143 JSON Schema: design.bounds EXACT width,height,depth; shape is a STRING (box,ellipsoid,cylinder,torus,beam,staircase); all coordinates are integer shape-specific flat properties; each ADD requires valid material, each CUT omits material. Staircase steps 2..32; no extra fields. Use fewer effective large architectural gestures rather than mechanical repetition, but never sacrifice usable rooms and circulation for a decorative silhouette.',
 'Avoid generic shape quotas, flat-out bans on any architectural element, fixed dimensions, genre presets, static blueprint coordinates and overconfident artistic ratings. Real model quality can only be judged later from the preserved source, strict B143/R3 validation and human inspection. Never claim Minecraft construction or physical walking.'
].join('\n');
export const R50_GUIDE_SHA256=hash(R50_ARCHITECTURE_GUIDE);
export const R50_GUIDE_UTF8_BYTES=Buffer.byteLength(R50_ARCHITECTURE_GUIDE);
export const R50_NATIVE_SCHEMA_SHA256=R47_JSON_SCHEMA_SHA256;
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});

/**
 * A human-intent review packet is not injected as generated geometry.
 * The task remains a natural-language prompt. Frozen benchmark criteria
 * preserve actual program needs; their satisfaction needs human judgment.
 */
export function r50HumanIntentPacket(caseId){
 const c=CREATION_CASES.find(x=>x.id===caseId);
 if(!c)throw Error('B198ZR50_FROZEN_CREATION_CASE_REQUIRED');
 return {
  schema:SCHEMA,caseId:c.id,genre:c.genre,
  frozenJapanesePrompt:c.prompt,originalPromptSha256:hash(c.prompt),
  humanCriteria:c.criteria.map(x=>({
   id:x.id,description:x.description,
   humanVisualAndSemanticJudgmentRequired:true
  })),
  sourceIndependentFromModelSpatialPlan:true,
  doesNotProveAestheticOriginality:true,
  noCoordinatesOrFixedGeometryInjected:true,
  noSourceOriginalModified:true,
  modelCalls:0,worldContacts:0,worldWrites:0
 };
}
export function inspectR50OnePassGuide(){
 const packets=CREATION_CASES.map(x=>r50HumanIntentPacket(x.id));
 const ids=packets.map(x=>x.caseId);
 const differentPrograms=new Set(packets.map(x=>x.frozenJapanesePrompt)).size;
 const frozenExampleCoordinates=['[20,1,38]','[20,40,20]','z=-1',
  'loungeGlow','roofGlow','leftStair','rightStair'];
 const leaks=frozenExampleCoordinates.filter(x=>R50_ARCHITECTURE_GUIDE.includes(x));
 return {schema:SCHEMA,profile:PROFILE,activation:'NOT_ENABLED',
  guideSha256:R50_GUIDE_SHA256,guideUtf8Bytes:R50_GUIDE_UTF8_BYTES,
  nativeJsonSchemaSha256:R50_NATIVE_SCHEMA_SHA256,
  frozenCases:ids.length,distinctFrozenPrograms:differentPrograms,
  independentHumanCriteriaCount:packets.reduce((n,p)=>n+p.humanCriteria.length,0),
  historicalCoordinatesLeaked:leaks,
  hardcodedGeometryRecipe:false,requiresAnotherInference:false,
  manualAestheticReviewStillRequired:true,
  modelTokensMeasured:false,realQwenImprovementProven:false,
  modelCalls:0,worldContacts:0,worldWrites:0,safety:safety()};
}

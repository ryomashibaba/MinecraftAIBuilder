/**
 * R30 — GENERALIZED space-first future prompt proposal. NOT live-enabled.
 *
 * Supersedes R28 only as an independent draft: composing R21 + new clauses
 * avoids inheriting R28's literal R25 coordinates and "ONE route" wording.
 * No prompt runner imports this file; cannot authorize inference or worlds.
 */
import {createHash} from 'node:crypto';
import {R21_FUTURE_GUIDE,R21_FUTURE_GUIDE_SHA256}
 from './b198zr21-future-architecture-guide.mjs';
import {R28_SPACE_FIRST_GUIDE_SHA256}
 from './b198zr28-space-first-future-guide.mjs';

export const SCHEMA='minecraftaibuilder-b198zr30-generalized-space-advisory-v1';
export const R30_PROFILE='r30-generalized-space-future-NOT_ENABLED';
export const R30_GUIDANCE_CLAUSES=Object.freeze([
 // The model is still responsible for the original plan, not a prescribed form.
 'Space before solids: invent an original exterior, interior volumes, access system and program for THIS Japanese brief. Do not copy a fixed floorplan, style, building template or numerical layout.',
 'Treat every ADD primitive as solid unless its actual supported shell parameter or a later CUT makes a genuine void. An ID or prose label such as shell, lounge or reading room never creates an empty room. Inspect FINAL ordered operations; later ADD elements can refill cuts.',
 'Distinguish furniture/structure from usable air. A functionalZone represents a meaningful region containing actual standable air cells, not the solid bounds of bookshelves, furniture or decorative glass. Leave room for people beside furniture and honestly declare usable zones.',
 'For every standing position, require a solid conceptual floor directly below (y-1), empty feet and headroom (2 or 3 air cells), and coordinates inside the local bounds. The declared entrance must have y>=1 and fulfill this support/headroom rule; do not assume outside-world ground.',
 'Every doorway/opening must intersect a genuine approach and exit into the interior. Align cut coordinates and heights with the route and supported floor, rather than trusting named door parts; use whichever coordinates your own design needs.',
 'The abstract movement network may have ONE or MANY routes, loops, bridges or branches. Every declared destination and meaningful functional zone must be reachable from the entrance through supported head-clear standing cells; horizontal neighbor steps may differ in height by at most one. Align stairs, upper landings and approach floors.',
 'Choose honest nontrivial minimumReachablePositions and minimumReachablePercent for each functionalZone; the FINAL conceptual voxels must provide enough genuinely reachable standable cells. A fully occupied room, even if visually attractive, cannot be declared accessible.',
 'Preserve the actual Japanese design goal: distinctive massing, curved or asymmetric elements if appropriate, good spatial experience and usable circulation. No template replacement, auto-repair of the authored response, or invented quality score.',
 'Before sending the one complete four-key JSON object, verify supported shapes and every repeat extent stays within bounds; each ADD material is one of stone/concrete/metal/glass/wood/glow/accent; each CUT omits the material property entirely. A name or explanation cannot override B143.',
 'Perform only a private advisory self-check: the deterministic B143 voxel compiler and independent R3 route/functional contract alone decide formal geometry and reachability. Never claim real Minecraft walking, construction, third-party verification or quality PASS.'
]);
export const R30_ADDITIONAL_GUIDE=R30_GUIDANCE_CLAUSES.join('\n');
export const R30_GENERALIZED_GUIDE=R21_FUTURE_GUIDE+'\n'+R30_ADDITIONAL_GUIDE;
const sha=s=>createHash('sha256').update(s).digest('hex');
export const R30_GUIDE_SHA256=sha(R30_GENERALIZED_GUIDE);
export const R30_ADDITIONAL_SHA256=sha(R30_ADDITIONAL_GUIDE);
export const R30_PARENT_R21_SHA256=R21_FUTURE_GUIDE_SHA256;
export const R30_FROZEN_R28_SHA256=R28_SPACE_FIRST_GUIDE_SHA256;
export const R30_GUIDE_UTF8_BYTES=Buffer.byteLength(R30_GENERALIZED_GUIDE);
export const R30_GUIDE_CHARACTERS=R30_GENERALIZED_GUIDE.length;
export const R30_BYTE_BUDGET_ADVISORY=12500;

// Machine-readable mapping is an audit aid, not a claim of model compliance.
export const R30_FAILURE_TO_CLAUSE=Object.freeze([
 {failure:'R27_CUT_MATERIAL_5',clause:8},
 {failure:'R27_SOLID_BASE_SHELL',clause:1},
 {failure:'R27_READING_WEST_FULL',clause:2},
 {failure:'R27_READING_EAST_FULL',clause:2},
 {failure:'R27_STAR_LOUNGE_FULL',clause:2},
 {failure:'R27_ENTRANCE_INVALID',clause:3},
 {failure:'R27_DOOR_Z_MISMATCH',clause:4},
 {failure:'R27_DISCONNECTED_GRAPH',clause:5},
 {failure:'R27_STANDABLE_POSITIONS',clause:5},
 {failure:'R27_LARGEST_COMPONENT',clause:5}
]);
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export function inspectR30Guide(){
 const forbiddenLiteralExamples=[
  'z=44','z=45','[23,0,44]','Design ONE continuous abstract route'
 ];
 const violations=forbiddenLiteralExamples.filter(s=>R30_ADDITIONAL_GUIDE.includes(s));
 const uncovered=R30_FAILURE_TO_CLAUSE.filter(x=>
  !R30_GUIDANCE_CLAUSES[x.clause]);
 const diagnosticStatus=violations.length||uncovered.length||
  R30_GUIDE_UTF8_BYTES>R30_BYTE_BUDGET_ADVISORY?
   'HOLD_STATIC_PROMPT_AUDIT':'STATIC_PROMPT_AUDIT_PASS_NOT_QUALITY_PROOF';
 return {
  schema:SCHEMA,profile:R30_PROFILE,activation:'NOT_ENABLED',
  status:diagnosticStatus,
  parentR21Sha256:R30_PARENT_R21_SHA256,
  frozenR28Sha256:R30_FROZEN_R28_SHA256,
  candidateGuideSha256:R30_GUIDE_SHA256,
  additionalSha256:R30_ADDITIONAL_SHA256,
  guideUtf8Bytes:R30_GUIDE_UTF8_BYTES,
  guideCharacters:R30_GUIDE_CHARACTERS,
  byteBudgetAdvisory:R30_BYTE_BUDGET_ADVISORY,
  trueTokenizerCountMeasured:false,
  oneShotModelContextFitVerified:false,
  mappings:R30_FAILURE_TO_CLAUSE,
  uncoveredFailures:uncovered,
  historicalCoordinateLeakage:violations,
  claimsLiveModelImprovement:false,
  originalR25Quality:'HOLD',
  promptChangesActivated:false,modelCalls:0,worldContacts:0,worldWrites:0,
  safety:safe()
 };
}

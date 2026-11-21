/**
 * R65 — source-independent final-voxel network evidence -> conservative,
 * human-gated future design notes. Recompute R64 to reject injected evidence.
 * No model calls, geometry repair, world contact or autonomous redesign.
 */
import {createHash} from 'node:crypto';
import {analyzeR64UnclaimedFloorConnectivity,SCHEMA as R64_SCHEMA}
 from './b198zr64-unclaimed-floor-connectivity.mjs';

export const SCHEMA='minecraftaibuilder-b198zr65-independent-network-feedback-v1';
const fail=x=>{throw Error('B198ZR65_'+x)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,
 worldWrites:0});
const advice=Object.freeze({
 MANY_DISCONNECTED_ABSTRACT_WALKING_COMPONENTS:{
  priority:'P1_INSPECT_SPATIAL_CONTINUITY',
  note:'Check every public wing, floor, atrium edge and landing for genuine connected access; if independent pavilions or islands are intentional, keep their identity and design meaningful transfers rather than flattening the architecture.'},
 NO_LOW_LEVEL_CANDIDATE_IN_SOME_COMPONENTS:{
  priority:'P1_INSPECT_VERTICAL_CIRCULATION',
  note:'Investigate high-level decks and observation spaces without a low-level abstract connection. Preserve the intended elevated landmark and generous voids while considering physically supported stairs, ramps and landings if public access is required.'},
 NO_SAME_LEVEL_2X2_CLEAR_STANDING_PAD:{
  priority:'P2_INSPECT_USABLE_WIDTH',
  note:'Inspect whether public areas, room floors and turning/landing zones have usable breadth and overhead clearance; do not manufacture empty square pads solely to pass this heuristic.'},
 NO_SUPPORTED_STANDING_POSITIONS:{
  priority:'P1_INSPECT_HABITABLE_SPACE',
  note:'No grid position has both supporting floor and two clear vertical cells; reconsider meaningful occupiable space and room construction without compromising the overall concept or inventing fixed geometry.'}
});
export function bridgeR65IndependentSpatialEvidence({
 raw,expectedRawSha256,expectedGeometrySha256,r64Evidence
}={}){
 if(typeof raw!=='string'||!raw||sha(raw)!==expectedRawSha256||
  !/^[0-9a-f]{64}$/.test(expectedGeometrySha256??''))
  fail('IMMUTABLE_SOURCE_REQUIRED');
 if(r64Evidence?.schema!==R64_SCHEMA||
  r64Evidence.rawSha256!==expectedRawSha256||
  r64Evidence.geometrySha256!==expectedGeometrySha256||
  r64Evidence.spatialPlanReadOrTrusted!==false||
  r64Evidence.exhaustiveStandingCellCoverageVerified!==true)
  fail('R64_ORIGINAL_PROVENANCE_MISMATCH');
 // A saved JSON file can be edited even when it retains the original SHA.
 // Independently reproduce its facts, not just verify its self-declared tags.
 const rederived=analyzeR64UnclaimedFloorConnectivity({
  raw,expectedRawSha256,expectedGeometrySha256});
 if(!same(r64Evidence.metrics,rederived.metrics)||
  !same(r64Evidence.possibleSpatialConcerns,rederived.possibleSpatialConcerns))
  fail('R64_NUMERICAL_EVIDENCE_TAMPER_OR_STALE');
 const items=[];
 if(rederived.metrics.supportedTwoHighStandingPositions===0)
  items.push({kind:'NO_SUPPORTED_STANDING_POSITIONS',
   measured:{standingPositions:0}});
 for(const x of rederived.possibleSpatialConcerns){
  if(!Object.hasOwn(advice,x.kind))fail('UNKNOWN_R64_CONCERN_KIND');
  items.push({kind:x.kind,measured:x.measured});
 }
 const issues=items.map(x=>({
  kind:x.kind,reviewPriority:advice[x.kind].priority,
  count:1,measured:x.measured,
  basis:'R64_ALL_FINAL_CONCEPT_VOXELS_WITHOUT_MODEL_SPATIALPLAN',
  objectiveFinalVoxelEvidence:true,
  independentArchitecturalRequirementPassed:false,
  independentHumanReviewRequired:true,automaticReject:false,
  instructions:advice[x.kind].note
 }));
 const exactEvidenceSha256=sha(JSON.stringify({
  original:expectedRawSha256,geometry:expectedGeometrySha256,
  metrics:rederived.metrics,concerns:rederived.possibleSpatialConcerns
 }));
 return {schema:SCHEMA,status:'CONCEPT_NETWORK_FEEDBACK_DERIVED_NOT_APPLIED',
  originalRawSha256:expectedRawSha256,
  finalGeometrySha256:expectedGeometrySha256,
  originalR64RecomputedAndCompared:true,
  r64NetworkFactsSha256:exactEvidenceSha256,
  modelDeclaredSpatialPlanIgnored:true,
  issues,
  humanDecisionBeforeRepairRequired:true,
  deliberateSeparatedBuildingsMustNotBeAutomaticallyJoined:true,
  largeDesignMustNotBeShrunkToSatisfyMetrics:true,
  independentHumanDesignReview:'NOT_REVIEWED',
  allIssueFreeIsNotQualityPass:true,
  proposedGeometryChanges:[],automaticModelRequest:false,
  freshModelConsentRequired:true,modelCalls:0,worldWrites:0,
  safety:safe()};
}

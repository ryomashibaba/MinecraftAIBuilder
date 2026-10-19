/**
 * B198Z-R4 — OPTIONAL, single-response MODEL-DECLARED spatial programming.
 *
 * Architect invents the plan and exact B143 geometry in one model response.
 * Plans are untrusted, never replace an independent human/reviewer contract.
 * The existing three-key B198A/B198S protocol remains the default.
 * This module performs zero network/model/world operations by itself.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {readModelProposal} from './b198-natural-language-design.mjs';
import {evaluateFunctionalReviewContract,SCHEMA as REVIEW_SCHEMA}
 from './b198zr3-functional-review-contract.mjs';
export const SCHEMA='minecraftaibuilder-b198zr4-planned-source-v1';
const err=(s)=>{throw Error('B198ZR4_'+s)};
const yes=(x,s)=>{if(!x)err(s)};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(obj,keys)=>object(obj)&&Object.keys(obj).length===keys.length&&
 keys.every(key=>Object.hasOwn(obj,key));
const text=(s,min,max)=>typeof s==='string'&&s.length>=min&&s.length<=max&&
 !/[\u0000-\u001f<>]/.test(s);
const validPrompt=s=>typeof s==='string'&&s.trim().length>=8&&s.length<=8000&&
 !/[\\u0000-\\u0008\\u000b-\\u001f]/.test(s);
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export const R4_PLANNING_GUIDE=[
 'Optional PLANNED-SOURCE mode only: return exactly four JSON keys: design, explanation, assumptions, spatialPlan.',
 'Invent a functional spatial plan BEFORE choosing B143 solids; output the plan and its matching building geometry in this SAME response, never as two model requests.',
 'spatialPlan has EXACT keys: designIntent, massStrategy, circulationStrategy, entrance, headroom, protectedVoids, destinations, functionalZones.',
 'designIntent, massStrategy and circulationStrategy must be concise original descriptions grounded in the Japanese request, not template names.',
 'entrance is an integer [x,y,z] standing position, headroom 2 or 3. protectedVoids are {id,origin:[x,y,z],size:[sx,sy,sz],maxOccupiedCells}; destinations are {id,point:[x,y,z],maximumPathSteps}; functionalZones are {id,origin,size,minimumReachablePositions,minimumReachablePercent}.',
 'Include at least one genuinely occupiable functional zone and one destination; leave protectedVoids empty only when a building legitimately needs no open void.',
 'Do not invent unrealistically low requirements to fabricate a pass. Allocate substantial meaningful floor area and fully connected supported rooms.',
 'Verify the FINAL ordered ADD/CUT composition against the declared plan, not just the individual element names or intended appearances.',
 'Return geometry AND spatialPlan within the existing output token limit, with source-only coordinates; never output Minecraft commands or construction claims.',
 'Architectural originality belongs to the model. Do not use fixed genres, keyword-to-shape mappings, or a predefined floorplan.'
].join('\n');
export function readR4PlannedProposal(raw){
 if(typeof raw==='string'){
  yes(raw.length>0&&raw.length<=60000,'RAW_RESPONSE_SIZE');
  try{raw=JSON.parse(raw)}catch{err('NOT_JSON')}
 }
 yes(exact(raw,['design','explanation','assumptions','spatialPlan']),
  'EXPECTED_FOUR_KEYS');
 const proposal=readModelProposal({
  design:raw.design,explanation:raw.explanation,assumptions:raw.assumptions});
 const plan=raw.spatialPlan;
 yes(exact(plan,['designIntent','massStrategy','circulationStrategy',
  'entrance','headroom','protectedVoids','destinations','functionalZones']),
  'PLAN_FIELDS');
 for(const key of ['designIntent','massStrategy','circulationStrategy'])
  yes(text(plan[key],8,350),'PLAN_TEXT_'+key);
 yes(Array.isArray(plan.protectedVoids)&&
  Array.isArray(plan.destinations)&&plan.destinations.length>=1&&
  Array.isArray(plan.functionalZones)&&plan.functionalZones.length>=1,
  'NO_FUNCTIONAL_PROGRAM');
 return {...proposal,spatialPlan:structuredClone(plan)};
}
export function reviewR4PlannedProposal(raw,{independentContract=null,
 caseId='unverified-model-plan'}={}){
 const candidate=readR4PlannedProposal(raw);
 const compiled=compileDesign(candidate.design);
 yes(verifyCompiled(candidate.design,compiled),'B143_SOURCE_SHA');
 const plan=candidate.spatialPlan;
 // Model cannot choose a fake authorship tag, a passing source hash or approval.
 const planContract={schema:REVIEW_SCHEMA,caseId,
  authorship:'MODEL_DECLARED_UNVERIFIED',sourceSha256:compiled.sourceSha256,
  entrance:plan.entrance,headroom:plan.headroom,
  protectedVoids:plan.protectedVoids,destinations:plan.destinations,
  functionalZones:plan.functionalZones};
 const declared=evaluateFunctionalReviewContract({
  design:candidate.design,compiled,contract:planContract});
 let external=null;
 if(independentContract!==null){
  yes(independentContract?.authorship!=='MODEL_DECLARED_UNVERIFIED',
   'MODEL_CONTRACT_CANNOT_MASQUERADE_AS_INDEPENDENT');
  // Reviewers pin against real source; do not silently rewrite their criteria.
  external=evaluateFunctionalReviewContract({
   design:candidate.design,compiled,contract:independentContract});
 }
 const passed=declared.status==='FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS'&&
  (external===null||external.status==='FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 return {schema:SCHEMA,
  status:passed?'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS':
   'HOLD_SPATIAL_PLAN_OR_INDEPENDENT_CONTRACT',
  design:candidate.design,compiled,
  plan:plan,modelExplanation:candidate.explanation,
  modelAssumptions:candidate.assumptions,
  declaredPlanReview:declared,independentReview:external,
  planProvenance:'MODEL_DECLARED_UNVERIFIED',
  actualModelIdentityAuthenticated:false,
  conceptQualityApproved:false,
  modelGeneralizationCertified:false,
  minecraftPhysicalWalkingCertified:false,
  geometryWasGeneratedByThisEvaluator:false,
  safety:safety()};
}
/** Zero retries, explicit injected generator only, no templates/no fallback.
 * No generator means NO LOCAL MODEL REQUEST. Use a separate approved explicit
 * source probe to attach real Ollama and preserve original raw bytes.
 */
export async function proposeR4PlannedSource({prompt,generator,independentContract=null}={}){
 yes(validPrompt(prompt),'PROMPT');
 yes(typeof generator==='function','EXPLICIT_GENERATOR_REQUIRED');
 const response=await generator({
  mode:'creation',prompt,previousDesign:null,feedback:[],
  attempt:1,maxAttempts:1,outputMode:'PLANNED_SOURCE_V1'});
 return reviewR4PlannedProposal(response,{independentContract});
}

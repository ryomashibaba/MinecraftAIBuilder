/**
 * B198I — MODEL-directed architectural programming, then real source proof.
 *
 * A model first proposes a category-neutral spatial program/visual direction.
 * Another model call(s) authors strict B143 geometry. Deterministic compiled
 * solid/air/2-wide floor anchors validate correspondence between PLAN and
 * SOURCE. Neither an LLM's own plan nor matching anchors proves the user's
 * Japanese intent, aesthetics, Minecraft walking, or structural stability.
 *
 * Every result is an unapproved 3D B143 source draft. No Minecraft I/O.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {generateArchitectureWithFeedback} from './b198g-autonomous-quality.mjs';
import {inspectPlannedPublicCirculation} from './b198j-circulation-proof.mjs';
import {inspectMultiLevelSourceCirculation} from './b198l-step-chain-proof.mjs';

export const PLAN_SCHEMA='minecraftaibuilder-b198i-program-v1';
export const RESULT_SCHEMA='minecraftaibuilder-b198i-directed-source-v1';
const fail=s=>{throw Error('B198I_'+s)};
const yes=(x,s)=>{if(!x)fail(s)};
const H=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const own=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).every(k=>keys.includes(k));
const text=(s,min,max)=>typeof s==='string'&&
 s.trim().length>=min&&s.length<=max&&
 !/[\u0000-\u001f<>]/.test(s);
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const world=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldCoordinates:null,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});

/** Treat all plan content as untrusted source-specific model output. */
export function readArchitecturalProgram(input){
 let plan=input;
 if(typeof plan==='string'){
  yes(plan.length>=30&&plan.length<=18000,'PLAN_RESPONSE_SIZE');
  try{plan=JSON.parse(plan)}catch{fail('UNPARSEABLE_PLAN_JSON')}
 }
 yes(own(plan,['schema','id','title','designIntent','visualDirection',
  'bounds','zones','anchors'])&&Object.keys(plan).length===8,
  'PLAN_TOP_LEVEL_SCHEMA');
 yes(plan.schema===PLAN_SCHEMA,'PLAN_SCHEMA_VERSION');
 yes(typeof plan.id==='string'&&/^[a-z][a-z0-9-]{2,47}$/.test(plan.id),
  'PLAN_ID');
 for(const prop of ['title','designIntent','visualDirection']){
  yes(text(plan[prop],prop==='title'?3:12,
   prop==='title'?100:600),'INVALID_PROGRAM_TEXT_'+prop);
 }
 const b=plan.bounds;
 yes(own(b,['width','height','depth'])&&Object.keys(b).length===3,
   'PLAN_BOUNDS_FIELDS');
 yes(int(b.width,8,128)&&int(b.height,8,96)&&int(b.depth,8,128)&&
  b.width*b.height*b.depth<=500000,'PLAN_BOUNDS_RANGE');
 yes(Array.isArray(plan.zones)&&plan.zones.length>=3&&
  plan.zones.length<=12,'PLAN_ZONES_COUNT');
 const names=new Set();
 for(const z of plan.zones){
  yes(own(z,['id','name','purpose'])&&Object.keys(z).length===3,
   'ZONE_FIELDS');
  yes(typeof z.id==='string'&&/^[a-z][a-z0-9-]{2,35}$/.test(z.id)&&
   !names.has(z.id),'DUPLICATE_OR_INVALID_ZONE');
  names.add(z.id);
  yes(text(z.name,2,80)&&text(z.purpose,8,260),'INVALID_ZONE_PROGRAM');
 }
 yes(Array.isArray(plan.anchors)&&plan.anchors.length>=5&&
  plan.anchors.length<=18,'PLAN_ANCHOR_COUNT');
 const ids=new Set(),coords=new Map(),types=new Set();
 for(const a of plan.anchors){
  yes(own(a,['id','zoneId','point','expect','purpose'])&&
   Object.keys(a).length===5,'ANCHOR_FIELDS');
  yes(typeof a.id==='string'&&/^[a-z][a-z0-9-]{2,35}$/.test(a.id)&&
   !ids.has(a.id),'DUPLICATE_OR_INVALID_ANCHOR');
  ids.add(a.id);
  yes(names.has(a.zoneId),'ANCHOR_UNKNOWN_ZONE');
  yes(Array.isArray(a.point)&&a.point.length===3&&
   a.point.every((p,i)=>int(p,0,[b.width-1,b.height-1,b.depth-1][i])),
   'ANCHOR_OUTSIDE_BOUNDS');
  yes(['SOLID','AIR','SUPPORTED_FLOOR'].includes(a.expect),
   'INVALID_ANCHOR_EXPECTATION');
  const [x,y,z]=a.point;
  if(a.expect==='SUPPORTED_FLOOR')
   yes(x+1<b.width&&z+1<b.depth&&y+2<b.height,
    'FLOOR_ANCHOR_HEADROOM_OUT_OF_BOUNDS');
  yes(text(a.purpose,8,200),'ANCHOR_EXPLANATION_REQUIRED');
  // Do not allow contradictory expectations at the same exact reference point.
  const k=K(...a.point),old=coords.get(k);
  yes(!old||old===a.expect,'CONTRADICTORY_ANCHOR_EXPECTATIONS');
  coords.set(k,a.expect);types.add(a.expect);
 }
 yes(types.has('SOLID')&&types.has('AIR')&&
  types.has('SUPPORTED_FLOOR'),'PLAN_REQUIRES_SOLID_AIR_FLOOR');
 return structuredClone(plan);
}

/** Independent actual compiled-voxel tests, not self-described LLM success. */
export function inspectPlanAgainstSource({plan,design,compiled}){
 const p=readArchitecturalProgram(plan);
 yes(design?.id===p.id,'SOURCE_PLAN_ID_MISMATCH');
 const b=design.bounds;
 yes(b.width===p.bounds.width&&b.height===p.bounds.height&&
  b.depth===p.bounds.depth,'SOURCE_PLAN_BOUNDS_MISMATCH');
 yes(verifyCompiled(design,compiled),'UNVERIFIED_COMPILED_SOURCE');
 const s=new Set(compiled.primitives.map(q=>K(...q.slice(0,3))));
 const results=[];
 for(const a of p.anchors){
  const [x,y,z]=a.point;
  let passed;
  if(a.expect==='SOLID')passed=s.has(K(x,y,z));
  else if(a.expect==='AIR')passed=!s.has(K(x,y,z));
  else {
   passed=true;
   for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
    if(!s.has(K(x+dx,y,z+dz))||
      s.has(K(x+dx,y+1,z+dz))||
      s.has(K(x+dx,y+2,z+dz)))passed=false;
   }
  }
  results.push({id:a.id,zoneId:a.zoneId,point:[...a.point],
    expectation:a.expect,passed,
    purpose:a.purpose});
 }
 const ok=results.filter(x=>x.passed).length;
 return {sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  programSha256:H(p),verifiedAnchorCount:results.length,
  passedAnchors:ok,failedAnchors:results.length-ok,
  allDeclaredPlanAnchorsMatchSource:ok===results.length,
  results,sourceOnly:true,JapaneseSemanticUnderstandingCertified:false,
  aestheticQualityCertified:false,MinecraftWalkingCertified:false};
}

/**
 * Genuinely model-authored PLAN then source. No fixed genre routing; no
 * synthesized deterministic buildings. At most 3 source attempts, bounded
 * model-proposed improvements only. Returned source is never auto-approved.
 */
export async function generateModelDirectedArchitecture({
 prompt,planner,generator,maxSourceAttempts=3,maxRepairRounds=1
}={}){
 yes(text(prompt,8,3500),'INVALID_USER_PROMPT');
 yes(typeof planner==='function','REAL_PLANNER_REQUIRED');
 yes(typeof generator==='function','REAL_DESIGN_GENERATOR_REQUIRED');
 yes(int(maxSourceAttempts,1,3),'INVALID_SOURCE_ATTEMPT_LIMIT');
 yes(int(maxRepairRounds,0,2),'INVALID_TOPOLOGY_REPAIR_ROUNDS');
 const plan=readArchitecturalProgram(await planner({prompt,
  instruction:'Create a tailored architecture program with genuine zone intent, visual direction and occupied, void and public-floor proof anchors. Source is not yet built; do not report any observed success.'}));
 const brief=prompt+'\n\nB198I MODEL-AUTHORED PROGRAM (NOT VERIFIED YET):\n'+
  JSON.stringify(plan)+'\nCreate ORIGINAL strict B143 JSON design with the exact plan id/bounds.'+
  ' Make SOLID points occupied, AIR points empty, SUPPORTED_FLOOR points a real 2x2 supported floor with two blocks of headroom.';
 yes(brief.length<=6100,'PROMPT_PLUS_PLAN_TOO_LONG');
 const attempts=[];let best=null,bestProof=null,bestCirculation=null,bestSteps=null,bestHigh=Infinity,bestRawHigh=Infinity;
 let modelCalls=0;
 const counted=async req=>{modelCalls++;return generator(req);};
 for(let n=1;n<=maxSourceAttempts;n++){
  let sourcePrompt=brief;
  if(bestProof&&(bestProof.failedAnchors>0||
      bestCirculation?.disconnectedSameElevationAnchorPairs>0||
      bestSteps?.disconnectedDifferentElevationAnchorPairs>0)){
   const missing=bestProof.results.filter(x=>!x.passed)
     .map(x=>({id:x.id,point:x.point,expectation:x.expect}));
   const disconnected=bestCirculation?.disconnectedPairs.slice(0,8)
     .map(x=>({from:x.fromAnchor,to:x.toAnchor,
      standingY:x.standingY,reason:x.reason}))??[];
   const vertical=bestSteps?.disconnectedPairs.slice(0,6)
     .map(x=>({from:x.fromAnchor,to:x.toAnchor,
      fromY:x.fromFloorY,toY:x.toFloorY,
      reason:x.reason}))??[];
   const prefix='\nSOURCE REGENERATION FEEDBACK (REAL B143 COMPILED):\n';
   const suffix='\nRepair the real source-only 2-wide floor paths; for different levels, use side-adjacent 1-block steps with clear headroom. Do not claim actual in-game walking.';
   const room=6100-sourcePrompt.length-prefix.length-suffix.length;
   yes(room>=60,'NO_SPACE_FOR_SOURCE_FEEDBACK');
   sourcePrompt+=prefix+JSON.stringify({missing,disconnected,vertical}).slice(0,room)+suffix;
  }
  yes(sourcePrompt.length<=6100,'REGENERATION_PROMPT_TOO_LONG');
  // B198G provides existing conservative source-topology diagnostics and
  // attempts guarded repair, but *not* semantic/aesthetic certification.
  try{
   const created=await generateArchitectureWithFeedback({
    prompt:sourcePrompt,generator:counted,
    maxRepairRounds,minimumConnectedGain:4
   });
   const proof=inspectPlanAgainstSource({
    plan,design:created.design,compiled:created.compiled
   });
   const rawRisk=created.report.finalHighRiskCount;
   const circulation=inspectPlannedPublicCirculation({
    plan,design:created.design,compiled:created.compiled
   });
   const stepProof=inspectMultiLevelSourceCirculation({
    plan,design:created.design,compiled:created.compiled
   });
   // B198C correctly reports SAME-HEIGHT fragments. In a multilevel
   // building that warning alone may be fully resolved by a proven
   // stepped source graph, but only if every 2x2 source floor footprint
   // belongs to that single component. Never waive missing floor/other HIGH.
   const fullStepped=stepProof.declaredSourceStepChainsSupported&&
    stepProof.allSourceSupportedFloorsInOneSteppedComponent;
   const risk=created.report.remainingSourceFindings.filter(f=>
    f.severity==='HIGH'&&!(fullStepped&&
     f.id==='FRAGMENTED_PUBLIC_SOURCE_FLOORS')).length;
   const sameAnchors=best&&proof.passedAnchors===bestProof.passedAnchors;
   const sameConnections=sameAnchors&&
    circulation.connectedSameElevationAnchorPairs===
     bestCirculation.connectedSameElevationAnchorPairs;
   const sameSteps=sameConnections&&
    stepProof.connectedDifferentElevationAnchorPairs===
     bestSteps.connectedDifferentElevationAnchorPairs;
   const better=!best||proof.passedAnchors>bestProof.passedAnchors||
    (sameAnchors&&circulation.connectedSameElevationAnchorPairs>
      bestCirculation.connectedSameElevationAnchorPairs)||
    (sameConnections&&stepProof.connectedDifferentElevationAnchorPairs>
      bestSteps.connectedDifferentElevationAnchorPairs)||
    (sameSteps&&risk<bestHigh);
   attempts.push({attempt:n,decision:better?'RETAINED_BEST_SOURCE':'REJECTED_NO_EVIDENCE_GAIN',
    sourceSha256:proof.sourceSha256,passedAnchors:proof.passedAnchors,
    failedAnchors:proof.failedAnchors,
    connectedSameElevationPairs:circulation.connectedSameElevationAnchorPairs,
    disconnectedSameElevationPairs:circulation.disconnectedSameElevationAnchorPairs,
    connectedDifferentElevationPairs:stepProof.connectedDifferentElevationAnchorPairs,
    disconnectedDifferentElevationPairs:stepProof.disconnectedDifferentElevationAnchorPairs,
    highRiskSourceFindings:risk,
    originalB198CSourceHighRisks:rawRisk,
    steppedSourceMitigatedSameHeightFragmentation:fullStepped&&rawRisk>risk});
   if(better){best=created;bestProof=proof;
    bestCirculation=circulation;bestSteps=stepProof;bestHigh=risk;
    bestRawHigh=rawRisk;}
   // Do not spend another actual model request on an identical response
   // that has just failed to improve the best independently compiled source.
   if(!better&&proof.sourceSha256===bestProof.sourceSha256)break;
   // Vertical travel is deliberately not certified. Re-generating the
   // same architectural program cannot make an unverified stair proof PASS.
   if(bestProof.allDeclaredPlanAnchorsMatchSource&&bestHigh===0&&
      (bestCirculation.allDeclaredSameElevationPairsConnected||
       bestCirculation.evaluatedSameElevationAnchorPairs===0)&&
      (bestSteps.distinctDeclaredFloorElevations===1||
       bestSteps.declaredSourceStepChainsSupported))break;
  }catch(e){
   // A disconnected request cannot be repaired by another model call.
   if(String(e?.message??e).includes('B198Q_LOCAL_TRANSPORT_'))throw e;
   attempts.push({attempt:n,decision:'REJECTED_MODEL_OR_SOURCE',
    reason:String(e?.message??e).slice(0,240)});
  }
 }
 yes(best!==null,'NO_COMPILED_ARCHITECTURE');
 return {plan,design:structuredClone(best.design),compiled:best.compiled,
  report:{schema:RESULT_SCHEMA,userPromptSha256:H(prompt),
   planSha256:H(plan),sourceSha256:best.compiled.sourceSha256,
   geometrySha256:best.compiled.geometrySha256,
   status:!bestProof.allDeclaredPlanAnchorsMatchSource||bestHigh>0?
    'HOLD_SOURCE_PLAN_OR_TOPOLOGY':
    bestCirculation.evaluatedSameElevationAnchorPairs>0&&
    !bestCirculation.allDeclaredSameElevationPairsConnected?
    'HOLD_SOURCE_CIRCULATION':
    bestSteps.distinctDeclaredFloorElevations>1?
     (bestSteps.declaredSourceStepChainsSupported?
      'SOURCE_MULTILEVEL_STEP_CHAIN_REVIEW_REQUIRED':
      'HOLD_SOURCE_VERTICAL_CIRCULATION_UNVERIFIED'):
    bestCirculation.evaluatedSameElevationAnchorPairs===0?
    'HOLD_SOURCE_CIRCULATION_UNTESTED':
    'SOURCE_PLAN_ANCHORS_PASS_HUMAN_REVIEW_REQUIRED',
   planProof:bestProof,
   circulationProof:bestCirculation,
   multiLevelSourceProof:bestSteps,
   remainingHighRiskSourceFindings:bestHigh,
   originalB198CHighRiskCount:bestRawHigh,
   sameHeightFragmentationMitigatedByFullSteppedSourceProof:
    bestRawHigh>bestHigh,
   attempts,plannerCalls:1,designModelCalls:modelCalls,
   generatorProvenance:'CALLER_SUPPLIED_NOT_INDEPENDENTLY_VERIFIED',
   humanSemanticJudgment:'UNREVIEWED',
   humanAestheticJudgment:'UNREVIEWED',
   independentlyVerifiedJapaneseIntent:false,
   MinecraftWalkingCertified:false,world:world()}
 };
}

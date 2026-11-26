/**
 * Offline strict replay of a saved original model response.
 *
 * This is a source DIAGNOSTIC, never a grammar relaxer or silent redesign.
 * It never calls a model, modifies the source, or contacts Minecraft.
 * node scripts/r125-offline-replay.mjs --raw MODEL_RESPONSE_ORIGINAL.txt --out NEW_DIAGNOSIS.json
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inferR125ExplicitActivityRequirements}
 from '../source/ai/r125-explicit-activity-requirements.mjs';
import {readModelProposal} from '../source/ai/b198-natural-language-design.mjs';
import {validateDesign,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {compileArchitecturePlan,composeR125PublicStairSpine,
 auditArchitecturePlanCirculation,
 assessR125ProgramGeometry,assessR125AuthoredRoomCapacity} from '../source/ai/r125-architecture-plan.mjs';
import {auditR125SourceRoutes,auditR125VisitorRoutes} from '../source/ai/r125-source-routes.mjs';
import {auditR125PairedBayApproach} from '../source/ai/r125-room-daylight.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {r125RequiresWorkObservation,normalizeR125SpatialTreeResponse}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const digest=x=>createHash('sha256').update(x).digest('hex');
const fail=reason=>{throw Error('R125_REPLAY_'+reason);};
const record=(all,severity,code,elementId=null)=>all.push({severity,code,...(
 elementId===null?{}:{elementId})});
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const isTriple=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isSafeInteger);
const rId=/^[a-z][a-z0-9-]{2,47}$/;
const badAssumptions=x=>!Array.isArray(x)||x.length>12||
 x.some(s=>typeof s!=='string'||s.length>250||/[\u0000-\u0008\u000b-\u001f]/.test(s));

export function diagnoseR125Original(raw){
 if(typeof raw!=='string'||raw.length===0||raw.length>60000)
  fail('RAW_INPUT_SIZE');
 const findings=[];
 let candidate;
 try{candidate=JSON.parse(raw);}
 catch{
  record(findings,'ERROR','ORIGINAL_NOT_JSON');
  return {schema:'r125-original-offline-diagnostic-v1',
   originalSha256:digest(raw),status:'HOLD_INVALID_ORIGINAL',
   findings,sourceValidation:'NOT_ATTEMPTED',originalEdited:false,
   inferredCorrectedDesign:false,modelCalls:0,worldWrites:0,
   worldGates:Array(9).fill('BLOCKED')};
 }
 if(!isObj(candidate)){
  record(findings,'ERROR','OUTER_NOT_OBJECT');
 }else{
  if(!['design','explanation','assumptions'].every(k=>Object.hasOwn(candidate,k))||
   Object.keys(candidate).length!==3)
   record(findings,'ERROR','MODEL_FIELDS_NOT_EXACT');
  if(badAssumptions(candidate.assumptions))
   record(findings,'ERROR','ASSUMPTIONS_NOT_BOUNDED_STRING_ARRAY');
  if(typeof candidate.explanation!=='string')
   record(findings,'ERROR','EXPLANATION_NOT_STRING');
  const d=candidate.design;
  if(!isObj(d))record(findings,'ERROR','DESIGN_NOT_OBJECT');
  else{
   if(typeof d.id!=='string'||!rId.test(d.id))
    record(findings,'ERROR','DESIGN_ID_INVALID');
   if(!Array.isArray(d.elements))
    record(findings,'ERROR','ELEMENTS_NOT_ARRAY');
   else{
    // A diagnostic is allowed to inspect element type; never auto-convert
    // type -> mode, never auto-expand bounds, and never fill in missing blocks.
    for(const [i,e] of d.elements.entries()){
     if(!isObj(e)){
      record(findings,'ERROR','ELEMENT_NOT_OBJECT','#'+i);continue;
     }
     const id=typeof e.id==='string'?e.id:'#'+i;
     if(e.type!==undefined)
      record(findings,'ERROR','UNKNOWN_TYPE_FIELD_USE_MODE',id);
     if(!['add','cut'].includes(e.mode))
      record(findings,'ERROR','MISSING_OR_INVALID_MODE',id);
     if(e.mode!=='cut'&&!['stone','concrete','metal','glass','wood','glow','accent'].includes(e.material))
      record(findings,'ERROR','MISSING_OR_INVALID_ADD_MATERIAL',id);
     if(e.shape==='staircase'&&isTriple(e.origin)&&
      isObj(d.bounds)&&
      ['x','z'].includes(e.axis)&&[1,-1].includes(e.direction)&&
      Number.isSafeInteger(e.steps)&&Number.isSafeInteger(e.treadDepth)){
      const axis=e.axis==='x'?0:2;
      const edge=e.origin[axis]+e.direction*(e.steps*e.treadDepth-1);
      const limit=e.axis==='x'?d.bounds.width:d.bounds.depth;
      if(Number.isSafeInteger(limit)&&
       (edge<0||edge>=limit||e.origin[axis]<0||e.origin[axis]>=limit))
       record(findings,'ERROR','STAIRCASE_EXCEEDS_DESIGN_BOUNDS',id);
     }
     if(/(?:door|entrance|window)/i.test(id)&&e.type==='add'||
      /(?:door|entrance|window)/i.test(id)&&e.mode==='add')
      record(findings,'REVIEW','DOOR_OR_WINDOW_MAY_NOT_CUT_WALL_OPENING',id);
     if(/(?:room|interior)/i.test(id)&&e.shape==='box'&&
      isTriple(e.size)&&e.size[1]>=3&&
      (e.type==='add'||e.mode==='add')&&!e.shell)
      record(findings,'REVIEW','ROOM_VOLUME_FILLED_NOT_EMPTY',id);
    }
    const floors=d.elements.filter(e=>isObj(e)&&
     /(?:floor|deck)/i.test(e.id)&&e.shape==='box'&&isTriple(e.origin));
    if(floors.length>=2){
     const heights=[...new Set(floors.map(e=>e.origin[1]))].sort((a,b)=>a-b);
     if(heights.length>=2&&heights[1]-heights[0]<3)
      record(findings,'REVIEW','FLOOR_SEPARATION_UNUSABLE');
    }
   }
  }
 }
 let sourceValidation='HOLD';
 let compilerReason=null,sourceSha256=null,geometrySha256=null,occupiedVoxels=null;
 try{
  const checked=readModelProposal(candidate);
  validateDesign(checked.design);
  const compiled=compileDesign(checked.design);
  sourceValidation='B143_COMPILED_VERIFIED';
  sourceSha256=compiled.sourceSha256;
  geometrySha256=compiled.geometrySha256;
  occupiedVoxels=compiled.primitives.length;
 }catch(e){compilerReason=String(e?.message??e).slice(0,360);}
 return {
  schema:'r125-original-offline-diagnostic-v1',
  originalSha256:digest(raw),
  status:sourceValidation==='B143_COMPILED_VERIFIED'?
   'SOURCE_CANDIDATE_REVIEW_REQUIRED':'HOLD_ORIGINAL_SOURCE',
  compilerReason,
  findings,sourceValidation,sourceSha256,geometrySha256,occupiedVoxels,
  architecturalAdequacy:'NOT_CERTIFIED_BY_STATIC_CHECKS',
  originalEdited:false,inferredCorrectedDesign:false,
  modelCalls:0,worldWrites:0,worldGates:Array(9).fill('BLOCKED')
 };
}


/**
 * Limited independent check of the ORIGINAL user's explicit activities.
 * No genre-specific building template, LLM, automatic repair or world I/O.
 * Only high-confidence equipment affordances; unknown tasks remain UNKNOWN.
 */
export function auditR125ExplicitActivityProxy(requestedBrief,fixtureTargets=[]){
 const base={schema:'r125-explicit-activity-proxy-v1',
  scope:'HIGH_CONFIDENCE_LITERAL_CAPABILITIES_ONLY',
  independentFullBriefCoverage:false,sourceOnly:true,originalEdited:false,
  modelCalls:0,worldWrites:0,realMinecraftFunctionality:'NOT_TESTED'};
 if(typeof requestedBrief!=='string'||!requestedBrief.trim()||
    requestedBrief.length>8000)
  return {...base,status:'NOT_EVALUATED_ORIGINAL_REQUEST_UNAVAILABLE',
   assessed:[],missing:[]};
 if(!Array.isArray(fixtureTargets))fail('INVALID_ACTIVITY_FIXTURES');
 // Explicit ACTIONS, not words describing building genres or aesthetics.
 const placed=new Set(fixtureTargets.map(f=>f.kind));
 const assessed=inferR125ExplicitActivityRequirements(requestedBrief)
  .map(({capability,requiredRole})=>({
   capability,requiredRole,sourcePlacedProxy:placed.has(requiredRole)}));
 const missing=assessed.filter(x=>!x.sourcePlacedProxy)
  .map(x=>({capability:x.capability,requiredRole:x.requiredRole}));
 return {...base,status:missing.length?'HOLD_EXPLICIT_ACTIVITY_PROXY_MISSING':
  assessed.length?'EXPLICIT_ACTIVITY_PROXIES_PRESENT_NOT_FULL_USE_CERTIFIED':
   'NO_HIGH_CONFIDENCE_CUES_NOT_FULL_USE_CERTIFIED',
  assessed,missing};
}

/**
 * Request-scoped, literal room/task coherence. A station elsewhere in the
 * building cannot satisfy a specifically named operation in this room.
 * Unknown purposes are UNKNOWN: no speculative genre templates or repairs.
 */
export function auditR125AuthoredRoomActivityProxy(
 original,requestedBrief,fixtureTargets=[],observationSource=null
){
 const base={schema:'r125-explicit-room-activity-proxy-v1',
  sourceOnly:true,originalEdited:false,independentFullBriefCoverage:false,
  modelCalls:0,worldWrites:0,realMinecraftFunctionality:'NOT_TESTED'};
 if(typeof requestedBrief!=='string'||!requestedBrief.trim()||
    requestedBrief.length>8000||!Array.isArray(original?.levels))
  return {...base,status:'NOT_EVALUATED_ORIGINAL_REQUEST_UNAVAILABLE',
   assessed:[],missing:[]};
 if(!Array.isArray(fixtureTargets))fail('INVALID_ROOM_ACTIVITY_FIXTURES');
 const requested=auditR125ExplicitActivityProxy(requestedBrief,fixtureTargets)
  .assessed;
 const roomEvidence={
  'baking-heating':/焼成設備|焼成炉|オーブン|パンを焼|\b(?:oven|baking)\b/i,
  'washing-basin':/洗面台|手洗い設備|手洗い場|手を洗|\b(?:washbasin|handwashing)\b/i,
  'sleeping-bed':/就寝用ベッド|ベッド|就寝|\b(?:bed|sleeping)\b/i,
  'electronic-maintenance':/電子機器(?:の|を)(?:点検|整備|操作)|\belectronic (?:equipment )?maintenance\b/i,
  'fabrication-bench':/工作台|製作用作業台|組立作業台|\bworkbench\b/i,
  'assembly-workstation':/組立|組み立て|\b(?:assembly|assembling|fabrication)\b/i,
  'parts-inspection':/点検|検査|\b(?:inspection|quality control)\b/i,
  'parts-storage':/保管|収納|\b(?:storage|parts repository|storeroom|stockroom)\b/i,
  'exhibit-stand':/展示ケース|展示台|展示設備|\b(?:display|exhibit|exhibition|gallery)\b/i,
  'records-desk':/事務机|記録用(?:の)?机|作業用デスク|記録|\b(?:record|recording|records|documentation|logbook)\b/i
 };
 // A visitor watching the oven is not operating an oven in their room.
 // Do not credit a real sightline or staff boundary from semantic labels.
 const observerDescription=/(?:焼成|オーブン|パン).*?(?:見学|観察)|(?:見学|観察).*?(?:焼成|オーブン|パン)|\b(?:baking|oven)\b.*\b(?:observation|viewing|watching)\b|\b(?:observation|viewing|watching)\b.*\b(?:baking|oven)\b/i;
 const actualOvenOperation=/焼成(?:作業|管理|担当|を(?:行|担当|管理))|(?:焼成設備|焼成炉|オーブン)(?:を|の)?(?:操作|管理|運用|使用)|パンを焼|\b(?:oven operation|oven management|baking operation|baking station)\b/i;
 const requestWantsBakingView=/(?:焼成|オーブン|パン).*?(?:見学|観察|見る)|(?:見学|観察).*?(?:焼成|オーブン|パン)|\b(?:baking|oven)\s+(?:observation|viewing)\b|\b(?:watch|observe|view)\s+(?:the\s+)?(?:baking|oven)\b/i.test(requestedBrief);
 const requestWantsWorkObservation=r125RequiresWorkObservation(requestedBrief);
 const assessed=[],observerRooms=[];
 for(let li=0;li<original.levels.length;li++){
  const level=original.levels[li];
  for(const space of level.spaces??[]){
   const description=String(space.id??'').replace(/-/g,' ')+
    ' '+String(space.purpose??'');
   const observer=observerDescription.test(description);
   if(observer)observerRooms.push({level:li,zoneId:space.id,
    access:space.access??'UNDECLARED'});
   for(const task of requested){
    if(!roomEvidence[task.capability]?.test(description))continue;
    if(task.capability==='baking-heating'&&observer&&
       !actualOvenOperation.test(description))continue;
    assessed.push({level:li,zoneId:space.id,capability:task.capability,
     requiredRole:task.requiredRole,
     sourcePlacedInRoom:fixtureTargets.some(t=>t.zoneId===space.id&&
      t.kind===task.requiredRole)});
   }
  }
 }
 const missing=assessed.filter(t=>!t.sourcePlacedInRoom)
  .map(({level,zoneId,capability,requiredRole})=>({
   level,zoneId,capability,requiredRole}));
 const observation={
  requested:requestWantsBakingView,observerRooms,
  ovenRooms:original.levels.flatMap((l,li)=>l.spaces
   .filter(s=>fixtureTargets.some(t=>t.zoneId===s.id&&t.kind==='oven'))
   .map(s=>({level:li,zoneId:s.id,access:s.access??'UNDECLARED'}))),
  // A doorway without verified glazing is NOT a safe observation boundary.
  lineOfSight:'NOT_VERIFIED',staffBoundary:'NOT_VERIFIED',
  status:requestWantsBakingView&&observerRooms.length?
   'HOLD_BAKING_OBSERVATION_SOURCE_UNVERIFIED':
   requestWantsBakingView?'NO_AUTHORED_OBSERVER_ROOM_NOT_CERTIFIED':
   'NOT_REQUESTED'
 };
 const workObservation={
  requested:requestWantsWorkObservation,
  authoredRelation:original.observationLink??null,
  sourceStatus:observationSource?.status??'NOT_AUTHORED_VIEW_RELATION_NOT_CERTIFIED',
  status:!requestWantsWorkObservation?'NOT_REQUESTED':
   observationSource?.status==='SOURCE_GLAZED_WORK_VIEW_CONFIRMED'?
    'SOURCE_GLAZED_WORK_VIEW_CONFIRMED':
    'HOLD_WORK_OBSERVATION_SOURCE_UNVERIFIED'
 };
 return {...base,status:missing.length?'HOLD_EXPLICIT_ROOM_ACTIVITY_PROXY_MISSING':
  workObservation.status==='HOLD_WORK_OBSERVATION_SOURCE_UNVERIFIED'?
   'HOLD_WORK_OBSERVATION_SOURCE_UNVERIFIED':
  observation.status==='HOLD_BAKING_OBSERVATION_SOURCE_UNVERIFIED'?
   'HOLD_BAKING_OBSERVATION_SOURCE_UNVERIFIED':
  assessed.length?'EXPLICIT_ROOM_ACTIVITY_PROXIES_PRESENT_NOT_FULL_USE_CERTIFIED':
   'NO_UNAMBIGUOUS_ROOM_TASKS_NOT_FULL_USE_CERTIFIED',
  assessed,missing,observation,workObservation};
}

/**
 * Opt-in offline replay for a SHORT, MODEL-AUTHORED ArchitecturePlan.
 * The model owns the original semantic design; the trusted generic HOST owns
 * geometry. No V6 placement patch, retry, model I/O or Minecraft contact.
 * A SOURCE candidate is never an ART pass or world-construction approval.
 */
/**
 * Genuine model-authored room-use evidence for evaluating the SOURCE.
 * Rectangular plan bounds are not actual walkable floor, and this report
 * is an ART advisory, never automatic functional certification.
 */
export function describeR125AuthoredRoomUse(original,built){
 if(!Array.isArray(original?.levels)||!Array.isArray(built?.program)||
    (built.fixtureTargets!==undefined&&!Array.isArray(built.fixtureTargets)))
  throw Error('R125_ROOM_USE_REQUIRES_MODEL_PROGRAM');
 const floors=original.levels.map((level,i)=>{
  const actual=built.program.find(l=>l.level===i);
  if(!actual)throw Error('R125_ROOM_USE_LEVEL_MISSING');
  const rooms=level.spaces.map(space=>{
   const z=actual.zones.find(z=>z.id===space.id);
   if(!z)throw Error('R125_ROOM_USE_ZONE_MISSING');
   const area=Math.max(0,z.range.x[1]-z.range.x[0]+1)*
    Math.max(0,z.range.z[1]-z.range.z[0]+1);
   const targets=(built.fixtureTargets??[]).filter(t=>t.zoneId===space.id);
   const occupied=targets.reduce((n,t)=>n+t.size[0]*t.size[2],0);
   const label=String(space.id??'').replace(/-/g,' ')+
    ' '+String(space.purpose??'');
   // Advisory only: model-authored room functions, not SOURCE certification.
   const purposeRules=[
    ['assembly','assembly-table',/組立|組み立て|\bassembl(?:y|ing)\b/i],
    ['inspection','inspection-stand',/点検|検査|\binspection\b/i],
    ['storage','storage',/保管|収納|\bstorage\b|\bstoreroom\b|\bparts repository\b/i],
    ['records','desk',/記録|\brecord(?:s|ing)?\b|\bdocumentation\b/i],
    ['large-chart-surface','large-table',/海図|地図|\bcharts?\b/i],
    ['exhibition','display',/展示|\bdisplay\b|\bexhibit(?:ion)?\b|\bgallery\b/i]
   ];
   const stationKinds=targets.map(t=>t.kind);
   const missingTaskStations=purposeRules.filter(([,role,pattern])=>
    pattern.test(label)&&!stationKinds.includes(role))
    .map(([activity,expectedRole])=>({activity,expectedRole}));
   const sparseLargeRoomCandidate=area>=120&&targets.length<=1&&
    occupied/area<0.035;
   return {id:space.id,purpose:space.purpose,access:space.access??null,
    roomBoundsAreaUpperLimit:area,authoredStationCount:targets.length,
    stationKinds,stationFootprintProxyCells:occupied,
    approximateRoomAreaFraction:area?Number((occupied/area).toFixed(3)):null,
    missingTaskStations,sparseLargeRoomCandidate};
  });
  return {storey:i+1,roomCount:rooms.length,
   authoredStationCount:rooms.reduce((n,x)=>n+x.authoredStationCount,0),
   roomsWithoutStations:rooms.filter(x=>x.authoredStationCount===0).map(x=>x.id),
   rooms};
 });
 const taskMismatches=floors.flatMap(f=>f.rooms.flatMap(r=>
  r.missingTaskStations.map(x=>({storey:f.storey,zoneId:r.id,...x}))));
 const sparseLargeRooms=floors.flatMap(f=>f.rooms
  .filter(r=>r.sparseLargeRoomCandidate)
  .map(r=>({storey:f.storey,zoneId:r.id,areaUpperBound:r.roomBoundsAreaUpperLimit,
   stationCount:r.authoredStationCount})));
 return {schema:'r125-authored-room-use-evidence-v1',
  status:'ART_ADVISORY_ONLY_NOT_ACCEPTANCE',
  artAdvisory:{status:'ART_REVIEW_REQUIRED_NOT_SOURCE_GATE',
   taskMismatches,sparseLargeRooms,
   purposeTextDoesNotProveFunction:true,
   areaUpperBoundsDoNotMeasureUsableSpace:true,
   sourcePassUnaffected:true},
  storeys:floors,totalStations:floors.reduce((n,x)=>n+x.authoredStationCount,0),
  roomAreaProxyNotWalkableArea:true,doesNotCertifyFunctionalRoomUse:true,
  modelCalls:0,worldWrites:0,humanArt:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED'};
}


/** Opt-in offline HOST-only room-boundary study, never relabeled as Qwen.
 * Only the single secondary partition ratio may change. Each candidate
 * must re-prove the actual glass-to-workstation ray and public SOURCE access.
 */
function composeR125HostObservationBay(plan,policy,originalError){
 const why=String(originalError?.message??originalError);
 const original=JSON.stringify(plan);
 const info={schema:'r125-host-observation-clearance-v1',
  status:'NOT_APPLICABLE',baselineCompilerReason:why,
  baselineSourceVerified:false,originalPlanSha256:digest(original),
  modelCalls:0,worldWrites:0,originalEdited:false,
  authoredRoomsAxesAccessFixturesPreserved:true};
 const level=plan?.levels?.[0],link=plan?.observationLink;
 if(why!=='R125_OBSERVATION_NO_ACCESSIBLE_GLAZED_SIGHTLINE_TO_WORKSTATION'||
    !link||plan.levels.length!==1||
    !level||level.spaces?.length!==3||level.layoutMode==='spatial-tree'||
    !['x','z'].includes(level.splitAxis))return {plan,report:info};
 const originalPercent=level.secondarySplitPercent??50;
 const alternatives=[25,30,35,40,45,50,55,60,65,70,75]
  .filter(p=>p!==originalPercent)
  .sort((a,b)=>Math.abs(a-originalPercent)-Math.abs(b-originalPercent)||a-b);
 let attempted=0;
 for(const percent of alternatives){
  const derived=structuredClone(plan);
  derived.levels[0].secondarySplitPercent=percent;attempted++;
  let compiled;
  try{
   compiled=compileArchitecturePlan(derived,policy);
   const routes=auditR125SourceRoutes(compiled,{
    featureTargets:compiled.fixtureTargets??[]});
   const visitor=auditR125VisitorRoutes(compiled,derived);
   const walk=auditArchitecturePlanCirculation(compiled);
   if(compiled.observationSource?.status!=='SOURCE_GLAZED_WORK_VIEW_CONFIRMED'||
      routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
      routes.featureAccess?.some(f=>!f.reachableFromEntrance)||
      visitor.status!=='SOURCE_VISITOR_ROUTES_AVOID_STAFF'||
      walk.status!=='SOURCE_CLEARANCE_PROBES_PASS'||
      compiled.worldContacts!==0||compiled.worldWrites!==0||
      compiled.compiled.BuildPlan.operations.length!==0)continue;
  }catch{continue;}
  const compare=structuredClone(derived);
  compare.levels[0].secondarySplitPercent=originalPercent;
  if(JSON.stringify(compare)!==original||JSON.stringify(plan)!==original)
   throw Error('R125_REPLAY_HOST_OBSERVATION_AUTHOR_DRIFT');
  return {plan:derived,built:compiled,report:{...info,
   status:'HOST_BAY_CLEARANCE_SOURCE_PROVEN',
   originalPercent,hostPercent:percent,percentDelta:percent-originalPercent,
   attemptedCandidateCount:attempted,
   changedPlanFields:['levels[0].secondarySplitPercent'],
   derivedPlanSha256:digest(JSON.stringify(derived)),
   modelAuthorship:'HOST_DERIVED_NOT_QWEN_ORIGINAL',
   actualObservationWitness:compiled.observationSource,
   sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
   humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'}};
 }
 if(JSON.stringify(plan)!==original)throw Error('R125_REPLAY_HOST_OBSERVATION_AUTHOR_DRIFT');
 return {plan,report:{...info,status:'NO_SOURCE_VERIFIED_HOST_DERIVATION',
  attemptedCandidateCount:attempted}};
}

export function diagnoseR125ArchitecturePlanOriginal(raw,{hostDetail='legacy',roofGlazing='none',roofMassing='default',fixtureArt='none',fixtureForm='default',requestedBrief=null,
 observationClearance='none'}={}){
 if(!['none','bounded-v1'].includes(observationClearance))fail('OBSERVATION_CLEARANCE_MODE');
 if(typeof raw!=='string'||raw.length<1||raw.length>60000)
  fail('PLAN_RAW_INPUT_SIZE');
 const base={
  schema:'r125-original-architecture-plan-diagnostic-v1',
  originalSha256:digest(raw),originalEdited:false,
  modelCalls:0,modelAuthorshipVerified:false,
  worldContacts:0,worldWrites:0,worldGates:Array(9).fill('BLOCKED'),
  constructionApproved:false,executionAllowed:false,
  artStatus:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'
 };
 let original,normalization;
 try{
  const normalized=normalizeR125SpatialTreeResponse(raw);
  original=normalized.plan;normalization=normalized.normalization;
 }
 catch(error){return {...base,status:'HOLD_INVALID_ORIGINAL_JSON',
  compilerReason:String(error?.message??'ORIGINAL_NOT_JSON').includes(
   'SPATIAL_NORMALIZATION_AMBIGUOUS_FORMAT')?
   'SPATIAL_WIRE_FORMAT_AMBIGUOUS':'ORIGINAL_NOT_JSON',sourceVerified:false};}
 if(!isObj(original))
  return {...base,status:'HOLD_INVALID_ORIGINAL_PLAN',
   compilerReason:'ORIGINAL_NOT_PLAN_OBJECT',sourceVerified:false};
 // Advisory comes from the raw AUTHOR plan even if B143 later cannot place
 // one piece; it never edits the raw answer or guesses a feasible arrangement.
 let spatialCapacity=null;
 try{
  const composition=composeR125PublicStairSpine(original);
  let placementPlan=composition.plan;
  const structuralComposition=composition.report;
  let observationComposition=null;
  try{spatialCapacity=assessR125AuthoredRoomCapacity(placementPlan);}
  catch{ /* The strict compiler supplies the actual failure reason. */ }
  // This is an explicitly chosen GENERIC HOST policy, not a change to the
  // author-provided JSON. It is never selected as a retry after failure.
  const spatialTree=placementPlan.levels?.[0]?.layoutMode==='spatial-tree';
  const hostPolicy={entrancePlacement:spatialTree?'legacy':'source-accessible',
   upperDoorPlacement:Object.hasOwn(original,'expression')?'stair-clear':'legacy',
   ...(hostDetail!=='legacy'?{hostDetail}:{}),
   ...(roofGlazing!=='none'?{roofGlazing}:{}),
   ...(roofMassing!=='default'?{roofMassing}:{}),
    ...(fixtureArt!=='none'?{fixtureArt}:{}),
    ...(fixtureForm!=='default'?{fixtureForm}:{})};
  let built;
  if(observationClearance==='bounded-v1'&&placementPlan.observationLink){
   try{built=compileArchitecturePlan(placementPlan,hostPolicy);}
   catch(err){
    const derived=composeR125HostObservationBay(placementPlan,hostPolicy,err);
    observationComposition=derived.report;
    if(!derived.built)throw err;
    placementPlan=derived.plan;
    built=derived.built;
   }
  }else built=compileArchitecturePlan(placementPlan,hostPolicy);
  if(built.worldContacts!==0||built.worldWrites!==0||
     built.constructionApproved!==false||
     built.gates?.length!==9||built.gates.some(x=>x!=='BLOCKED')||
     built.compiled?.readiness!=='NOT_PREPARED'||
     built.compiled?.worldContacts!==0||
     built.compiled?.BuildPlan?.operations?.length!==0)
    fail('PLAN_WORLD_SAFETY_DRIFT');
  const routes=auditR125SourceRoutes(built,{featureTargets:built.fixtureTargets??[]});
  const visitors=auditR125VisitorRoutes(built,placementPlan);
  const explicitActivityProxy=auditR125ExplicitActivityProxy(requestedBrief,
   built.fixtureTargets??[]);
  const roomActivityProxy=auditR125AuthoredRoomActivityProxy(placementPlan,
   requestedBrief,built.fixtureTargets??[],built.observationSource??null);
  const pairedWindows=built.daylightTargets?.some(x=>x.kind==='paired-bays')?
   auditR125PairedBayApproach(built):null;
  const circulation=auditArchitecturePlanCirculation(built);
  const critique=critiqueArchitecture({design:built.design,compiled:built.compiled});
  const floors=assessR125ProgramGeometry(built,critique);
  const functionalClear=routes.status==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
   !visitors.status.startsWith('HOLD_')&&
   !explicitActivityProxy.status.startsWith('HOLD_')&&
   !roomActivityProxy.status.startsWith('HOLD_')&&
   circulation.status==='SOURCE_CLEARANCE_PROBES_PASS'&&
   (!pairedWindows||pairedWindows.status==='PAIRED_BAY_APPROACH_PASS')&&
   floors.programFloorIssues.length===0;
  return {...base,
   status:functionalClear?'B143_SOURCE_CANDIDATE_ART_HOLD':
    explicitActivityProxy.status.startsWith('HOLD_')?
     'HOLD_EXPLICIT_ACTIVITY_PROXY_MISSING':
    roomActivityProxy.status.startsWith('HOLD_')?
     roomActivityProxy.status:'HOLD_FUNCTIONAL_SOURCE',
   sourceVerified:functionalClear,compilerReason:null,
   hostPolicy,structuralComposition,
   ...(observationComposition?{observationComposition}:{}),
   authoredPlanSha256:digest(JSON.stringify(original)),
   normalizedPlanSha256:normalization.normalizedPlanSha256,
   normalization,
   ...(spatialCapacity?{spatialCapacity}:{}),planSha256:built.planSha256,
   sourceSha256:built.sourceSha256,geometrySha256:built.geometrySha256,
   occupiedVoxels:built.compiled.primitives.length,
   sourceRoutes:routes.status,sourceRouteIssues:routes.issues??[],
   visitorCirculation:visitors,
   observationSource:built.observationSource??{
    status:'NOT_AUTHORED_VIEW_RELATION_NOT_CERTIFIED',
    sourceOnly:true,modelCalls:0,worldWrites:0
   },
   explicitActivityProxy,roomActivityProxy,
   requestedActivityCoverage:'NOT_INDEPENDENTLY_VERIFIED_BY_SOURCE',
   roomUseEvidence:describeR125AuthoredRoomUse(placementPlan,built),
   modelChosenFixtures:built.fixtureTargets?.length??0,
   modelChosenDaylight:built.daylightTargets?.length??0,
   daylightSourceWindows:built.daylightTargets??[],
   ...(pairedWindows?{pairedWindowApproach:{
    status:pairedWindows.status,windowCount:pairedWindows.windowCount,
    reachedWindowCount:pairedWindows.witnesses.filter(x=>
     x.reachableFromEntrance).length,
    windows:pairedWindows.witnesses.map(x=>({
     id:x.id,zoneId:x.zoneId,requiredInteriorSide:x.sourceServiceSide,
     reached:x.reachableFromEntrance,
     supportedTwoWideServiceWitness:x.supportedTwoWideServiceWitness,
     sourceGraphMoves:x.sourceGraphMoves
    })),
    realMinecraftWalking:'NOT_TESTED',worldWrites:0}}:{}),
   fixtureAccess:routes.featureAccess??[],
   circulation:circulation.status,circulationFailures:circulation.failures??[],
   programFloors:floors.status,programFloorIssues:floors.programFloorIssues,
   programFloorEvidence:floors.programFloorEvidence,
   ...(floors.programFloorIssues.length?{
    floorFailureLocation:'SOURCE_COMPONENT_BOUNDS_AND_DOOR_CUTS_NOT_PROVEN_CAUSE'
   }:{}),
   visualHighRiskCount:critique.highRiskCount,
   ...(built.windowRelief?{windowRelief:built.windowRelief}:{}),
   ...(built.spatialLayout?{spatialLayout:built.spatialLayout}:{}),
   ...(built.spatialDetail?{spatialDetail:built.spatialDetail}:{}),
    ...(built.activityInlayReview?{activityInlayReview:built.activityInlayReview}:{}),
    ...(built.fixtureFormReview?{fixtureFormReview:built.fixtureFormReview}:{}),
   ...(built.roomScaleReview?{roomScaleReview:built.roomScaleReview}:{}),
   ...(built.spatialFacadeReview?{spatialFacadeReview:built.spatialFacadeReview}:{}),
   // Only a trusted B143 source candidate, NOT an executable BuildPlan.
   sourceDesign:built.design};
 }catch(error){
  return {...base,status:'HOLD_PLAN_COMPILER_OR_QA',
   sourceVerified:false,compilerReason:String(error?.message??error).slice(0,360),
   ...(error?.spatialFootprint?{spatialFootprint:error.spatialFootprint}:{}),
   ...(spatialCapacity?{spatialCapacity}:{}),
   ...(error?.fixturePlacement?{fixturePlacement:error.fixturePlacement}:{}),
   ...(error?.daylightPlacement?{daylightPlacement:error.daylightPlacement}:{})};
 }
}

export function writeArchitecturePlanReplay(args){
 const dest=args['--out'],parent=path.dirname(dest);
 const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 if(fs.existsSync(dest)||!fs.existsSync(parent)||!fs.statSync(parent).isDirectory())
  fail('PLAN_OUTPUT_MUST_BE_NEW_DIRECTORY');
 const resolvedParent=fs.realpathSync(parent);
 if(resolvedParent===repoRoot||resolvedParent.startsWith(repoRoot+path.sep))
  fail('PLAN_PRIVATE_OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
 const raw=fs.readFileSync(args['--raw'],'utf8');
 const report=diagnoseR125ArchitecturePlanOriginal(raw,{hostDetail:args['--host-detail']??'legacy',
  roofGlazing:args['--roof-glazing']??'none',
   roofMassing:args['--roof-massing']??'default',
  fixtureArt:args['--fixture-art']??'none',
  fixtureForm:args['--fixture-form']??'default',
  observationClearance:args['--observation-clearance']??'none'});
 const {sourceDesign,...diagnosis}=report;
 fs.mkdirSync(dest);
 // Store exact private author bytes before any parsing or B143 review.
 fs.writeFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),raw,{flag:'wx'});
 fs.writeFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),
  JSON.stringify(diagnosis,null,2)+'\n',{flag:'wx'});
 if(sourceDesign){
  fs.writeFileSync(path.join(dest,'B143_SOURCE_REVIEW_ONLY.json'),
   JSON.stringify(sourceDesign,null,2)+'\n',{flag:'wx'});
  // Review the actual B143 voxels from the archived model author, not a
  // fabricated proxy shape or a host-redesigned replacement.
  const template=fs.readFileSync(
   path.join(repoRoot,'source/ai/b143-viewer-template.html'),'utf8');
  const html=renderB143Html(compileB143Gallery([sourceDesign]),template);
  fs.writeFileSync(path.join(dest,'B143_SOURCE_3D_REVIEW_ONLY.html'),
   html,{flag:'wx'});
 }
 return {status:report.status,originalSha256:report.originalSha256,
  sourceSha256:report.sourceSha256??null,
  modelCalls:0,worldWrites:0,humanArt:'NOT_REVIEWED'};
}

export function parseR125ReplayArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(![4,6,8,10,12,14,16].includes(argv.length))fail('REQUIRE_RAW_AND_OUT');
 const opts={};
 for(let i=0;i<argv.length;i+=2){
  if(!['--raw','--out','--host-detail','--roof-glazing','--roof-massing','--fixture-art','--fixture-form','--observation-clearance'].includes(argv[i])||Object.hasOwn(opts,argv[i])||
   !argv[i+1]||argv[i+1].startsWith('--'))fail('INVALID_ARGUMENT');
  opts[argv[i]]=['--host-detail','--roof-glazing','--roof-massing','--fixture-art','--fixture-form','--observation-clearance'].includes(argv[i])?argv[i+1]:path.resolve(argv[i+1]);
 }
 if(!opts['--raw']||!opts['--out']||opts['--raw']===opts['--out'])
  fail('INPUT_OUTPUT_CONFLICT');
 if(opts['--observation-clearance']!==undefined&&opts['--observation-clearance']!=='bounded-v1')fail('OBSERVATION_CLEARANCE_MODE');
 if(opts['--host-detail']!==undefined&&opts['--host-detail']!=='spatial-v1')fail('HOST_DETAIL_MODE');
 if(opts['--roof-glazing']!==undefined&&opts['--roof-glazing']!=='sawtooth-ribbon')fail('ROOF_GLAZING_MODE');
 if(opts['--roof-massing']!==undefined&&!['compact-sawtooth','steep-ridge-review'].includes(opts['--roof-massing']))fail('ROOF_MASSING_MODE');
 if(opts['--fixture-art']!==undefined&&opts['--fixture-art']!=='activity-inlays')fail('FIXTURE_ART_MODE');
 if(opts['--fixture-form']!==undefined&&
   !['room-scale-v1','room-scale-v2'].includes(opts['--fixture-form']))
  fail('FIXTURE_FORM_MODE');
 return opts;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const planMode=process.argv[2]==='--architecture-plan';
  const args=parseR125ReplayArgs(process.argv.slice(planMode?3:2));
  if(args.help)console.log('B143: --raw ORIGINAL.txt --out NEW_DIAGNOSIS.json | ArchitecturePlan: --architecture-plan --raw ORIGINAL.txt --out NEW_PRIVATE_DIRECTORY [--host-detail spatial-v1] [--roof-glazing sawtooth-ribbon] [--roof-massing compact-sawtooth|steep-ridge-review] [--fixture-art activity-inlays] [--fixture-form room-scale-v1|room-scale-v2] [--observation-clearance bounded-v1] (NO MODEL / NO WORLD)');
  else if(planMode){
   const result=writeArchitecturePlanReplay(args);
   console.log('R125_ARCHITECTURE_PLAN_SOURCE_ONLY',JSON.stringify(result));
   if(result.status!=='B143_SOURCE_CANDIDATE_ART_HOLD')process.exitCode=2;
  }else{
   if(args['--host-detail']||args['--roof-glazing']||args['--fixture-form']||args['--observation-clearance'])fail('HOST_POLICY_REQUIRES_ARCHITECTURE_PLAN');
   if(fs.existsSync(args['--out']))fail('OUTPUT_ALREADY_EXISTS');
   const raw=fs.readFileSync(args['--raw'],'utf8');
   const report=diagnoseR125Original(raw);
   fs.writeFileSync(args['--out'],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify({status:report.status,
    compilerReason:report.compilerReason,findings:report.findings.length,
    modelCalls:0,worldWrites:0}));
  }
 }catch(e){console.error('R125_REPLAY_HOLD',String(e?.message??e));process.exitCode=2;}
}


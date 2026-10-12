/**
 * B72: offline, fail-closed bridge from frozen B65/B66/B69/B70/B71 records to
 * actual production Planner INPUT semantics. No production JS imported/executed.
 * Never generates production BuildPlan operations or material/world coordinates.
 */
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=c=>{throw Error(`B72_${c}`)};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validateReport=(r,name)=>{
 if(!r||r.reportSha256!==sha(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='reportSha256'))))fail('BAD_HASH_'+name);
 if(r.readiness!=='NOT_PREPARED'||r.executionAllowed!==false||r.constructionApproved!==false||r.gates?.length!==9||
 r.gates.some(g=>g.status!=='BLOCKED')||r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan.operations?.length!==0||r.BuildPlan.commandCount!==0)fail('SAFETY_'+name);
};
const candidates=new Set(['hotel','office','apartment']);
function assertProductionGrammar(source){
 // This check is deliberately pinned to the source text, not an invented API rule.
 if(typeof source!=='string'||!source.includes('floorHeight = integer("floorHeight", p.floorHeight, 4, 5)')||
   !source.includes('const width = integer("width", 24, 15, 48), depth = integer("depth", 20, 12, 40)')||
   !source.includes('floorCount = integer("floors", 6, 2, 10)')) fail('PRODUCTION_GRAMMAR_CONTRACT_DRIFT');
 for(const k of ['office','apartment','hotel']){
  if(!new RegExp(`programs\\.register\\("${k}"[^;]*floorHeight: [45] \\}`).test(source))fail('PROGRAM_REGISTRY_DRIFT_'+k);
 }
}
/** Exact production-supported INPUT candidates; not an approval to call Planner. */
export function compileB72(b65,b66,b69,b70,b71,pinnedGrammar){
 for(const [n,v] of [['B65',b65],['B66',b66],['B69',b69],['B70',b70],['B71',b71]])validateReport(v,n);
 if(!eq([b71.provenance.b65,b71.provenance.b66,b71.provenance.b69,b71.provenance.b70],
  [b65.reportSha256,b66.reportSha256,b69.reportSha256,b70.reportSha256]))fail('LINEAGE');
 if(b71.productionContract.filesPinned!==5||b71.summary.sections!==30||b71.summary.nominalWallRefs!==5704||b71.summary.nominalDoorVoidReservations!==314||
  b71.summary.floorRunRefs!==4402||b71.summary.heldOutsideMask!==18||b71.summary.blockedFloorPitchMismatch!==24||
  b71.summary.realDoorBlocks!==0||b71.summary.realStairBlocks!==0)fail('B71_SCOPE');
 assertProductionGrammar(pinnedGrammar);
 const grammarHash=createHash('sha256').update(pinnedGrammar,'utf8').digest('hex');
 if(grammarHash!=='71c0e2bda3e7a044285d681b38d9d4373e3c0aa417808a2f54c652d05ff47d1a')fail('GRAMMAR_NOT_PINNED');
 const grouping=new Map();
 for(const s of b65.sections){
  if(typeof s.id!=='string'||!/^((hotel|office|apartment)\/candidate-\d{2}\/L[1-6])$/.test(s.id)||s.level<1||s.level>6)fail('SECTION_ID');
  const id=s.id.slice(0,s.id.lastIndexOf('/')), program=id.split('/')[0];
  if(!candidates.has(program))fail('UNKNOWN_PROGRAM');
  if(!grouping.has(id)) grouping.set(id,{id,program,dimensions:s.dimensions,levels:[]});
  const g=grouping.get(id);
  if(!eq(g.dimensions,s.dimensions))fail('INCONSISTENT_SITE');
  g.levels.push(s.level);
 }
 if(grouping.size!==5)fail('GROUPS');
 const jobs=[...grouping.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(g=>{
  if(!eq([...g.levels].sort((a,b)=>a-b),[1,2,3,4,5,6]))fail('MISSING_OR_DUPLICATE_FLOOR');
  const {width,depth}=g.dimensions;
  if(!Number.isSafeInteger(width)||width<15||width>48||!Number.isSafeInteger(depth)||depth<12||depth>40)fail('SITE_OUTSIDE_REAL_GRAMMAR');
  const input={buildingType:g.program,width,depth,floors:6,floorHeight:5};
  return {id:g.id,createBuildingPlanInputCandidate:input,explicitFloorHeightOverride:g.program!=='hotel',
   nominalPitchInputCompatible:true,productionOutputReceived:false,
   existingMassingAndFloorMaskCompared:false,worldOrientationCalibrated:false,
   physicalDoorsAndStairsMapped:false,sendToPlannerAllowed:false,constructionApproved:false};
 });
 const body={schema:'minecraftaibuilder-b72-production-input-and-mask-preflight-v1',
  kind:'SOURCE_BACKED_PLANNER_INPUT_CANDIDATES_NOT_PLAN_EXECUTION',
  provenance:{b65:b65.reportSha256,b66:b66.reportSha256,b69:b69.reportSha256,b70:b70.reportSha256,
   b71:b71.reportSha256,pinnedGrammarSha256:grammarHash,sourceEvidenceZipSha256:b71.provenance.evidenceZipSha256},
  summary:{buildings:jobs.length,sections:30,explicitFiveHighInputCandidateBuildings:5,
   existingFourHighDefaultBuildings:4,defaultMismatchFloors:24,
   sourceSupportedFloorPitchFiveCandidates:30,
   realOutputVerifiedFloors:0,physicalDoorBlocks:0,physicalStairBlocks:0,worldCommands:0},
  jobs,
  preflight:{productionAPI:'createBuildingPlan(input, options) / GeneralBuildingPlanner.fromComposition',
   requirement:'READ_ONLY_PRODUCTION_OUTPUT_SNAPSHOT_PLUS_TRANSFORM_CALIBRATION',
   runtimeStatus:'NOT_EXECUTED',maskParity:'UNVERIFIED',externalWallConflict:'UNVERIFIED',doorHeadroom:'UNVERIFIED'},
  unresolved:['PRODUCTION_DEPENDENCIES_NOT_YET_PROVIDED','PRODUCTION_OUTPUT_NOT_AVAILABLE',
    'REAL_MASKING_MASSING_ORIENTATION_AND_FACADE_CONFLICT_UNVERIFIED',
    'REAL_INTERIOR_DOOR_AND_STAIR_MODULES_NOT_PRESENT_IN_5_PINNED_FILES',
    'B70_18_OUT_OF_MASK_RESERVATIONS_HELD','B42_UPPER_60_DOORS_HELD','B62_B64_ALTERNATIVE_HELD'],
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,
  gates:b71.gates.map(x=>({...x})),worldContacts:0,engineCalls:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:sha(body)};
}
/** Compare actual local, non-executed production plan JSON to frozen B66 masks.
 * Only tests footprint union: never imports Planner or executes operations. */
export function preflightProductionPlan(plan,job,b66){
 if(!job||job.sendToPlannerAllowed!==false||job.productionOutputReceived!==false||job.constructionApproved!==false)fail('UNSAFE_JOB');
 validateReport(b66,'B66');
 const c=plan?.composition,i=job.createBuildingPlanInputCandidate;
 if(plan.type!=='general_building'||!c||c.program!==i.buildingType||c.floorHeight!==5||c.floorCount!==6||
  !eq(c.dimensions,{width:i.width,depth:i.depth})||!['north','east','south','west'].includes(c.orientation))fail('PLAN_COMPOSITION');
 if(!Array.isArray(plan.masses)||plan.masses.length===0||plan.masses.length>300||!Array.isArray(plan.operations)||plan.operations.length>200000)fail('PLAN_MISSING_GEOMETRY');
 if(plan.operations.some(o=>o.type!=='fill'||!o.from||!o.to))fail('UNKNOWN_OPERATION');
 const sections=b66.sections.filter(s=>s.id.startsWith(job.id+'/'));
 if(sections.length!==6)fail('FROZEN_SECTIONS');
 const {width,depth}=i;let missing=0,extra=0,matched=0;
 const samples={outsideProduction:[],outsideNominal:[]};
 for(const sec of sections){
  if(sec.floorMaskRows.length!==depth||sec.floorMaskRows.some(row=>row.length!==width||!/^[01]+$/.test(row)))fail('FROZEN_MASK_SHAPE');
  const mask=Array.from({length:depth},()=>new Uint8Array(width));
  for(const mass of plan.masses){
   if(![mass.x,mass.z,mass.width,mass.depth,mass.start,mass.end].every(Number.isSafeInteger)||mass.width<3||mass.depth<3||mass.x<0||mass.z<0||mass.start<0||mass.end>6||mass.start>=mass.end||mass.x+mass.width>width||mass.z+mass.depth>depth)fail('INVALID_PRODUCTION_MASS');
   if(!(mass.start<=sec.level-1&&sec.level-1<mass.end))continue;
   for(let z=mass.z;z<mass.z+mass.depth;z++)for(let x=mass.x;x<mass.x+mass.width;x++)mask[z][x]=1;
  }
  for(let z=0;z<depth;z++)for(let x=0;x<width;x++){
   const ref=sec.floorMaskRows[z][x]==='1',actual=mask[z][x]===1;
   if(ref&&actual)matched++;
   else if(ref&&!actual){missing++;if(samples.outsideProduction.length<8)samples.outsideProduction.push({floor:sec.level,x,z});}
   else if(!ref&&actual){extra++;if(samples.outsideNominal.length<8)samples.outsideNominal.push({floor:sec.level,x,z});}
  }
 }
 return {buildingId:job.id,productionOutputInspected:true,
  floorHeightCandidateMatch:true,matchedCells:matched,missingNominalCells:missing,extraProductionCells:extra,
  footprintParity:missing===0&&extra===0?'FOOTPRINT_CELLS_MATCH_NOT_FULL_RUNTIME_PARITY':'BLOCKED_FOOTPRINT_DISAGREEMENT',
  sampleConflicts:samples,orientation:c.orientation,orientationTransformChecked:false,
  roleMaterialsChecked:false,doorAndStairStatesChecked:false,externalWallConflictChecked:false,
  emissionAllowed:false,constructionApproved:false,BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0}};
}

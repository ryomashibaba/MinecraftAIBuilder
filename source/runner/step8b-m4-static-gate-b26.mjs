/** B26 / M4 read-only evidence normalization. NEVER emits operations or world coordinates.
 *  B25 frozen ledger + minimal, privacy-filtered 2026-10-10 Windows source facts.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildB25M3G, validateB25M3G} from './step8b-m3g-junction-compiler-b25.mjs';
const hash = x => createHash('sha256').update(Buffer.isBuffer(x)||typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const fail = code => {throw Object.assign(new Error('B26_'+code),{code:'B26_'+code});};
const SOURCE_FACTS_SHA = '1ad44072ebbe9a5bb80d55b39d52f20471553c38e7df377e936ac9cfac1394dd';
const noPlan = () => ({status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});
function pinnedFacts(root){
 const p=path.join(root,'reports/B26_ENGINE_SOURCE_FACTS.json');
 const s=fs.lstatSync(p); if(!s.isFile()||s.isSymbolicLink())fail('SOURCE_FACTS_UNSAFE');
 const bytes=fs.readFileSync(p); if(hash(bytes)!==SOURCE_FACTS_SHA)fail('SOURCE_FACTS_CHANGED');
 const r=JSON.parse(bytes.toString('utf8'));
 if(r.schema!=='minecraftaibuilder-b26-readonly-snapshot-facts-v1'||r.evidenceDate!=='2026-10-10'||
  r.educationVersion!=='v26.3'||r.recordCounts.total!==966||r.recordCounts.statuses.verified!==827||
  r.recordCounts.statuses.unsupported!==139||r.recordCounts.byForm.door.records!==0||
  r.sourceContracts.engineRuntimeAttested!==false||r.sourceContracts.doorBlockStateLiveVerification!==false||
  r.safety.constructionApproved!==false||r.safety.operationCount!==0||r.safety.worldAccess!==false)fail('SOURCE_FACTS_CONTRACT');
 return r;
}
export function rotateSymbolicLocal(p,facing){
 if(!p || !['x','y','z'].every(k=>Number.isSafeInteger(p[k]))||
    !['north','east','south','west'].includes(facing))fail('SYMBOLIC_ROTATION');
 const {x,y,z}=p;
 let q;
 switch(facing){case 'north':q={x,y,z:-z};break;case 'east':q={x:z,y,z:x};break;
 case 'south':q={x:-x,y,z};break;case 'west':q={x:-z,y,z:-x};break;}
 return Object.fromEntries(Object.entries(q).map(([k,v])=>[k,v===0?0:v]));
}
export function inspectMaterialEvidence(facts,category){
 if(!['door','stairs','planks','slab','trapdoor'].includes(category))fail('MATERIAL_CATEGORY');
 const f=facts?.recordCounts?.byForm?.[category];
 if(!f||!Number.isSafeInteger(f.records)||f.records<0||
    Object.values(f.statuses||{}).some(x=>!Number.isSafeInteger(x)||x<0))fail('MATERIAL_SCHEMA');
 return {category,archivedRecordCount:f.records,archivedVerifiedRecords:f.statuses.verified??0,
  archivedUnsupportedRecords:f.statuses.unsupported??0,
  evidenceLevel:'HISTORICAL_PROFILE_ONLY_NOT_LIVE_ATTESTATION',
  proposedMaterial:null,constructionCompatible:false};
}
function checkB25(r){
 if(!r||r.schema!=='minecraftaibuilder-step8b-b25-m3g-compiler-v1'||r.deploymentGate!=='BLOCKED'||
  r.safety?.notPrepared!==true||r.safety?.constructionApproved!==false||r.BuildPlan?.operations?.length!==0||
  r.BuildPlan?.status!=='NOT_PREPARED'||r.counts?.wallPanels!==5704||r.counts?.doorPorts!==314||
  r.counts?.stairCutoutCandidateCells!==50||r.counts?.sharedWallVoxels!==3990)fail('B25_CONTRACT');
}
export function normalizeM4PreflightEvidence(b25,facts){
 checkB25(b25);
 if(facts?.schema!=='minecraftaibuilder-b26-readonly-snapshot-facts-v1'||
  facts?.sourceContracts?.engineRuntimeAttested!==false||facts?.sourceContracts?.doorBlockStateLiveVerification!==false||
  facts?.safety?.constructionApproved!==false||facts?.safety?.worldAccess!==false||
  facts?.recordCounts?.byForm?.door?.records!==0)fail('EVIDENCE_CONTRACT');
 const categories=['planks','stairs','slab','door','trapdoor'];
 const materials=categories.map(x=>inspectMaterialEvidence(facts,x));
 const b25Doors=b25.buildings.flatMap(b=>b.floors.flatMap(f=>f.doors.doorStateContracts));
 const b25Stairs=b25.buildings.flatMap(b=>b.stairs);
 if(b25Doors.length!==314||b25Stairs.length!==25||
   b25Doors.some(x=>x.stateLower!=='UNKNOWN'||x.stateUpper!=='UNKNOWN'||x.hinge!=='UNKNOWN'||
    x.facing!=='UNKNOWN'||x.doorBlockId!=='UNKNOWN'||x.applied!==false)||
   b25Stairs.some(x=>x.physicalCutouts!==0||x.localCutoutCellCoordinates.length!==2||x.applied!==false))fail('PHYSICAL_EVIDENCE_PROMOTION');
 const rotations=['north','east','south','west'].map(facing=>({
  facing,transformedLocalUnitX:rotateSymbolicLocal({x:1,y:0,z:0},facing),
  transformedLocalUnitZ:rotateSymbolicLocal({x:0,y:0,z:1},facing),
  coordinateSystem:'SYMBOLIC_ORIENTATION_ONLY_NO_ANCHOR',worldPosition:null}));
 const blockers=[
  {id:'M4-01',reason:'LIVE_ENGINE_IDENTITY_UNATTESTED',confirmed:false},
  {id:'M4-02',reason:'MATERIALS_NOT_BOUND_TO_INTERIOR_ROLES',confirmed:false},
  {id:'M4-03',reason:'SHARED_WALL_MATERIAL_AND_JOINTS_UNKNOWN',confirmed:false},
  {id:'M4-04',reason:'DOOR_LOWER_UPPER_HINGE_AND_FACING_UNKNOWN',confirmed:false},
  {id:'M4-05',reason:'NO_HISTORIC_EXACT_DOOR_STATE_VERIFICATION',confirmed:false},
  {id:'M4-06',reason:'STAIR_SLAB_SUPPORT_AND_HEADROOM_UNPROVEN',confirmed:false},
  {id:'M4-07',reason:'WORLD_ANCHOR_AND_SITE_SAFETY_NOT_ATTESTED',confirmed:false},
  {id:'M4-08',reason:'OFFICE02_EXTERIOR_AND_CORRIDOR_DIFF_UNRESOLVED',confirmed:false},
  {id:'M4-09',reason:'NO_EXPLICIT_CONSTRUCTION_APPROVAL',confirmed:false},
 ];
 return {
  schema:'minecraftaibuilder-step8b-b26-m4-offline-gate-v1',
  kind:'STATIC_EVIDENCE_ANALYSIS_NOT_RUNTIME_PROOF',
  source:{b25ReportHash:b25.reportSha256,windowsSnapshotSha256:facts.captureZipSha256,
   windowsEvidenceDate:facts.evidenceDate,educationVersion:facts.educationVersion,
   sourceHashes:facts.sourceHashes,sourceHashesVerifiedAtCreation:true,liveRuntimeVerified:false},
  archivedProfile:{records:facts.recordCounts.total,verifiedAtCapture:facts.recordCounts.statuses.verified,
   unsupportedAtCapture:facts.recordCounts.statuses.unsupported,statusMeaning:'ARCHIVED_2026_10_10_NOT_CURRENT_RUNTIME',materials},
  interior:{buildings:b25.counts.buildings,floors:b25.counts.floors,
   wallPanels:b25.counts.wallPanels,sharedWallVoxels:b25.counts.sharedWallVoxels,
   materialVerifiedSharedWalls:0,doorPorts:b25Doors.length,
   nominalRelocations:b25.counts.doorMoveCandidates,
   historicalExactDoorVerificationRecords:facts.recordCounts.byForm.door.records,
   lowerAndUpperDoorStatesVerified:0,doorPositionsWorldMapped:0,
   stairLinks:b25Stairs.length,cutoutCandidateCells:b25.counts.stairCutoutCandidateCells,
   actualCutouts:0,stairSupportVerified:0,
   office02ExteriorDelta:123,office02CorridorDelta:18},
  symbolicRotations:rotations,
  blockers,allBlockersOpen:blockers.every(x=>x.confirmed===false),
  nextWindowsReadOnlyInputs:['LOCAL_SOURCE_FINGERPRINTS','PROFILE_VERSION_AND_RECORD_COUNTS','NODE_PROCESS_METADATA'],
  caution:'BLOCK_STATES_IN_SOURCE_DO_NOT_PROVE_GAME_ACCEPTANCE. NO_WORLD_OPERATIONS.',
  gate:{deployment:'BLOCKED',readiness:'NOT_PREPARED',constructionApproved:false,
   worldAccess:false,bridgeContact:false,commandsEmitted:0,physicalChanges:0,
   emitBuildPlanAllowed:false,runtimeProven:false},
  BuildPlan:noPlan()
 };
}
export function buildB26M4(root){
 if(typeof root!=='string'||!root)fail('ROOT');
 const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/B25_JUNCTION_COMPILER_LEDGER.json'),'utf8'));
 if(!validateB25M3G(saved,root))fail('FROZEN_B25');
 const facts=pinnedFacts(root);
 const result=normalizeM4PreflightEvidence(saved,facts);
 result.reportSha256=hash(result);
 return result;
}
export function validateB26M4(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b26-m4-offline-gate-v1'||
  report?.kind!=='STATIC_EVIDENCE_ANALYSIS_NOT_RUNTIME_PROOF'||
  report?.gate?.deployment!=='BLOCKED'||report?.gate?.readiness!=='NOT_PREPARED'||
  report?.gate?.constructionApproved!==false||report?.gate?.emitBuildPlanAllowed!==false||
  report?.gate?.runtimeProven!==false||report?.gate?.commandsEmitted!==0||
  report?.gate?.worldAccess!==false||report?.gate?.bridgeContact!==false||
  report?.gate?.physicalChanges!==0||report?.BuildPlan?.status!=='NOT_PREPARED'||
  !Array.isArray(report?.BuildPlan?.operations)||report.BuildPlan.operations.length!==0||
  report.BuildPlan.commandCount!==0||report.BuildPlan.worldCoordinates!==null||
  report.BuildPlan.materialIds?.length!==0||report.allBlockersOpen!==true||
  report.blockers?.length!==9||report.blockers.some(x=>x.confirmed!==false))fail('SAFETY');
 const {reportSha256,...unsigned}=report;
 if(hash(unsigned)!==reportSha256)fail('HASH');
 if(hash(report)!==hash(buildB26M4(root)))fail('FROZEN_REPLAY');
 return true;
}

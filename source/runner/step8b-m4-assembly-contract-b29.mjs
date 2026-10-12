/** B29 M3/M4 offline assembly contract.
 * Reads PINNED old artifacts only. No world, bridge, network, engine invocation,
 * material IDs, placement operations or active construction permission.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sha = v => createHash('sha256').update(Buffer.isBuffer(v)||typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const fail = reason => {const e=new Error(`B29_${reason}`);e.code=`B29_${reason}`;throw e;};
const BASE_MANIFEST_SHA='0c087a167a6437a9b39c70644aed42bc6386ff544f2048af65811eca5c85f71d';
const INPUTS=['reports/B25_JUNCTION_COMPILER_LEDGER.json',
  'reports/B26_M4_READONLY_PREFLIGHT.json','reports/B13_MODULE_CONTRACT_REPORT.json',
  'reports/B11_LOCAL_REPAIR_REPORT.json','reports/B17_INTERIOR_INTEGRATION_IR.json',
  'reports/B28_REAL_WINDOWS_RECONCILIATION.json','reports/B26_ENGINE_SOURCE_FACTS.json'];
const noPlan=()=>({status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});
const key=p=>`${p.x},${p.z}`;
const validCell=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function validateFrozen(b25,b26,b13,b11,ir,b28,facts){
 if(b25?.schema!=='minecraftaibuilder-step8b-b25-m3g-compiler-v1'||b25?.counts?.wallPanels!==5704||
  b25?.counts?.doorPorts!==314||b25?.counts?.sharedWallVoxels!==3990||b25?.counts?.stairLinks!==25||
  b25?.deploymentGate!=='BLOCKED'||b25?.candidateApplied!==false||
  b26?.blockers?.length!==9||b26?.allBlockersOpen!==true||b26?.gate?.deployment!=='BLOCKED'||
  b26?.gate?.readiness!=='NOT_PREPARED'||b28?.remainingBlockers!==9||
  b28?.disk?.matched!==9||b28?.runtime?.identityAttested!==false||
  b28?.archivedCatalog?.liveMinecraftAcceptanceProven!==false||
  ir?.coordinateFrame!=='SCHEMATIC_LOCAL_CONCEPT_XZ_NOMINAL_Y'||ir?.physicalValidated!==false||
  b13?.office02?.conceptWing!==5||b13?.office02?.sourceWing!==6||
  b11?.candidates?.length!==5||b13?.office02ReviewAlternatives?.length!==4||
  facts?.schema!=='minecraftaibuilder-b26-readonly-snapshot-facts-v1'||
  facts.sourceContracts?.engineRuntimeAttested!==false||
  facts.sourceContracts?.doorBlockStateLiveVerification!==false||
  facts.recordCounts?.byForm?.door?.records!==0||
  !['upper_block_bit','door_hinge_bit','open_bit','direction'].every(t=>facts.sourceContracts?.doorStateTokensInTransformSource?.[t]===true))fail('BASELINE');
 for(const obj of [b25,b26,b13,b11,ir,b28]){
  if(obj?.BuildPlan?.status!=='NOT_PREPARED'||obj.BuildPlan.operations?.length!==0||
    obj.BuildPlan.commandCount!==0||
    (obj.BuildPlan.worldCoordinates!==undefined&&obj.BuildPlan.worldCoordinates!==null)||
    obj.safety?.constructionApproved===true)fail('UNSAFE_BASELINE');
 }
}
function fromArchive(root){
 if(typeof root!=='string'||!root)fail('ROOT');
 const mpath=path.join(root,'B28_FILE_SHA256.json');
 const mstat=fs.lstatSync(mpath);if(!mstat.isFile()||mstat.isSymbolicLink())fail('MANIFEST_FILE');
 const mbytes=fs.readFileSync(mpath);
 if(sha(mbytes)!==BASE_MANIFEST_SHA)fail('MANIFEST_CHANGED');
 const m=JSON.parse(mbytes.toString('utf8'));
 if(m.schema!=='minecraftaibuilder-b28-m4-real-windows-evidence-manifest-v1'||m.fileCount!==511||
  Object.keys(m.files||{}).length!==511)fail('MANIFEST_SCHEMA');
 const result=INPUTS.map(rel=>{
  if(!/^[\w/-]+\.json$/.test(rel)||!m.files[rel])fail('MISSING_PIN');
  const p=path.join(root,rel),st=fs.lstatSync(p);
  if(!st.isFile()||st.isSymbolicLink())fail('UNSAFE_INPUT_FILE');
  const contents=fs.readFileSync(p);if(sha(contents)!==m.files[rel])fail('FROZEN_FILE_CHANGED');
  const parsed=JSON.parse(contents.toString('utf8'));
  const {reportSha256,...body}=parsed;
  if(rel==='reports/B26_ENGINE_SOURCE_FACTS.json') {
    if(reportSha256!==undefined)fail('FACTS_UNEXPECTED_REPORT_HASH');
  } else if(reportSha256!==sha(body))fail('FROZEN_REPORT_BODY');
  return parsed;
 });
 return result;
}
function boundaryAxis(b,door){
 const side=b?.from,target=b?.to;
 if(!validCell(side)||!validCell(target)||
  Math.abs(side.x-target.x)+Math.abs(side.z-target.z)!==1||
  b.id!==door.nominalBoundaryId)fail('DOOR_BOUNDARY');
 // Boundary crosses adjacent cells; only normal *axis* is known, not door facing.
 return side.x!==target.x?'X':'Z';
}
const ROLES=Object.freeze(['PARTITION_WALL','ROOM_DOOR','STAIR_RUN','FLOOR_CUTOUT','JUNCTION']);
function materialRoles(){return ROLES.map(role=>({role,blockId:null,variant:null,
  evidence:'ARCHIVED_CATALOG_FINGERPRINT_ONLY',liveAcceptance:'UNVERIFIED',
  mappedToEngine:false,placementAuthorized:false}));}
function stageFloor(b,f,ifloor,facts){
 if(!f||f.id!==ifloor?.id||f.wallPanelCount!==ifloor.wallBoundaries?.length||
   f.doorPortCount!==ifloor.roomDoorInterfaces?.length||f.commands?.length!==0||f.applied!==false)
   fail('FLOOR_CONTRACT');
 const boundaries=new Map(ifloor.wallBoundaries.map(x=>[x.id,x]));
 const doors=f.doors?.doorStateContracts;
 if(!Array.isArray(doors)||doors.length!==f.doorPortCount)fail('DOOR_TOTAL');
 const ids=new Set(),doorContracts=[];
 for(const d of doors){
  if(ids.has(d.portId)||d.applied!==false||d.physicalValidation!=='UNKNOWN'||
     !validCell(d.localCell)||d.nominalOpeningHeightCells!==2||d.nominalOpeningWidthCells!==1||
     d.stateLower!=='UNKNOWN'||d.stateUpper!=='UNKNOWN'||d.facing!=='UNKNOWN'||
     d.hinge!=='UNKNOWN'||d.doorBlockId!=='UNKNOWN')fail('UNSAFE_DOOR');
  ids.add(d.portId);
  const bb=boundaries.get(d.nominalBoundaryId);
  const axis=boundaryAxis(bb,d);
  const ref=ifloor.roomDoorInterfaces.find(x=>x.id===d.portId);
  if(!ref||d.roomId!==ref.roomId||ref.openingPhysicalVerified!==false||
     !bb.roomIds.includes(d.roomId))fail('DOOR_PROVENANCE');
  doorContracts.push({portId:d.portId,roomId:d.roomId,localCell:d.localCell,
   boundaryId:d.nominalBoundaryId,axisHint:axis,
   lower:{cell:{...d.localCell,y:ifloor.localYRange[0]+1},state:null},
   upper:{cell:{...d.localCell,y:ifloor.localYRange[0]+2},state:null},
   physicalFacing:null,hinge:null,openState:null,blockId:null,
   jambSupport:'UNVERIFIED',worldTransform:null,
   stateSchemaTokens:['upper_block_bit','door_hinge_bit','open_bit','direction'].filter(t=>facts.sourceContracts.doorStateTokensInTransformSource[t]===true),
   stateTokenStatus:'SEEN_IN_PINNED_TRANSFORM_SOURCE_NOT_VALIDATED_FOR_A_DOOR_BLOCK',
   connectedInConceptOnly:true,ready:false});
 }
 if(f.occupancy?.sharedVoxelCount!==f.junctions?.length||
   f.occupancy?.unresolvedMaterialJunctions!==f.junctions?.length||
   f.junctions.some(j=>j.materialEquality!=='UNKNOWN'||j.physicalJoinApproved!==false))fail('JUNCTION_CONTRACT');
 return {id:f.id,level:ifloor.level,schematicFrame:'LOCAL_INTEGER_GRID_NO_WORLD',
  nominalYRange:ifloor.localYRange,partitionPanelIntents:f.wallPanelCount,
  wallJunctions:{sharedVoxelIntents:f.junctions.length,
   canonicalOwnersAssigned:f.occupancy.canonicalOwnerCount,
   crossRoomOwnershipConflict:f.occupancy.topologyBreakdown.DISJOINT_ROOM_SCOPE,
   materialJoinValidated:0},
  doorPorts:doorContracts,physicalWallThickness:'UNVERIFIED',
  physicalPrivacy:'UNVERIFIED',commands:[],applied:false};
}
function stageStair(stair,floors){
 if(!floors.some(x=>x.id===stair.lowerFloor)||!floors.some(x=>x.id===stair.upperFloor)||
   stair.physicalCutouts!==0||stair.floorSupport!=='UNKNOWN'||stair.twoBlockHeadroom!=='UNVERIFIED'||
   stair.walkability!=='UNVERIFIED'||stair.applied!==false||
   stair.cutoutCandidateCells!==2||stair.localCutoutCellCoordinates?.length!==2||
   stair.localCutoutCellCoordinates.some(x=>!validCell(x)))fail('STAIR_CONTRACT');
 return {id:stair.id,fromFloor:stair.lowerFloor,toFloor:stair.upperFloor,
  cutoutCandidateCells:stair.localCutoutCellCoordinates.map(x=>({...x})),
  cutoutStatus:'CANDIDATE_NOT_CUT',support:'UNVERIFIED',headroom:'UNVERIFIED',
  stairBlockStates:null,worldCoordinates:null,engineFloorOperationOverride:false,commands:[]};
}
function officeReview(b13,b11,ir){
 const a=b13.office02, keyOffice='office/candidate-02';
 const c=b11.candidates.find(x=>x.key===keyOffice),b=ir.buildings.find(x=>x.id===keyOffice);
 if(!c||!b||a.levels?.length!==6||c.levels?.length!==6||b.floors?.length!==6||
  c.summary.outOfEnvelopeCorridorCells!==18||c.summary.componentSplits!==0||
  a.levels.reduce((s,f)=>s+f.changedCells,0)!==123||
  a.levels.reduce((s,f)=>s+f.conceptCorridorOutsideSource,0)!==18)fail('OFFICE_BASELINE');
 const cuts=[];
 for(let i=0;i<6;i++){
  const level=c.levels[i],source=a.levels[i],floor=b.floors[i];
  if(level.level!==i+1||source.level!==i+1||level.removedLocalCells.length!==3||
   level.splitOriginalComponents!==0||level.protectedRemoved!==0||
   level.outsideReservations?.doors!==0||level.outsideReservations?.stair!==0||
   source.conceptCorridorOutsideSource!==3||source.trimSuggestionCells!==3||
   !level.removedLocalCells.every(p=>validCell(p)))fail('OFFICE_CUT');
  const core=new Set([...floor.stairReservation,...floor.elevatorReservation,
   ...floor.roomDoorInterfaces.map(x=>x.hallCell),
   ...floor.roomDoorInterfaces.map(x=>x.doorCell)].map(key));
  const hall=new Set(floor.corridorReservation.map(key));
  if(level.removedLocalCells.some(p=>core.has(key(p))||!hall.has(key(p))))fail('OFFICE_PROTECTED_CUT');
  cuts.push({level:i+1,conceptMismatchCells:source.changedCells,
   corridorTrimCells:level.removedLocalCells.map(p=>({...p})),
   corridorConnectivityComponentsBefore:level.originalConnectionComponents,
   corridorConnectivityComponentsAfter:level.trimmedConnectionComponents,
   conceptWalkabilityOnly:true});
 }
 const options=b13.office02ReviewAlternatives.map(o=>{
  if(!['KEEP_FROZEN','TRIM_CORRIDOR_REVIEW','REBASE_CONCEPT_TO_SOURCE_REVIEW','REBASE_AND_TRIM_REVIEW'].includes(o.id)||
   o.autoApplied!==false||o.approved!==false||o.operations?.length!==0||
   o.worldAnchor!==null||o.materialIds?.length!==0)fail('OFFICE_OPTION');
  return {id:o.id,conceptMismatchCells:o.conceptualMismatchCells,
   corridorOutsideCells:o.nominalCorridorOutsideCells,
   reviewTrimCells:o.reviewTrimCells,conceptReferenceOnly:o.conceptEnvelopeReferenceOnly===true,
   preservesFrozenSource:true,autoApplied:false,approved:false,physicalValidated:false};
 });
 if(new Set(options.map(x=>x.id)).size!==4||
  !equal(options.map(x=>[x.conceptMismatchCells,x.corridorOutsideCells,x.reviewTrimCells]),
   [[123,18,0],[123,0,18],[0,18,0],[0,0,18]]))fail('OFFICE_METRICS');
 return {buildingId:keyOffice,style:a.style,styleProportion:a.styleProportion,
  engineSourceWing:a.sourceWing,conceptWing:a.conceptWing,
  corridorTrimProposals:cuts,alternatives:options,
  referenceMismatchRemovalIsNotActualEnvelopeRepair:true,
  candidateApproved:false,sourceModified:false};
}
export function compileAssemblyB29(b25,b26,b13,b11,ir,b28,facts){
 validateFrozen(b25,b26,b13,b11,ir,b28,facts);
 if(b25.buildings?.length!==5||ir.buildings?.length!==5)fail('BUILDINGS');
 const irById=new Map(ir.buildings.map(x=>[x.id,x]));
 const buildings=b25.buildings.map(b=>{
  const ref=irById.get(b.id);
  if(!ref||b.floors?.length!==6||b.stairs?.length!==5||ref.floors?.length!==6)fail('BUILDING_FLOORS');
  const floors=b.floors.map((f,j)=>stageFloor(b,f,ref.floors[j],facts));
  const stairs=b.stairs.map(s=>stageStair(s,floors));
  return {id:b.id,schematicOnly:true,floors,stairs,engineImplementation:'NOT_WIRED',modified:false};
 });
 const totals={buildings:buildings.length,floors:buildings.reduce((s,b)=>s+b.floors.length,0),
  wallPanelIntents:buildings.reduce((s,b)=>s+b.floors.reduce((u,f)=>u+f.partitionPanelIntents,0),0),
  doorPorts:buildings.reduce((s,b)=>s+b.floors.reduce((u,f)=>u+f.doorPorts.length,0),0),
  stairInterfaces:buildings.reduce((s,b)=>s+b.stairs.length,0),
  cutoutCandidateCells:buildings.reduce((s,b)=>s+b.stairs.reduce((u,t)=>u+t.cutoutCandidateCells.length,0),0),
  sharedWallVoxelIntents:buildings.reduce((s,b)=>s+b.floors.reduce((u,f)=>u+f.wallJunctions.sharedVoxelIntents,0),0),
  physicalDoorsVerified:0,physicalStairsVerified:0,engineModulesWired:0,commandsEmitted:0};
 if(totals.floors!==30||totals.wallPanelIntents!==5704||totals.doorPorts!==314||
  totals.stairInterfaces!==25||totals.cutoutCandidateCells!==50||
  totals.sharedWallVoxelIntents!==3990)fail('TOTALS');
 const unresolved=[
  'LOADED_ENGINE_IDENTITY','MATERIAL_ROLE_MAPPING','WALL_JUNCTION_MATERIAL_SUPPORT',
  'DOOR_LOWER_UPPER_FACING_HINGE','EXACT_DOOR_BLOCK_STATES',
  'STAIR_SLAB_CUTOUT_SUPPORT_AND_HEADROOM','WORLD_ANCHOR_AND_SITE_SAFETY',
  'OFFICE02_SOURCE_VS_CONCEPT','EXPLICIT_CONSTRUCTION_APPROVAL'];
 if(!equal(b26.blockers.map(x=>x.id),unresolved.map((_,i)=>`M4-${String(i+1).padStart(2,'0')}`)))fail('BLOCKER_IDS');
 const data={schema:'minecraftaibuilder-b29-m3-m4-assembly-ir-v1',
  kind:'SCHEMATIC_ONLY_NON_EXECUTABLE_ASSEMBLY',
  baseline:{b25ReportSha256:b25.reportSha256,b26ReportSha256:b26.reportSha256,
   b28EvidenceSha256:b28.reportSha256,liveRuntimeAttested:false,sourceHashesMatched:9,
   exactDoorStateEvidenceRecords:facts.recordCounts.byForm.door.records},
  buildings,materialRoleContract:materialRoles(),
  office02:officeReview(b13,b11,ir),totals,
  unresolvedGates:unresolved.map((reason,i)=>({id:`M4-${String(i+1).padStart(2,'0')}`,
    reason,status:'BLOCKED',physicalValidation:false})),
  readiness:'NOT_PREPARED',deployment:'BLOCKED',
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,
   projectFilesModified:false,legacyModified:false,worldAccess:false,bridgeContact:false,
   engineInvocation:false,constructionCommands:0},
  BuildPlan:noPlan(),physicalValidated:false};
 return {...data,reportSha256:sha(data)};
}
export function buildAssemblyB29(root){return compileAssemblyB29(...fromArchive(root));}
export function validateAssemblyB29(result,root){
 if(result?.schema!=='minecraftaibuilder-b29-m3-m4-assembly-ir-v1'||
   result?.kind!=='SCHEMATIC_ONLY_NON_EXECUTABLE_ASSEMBLY'||
   result?.readiness!=='NOT_PREPARED'||result?.deployment!=='BLOCKED'||
   result?.unresolvedGates?.length!==9||result.unresolvedGates.some(x=>x.status!=='BLOCKED')||
   result?.BuildPlan?.operations?.length!==0||result.BuildPlan?.commandCount!==0||
   result.BuildPlan?.worldCoordinates!==null||result.BuildPlan?.materialIds?.length!==0||
   result?.safety?.constructionApproved!==false||result?.safety?.engineInvocation!==false)
     fail('UNSAFE_REPORT');
 const {reportSha256,...body}=result;
 if(sha(body)!==reportSha256||!equal(result,buildAssemblyB29(root)))fail('REPORT_CHANGED');
 return true;
}
export function summarizeAssemblyB29(r){
 if(r.schema!=='minecraftaibuilder-b29-m3-m4-assembly-ir-v1')fail('SUMMARY');
 return {schema:r.schema,kind:r.kind,baseline:r.baseline,totals:r.totals,
  office02:r.office02,materialRoleContract:r.materialRoleContract,
  unresolvedGates:r.unresolvedGates,readiness:r.readiness,deployment:r.deployment,
  safety:r.safety,BuildPlan:r.BuildPlan,reportSha256:r.reportSha256};
}

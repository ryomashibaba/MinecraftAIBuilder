/**
 * B71: reviewed, STATIC source-contract bridge for future production integration.
 * Produces NO BuildPlan operations, material IDs, world positions or engine calls.
 * The pinned production code is NOT imported/executed. The B65/B69/B70 objects are
 * frozen outputs; the integration seam remains a proposal, not a runtime patch.
 */
import {createHash} from 'node:crypto';
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fail=x=>{throw Error('B71_'+x)};
const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
const need=(x,label)=>{if(!x||x.reportSha256!==sha(Object.fromEntries(Object.entries(x).filter(([k])=>k!=='reportSha256'))))fail('BAD_HASH_'+label);};
const pitches=Object.freeze({hotel:5,apartment:4,office:4});
const expectedExports=Object.freeze({
 'engine/src/general-building-planner.js':['GeneralBuildingPlanner','createBuildingPlan'],
 'engine/src/building-grammar.js':['createComposition','massings','programs'],
 'engine/src/architectural-quality.js':['composeFacade','materialGrammar'],
 'modules/architectural-library.js':['architecturalModules','emitModule'],
 'styles/urban_japanese.json':[]
});
function safety(x,label){
 if(x.readiness!=='NOT_PREPARED'||x.executionAllowed!==false||x.constructionApproved!==false||
   x.BuildPlan?.status!=='NOT_PREPARED'||!Array.isArray(x.BuildPlan?.operations)||x.BuildPlan.operations.length||
   x.BuildPlan.commandCount!==0||x.gates?.length!==9||x.gates.some(g=>g.status!=='BLOCKED'))fail('UNSAFE_'+label);
}
function sourceContract(receipt){
 if(receipt?.count?.required!==5||receipt.count.found!==5||receipt.count.exactPinMatch!==5||
    receipt.count.missing!==0||receipt.count.versionMismatch!==0||receipt.productionParity!=='UNVERIFIED'||
    receipt.safety?.sourceExecuted!==false||receipt.safety?.sourceImported!==false||
    receipt.safety?.network!==false||receipt.safety?.executionAllowed!==false||receipt.safety?.M4Blocked!==9||
    receipt.files?.length!==5||typeof receipt.sourceArchiveSha256!=='string')fail('PRODUCTION_NOT_PINNED');
 for(const [index,file] of receipt.files.entries()){
  if(file.path!==Object.keys(expectedExports)[index])fail('FILE_ORDER_OR_DUPLICATE');
  if(file.status!=='PINNED_MATCH'||file.observedSha256!==file.expectedSha256||
     !Object.hasOwn(expectedExports,file.path))fail('FILE_UNPINNED');
  const item=file.inventory;
  if(!item)fail('NO_INVENTORY');
  if(file.path.endsWith('.json')){if(item.syntax!=='VALID_JSON')fail('STYLE_SYNTAX');}
  else if(item.syntax!=='LEXICAL_ONLY_NOT_AST'||
    expectedExports[file.path].some(s=>!item.exportedSymbols.includes(s)))fail('NO_REAL_API_SURFACE_'+file.path);
 }
 return {archiveSha256:receipt.sourceArchiveSha256,filesPinned:5,sourceExecuted:false,
  detectedPlanner:'GeneralBuildingPlanner.fromComposition / createBuildingPlan',
  recognizedRecord:'fill {role,block,from,to,phase}',
  insertionPoint:'AFTER_FACADE_AND_FLOOR_GENERATION_BEFORE_VALIDATE_BUILD_PLAN',
  materialRoles:['primaryWall','floor','air'],
  supportedFacadeModules:'WINDOWS_ENTRANCES_FACADE_ONLY',
  interiorDoorModule:'NOT_PRESENT_IN_PINNED_LIBRARY',
  physicalStairModule:'NOT_PRESENT_IN_PINNED_LIBRARY',
  runtimeParity:'UNVERIFIED'};
}
/**
 * Material-independent, isolated shape recipes for ONE section. Caller supplies
 * frozen inputs. This does not populate any BuildPlan or create fill operations.
 * Each ref points back to the original B69/B70 record, avoiding recreation.
 */
export function stageSectionRecipe(s65,s69,s70){
 if(s65?.id!==s69?.id||s69.id!==s70?.id||s65.level!==s69.level||s69.level!==s70.level||
  s69.coordinateFrame!=='ISOLATED_OFFLINE_LOCAL_XYZ'||s69.emissionProhibited!==true||
  s70.emissionProhibited!==true||s70.doorFloorProblems?.length||
  s69.records?.length!==s65.nominalWalls?.length||s69.doorPaths?.length!==s65.openingPorts?.length)fail('SECTION_LINK');
 const original=new Map(s65.nominalWalls.map(w=>[w.id,w]));
 if(original.size!==s65.nominalWalls.length)fail('REPEATED_BOUNDARY');
 const ports=new Map(s65.openingPorts.map(p=>[p.id,p]));
 if(ports.size!==s65.openingPorts.length)fail('REPEATED_PORT');
 const walls=[],openings=[],seen=new Set();
 const baseY=(s65.level-1)*5;
 for(const r of s69.records){
  const old=original.get(r.boundaryId);
  if(seen.has(r.boundaryId))fail('REPEATED_STAGED_BOUNDARY');
  seen.add(r.boundaryId);
  if(!old||old.roomId!==r.roomId||r.buildable!==false||
     !Number.isSafeInteger(r.u)||!Number.isSafeInteger(r.v)||
     !Array.isArray(r.solidY)||!Array.isArray(r.emptyY)||
     r.solidY.some(v=>![baseY,baseY+1,baseY+2].includes(v))||r.emptyY.some(v=>![baseY,baseY+1].includes(v)))fail('RECORD_SHAPE');
  if(r.portId){
   if(r.role!=='OPENING_WITH_LINTEL'||r.solidY.length!==1||r.solidY[0]!==baseY+2||
     !eq(r.emptyY,[baseY,baseY+1])||old.openingPortId!==r.portId||!ports.has(r.portId))fail('OPENING_PARITY');
   openings.push({boundaryId:r.boundaryId,portId:r.portId,localHalfGrid:[r.u,r.v],
    reservedVoidLayers:[...r.emptyY],realDoorBlock:null,realClearance:'UNKNOWN',
    proposedPlannerPhase:'interior_opening',proposalMaterialRole:'air',emissionAllowed:false});
  }else if(r.role!=='SOLID_PARTITION'||r.solidY.length!==3||r.emptyY.length||old.openingPortId!==null)fail('SOLID_PARITY');
  walls.push({boundaryId:r.boundaryId,localHalfGrid:[r.u,r.v],nominalSolidLayers:[...r.solidY],
   proposedPlannerPhase:'interior_partition',proposalMaterialRole:'primaryWall',
   transformValidated:false,emissionAllowed:false});
 }
 for(const p of s69.doorPaths){
  const old=ports.get(p.portId);
  if(!old||old.wallBoundaryId!==p.boundaryId||p.previewPlaneClear!==true||
     p.physicalPassageVerified!==false||!openings.some(x=>x.portId===p.portId))fail('PORT_PARITY');
 }
 if(walls.length!==s65.counts.walls||openings.length!==s65.counts.nominalOpenings)fail('WALL_TOTAL');
 let candidateCells=0;
 const floorRuns=s70.floorRuns.map((r,i)=>{
  if(!Number.isSafeInteger(r.z)||!Number.isSafeInteger(r.fromX)||!Number.isSafeInteger(r.toXExclusive)||
   r.toXExclusive<=r.fromX||r.emissionProhibited!==true||
   !['ROOM_FLOOR_CANDIDATE','CORRIDOR_FLOOR_CANDIDATE','STAIR_RESERVED_HOLD','ELEVATOR_RESERVED_HOLD','UNASSIGNED_FLOOR_HOLD'].includes(r.kind))fail('FLOOR_RUN');
  if(['ROOM_FLOOR_CANDIDATE','CORRIDOR_FLOOR_CANDIDATE'].includes(r.kind))candidateCells+=r.toXExclusive-r.fromX;
  return {sourceFloorRunIndex:i,conceptRun:[r.fromX,r.toXExclusive,r.z],
   proposalMaterialRole:r.kind.includes('CANDIDATE')?'floor':null,
   hold:!r.kind.includes('CANDIDATE'),transformValidated:false,emissionAllowed:false};
 });
 if(candidateCells!==s70.confirmedFloorCandidateCells||
   openings.length!==s69.counts.doorPaths)fail('FLOOR_PARITY');
 return {sectionId:s65.id,frame:'HALF_GRID_AND_CONCEPT_XZ_NOT_MINECRAFT_WORLD',
  walls,openingReservations:openings,floorRuns,stairReservationKeys:[...s70.stairReservationKeys],
  outOfMaskReservationsHeld:s70.excludedOutOfMaskReservations.length,
  buildingOperations:0,materialIds:[],engineInvocations:0,emissionAllowed:false};
}
export function compileB71(b65,b66,b69,b70,sourceInventory){
 for(const [label,value] of [['B65',b65],['B66',b66],['B69',b69],['B70',b70]]){need(value,label);safety(value,label);}
 if(!eq([b70.provenance.b65ReportSha256,b70.provenance.b66ReportSha256,b70.provenance.b69ReportSha256],
   [b65.reportSha256,b66.reportSha256,b69.reportSha256]))fail('LINEAGE');
 if(b65.sections.length!==30||b69.sections.length!==30||b70.sections.length!==30||
    b65.summary.nominalWalls!==undefined && b65.summary.nominalWalls!==5704)fail('SCOPE');
 const production=sourceContract(sourceInventory);
 const source65=new Map(b65.sections.map(s=>[s.id,s]));
 const source69=new Map(b69.sections.map(s=>[s.id,s]));
 const source70=new Map(b70.sections.map(s=>[s.id,s]));
 if(source65.size!==30||source69.size!==30||source70.size!==30)fail('REPEATED_SECTION');
 let walls=0,doorPorts=0,runs=0,heldOutMask=0,heightMismatch=0,matched=0;
 const sections=[];
 for(const s of b65.sections){
  const v=source69.get(s.id),floor=source70.get(s.id);
  if(!v||!floor)fail('MISSING_SECTION');
  const staged=stageSectionRecipe(s,v,floor);
  const program=s.id.split('/')[0],productionPitch=pitches[program];
  if(!productionPitch)fail('UNKNOWN_PROGRAM');
  const matches=productionPitch===5;
  if(matches)matched++;else heightMismatch++;
  walls+=staged.walls.length;doorPorts+=staged.openingReservations.length;
  runs+=staged.floorRuns.length;heldOutMask+=staged.outOfMaskReservationsHeld;
  sections.push({id:s.id,program,level:s.level,sourceDimensions:s.dimensions,
   nominalPitch:5,productionDefaultFloorPitch:productionPitch,
   floorHeightParity:matches?'NOMINAL_PITCH_MATCH_ONLY':'BLOCKED_INCOMPATIBLE_FLOOR_PITCH',
   stageDigest:sha(staged),sourceWallBoundaryIds:staged.walls.length,
   stagedDoorClearanceReservations:staged.openingReservations.length,
   referencedFloorRuns:staged.floorRuns.length,outOfMaskReservationsHeld:staged.outOfMaskReservationsHeld,
   exteriorEnvelopeAgreement:'UNVERIFIED',orientationAgreement:'UNVERIFIED',
   physicalModuleAvailable:false,productionEmissionAllowed:false,
   blockerCodes:[...(!matches?['NOMINAL_FLOOR_PITCH_MISMATCH']:[]),'EXTERIOR_FOOTPRINT_PARITY_UNVERIFIED',
    'WORLD_TRANSFORM_AND_PALETTE_UNVERIFIED','DOOR_HINGE_AND_STAIRS_MODULES_MISSING']});
 }
 if(walls!==5704||doorPorts!==314||runs!==4402||heldOutMask!==18||heightMismatch!==24||matched!==6||
  b70.summary.floorCandidateCells!==10776||b70.summary.unresolvedDoorFloorSupports!==0||
  b65.nominalVerticalLinks.length!==25)fail('GLOBAL_PARITY');
 const body={schema:'minecraftaibuilder-b71-pinned-production-static-adapter-v1',
  intent:'REUSABLE_NONEXECUTABLE_PRODUCTION_SEAM_PREPARATION',
  provenance:{b65:b65.reportSha256,b66:b66.reportSha256,b69:b69.reportSha256,b70:b70.reportSha256,
   evidenceZipSha256:production.archiveSha256},
  productionContract:production,
  adapterAPI:{stagingFunction:'stageSectionRecipe',inputs:['B65.sections','B69.sections','B70.sections'],
   output:'MATERIAL_ROLE_CANDIDATE_REFS_NON_EXECUTABLE',
   runtimeInsertion:'GeneralBuildingPlanner.fromComposition before validateBuildPlan (NOT PATCHED)',
   placementAuthority:'NONE',previewOnly:true},
  summary:{sourceFilesPinned:5,sourceFilesVersionDrift:0,sections:30,nominalWallRefs:walls,
   nominalDoorVoidReservations:doorPorts,floorRunRefs:runs,heldOutsideMask:heldOutMask,
   nominalPitchOnlyMatch:matched,blockedFloorPitchMismatch:heightMismatch,
   realDoorBlocks:0,realStairBlocks:0,realFloorBlocks:0,engineCalls:0,constructionCommands:0},
  sections,
  unresolved:['PRODUCTION_REPOSITORY_AND_DEPENDENCIES_NOT_PRESENT','LIVE_RUNTIME_PARITY_UNVERIFIED',
   '24_FLOORS_NOMINAL_PITCH_MISMATCH','REAL_EXTERIOR_FOOTPRINT_ORIENTATION_UNMAPPED',
   'EXTERIOR_FACADE_VS_INTERIOR_CONFLICT_UNTESTED','REAL_DOORS_HINGES_AND_STAIR_MODULES_ABSENT',
   'B70_OFF_MASK_CORRIDOR_RESERVATIONS_18_HELD','B42_UPPER_60_DOORS_UNVERIFIED',
   'B62_B64_ALTERNATIVE_NOT_APPROVED','M4_9_GATES_BLOCKED'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',executionAllowed:false,constructionApproved:false,
  gates:b70.gates.map(g=>({...g})),engineCalls:0,worldContacts:0,scans:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:sha(body)};
}
export function verifyB71(report,b65,b66,b69,b70,receipt){
 const expected=compileB71(b65,b66,b69,b70,receipt);
 if(!eq(expected,report))fail('REPLAY');
 safety(report,'B71');
 if(report.summary.constructionCommands!==0||report.productionContract.runtimeParity!=='UNVERIFIED'||
    report.sections.some(s=>s.productionEmissionAllowed!==false))fail('EMISSION');
 return true;
}

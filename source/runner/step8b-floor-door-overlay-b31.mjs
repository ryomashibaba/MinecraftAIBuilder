/**
 * B31: inert local floor overlay + door state constraint ledger.
 * Does NOT import or call live planner, shape/minecraft APIs or material selectors.
 * This module outputs no BuildPlan and no executable placement operations.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildEngineBoundaryB30, validateEngineBoundaryB30} from './step8b-engine-boundary-b30.mjs';
const digest = x => createHash('sha256').update(Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const fail = code => {const e=new Error(`B31_${code}`);e.code=`B31_${code}`;throw e;};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const key=p=>`${p.x},${p.z}`;
const POINT=p=>p && Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
const BLOCKERS=Object.freeze(Array.from({length:9},(_,i)=>`M4-${String(i+1).padStart(2,'0')}`));
const PINNED_B30_MANIFEST_SHA='4bdd45d044b58efc8953b2dd84adde9188a9c371acc345086a47bce8420d184f';
const tokens=['upper_block_bit','door_hinge_bit','open_bit','direction'];
const FACE_HINTS={X:['north','south'],Z:['east','west']};
function readFileSafe(root,relative){
 if(typeof root!=='string'||!root||path.isAbsolute(relative)||relative.split('/').includes('..')) fail('SOURCE_PATH');
 let b;
 try {const p=path.join(root,relative);const st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink())fail('UNSAFE_FILE');b=fs.readFileSync(p);}catch{fail('FILE_MISSING');}
 return b;
}
function checkB30Files(root){
 const manifestRaw=readFileSafe(root,'B30_FILE_SHA256.json');
 if(digest(manifestRaw)!==PINNED_B30_MANIFEST_SHA)fail('FROZEN_MANIFEST_CHANGED');
 const m=JSON.parse(manifestRaw.toString('utf8'));
 if(m.fileCount!==542||Object.keys(m.files).length!==542)fail('FROZEN_MANIFEST_COUNT');
 // Confirm every B30 file remains unchanged; no past evidence or test can be edited.
 for(const [rel,expected] of Object.entries(m.files)){
  if(!/^[0-9a-f]{64}$/.test(expected)||digest(readFileSafe(root,rel))!==expected)fail('FROZEN_FILE_CHANGED');
 }
}
function validateDependencies(a,b7,b30){
 if(a?.schema!=='minecraftaibuilder-b29-m3-m4-assembly-ir-v1'||
    b7?.deploymentGate!=='BLOCKED'|| b30?.schema!=='minecraftaibuilder-step8b-b30-engine-boundary-v1'||
    a?.deployment!=='BLOCKED'||a?.readiness!=='NOT_PREPARED'||
    a?.safety?.constructionApproved!==false||
    a?.BuildPlan?.status!=='NOT_PREPARED'||a.BuildPlan?.operations?.length!==0||
    b30?.deployment!=='BLOCKED'||b30?.readiness!=='NOT_PREPARED'||
    b30?.BuildPlan?.operations?.length!==0||b30?.totals?.engineCalls!==0||
    b30?.sourceEvidence?.engineRuntimeAttested!==false||
    a.unresolvedGates?.length!==9 || a.unresolvedGates.some((g,i)=>g.id!==BLOCKERS[i]||g.status!=='BLOCKED'))fail('BASELINE_UNSAFE');
 if(a.buildings?.length!==5||b7.candidates?.length!==5||b30.buildings?.length!==5)fail('BUILDINGS');
 if(a.reportSha256!==b30.sourceEvidence.b29AssemblySha256 || b7.reportSha256!==b30.sourceEvidence.b7FrozenReportSha256)fail('BASELINE_LINK');
}
function floorCells(rects,level,w,d){
 const out=new Set();
 if(!Array.isArray(rects)||!rects.length)fail('MASSING');
 for(const r of rects){
  if(![r.x,r.z,r.width,r.depth,r.start,r.end].every(Number.isSafeInteger)||
    r.width<1||r.depth<1||r.x<0||r.z<0||r.x+r.width>w||r.z+r.depth>d||
    r.start<0||r.end>6||r.end<=r.start)fail('MASSING_BOUNDS');
  if(level<r.start||level>=r.end)continue;
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)out.add(`${x},${z}`);
 }
 return out;
}
function markRows(footprint,holes,w,d){
 const rows=[];
 for(let z=0;z<d;z++){
  let row='';for(let x=0;x<w;x++){const k=`${x},${z}`;row+=holes.has(k)?'o':footprint.has(k)?'#':'.';}
  rows.push(row);
 }
 return rows;
}
export function compileFloorDoorOverlayB31(assembly,b7,b30){
 validateDependencies(assembly,b7,b30);
 const amap=new Map(assembly.buildings.map(b=>[b.id,b]));
 const emap=new Map(b30.buildings.map(b=>[b.id,b]));
 if(amap.size!==5||emap.size!==5)fail('DUPLICATE_BUILDING');
 let allFloorCells=0,allCut=0,allDoor=0,allOutside=0;
 const buildings=[];
 for(const candidate of b7.candidates){
  const id=`${candidate.program}/${candidate.id}`;const a=amap.get(id), e=emap.get(id);
  if(!a||!e||candidate.dimensions.floors!==6||a.floors?.length!==6||a.stairs?.length!==5||e.floors?.length!==6)fail('BUILDING_LINK');
  const {width:w,depth:d}=candidate.dimensions;
  if(!Number.isSafeInteger(w)||!Number.isSafeInteger(d)||w>48||d>40||w<15||d<12)fail('DIMENSIONS');
  const floors=[];let doorCount=0,holesCount=0;
  for(let ix=0;ix<6;ix++){
   const floor=a.floors[ix], ref=e.floors[ix];
   if(floor.level!==ix+1||floor.id!==ref.id||floor.commands?.length!==0||floor.applied!==false||
     floor.doorPorts?.length!==ref.doorPorts)fail('FLOOR_LINK');
   const full=floorCells(candidate.sourcePredictedRectangles,ix,w,d);
   const stairs=a.stairs.filter(s=>s.toFloor===floor.id);
   if(stairs.length!==(ix===0?0:1))fail('STAIR_LINK');
   const holes=new Set();
   for(const s of stairs){
    const diag=e.stairFloorPlateDiagnostics.find(x=>x.id===s.id&&x.upperFloorId===floor.id);
    if(!diag||s.cutoutStatus!=='CANDIDATE_NOT_CUT'||s.commands?.length!==0||s.engineFloorOperationOverride!==false||
     s.worldCoordinates!==null||s.cutoutCandidateCells.length!==2||diag.candidateCount!==2||
     diag.floorPlateCutoutImplemented!==false||diag.predictedFloorPlateOverlapCells?.length!==2)fail('STAIR_NOT_SAFE');
    const predicted=new Set(diag.predictedFloorPlateOverlapCells.map(key));
    for(const p of s.cutoutCandidateCells){
     if(!POINT(p)||p.x<0||p.x>=w||p.z<0||p.z>=d||!full.has(key(p))||!predicted.has(key(p))||holes.has(key(p)))fail('INVALID_CUTOUT');
     holes.add(key(p));
    }
   }
   const rows=markRows(full,holes,w,d);
   // The cut-out set is only an alternative mask and has not been passed to the floor emitter.
   const doors=[];const occupied=new Set();
   for(const port of floor.doorPorts){
    if(port.ready!==false||port.connectedInConceptOnly!==true||port.blockId!==null||
      port.worldTransform!==null||port.physicalFacing!==null||port.hinge!==null||port.openState!==null||
      port.lower?.state!==null||port.upper?.state!==null||port.jambSupport!=='UNVERIFIED'||
      port.stateTokenStatus!=='SEEN_IN_PINNED_TRANSFORM_SOURCE_NOT_VALIDATED_FOR_A_DOOR_BLOCK'||
      JSON.stringify(port.stateSchemaTokens)!==JSON.stringify(tokens)||!own(FACE_HINTS,port.axisHint)||
      !POINT(port.localCell))fail('DOOR_STATES_NOT_SAFE');
    const {x,z}=port.localCell,lower=port.lower.cell,upper=port.upper.cell;
    if(!POINT(lower)||!POINT(upper)||lower.x!==x||lower.z!==z||upper.x!==x||upper.z!==z||
      !Number.isSafeInteger(lower.y)||upper.y!==lower.y+1||
      lower.y!==floor.nominalYRange[0]+1||upper.y>=floor.nominalYRange[1]||
      x<0||z<0||x>=w||z>=d||!full.has(key(port.localCell))||
      !port.boundaryId?.startsWith(floor.id+'/')||occupied.has(key(port.localCell)))fail('DOOR_POSITION');
    occupied.add(key(port.localCell));
    doors.push({id:port.portId,localLower:{...lower},localUpper:{...upper},
      wallAxisHint:port.axisHint,possibleLocalFacing:FACE_HINTS[port.axisHint],
      actualFacing:null,hinge:null,open:null,blockId:null,lowerBlockStates:null,upperBlockStates:null,
      doorMaterialValidation:'NO_VERIFIED_DOOR_FORM_STATE',
      physicalJambAndOpening:'UNVERIFIED',stateBinding:'BLOCKED',emitAllowed:false});
   }
   doorCount+=doors.length;holesCount+=holes.size;allFloorCells+=full.size;allOutside+=0;
   floors.push({id:floor.id,level:ix+1,localFrame:'LOCAL_XZ_INTEGER_FOOTPRINT_NOT_WORLD',
     width:w,depth:d,originalFloorMaskCellCount:full.size,proposedCutoutCellCount:holes.size,
     retainedFloorMaskCellCount:full.size-holes.size,
     maskLegend:{'#':'SOURCE_PREDICTED_FLOOR_CELL','o':'UNAPPLIED_STAIR_VOID_CANDIDATE','.':'OUTSIDE_SOURCE_FOOTPRINT'},
     overlayRows:rows,doors,
     floorPlateEmitterInputModified:false,physicalFloorCut:false,
     occupancyCheck:'SOURCE_MASS_RECTANGLES_ONLY',actualStructuralSupport:'UNVERIFIED'});
  }
  allDoor+=doorCount;allCut+=holesCount;
  buildings.push({id,orientation: candidate.orientation,
   floors,summary:{floorCount:6,doorPorts:doorCount,cutoutCandidateCells:holesCount},
   originalConceptModified:false,engineCalled:false});
 }
 if(allDoor!==314||allCut!==50||buildings.length!==5||b30.totals.slabCutoutCandidateCells!==50)fail('TOTALS');
 const data={schema:'minecraftaibuilder-step8b-b31-inert-floor-door-contract-v1',
  kind:'CANDIDATE_MASK_AND_DOOR_STATE_REVIEW_ONLY_NOT_ENGINE_INPUT',
  sourceEvidence:{b29AssemblySha256:assembly.reportSha256,b7Sha256:b7.reportSha256,
   b30ReportSha256:b30.reportSha256,archivedBlockStateTokens:'SEEN_IN_2026_10_10_SOURCE_NOT_VERIFIED_ON_DOOR',
   runningEngineIdentityProven:false,liveMinecraftAcceptanceProven:false},
  buildings,totals:{buildings:5,floors:30,originalFloorCells:allFloorCells,
   proposedCutoutCells:50,proposedRetainedFloorCells:allFloorCells-50,
   doorPorts:314,doorsWithBlockId:0,doorsWithResolvedFacing:0,doorsWithResolvedHinge:0,
   committedFloorCuts:0,engineCalls:0,operationsEmitted:0},
  office02:{outlineMismatchCells:123,corridorOutsideCells:18,originalApplied:false},
  blockers:[...BLOCKERS],deployment:'BLOCKED',readiness:'NOT_PREPARED',
  safety:{constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false,
   actualFloorCuts:0,projectFilesModified:false,legacyModified:false,archivedEvidenceModified:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,materialIds:[],worldCoordinates:null},
  enginePlannerInput:null,constructionCommands:[],physicalValidated:false};
 return {...data,reportSha256:digest(data)};
}
export function buildFloorDoorOverlayB31(root){
 checkB30Files(root);
 const a=JSON.parse(readFileSafe(root,'reports/B29_M3_M4_ASSEMBLY_IR.json'));
 const b7=JSON.parse(readFileSafe(root,'reports/B7_RECONCILED_REVIEW.json'));
 const baseline=buildEngineBoundaryB30(root);
 const saved=JSON.parse(readFileSafe(root,'reports/B30_ENGINE_BOUNDARY_REPORT.json'));
 validateEngineBoundaryB30(saved,root);
 if(JSON.stringify(saved)!==JSON.stringify(baseline))fail('B30_REPORT_CHANGED');
 return compileFloorDoorOverlayB31(a,b7,baseline);
}
export function validateFloorDoorOverlayB31(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b31-inert-floor-door-contract-v1'||
   report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||
   report.enginePlannerInput!==null||report.BuildPlan?.operations?.length!==0||
   report.BuildPlan.commandCount!==0||report.BuildPlan.materialIds?.length!==0||
   report.BuildPlan.worldCoordinates!==null||report.constructionCommands?.length!==0||
   report.safety?.constructionApproved!==false||report.totals?.engineCalls!==0||
   report.totals?.committedFloorCuts!==0||report.totals?.operationsEmitted!==0||
   report.blockers?.length!==9)fail('GATE');
 const {reportSha256,...data}=report;
 if(digest(data)!==reportSha256)fail('HASH');
 const rebuilt=buildFloorDoorOverlayB31(root);
 if(JSON.stringify(rebuilt)!==JSON.stringify(report))fail('REPLAY_MISMATCH');
 return true;
}
export function summarizeFloorDoorOverlayB31(report){
 if(report?.schema!=='minecraftaibuilder-step8b-b31-inert-floor-door-contract-v1')fail('SUMMARY');
 return {schema:report.schema,kind:report.kind,sourceEvidence:report.sourceEvidence,totals:report.totals,
  office02:report.office02,blockers:report.blockers,readiness:report.readiness,
  deployment:report.deployment,BuildPlan:report.BuildPlan,safety:report.safety,
  reportSha256:report.reportSha256};
}

/** B17: machine-readable interior handoff, never a BuildPlan or permission to construct. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildB14Report,validateB14Report} from './step8b-interior-modules-b14.mjs';
import {buildB16Report,validateB16Report} from './step8b-connectivity-b16.mjs';
import {verifyPinnedSnapshot,B13_WINDOWS_PINNED} from './step8b-module-contract-b13.mjs';
const h=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>{const e=Error('B17_'+code);e.code='B17_'+code;throw e;};
const cell=p=>`${p.x},${p.z}`;
const pair=(a,b)=>[cell(a),cell(b)].sort().join('|');
const BLOCKERS=Object.freeze([
 {id:'INTERIOR_EMITTERS',owner:'ENGINE',resolution:'Implement/test partition, individual room-door and stair emitters outside frozen source',evidence:'Not identified in pinned general planner scope'},
 {id:'WALL_DOOR_STAIR_PHYSICAL_CONTRACT',owner:'ENGINE',resolution:'Confirm widths, heights, block footprints, headroom, stair assembly, hinge/opening compatibility',evidence:'Only nominal boundary/port/reservation IR'},
 {id:'OFFICE02_GEOMETRY',owner:'DESIGN',resolution:'Review the 123-cell envelope and 18-cell corridor inconsistency without changing frozen evidence',evidence:'Static B13-B16 comparison'},
 {id:'MATERIAL_EDUCATION_RUNTIME',owner:'WINDOWS',resolution:'Validate permitted Education identifiers and states in the target runtime',evidence:'Not proven by palette names'},
 {id:'WORLD_ANCHOR_SCAN',owner:'WINDOWS',resolution:'Explicit real-world anchor and non-destructive scan needed; no absolute positions in IR',evidence:'No world reads performed'},
 {id:'RUNNING_ENGINE_IDENTITY',owner:'WINDOWS',resolution:'Verify runtime process identity and loaded code, not only disk SHA',evidence:'Last B4.2 collected zero Node.js processes'},
 {id:'CONSTRUCTION_SAFETY_CANARY',owner:'ENGINE',resolution:'Independent rollback/bounds/safe-write controls and approved isolated canary',evidence:'No new construction execution'},
 {id:'USER_APPROVAL',owner:'USER',resolution:'Explicit approval required before preparation or world mutation',evidence:'NOT PREPARED'}
]);
function snapshotSignals(snapshotDir){
 if(snapshotDir===null)return {sourceHashState:'PINNED_HISTORICAL_ONLY',inspectedNow:false,plannerScope:'NOT_EXECUTED',verifiedFiles:0};
 verifyPinnedSnapshot(snapshotDir);
 const source=fs.readFileSync(path.join(snapshotDir,'engine/src/general-building-planner.js'),'utf8');
 const symbols={create:/\bcreate\(input,\s*options\s*=\s*\{\}/.test(source),fromComposition:/\bfromComposition\(composition,\s*options\s*=\s*\{\}/.test(source),validation:/\bvalidateBuildPlan\s*\(/.test(source),composition:/\bcreateComposition\s*\(/.test(source),operations:/\boperations\.push\s*\(/.test(source)};
 if(Object.values(symbols).some(x=>!x))fail('SOURCE_SEAM_CHANGED');
 return {sourceHashState:'FIVE_PINNED_SOURCE_FILES_MATCH',inspectedNow:true,verifiedFiles:Object.keys(B13_WINDOWS_PINNED).length,plannerScope:'READ_ONLY_TEXT_INSPECTION',symbols};
}
function prepareFloor(b,cb,l,g){
 if(l.level!==g.level||l.sourcePredictedMask!==g.reviewData.sourceMask||l.summary.nominalDoorInterfaces!==g.original.counts.roomDoorEdges)fail('FLOOR_PROVENANCE');
 const id=`${b.key}/L${l.level}`;
 const segments=l.edgeContracts.map((e,i)=>{
  if(!['NOMINAL_WALL_BOUNDARY','NOMINAL_DOOR_INTERFACE'].includes(e.kind)||e.materialId!==null||e.wallThickness!==null||e.physicalValidated!==false)fail('UNSAFE_BOUNDARY');
  return {id:`${id}/W${String(i+1).padStart(4,'0')}`,kind:e.kind,interface:pair(e.a,e.b),from:e.a,to:e.b,roomIds:e.roomIds,localYBase:e.yBase,nominal:true};
 });
 const edgeLookup=new Map(segments.map(s=>[s.interface,s]));
 if(edgeLookup.size!==segments.length)fail('DUPLICATE_BOUNDARY');
 const ports=g.reviewData.roomPorts.map((p,i)=>{
  const found=edgeLookup.get(pair(p.door,p.hall));
  if(!found||found.kind!=='NOMINAL_DOOR_INTERFACE'||!found.roomIds.includes(p.roomId))fail('UNMAPPED_DOOR_PORT');
  return {id:`${id}/D${String(i+1).padStart(3,'0')}`,roomId:p.roomId,boundaryId:found.id,doorCell:p.door,hallCell:p.hall,nominal:true,openingPhysicalVerified:false};
 });
 if(ports.length!==new Set(ports.map(p=>p.roomId)).size)fail('DUPLICATE_PORT');
 return {id,level:l.level,dimensions:l.dimensions,localYRange:l.localYRange,sourceFootprintSha256:h(l.sourcePredictedMask),
  wallBoundaries:segments,roomDoorInterfaces:ports,corridorReservation:g.reviewData.corridor,
  stairReservation:l.nominalStairReservation,elevatorReservation:l.nominalElevatorReservation,
  originalCorridorOutsideSource:g.original.counts.corridorCellsOutsideSource,
  alternative:{kind:'OPTIONAL_UNAPPLIED_CORRIDOR_TRIM',removed:g.reviewData.removed,applied:false},
  conceptualGraph:{originalComponents:g.original.counts.corridorComponents,roomNodes:g.original.counts.roomNodes,
    nominalStairPathMissing:g.original.counts.roomsWithoutNominalStairPath},
  worldAnchor:null,materialIds:[],operations:[],physicalValidated:false};
}
/** Compiles only pinned schematic local coordinates, not world/block operations. */
export function compileB17IR(root,{snapshotDir=null}={}){
 const b14=buildB14Report(root);validateB14Report(b14,root);
 const b16=buildB16Report(root);validateB16Report(b16,root);
 if(b16.evidence.b14ReportSha256!==b14.reportSha256||b14.candidates.length!==b16.candidates.length)fail('UPSTREAM_MISMATCH');
 const buildings=b14.candidates.map(b=>{
  const cb=b16.candidates.find(c=>c.key===b.key);
  if(!cb||cb.levels.length!==b.levels.length)fail('MISSING_BUILDING');
  const floors=b.levels.map((f,i)=>prepareFloor(b,cb,f,cb.levels[i]));
  const verticalInterfaces=cb.verticalLinks.map((x,i)=>({id:`${b.key}/V${i+1}`,fromFloor:`${b.key}/L${x.fromLevel}`,toFloor:`${b.key}/L${x.toLevel}`,
   stairXZAligned:x.nominalStairXZAligned,realStairConstructed:false,actualPassageVerified:false}));
  return {id:b.key,floorHeightNominal:b.nominalFloorHeight,dimensions:b.dimensions,floors,verticalInterfaces};
 });
 const counts={buildings:buildings.length,floors:0,wallEdges:0,doorPorts:0,nominalVerticalLinks:0,reviewTrimCells:0,sourceCorridorOutside:0};
 for(const b of buildings){counts.floors+=b.floors.length;counts.nominalVerticalLinks+=b.verticalInterfaces.length;
  for(const f of b.floors){counts.wallEdges+=f.wallBoundaries.length;counts.doorPorts+=f.roomDoorInterfaces.length;counts.reviewTrimCells+=f.alternative.removed.length;counts.sourceCorridorOutside+=f.originalCorridorOutsideSource;}}
 if(JSON.stringify(counts)!==JSON.stringify({buildings:5,floors:30,wallEdges:5704,doorPorts:314,nominalVerticalLinks:25,reviewTrimCells:18,sourceCorridorOutside:18}))fail('BASELINE_CHANGED');
 const report={schema:'minecraftaibuilder-step8b-b17-interior-ir-v1',purpose:'ENGINE_INTEGRATION_DESIGN_INPUT_NOT_BUILD_PLAN',
  provenance:{b14ReportSha256:b14.reportSha256,b16ReportSha256:b16.reportSha256,pinnedPlannerFileHashes:B13_WINDOWS_PINNED,
   snapshotSignals:snapshotSignals(snapshotDir)},
  coordinateFrame:'SCHEMATIC_LOCAL_CONCEPT_XZ_NOMINAL_Y',unitConversionVerified:false,worldCoordinates:null,
  buildings,counts,capabilityBoundary:{externalEnvelope:'EMITTER_IDENTIFIED_IN_PINNED_SOURCE',interiorPartition:'NOT_IMPLEMENTED_IN_INSPECTED_PLANNER',
   roomDoor:'NOT_IMPLEMENTED_IN_INSPECTED_PLANNER',stairAssembly:'NOT_IMPLEMENTED_IN_INSPECTED_PLANNER',elevator:'NOT_IMPLEMENTED_IN_INSPECTED_PLANNER',
   importIntoEngine:'NOT_WIRED',engineRun:'NOT_EXECUTED',runtimeIdentity:'NOT_VERIFIED'},
  blockers:BLOCKERS.map(x=>({...x,state:'OPEN'})),
  milestones:[
   {id:'M1',name:'Intermediate representation and source seam',state:'COMPLETE_OFFLINE',evidence:'IR bounds, indices, provenance, negative-path tests'},
   {id:'M2',name:'Real interior module emitters with pure simulation',state:'NOT_STARTED',evidence:'No emitted construction operations'},
   {id:'M3',name:'Offline general-planner integration',state:'NOT_STARTED',evidence:'No integrated BuildPlan validation'},
   {id:'M4',name:'Windows controlled non-construction verification',state:'NOT_STARTED',evidence:'Runtime source/load match unavailable'},
   {id:'M5',name:'Explicitly approved isolated construction canary',state:'BLOCKED_BY_USER_APPROVAL',evidence:'No permission to construct'}],
  safety:{notPrepared:true,approval:'NOT_REQUESTED',constructionApproved:false,executionAllowed:false,
   existingWorldModified:false,legacyModified:false,frozenEvidenceModified:false,bridgeContact:false,networkAccess:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]},
  deploymentGate:'BLOCKED',application:'REVIEW_ONLY_NOT_APPLIED',physicalValidated:false};
 report.reportSha256=h(report);return report;
}
export function validateB17IR(report,root,options={}){
 if(report?.schema!=='minecraftaibuilder-step8b-b17-interior-ir-v1'||report.purpose!=='ENGINE_INTEGRATION_DESIGN_INPUT_NOT_BUILD_PLAN'||
   report.deploymentGate!=='BLOCKED'||report.application!=='REVIEW_ONLY_NOT_APPLIED'||report.physicalValidated!==false||
   report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.commandCount!==0||report.BuildPlan?.operations?.length!==0||
   report.BuildPlan?.worldCoordinates!==null||report.BuildPlan?.materialIds?.length!==0||report.worldCoordinates!==null||
   report.safety?.notPrepared!==true||report.safety?.approval!=='NOT_REQUESTED'||
   ['constructionApproved','executionAllowed','existingWorldModified','legacyModified','frozenEvidenceModified','bridgeContact','networkAccess'].some(k=>report.safety[k]!==false)||
   report.blockers?.length!==8||report.blockers.some(x=>x.state!=='OPEN')||
   report.milestones?.some(x=>x.id!=='M1'&&x.state==='COMPLETE_OFFLINE')||
   report.buildings?.some(b=>b.floors?.some(f=>f.worldAnchor!==null||f.materialIds?.length!==0||f.operations?.length!==0||f.physicalValidated!==false||f.alternative?.applied!==false||f.roomDoorInterfaces.some(p=>p.openingPhysicalVerified!==false)))
  )fail('UNSAFE_IR');
 const {reportSha256,...payload}=report;if(h(payload)!==reportSha256)fail('DIGEST_CHANGED');
 // Provenance remains mandatory even for a rehashed malicious file.
 if(h(compileB17IR(root,options))!==h(report))fail('CONTENT_CHANGED');
 return true;
}
export function summarizeB17(report){return {counts:report.counts,capabilities:report.capabilityBoundary,blockers:report.blockers.map(x=>x.id),
 milestones:report.milestones.map(x=>({id:x.id,state:x.state})),gate:report.deploymentGate,BuildPlan:report.BuildPlan};}

/**
 * B19 / M3: source-fingerprint-pinned, READ-ONLY adapter between conceptual M2
 * geometry and the frozen GeneralBuildingPlanner input/validation contracts.
 * Does not import, call, patch, or produce plans for the production engine.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileB18M2,validateB18M2} from './step8b-interior-geometry-b18.mjs';
import {loadB10Frozen,maskForFloor} from './step8b-interior-contract-b10.mjs';
import {B13_WINDOWS_PINNED} from './step8b-module-contract-b13.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const digest=o=>sha(JSON.stringify(o));
const fail=code=>{const e=new Error('M3_'+code);e.code='M3_'+code;throw e;};
const SOURCE=Object.freeze({...B13_WINDOWS_PINNED,
 'engine/src/safety.js':'ef4f71ec968b46ce937d6b279f9cb5b9b7aecde7fd917a960e1716b72795e9fc',
 'engine/src/build-anchor.js':'23bea262e90012fc6bfdd9f1407e1f7cb514f87862ad1c60b0431792f8ef056f'});
export const M3_SOURCE_SHA256=SOURCE;
const LIMITS=Object.freeze({maxAxis:64,maxVolume:32768,maxRelativeOffset:128,maxOperations:3000,maxEstimatedBlockWrites:500000});
const SHAPES={hotel:['stepped','U_shape','tower_on_podium','asymmetric_block','slab'],apartment:['L_shape','slab','twin_bar','courtyard'],office:['slab','tower_on_podium','asymmetric_block','stepped']};
const PROGRAM_HEIGHT={hotel:5,apartment:4,office:4};
const isValidBox=b=>Array.isArray(b?.min)&&Array.isArray(b?.max)&&b.min.length===3&&b.max.length===3&&
 b.min.every((x,i)=>Number.isFinite(x)&&Number.isFinite(b.max[i])&&x<b.max[i]);
export function verifyM3EngineSnapshot(root){
 if(typeof root!=='string'||!root)fail('SOURCE_ROOT');
 const out={};
 for(const [rel,expected] of Object.entries(SOURCE)){
  const full=path.join(root,rel);let bytes;
  try {if(!fs.lstatSync(full).isFile()||fs.lstatSync(full).isSymbolicLink())fail('SOURCE_NONFILE');bytes=fs.readFileSync(full);}
  catch(e){if(e.code?.startsWith('M3_'))throw e;fail('SOURCE_MISSING');}
  if(sha(bytes)!==expected)fail('SOURCE_CHANGED');out[rel]=expected;
 }
 const planner=fs.readFileSync(path.join(root,'engine/src/general-building-planner.js'),'utf8');
 const safety=fs.readFileSync(path.join(root,'engine/src/safety.js'),'utf8');
 const anchor=fs.readFileSync(path.join(root,'engine/src/build-anchor.js'),'utf8');
 const grammar=fs.readFileSync(path.join(root,'engine/src/building-grammar.js'),'utf8');
 for(const s of ['fromComposition(composition','createComposition(input)','validateBuildPlan(','plate(mask, base, "floor", "floor")','rotatePlanPoint(point, c.orientation, w, d)']){
  if(![planner,grammar,safety].some(t=>t.includes(s)))fail('UNEXPECTED_API');
 }
 for(const s of ['maxOperations: 3000','maxVolume: 32768','maxEstimatedBlockWrites: 500000'])if(!safety.includes(s))fail('SAFETY_CONTRACT_CHANGED');
 for(const s of ['case "east": return { x: depth - 1 - z, y, z: x }','case "south": return { x: width - 1 - x, y, z: depth - 1 - z }'])if(!anchor.includes(s))fail('ROTATION_CONTRACT_CHANGED');
 return {status:'PINNED_DISK_SOURCE_MATCH',files:out,execution:'SOURCE_READ_ONLY_NO_IMPORT_NO_PLANNER_CALL'};
}
/** Continuous AABB rotation matching the *cell* transformation of rotatePlanPoint.
 * This is NOT an executable block coordinate transformation. */
export function rotateM3LocalBox(b,dims,orientation){
 if(!isValidBox(b)||!Number.isSafeInteger(dims?.width)||!Number.isSafeInteger(dims?.depth)||dims.width<1||dims.depth<1)fail('ROTATION_INPUT');
 const {width:w,depth:d}=dims;
 const corners=[[b.min[0],b.min[2]],[b.min[0],b.max[2]],[b.max[0],b.min[2]],[b.max[0],b.max[2]]];
 const op={north:([x,z])=>[x,z],east:([x,z])=>[d-z,x],south:([x,z])=>[w-x,d-z],west:([x,z])=>[z,w-x]}[orientation];
 if(!op)fail('ORIENTATION');
 const xs=[],zs=[];for(const c of corners){const [x,z]=op(c);xs.push(x);zs.push(z);}
 return {min:[Math.min(...xs),b.min[1],Math.min(...zs)],max:[Math.max(...xs),b.max[1],Math.max(...zs)]};
}
function assertFrozenCandidate(c,b){
 const [program,id]=b.id.split('/');
 if(!SHAPES[program]||c?.program!==program||c.id!==id||c.dimensions.width!==b.dimensions.width||c.dimensions.depth!==b.dimensions.depth||c.dimensions.floors!==b.dimensions.floors||
  !SHAPES[program].includes(c.massing)||!['north','east','south','west'].includes(c.orientation)||!Number.isSafeInteger(c.seed)||c.seed<0||
  !Number.isSafeInteger(b.nominalFloorHeight)||b.nominalFloorHeight!==PROGRAM_HEIGHT[program]||
  c.dimensions.width<15||c.dimensions.width>48||c.dimensions.depth<12||c.dimensions.depth>40||c.dimensions.floors<2||c.dimensions.floors>10||
  c.BuildPlan?.status!=='NOT_PREPARED'||c.BuildPlan?.operations?.length!==0)fail('NORMALIZATION_MISMATCH');
 return {buildingType:program,width:c.dimensions.width,depth:c.dimensions.depth,floors:c.dimensions.floors,
  floorHeight:b.nominalFloorHeight,style:c.style,seed:c.seed,massing:c.massing,orientation:c.orientation,
  readOnly:true,executed:false};
}
const pkey=(p,w)=>p.z*w+p.x;
/** Previews (a) door and room connectivity vs engine-source envelope, (b) local panel geometry and
 * (c) per-floor slab cutout dependence. No material selection or operation synthesis. */
export function compareM3Floor(floor,irFloor,engineMask,dimensions,orientation){
 const {width:w,depth:d}=dimensions;
 if(!floor||!irFloor||floor.floorId!==irFloor.id||!Array.isArray(floor.partitions)||!Array.isArray(floor.openings)||
  !Array.isArray(engineMask)&&!(engineMask instanceof Uint8Array)||engineMask.length!==w*d)fail('FLOOR_INPUT');
 const transformed=[];
 let panelSolids=0,panelsWithSiteOverhang=0;
 for(const part of floor.partitions){
  if(part.kind!=='SCHEMATIC_PARTITION_PANEL'||part.modelOnly!==true||!Array.isArray(part.solids))fail('UNSAFE_PARTITION');
  for(const solid of part.solids){
   const box=rotateM3LocalBox(solid.bounds,dimensions,orientation);
   if(!['PARTITION','LEFT_JAMB','RIGHT_JAMB','LINTEL'].includes(solid.role))fail('UNEXPECTED_SOLID');
   if(box.min[0]<-0.501||box.min[2]<-0.501||box.max[0]>(['east','west'].includes(orientation)?d:w)+0.501||
    box.max[2]>(['east','west'].includes(orientation)?w:d)+0.501)panelsWithSiteOverhang++;
   transformed.push(box);panelSolids++;
  }
 }
 if(panelSolids!==floor.counts.panelSolids||floor.counts.openings!==floor.openings.length)fail('GEOMETRY_COUNT');
 const irDoorById=new Map(irFloor.roomDoorInterfaces.map(e=>[e.id,e]));
 let doorEndpointsOutside=0,doorsInside=0;
 for(const opening of floor.openings){
  const nominal=irDoorById.get(opening.id);
  if(!nominal||opening.physicalDoorImplemented!==false||!isValidBox(opening.openingVolume))fail('DOOR_ID_OR_VIOLATION');
  for(const p of [nominal.hallCell,nominal.doorCell]){
   if(!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.z)||p.x<0||p.z<0||p.x>=w||p.z>=d)fail('DOOR_BOUNDS');
   if(!engineMask[pkey(p,w)])doorEndpointsOutside++;
  }
  doorsInside+=engineMask[pkey(nominal.doorCell,w)]&&engineMask[pkey(nominal.hallCell,w)]?1:0;
 }
 if(doorsInside>floor.openings.length)fail('BAD_COUNTS');
 return {floorId:floor.floorId,modeledPartitionPanels:floor.partitions.length,modelSolidVolumes:panelSolids,
  nominalDoors:floor.openings.length,doorsWithBothEndsInSourceEnvelope:doorsInside,nominalDoorEndpointsOutsideSource:doorEndpointsOutside,
  panelsWithSiteOverhang,rotatedLocalAabbCount:transformed.length,
  geometryConversion:'CONTINUOUS_MODEL_ONLY_NO_BLOCK_QUANTIZATION',engineMaskStatus:'STATIC_SOURCE_PREDICTED_NOT_PLANNER_EXECUTED',
  actualFloorSlabOpening:'UNKNOWN',actualPartitionMaterials:'UNKNOWN',actualDoorBlocks:'UNKNOWN'};
}
export function buildM3ReadOnlyAdapter(root,{snapshotRoot=null}={}){
 if(typeof root!=='string'||!root)fail('ROOT');
 const m2=compileB18M2(root);validateB18M2(m2,root);
 const original=JSON.parse(fs.readFileSync(path.join(root,'reports/B18_M2_LOCAL_GEOMETRY.json'),'utf8'));
 if(digest(m2)!==digest(original))fail('M2_REPORT_CHANGED');
 const b17=JSON.parse(fs.readFileSync(path.join(root,'reports/B17_INTERIOR_INTEGRATION_IR.json'),'utf8'));
 const {b7}=loadB10Frozen(root);
 let verifiedSource=null;if(snapshotRoot!==null)verifiedSource=verifyM3EngineSnapshot(snapshotRoot);
 if(b7.candidates.length!==5||m2.buildings.length!==5||b17.buildings.length!==5)fail('BASELINE_COUNT');
 const byB17=new Map(b17.buildings.map(b=>[b.id,b]));
 const byFrozen=new Map(b7.candidates.map(c=>[`${c.program}/${c.id}`,c]));
 const buildings=m2.buildings.map(m=>{
  const bc=byFrozen.get(m.id),bi=byB17.get(m.id);
  if(!bi||!bc||m.floors.length!==bi.floors.length||m.stairRoutes.length!==bi.verticalInterfaces.length)fail('CANDIDATE_LINK');
  const normalizedInput=assertFrozenCandidate(bc,m);
  const floors=m.floors.map((f,i)=>{
   const irFloor=bi.floors[i];if(f.floorId!==irFloor.id||irFloor.localYRange[0]!==i*m.nominalFloorHeight)fail('LEVEL_PROVENANCE');
   const mask=maskForFloor(bc.sourcePredictedRectangles,m.dimensions.width,m.dimensions.depth,i);
   return compareM3Floor(f,irFloor,mask,m.dimensions,bc.orientation);
  });
  const unresolvedStairs=m.stairRoutes.filter(x=>x.routeFound&&x.floorAndCeilingCutouts!=='GENERATED').length;
  return {id:m.id,normalizedPlannerInputReview:normalizedInput,orientation:bc.orientation,floors,
   aggregate:{panels:floors.reduce((s,f)=>s+f.modeledPartitionPanels,0),doors:floors.reduce((s,f)=>s+f.nominalDoors,0),
    doorEndpointsOutside:floors.reduce((s,f)=>s+f.nominalDoorEndpointsOutsideSource,0),
    overhangVolumeSegments:floors.reduce((s,f)=>s+f.panelsWithSiteOverhang,0),
    stairInterfaces:m.stairRoutes.length,stairSlabCutoutsMissing:unresolvedStairs},
   engineCandidateStatus:'READ_ONLY_NORMALIZED_INPUT_AND_MASK_COMPARISON',interiorEmitterPresentInPlanner:'NOT_ESTABLISHED'};
 });
 const counts={buildings:buildings.length,floors:buildings.reduce((n,b)=>n+b.floors.length,0),
  candidatePartitionPanels:buildings.reduce((n,b)=>n+b.aggregate.panels,0),
  candidateDoorVoids:buildings.reduce((n,b)=>n+b.aggregate.doors,0),
  candidateStairInterfaces:buildings.reduce((n,b)=>n+b.aggregate.stairInterfaces,0),
  stairInterfacesMissingSlabCutout:buildings.reduce((n,b)=>n+b.aggregate.stairSlabCutoutsMissing,0),
  nominalDoorEndpointsOutsideEngineFootprint:buildings.reduce((n,b)=>n+b.aggregate.doorEndpointsOutside,0)};
 if(counts.buildings!==5||counts.floors!==30||counts.candidatePartitionPanels!==5704||counts.candidateDoorVoids!==314||counts.candidateStairInterfaces!==25)fail('COUNTS_CHANGED');
 const blockers=['NO_ENGINE_INTEGRATION_HOOK','CONTINUOUS_TO_BLOCK_QUANTIZATION_NOT_SPECIFIED','EDUCATION_MATERIAL_ALLOWLIST_NOT_ATTESTED',
  'DOOR_BLOCK_AND_ORIENTATION_NOT_VERIFIED','FLOOR_SLAB_STAIR_CUTOUT_NOT_DESIGNED','STAIR_HEADROOM_AND_LANDING_NOT_VERIFIED',
  'RUNNING_WINDOWS_ENGINE_NOT_ATTESTED','WORLD_ANCHOR_AND_SITE_SCAN_NOT_VERIFIED','OFFICE02_FOOTPRINT_AND_CORRIDOR_REVIEW_ONLY',
  'USER_CONSTRUCTION_APPROVAL_MISSING'].map(id=>({id,status:'BLOCKED'}));
 const report={schema:'minecraftaibuilder-step8b-b19-m3-readonly-adapter-v1',purpose:'FROZEN_SOURCE_PLANNER_CONTRACT_COMPARISON_ONLY',
  provenance:{b18ReportSha256:m2.reportSha256,b17ReportSha256:b17.reportSha256,b7ReportSha256:b7.reportSha256,
   pinnedSourceSha256:SOURCE,sourceVerification:verifiedSource?.status??'EXPECTED_HASHES_ONLY_NO_SNAPSHOT_SUPPLIED'},
  engineContract:{plannerEntryPoints:['GeneralBuildingPlanner.create','GeneralBuildingPlanner.fromComposition'],
   normalizedInput:'createComposition',orientationConvention:'rotatePlanPoint CELL_INDEX_ONLY',
   validation:'validateBuildPlan AFTER operation generation, NOT APPLIED TO FLOAT_GEOMETRY',
   frozenSafetyLimits:LIMITS,actualBuildPlanValidation:'NOT_RUN',blockQuantization:'NOT_DEFINED',actualMaterialMapping:'NOT_DEFINED'},
  buildings,counts,blockers,
  unresolvedKnownIssues:{office02SourceVsConceptCells:123,office02NominalCorridorOutsideCells:18},
  sourceSnapshotReadOnly:verifiedSource!==null,realPlannerCalled:false,engineCodeModified:false,runTimeCompatibilityVerified:false,
  outputExecutable:false,developmentMilestone:'M3_DRY_RUN_ADAPTER_PARTIAL_COMPLETE',deploymentGate:'BLOCKED',
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,bridgeContact:false,networkAccess:false,
   frozenEvidenceModified:false,existingWorldModified:false,legacyModified:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 report.reportSha256=digest(report);return report;
}
export function validateM3Report(r,root,options={}){
 if(r?.schema!=='minecraftaibuilder-step8b-b19-m3-readonly-adapter-v1'||r.deploymentGate!=='BLOCKED'||r.BuildPlan?.status!=='NOT_PREPARED'||
 r.BuildPlan?.operations?.length!==0||r.BuildPlan.commandCount!==0||r.BuildPlan.worldCoordinates!==null||r.BuildPlan.materialIds?.length!==0||
 r.outputExecutable!==false||r.realPlannerCalled!==false||r.engineCodeModified!==false||r.runTimeCompatibilityVerified!==false||
 r.safety?.notPrepared!==true||r.safety?.constructionApproved!==false||r.safety?.executionAllowed!==false||
 r.safety?.bridgeContact!==false||r.safety?.networkAccess!==false||r.safety?.frozenEvidenceModified!==false||
 r.safety?.existingWorldModified!==false||r.safety?.legacyModified!==false||
 r.blockers?.length!==10||r.blockers.some(b=>b.status!=='BLOCKED')||
 Object.entries(SOURCE).some(([f,h])=>r.provenance?.pinnedSourceSha256?.[f]!==h))fail('UNSAFE_REPORT');
 const {reportSha256,...v}=r;if(digest(v)!==reportSha256)fail('REPORT_TAMPERED');
 if(digest(buildM3ReadOnlyAdapter(root,options))!==digest(r))fail('RECOMPUTED_DIFFERENCE');return true;
}

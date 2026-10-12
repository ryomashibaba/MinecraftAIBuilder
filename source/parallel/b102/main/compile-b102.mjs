/** B102: immutable B100 architectural source, B101 scenarios, independently synthesized rooms. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateB100} from '../../b100/main/compile-b100.mjs';
import {validateUniversalCandidate} from '../../b100/main/b100-universal-design.mjs';
import {B101_SCENARIOS} from '../../b101/main/compile-b101.mjs';
import {synthesizeRooms,voxelAudit} from './b102-synthesis-voxels.mjs';
export function compileB102(){
 const b100=JSON.parse(fs.readFileSync(new URL('../../b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));
 if(!validateB100(b100)||b100.reportSha256?.length!==64)throw Error('B102_B100_PARENT_INVALID');
 const cases=b100.architectureCases.map(group=>{
  const req=B101_SCENARIOS[group.caseId];if(!req)throw Error('B102_NO_REFERENCE_PROGRAMME');
  const options=group.options.map(c=>{
   if(!validateUniversalCandidate(c,group.brief))throw Error('B102_UNSAFE_PARENT_CANDIDATE');
   const layout=synthesizeRooms(c,req),voxels=voxelAudit(layout);
   return {candidateId:c.id,shapeVariant:c.variant,requiredUnits:layout.requested,
    placedUnits:layout.placed,missing:layout.unmet,layoutStatus:layout.status,
    floorSummaries:layout.floors.map((f,i)=>({level:f.level,newRooms:f.rooms.length,
     openingsWith2BlockAir:voxels.floors[i].voxelAperturesWith2BlockAir,
     netInteriorAirCells:voxels.floors[i].netInteriorAirFootprintCells,
     blockedPortalCount:voxels.floors[i].unresolved.length,
     voxelConflicts:voxels.floors[i].unresolved.filter(x=>x.reason==='BLOCKED_VOXEL_APERTURE').length})),
    collisionCount:voxels.conflictCount,conceptualDoorAirPass:voxels.conceptualDoors,
    structuralLoadsVerified:false,roofVerified:false,actualMinecraftDoorsInstalled:0,
    actualVerticalMovementVerified:false,certifiedPhysicalExits:0,
    constructionApproved:false};
  });
  return {typology:group.brief.typology,id:group.caseId,requirements:req,options};
 });
 const all=cases.flatMap(c=>c.options);
 const report={schema:'minecraftaibuilder-b102-offline-constrained-synthesis-voxel-v1',
  targetEdition:'MINECRAFT_EDUCATION',javaAdapter:'NOT_IMPLEMENTED',parentB100Sha256:b100.reportSha256,
  originalB100SourceImmutable:true,B101ProgrammeRulesReused:true,cases,
  totals:{types:cases.length,independentAlternatives:all.length,referenceFloors:all.reduce((n,x)=>n+x.floorSummaries.length,0),
   requestedRooms:all.reduce((n,x)=>n+x.requiredUnits,0),newConceptualRooms:all.reduce((n,x)=>n+x.placedUnits,0),
   unmetRequirements:all.reduce((n,x)=>n+x.missing.reduce((m,r)=>m+r.missing,0),0),
   alternativesWithAllRequirementsMet:all.filter(x=>x.layoutStatus==='CONCEPTUAL_ENVELOPES_FIT_PROGRAMME').length,
   sectionVoxelCollisions:all.reduce((n,x)=>n+x.collisionCount,0),
   conceptual2BlockHighDoorwayVoids:all.reduce((n,x)=>n+x.conceptualDoorAirPass,0),
   existing296UnapprovedRooms:296,existing18HeldRooms:18,
   bedrockDoorsBuilt:0,stairsVerified:0,realBlocksEmitted:0,worldContacts:0},
  limits:['ROOM_AREA_IS_CLEAR_INTERIOR_AFTER_ONE_CELL_PERIMETER_WALL',
   'NEW_LAYOUTS_USE_OLD B100 FLOOR FOOTPRINT AND 2_WIDE_GALLERY AS READ_ONLY INPUT',
   'GREEDY_BOUNDED_SYNTHESIS_MAY_FAIL_EVEN_IF_SOLUTION_EXISTS',
   'SPARSE_VOXELS_ARE_CONCEPTUAL_NOT_ACTUAL_MINECRAFT_BLOCK_STATES',
   'TWO_BLOCK_HIGH_AIR_APERTURE_IS_NOT_INSTALLED_DOOR_OR_REAL_ROUTE',
   'NO_LOAD_BEARING_ROOF_WINDOWS_FURNITURE_MULTICORE_EXTERNAL_EGRESS_OR_WORLD_VERIFICATION'],
  gates:b100.gates.map(g=>({...g,status:'BLOCKED'})),readiness:'NOT_PREPARED',worldContacts:0,
  executionAllowed:false,constructionApproved:false,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB102(report))throw Error('B102_INTERNAL_REPORT_INVALID');
 return report;
}
export function validateB102(r){
 if(r?.schema!=='minecraftaibuilder-b102-offline-constrained-synthesis-voxel-v1'||
  r.targetEdition!=='MINECRAFT_EDUCATION'||r.javaAdapter!=='NOT_IMPLEMENTED'||r.parentB100Sha256?.length!==64||
  r.originalB100SourceImmutable!==true||r.B101ProgrammeRulesReused!==true||
  r.readiness!=='NOT_PREPARED'||r.worldContacts!==0||r.executionAllowed!==false||r.constructionApproved!==false||
  r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan?.operations?.length!==0||r.BuildPlan?.commandCount!==0||
  r.BuildPlan?.worldCoordinates!==null||r.gates?.length!==9||r.gates.some(x=>x.status!=='BLOCKED'))return false;
 if(r.cases?.length!==5||r.cases.some(g=>g.options?.length!==3))return false;
 const opts=r.cases.flatMap(g=>g.options),t=r.totals;
 if(opts.length!==15||opts.some(o=>o.placedUnits>o.requiredUnits||o.constructionApproved!==false||
  o.actualMinecraftDoorsInstalled!==0||o.actualVerticalMovementVerified!==false||
  o.certifiedPhysicalExits!==0||o.structuralLoadsVerified!==false||o.roofVerified!==false||
  o.missing.reduce((n,x)=>n+x.missing,0)!==o.requiredUnits-o.placedUnits||
  o.floorSummaries.some(f=>f.newRooms<0||f.openingsWith2BlockAir<0)))return false;
 return t.types===5&&t.independentAlternatives===15&&t.referenceFloors===66&&
  t.requestedRooms===opts.reduce((n,o)=>n+o.requiredUnits,0)&&
  t.newConceptualRooms===opts.reduce((n,o)=>n+o.placedUnits,0)&&
  t.unmetRequirements===t.requestedRooms-t.newConceptualRooms&&
  t.alternativesWithAllRequirementsMet===opts.filter(o=>o.layoutStatus==='CONCEPTUAL_ENVELOPES_FIT_PROGRAMME').length&&
  t.sectionVoxelCollisions===opts.reduce((n,o)=>n+o.collisionCount,0)&&
  t.conceptual2BlockHighDoorwayVoids===opts.reduce((n,o)=>n+o.conceptualDoorAirPass,0)&&
  t.existing296UnapprovedRooms===296&&t.existing18HeldRooms===18&&
  t.bedrockDoorsBuilt===0&&t.stairsVerified===0&&t.realBlocksEmitted===0&&t.worldContacts===0;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=compileB102();console.log(JSON.stringify({totals:r.totals,byType:r.cases.map(c=>({
  id:c.id,options:c.options.map(o=>({id:o.candidateId,rooms:o.placedUnits,requested:o.requiredUnits,
   conceptualAirDoors:o.conceptualDoorAirPass,voxelConflicts:o.collisionCount}))}))},null,2));
}

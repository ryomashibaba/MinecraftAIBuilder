/** B105 deterministic offline architectural volume report across B100's five independent uses. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateB100} from '../../b100/main/compile-b100.mjs';
import {validateUniversalCandidate} from '../../b100/main/b100-universal-design.mjs';
import {B101_SCENARIOS} from '../../b101/main/compile-b101.mjs';
import {coDesignB104} from '../../b104/main/b104-joint-layout.mjs';
import {generateB105,auditB105,drawB105Elevation} from './b105-building-volume.mjs';
export function compileB105(){
 const b100=JSON.parse(fs.readFileSync(new URL('../../b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));
 if(!validateB100(b100)||b100.reportSha256?.length!==64)throw Error('B105_B100_PARENT_INVALID');
 const cases=b100.architectureCases.map(group=>{
  const programme=B101_SCENARIOS[group.caseId];if(!programme)throw Error('B105_NO_PROGRAMME');
  const options=group.options.map(c=>{
   if(!validateUniversalCandidate(c,group.brief))throw Error('B105_B100_VARIANT_CHANGED');
   const design=coDesignB104(c,programme);
   const volume=generateB105(design),audit=auditB105(volume,design.plan);
   if(audit.envelopeConflicts||audit.issueCount||audit.roofCoverageGaps||
     audit.portalVoidGaps||audit.furniturePathViolations||audit.stairInterfaceGaps)
     throw Error('B105_BUILDING_ENVELOPE_QA_FAILED:'+c.id);
   return {id:c.id,levels:volume.levels,
    facadeProfile:volume.facadeProfile,roofProfile:volume.roofProfile,
    conceptualRooms:volume.summary.conceptRooms,connectedRooms:design.result.connected,
    furnitureProxyCells:volume.summary.conceptualFixtures,
    facadePanels:volume.summary.facadePanels,windowProxyCells:volume.summary.windowProxies,
    exteriorDoorwayVoidCells:volume.summary.exteriorPortalVoidCells,
    roofCaps:volume.summary.roofCaps,roofedLevels:volume.summary.roofedLevels,
    exteriorPortalPairs:volume.summary.exteriorPortalPairs,
    stairCoreCount:design.result.coreCount,stairCoreInterfaces:volume.summary.conceptualStairInterfaces,
    conceptualVerticalLinks:volume.summary.conceptualVerticalLinks,
    attemptedVolumeCollisions:audit.envelopeConflicts,roofGaps:audit.roofCoverageGaps,
    exteriorDoorwayGaps:audit.portalVoidGaps,roomAccessBlocked:audit.furniturePathViolations,
    stairInterfaceGaps:audit.stairInterfaceGaps,geometryIssues:audit.issueCount,
    voxelIRCells:audit.voxelCount,
    realWindowsInstalled:0,realFurnitureInstalled:0,realRoofsCertified:0,
    actualTravelCertified:false,wholeBuildingVisuallyApproved:false,
    physicallyFinishedRooms:0,constructionApproved:false};
  });
  // Representative schematic, not human quality validation and not an installed world.
  const exampleDesign=coDesignB104(group.options[0],programme,{feedback:false});
  const example=generateB105(exampleDesign);
  return {caseId:group.caseId,typology:group.brief.typology,options,
   representativeNorthFacadeASCII:drawB105Elevation(example,'N'),reviewOnly:true};
 });
 const options=cases.flatMap(c=>c.options),sum=k=>options.reduce((n,c)=>n+c[k],0);
 const t={typologies:cases.length,variants:options.length,conceptFloors:sum('levels'),
  conceptualRooms:sum('conceptualRooms'),connectedRooms:sum('connectedRooms'),
  furnitureProxyCells:sum('furnitureProxyCells'),
  facadePanels:sum('facadePanels'),windowProxyCells:sum('windowProxyCells'),
  exteriorDoorwayVoidCells:sum('exteriorDoorwayVoidCells'),roofCaps:sum('roofCaps'),
  levelsWithRoofCaps:sum('roofedLevels'),exteriorPortalPairs:sum('exteriorPortalPairs'),
  stairCoreInterfaces:sum('stairCoreInterfaces'),conceptualVerticalLinks:sum('conceptualVerticalLinks'),
  totalArchitecturalVoxelIR:sum('voxelIRCells'),
  attemptedVolumeCollisions:sum('attemptedVolumeCollisions'),roofGaps:sum('roofGaps'),
  exteriorDoorwayGaps:sum('exteriorDoorwayGaps'),roomAccessBlocked:sum('roomAccessBlocked'),
  stairInterfaceGaps:sum('stairInterfaceGaps'),geometryIssues:sum('geometryIssues'),
  distinctFacadeProfiles:new Set(options.map(c=>c.facadeProfile)).size,
  distinctRoofProfiles:new Set(options.map(c=>c.roofProfile)).size,
  legacyUnapprovedRooms:296,legacyHeldRooms:18,finishedPhysicalRooms:0,
  verifiedEducationBlockStates:0,realBlockOperations:0,worldContacts:0};
 const report={schema:'minecraftaibuilder-b105-whole-building-envelope-interior-offline-v1',
  targetEdition:'MINECRAFT_EDUCATION',javaAdapter:'NOT_IMPLEMENTED',B100ReportSha256:b100.reportSha256,
  B100ThroughB104Immutable:true,modelScope:'LOCAL_CONCEPTUAL_3D_VOXEL_IR_WITH_NO_EXECUTION',
  cases,totals:t,knownLimits:[
   'ENCLOSURE_WALLS_OUTSIDE_FOOTPRINT_CELLS_ARE_CONCEPTUAL_NOT_VERIFIED_PHYSICAL_SEAL',
   'ROOF_CAP_IS_CELL_COVERAGE_NOT_WEATHERPROOF_OR_LOAD_BEARING_DESIGN',
   'EXTERIOR_PORTAL_VOID_HAS_NO_HINGE_DOOR_OR_VALIDATED_TERRAIN_EXIT',
   'ROOM_FURNITURE_IS_A_PROVISIONAL_PROXY_WITH_LOCAL_ACCESS_GRAPH_NOT_FINISHED_INTERIOR',
   'CORE_LANDINGS_ARE_ADJACENT_GRAPH_INTERFACES_NOT_REAL_STAIRS_OR_ACCESSIBILITY',
   'FACADES_WINDOWS_MATERIAL_PROFILES_HAVE_NO_CERTIFIED_EDUCATION_BLOCK_STATES',
   'NO_HUMAN_3D_AESTHETIC_REVIEW_OR_MINECRAFT_WORLD_OPS'],
  gates:b100.gates.map(g=>({...g,status:'BLOCKED'})),
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,worldContacts:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB105(report))throw Error('B105_INVALID_SELF_REPORT');
 return report;
}
export function validateB105(r){
 if(r?.schema!=='minecraftaibuilder-b105-whole-building-envelope-interior-offline-v1'||
 r.targetEdition!=='MINECRAFT_EDUCATION'||r.javaAdapter!=='NOT_IMPLEMENTED'||
 r.B100ReportSha256?.length!==64||r.B100ThroughB104Immutable!==true||
 r.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||r.executionAllowed!==false||
 r.worldContacts!==0||r.BuildPlan?.status!=='NOT_PREPARED'||
 r.BuildPlan?.operations?.length!==0||r.BuildPlan?.commandCount!==0||
 r.BuildPlan?.worldCoordinates!==null||r.gates?.length!==9||
 r.gates.some(g=>g.status!=='BLOCKED')||r.cases?.length!==5||
 r.cases.some(c=>c.options?.length!==3||c.reviewOnly!==true||
 typeof c.representativeNorthFacadeASCII!=='string'))return false;
 const options=r.cases.flatMap(c=>c.options),t=r.totals,sum=k=>options.reduce((n,c)=>n+c[k],0);
 if(options.length!==15||options.some(c=>
  c.connectedRooms!==c.conceptualRooms||c.furnitureProxyCells<c.conceptualRooms||
  c.facadePanels<1||c.windowProxyCells<1||c.roofCaps<1||
  c.stairCoreInterfaces!==c.stairCoreCount*c.levels||
  c.conceptualVerticalLinks!==c.stairCoreCount*(c.levels-1)||
  c.exteriorDoorwayVoidCells!==4*c.exteriorPortalPairs||
  c.attemptedVolumeCollisions!==0||c.roofGaps!==0||c.exteriorDoorwayGaps!==0||
  c.roomAccessBlocked!==0||c.stairInterfaceGaps!==0||c.geometryIssues!==0||
  c.realWindowsInstalled!==0||c.realFurnitureInstalled!==0||
  c.realRoofsCertified!==0||c.physicallyFinishedRooms!==0||
  c.actualTravelCertified!==false||c.wholeBuildingVisuallyApproved!==false||
  c.constructionApproved!==false))return false;
 const fields=['levels','conceptualRooms','connectedRooms','furnitureProxyCells','facadePanels',
  'windowProxyCells','exteriorDoorwayVoidCells','roofCaps','roofedLevels','exteriorPortalPairs',
  'stairCoreInterfaces','conceptualVerticalLinks','voxelIRCells','attemptedVolumeCollisions',
  'roofGaps','exteriorDoorwayGaps','roomAccessBlocked','stairInterfaceGaps','geometryIssues'];
 const names=['conceptFloors','conceptualRooms','connectedRooms','furnitureProxyCells','facadePanels',
  'windowProxyCells','exteriorDoorwayVoidCells','roofCaps','levelsWithRoofCaps','exteriorPortalPairs',
  'stairCoreInterfaces','conceptualVerticalLinks','totalArchitecturalVoxelIR','attemptedVolumeCollisions',
  'roofGaps','exteriorDoorwayGaps','roomAccessBlocked','stairInterfaceGaps','geometryIssues'];
 return t.typologies===5&&t.variants===15&&t.conceptFloors===66&&
 fields.every((k,i)=>t[names[i]]===sum(k))&&
 t.distinctFacadeProfiles===new Set(options.map(c=>c.facadeProfile)).size&&
 t.distinctRoofProfiles===new Set(options.map(c=>c.roofProfile)).size&&
 t.distinctFacadeProfiles===5&&t.distinctRoofProfiles===5&&
 t.legacyUnapprovedRooms===296&&t.legacyHeldRooms===18&&
 t.finishedPhysicalRooms===0&&t.verifiedEducationBlockStates===0&&
 t.realBlockOperations===0&&t.worldContacts===0;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=compileB105();
 console.log(JSON.stringify({totals:r.totals,byType:r.cases.map(g=>({
  id:g.caseId,facade:g.options[0].facadeProfile,roof:g.options[0].roofProfile,
  variants:g.options.map(x=>({id:x.id,windows:x.windowProxyCells,roof:x.roofCaps,
   fixtures:x.furnitureProxyCells,stairLinks:x.conceptualVerticalLinks,
   geometryErrors:x.geometryIssues}))
 }))},null,2));
}

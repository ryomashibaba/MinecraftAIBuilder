/** B97 new-build-only dual-width connected gallery co-design. Does not generate real blocks or commands. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {hash,safe} from '../../b79/main/compile-b79.mjs';
import {validateB96} from '../../b96/main/compile-b96.mjs';
import {buildGalleryCoDesign,verifyGalleryFloor,summarizeGalleryFloors} from './b97-gallery-network.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const ensure=(x,k)=>{if(!x)throw Error('B97_'+k)};
const profiles=[{axis:'H',maxH:3,maxV:0,radius:2,bridgeBudget:15},
 {axis:'V',maxH:0,maxV:3,radius:2,bridgeBudget:15},
 {axis:'HV',maxH:3,maxV:1,radius:2,bridgeBudget:18}];
const threshold={minimumRoomAreaRatio:0.75,minimumWholeFloorRoomCountRatio:0.90,
 maximumDaylightProxyRiskRooms:0,minimumFullRoomEntranceCoverageRatio:1.00};
const sums=(opts,field)=>opts.reduce((n,x)=>n+x[field],0);
function evaluate(branch,b96){
 const s=branch.summary,coverage=s.nominalRooms?s.connectedTwoCellDoorwayFrontageRooms/s.nominalRooms:1;
 const countRetention=s.nominalRooms?s.allocatedRooms/s.nominalRooms:1;
 const coversAllRooms=s.connectedTwoCellDoorwayFrontageRooms===s.nominalRooms;
 const quality={minimumRoomAreaPerAllocatedRoom:true,
   nominalRoomCountRetentionRatio:countRetention,nominalFloorRoomAreaRetentionRatio:s.retentionRatio,
   twoCellDoorwayCandidateCoverageRatio:coverage,
   facadeDaylightProxyRiskRooms:s.windowDaylightProxyRisks,
   meetsInterimCountQualityGate:countRetention>=threshold.minimumWholeFloorRoomCountRatio,
   meetsFacadeDaylightProxyGate:s.windowDaylightProxyRisks<=threshold.maximumDaylightProxyRiskRooms,
   meetsFullEntranceCoverageGate:coversAllRooms,
   previousB96OneCellDoorAdjacency:b96.summary.roomDoorwayAdjacencyChecksPassed,
   notPhysicallyBuildable:true,doorHingesFramesAndFireEgressVerified:false,
   windowOpeningsVerified:false,physicalStairGeometryVerified:false,
   meaningfulComparisonOnly:true};
 return {...quality,interimQualityGatesPass:quality.meetsInterimCountQualityGate&&quality.meetsFacadeDaylightProxyGate,
   rankingScore:s.connectedTwoCellDoorwayFrontageRooms*4+s.allocatedRooms*8- s.unallocatedRooms*25 -s.windowDaylightProxyRisks*40 - s.connectedGalleryArea*.04};
}
export function validateB97(r){
 if(r.schema!=='minecraftaibuilder-b97-independent-building-two-wide-connected-room-gallery-v1'||
    r.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||r.executionAllowed!==false||r.worldContacts!==0||
    r.BuildPlan?.operations?.length!==0||r.BuildPlan?.commandCount!==0||r.BuildPlan?.worldCoordinates!==null||
    r.gates?.length!==9||r.gates.some(x=>x.status!=='BLOCKED'))return false;
 const t=r.totals;
 if(t.originalNominalRooms!==314||t.priorUnapprovedCandidates!==296||t.heldIndependentRooms!==18||
   t.approvedIndependentRooms!==0||t.productionEdits!==0||t.worldOperations!==0||t.worldContacts!==0||t.buildings!==5||t.referenceFloorCount!==30)return false;
 if(r.buildings.length!==5||r.buildings.some(b=>b.selectedForProduction!==null||b.options.length!==b.sourceB96Options*3))return false;
 let virtual=0,bad=0;
 for(const b of r.buildings){for(const o of b.options){
  if(o.branchStatus!=='UNAPPROVED_NEW_BUILDING_BRANCH_ONLY'||o.previousB96ProposalsUnchanged!==true||
   o.deploymentApproved!==false||o.sections.length!==b.reference.floorCount)return false;
  virtual+=o.sections.length;
  if(o.sections.some(f=>!verifyGalleryFloor(f)))return false;
  if(o.summary.allocatedRooms+o.summary.unallocatedRooms!==o.summary.nominalRooms||
   o.summary.nominalRooms!==b.reference.nominalRooms||o.quality.notPhysicallyBuildable!==true||
   o.quality.windowOpeningsVerified!==false||o.quality.physicalStairGeometryVerified!==false)return false;
  bad+=o.sections.reduce((n,f)=>n+f.correctedB96StairOverlapCells,0);
 }}
 if(virtual!==t.evaluatedVirtualFloorDesigns||bad!==t.repeatedSourceB96StairOverlapsAcrossOptions)return false;
 if(t.uniqueB96StairReservationOverlapCells!==108)return false;
 return true;
}
export function compileB97(){
 const parent=read('parallel/b96/main/B96_CORE_FIRST_BUILDINGS_REPORT.json');
 safe(parent,'minecraftaibuilder-b96-core-first-independent-whole-building-redesign-v1');
 ensure(validateB96(parent),'B96_PINNED_SOURCE_MISMATCH');
 const shape=read('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json'),sources=new Map(shape.sections.map(s=>[s.id,s]));
 const buildings=[];
 for(const b of parent.buildings){const opts=[];
  for(const prev of b.options){for(const config of profiles){
   const sections=prev.floors.map(prevFloor=>{
    const base=sources.get(prevFloor.sectionId);ensure(base,'MISSING_NOMINAL_FLOOR_'+prevFloor.sectionId);
    const f=buildGalleryCoDesign(base,prevFloor,config);ensure(verifyGalleryFloor(f),'GEOMETRY_'+prevFloor.sectionId);
    return f;
   });
   const summary=summarizeGalleryFloors(sections),quality=evaluate({summary},prev);
   opts.push({id:`${prev.id}__GALLERY_${config.axis}`,parentB96OptionId:prev.id,
    parentB96Focus:prev.siteSelection.focusPattern,methodology:config.axis,
    profileSettings:config,core:{...prev.core},
    sections,summary,quality,
    previousB96ProposalsUnchanged:true,baselineB96OptionReferencesNotReplaced:true,
    branchStatus:'UNAPPROVED_NEW_BUILDING_BRANCH_ONLY',deploymentApproved:false});
  }}
  opts.sort((a,b)=>Number(b.quality.interimQualityGatesPass)-Number(a.quality.interimQualityGatesPass)||
   b.quality.rankingScore-a.quality.rankingScore||b.summary.allocatedRooms-a.summary.allocatedRooms);
  buildings.push({buildingId:b.buildingId,reference:{floorCount:b.reference.floorCount,nominalRooms:b.reference.nominalRooms,
    sourceUnapprovedB96Branches:b.options.length,pinnedPhysicalProduction:b.reference.realProductionPinned},
   sourceB96Options:b.options.length,options:opts,bestConceptualOptionId:opts[0]?.id??null,
   selectedForProduction:null,architecturalApproval:false});
 }
 const flat=buildings.flatMap(b=>b.options),f=flat.flatMap(o=>o.sections);
 const actualB96StairContactLocations=new Set();for(const building of parent.buildings){for(const option of building.options){
  for(const floor of option.floors){const stairSet=new Set(floor.legacyReferenceCores.stairs.map(p=>`${p.x},${p.z}`));
   for(const p of floor.route.sites)if(stairSet.has(`${p.x},${p.z}`))actualB96StairContactLocations.add(`${floor.sectionId}:${p.x},${p.z}`);
  }
 }}
 const totals={buildings:buildings.length,referenceFloorCount:30,originalNominalRooms:314,priorUnapprovedCandidates:296,
  heldIndependentRooms:18,approvedIndependentRooms:0,sourceB96BuildingConcepts:parent.totals.exploredIndependentBuildingBranches,
  newTwoWideGalleryBuildingConcepts:flat.length,evaluatedVirtualFloorDesigns:f.length,
  designsWithInterimCountAndDaylightProxyGates:flat.filter(x=>x.quality.interimQualityGatesPass).length,
  designsConnectingEveryRoomAtLeastTwoHallCells:flat.filter(x=>x.summary.connectedTwoCellDoorwayFrontageRooms===x.summary.nominalRooms).length,
  totalTwoCellRoomFrontageAcrossAlternatives:sums(flat.map(x=>x.summary),'connectedTwoCellDoorwayFrontageRooms'),
  totalAllocatedRoomReferencesAcrossAlternatives:sums(flat.map(x=>x.summary),'allocatedRooms'),
  repeatedSourceB96StairOverlapsAcrossOptions:f.reduce((n,g)=>n+g.correctedB96StairOverlapCells,0),
  uniqueB96StairReservationOverlapCells:actualB96StairContactLocations.size,
  productionEdits:0,worldOperations:0,worldContacts:0};
 const report={schema:'minecraftaibuilder-b97-independent-building-two-wide-connected-room-gallery-v1',
  provenance:{b96:parent.reportSha256,b95:parent.provenance.b95,officialBlocksSha256:parent.provenance.officialBlocksSha256},
  methodology:{floorMasksFromB66:true,independentBuildNoBaselineReplacement:true,
   rebuildsTwoWideCoreToNominalStairAvoidingReservedStairAndElevatorCells:true,
   usesConnected2x2AnchorGraphNotSingleCellReachability:true,
   roomAllocationAfterCorridorReservation:true,roomAreaMinimumRatio:0.75,
   distinguishesTwoCellHallFrontageFromPhysicalDoor:true,daylightProxyIsNotWindowAudit:true,
   thresholds:threshold,previous296NeverAutoMigrated:true},
  totals,buildings,replayEvidenceInheritedFromB96:parent.replayed,
  limitations:['CONCEPT_ONLY_NOT_A_MINECRAFT_BUILDPLAN',
   'TWO_CONNECTED_HALL_CELLS_ALONG_ROOM_PERIMETER_DO_NOT_PROVE_DOOR_HINGE_OR_FRAME',
   'PERIMETER_DAYLIGHT_PROXY_IS_NOT_REAL_WINDOW_GLAZING_EVIDENCE',
   'VERTICAL_SHAFT_HAS_NO CERTIFIED_STAIRS_LIFT_LOAD_PATH_FIRE_ESCAPE_OR_ROOF_WATERPROOFING',
   'INDEPENDENT_BUILDING_REPLACES_EXISTING_BUILDING_GEOMETRY_ONLY_WITH_FUTURE_EXPLICIT_AUTHORIZATION',
   'ONLY_APARTMENT_AND_OFFICE01_HAVE_PINNED_REAL_PRODUCTION; OTHER_THREE_USE_OFFLINE_NOMINAL_FLOORS',
   'SOME_B96_OFFICE_ROUTE_SQUARES_OVERLAPPED_PREVIOUS_RESERVED_STAIR_CELLS; B97_REQUIRES_SEPARATE_SAFE_PATH'],
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:parent.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 ensure(validateB97(report),'FINAL_CONCEPT_VERIFICATION');return {...report,reportSha256:hash(report)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=compileB97();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B97_CONNECTED_GALLERY_REPORT.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({totals:report.totals,buildings:report.buildings.map(b=>({id:b.buildingId,
 best:b.bestConceptualOptionId,top:b.options.slice(0,3).map(o=>({id:o.id,...o.summary,quality:o.quality.interimQualityGatesPass}))}))},null,2));
}

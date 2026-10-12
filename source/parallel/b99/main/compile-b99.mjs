/** B99: offline architectural risk diagnostics only. Does not create a build or touch Minecraft. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {safe,hash} from '../../b79/main/compile-b79.mjs';
import {validateB98} from '../../b98/main/compile-b98.mjs';
import {auditIndependentFloor,officeWingContinuity,r013Tradeoff} from './b99-architecture-audit.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
export function validateB99(r){
 if(r.schema!=='minecraftaibuilder-b99-offline-architecture-safety-frontier-v1'||r.readiness!=='NOT_PREPARED'||r.executionAllowed!==false||r.constructionApproved!==false||r.worldContacts!==0||
 r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||r.BuildPlan?.operations?.length!==0||r.BuildPlan?.commandCount!==0||r.BuildPlan?.worldCoordinates!==null)return false;
 const t=r.totals;if(t.nominalRooms!==314||t.protectedPriorUnapprovedRooms!==296||t.heldPriorIndependentRooms!==18||t.approvedRooms!==0||t.productionEdits!==0||t.worldContacts!==0||t.constructionCommands!==0||t.virtualFloors!==30||t.options!==5)return false;
 if(r.apartment.options.length!==4||r.office01.options.length!==1)return false;
 for(const o of [...r.apartment.options,...r.office01.options]){
  if(o.floors.length!==6||o.buildable!==false||o.status!=='BLOCKED_ARCHITECTURAL_REVIEW')return false;
  const good=o.floors.filter(f=>f.geometry.twoByTwoConnectedComponents===1).length;
  if(good!==o.metrics.twoWideConnectedFloors)return false;
  if(o.metrics.nominalFrontageCount!==o.floors.reduce((n,f)=>n+f.nominalTwoCellEntranceBays,0))return false;
  if(o.floors.some(f=>f.buildable||f.realExitEgressValidated||f.physical3DVolumeValidated||f.structure.structuralLoadPathVerified||f.structure.realSunPathNotSimulated!==true||f.doorStudies.some(d=>d.hingeOrJambProductionProven)))return false;
 }
 const c=r.r013Tradeoff;
 if(c.originalMissingRoomCount!==6||c.optionA.nominalTwoCellEntranceBays!==72||c.optionB.nominalTwoCellEntranceBays!==78||c.optionB.shadedFacadeRiskRooms!==24)return false;
 if(!r.office01.verticalProgramme.relocationVolumesStackInSamePlanPosition||r.office01.verticalProgramme.completeVerticalLoadPath||r.totals.verifiedEgressRoutes!==0)return false;
 return true;
}
export function compileB99(){
 const b98=load('parallel/b98/main/B98_ATRIUM_WING_REPORT.json');safe(b98,'minecraftaibuilder-b98-atrium-gallery-south-wing-independent-redesign-v1');
 if(!validateB98(b98))throw Error('B99_SOURCE_B98_REJECTED');
 const shapes=load('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json').sections;
 const match=(building,index)=>shapes.filter(s=>s.id.startsWith(building+'/')).sort((a,b)=>a.level-b.level)[index];
 const compileOption=(o,building)=>{
  const floors=o.sections.map((f,i)=>{const source=match(building,i);if(!source)throw Error('B99_SOURCE_FLOOR_MISSING');const audit=auditIndependentFloor(f,source);
   if(building==='office/candidate-01')audit._officeRooms=f.rooms.filter(x=>/R007$/.test(x.roomId));return audit;});
  const metrics={nominalFrontageCount:floors.reduce((n,f)=>n+f.nominalTwoCellEntranceBays,0),
   totalDoorwaysStillUnverified:floors.reduce((n,f)=>n+f.nominalTwoCellEntranceBays,0),
   twoWideConnectedFloors:floors.filter(f=>f.geometry.twoByTwoConnectedComponents===1).length,
   nominalStairConnectionFloors:floors.filter(f=>f.geometry.conceptReachesReservedStairNeighbor).length,
   anchorArticulationCutCount:floors.reduce((n,f)=>n+f.geometry.singleAnchorCutCount,0),
   anchorBridgeCount:floors.reduce((n,f)=>n+f.geometry.singleEdgeBridgeCount,0),
   conceptualDeckCells:floors.reduce((n,f)=>n+f.structure.newConceptDeckCells,0),
   missingFrontageRooms:floors.reduce((n,f)=>n+f.failedOrMissingNominalBays.length,0),
   maximumDeckExtensionFromOriginalFloor:Math.max(...floors.map(f=>f.structure.maximumUnbracedDeckDistanceInCells)),
   courtyardOpenFractionWithConceptColumns:building.startsWith('apartment')?Math.min(...floors.map(f=>f.structure.conservativeOpeningAfterFourConceptColumns)):null,
   realLoadPathCertified:false,realDoorAndExitCertified:false,fullComplianceCertified:false};
  return {id:o.id,floors,metrics,status:'BLOCKED_ARCHITECTURAL_REVIEW',buildable:false,
   reviewOnly:true,legacyB98ComparisonKeptUnchanged:true};
 };
 const apt={buildingId:'apartment/candidate-01',options:b98.apartment.options.map(o=>compileOption(o,'apartment/candidate-01'))};
 const office={buildingId:'office/candidate-01',options:b98.office01.options.map(o=>compileOption(o,'office/candidate-01'))};
 const report={schema:'minecraftaibuilder-b99-offline-architecture-safety-frontier-v1',
  provenance:{b98:b98.reportSha256,b97:b98.parentB97Hash,sourceB98ReplayedUnchanged:true,
   referenceGeometry:'B66_LOCAL_3D_ASSEMBLY',newProductionGeometry:false},
  totals:{buildings:5,referenceFloors:30,nominalRooms:314,protectedPriorUnapprovedRooms:296,
   heldPriorIndependentRooms:18,approvedRooms:0,options:5,virtualFloors:30,
   newBuildHypothesesOnly:5,verifiedEgressRoutes:0,loadPathsCertified:0,
   productionEdits:0,constructionCommands:0,worldContacts:0},
  apartment:apt,office01:{...office,verticalProgramme:officeWingContinuity(office.options[0].floors)},
  r013Tradeoff:r013Tradeoff(b98.apartment.options),
  qualityFrontier:{
   preservePrior296And18:true,realConstructionForbidden:true,
   bestConservativeConceptOption:'RING_NORTH_WEST_SOUTH',fullBaysEastAlternativeHeld:'RING_OUTBOARD_EAST',
   newSupportSitesAreConceptualNotApproved:true,
   nominalCorridorPathRiskNotCertifiedToFireExit:true,
   noVerifiedWindowSunlightOrFoundation:true,
   nextAction:'BUILDING_ARCHITECTURAL_REDESIGN_REQUIRES_REAL_EXIT_TOPOLOGY_WINDOW_MODEL_AND_LOAD_BEARING_EVIDENCE',
   recommendedForConstruction:null},
  limitations:['2D_2X2_PATH_IS_NOT_ACTUAL_TWO_BLOCK_HEADROOM',
   'CONCEPT_SUPPORT_POINTS_IN_UNROOFED_COURTYARD_ARE_NOT_STRUCTURAL_ENGINEERING',
   'COURTYARD_OPEN_FRACTION_AND_FACADE_RISK_ARE_PROXIES_NOT_DAYLIGHT_OR_CODE_CALCULATIONS',
   'PHYSICAL_WINDOWS_DOOR_SWINGS_WALL_JAMBS_FLOOR_OPENINGS_UNVERIFIED',
   'NOMINAL_STAIR_RESERVATION_NEIGHBOR_IS_NOT_A_VERIFIED_BUILDING_EXIT',
   'NO_REAL_FOUNDATION_COLUMN_BEAM_ROOF_LOAD_PATH_OR_WATERPROOFING',
   'SOUTH_WING_DOES_NOT_INHERIT_APPROVAL_FROM_EXISTING_MAIN_BUILDING',
   'R013_EAST_OUTBOARD_78_BAYS_HAS_24_WINDOW_FACADE_RISK_ROOMS',
   'THIS_IS_AN_INDEPENDENT_NEW_BUILDING_BRANCH_AND_NOT_AN_EXISTING_PRODUCTION_PATCH'],
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:b98.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB99(report))throw Error('B99_FINAL_REPORT_INVALID');return {...report,reportSha256:hash(report)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=compileB99();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B99_ARCHITECTURE_SAFETY_REPORT.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify({totals:r.totals,apartment:r.apartment.options.map(o=>({name:o.id,...o.metrics})),office:r.office01.options[0].metrics,R013:r.r013Tradeoff.originalMissingRoomCount},null,2));
}

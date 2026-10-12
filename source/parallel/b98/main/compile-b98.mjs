/** B98: new-building geometry concepts for the apartment light-court and office south service wing.
 * Output is never a production patch, Minecraft command, world location, or BuildPlan.
 */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {safe,hash} from '../../b79/main/compile-b79.mjs';
import {validateB97} from '../../b97/main/compile-b97.mjs';
import {designAtriumFloor,designOfficeSouthWing,verifyIndependentB98Floor} from './b98-atrium-wing.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const apartmentVariants=['RING','RING_NORTH','RING_NORTH_WEST_SOUTH','RING_OUTBOARD_EAST'];
function summarize(sections){
 const sum=p=>sections.reduce((n,s)=>n+s.stats[p],0);
 const first=sections[0]?.diagnostic;
 const a={virtualFloors:sections.length,nominalRooms:sum('nominalRooms'),allocatedRooms:sum('allocatedRooms'),
  pairedEntranceRooms:sum('pairedEntranceRooms'),unconnectedOrMissingRooms:sum('nominalRooms')-sum('pairedEntranceRooms'),
  retainedNominalAreaRatio:sum('allocatedRoomArea')/sum('nominalRoomArea'),minimumRoomAreaRatio:Math.min(...sections.map(s=>s.stats.minimumAreaRatio)),
  addedFootprintCellsAcrossFloors:sum('addedFootprintCells'),
  physicallyContinuousTwoWideGalleryEveryFloor:sections.every(f=>f.stats.allTwoWideGalleryComponentsConnected),
  displacedOriginalRooms:sum('nominalRooms')-sum('allocatedRooms'),
  totalNominalRoomsAfterReplan:sum('allocatedRooms'),
  originalCourtyardVoidCells:first?.courtyardOriginalVoidCells??null,
  minimumCourtyardOpenRatio:first?.courtyardOriginalVoidCells?Math.min(...sections.map(f=>f.diagnostic.courtyardOpeningRetainedRatio)):null,
  facadeShadingRiskRooms:sections.reduce((n,f)=>n+(f.diagnostic.eastFacadeShadingRiskRooms??0),0),
  floorCountRequiringNewFacadeWork:sections.filter(f=>f.stats.addedFootprintCells>0).length,
  realBlockStructureUnverified:true,doorAndEgressUnverified:true,windowsAndDaylightUnverified:true};
 return a;
}
function option(name,sections,baselines){
 for(const f of sections)if(!verifyIndependentB98Floor(f))throw Error(`B98_${name}_TOPOLOGY_INVALID:${f.status}`);
 const s=summarize(sections);
 const quality={roomCountKept:s.allocatedRooms===s.nominalRooms,
  perRoomAreaAtLeast75Percent:s.minimumRoomAreaRatio>=.75,
  conceptTwoWideConnected:s.physicallyContinuousTwoWideGalleryEveryFloor,
  courtyardOpenAtLeast50Percent:s.minimumCourtyardOpenRatio===null||s.minimumCourtyardOpenRatio>=.5,
  facadeDaylightRiskZero:s.facadeShadingRiskRooms===0,
  allRoomsHaveConceptPairedFrontage:s.pairedEntranceRooms===s.nominalRooms,
  footprintExpansionNeedsExplicitAuthorization:s.addedFootprintCellsAcrossFloors>0,
  actualWindowsDoorsStairsFloorAndFireEgressNotYetValidated:true,
  qualityQualifiedOnlyForFurtherArchitecturalReview:false};
 quality.eligibleForDaylightConservativeReview=quality.roomCountKept&&quality.perRoomAreaAtLeast75Percent&&quality.courtyardOpenAtLeast50Percent&&quality.facadeDaylightRiskZero;
 return {id:name,sourceBaselineB97Id:baselines.id,status:'UNAPPROVED_INDEPENDENT_NEW_BUILDING_OPTION',
   selectedForConstruction:false,sections,summary:s,quality};
}
export function validateB98(report){
 if(report.schema!=='minecraftaibuilder-b98-atrium-gallery-south-wing-independent-redesign-v1'||
   report.readiness!=='NOT_PREPARED'||report.constructionApproved!==false||report.executionAllowed!==false||
   report.worldContacts!==0||report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||
   report.BuildPlan?.worldCoordinates!==null||report.gates?.length!==9||report.gates.some(g=>g.status!=='BLOCKED'))return false;
 if(report.totals.buildings!==5||report.totals.nominalRooms!==314||report.totals.protectedUnapprovedPriorRooms!==296||
   report.totals.unresolvedOriginalIndependentRooms!==18||report.totals.approvedIndependentRooms!==0||
   report.totals.productionEdits!==0||report.totals.constructionCommands!==0||report.totals.worldContacts!==0)return false;
 if(report.references?.length!==5||report.apartment.options.length!==4||report.office01.options.length!==1)return false;
 let floors=0;for(const opt of [...report.apartment.options,...report.office01.options]){
  if(opt.status!=='UNAPPROVED_INDEPENDENT_NEW_BUILDING_OPTION'||opt.selectedForConstruction!==false||opt.sections.length!==6)return false;
  floors+=opt.sections.length;
  if(opt.sections.some(f=>!verifyIndependentB98Floor(f)))return false;
  if(opt.summary.allocatedRooms!==opt.sections.reduce((n,f)=>n+f.stats.allocatedRooms,0))return false;
  if(opt.quality.eligibleForDaylightConservativeReview&&opt.summary.facadeShadingRiskRooms>0)return false;
 }
 if(report.totals.virtualFloors!==floors||report.totals.newBuildingVariants!==5)return false;
 const op=(kind)=>report.apartment.options.find(o=>o.id===kind);
 if(op('RING_OUTBOARD_EAST').quality.eligibleForDaylightConservativeReview!==false)return false;
 if(op('RING_NORTH_WEST_SOUTH').summary.pairedEntranceRooms<72||
    op('RING_NORTH_WEST_SOUTH').summary.allocatedRooms!==78)return false;
 if(report.office01.options[0].summary.allocatedRooms!==66)return false;
 return true;
}
export function compileB98(){
 const source=read('parallel/b97/main/B97_CONNECTED_GALLERY_REPORT.json');
 safe(source,'minecraftaibuilder-b97-independent-building-two-wide-connected-room-gallery-v1');
 if(!validateB97(source))throw Error('B98_B97_FROZEN_BASELINE_REJECTED');
 const references=source.buildings.map(b=>({buildingId:b.buildingId,
   baselineBestB97OptionId:b.bestConceptualOptionId,baselineRoomCount:b.reference.nominalRooms,
   baselineTwoCellEntranceCount:b.options[0].summary.connectedTwoCellDoorwayFrontageRooms,
   baselinePlacedRooms:b.options[0].summary.allocatedRooms,
   independentlyRetainedFrozenSource:true}));
 const apt=source.buildings.find(b=>b.buildingId==='apartment/candidate-01').options[0];
 const office=source.buildings.find(b=>b.buildingId==='office/candidate-01').options[0];
 const apartment={buildingId:'apartment/candidate-01',options:apartmentVariants.map(v=>option(v,apt.sections.map(f=>designAtriumFloor(f,v)),apt)),
   conservativeArchitecturalReviewChoice:'RING_NORTH_WEST_SOUTH',
   fullEntranceAlternative:'RING_OUTBOARD_EAST',
   qualification:'NEW_BUILDING_HYPOTHESIS_ONLY; requires courtyard egress, supports, glass & structural approval'};
 const office01={buildingId:'office/candidate-01',options:[option('SOUTH_WING',office.sections.map(f=>designOfficeSouthWing(f)),office)],
   structuralNotes:'New south annex from levels 1–6; 1–2 terrace, 3–6 four relocated rooms. New vertical loads, glazing, facade and corridor must be designed.'};
 const totals={buildings:5,referenceFloors:30,nominalRooms:314,protectedUnapprovedPriorRooms:296,
  unresolvedOriginalIndependentRooms:18,approvedIndependentRooms:0,newBuildingVariants:5,virtualFloors:30,
  apartmentBaselineEntranceCount:apt.summary.connectedTwoCellDoorwayFrontageRooms,
  apartmentConservativePairedEntranceCount:apartment.options[2].summary.pairedEntranceRooms,
  apartmentFullEntranceAlternativeCount:apartment.options[3].summary.pairedEntranceRooms,
  apartmentFullEntranceAlternativeFacadeRiskRooms:apartment.options[3].summary.facadeShadingRiskRooms,
  office01BaselineAllocatedRooms:office.summary.allocatedRooms,
  office01SouthWingAllocatedRooms:office01.options[0].summary.allocatedRooms,
  productionEdits:0,constructionCommands:0,worldContacts:0};
 const report={schema:'minecraftaibuilder-b98-atrium-gallery-south-wing-independent-redesign-v1',
  parentB97Hash:source.reportSha256,provenance:{originalB97Unchanged:true,otherBuildingsRetainedAsComparativeBaseline:true,
  courtyardInferredFromFloorMaskEnclosedVoid:true,exteriorFloorFootprintAddedOnlyOnConceptBranch:true,
  referenceWindowsActuallyVerified:false,doorJambsAndHingesActuallyVerified:false},
  totals,references,apartment,office01,
  omittedFurtherBuildingRearrangement:['hotel/candidate-01','office/candidate-02','office/candidate-03'],
  criticalLimitations:['ALL_NEW_BUILDING_VARIANTS_REQUIRE_INDEPENDENT_STRUCTURAL_DESIGN',
   'OUTBOARD_EAST_GALLERY_SHADES_EXISTING_EAST_WINDOWS_AND_IS_HELD_FOR_FACADE_REDESIGN',
   'COURTYARD_OPEN_SKY_RATIO_IS_2D_PROXY_NOT_DAYLIGHT_SIMULATION',
   'TWO_CONTIGUOUS_HALL_CELLS_ARE_NOT_REAL_BEDROCK_DOOR_JAMBS_HINGES_OR_EGRESS',
   'OFFICE_SOUTH_WING_ALTERS_FACADE_FOOTPRINT_AND_NEEDS_SUPPORTS',
   'B98_DOES_NOT_FIX_OR_APPROVE_ANY_OF_PRIOR_18_OR_296_ROOMS',
   'NO_WORLD_CONTACT_OR_EXECUTABLE_BUILDPLAN'],
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:source.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB98(report))throw Error('B98_REPORT_VALIDATION_FAILED');
 return {...report,reportSha256:hash(report)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=compileB98();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B98_ATRIUM_WING_REPORT.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify({totals:r.totals,apartment:r.apartment.options.map(o=>({id:o.id,...o.summary})),office:r.office01.options[0].summary},null,2));
}

/** Single pinned reference parent, all independent non-executable B114 report outputs. */
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {buildB114,validateB114,writeB114} from './compile-b114.mjs';
import {auditB114Stack,writeB114Stack} from './b114-stack-3d-audit.mjs';
import {inspectHouse,writeHouse} from './b114-house-v3-integrated.mjs';
import {buildHouseUnified3D,validateHouseUnified3D,writeUnified} from './b114-house-unified-3d.mjs';
import {auditHouseArchitecture,writeArchitecture} from './b114-house-architecture.mjs';
import {makeHouseBlueprints} from './b114-house-blueprints.mjs';
import {buildFinishStudy,writeFinishStudy} from './b114-house-finish-study.mjs';
import {reconcileAll,writeFurnitureReview} from './b114-furniture-reconciliation.mjs';
import {proposeHeldBedRepairs,writeHeldBedRepairs} from './b114-held-bed-repair.mjs';
import {stageHeldRoomRecommendations,writeHeldRoomStaging} from './b114-held-room-staging.mjs';
import {auditFleet3D,writeFleet3D} from './b114-fleet-3d-readiness.mjs';
import {designB114SupportRails,writeSupportRails} from './b114-stair-support-reprofile.mjs';
import {searchB114CrossFlightRepairs,writeCrossFlightSearch} from './b114-cross-flight-position-search.mjs';
import {analyzeB114TwoResiduals,writeTwoResidualStudy} from './b114-two-residual-stair-study.mjs';
import {studyApartmentV1Switchbacks,writeApartmentSwitchback} from './b114-apartment-switchback-3d.mjs';
import {integrateB114StairsAndGalleries,writeStairGalleryIntegration} from './b114-stair-gallery-integration.mjs';

export async function writeB114ReviewBatch(output){
 const start=Date.now();
 const parent=await assembleReferenceParent();
 const b113=buildB113(parent);
 if(!validateB113(b113))throw Error('B114_BATCH_SOURCE_B113_INVALID');
 const b114=buildB114(parent,b113);
 if(!validateB114(b114))throw Error('B114_BATCH_SOURCE_B114_INVALID');
 const b114Files=writeB114(b114,output);
 const stack=auditB114Stack(b114);
 const stackFiles=writeB114Stack(stack,output);
 const edgeRails=designB114SupportRails(b114,stack);
 const edgeRailFiles=writeSupportRails(edgeRails,output);
 const crossFlightSource=searchB114CrossFlightRepairs(parent,b113,b114,stack,edgeRails);
 const crossFlightFiles=writeCrossFlightSearch(crossFlightSource,output);
 const twoResidualSource=analyzeB114TwoResiduals(parent,b113,b114,stack,edgeRails,crossFlightSource);
 const lastTwoFiles=writeTwoResidualStudy(twoResidualSource,output);
 const apartmentSource=studyApartmentV1Switchbacks(parent,b113,b114,crossFlightSource,edgeRails,twoResidualSource);
 const apartmentSwitchbackFiles=writeApartmentSwitchback(apartmentSource,output);
 const galleryFiles=writeStairGalleryIntegration(integrateB114StairsAndGalleries(parent,b113,b114,crossFlightSource,apartmentSource),output);
 const house=inspectHouse(parent,b113,b114);
 const houseFiles=writeHouse(house,output);
 const unified=buildHouseUnified3D(parent,b113,b114,house);
 if(!validateHouseUnified3D(unified))throw Error('B114_BATCH_UNIFIED_INVALID');
 const unifiedFiles=writeUnified(unified,output);
 const architectural=auditHouseArchitecture(parent,b113,b114,house,unified);
 if(architectural.worldContacts!==0||architectural.constructionApproved!==false||
  architectural.executionAllowed!==false||architectural.gates.length!==9||
  architectural.gates.some(g=>g.status!=='BLOCKED'))
  throw Error('B114_BATCH_ARCHITECTURAL_REPORT_UNSAFE');
 const architecturalFiles=writeArchitecture(architectural,output);
 const drawings=makeHouseBlueprints(parent,b113,b114,house,unified,architectural,output);
 const finish=writeFinishStudy(buildFinishStudy(parent,b113,b114,house,unified,architectural),output);
 const furnitureSource=reconcileAll(parent,b113,b114,house,unified,architectural);
 const furniture=writeFurnitureReview(furnitureSource,output);
 const heldSource=proposeHeldBedRepairs(furnitureSource);
 const heldBedRepairs=writeHeldBedRepairs(heldSource,output);
 const stagedSource=stageHeldRoomRecommendations(furnitureSource,heldSource,parent);
 const preferredStaging=writeHeldRoomStaging(stagedSource,heldSource,output);
 const fleet=writeFleet3D(auditFleet3D(parent,b113,b114,stack,furnitureSource,heldSource,stagedSource,architectural),output);
 return {batch:'ONE_REFERENCE_PARENT_FOR_FIVE_REPORTS',
  sourceIntegrity:b114.integritySha256,buildings:b114.totals.buildings,
  elapsedMs:Date.now()-start,
  houseThreeDimensionalTotals:unified.totals,
  architecturalTotals:architectural.totals,
  reports:[b114Files,stackFiles,edgeRailFiles,crossFlightFiles,lastTwoFiles,apartmentSwitchbackFiles,galleryFiles,houseFiles,unifiedFiles,architecturalFiles,drawings,finish,furniture,heldBedRepairs,preferredStaging,fleet],
  readiness:'NOT_PREPARED',constructionApproved:false,worldContacts:0,commandCount:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 console.log(JSON.stringify(await writeB114ReviewBatch(path.resolve('b114-review-output')),null,2));
}
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateStairGalleryIntegration} from './b114-stair-gallery-integration.mjs';
const root='b114-review-output/';
const r=JSON.parse(fs.readFileSync(root+'B114_15_Buildings_Stair_Gallery_Integrated_Design.json','utf8'));
const b114=JSON.parse(fs.readFileSync(root+'B114_Conditional_Circulation_15_Buildings.json','utf8'));
const apartment=JSON.parse(fs.readFileSync(root+'B114_APARTMENT_V1_Switchback_3D_Design_Review.json','utf8'));
test('15 buildings and all 102 existing stair/gallery links re-evaluated without old link regression',()=>{
 assert(validateStairGalleryIntegration(r));
 assert.equal(r.totals.sourceGalleryLinked,b114.totals.hypotheticalGalleryStairLinks);
 assert.equal(r.totals.sourceGalleryUnlinked,b114.totals.selectedStairsNeedingGalleryReroute);
 assert.equal(r.totals.stairs,102);
 assert.equal(r.cases.length,15);
 assert(r.cases.every(x=>x.stairInterfaces.length===x.stairLinks));
 for(const c of r.cases)for(const link of c.stairInterfaces)
  if(link.initiallyBothLinked)assert.equal(link.proposedTwoWideLink,true);
});
test('every proposed two-wide connector is a reversible room/core/stair-safe 2x2 path',()=>{
 for(const c of r.cases){
  assert.equal(c.allSourceRoomCoreFootprintsUnchanged,true);
  for(const p of c.stairInterfaces.flatMap(x=>x.proposals)) {
   if(p.status==='CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE'){
    assert.equal(p.continuousTwoWideLocalSquareChain,true);
    assert(p.fullFootprintCells.length>=4);
    assert.equal(p.physical3DBodyClearanceCertified,false);
    assert.equal(p.doorSwingAndFurnitureVerified,false);
    assert(p.addedCells.length>0);
   } else {
    assert.equal(p.addedCells.length,0);
    assert(['NO_TWO_WIDE_FIRST_TWO_ROWS','NO_2_WIDE_GALLERY_PATH'].includes(p.status));
   }
  }
 }
 assert.equal(r.totals.sourceGalleryLinked+r.totals.redesignedWithTwoWideCorridor+
  r.totals.remainingWithoutTwoWideGalleryRoute,102);
});
test('APARTMENT_V1 local aperture reconstitutes original upper slab with no Minecraft change',()=>{
 const a=r.apartmentSwitchbackLocalAperture;
 assert.equal(a.targetFlight,apartment.selectedCandidate.targetFlight);
 assert.equal(a.proposedFloorOpeningCells,apartment.selectedCandidate.newShaftCells);
 assert.equal(a.status,'LOCAL_PROPOSED_FLOOR_APERTURE_ONLY');
 assert.equal(a.originalMaskRestoredExactly,true);
 assert.equal(a.appliedFloorBlockRemovals,0);
 assert.equal(a.realMinecraftStepCollisionCertified,false);
 assert.equal(a.realSlabSupportEngineeringCertified,false);
 assert.equal(a.landingBodyOverlapWarning,apartment.selectedCandidate.ownConservativeBodyVsLandingAABB);
});
test('no physical approvals and nine blocked construction gates across all 15 source buildings',()=>{
 assert.equal(r.sourceGeometryUnchanged,true);
 assert.equal(r.appliedToB113OrB114Source,false);
 assert.equal(r.totals.physicallyCompletedFloors,0);
 assert.equal(r.totals.certifiedStairLandings,0);
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);assert.equal(r.executionAllowed,false);
 assert.equal(r.worldContacts,0);assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));
});
test('Japanese gallery audit and all 15 rows of CSV are user-reviewable',()=>{
 const md=fs.readFileSync(root+'B114_15_Buildings_TwoWide_Gallery_Review_JA.md','utf8');
 const csv=fs.readFileSync(root+'B114_15_Buildings_TwoWide_Gallery_Gap_Matrix.csv','utf8');
 assert(md.includes('折返し階段'));
 assert(md.includes('NOT_PREPARED'));
 assert(md.includes('102'));
 assert.equal(csv.trim().split('\n').length,16);
});

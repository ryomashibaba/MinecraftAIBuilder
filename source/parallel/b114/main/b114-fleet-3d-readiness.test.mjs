import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateFleet3D} from './b114-fleet-3d-readiness.mjs';
const folder='b114-review-output/';
const f=JSON.parse(fs.readFileSync(folder+'B114_Fleet_15_Buildings_3D_Readiness.json','utf8'));
const b114=JSON.parse(fs.readFileSync(folder+'B114_Conditional_Circulation_15_Buildings.json','utf8'));
const stack=JSON.parse(fs.readFileSync(folder+'B114_3D_Stack_Audit.json','utf8'));
const furniture=JSON.parse(fs.readFileSync(folder+'B114_Furniture_Reconciliation_15_Buildings.json','utf8'));
test('15 building / 66 level / 279 room / 102 stair source proofs and checksum',()=>{
 assert(validateFleet3D(f));
 assert.equal(f.totals.buildings,15);
 assert.equal(f.totals.levels,66);
 assert.equal(f.totals.rooms,279);
 assert.equal(f.totals.stairLinks,102);
 assert.equal(f.sourceB114Integrity,b114.integritySha256);
 assert.equal(f.sourceB113Integrity,b114.sourceB113Digest);
 assert.equal(new Set(f.cases.map(x=>x.id)).size,15);
 assert.deepEqual(f.cases.map(x=>x.id),furniture.reports.map(x=>x.id));
});
test('per-stair two-block local swept body and floor-aperture candidates are source traceable',()=>{
 for(const c of f.cases){
  assert.equal(c.stairEvidence.length,c.summary.stairLinks);
  for(const s of c.stairEvidence){
   assert.equal(s.playerSweepHeight,2);
   assert.equal(s.stepRise,5);assert.equal(s.stairWidth,2);
   assert.equal(s.upperFloorApertureCandidates.length,s.sweptUpperSlabIntersectionCells);
   assert.equal(new Set(s.upperFloorApertureCandidates.map(p=>p.x+','+p.z)).size,
    s.upperFloorApertureCandidates.length);
   assert.equal(s.actualBlockPlacement,false);
   assert.equal(s.physicallyClimbableCertified,false);
   assert.equal(s.existingSourceSolidBodyIntersections,
    Object.values(s.collisionsByKind).reduce((a,b)=>a+b,0));
  }
 }
 assert.equal(f.totals.stairLinksRequiringFloorOpenings,
  f.cases.reduce((n,c)=>n+c.stairEvidence.filter(s=>s.sweptUpperSlabIntersectionCells>0).length,0));
});
test('independent inter-storey and gallery aggregates reconcile to prior reports',()=>{
 assert.equal(f.totals.crossStoreyInterferencePairs,
  stack.totals.modelledCrossFlightCollisionPairs);
 assert.equal(f.totals.crossStoreySolidBodyPairs,
  stack.totals.modelledSolidBodyCollisionPairs);
 assert.equal(f.totals.galleryInterfacesNeedingRedesign,
  b114.totals.selectedStairsNeedingGalleryReroute);
 assert.equal(f.totals.roofCapCoverageGaps,0);
 assert.equal(f.totals.stagedRelocatedBedrooms,4);
 assert.equal(f.totals.finishedMinecraftEducationBuildings,0);
});
test('full 3D per-case issue priorities remain informational, never permission',()=>{
 assert.equal(f.rankedPriorities.length,15);
 assert(f.rankedPriorities.every(x=>x.priorityScore>=0));
 assert(f.cases.every(c=>c.roofAndEnvelopeStatus.structuralRoofAndWeatherproofingCertified===false));
 assert.equal(f.physicalCertificationIsOutOfScope,true);
 assert.equal(f.allSourcesUnmodified,true);
 assert.equal(f.readiness,'NOT_PREPARED');
 assert.equal(f.constructionApproved,false);assert.equal(f.executionAllowed,false);
 assert.equal(f.worldContacts,0);assert.equal(f.worldCoordinates,null);
 assert.equal(f.commandCount,0);assert.deepEqual(f.BuildPlan.operations,[]);
 assert.equal(f.gates.length,9);assert(f.gates.every(x=>x.status==='BLOCKED'));
});
test('readable Japanese audit matrix lists all 15 and local geometry summary',()=>{
 const csv=fs.readFileSync(folder+'B114_Fleet_15_Buildings_3D_Risk_Matrix.csv','utf8');
 const md=fs.readFileSync(folder+'B114_Fleet_15_Buildings_3D_Review_JA.md','utf8');
 const lines=csv.trim().split('\n');
 assert.equal(lines.length,16);
 for(const c of f.cases)assert(csv.includes(c.id));
 assert(md.includes('102階段'));
 assert(md.includes('NOT_PREPARED'));
 assert(md.includes('BuildPlan.operations=[]'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateCrossFlightSearch} from './b114-cross-flight-position-search.mjs';
const base='b114-review-output/';
const r=JSON.parse(fs.readFileSync(base+'B114_15_Buildings_CrossFlight_Position_Study.json','utf8'));
const prior=JSON.parse(fs.readFileSync(base+'B114_15_Buildings_EdgeRail_Support_Study.json','utf8'));
test('source-pinned all 15 buildings and 102 flights compare exactly to prior 13 collision pairs',()=>{
 assert(validateCrossFlightSearch(r));
 assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.stairLinks,102);
 assert.equal(r.totals.initialInterferencePairs,prior.totals.proposedTotalInterferencePairs);
 assert.equal(r.sourceB114Integrity,prior.sourceB114Integrity);
 assert.equal(r.sourceEdgeSupportIntegrity,prior.integritySha256);
 assert.equal(r.cases.length,15);
});
test('no new adjacent-floor conflicts and source gallery links are never downgraded',()=>{
 assert(r.totals.afterSearchInterferencePairs<=13);
 assert.equal(r.totals.removedByConservativePositionSearch,
  r.totals.initialInterferencePairs-r.totals.afterSearchInterferencePairs);
 assert.equal(r.totals.afterSearchInterferencePairs,
  r.cases.reduce((n,c)=>n+c.remainingPairs.length,0));
 assert(r.cases.every(c=>c.remainingConflicts<=c.originalConflicts));
 for(const c of r.cases){
  assert.equal(c.proposedOriginalStairs.length,c.stairLinks);
  for(const s of c.proposedOriginalStairs){
   assert.equal(s.cells.length,14);
   assert.equal(new Set(s.cells.map(p=>p.x+','+p.z)).size,14);
   assert(!s.originalConditionalLinked||s.proposedConditionalLinked);
   assert.equal(s.sourceFloorChanged,false);
   assert.equal(s.physicalRiseCertified,false);
  }
 }
});
test('building, room and stair source immutability and human review boundaries',()=>{
 assert.equal(r.sourceFootprintMaskRoomCoreAndTwoGalleryInterfacesRechecked,true);
 assert.equal(r.collisionAuditIncludesAllAdjacentFloorFlights,true);
 assert.equal(r.galleryConnectivityNeverDowngradedFromSource,true);
 assert.equal(r.switchbackGeometryPhysicallyModelled,false);
 assert.equal(r.switchbackBlockPalettesAssigned,false);
 assert.equal(r.sourceGeometryUnmodified,true);
 assert.equal(r.proposalsAppliedToOriginal,false);
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.worldContacts,0);assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));
});
test('15-row risk matrix and Japanese review report published',()=>{
 const csv=fs.readFileSync(base+'B114_15_Buildings_CrossFlight_Remaining.csv','utf8');
 const md=fs.readFileSync(base+'B114_15_Buildings_CrossFlight_Review_JA.md','utf8');
 assert.equal(csv.trim().split('\n').length,16);
 assert(md.includes('設計のみ'));assert(md.includes('折返し'));
 assert(md.includes('NOT_PREPARED'));assert(md.includes('BuildPlan.operations=[]'));
});
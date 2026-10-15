import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB122} from './b122-fleet-route-review.mjs';
const r=JSON.parse(fs.readFileSync('b122-review-output/B122_Full_Length_Corridors_And_Staged_Network.json','utf8'));
test('15 building / 102 stair immutable source evidence and B121 digest pin',()=>{
 assert(validateB122(r));assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.sourceStairs,102);assert.equal(r.totals.originalHeldExits,9);
 assert.equal(r.totals.b121HeldInterfaces,8);
 assert.match(r.sourceB121Integrity,/^[0-9a-f]{64}$/);
});
test('all B121 shortlisted conditional paths get independently audited on both floors',()=>{
 assert(r.totals.stairConfigurationsAudited>=1);
 assert.equal(r.totals.corridorsIndependentlyAudited,r.totals.stairConfigurationsAudited*2);
 for(const c of r.cases)for(const v of c.candidatesAudited){
  assert.deepEqual(v.routes.map(x=>x.side).sort(),['LOWER','UPPER']);
  assert(v.routes.every(x=>x.routeFootprintCells>=4&&x.newRouteCells>=0));
  assert(v.routes.every(x=>x.newlyUnrootedStagedCells>=0));
 }
});
test('cannot promote any route to completed Minecraft access or remove the 9 HOLDS',()=>{
 assert.equal(r.totals.certifiedRealWalkable,0);
 assert.equal(r.totals.worldContacts,0);
 for(const c of r.cases)for(const v of c.candidatesAudited){
  assert.equal(v.networkReconnectionCertified,false);
  assert.equal(v.physicalWalkabilityCertified,false);
  assert.equal(v.constructionAllowed,false);
  for(const x of v.routes){
   assert.equal(x.actualEducationCollisionCertified,false);
   assert.equal(x.realFloorSupportCertified,false);
   assert.equal(x.rootToAllOtherStairsCertified,false);
  }
 }
});
test('no-world safety state and nine blocked gates remain unchanged',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.executionAllowed,false);assert.equal(r.constructionApproved,false);
 assert.equal(r.worldContacts,0);assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);assert.equal(r.gates.length,9);
 assert(r.gates.every(g=>g.status==='BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
});
test('CSV and Japanese report include independent route classifications',()=>{
 const csv=fs.readFileSync('b122-review-output/B122_Individual_Corridor_Proofs.csv','utf8');
 const md=fs.readFileSync('b122-review-output/B122_Full_Route_Independent_Review_JA.md','utf8');
 assert.equal(csv.trim().split('\n').length,1+r.totals.corridorsIndependentlyAudited);
 assert(md.includes('元の9出口はすべてHOLD'));
 assert(md.includes('NOT_PREPARED'));
});

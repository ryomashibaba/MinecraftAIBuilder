import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB123} from './b123-fleet-network-review.mjs';
const r=JSON.parse(fs.readFileSync('b123-review-output/B123_All_Stair_Interface_Network_Review.json','utf8'));
test('B123 full 15-building and 102 original stair-interface inventory has trusted digest',()=>{
 assert.equal(validateB123(r),true);
 assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.stairInterfacesAudited,102);
 assert.equal(r.cases.reduce((n,c)=>n+c.baselineInterfaces.length,0),102);
 assert.match(r.sourceB122Integrity,/^[a-f0-9]{64}$/);
});
test('each B122 shortlisted concept is independently compared before and after on all stair interfaces',()=>{
 assert(r.totals.conceptsReconciled>=1);
 for(const c of r.cases)for(const x of c.conceptCandidates){
  assert.equal(x.stairCount,c.sourceStairs);
  assert.equal(x.interfaceRecords.length,c.sourceStairs);
  assert.equal(x.replacedTargetBothRooted,
   x.interfaceRecords.find(t=>t.target).after.LOWER&&x.interfaceRecords.find(t=>t.target).after.UPPER);
  assert.equal(x.regressions.length,x.otherStairRegressionCount);
  assert.equal(x.originalSourceModified,false);
 }
});
test('any new non-target lost rooted side is a HOLD, never silently promoted',()=>{
 for(const c of r.cases)for(const x of c.conceptCandidates){
  if(x.regressions.length||!x.replacedTargetBothRooted)
   assert.equal(x.status,'HOLD_NETWORK_RECONNECTION_REVIEW');
  else assert.equal(x.status,'NO_NEW_TWO_WIDE_INTERFACE_REGRESSION_IN_SCOPED_PROXY');
  assert.equal(x.constructionAllowed,false);
  assert.equal(x.allOtherStairPhysicalConnectionsCertified,false);
 }
});
test('no Minecraft world contact and all original nine construction gates blocked',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);
 assert(r.gates.every(x=>x.status==='BLOCKED'));
 assert.equal(r.totals.physicallyWalkableCertified,0);
});
test('CSV and Japanese review explicitly describe new rooted 2-wide analysis',()=>{
 const csv=fs.readFileSync('b123-review-output/B123_Stair_Interface_Before_After.csv','utf8');
 const md=fs.readFileSync('b123-review-output/B123_All_Stair_Interface_Review_JA.md','utf8');
 assert.equal(csv.trim().split('\n').length,1+
  r.cases.reduce((n,c)=>n+c.conceptCandidates.length*c.sourceStairs*2,0));
 assert(md.includes('102階段'));
 assert(md.includes('元の9出口はすべてHOLD'));
 assert(md.includes('NOT_PREPARED'));
});

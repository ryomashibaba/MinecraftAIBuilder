import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB124} from './b124-fleet-3d-review.mjs';
const r=JSON.parse(fs.readFileSync('b124-review-output/B124_3D_Stair_Corridor_Slab_Review.json','utf8'));
test('pinned B124 covers all 15 buildings, 66 levels and 102 stair references',()=>{
 assert(validateB124(r));
 assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.sourceFloors,66);
 assert.equal(r.totals.sourceStairs,102);
 assert.match(r.sourceB123Integrity,/^[a-f0-9]{64}$/);
 assert.match(r.sourceB117Integrity,/^[a-f0-9]{64}$/);
});
test('every B122 3D candidate is independently tested on both lower and upper corridor seams',()=>{
 assert(r.totals.concepts3DAudited>=1);
 for(const c of r.cases)for(const v of c.concepts){
  assert.equal(v.lowerAndUpper.length,2);
  assert.deepEqual(v.lowerAndUpper.map(x=>x.side),['LOWER','UPPER']);
  assert(v.lowerAndUpper.every(x=>x.corridorCells>=4&&x.corridorProxyClearanceHeightBlocks===2));
  assert(v.conceptualNewUpperOpeningCells>=0);
  assert.equal(v.findings.length,v.issueCodes.length);
  assert.equal(v.inheritedB122TwoFloorNoConflict,true);
  assert.equal(v.inheritedB123NoNewNetworkRegression,true);
 }
});
test('never promote scoped AABB absence of collisions to physical certificate',()=>{
 assert.equal(r.totals.actualPhysicalWalkabilityCertified,0);
 assert.equal(r.totals.sourceBlocksChanged,0);
 for(const c of r.cases)for(const x of c.concepts){
  assert.equal(x.physicalStairBlockStatesCertified,false);
  assert.equal(x.realFloorSupportCertified,false);
  assert.equal(x.realPlayerStepAndDoorClearanceCertified,false);
  assert.equal(x.constructionAllowed,false);
  assert.equal(x.proposedGeometryApplied,false);
 }
});
test('nine original blocked gates and empty BuildPlan remain immutable',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);
 assert(r.gates.every(x=>x.status==='BLOCKED'));
});
test('human-readable and CSV evidence accurately classify found 3D blockers',()=>{
 const csv=fs.readFileSync('b124-review-output/B124_3D_Transition_Findings.csv','utf8');
 const md=fs.readFileSync('b124-review-output/B124_3D_Transition_Review_JA.md','utf8');
 const n=r.cases.reduce((n,c)=>n+c.concepts.reduce((m,x)=>m+Math.max(1,x.findings.length),0),0);
 assert.equal(csv.trim().split('\n').length,1+n);
 assert(md.includes('元の9出口はすべてHOLD'));
 assert(md.includes('NOT_PREPARED'));
});

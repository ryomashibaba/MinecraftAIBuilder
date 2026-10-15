import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB116Review} from './b116-corridor-3d-review.mjs';
const r=JSON.parse(fs.readFileSync('b116-review-output/B116_15_Buildings_Source_3D_Corridor_Review.json','utf8'));
test('all 15 buildings 66 floors and 102 stair link groups analyzed',()=>{
 assert(validateB116Review(r));assert.equal(r.cases.length,15);
 assert.equal(r.totals.conceptFloors,66);assert.equal(r.totals.stairLinks,102);
 assert(r.cases.every(c=>c.originalRoomsAndCoresUnchanged));
});
test('no 2D or 3D proxy clearance is confused with Education certification',()=>{
 for(const c of r.cases)for(const p of c.proposals)
  assert.equal(p.physical3DWalkabilityCertified,false);
 assert.equal(r.totals.physicalWalkabilityCertified,0);
 assert(r.scopesHeld.length>=4);
});
test('construction gates are blocked and no BuildPlan operations available',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);assert.equal(r.commandCount,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));
});
test('Japanese report makes physical noncertification explicit',()=>{
 const text=fs.readFileSync('b116-review-output/B116_Source_3D_Corridor_Review_JA.md','utf8');
 assert(text.includes('実際の歩行可能性'));assert(text.includes('設計レビュー'));
 assert(text.includes('NOT_PREPARED'));assert(text.includes('102'));
});

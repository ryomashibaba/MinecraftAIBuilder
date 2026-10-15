import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB127} from './b127-fleet-calibration-review.mjs';
const r=JSON.parse(fs.readFileSync('b127-review-output/B127_Halfstep_Facing_Offline_Review.json','utf8'));
test('pins 15 buildings 66 floors 102 stairs and immutable B126 source',()=>{
 assert.equal(validateB127(r),true);
 assert.equal(r.totals.buildings,15);
 assert.equal(r.totals.originalFloors,66);
 assert.equal(r.totals.originalStairs,102);
 assert.match(r.sourceB126Integrity,/^[0-9a-f]{64}$/);
 assert.match(r.sourceB125Integrity,/^[0-9a-f]{64}$/);
});
test('enumerates all potential orientation mappings without selecting any',()=>{
 assert(r.totals.configurationsReviewed>=1);
 for(const c of r.cases)for(const x of c.reviews){
  if(x.shape!=='STRAIGHT_HALF_STEP_PROXY')continue;
  assert.equal(x.unverifiedDirectionBijections,24);
  assert.equal(x.directionHypotheses.length,24);
  assert(x.directionHypotheses.every(h=>!h.calibrated));
  assert.equal(x.actualBlockStateMapping,null);
  assert.equal(x.verifiedWorldStairStates,0);
  assert.equal(x.verifiedPhysicalStepPasses,0);
 }
});
test('independently sampled half-step source shape never counts as Minecraft proof',()=>{
 for(const c of r.cases)for(const x of c.reviews){
  if(x.shape!=='STRAIGHT_HALF_STEP_PROXY')continue;
  assert.equal(x.sourceHalfStepSamplePoints,40);
  assert.equal(x.twoSourceProxyShapeTests.length,2);
  assert(x.twoSourceProxyShapeTests.every(z=>!z.educationBlockCollisionCertified));
  assert.equal(x.educationCalibration.realStepPhysics,'UNVERIFIED');
  assert.equal(x.educationCalibration.placementAndReadback,'NOT_PERFORMED');
 }
 assert.equal(r.totals.realStepPasses,0);
 assert.equal(r.totals.certifiedRealEducationOrientationMappings,0);
});
test('strict immutable construction STOP and main source invariants',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.executionAllowed,false);
 assert.equal(r.constructionApproved,false);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);
 assert.equal(r.gates.length,9);
 assert(r.gates.every(g=>g.status==='BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert(r.cases.every(c=>c.sourceBuildingUnchanged));
});
test('CSV and Japanese review describe all scoped geometries and no authorization',()=>{
 const csv=fs.readFileSync('b127-review-output/B127_Hypothesis_Comparisons.csv','utf8');
 const md=fs.readFileSync('b127-review-output/B127_Halfstep_Orientation_Review_JA.md','utf8');
 const shapes=r.cases.reduce((n,c)=>n+c.reviews.reduce((s,x)=>s+(x.twoSourceProxyShapeTests?.length??0),0),0);
 assert.equal(csv.trim().split('\n').length,1+shapes);
 assert(md.includes('Education実機向き認証|0'));
 assert(md.includes('NOT_PREPARED'));
 assert(md.includes('BuildPlan.operations=[]'));
});

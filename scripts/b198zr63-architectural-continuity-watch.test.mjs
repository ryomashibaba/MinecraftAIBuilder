import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {compareR63ArchitecturalContinuity,writeR63ArchitecturalContinuity}
 from './b198zr63-architectural-continuity-watch.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const compare=(a,b)=>compareR63ArchitecturalContinuity({
 beforeRaw:a,beforeSha256:sha(a),afterRaw:b,afterSha256:sha(b)});
test('R63 unchanged compiled source gives exact factual continuity, not a quality PASS',()=>{
 const a=JSON.stringify(r32Courtyard());
 const r=compare(a,a);
 assert.equal(r.numericComparisonValid,true);
 assert.equal(r.status,'GEOMETRIC_DRIFT_FACTS_READY_HUMAN_CONCEPT_REVIEW_REQUIRED');
 assert.equal(r.comparisons.occupiedConceptVoxelCells.delta,0);
 assert.equal(r.localGridOverlap.beforeRetentionShare,1);
 assert.equal(r.localGridOverlap.localFrameIndependentlyVerified,false);
 assert.deepEqual(r.possibleRegressionRisks,[]);
 assert.equal(r.anyQualityPassCertified,false);
 assert.equal(r.humanReviewPerformed,false);
 assert.equal(r.independentHumanRequirements.length,4);
 assert(r.independentHumanRequirements.every(x=>x.assessment==='NOT_REVIEWED'));
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.equal(r.worldWrites,0);
});
test('R63 detects serious reduction of public spatial capacity without banning smaller forms',()=>{
 const base=r32Courtyard(),tiny=structuredClone(base);
 tiny.design.elements=[{id:'tiny-floor',shape:'box',mode:'add',material:'wood',
  origin:[0,0,0],size:[2,1,2]}];
 const r=compare(JSON.stringify(base),JSON.stringify(tiny));
 assert.equal(r.numericComparisonValid,true);
 assert(r.comparisons.occupiedConceptVoxelCells.ratioToBefore<0.7);
 assert(r.possibleRegressionRisks.some(x=>
  x.kind==='POSSIBLE_DESIGN_LOSS_occupiedConceptVoxelCells'));
 assert(r.possibleRegressionRisks.every(x=>x.automaticReject===false));
 assert.equal(r.smallerDoesNotAutomaticallyMeanWorse,true);
 assert.equal(r.largerDoesNotAutomaticallyMeanBetter,true);
 assert.equal(r.anyQualityPassCertified,false);
});
test('R63 does not fake a same-frame overlap when bounds differ',()=>{
 const base=r32Courtyard(),shift=structuredClone(base);
 shift.design.bounds.width+=1;
 const r=compare(JSON.stringify(base),JSON.stringify(shift));
 assert.equal(r.numericComparisonValid,true);
 assert.equal(r.sameDeclaredBounds,false);
 assert.equal(r.localGridOverlap,null);
 assert.equal(r.before.sourceGeometryAvailable,true);
 assert.equal(r.after.sourceGeometryAvailable,true);
});
test('R63 invalid historical-type original HOLD prevents invented voxel deltas',()=>{
 const invalid=r32Courtyard(),candidate=r32Courtyard();
 invalid.design.elements.push({id:'outside',shape:'box',mode:'add',
  material:'concrete',origin:[1,invalid.design.bounds.height,1],size:[2,1,2]});
 const r=compare(JSON.stringify(invalid),JSON.stringify(candidate));
 assert.equal(r.status,'HOLD_ONE_OR_BOTH_B143_NOT_COMPILED');
 assert.equal(r.numericComparisonValid,false);
 assert.equal(r.comparisons,null);
 assert.equal(r.localGridOverlap,null);
 assert.deepEqual(r.possibleRegressionRisks,[]);
 assert.equal(r.before.sourceGeometryAvailable,false);
 assert.equal(r.after.sourceGeometryAvailable,true);
 assert.equal(r.independentHumanRequirements[0].assessment,'NOT_REVIEWED');
});
test('R63 refuses raw SHA substitution rather than replacing original',()=>{
 const raw=JSON.stringify(r32Courtyard());
 assert.throws(()=>compareR63ArchitecturalContinuity({
  beforeRaw:raw,beforeSha256:'0'.repeat(64),afterRaw:raw,
  afterSha256:sha(raw)}),/ORIGINAL_RAW_SHA_REQUIRED/);
 assert.throws(()=>compareR63ArchitecturalContinuity({
  beforeRaw:raw,beforeSha256:sha(raw),afterRaw:raw+' ',
  afterSha256:sha(raw)}),/ORIGINAL_RAW_SHA_REQUIRED/);
});
test('R63 writes HTML + JSON in a new slot, leaves source untouched, never auto-scores',()=>{
 const old=JSON.stringify(r32Courtyard()),newRaw=JSON.stringify(r32Courtyard());
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r63-architecture-'));
 try{
  const opts={beforeRaw:old,beforeSha256:sha(old),afterRaw:newRaw,
   afterSha256:sha(newRaw),destination:dir};
  const result=writeR63ArchitecturalContinuity(opts);
  assert.equal(result.modelCalls,0);
  const json=JSON.parse(fs.readFileSync(path.join(dir,'R63_CONTINUITY_RISKS.json')));
  assert.equal(json.anyQualityPassCertified,false);
  const html=fs.readFileSync(path.join(dir,'R63_CONCEPT_PRESERVATION_REVIEW.html'),'utf8');
  assert(html.includes('縮小'));assert(html.includes('未審査'));
  assert.throws(()=>writeR63ArchitecturalContinuity(opts),
   /NEVER_OVERWRITE_CONTINUITY_REVIEW/);
  assert.equal(sha(old),json.before.originalRawSha256);
  assert.equal(sha(newRaw),json.after.originalRawSha256);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

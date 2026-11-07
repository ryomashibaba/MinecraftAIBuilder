/** R190-AR regression: walking route proof is not overhead structural support. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {compileR190AQParti} from '../source/ai/r190aq-architectural-parti.mjs';
import {auditR190ARStructuralContinuity} from '../source/ai/r190ar-structure-audit.mjs';
import {R190AQ_AUTHOR_CASES} from './r190aq-parti-fixtures.mjs';
import {R190AR_AUTHOR_SUPPORTED_TWIN} from './r190ar-supported-fixtures.mjs';
import {writeR190ARReview} from './r190ar-structural-review.mjs';
const studies=[...R190AQ_AUTHOR_CASES,R190AR_AUTHOR_SUPPORTED_TWIN].map(compileR190AQParti);
test('AR identifies large floating structure despite original walking routes passing',()=>{
 const [original,diagonal]=studies;
 assert(original.audit.allAnchorsReachable);
 assert(diagonal.audit.allAnchorsReachable);
 const twin=auditR190ARStructuralContinuity(original),other=auditR190ARStructuralContinuity(diagonal);
 assert.equal(twin.status,'HOLD_DETACHED_ELEVATED_GEOMETRY');
 assert.equal(twin.detachedVoxelCount,10345);
 assert.equal(twin.detachedComponentCount,4);
 assert.equal(twin.groundedComponentCount,0);
 assert.equal(other.status,'HOLD_DETACHED_ELEVATED_GEOMETRY');
 assert.equal(other.detachedVoxelCount,1);
 assert.equal(other.detachedComponentCount,1);
 assert.equal(twin.occupancyContactNotLoadBearing,'NOT_ENGINEERING_CERTIFICATION');
 for(const r of [twin,other]){
  assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
  assert.equal(r.readiness,'NOT_PREPARED');
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 }
});
test('AR human-chosen diagonal supports connect all elevated components without destroying sky',()=>{
 const base=studies[0],fixed=studies[2];
 const original=auditR190ARStructuralContinuity(base);
 const revised=auditR190ARStructuralContinuity(fixed);
 assert.equal(revised.status,'SOURCE_CONTACT_PASS_NOT_ENGINEERING');
 assert.equal(revised.detachedComponentCount,0);
 assert.equal(revised.detachedVoxelCount,0);
 assert.equal(revised.elevatedComponentCount,1);
 assert(revised.groundedComponentCount===1);
 assert.deepEqual(base.inputParti.programAnchors,fixed.inputParti.programAnchors);
 assert.deepEqual(base.inputParti.voids,fixed.inputParti.voids);
 assert.equal(base.audit.openSkyColumns,fixed.audit.openSkyColumns);
 assert.equal(base.audit.allAnchorsReachable,true);
 assert.equal(fixed.audit.allAnchorsReachable,true);
 assert.equal(revised.sourceHash,fixed.compiled.sourceSha256);
 assert.notEqual(base.compiled.geometrySha256,fixed.compiled.geometrySha256);
 assert.equal(revised.skyVoidFacesAreArchitecturallyWellFormed,'NOT_CERTIFIED');
 assert(original.detachedVoxelCount>0);
});
test('AR reject tampered source, changed safeguards, no implicit repair',()=>{
 const raw=structuredClone(studies[2]);
 raw.compiled.primitives[0][0]+=1;
 assert.throws(()=>auditR190ARStructuralContinuity(raw),/R190AR_UNVERIFIED_B143_SOURCE/);
 const bad=structuredClone(studies[2]);bad.worldWrites=1;
 assert.throws(()=>auditR190ARStructuralContinuity(bad),/R190AR_SOURCE_SAFETY_BOUNDARY/);
 const source=structuredClone(R190AR_AUTHOR_SUPPORTED_TWIN);
 source.masses=source.masses.slice(0,-6); // all six authored ribs removed
 const incomplete=compileR190AQParti(source);
 const a=auditR190ARStructuralContinuity(incomplete);
 assert(a.detachedVoxelCount>0);
 assert.equal(a.status,'HOLD_DETACHED_ELEVATED_GEOMETRY');
 assert.equal(incomplete.worldWrites,0);
});
test('AR three true B143 evidence scenes and five independent views',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r190ar-')),out=path.join(tmp,'fresh');
 try{
  assert.deepEqual(writeR190ARReview(out),{
   cases:3,sourceGeometryVerified:true,worldWrites:0,modelCalls:0,art:'ART_HOLD'});
  const r=JSON.parse(fs.readFileSync(path.join(out,'SUMMARY.json'),'utf8'));
  assert.equal(r.cases.length,3);
  assert.equal(r.cases[0].audit.detachedVoxelCount,10345);
  assert.equal(r.cases[2].audit.detachedVoxelCount,0);
  assert.equal(r.comparisons.originalSkyColumnCountUnchanged,true);
  assert(r.comparisons.originalToRevisedChangedViews.length>=2);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.equal(r.officialArtAdoptions,0);
  for(const item of r.cases){
   assert(fs.readFileSync(path.join(out,item.id+'-TRUE-B143.html'),'utf8')
    .includes('R190-AR SOURCE-ONLY'));
   for(const face of ['front','rear','east','west','roof'])
    assert(fs.readFileSync(path.join(out,item.id+'-'+face+'.svg'),'utf8').includes('<svg'));
  }
  assert.throws(()=>writeR190ARReview(out),/R190AR_NEW_ABSOLUTE_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

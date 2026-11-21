/** True B143 tests for an independently authored volumetric architectural parti.
 * Synthetic examples: never conflate with authorized real LLM responses.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {R190AQ_AUTHOR_CASES} from './r190aq-parti-fixtures.mjs';
import {R190AQ_RESEARCH_GUIDE,validateR190AQParti,
 compileR190AQParti} from '../source/ai/r190aq-architectural-parti.mjs';
import {writeR190AQPartiGallery} from './r190aq-parti-gallery.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const clone=x=>structuredClone(x);
const assertSafety=r=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
 assert.equal(r.modelCallsByCompiler,0);
 assert.equal(r.art,'ART_HOLD');
};
test('AQ two distinct authored large-form alternatives compile true B143',()=>{
 assert.match(R190AQ_RESEARCH_GUIDE,/NOT Minecraft|Minecraft/);
 const results=R190AQ_AUTHOR_CASES.map(c=>compileR190AQParti(c));
 assert.equal(new Set(results.map(r=>r.compiled.geometrySha256)).size,2);
 for(const [i,r] of results.entries()){
  assertSafety(r);
  assert(verifyCompiled(r.design,r.compiled));
  assert.equal(r.inputSha256,compileR190AQParti(JSON.stringify(R190AQ_AUTHOR_CASES[i])).inputSha256);
  assert(r.audit.openSkyColumns>=100);
  assert(r.audit.doubleSupportedWalkingPads>=100);
  assert.equal(r.audit.connectedAnchors.length,3);
  assert.equal(r.audit.allAnchorsReachable,true);
  assert.equal(r.audit.actualAuthorWasModel,'NOT_ESTABLISHED');
  assert.equal(r.audit.visualQuality,'NOT_CERTIFIED');
  assert.equal(r.audit.purposeExpressedInGeometry,'NOT_CERTIFIED');
  assert.equal(r.audit.physicalVoidProof.length,2);
  for(const v of r.audit.physicalVoidProof)
   assert(v.removedPhysicalB143Cells>=4);
  assert(r.design.elements.every(e=>e.mode==='add'||e.mode==='cut'));
 }
});
test('AQ rejects unknown properties, unsupported source shape and bad void dimensions',()=>{
 for(const change of [
  p=>{p.unknown=true},
  p=>{p.concept.generatedChoice=true},
  p=>{p.masses[0].repeat={count:2,offset:[2,0,0]}},
  p=>{p.masses[1].shape='secret-typology'},
  p=>{p.voids[0].role='fake-open-sky'},
  p=>{p.voids[0].geometry.origin[1]=3},
  p=>{p.voids[0].geometry.size[1]=29},
  p=>{p.voids[0].geometry.material='glass'},
  p=>{p.programAnchors[0].id=p.programAnchors[1].id},
  p=>{p.site.height=88}
 ]){
  const p=clone(R190AQ_AUTHOR_CASES[0]);change(p);
  assert.throws(()=>validateR190AQParti(p),/R190AQ_|B143_/);
 }
});
test('AQ rejects unsupported route anchors, sky floor and ineffective authored void',()=>{
 const foot=clone(R190AQ_AUTHOR_CASES[0]);
 foot.programAnchors[2].x=70;
 assert.throws(()=>compileR190AQParti(foot),/R190AQ_ANCHOR_NOT_SUPPORTED_WALKABLE/);
 const sky=clone(R190AQ_AUTHOR_CASES[0]);
 sky.voids[0].geometry.origin=[59,2,50];
 sky.voids[0].geometry.size=[8,30,8];
 assert.throws(()=>compileR190AQParti(sky),/R190AQ_SKY_FLOOR_UNSUPPORTED|R190AQ_VOID_NOT_EFFECTIVE/);
 const ineffective=clone(R190AQ_AUTHOR_CASES[0]);
 ineffective.voids[1].geometry.origin=[0,2,0];
 ineffective.voids[1].geometry.size=[6,8,6];
 assert.throws(()=>compileR190AQParti(ineffective),/R190AQ_VOID_NOT_EFFECTIVE/);
});
test('AQ authored conceptual intent remains unmodified, source tampering detected',()=>{
 const p=clone(R190AQ_AUTHOR_CASES[1]),before=JSON.stringify(p);
 const r=compileR190AQParti(p);
 assert.equal(JSON.stringify(p),before);
 assert.equal(r.inputParti.concept.thesis,p.concept.thesis);
 assert(verifyCompiled(r.design,r.compiled));
 const altered=clone(r.compiled);
 altered.primitives[0][0]+=1;
 assert.equal(verifyCompiled(r.design,altered),false);
});
test('AQ gallery saves 2 distinct TRUE B143 3D and 5 consistent views without overwrite',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190aq-')),dest=path.join(root,'fresh');
 try{
  assert.deepEqual(writeR190AQPartiGallery(dest),
   {scenes:2,modelCalls:0,worldWrites:0,art:'ART_HOLD'});
  const q=JSON.parse(fs.readFileSync(path.join(dest,'SUMMARY.json'),'utf8'));
  assert.equal(q.results.length,2);
  assert.equal(q.modelCalls,0);assert.equal(q.worldWrites,0);
  assert.deepEqual(q.gates,Array(9).fill('BLOCKED'));
  assert.equal(q.officialArtAdoptions,0);
  assert(q.comparison.changedViews.length>=3);
  for(const item of q.results){
   assert(fs.readFileSync(path.join(dest,item.name+'-TRUE-B143.html'),'utf8')
    .includes('R190-AQ SYNTHETIC ARCHITECT PARTI'));
   for(const dir of ['front','rear','east','west','roof'])
    assert(fs.readFileSync(path.join(dest,item.name+'-'+dir+'.svg'),'utf8').includes('<svg'));
  }
  assert.throws(()=>writeR190AQPartiGallery(dest),/NEW_ABSOLUTE_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

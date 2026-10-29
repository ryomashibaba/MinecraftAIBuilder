/** R190-AS: source evidence for integrated structural and aesthetic conception. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {R190AS_CO_DESIGNED_CASES} from './r190as-integrated-fixtures.mjs';
import {validateR190ASCoDesign,reviewR190ASCoDesign} from '../source/ai/r190as-integrated-architecture.mjs';
import {compileR190AQParti} from '../source/ai/r190aq-architectural-parti.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {writeR190ASIntegratedGallery} from './r190as-integrated-gallery.mjs';

const clone=x=>structuredClone(x);
test('AS two independently authored mass-support-void systems have real source B143 contact',()=>{
 const studies=R190AS_CO_DESIGNED_CASES.map(reviewR190ASCoDesign);
 assert.equal(new Set(studies.map(s=>s.compiled.geometrySha256)).size,2);
 for(const s of studies){
  assert(verifyCompiled(s.actualB143Design,s.compiled));
  assert.equal(s.contactAudit.status,'SOURCE_CONTACT_PASS_NOT_ENGINEERING');
  assert.equal(s.contactAudit.detachedVoxelCount,0);
  assert(s.contactAudit.elevatedComponents.every(c=>c.groundTouchCells>=32));
  assert(Object.values(s.contactAudit.skyVoidAdjacentPhysicalFaceCells)
   .filter(n=>n>=25).length>=3);
  assert(s.supportedEnvelopePairs.length>=4);
  for(const e of s.supportedEnvelopePairs){
   assert(e.foundationContacts>=12);
   assert(e.envelopeOverlap>=50);
   assert(e.effectiveSupportCells>=60);
   assert.equal(e.materialStrength,'NOT_CERTIFIED');
  }
  assert.equal(s.massVoidAndCirculation,'PHYSICAL_SOURCE_CONFIRMED');
  assert.equal(s.sourceAudit.allAnchorsReachable,true);
  assert(s.sourceAudit.openSkyColumns>=100);
  assert.equal(s.actualSupportsAuthored,true);
  assert.equal(s.hostInventedSupports,false);
  assert.equal(s.actualAIOriginality,'NOT_TESTED');
  assert.equal(s.supportEngineering,'NOT_CERTIFIED');
  assert.equal(s.modelCallsByReview,0);
  assert.equal(s.readiness,'NOT_PREPARED');
  assert.equal(s.constructionApproved,false);assert.equal(s.executionAllowed,false);
  assert.deepEqual(s.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(s.BuildPlan.operations,[]);
  assert.equal(s.worldContacts,0);assert.equal(s.worldWrites,0);
  assert.equal(s.art,'ART_HOLD');
 }
});
test('AS author original IR and B143 data are not repaired or silently modified',()=>{
 const p=clone(R190AS_CO_DESIGNED_CASES[0]),original=JSON.stringify(p);
 const r=reviewR190ASCoDesign(p);
 assert.equal(JSON.stringify(p),original);
 assert.deepEqual(r.coDesign,p);
 assert.deepEqual(r.compiled.geometrySha256,compileR190AQParti(p.parti).compiled.geometrySha256);
});
test('AS fails when metadata omits required authored supports or links wrong envelope',()=>{
 const q=clone(R190AS_CO_DESIGNED_CASES[0]);
 q.structureIntent.supportPairs=q.structureIntent.supportPairs.slice(0,3);
 assert.throws(()=>validateR190ASCoDesign(q),/R190AS_SUPPORT_PAIRS/);
 const wrong=clone(R190AS_CO_DESIGNED_CASES[0]);
 wrong.structureIntent.supportPairs[0].envelopeId='east-cantilever-shell';
 assert.throws(()=>reviewR190ASCoDesign(wrong),/R190AS_SUPPORT_DOES_NOT_INTEGRATE_WITH_ENVELOPE/);
 const dup=clone(R190AS_CO_DESIGNED_CASES[0]);
 dup.structureIntent.supportPairs[0].supportId=dup.structureIntent.supportPairs[1].supportId;
 assert.throws(()=>validateR190ASCoDesign(dup),/R190AS_SUPPORT_PAIR_ID/);
 const direction=clone(R190AS_CO_DESIGNED_CASES[0]);
 direction.structureIntent.destinationAnchorId='daylight-court';
 assert.throws(()=>validateR190ASCoDesign(direction),/R190AS_ANCHOR_REFERENCE/);
});
test('AS intentional source degradation fails closed even when walking path survives',()=>{
 const p=clone(R190AS_CO_DESIGNED_CASES[0]);
 const support=p.parti.masses.find(x=>x.id==='west-north-principal-fold');
 support.thickness=1;
 assert.throws(()=>reviewR190ASCoDesign(p),/R190AS_SUPPORT_HAS_TOO_FEW_FOUNDATION_CELLS|R190AS_DETACHED_MACRO_MASS/);
 const lost=clone(R190AS_CO_DESIGNED_CASES[0]);
 lost.parti.masses=lost.parti.masses.filter(x=>!x.id.includes('principal-fold'));
 assert.throws(()=>reviewR190ASCoDesign(lost),/R190AS_SUPPORT_PAIR_SHAPE/);
 const bad=clone(R190AS_CO_DESIGNED_CASES[0]);
 bad.parti.voids[0].geometry.size[1]=29;
 assert.throws(()=>reviewR190ASCoDesign(bad),/R190AQ_SKY_VOID_VERTICAL_DOMAIN/);
});
test('AS 3 true 3D B143 sources, 5 same-perspective SVG each, receipt, no overwrite',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r190as-')),out=path.join(temp,'fresh');
 try{
  assert.deepEqual(writeR190ASIntegratedGallery(out),
   {scenes:3,coDesignedCases:2,modelCalls:0,worldWrites:0,art:'ART_HOLD'});
  const d=JSON.parse(fs.readFileSync(path.join(out,'SUMMARY.json'),'utf8'));
  assert.equal(d.runs.length,3);
  assert.equal(d.runs[0].kind,'AR_RETROFIT_NOT_CONTROLLED');
  assert.equal(d.runs[1].kind,'AS_AUTHOR_INTEGRATED_PARTI');
  assert.equal(d.comparisons.ARvsAScontrolledAB,false);
  assert(d.comparisons.betweenTwoCoDesigned.length>=3);
  assert.deepEqual(d.gates,Array(9).fill('BLOCKED'));
  assert.equal(d.officialArtAdoptions,0);
  for(const r of d.runs){
   assert.equal(r.detachedVoxelCount,0);
   assert(fs.readFileSync(path.join(out,r.name+'-TRUE-B143.html'),'utf8')
    .includes('R190-AS SOURCE'));
   for(const view of ['front','rear','east','west','roof'])
    assert(fs.readFileSync(path.join(out,r.name+'-'+view+'.svg'),'utf8').includes('<svg'));
  }
  assert.throws(()=>writeR190ASIntegratedGallery(out),/R190AS_NEW_ABSOLUTE_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

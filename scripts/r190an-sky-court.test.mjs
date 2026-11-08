/** Genuine B143 courtyard audit. Inputs are synthetic only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {r190ANSyntheticPlan,writeR190ANGallery} from './r190an-sky-court-gallery.mjs';
import {asAF} from './r190ag-synthetic-fixtures.mjs';
import {validateR190SemanticPlan,compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {inspectR190AFIntent} from '../source/ai/r190af-program-intent.mjs';
import {r190AGSemanticProjection,studyR190AG} from '../source/ai/r190ag-integrated-proposals.mjs';
import {reviewR190AJOriginal,R190AJ_SYSTEM_GUIDE} from '../source/ai/r190aj-model-intent-adapter.mjs';
const safe=r=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);assert.equal(r.executionAllowed,false);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
 assert.equal(r.art,'ART_HOLD');
};
test('AN native roof void differs from old no-void geometry, no source roof-cut',()=>{
 const a=compileR190SemanticPlan(r190ANSyntheticPlan('00-baseline'));
 const b=compileR190SemanticPlan(r190ANSyntheticPlan('01-center-court'));
 const c=compileR190SemanticPlan(r190ANSyntheticPlan('02-offcenter-court'));
 const d=compileR190SemanticPlan(r190ANSyntheticPlan('03-court-asymmetric-wing'));
 assert.equal(new Set([a,b,c,d].map(x=>x.compiled.geometrySha256)).size,4);
 assert.equal(a.audit.skyCourt,null);
 for(const x of [b,c,d]){
  safe(x);
  assert.equal(x.audit.skyCourt.actualOpenSkyColumns,63);
  assert.equal(x.audit.skyCourt.sourceOpenSkyVerified,true);
  assert.equal(x.audit.skyCourt.supportedWalkableFloor,true);
  assert.equal(x.audit.allProgramSpacesReachable,true);
  assert.equal(x.audit.witnesses.length,3);
  assert.equal(x.design.elements.filter(v=>v.id.startsWith('showroom-court-roof-')).length,4);
  assert.equal(x.design.elements.some(v=>v.id==='showroom-roof'),false);
  assert.equal(x.design.elements.some(v=>v.id.includes('court')&&v.mode==='cut'),false);
 }
 assert.deepEqual(b.layout.spaces,c.layout.spaces);
 assert.deepEqual(c.inputPlan.spaces.map(x=>({id:x.id,width:x.width,depth:x.depth})),
  b.inputPlan.spaces.map(x=>({id:x.id,width:x.width,depth:x.depth})));
 assert.equal(a.audit.sourceWalkingPads,b.audit.sourceWalkingPads);
});
test('AN malformed court and conflicting local features fail closed',()=>{
 for(const mutation of [
  v=>{v.width=3},v=>{v.depth=15},v=>{v.offsetX=1},
  v=>{v.offsetX=8},v=>{v.offsetZ=0},
  v=>{v.extra=true},v=>{v.spaceId='missing'},
  v=>{v.width=7.5}
 ]){
  const p=r190ANSyntheticPlan('01-center-court');mutation(p.skyCourtIntent);
  assert.throws(()=>validateR190SemanticPlan(p),/SKY_COURT/);
 }
 const p=r190ANSyntheticPlan('01-center-court');
 p.roofFormIntent={spaceId:'showroom',profile:'ridge',axis:'x',rise:2};
 assert.throws(()=>validateR190SemanticPlan(p),/SKY_COURT_CONFLICT/);
 delete p.roofFormIntent;
 p.formIntent={spaceId:'showroom',face:'south',cornerInset:2};
 assert.throws(()=>validateR190SemanticPlan(p),/SKY_COURT_CONFLICT/);
});
test('AN AF AG AJ preserve exact model-authored sky court without inference',()=>{
 const p=asAF(r190ANSyntheticPlan('02-offcenter-court'));
 // The generic prior AF synthetic adapter does not include this new optional
 // field. Insert it as an author-selected intent, not a host invented feature.
 p.skyCourtIntent={spaceId:'showroom',offsetX:2,offsetZ:4,width:9,depth:7};
 const raw=JSON.stringify(p);
 assert.match(R190AJ_SYSTEM_GUIDE,/skyCourtIntent/);
 const af=inspectR190AFIntent(raw);
 assert.equal(af.status,'PROVISIONAL_SOURCE_ONLY_NO_ART_APPROVAL',af.error);
 const model=r190AGSemanticProjection(p);
 assert.deepEqual(model.skyCourtIntent,p.skyCourtIntent);
 const direct=compileR190SemanticPlan(model);
 assert.equal(af.sourcePreview.geometrySha256,direct.compiled.geometrySha256);
 const ag=studyR190AG(raw);
 assert(ag.baseline);
 assert.equal(ag.baseline.compiled.geometrySha256,direct.compiled.geometrySha256);
 const aj=reviewR190AJOriginal(raw);
 assert.equal(aj.receipt.status,'PROVISIONAL_B143_NO_ART_APPROVAL');
 assert.equal(aj.ag.baseline.compiled.geometrySha256,direct.compiled.geometrySha256);
 safe(aj.receipt);
});
test('AN four scenes and five source projections with overwrite safety',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190an-')),out=path.join(root,'new');
 try{
  assert.deepEqual(writeR190ANGallery(out),
   {count:4,uniqueGeometry:4,worldWrites:0,modelCalls:0,art:'ART_HOLD'});
  const s=JSON.parse(fs.readFileSync(path.join(out,'SUMMARY.json'),'utf8'));
  assert.equal(s.scenes.length,4);
  assert.deepEqual(s.gates,Array(9).fill('BLOCKED'));
  assert.equal(s.officialArtAdoptions,0);
  for(const x of s.scenes){
   assert(fs.readFileSync(path.join(out,x.name+'-REAL-B143.html'),'utf8').includes('R190-AN SYNTHETIC'));
   for(const view of ['front','rear','west','east','roof'])
    assert(fs.readFileSync(path.join(out,x.name+'-'+view+'.svg'),'utf8').includes('<svg'));
  }
  assert.throws(()=>writeR190ANGallery(out),/NEW_ABSOLUTE_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

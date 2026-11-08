/** R190-AO: true B143 source U-shaped courtyard, synthetic only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {r190AOSyntheticPlan,writeR190AOGallery} from './r190ao-exterior-court-gallery.mjs';
import {asAF} from './r190ag-synthetic-fixtures.mjs';
import {validateR190SemanticPlan,compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {inspectR190AFIntent} from '../source/ai/r190af-program-intent.mjs';
import {studyR190AG,r190AGSemanticProjection} from '../source/ai/r190ag-integrated-proposals.mjs';
import {reviewR190AJOriginal} from '../source/ai/r190aj-model-intent-adapter.mjs';
test('AO open U-court is an actual roof and exterior wall gap',()=>{
 const results=['00-contained','01-open-east','02-open-east-asym'].map(name=>
  compileR190SemanticPlan(r190AOSyntheticPlan(name)));
 assert.equal(new Set(results.map(r=>r.compiled.geometrySha256)).size,3);
 assert.equal(results[0].audit.skyCourt.openFace,null);
 for(const r of results.slice(1)){
  assert.equal(r.audit.skyCourt.openFace,'east');
  assert.equal(r.audit.skyCourt.actualOpenSkyColumns,63);
  assert.equal(r.audit.allProgramSpacesReachable,true);
  assert.equal(r.audit.witnesses.length,3);
  assert(!r.design.elements.some(e=>e.id==='showroom-east'||e.id==='showroom-court-roof-east'));
  assert(r.design.elements.some(e=>e.id==='showroom-east-near'));
  assert(r.design.elements.some(e=>e.id==='showroom-east-far'));
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
  assert.equal(r.art,'ART_HOLD');
 }
});
test('AO invalid geometry and existing doors or glazing fail closed',()=>{
 for(const change of [
  v=>{v.openFace='up'},v=>{v.openFace='west'},
  v=>{v.offsetX=7},v=>{v.offsetZ=1},v=>{v.offsetZ=5},
  v=>{v.bad=true}
 ]){
  const p=r190AOSyntheticPlan('01-open-east');change(p.skyCourtIntent);
  assert.throws(()=>validateR190SemanticPlan(p),/SKY_COURT/);
 }
 const front=r190AOSyntheticPlan('01-open-east');
 front.skyCourtIntent={spaceId:'showroom',offsetX:4,offsetZ:0,width:9,depth:7,openFace:'south'};
 assert.throws(()=>validateR190SemanticPlan(front),/SKY_COURT_MOUTH_PORTAL_CONFLICT/);
 const child=r190AOSyntheticPlan('01-open-east');
 child.spaces[1].side='east';
 assert.throws(()=>validateR190SemanticPlan(child),/SKY_COURT_MOUTH_PORTAL_CONFLICT/);
 const window=r190AOSyntheticPlan('01-open-east');
 window.glazedOpenings=[{spaceId:'showroom',face:'east',offset:3,baseY:5,width:2,height:2}];
 assert.throws(()=>validateR190SemanticPlan(window),/SKY_COURT_MOUTH_GLAZING_CONFLICT/);
});
test('AO AF AG AJ preserve the caller-authored courtyard mouth',()=>{
 const p=asAF(r190AOSyntheticPlan('01-open-east'));
 p.skyCourtIntent={spaceId:'showroom',offsetX:8,offsetZ:3,width:9,depth:7,openFace:'east'};
 const raw=JSON.stringify(p);
 const af=inspectR190AFIntent(raw);
 assert.equal(af.status,'PROVISIONAL_SOURCE_ONLY_NO_ART_APPROVAL',af.error);
 const model=r190AGSemanticProjection(p);
 assert.deepEqual(model.skyCourtIntent,p.skyCourtIntent);
 const built=compileR190SemanticPlan(model),ag=studyR190AG(raw),aj=reviewR190AJOriginal(raw);
 assert.equal(af.sourcePreview.geometrySha256,built.compiled.geometrySha256);
 assert.equal(ag.baseline.compiled.geometrySha256,built.compiled.geometrySha256);
 assert.equal(aj.receipt.status,'PROVISIONAL_B143_NO_ART_APPROVAL');
 assert.equal(aj.ag.baseline.compiled.geometrySha256,built.compiled.geometrySha256);
 assert.equal(aj.receipt.modelCallsByReview,0);
 assert.equal(aj.receipt.worldWrites,0);
});
test('AO three synthetic B143 scenes, five true elevation views, no overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r190ao-')),out=path.join(dir,'new');
 try{
  assert.deepEqual(writeR190AOGallery(out),
   {count:3,uniqueGeometry:3,worldWrites:0,modelCalls:0,art:'ART_HOLD'});
  const r=JSON.parse(fs.readFileSync(path.join(out,'SUMMARY.json'),'utf8'));
  assert.equal(r.scenes.length,3);
  assert.equal(r.schema,'minecraftaibuilder-r190ao-exterior-u-court-v1');
  assert.deepEqual(r.viewContrast.containedToOpenEastChanged,['east','roof']);
  assert.equal(r.viewContrast.notArtCertification,true);
  assert(r.viewContrast.openEastToShiftedWingChanged.length>=2);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  for(const x of r.scenes){
   assert(fs.readFileSync(path.join(out,x.name+'-REAL-B143.html'),'utf8').includes('R190-AO SYNTHETIC'));
   for(const v of ['front','rear','west','east','roof'])
    assert(fs.readFileSync(path.join(out,x.name+'-'+v+'.svg'),'utf8').includes('<svg'));
  }
  assert.throws(()=>writeR190AOGallery(out),/NEW_ABSOLUTE_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

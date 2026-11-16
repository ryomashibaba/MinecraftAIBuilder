import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {studyR125RoofInterior,saveR125RoofInterior,inspectRoofAir}
 from './r125-roof-interior-study.mjs';
import {compileArchitecturePlan,packR125RaisedRoofStrips}
 from '../source/ai/r125-architecture-plan.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';

test('same generic raised-roof compiler opens real interior air in three different programs',t=>{
 const s=studyR125RoofInterior();
 assert.deepEqual(s.report.cases.map(c=>c.slug),[
  'roof-house-synthetic','roof-store-synthetic','roof-lab-synthetic']);
 assert.equal(s.report.originalSavedModelUnchanged,true);
 assert.equal(s.report.modelCalls,0);
 assert.equal(s.report.worldWrites,0);
 assert.equal(s.report.constructionApproved,false);
 assert.deepEqual(s.report.gates,Array(9).fill('BLOCKED'));
 for(const c of s.report.cases){
  assert.equal(c.modelAuthorship,'SYNTHETIC_PROGRAM_NOT_NEW_MODEL_OUTPUT');
  assert.notEqual(c.originalPlanSha256,c.raisedPlanSha256);
  assert.notEqual(c.decorativeGeometrySha256,c.raisedGeometrySha256);
  assert.deepEqual(c.sourceFloorIssuesBefore,[]);
  assert.deepEqual(c.sourceFloorIssuesAfter,[]);
  assert.equal(c.roof.from,'VERIFIED_FINAL_B143_VOXELS');
  assert.equal(c.roof.roofProfile,'sawtooth');
  assert.equal(c.roof.flatRoofBaseRetained,false);
  assert(c.roof.skinStripCount>=18);
  assert(c.roof.newCeilingAirCells>0);
  assert(c.roof.highAirColumns>0);
  assert(c.roof.twoWideHighRoofPads>0);
  assert(c.roof.verticallyConnectedTwoWideRoofPads>0);
  assert(c.roof.verticallyConnectedTwoWideRoofPads<=
   c.roof.twoWideHighRoofPads);
  assert.equal(c.roof.unclosedEaveOrEndCells,0);
  assert.equal(c.roof.unclosedStepCells,0);
  assert.equal(c.art,'NOT_REVIEWED');
  assert.equal(c.minecraftWalking,'NOT_TESTED');
 }
 assert.equal(s.views.length,3);
 assert(s.views.every(v=>v.originalHtml.includes('minecraftaibuilder-b143-gallery-v1')&&
  v.raisedHtml.includes('minecraftaibuilder-b143-gallery-v1')));
 assert(s.indexHtml.includes('実歩行/美術/施工認定なし'));
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r125-roof-safety-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const out=path.join(temp,'study');
 const report=saveR125RoofInterior(out);
 assert.equal(report.cases.length,3);
 assert(fs.existsSync(path.join(out,'index.html')));
 assert(fs.existsSync(path.join(out,'roof-store-synthetic/raised/index.html')));
 assert(fs.existsSync(path.join(out,'ROOF_INTERIOR_SOURCE_REPORT.json')));
 assert.throws(()=>saveR125RoofInterior(out),/OUTPUT_ALREADY_EXISTS/);
});

test('compressed B143 sawtooth strips keep exactly the same enclosed roof-air evidence',()=>{
 const p={schema:'minecraftaibuilder-r125-architecture-plan-v1',
  id:'compressed-geometry',title:'Generic compact building',
  brief:'No typology-specific rules; functional rooms and roof air',
  footprint:{width:24,depth:24},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'room-one',purpose:'Work and observation'},
   {id:'room-two',purpose:'Visitor interpretation'}]}],
  materials:{floor:'wood',wall:'stone',roof:'concrete'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'sawtooth',roofAxis:'x',facadeLanguage:'plain',roofVolume:'raised'}};
 const before=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const elements=packR125RaisedRoofStrips(before.design.elements,'x');
 assert(elements.length<before.design.elements.length);
 assert(elements.some(e=>e.id.startsWith('roof-raised-skin-')&&e.repeat?.count>1));
 const packed={...before.design,elements};
 const scene=compileDesign(packed);
 assert.equal(verifyCompiled(packed,scene),true);
 assert.deepEqual(scene.primitives,before.compiled.primitives);
 const baseline=inspectRoofAir(before,before);
 const candidate=inspectRoofAir(before,{design:packed,compiled:scene,plan:p});
 for(const metric of ['skinStripCount','twoWideHighRoofPads',
  'verticallyConnectedTwoWideRoofPads','unclosedEaveOrEndCells',
  'unclosedStepCells']){
  assert.equal(candidate[metric],baseline[metric],metric);
 }
 assert.equal(candidate.skinStripCount,p.footprint.width-2);
 assert(candidate.verticallyConnectedTwoWideRoofPads>0);
 assert.equal(candidate.actualMinecraftWalking,'NOT_TESTED');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {makeR186SyntheticReply,buildR186UpperGalleryReview,
 saveR186UpperGalleryReview}
 from './r186-vertical-slice-comparison.mjs';
import {compileR186VerticalSlice,auditR186SourceSlice}
 from '../source/ai/r186-vertical-public-slice.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const make=()=>makeR186SyntheticReply();
const parse=x=>compileR186VerticalSlice(JSON.stringify(x));

test('R186 true 16-step B143 ascension connects real ground public route to one enclosed furnished upper gallery',()=>{
 const comparison=buildR186UpperGalleryReview();
 const result=comparison.result,v=result.verticalSourceAudit;
 assert.ok(verifyCompiled(result.design,result.compiled));
 assert.notEqual(result.compiled.geometrySha256,
  comparison.baseline.compiled.geometrySha256);
 assert.equal(v.connectedTwoWideStairSteps,16);
 assert.equal(v.ascendingSupportedPads.length,16);
 assert.equal(v.ascendingSupportedPads[0][1],2);
 assert.equal(v.ascendingSupportedPads.at(-1)[1],17);
 assert.equal(v.sourceRouteStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(v.zoneWitnesses.length,2);
 assert.ok(v.zoneWitnesses.every(z=>z.reachedFromEntrance));
 assert.equal(v.zoneWitnesses[1].level,1);
 assert.equal(v.zoneWitnesses[1].standingFloorY,17);
 assert.equal(v.actualFurnishedServicePads,1);
 assert.equal(v.featureWitness.reachableFromEntrance,true);
 assert.equal(v.featureWitness.sourceServiceSide,'left');
 assert.equal(v.roomEnvelopeRoofAndWallSourceChecked,true);
 assert.equal(v.gamePhysics,'NOT_TESTED');
 assert.equal(v.fullProgramRooms,'NOT_MODELED');
 assert.equal(result.modelCalls,0);
 assert.equal(result.artDecision,'ART_HOLD_UNTIL_REAL_3D_CRITIQUE');
 assert.equal(result.readiness,'NOT_PREPARED');
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(result.BuildPlan.operations,[]);
 assert.equal(result.constructionApproved,false);
 assert.equal(result.executionAllowed,false);
 assert.equal(result.worldWrites,0);
 assert.equal(result.worldContacts,0);
});

test('R186 original model bytes survive audit, unauthorized geometry/approval/roles are fail closed',()=>{
 const r=make(),out=parse(r);
 assert.equal(out.originalRawSha256,
  createHash('sha256').update(JSON.stringify(r)).digest('hex'));
 assert.equal(out.modelProvenance,'STATIC_SYNTHETIC_NOT_QWEN_GEMMA');
 const edits=[
  x=>{x.schema='minecraft.world.commands';},
  x=>{x.base.base.composition.grammar='folded-ground';},
  x=>{x.base.experience.targetUseId='study';},
  x=>{x.slice.sourceHall='east-tower';},
  x=>{x.slice.ascent='teleport';},
  x=>{x.slice.upperUseId='backstage';},
  x=>{x.slice.upperFloorY=30;},
  x=>{x.slice.serviceRole='none';},
  x=>{x.slice.executionAllowed=true;},
  x=>{x.worldCoordinates=[1,2,3];}
 ];
 for(const edit of edits){
  const q=structuredClone(r);edit(q);
  assert.throws(()=>parse(q),/R186_VERTICAL_SLICE_/);
 }
});

test('R186 stair, roof and upper-room access are verified from real recompiled cells, not symbolic approval',()=>{
 const source=parse(make());
 const remove=(id)=>{
  const design=structuredClone(source.design);
  design.elements=design.elements.filter(e=>e.id!==id);
  const compiled=compileDesign(design);
  assert.ok(verifyCompiled(design,compiled));
  assert.throws(()=>auditR186SourceSlice(design,compiled),
   /R186_VERTICAL_SLICE_/);
 };
 remove('r186-supported-stair');
 remove('r186-upper-continuous-landing');
 remove('r186-room-rear-wall');
 remove('r186-display-low-plinth');
});

test('R186 source review emits two rotatable B143 geometries, 10 real projections and independently readable stairs evidence',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r186-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const folder=path.join(temp,'compare');
 const report=saveR186UpperGalleryReview(folder);
 assert.equal(report.comparison.verticalSourceAudit.connectedTwoWideStairSteps,16);
 for(const id of ['r185','r186']){
  assert.ok(fs.readFileSync(path.join(folder,id+'.html'),'utf8').length>500);
  for(const view of ['front','rear','west','east','roof'])
   assert.ok(fs.readFileSync(path.join(folder,id+'-'+view+'.svg'),'utf8')
    .startsWith('<svg'));
 }
 const svg=fs.readFileSync(path.join(folder,'r186-stair-source-section.svg'),'utf8');
 assert.ok(svg.startsWith('<svg'));
 const qa=JSON.parse(fs.readFileSync(path.join(folder,'R186_SOURCE_QA.json'),'utf8'));
 assert.equal(qa.realModelCalls,0);
 assert.equal(qa.verticalSourceAudit.featureWitness.reachableFromEntrance,true);
 assert.throws(()=>saveR186UpperGalleryReview(folder),
  /R186_SLICED_COMPARISON_OUTPUT_MUST_BE_NEW/);
});

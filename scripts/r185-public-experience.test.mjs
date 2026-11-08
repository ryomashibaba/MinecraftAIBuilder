import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {R185_EXPLICIT_RESEARCH_CHOICES,makeR185SyntheticReply,
 buildR185PublicExperienceReview,saveR185PublicExperienceReview}
 from './r185-public-experience-comparison.mjs';
import {compileR185PublicExperience}
 from '../source/ai/r185-public-experience.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';

const raw=x=>JSON.stringify(x),base=()=>makeR185SyntheticReply(R185_EXPLICIT_RESEARCH_CHOICES[0]);
const parse=x=>compileR185PublicExperience(raw(x));
test('R185 creates 2 physically changed architectural arrival experiences from identical abstract program; route and world safety source-proven',()=>{
 const review=buildR185PublicExperienceReview();
 assert.equal(review.cases.length,2);
 assert.equal(review.realModelCalls,0);
 assert.equal(review.totalWorldWrites,0);
 for(const c of review.cases){
  const n=c.now,p=n.publicExperience;
  assert.ok(verifyCompiled(n.design,n.compiled));
  assert.notEqual(n.compiled.geometrySha256,c.previous.compiled.geometrySha256);
  assert.ok(n.comparison.trueVoxelSymmetricDifferenceRatio>0.20);
  assert.ok(p.directTwoWideGroundedAirCells>=40);
  assert.equal(p.actualSourceGraphStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.ok(p.actualSourceGraphWitness);
  assert.equal(p.furnishedRoomAccess,'NOT_TESTED');
  assert.equal(p.upperFloorTraversal,'NOT_TESTED');
  assert.equal(n.readiness,'NOT_PREPARED');
  assert.deepEqual(n.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(n.BuildPlan.operations,[]);
  assert.equal(n.constructionApproved,false);
  assert.equal(n.executionAllowed,false);
  assert.equal(n.worldWrites,0);
  assert.equal(n.worldContacts,0);
 }
});
test('R185 forbids adding fake program approval, undeclared arrival axis and unsupported old forms',()=>{
 const good=base(),out=parse(good);
 assert.equal(out.modelProvenance,'STATIC_SYNTHETIC_RESEARCH_ONLY');
 const edits=[
  x=>{x.experience.entranceAxis='east';},
  x=>{x.experience.entranceWidth=1;},
  x=>{x.experience.targetUseId='backstage';},
  x=>{x.experience.publicSpace='underpass';},
  x=>{x.base.program.functionalVerification='PASS';},
  x=>{x.base.site.height=88;},
  x=>{x.experience.minecraftBuild=true;},
  x=>{x.base.composition.grammar='folded-ground';},
  x=>{x.worldCoordinates=[0,0,0];}
 ];
 for(const edit of edits){
  const invalid=structuredClone(good);edit(invalid);
  assert.throws(()=>parse(invalid),/R185_PUBLIC_EXPERIENCE_/);
 }
});
test('R185 source route derives from true voxel material not declared witness, blocked public portal fails closed',()=>{
 const result=parse(base()),p=result.publicExperience;
 const design=structuredClone(result.design);
 // Physically block two-axis public path as a genuine B143 voxel wall.
 design.elements.push({id:'test-block-entry',shape:'box',mode:'add',
  material:'concrete',origin:[21,2,12],size:[6,3,1]});
 const c=compileDesign(design);
 assert.ok(verifyCompiled(design,c));
 const occ=new Set(c.primitives.map(p=>p.slice(0,3).join(',')));
 assert.ok(occ.has('22,2,12')&&occ.has('23,3,12'));
 assert.ok(p.directTwoWideGroundedAirCells>0);
 assert.notEqual(c.geometrySha256,result.compiled.geometrySha256);
});
test('R185 builds true 4 turnable 3D scenes + 20 geometric orthographic views and JSON without overwriting',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r185-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const folder=path.join(temp,'review');
 const r=saveR185PublicExperienceReview(folder);
 assert.equal(r.cases.length,2);
 for(const c of r.cases)for(const branch of ['r184','r185']){
  assert.ok(fs.readFileSync(path.join(folder,c.id+'-'+branch+'.html'),'utf8').length>500);
  for(const side of ['front','rear','east','west','roof'])
   assert.ok(fs.readFileSync(path.join(folder,c.id+'-'+branch+'-'+side+'.svg'),'utf8').startsWith('<svg'));
 }
 const meta=JSON.parse(fs.readFileSync(path.join(folder,'R185_SOURCE_QA.json'),'utf8'));
 assert.equal(meta.cases.length,2);
 assert.equal(meta.realModelCalls,0);
 assert.throws(()=>saveR185PublicExperienceReview(folder),
  /R185_REVIEW_OUTPUT_MUST_BE_NEW/);
});

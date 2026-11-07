import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeR188SyntheticReply,buildR188FrontageReview,
 saveR188FrontageReview}
 from './r188-inhabited-frontage-comparison.mjs';
import {compileR188InhabitedFrontage,auditR188InhabitedFrontage}
 from '../source/ai/r188-inhabited-frontage.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
const make=()=>makeR188SyntheticReply();
const parse=q=>compileR188InhabitedFrontage(JSON.stringify(q));
test('R188 real architecture reworks front mass, creates 3 TRUE full-depth 2-wide arcades and keeps previous 16-step functional source slice',()=>{
 const review=buildR188FrontageReview(),r=review.after,p=r.review;
 assert.ok(verifyCompiled(r.design,r.compiled));
 assert.notEqual(r.compiled.geometrySha256,
  review.baseline.compiled.geometrySha256);
 assert.ok(r.actualVoxelCountRemoved>750);
 assert.equal(p.westCoveredPassages,2);
 assert.equal(p.eastCoveredPassages,1);
 assert.deepEqual(p.verifiedTwoWidePublicCrossAxisX,[9,36]);
 assert.deepEqual(p.crossAxisZ,[10,11]);
 assert.deepEqual(p.supportedTwoWideThroughArcades.map(x=>x.realTwoWidthLength),
  [30,30,34]);
 assert.equal(p.groundAndUpperEntranceZoneWitnesses.length,5);
 assert.ok(p.groundAndUpperEntranceZoneWitnesses
  .every(z=>z.reachedFromEntrance));
 assert.equal(p.actualExhibitServiceWitness.reachableFromEntrance,true);
 assert.equal(p.formerlyVerified16StairSteps,true);
 assert.equal(p.formerlyVerifiedUpperRoomAndDisplay,true);
 assert.equal(p.formerlyVerifiedRealBalcony,true);
 assert.equal(p.formerlyVerifiedWestAndEastSightlines,true);
 assert.equal(r.sourceAuthenticity,'STATIC_HOST_RESEARCH_NOT_LOCAL_LLM');
 assert.equal(r.realModelCalls,0);
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.worldWrites,0);
 assert.equal(r.worldContacts,0);
});
test('R188 strictly accepts only the explicit source opt-in, rejects invalid variants / apparent Minecraft approval',()=>{
 const raw=make(),parsed=parse(raw);
 assert.equal(parsed.originalRawSha256,
  createHash('sha256').update(JSON.stringify(raw)).digest('hex'));
 const edits=[
  x=>{x.schema='minecraft-build';},
  x=>{x.base.schema='r188-fake';},
  x=>{x.base.daylight.roomId='unknown';},
  x=>{x.frontage.westArcade='decorative-line';},
  x=>{x.frontage.eastLoggia='painted-stripes';},
  x=>{x.frontage.upperSetback='flat-old-roof';},
  x=>{x.frontage.minecraftWrite=true;},
  x=>{x.worldCoordinates=[1,2,3];},
  x=>{x.base.base.base.base.composition.grammar='folded-ground';}
 ];
 for(const change of edits){
  const c=structuredClone(raw);change(c);
  assert.throws(()=>parse(c),/R188_INHABITED_FRONTAGE_/);
 }
});
test('R188 regressions fail closed on deleting true public cuts or fake metadata-only loggia, before pretending source routes succeed',()=>{
 const original=parse(make());
 for(const id of [
  'r188-west-arcade-beside-stair',
  'r188-west-public-promenade',
  'r188-east-through-public-loggia',
  'r188-west-ground-cross-axis',
  'r188-east-ground-cross-axis',
  'r188-east-upper-front-mass-setback'
 ]){
  const d=structuredClone(original.design);
  d.elements=d.elements.filter(e=>e.id!==id);
  const compiled=compileDesign(d);
  assert.ok(verifyCompiled(d,compiled));
  assert.throws(()=>auditR188InhabitedFrontage(d,compiled),
   /R188_INHABITED_FRONTAGE_|R187_DAYLIT_UPPER_COURT_|R186_VERTICAL_SLICE_/,
   id+' physical removal must be detected');
 }
});
test('R188 emits 2 truly rotatable B143 3D models, 10 elevations, audit with exactly safe source',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r188-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const root=path.join(dir,'compare'),report=saveR188FrontageReview(root);
 assert.equal(report.qa.worldWrites,0);
 assert.equal(report.qa.realModelCalls,0);
 for(const id of ['r187','r188']){
  assert.ok(fs.readFileSync(path.join(root,id+'.html'),'utf8').length>500);
  for(const side of ['front','rear','west','east','roof'])
   assert.ok(fs.readFileSync(path.join(root,id+'-'+side+'.svg'),'utf8')
    .startsWith('<svg'));
 }
 const j=JSON.parse(fs.readFileSync(path.join(root,'R188_SOURCE_QA.json'),'utf8'));
 assert.equal(j.readiness,'NOT_PREPARED');
 assert.deepEqual(j.BuildPlan.operations,[]);
 assert.equal(j.trueR188MassingWitnesses.length,3);
 assert.throws(()=>saveR188FrontageReview(root),
  /R188_TRUE_FRONTAGE_REVIEW_OUTPUT_MUST_BE_NEW/);
});

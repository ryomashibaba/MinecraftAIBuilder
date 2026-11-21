import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {makeR187SyntheticReply,buildR187DaylightReview,
 saveR187DaylightReview}
 from './r187-daylit-upper-court-comparison.mjs';
import {compileR187DaylitUpperCourt,auditR187DaylitRoom}
 from '../source/ai/r187-daylit-upper-court.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
const make=()=>makeR187SyntheticReply();
const parse=x=>compileR187DaylitUpperCourt(JSON.stringify(x));
test('R187: real glass-and-air west stair views and east room panorama with source-reached open upper balcony',()=>{
 const r=buildR187DaylightReview(),p=r.now,a=p.daylightSourceAudit;
 assert.ok(verifyCompiled(p.design,p.compiled));
 assert.notEqual(p.compiled.geometrySha256,r.old.compiled.geometrySha256);
 assert.equal(p.modelCalls,0);
 assert.equal(a.westStairLightViewRayWitnesses.length,3);
 assert.equal(a.eastRoomPanoramaViewRayWitnesses.length,2);
 assert.equal(a.actualBalconyAccess.reachedFromEntrance,true);
 assert.equal(a.actualBalconyAccess.standingFloorY,17);
 assert.equal(a.actualEnclosedRoomAccess.reachedFromEntrance,true);
 assert.equal(a.preservedGroundPublicAccess.reachedFromEntrance,true);
 assert.equal(a.preservedExhibitService.reachableFromEntrance,true);
 assert.equal(a.original16StairStepsAndEquipmentVerified,true);
 assert.equal(a.sourcePublicGraphStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(a.luxIllumination,'NOT_SIMULATED');
 assert.equal(a.realMinecraftWalking,'NOT_TESTED');
 assert.equal(p.readiness,'NOT_PREPARED');
 assert.deepEqual(p.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(p.BuildPlan.operations,[]);
 assert.equal(p.worldWrites,0);
 assert.equal(p.worldContacts,0);
 assert.equal(p.artDecision,'ART_HOLD_HUMAN_REVIEW');
});
test('R187 rejects model attempts to re-author room, facade, directions or approve world construction',()=>{
 const a=make(),out=parse(a);
 assert.equal(out.originalRawSha256,
  createHash('sha256').update(JSON.stringify(a)).digest('hex'));
 assert.equal(out.provenance,'STATIC_SYNTHETIC_HOST_GEOMETRY_NOT_MODEL_GENERATED');
 const mutants=[
  x=>{x.schema='new-unsafe-art';},
  x=>{x.base.schema='other-base';},
  x=>{x.base.base.base.composition.grammar='folded-ground';},
  x=>{x.daylight.roomId='nonexistent-room';},
  x=>{x.daylight.roomFacing='west';},
  x=>{x.daylight.stairFacing='east';},
  x=>{x.daylight.courtUse='floating-platform';},
  x=>{x.daylight.worldX=120;},
  x=>{x.worldWrites=1;},
  x=>{x.base.slice.upperFloorY=99;}
 ];
 for(const mutate of mutants){
  const q=structuredClone(a);mutate(q);
  assert.throws(()=>parse(q),/R187_DAYLIT_UPPER_COURT_/);
 }
});
test('R187 actual source auditing catches deleted glazing, skycourt air and supporting deck/posts rather than trusting metadata',()=>{
 const original=parse(make());
 const missing=[
  'r187-west-human-scale-glass-skin',
  'r187-east-actual-skycourt-subtraction',
  'r187-east-reconnected-outdoor-deck',
  'r187-court-structural-post-b',
  'r187-room-actual-panoramic-glass',
  'r187-cut-balcony-walkable-door'
 ];
 for(const id of missing){
  const design=structuredClone(original.design);
  design.elements=design.elements.filter(e=>e.id!==id);
  const compiled=compileDesign(design);
  assert.ok(verifyCompiled(design,compiled));
  assert.throws(()=>auditR187DaylitRoom(design,compiled),
   /R187_DAYLIT_UPPER_COURT_|R186_VERTICAL_SLICE_/,
   'Removing '+id+' must fail physical audit');
 }
});
test('R187 outputs 2 true-source rotatable 3Ds, 10 real elevations, source sightline diagram and JSON provenance',t=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'r187-'));
 t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
 const folder=path.join(d,'real-geometry');
 const r=saveR187DaylightReview(folder);
 assert.equal(r.comparison.supportedAndReachedOutdoorTerrace,true);
 for(const version of ['r186','r187']){
  assert.ok(fs.readFileSync(path.join(folder,version+'.html'),'utf8').length>500);
  for(const dir of ['front','rear','east','west','roof'])
   assert.ok(fs.readFileSync(path.join(folder,version+'-'+dir+'.svg'),'utf8')
    .startsWith('<svg'));
 }
 assert.ok(fs.readFileSync(path.join(folder,'r187-real-sightlines.svg'),'utf8')
  .startsWith('<svg'));
 const qa=JSON.parse(fs.readFileSync(path.join(folder,'R187_SOURCE_QA.json'),'utf8'));
 assert.equal(qa.realModelCalls,0);
 assert.equal(qa.sourceProof.actualBalconyAccess.reachedFromEntrance,true);
 assert.equal(qa.verifiedCurrentSafety.worldWrites,0);
 assert.throws(()=>saveR187DaylightReview(folder),
  /R187_REAL_SOURCE_REVIEW_OUTPUT_MUST_BE_NEW/);
});

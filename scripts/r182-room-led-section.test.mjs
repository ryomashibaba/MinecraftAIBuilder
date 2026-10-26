import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {R178_SYNTHETIC_CASES} from './r178-wing-comparison.mjs';
import {makeR182SyntheticReply,buildR182MatchedSectionReview,
 saveR182MatchedSectionReview}
 from './r182-room-led-section-comparison.mjs';
import {parseR182RoomSectionReply}
 from '../source/ai/r182-room-led-section.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
import {auditR125SourceRoutes}
 from '../source/ai/r125-source-routes.mjs';
const request={naturalLanguageBrief:'Strict synthetic test source'};
const make=()=>makeR182SyntheticReply(R178_SYNTHETIC_CASES[0],0);
const parse=x=>parseR182RoomSectionReply(JSON.stringify(x),request);
test('R182 3 use-neutral roof sections are genuine stepped/clad/glazed physical B143 geometries with supported room, furnishing and courtyard access',()=>{
 const review=buildR182MatchedSectionReview();
 assert.equal(review.cases.length,3);
 assert.equal(review.actualLocalModelCalls,0);
 for(const c of review.cases){
  const p=c.after,e=p.r182SectionEvidence;
  assert.notEqual(p.geometrySha256,c.before.geometrySha256);
  assert.ok(verifyCompiled(p.design,p.compiled));
  assert.equal(e.buildingShellsWithRaisedCeilings,3);
  assert.equal(e.trueVoxelSectionWitnesses.length,3);
  assert.equal(e.roomFurnitureAndCourtRoutesSourceVerified,true);
  assert.equal(e.aestheticStatus,'ART_HOLD');
  assert.equal(p.placements.length,4);
  assert.ok(p.sourceRouteAudit.zones.every(z=>z.reachedFromEntrance));
  assert.ok(p.sourceRouteAudit.featureAccess.every(z=>z.reachableFromEntrance));
  assert.ok(p.design.elements.length<=160);
  assert.equal(p.readiness,'NOT_PREPARED');
  assert.deepEqual(p.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(p.BuildPlan.operations,[]);
  assert.equal(p.worldWrites,0);
  assert.equal(p.worldContacts,0);
 }
});
test('R182 retains byte-level model provenance and fail-closes on unrequested rooftop changes',()=>{
 const base=make(),result=parse(base);
 assert.equal(result.originalRawSha256,
  createHash('sha256').update(JSON.stringify(base)).digest('hex'));
 assert.equal(result.modelAuthenticity,'CALLER_PROVIDED_UNVERIFIED');
 const shop=makeR182SyntheticReply(R178_SYNTHETIC_CASES[1],1);
 const impossible=structuredClone(shop);
 // A 10-cell-wide shop satellite with two-cell setbacks on both sides
 // leaves only six cells for its raised room: deliberately fail closed.
 impossible.roofSections.sections[1].insetX=2;
 assert.throws(()=>parse(impossible),
  /R182_ROOM_SECTION_SECTION_OUT_OF_BOUNDS/);
 const bad=[
  x=>{x.roofSections.supersedesLegacyRoofProfile=false;},
  x=>{x.roofSections.sections.pop();},
  x=>{x.roofSections.sections[0].volumeId='north';},
  x=>{x.roofSections.sections[0].rise=5;},
  x=>{x.roofSections.sections[0].insetX=6;},
  x=>{x.roofSections.sections[0].breakZ=2;},
  x=>{x.roofSections.sections[0].raisedRoomId='kitchen';},
  x=>{x.roofSections.sections[0].highSide='rear';},
  x=>{x.roofSections.sections[0].extraPosition=[0,0,0];},
  x=>{x.roofSections.sections[2].rise=6;},
  x=>{x.architecture.schema='not-r181';}
 ];
 for(const alter of bad){
  const c=structuredClone(base);alter(c);
  assert.throws(()=>parse(c),/R182_ROOM_SECTION_/);
 }
});
test('R182 physically witnesses genuine upper roof and clerestory; removing glass cannot pass voxel proof',()=>{
 const p=parse(make()).designOnlySource;
 const witness=p.r182SectionEvidence.trueVoxelSectionWitnesses[0];
 const tampered=structuredClone(p.design);
 tampered.elements=tampered.elements.filter(e=>
  e.id!==witness.volumeId+'-r182-clerestory-glass');
 const compiled=compileDesign(tampered);
 assert.ok(verifyCompiled(tampered,compiled));
 assert.notEqual(compiled.geometrySha256,p.geometrySha256);
 const current=compiled.primitives.find(v=>
  v[0]===witness.highX+2&&v[1]===
   p.r182SectionEvidence.explicitModelRoofIntent.sections[0].rise+
   p.r181GraphEvidence.declaredVolumes[0].roofY-1&&
  v[2]===witness.stepFace);
 assert.equal(current,undefined);
});
test('R182 saves 6 rotatable true 3D models and 30 real elevations, no overwrites',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r182-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const out=path.join(dir,'review');
 const report=saveR182MatchedSectionReview(out);
 assert.equal(report.cases.length,3);
 assert.ok(fs.readFileSync(path.join(out,'index.html'),'utf8')
  .includes('完全合成'));
 for(const id of ['home','shop','laboratory'])
  for(const version of ['r181','r182']){
   assert.ok(fs.existsSync(path.join(out,id+'-'+version+'.html')));
   for(const view of ['front','rear','west','east','roof'])
    assert.ok(fs.readFileSync(path.join(out,id+'-'+version+'-'+view+'.svg'),'utf8')
     .startsWith('<svg'));
  }
 assert.throws(()=>saveR182MatchedSectionReview(out),
  /R182_SECTION_PILOT_OUTPUT_MUST_BE_NEW/);
});

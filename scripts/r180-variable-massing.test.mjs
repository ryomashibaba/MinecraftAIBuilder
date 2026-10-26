import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {R178_SYNTHETIC_CASES,makeR178SyntheticReply} from './r178-wing-comparison.mjs';
import {buildR180MassingComparisons,saveR180MassingComparisons,
 R180_SYNTHETIC_EXTENTS} from './r180-variable-massing-comparison.mjs';
import {parseR178CourtyardReply,R180_SCHEMA} from '../source/ai/r178-wing-courtyard.mjs';
const clone=x=>structuredClone(x);
const request={naturalLanguageBrief:'Static matching test'};
const base=makeR178SyntheticReply(R178_SYNTHETIC_CASES[0]);
const changed=()=>{const x=clone(base);x.architecture={
 ...x.architecture,schema:R180_SCHEMA,
 wingExtents:clone(R180_SYNTHETIC_EXTENTS[0])};return x;};
const parse=x=>parseR178CourtyardReply(JSON.stringify(x),request);
test('R180 changes actual floor and roof volumes with model-authored extents, not fixtures selected by usage',()=>{
 const review=buildR180MassingComparisons();
 assert.equal(review.syntheticCases,3);
 assert.equal(review.realModelCalls,0);
 assert.equal(review.worldWrites,0);
 for(const c of review.cases){
  assert.notEqual(c.before.geometrySha256,c.after.geometrySha256);
  assert.equal(c.after.r178WingEvidence.spatialIRSchema,R180_SCHEMA);
  assert.deepEqual(c.after.r178WingEvidence.modelSelectedWingExtents,
   c.audit.modelDeclaredWingExtents);
  assert.equal(c.after.r178WingEvidence.courtyardReachedFromEntrance,true);
  assert.equal(c.after.placements.length,4);
  assert.ok(c.after.sourceRouteAudit.zones.every(q=>q.reachedFromEntrance));
  assert.ok(c.after.sourceRouteAudit.featureAccess.every(q=>q.reachableFromEntrance));
  assert.ok(c.after.design.elements.length<=160);
  assert.equal(c.after.readiness,'NOT_PREPARED');
  assert.deepEqual(c.after.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(c.after.BuildPlan.operations,[]);
  assert.equal(c.after.worldWrites,0);
 }
});
test('R180 fails closed on undeclared or impossible envelope without moving the caller intent',()=>{
 const good=parse(changed());
 assert.equal(good.designOnlySource.r178WingEvidence.geometryAuthorship,
  'HOST_COMPILED_FROM_EXPLICIT_R180_MASSING_IR');
 assert.equal(good.modelAuthenticity,'CALLER_PROVIDED_UNVERIFIED');
 const v1=clone(base);v1.architecture.wingExtents=clone(R180_SYNTHETIC_EXTENTS[0]);
 assert.throws(()=>parse(v1),/R178_WING_COURT_WING_COMPOSITION_IR/);
 const none=changed();delete none.architecture.wingExtents;
 assert.throws(()=>parse(none),/R178_WING_COURT_WING_COMPOSITION_IR/);
 const smallGap=changed();smallGap.architecture.wingExtents.east.innerX=17;
 assert.throws(()=>parse(smallGap),/R178_WING_COURT_R180_MASSING_OUT_OF_BOUNDS/);
 const long=changed();long.architecture.wingExtents.west.frontZ=8;
 assert.throws(()=>parse(long),/R178_WING_COURT_R180_MASSING_OUT_OF_BOUNDS/);
 const identical=changed();identical.architecture.wingExtents={
  west:{innerX:11,frontZ:1,rearZ:30},
  east:{innerX:20,frontZ:1,rearZ:30}
 };
 assert.throws(()=>parse(identical),/R178_WING_COURT_R180_MASSING_IDENTICAL_TO_R178/);
 const realRelationMissing=changed();
 realRelationMissing.relations.directAdjacencies=[['living','sleeping']];
 assert.throws(()=>parse(realRelationMissing),
  /R178_WING_COURT_PILOT_EACH_WING_NEEDS_MODEL_DIRECT_DOOR/);
});
test('R180 comparison stores six real B143 HTML models and thirty independent projections',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r180-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const out=path.join(dir,'comparison');
 const report=saveR180MassingComparisons(out);
 assert.equal(report.cases.length,3);
 assert.ok(fs.readFileSync(path.join(out,'index.html'),'utf8').includes('完全合成'));
 for(const id of ['home','shop','laboratory'])
  for(const version of ['r178','r180']){
   assert.ok(fs.existsSync(path.join(out,id+'-'+version+'.html')));
   for(const view of ['front','rear','west','east','roof'])
    assert.ok(fs.readFileSync(path.join(out,id+'-'+version+'-'+view+'.svg'),'utf8')
     .startsWith('<svg'));
  }
 assert.throws(()=>saveR180MassingComparisons(out),
  /R180_MASSING_PILOT_NEW_OUTPUT_DIR_REQUIRED/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {identifyR111SourceOverhead,sourceBackedR111Finish,buildR111SourceFinishStudy}
 from './b198zr111-reversible-floor-finish-transition.mjs';

const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R111 quick: cannot change furniture, absent source, or unproven floor',()=>{
 const f={kind:'right_R87_READING_TABLE_NOT_OCCUPANCY',
  a:[.5,.5,-.7],b:[.6,.5,-.7],c:[.5,.5,-.6]};
 assert.throws(()=>sourceBackedR111Finish([f],Array(4692).fill(f),[0]),
  /ONLY_REAL_R87_R94_FLOOR_FINISH_HITS_ALLOWED/);
 assert.throws(()=>sourceBackedR111Finish([f],[],[0]),
  /AUTHENTICATED_BOUNDED_SOURCE_FLOOR_FINISH_REQUIRED/);
 const info=identifyR111SourceOverhead({measured:{
  witnessCounts:{overhead:2},examples:[{at:[0,0,0],observed:[
   {class:'overhead',triangle:0,kind:f.kind,position:[.5,.5,-.7]}]}]}});
 assert.equal(info.allCaptured,false);
 assert.equal(info.captured,1);
});
test('R111 real: bounded source-floor relevel is never falsely called walkable',()=>{
 const study=buildR111SourceFinishStudy(nodes),q=study.report;
 assert.equal(q.overheadHitAttribution.overheadCount,7);
 assert.equal(q.overheadHitAttribution.allCaptured,true);
 assert.equal(q.fullSourceR98ArchivePreserved,true);
 assert.equal(q.originalR107Preserved,true);
 assert.equal(q.originalR107Sha256!==null,true);
 assert.equal(q.safety.readiness,'NOT_PREPARED');
 assert.equal(q.safety.gates.length,9);
 assert.deepEqual(q.safety.BuildPlan.operations,[]);
 assert.equal(q.realWorldHumanWalkingCertified,false);
 assert.equal(q.architecturalVisualApproval,'NOT_REVIEWED');
 assert.equal(q.originalQwenGenerativeQualityUnknown,true);
 if(q.sourceGeometryChanged){
  assert(q.alteredFacetCount>0);
  assert(q.selected?.acceptable);
  assert(q.selected?.fiveLaneNoRegression);
  assert.equal(study.faces.length,study.unchangedR107Faces.length);
 }else {
  assert.equal(q.alteredFacetCount,0);
  assert.deepEqual(study.faces,study.unchangedR107Faces);
 }
 console.log('R111_REAL_FINISH_TRANSITION',JSON.stringify({
  status:q.evaluationStatus,attribution:q.overheadHitAttribution.sourceHits,
  complete:q.overheadHitAttribution.allCaptured,
  sourceKinds:q.overheadHitAttribution.sourceKinds,
  active:q.sourceGeometryChanged,altered:q.alteredFacetCount,
  alternatives:q.alternatives,selected:q.selected
 }));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {attributeR108OverheadHits,buildR108RightLaneSourceHitStudy}
 from './b198zr108-r91-right-lane-hit-triage.mjs';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R108 quick: cite real triangle kinds and fail closed on partial or false rays',()=>{
 const face={kind:'right_R87_TABLE_SIDE',a:[0,0,0],b:[1,0,0],c:[0,1,0]};
 const scan={witnessCounts:{overhead:1},examples:[{step:0,
  at:[.1,0,0],observed:[{class:'overhead',offset:0,
   kind:face.kind,triangle:0,position:[.2,.2,0]}]}]};
 const result=attributeR108OverheadHits([face],[face],scan,.023);
 assert.equal(result.fullyAttributed,true);
 assert.equal(result.sourceHits[0].architecturalRole,'READING_FURNITURE');
 assert.deepEqual(result.sourceHits[0].matchingHistoricR98Indices,[0]);
 assert.deepEqual(result.sourceHits[0].intersection,[.2,.2,0]);
 assert.equal(result.sourceHits[0].activeMeshIndex,0);
 assert.equal(attributeR108OverheadHits([face],[face],
  {...scan,witnessCounts:{overhead:2}},.023).fullyAttributed,false);
 assert.throws(()=>attributeR108OverheadHits([face],[face],
  {...scan,examples:[{...scan.examples[0],
   observed:[{...scan.examples[0].observed[0],position:[2,2,2]}]}]},.023),
  /RAY_POINT_OUTSIDE_HIT_SOURCE_TRIANGLE_BOUNDS/);
});
test('R108 real: both remaining right R91 headroom lane hits have exact source witnesses',()=>{
 const r=buildR108RightLaneSourceHitStudy(nodes);
 assert.equal(r.historicalTriangleCount,4692);
 assert.equal(r.sourceGeometryChangedInR108,false);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.equal(r.safety.gates.length,9);
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.architecturalBeauty,'NOT_REVIEWED');
 assert.equal(r.humanWalkingCertified,false);
 assert.equal(r.lanes.length,5);
 assert.equal(r.attributionComplete,true);
 console.log('R108_REAL_R91_SOURCE_HITS',JSON.stringify({
  conclusion:r.conclusion,sourceKinds:r.remainingSourceKinds,
  count:r.unresolvedOverheadTotal,
  lanes:r.lanes.map(x=>({offset:x.offset,count:x.witnessCount,
   sourceHits:x.sourceHits.map(q=>({
    kind:q.sourceKind,role:q.architecturalRole,
    index:q.activeMeshIndex,fromR98:q.matchingHistoricR98Indices,
    at:q.intersection,station:q.routeStation,probe:q.withinLaneWidthSample}))}))
 }));
});

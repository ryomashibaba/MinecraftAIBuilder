import test from 'node:test';
import assert from 'node:assert/strict';
import {compareR117ActualChanges,buildR117ResidualStudy}
 from './b198zr117-post-canopy-real-source-hits.mjs';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R117 quick: no hidden geometry changes on other source triangles',()=>{
 const a=[{kind:'actual_canopy',a:[.5,.5,-.7],b:[.7,.5,-.7],c:[.5,.6,-.6]},
  {kind:'source_floor',a:[.5,.3,-.7],b:[.6,.3,-.7],c:[.5,.3,-.6]}];
 const b=[{...a[0],a:[.5,.65,-.7]},a[1]];
 const out=compareR117ActualChanges(a,b,[0]);
 assert.equal(out.length,1);
 assert.equal(out[0].index,0);
 assert.equal(out[0].yDisplacements[0],.15);
 assert.throws(()=>compareR117ActualChanges(a,b,[1]),/UNDECLARED_SOURCE_MESH_EDIT/);
});
test('R117 real: identify real source triangles after failed maximum R113 and R115',()=>{
 const r=buildR117ResidualStudy(nodes);
 assert.equal(r.baseline.counts.overhead,7);
 assert.equal(r.results.length,2);
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert(r.results.every(q=>q.changedActualFaces.length>=2&&
  q.sourceProbes.witnesses.length===q.sourceProbes.counts.overhead));
 console.log('R117_RESIDUAL_REAL_SOURCE',JSON.stringify({
  original:r.baseline.witnesses,
  candidates:r.results.map(q=>({
   kind:q.variant,counts:q.sourceProbes.counts,
   hits:q.sourceProbes.witnesses,
   altered:q.changedActualFaces
  }))
 }));
});

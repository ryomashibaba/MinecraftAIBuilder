import test from 'node:test';
import assert from 'node:assert/strict';
import {extractR104ActiveR91Throat,designR104LiveR91Shoulders,
 buildR104R91ActiveRepairStudy} from './b198zr104-r91-active-throat-repair.mjs';
import {screenR99FiniteRoute} from './b198zr99-finite-volume-route-witness.mjs';

const KIND='right_R91_NARROWING_GALLERY_TURNOUT_NOT_CERTIFIED';
const M0=[.54,0,-.10],M1=[.572,0,-.10],E0=[.543,0,.10],E1=[.569,0,.10];
const source=[
 {kind:KIND,a:M0,b:M1,c:E1},
 {kind:KIND,a:M0,b:E1,c:E0}
];
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};

test('R104 quick: new ramp shoulders use real R91 replacement surface, not erased R88 tip',()=>{
 const throat=extractR104ActiveR91Throat(source);
 assert.equal(throat.originalFaces.length,2);
 assert.deepEqual(throat.middle,[M0,M1]);
 assert.deepEqual(throat.terminal,[E0,E1]);
 const repaired=designR104LiveR91Shoulders(throat);
 assert.equal(repaired.faces.length,12);
 assert(repaired.faces.flatMap(f=>[f.a,f.b,f.c]).every(p=>p[0]>.4));
 assert.equal(repaired.sourceEndpointVerticesPreserved,true);
 const route=[[.556,0,-.1],[.556,0,.1]];
 const before=screenR99FiniteRoute(source,route),
  after=screenR99FiniteRoute([...source,...repaired.faces],route);
 assert(before.witnessCounts.floor>after.witnessCounts.floor);
 assert.equal(after.witnessCounts.overhead,before.witnessCounts.overhead);
 assert.equal(after.witnessCounts.lateral,before.witnessCounts.lateral);
 assert.equal(after.unscreenedSegmentCount,0);
 assert.throws(()=>extractR104ActiveR91Throat([]),/EXACT_TWO_R91_REPLACEMENT_FACES_REQUIRED/);
 assert.throws(()=>extractR104ActiveR91Throat([
  source[0],{...source[1],a:[.9,0,0]}
 ]),/R91_SOURCE_TWO_TRIANGLES_NOT_CONTIGUOUS/);
});
test('R104 actual: all original R98 triangles kept; unjoined R102 aprons withheld',()=>{
 const result=buildR104R91ActiveRepairStudy(nodes),r=result.report;
 assert.equal(r.sourceR98ExactPrefix,true);
 assert.equal(r.sourceFaces,4692);
 assert.equal(r.newActiveTriangles,result.faces.length);
 assert(r.newActiveTriangles>=4692);
 assert.equal(r.originalR91RealSourceVerified,true);
 assert.equal(r.withheldCount,r.withheldUnjoinedAprons.length);
 assert(r.keptR102JointVerifiedAprons.length+r.withheldCount<=7);
 assert([0,12].includes(r.r91AddedTriangles));
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.realWorldHumanWalkingCertified,false);
 assert.equal(r.architecturalBeauty,'NOT_REVIEWED');
 console.log('R104_R91_REAL_SOURCE_DIAGNOSTIC',JSON.stringify({
  kept:r.keptR102JointVerifiedAprons,
  withheld:r.withheldUnjoinedAprons,
  r91Status:r.r91ProposedCorrectionStatus,
  r91Added:r.r91AddedTriangles,
  witness:r.r91ScreeningWitness
 }));
});

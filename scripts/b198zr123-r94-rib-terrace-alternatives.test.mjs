import test from 'node:test';
import assert from 'node:assert/strict';
import {
 R123_TRIALS,strictlyPiercingTriangles,sourceEditedExternalPiercings,
 buildR123RealRibTerrace,bendR123RibTip
} from './b198zr123-r94-rib-terrace-alternatives.mjs';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
const triangle=(a,b,c,kind='source')=>({a,b,c,kind});
test('R123 quick: strict interior penetrations distinguished from shared edge',()=>{
 const floor=triangle([0,0,0],[1,0,0],[0,0,1]);
 const through=triangle([.3,-1,.3],[.3,1,.3],[.8,1,.3]);
 const shared=triangle([0,0,0],[1,0,0],[0,1,0]);
 assert.equal(strictlyPiercingTriangles(through,floor),true);
 assert.equal(strictlyPiercingTriangles(floor,through),true);
 assert.equal(strictlyPiercingTriangles(shared,floor),false);
 assert.equal(strictlyPiercingTriangles(floor,shared),false);
 assert.throws(()=>strictlyPiercingTriangles(null,floor),/TWO_FINITE_SOURCE_FACETS_REQUIRED/);
});
test('R123 quick: source-piercing list refuses non-finite geometry',()=>{
 assert.throws(()=>sourceEditedExternalPiercings([triangle([0,0,0],[1,0,0],[NaN,0,1])],[0]),
 /BOUNDED_ACTUAL_SOURCE_FACES_REQUIRED/);
 assert.throws(()=>bendR123RibTip([],R123_TRIALS[0]),/SIGNED_R120_LIGHT_RIB/);
});
test('R123 real: actual R121 OBJ-equivalent signed mesh solves new terrace hits without overstating art',()=>{
 const {faces,possibleCandidate,report:r}=buildR123RealRibTerrace(nodes);
 assert.equal(faces.length,4716);
 assert.deepEqual(r.r120NewStrictExternalPiercings.map(x=>[x.edited,x.other]),
  [[4535,3477],[4536,3477]]);
 assert.equal(r.trials.length,R123_TRIALS.length);
 assert(r.trials.some(t=>t.verifiedNewExternalPiercingsZero));
 assert(r.trials.every(t=>t.architecturalApproval==='HOLD'));
 assert.equal(r.realSourceGeometryChanged,false);
 assert.equal(r.seatWidthAlreadyReducedToApprox45PercentUnresolved,true);
 assert.equal(r.humanReadingSeatCertified,false);
 assert.equal(r.independentHumanArt,'NOT_REVIEWED');
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 if(r.proposedGeometryCandidate){
  const c=r.proposedGeometryCandidate;
  assert.equal(c.verifiedNewExternalPiercingsZero,true);
  assert.equal(c.priorSeamsStillIntact,true);
  assert.equal(c.floor,0);
  assert.equal(c.overhead,0);
  assert.equal(c.lateral,0);
  assert.equal(c.oldFiveSourceCorridorsNonregressing,true);
  assert.equal(possibleCandidate.length,4716);
 }else assert.equal(possibleCandidate,null);
 console.log('R123_REAL_SOURCE_RIB_TERRACE',JSON.stringify({
  status:r.status,oldPiercings:r.r120NewStrictExternalPiercings,
  trials:r.trials,geometryCandidate:r.proposedGeometryCandidate,
  architecturalApproval:r.independentHumanArt,safety:r.safety}));
});

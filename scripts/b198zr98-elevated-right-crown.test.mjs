import test from 'node:test';
import assert from 'node:assert/strict';
import {liftR98RightCrownVertex,buildR98ElevatedCrownStudy}
 from './b198zr98-elevated-right-crown.mjs';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],[.68,.64,.73],
  [.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R98 quick: loft has smooth bounded upper-shell field, untouched ordinary floors',()=>{
 const p=[.6,.98,.12],z=.12;
 assert(liftR98RightCrownVertex(p,z)[1]>.98);
 assert(liftR98RightCrownVertex(p,z)[1]<=1.06501);
 assert.deepEqual(liftR98RightCrownVertex([.6,.70,.12],z),[.6,.70,.12]);
 assert.deepEqual(liftR98RightCrownVertex([-.6,.98,.12],z),[-.6,.98,.12]);
 assert.deepEqual(liftR98RightCrownVertex([.6,.98,.50],z),[.6,.98,.50]);
 assert.throws(()=>liftR98RightCrownVertex([NaN,.98,0],z),/FINITE_INPUT_REQUIRED/);
});
test('R98 whole original mesh: measured clearance gain, seven windows and source R96 preserved',()=>{
 const study=buildR98ElevatedCrownStudy(nodes),e=study.evidence;
 assert.equal(e.originalTriangles,4692);
 assert.equal(e.alternativeTriangles,4692);
 assert(e.changedRightEnvelopeFaces>0);
 assert(e.maximumNormalizedLift>.025&&e.maximumNormalizedLift<=.08501);
 assert.notEqual(e.originalR96Sha256,e.candidateR98Sha256);
 assert.equal(e.historicalSevenWindowCornersUnchanged,true);
 assert.equal(e.zeroNewLocalSightlineBlockers,true);
 assert.equal(e.sightlineChecks.length,7);
 assert(e.sightlineChecks.every(q=>q.beforeBlocked===0&&q.afterBlocked===0));
 assert.equal(e.localRoofBefore.hasHit,true);
 assert(e.observedNormalizedClearanceGainLowerBound>=.02);
 assert.equal(e.adoptionCandidateStatus,'GEOMETRIC_GAIN_OBSERVED_BUT_AESTHETIC_HOLD');
 assert.equal(e.humanVisualAssessment,'NOT_REVIEWED');
 assert.equal(e.originalGeomUnmodified,true);
 assert.equal(e.minecraftWalkingCertified,false);
});

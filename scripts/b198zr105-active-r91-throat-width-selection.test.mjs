import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PEAKS,optimizeR105LiveR91Widening,buildR105LiveR91ResearchVariant}
 from './b198zr105-active-r91-throat-width-selection.mjs';

const kind='right_R91_NARROWING_GALLERY_TURNOUT_NOT_CERTIFIED';
const M0=[.54,0,-.1],M1=[.572,0,-.1],E0=[.543,0,.1],E1=[.569,0,.1];
const source=[
 {kind,a:M0,b:M1,c:E1},
 {kind,a:M0,b:E1,c:E0}
];
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R105 quick: choose only an independently witnessed narrow source R91 variant',()=>{
 const base=[...Array.from({length:4690},()=>({
  kind:'remote_fake',a:[2,-3,1],b:[3,-3,1],c:[2,-3,2]
 })),...source];
 const previous={faces:base,originalSourceFaces:base,
  report:{sourceFaces:4692,r91AddedTriangles:0,
   originalR98Sha256:sha(base),r91ProposedCorrectionStatus:'HOLD',
   keptR102JointVerifiedAprons:[],withheldUnjoinedAprons:[]}};
 const result=optimizeR105LiveR91Widening(previous),r=result.report;
 assert.equal(r.sourceOriginalTriangles,4692);
 assert.equal(r.sourceR98ExactPrefix,true);
 assert.equal(r.attempts.length,PEAKS.length);
 assert.equal(r.originalR91Screen.floor>0,true);
 assert(r.attempts.some(v=>v.acceptedByProbe));
 assert(r.selectedPeakNormalized!==null);
 assert(r.selectedPeakNormalized<=.025);
 assert(r.attempts.filter(x=>x.acceptedByProbe).every(x=>x.noNewOverheadOrLateral));
 assert.equal(r.safety.worldWrites,0);
 assert.equal(r.humanArtReview,'NOT_REVIEWED');
 assert.throws(()=>optimizeR105LiveR91Widening({faces:[]}),/EXACT_R104_SOURCE_STUDY_REQUIRED/);
});
test('R105 real: actual R91 blocker origin decides whether widening or roof change matters',()=>{
 const result=buildR105LiveR91ResearchVariant(nodes),r=result.report;
 assert.equal(r.sourceOriginalTriangles,4692);
 assert.equal(r.sourceR98ExactPrefix,true);
 assert.equal(r.attempts.length,PEAKS.length);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.equal(r.buildingLoadBearingCertification,false);
 assert.equal(r.wholeRoutePhysicalClearanceCertification,false);
 assert.equal(r.humanArtReview,'NOT_REVIEWED');
 assert.equal(r.changedMeshFromR104,
  r.candidateR105MeshSHA256!==r.sourceR104MeshSHA256);
 assert(r.attempts.every(v=>v.acceptedByProbe?
  v.stats.floor<r.originalR91Screen.floor&&v.stats.coverageComplete:true));
 console.log('R105_REAL_R91_OVERHEAD_AND_WIDTH_CHOICES',JSON.stringify({
  originalR91:r.originalR91Screen,
  priorR104:r.existingR104Screen,sourceKinds:r.actualR91OverheadSourceKinds,
  firstHit:r.actualR91OverheadFirstHit,priority:r.headroomPriority,
  selectedWidth:r.selectedPeakNormalized,changed:r.changedMeshFromR104,
  candidates:r.attempts.map(q=>({
   width:q.peak,gain:q.restoredGroundSamples,
   valid:q.acceptedByProbe,coverage:q.stats.coverageComplete
  }))
 }));
});

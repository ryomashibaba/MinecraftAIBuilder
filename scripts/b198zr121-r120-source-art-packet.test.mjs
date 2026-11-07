import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
 SOURCE_DELTA,SOURCE_SELECTED_SHA,
 auditR121LocalSourceConnectivity,buildR121FromNodes,
 writeR121SourceArtPacket
} from './b198zr121-r120-source-art-packet.mjs';

const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R121 quick: preserve shared source edge and detect real seam splitting',()=>{
 const k='right_R93_ANGLED_LANTERN_CANOPY_ART_STUDY';
 const old=[{kind:k,a:[.5,.6,-.7],b:[.7,.6,-.7],c:[.7,.6,-.65]},
  {kind:k,a:[.5,.6,-.7],b:[.7,.6,-.65],c:[.5,.6,-.65]}];
 const before=JSON.stringify(old);
 const valid=old.map(f=>({...f,...Object.fromEntries(['a','b','c'].map(x=>
  [x,[f[x][0],f[x][1]+.03,f[x][2]]]))}));
 const review=auditR121LocalSourceConnectivity(old,valid,[0,1]);
 assert.equal(JSON.stringify(old),before);
 assert.deepEqual(review.changedFaceIndices,[0,1]);
 assert.equal(review.oldLocalSharedEdgePairs,1);
 assert.equal(review.noNewlyDisconnectedPreviouslySharedSourceFaces,true);
 assert.deepEqual(review.brokenSharedEdgePairs,[]);
 const severed=auditR121LocalSourceConnectivity(old,[valid[0],old[1]],[0]);
 assert.equal(severed.noNewlyDisconnectedPreviouslySharedSourceFaces,false);
 assert.equal(severed.brokenSharedEdgePairs.length,1);
 assert.throws(()=>auditR121LocalSourceConnectivity(old,[valid[0],old[1]],[1]),
  /UNDISCLOSED_OR_MISSING_ACTUAL_DELTA/);
});
test('R121 real: exactly R120 selected 8 facets, source joins and genuine six-view art evidence',()=>{
 const packet=buildR121FromNodes(nodes),e=packet.evidence;
 assert.equal(e.r120SelectedSha256,SOURCE_SELECTED_SHA);
 assert.deepEqual(e.actualEditedSourceFacetIndices,SOURCE_DELTA);
 assert.equal(e.originalR110Overhead,7);
 assert.equal(e.postR120R110Overhead,0);
 assert.equal(e.reviewViewIds.length,6);
 assert.equal(e.sharedSourceEdgeAndVertexContinuity.noNewlyDisconnectedPreviouslySharedSourceFaces,true);
 assert.equal(e.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(e.safety.BuildPlan.operations,[]);
 assert.equal(e.humanAestheticApproval,'NOT_REVIEWED');
 assert(packet.review.views.every(v=>v.html.includes('CLIPPED')));
 const dir=process.env.R121_ARTIFACT_DESTINATION;
 if(dir){
  const target=path.resolve(dir);
  fs.mkdirSync(target,{recursive:true});
  const saved=writeR121SourceArtPacket(packet,target);
  assert.equal(saved.files.length,5);
  assert.equal(saved.candidateSha256,SOURCE_SELECTED_SHA);
  for(const name of saved.files)assert(fs.statSync(path.join(target,name)).size>100);
  const html=fs.readFileSync(path.join(target,'R121_SIX_VIEW_REVIEW.html'),'utf8');
  assert(html.includes('R121：R120実源メッシュ比較'));
  assert(html.includes('NOT_REVIEWED'));
  console.log('R121_ARTIFACT_EVIDENCE',JSON.stringify(saved));
 }
 console.log('R121_REAL_SOURCE_ART_REVIEW',JSON.stringify({
  candidateHash:e.r120SelectedSha256,edited:e.actualEditedSourceFacetIndices,
  edgePairs:e.sharedSourceEdgeAndVertexContinuity.oldLocalSharedEdgePairs,
  vertexPairs:e.sharedSourceEdgeAndVertexContinuity.oldLocalSharedVertexPairs,
  brokenEdges:e.sharedSourceEdgeAndVertexContinuity.brokenSharedEdgePairs,
  brokenVertices:e.sharedSourceEdgeAndVertexContinuity.brokenSharedVertexPairs,
  sixViews:e.reviewViewIds,visualApproval:e.humanAestheticApproval,
  realAvatarApproval:e.fullAvatarSweepCertified
 }));
});

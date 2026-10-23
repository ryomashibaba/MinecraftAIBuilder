import test from 'node:test';
import assert from 'node:assert/strict';
import {auditR103SourceJoint} from './b198zr103-source-junction-integrity.mjs';
import {buildR102TaperedGalleryStudy} from './b198zr102-tapered-gallery-aprons.mjs';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R103 quick: real source edges are required, even if appended corners match',()=>{
 const from=[.55,0,-.1],to=[.55,0,.1],kind='R86_RESEARCH_DECK_NOT_CERTIFIED';
 const floor=[
  {kind,a:[.534,0,-.1],b:[.566,0,-.1],c:[.566,0,.1]},
  {kind,a:[.534,0,-.1],b:[.566,0,.1],c:[.534,0,.1]}
 ];
 const neither=auditR103SourceJoint({sourceFaces:[],addedFaces:floor,
  sourceAnchor:from,sourcePad:to});
 assert.equal(neither.sourceEndpointEdgesVerified,false);
 assert.equal(neither.addedApronEndpointCornersVerified,true);
 const before=auditR103SourceJoint({sourceFaces:floor,addedFaces:[],
  sourceAnchor:from,sourcePad:to});
 assert.equal(before.sourceEndpointEdgesVerified,true);
 assert.equal(before.addedApronEndpointCornersVerified,false);
 const after=auditR103SourceJoint({sourceFaces:floor,addedFaces:floor,
  sourceAnchor:from,sourcePad:to});
 assert.equal(after.sourceEndpointEdgesVerified,true);
 assert.equal(after.addedApronEndpointCornersVerified,true);
 assert.equal(after.structuralLoadTransferCertified,false);
});
test('R103 actual: count seven source edge seams, do not approve disconnected tapers',()=>{
 const r=buildR102TaperedGalleryStudy(nodes).report,q=r.junctionAudit;
 assert.equal(q.sourceRoutesAssessed,7);
 assert.equal(q.details.length,7);
 assert.equal(r.originalSourceFaces,4692);
 assert.equal(r.taperedEndTransitionCount+r.retainedR100Rectangles+
  r.unmodifiedRejectedGalleryCount,7);
 assert(r.records.filter(x=>x.status.startsWith('TAPERED_')).every(x=>
  x.originalSourceR88EndEdgesVerified&&x.proposedTaperWeldsOriginalCorners));
 assert.equal(q.humanWalkingCertified,false);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 console.log('R103_REAL_SEVEN_ENDPOINT_COUNTS',JSON.stringify({
  tapered:r.taperedEndTransitionCount,rectangular:r.retainedR100Rectangles,
  rejected:r.unmodifiedRejectedGalleryCount,
  existingOriginalEdges:q.originalR88EndpointEdgeRoutes,
  joinedAdded:q.sourceJoinedSelectedAprons,
  defects:q.selectedApronEndpointDefects,
  roomEvidence:q.details.map(x=>({id:x.id,original:x.sourceEndpointEdgesVerified,
   added:x.addedApronEndpointCornersVerified,triangles:x.addedTriangles}))
 }));
});

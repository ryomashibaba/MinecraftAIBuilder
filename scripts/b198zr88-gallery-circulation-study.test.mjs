import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {prepareR62FutureDesignGuidance} from './b198zr62-evidence-backed-revision-guidance.mjs';
import {synthesizeR76ReviewDecisions} from './b198zr76-architecture-next-decisions.mjs';
import {prepareR77FutureArchitecturalBrief} from './b198zr77-cohesive-architecture-revision-brief.mjs';
import {prepareR78SpatialProgramSpec} from './b198zr78-spatial-program-design-spec.mjs';
import {prepareR79ParametricStudy} from './b198zr79-parametric-library-massing.mjs';
import {prepareR80ResearchEvidence} from './b198zr80-supported-route-concept-study.mjs';
import {prepareR81ArchitectureReview} from './b198zr81-envelope-portal-connection-review.mjs';
import {prepareR82GeometryAudit} from './b198zr82-mesh-clearance-and-terrace-audit.mjs';
import {prepareR83ArchitecturalLandingReview} from './b198zr83-wing-terrace-landing-prototypes.mjs';
import {prepareR84MultilevelReview,buildR84MultilevelResearch} from './b198zr84-multilevel-bookstack-review.mjs';
import {prepareR85RouteReview} from './b198zr85-wing-route-alternatives.mjs';
import {prepareR86DeckReview} from './b198zr86-finite-width-deck-study.mjs';
import {prepareR87InteriorReview,buildR87InteriorStudy} from './b198zr87-seven-room-architecture.mjs';
import {proposeR88GalleryForTier,buildR88GalleryStudy,prepareR88GalleryReview,
 writeR88GalleryReview} from './b198zr88-gallery-circulation-study.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
function pack(){
 const p=r32Courtyard();
 p.design.elements.push({id:'outside',shape:'box',mode:'add',
  material:'stone',origin:[0,p.design.bounds.height,0],size:[2,1,2]});
 const raw=JSON.stringify(p),a={raw,expectedRawSha256:sha(raw),
  b143Status:'HOLD_B143_NOT_COMPILED'};
 a.r62Evidence=prepareR62FutureDesignGuidance(a);
 a.r76Evidence=synthesizeR76ReviewDecisions(a);
 a.r77Evidence=prepareR77FutureArchitecturalBrief(a);
 a.r78Evidence=prepareR78SpatialProgramSpec(a);
 a.r79Evidence=prepareR79ParametricStudy(a);
 a.r80Evidence=prepareR80ResearchEvidence(a);
 a.r81Evidence=prepareR81ArchitectureReview(a);
 a.r82Evidence=prepareR82GeometryAudit(a);
 a.r83Evidence=prepareR83ArchitecturalLandingReview(a);
 a.r84Evidence=prepareR84MultilevelReview(a);
 a.r85Evidence=prepareR85RouteReview(a);
 a.r86Evidence=prepareR86DeckReview(a);
 a.r87Evidence=prepareR87InteriorReview(a);
 return a;
}
test('R88 resamples original ascent segments; does not claim every level connected',()=>{
 const a=pack(),model=buildR88GalleryStudy(a.r80Evidence.conceptualRouteNodes);
 assert.equal(model.tiers.length,7);
 assert.equal(model.tiers.filter(t=>t.side==='left').length,3);
 assert.equal(model.tiers.filter(t=>t.side==='right').length,4);
 assert.equal(model.proposedGalleryTierCount+model.unresolvedGalleryTierCount,7);
 assert(model.proposedGalleryTierCount>=1);
 assert.equal(model.faces.length,model.sourceR87Triangles+model.newResearchGalleryTriangles);
 assert.equal(model.certifiedPublicRoutes,0);
 assert.equal(model.fullEntryToReadingLoungeMotionProved,false);
 assert.equal(model.sourceR87FacesKeptByteEquivalent,true);
 assert.equal(model.sourceAtriumUnmodified,true);
 for(const t of model.tiers){
  assert.equal(t.actualWalkingOrStructuralCertification,false);
  assert(t.testedSampledSourceRouteAnchors>=15);
  assert.equal(t.addedResearchTriangles,t.candidate?5:0);
  if(t.candidate){
   assert(t.candidate.originalR80SegmentEndpoints.length===2);
   assert(t.candidate.normalizedGradient<=.23);
   assert(t.candidate.normalizedPlanRun>=.065);
   assert.equal(t.candidate.noRealFootFallOrLoadTransferProof,true);
  }
 }
});
test('R88 correctly holds a level when the entire room access is blocked',()=>{
 const t={side:'left',tier:0,padCenter:[-.52,.15,.32],triangleIndex:0};
 const route=[[-.54,.10,-.8],[-.54,.22,.70]];
 const giantWall=[
  {kind:'left_outer',a:[-.535,-1,-3],b:[-.535,2,-3],c:[-.535,2,3]},
  {kind:'left_outer',a:[-.535,-1,-3],b:[-.535,2,3],c:[-.535,-1,3]}
 ];
 const r=proposeR88GalleryForTier(t,route,giantWall,[]);
 assert.equal(r.candidate,null);
 assert.equal(r.faces.length,0);
 assert.equal(r.status,'UNRESOLVED_NO_SAFE_RESEARCH_GALLERY_VARIANT');
});
test('R88 complete source chain is still HOLD and cannot be overwritten by fake PASS',()=>{
 const a=pack(),p=prepareR88GalleryReview(a);
 assert.equal(p.r87CompleteEvidenceVerified,true);
 assert.equal(p.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(p.humanArchitectureReview,'NOT_REVIEWED');
 assert.equal(p.minecraftPlayerWalkingProven,false);
 assert.equal(p.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(p.safety.BuildPlan.operations,[]);
 assert.equal(p.safety.gates.length,9);
 assert(p.safety.gates.every(q=>q==='BLOCKED'));
 assert.equal(p.modelCalls,0);
 assert.equal(p.safety.worldContacts,0);
 const fraud=structuredClone(a.r87Evidence);
 fraud.humanArchitecturalCriteria='PASS';
 assert.throws(()=>prepareR88GalleryReview({...a,r87Evidence:fraud}),
  /R87_COMPLETE_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR88GalleryReview({...a,
  expectedRawSha256:'f'.repeat(64)}));
});
test('R88 is byte-stable on identical input and never edits original generated art',()=>{
 const a=pack(),before=JSON.stringify(a);
 const one=JSON.stringify(prepareR88GalleryReview(a));
 assert.equal(JSON.stringify(prepareR88GalleryReview(a)),one);
 assert.equal(JSON.stringify(a),before);
});
test('R88 review writes tangible 3D and source-aware tier defects only once',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r88-'));
 try{
  const a=pack(),result=writeR88GalleryReview({...a,destination:dir});
  const obj=fs.readFileSync(path.join(dir,
   'R88_GALLERY_AND_SHELL_SUPPORT_STUDY.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,
   'R88_ARCHITECTURAL_CIRCULATION_REVIEW.html'),'utf8');
  const ev=JSON.parse(fs.readFileSync(path.join(dir,
   'R88_GALLERY_TO_SEVEN_READING_ROOMS_EVIDENCE.json'),'utf8'));
  assert(result.proposed>=1);
  assert.equal(result.proposed+result.unresolved,7);
  assert.equal((obj.match(/^f /gm)||[]).length,
   buildR88GalleryStudy(a.r80Evidence.conceptualRouteNodes).faces.length);
  assert(html.includes('R87_ROOM_TO_PUBLIC_ROUTE_3D_REVIEW.html'));
  assert.equal(ev.certifiedPublicRoutes,0);
  assert.throws(()=>writeR88GalleryReview({...a,destination:dir}),
   /NO_OVERWRITES/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

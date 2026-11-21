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
import {prepareR84MultilevelReview} from './b198zr84-multilevel-bookstack-review.mjs';
import {prepareR85RouteReview} from './b198zr85-wing-route-alternatives.mjs';
import {prepareR86DeckReview} from './b198zr86-finite-width-deck-study.mjs';
import {designR87StudyBay,buildR87InteriorStudy,prepareR87InteriorReview,
 writeR87InteriorReview} from './b198zr87-seven-room-architecture.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
function pack(){
 const p=r32Courtyard();
 p.design.elements.push({id:'r87-hold',shape:'box',mode:'add',
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
 return a;
}
test('R87 actually creates furniture and architectural wall geometry on real source triangle',()=>{
 const source={kind:'right_reading_terrace',a:[.55,.20,-.12],
  b:[.68,.20,-.12],c:[.68,.20,-.025]};
 const bay=designR87StudyBay(source,'right',1,[]);
 assert.equal(bay.program,'LANTERN_BOOK_GALLERY');
 assert.equal(bay.floorContainedInSourceTriangle,true);
 assert.equal(bay.furnishingGeometryEmitted,true);
 assert(bay.faces.length>=9);
 assert(bay.faces.some(f=>f.kind==='right_R87_BOOK_WALL'));
 assert(bay.faces.some(f=>f.kind==='right_R87_PRISMATIC_BOOK_FIN'));
 assert.equal(bay.accessProved,false);
});
test('R87 West and East forms differ; source zone cannot be copied to wrong side',()=>{
 const source={kind:'left_reading_terrace',a:[-.69,.20,-.12],
  b:[-.54,.20,-.12],c:[-.69,.20,-.01]};
 const west=designR87StudyBay(source,'left',1,[]);
 assert.equal(west.program,'SAIL_READING_COVE');
 assert.equal(west.furnishingGeometryEmitted,true);
 assert(west.faces.some(f=>f.kind==='left_R87_RISING_SAIL_FIN'));
 assert.throws(()=>designR87StudyBay(source,'right',1),/B198ZR87_ORIGINAL/);
});
test('R87 conservative hull check leaves no invented vertical bookshelf crossing a roof',()=>{
 const source={kind:'right_reading_terrace',a:[.55,.20,-.12],
  b:[.68,.20,-.12],c:[.68,.20,-.025]};
 const blocker=[
  {kind:'right_crown',a:[.3,.24,-.5],b:[.9,.24,-.5],
   c:[.9,.24,.5]},
  {kind:'right_crown',a:[.3,.24,-.5],b:[.9,.24,.5],
   c:[.3,.24,.5]}
 ];
 const bay=designR87StudyBay(source,'right',1,blocker);
 assert.equal(bay.furnishingGeometryEmitted,false);
 assert(!bay.faces.some(f=>f.kind==='right_R87_BOOK_WALL'));
 assert(bay.warningCodes.includes('ORIGINAL_HULL_OR_ROOF_INTERSECTS_BOOKSHELVES'));
});
test('R87 outputs source-referenced 7 rooms (3 west / 4 east), sky lounge, and blocked safety',()=>{
 const a=pack();
 const m=buildR87InteriorStudy(a.r80Evidence.conceptualRouteNodes);
 assert.equal(m.createdProgramAreaCount,7);
 assert.equal(m.rooms.filter(r=>r.side==='left').length,3);
 assert.equal(m.rooms.filter(r=>r.side==='right').length,4);
 assert.equal(m.originalR86TrianglesPreserved,true);
 assert.equal(m.originalSevenTerraceParentsPreserved,true);
 assert(m.newlyAdded3DResearchFaces>=m.oculusTriangles+7);
 assert(m.faces.some(f=>f.kind==='R87_SKY_LOUNGE_INNER_OCULUS_RING'));
 assert(m.rooms.every(r=>r.originalRoomParentArea>0));
 assert(m.rooms.every(r=>r.humanWalkabilityProved===false));
 const evidence=prepareR87InteriorReview(a);
 assert.equal(evidence.r86RecomputedAndAuthenticated,true);
 assert.equal(evidence.humanArchitecturalCriteria,'NOT_REVIEWED');
 assert.equal(evidence.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(evidence.fullFloorStairEntryLoungeTravelProven,false);
 assert.equal(evidence.fullyAccessibleReadingRooms,0);
 assert.equal(evidence.safety.readiness,'NOT_PREPARED');
 assert(evidence.safety.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(evidence.safety.BuildPlan.operations,[]);
 assert.equal(evidence.safety.modelCalls,0);
 assert.equal(evidence.safety.worldWrites,0);
});
test('R87 refuses fabricated R86 certificates, altered raw bytes, and disabled limits',()=>{
 const a=pack(),tampered=structuredClone(a.r86Evidence);
 tampered.actualWalkingCertified=true;
 assert.throws(()=>prepareR87InteriorReview({...a,r86Evidence:tampered}),
  /R86_COMPLETE_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR87InteriorReview({...a,expectedRawSha256:'0'.repeat(64)}));
});
test('R87 review preserves input and remains deterministic on identical SHA evidence',()=>{
 const a=pack(),before=JSON.stringify(a);
 const result=JSON.stringify(prepareR87InteriorReview(a));
 for(let i=0;i<3;i++)
  assert.equal(JSON.stringify(prepareR87InteriorReview(a)),result);
 assert.equal(JSON.stringify(a),before);
});
test('R87 files give four visual angles, program truth, and refuse overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r87-'));
 try{
  const a=pack(),r=writeR87InteriorReview({...a,destination:dir});
  assert.equal(r.programAreas,7);
  const model=fs.readFileSync(path.join(dir,
   'R87_SAIL_COVE_LANTERN_GALLERY_ARCHITECTURE.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,
   'R87_ROOM_TO_PUBLIC_ROUTE_3D_REVIEW.html'),'utf8');
  const evidence=JSON.parse(fs.readFileSync(path.join(dir,
   'R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json'),'utf8'));
  assert(html.includes('FRONT')&&html.includes('OBLIQUE')&&
   html.includes('SIDE')&&html.includes('AERIAL'));
  assert(html.includes('R86_WIDE_DECK_CONCEPT_REVIEW.html'));
  assert(model.includes('R87_')&&model.includes('f 1 2 3'));
  assert.equal((model.match(/^f /gm)||[]).length,
   buildR87InteriorStudy(a.r80Evidence.conceptualRouteNodes).faces.length);
  assert.equal(evidence.createdProgramAreaCount,7);
  assert.equal(evidence.humanArchitecturalCriteria,'NOT_REVIEWED');
  assert.throws(()=>writeR87InteriorReview({...a,destination:dir}),/NO_OVERWRITES/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

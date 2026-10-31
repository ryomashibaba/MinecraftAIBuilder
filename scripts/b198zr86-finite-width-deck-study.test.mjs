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
import {screenR86ResearchRibbon,buildR86Candidate3D,
 prepareR86DeckReview,writeR86DeckReview} from './b198zr86-finite-width-deck-study.mjs';
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
 return a;
}
test('R86 finite width triangle strips exist only after positive corridor screens',()=>{
 const points=[[-.70,.10,-.18],[-.68,.10,0],[-.64,.12,.17]];
 const r=screenR86ResearchRibbon(points,'left',[]);
 assert.equal(r.accepted,true);
 assert.equal(r.triangles.length,4);
 assert(r.triangles.every(f=>[f.a,f.b,f.c].every(
  p=>p.length===3&&p.every(Number.isFinite))));
 assert.equal(r.physicalWalkingCertified,false);
 assert.equal(r.sampleNotContinuousSweptCollision,true);
 assert(r.edges.every(e=>Math.hypot(
  e.left[0]-e.right[0],e.left[2]-e.right[2])>.031));
});
test('R86 rejects broad span crossing central protected space before emitting surfaces',()=>{
 const r=screenR86ResearchRibbon([[-.60,.2,-.30],[-.42,.2,0],
  [-.30,.2,.31]],'left',[]);
 assert.equal(r.accepted,false);
 assert.equal(r.triangles.length,0);
 assert(r.reasonCodes.includes('FULL_RIBBON_INTO_PRESERVED_VOID'));
});
test('R86 actually probes nontrivial actual mesh triangles above the deck',()=>{
 const wall={kind:'left_outer',a:[-.60,.02,-.8],
  b:[-.60,.02,.8],c:[-.60,.35,0]};
 const points=[[-.75,.10,-.4],[-.62,.10,0],[-.50,.10,.40]];
 const r=screenR86ResearchRibbon(points,'left',[wall]);
 assert.equal(r.accepted,false);
 assert.equal(r.triangles.length,0);
 assert(r.reasonCodes.includes('WIDTH_OR_OVERHEAD_PROXY_INTERSECTS_HULL'));
});
test('R86 topology derives from all seven source tiers; neither HOLD nor art becomes PASS',()=>{
 const a=pack(),g=buildR86Candidate3D(a.r80Evidence.conceptualRouteNodes);
 assert.equal(g.decisions.length,7);
 assert.equal(g.originalR84FacesPreserved,true);
 assert.equal(g.routeCertificationCount,0);
 assert.equal(g.faces.length,g.sourceTriangleCount+g.addedTriangleCount);
 assert.equal(g.addedTriangleCount%4,0);
 const p=prepareR86DeckReview(a);
 assert.equal(p.sourceR85FullyRecomputed,true);
 assert.equal(p.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(p.humanArchitectureQuality,'NOT_REVIEWED');
 assert.equal(p.actualWalkingCertified,false);
 assert.equal(p.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(p.safety.BuildPlan.operations,[]);
 assert(p.safety.gates.every(x=>x==='BLOCKED'));
 assert.equal(p.realModelInferenceCalls,0);
 assert.equal(p.minecraftWorldConnections,0);
});
test('R86 refuses fabricated historic provenance and mutated prior model scores',()=>{
 const a=pack(),bad=structuredClone(a.r85Evidence);
 bad.certifiedTravelPaths=7;
 assert.throws(()=>prepareR86DeckReview({...a,r85Evidence:bad}),
  /R85_COMPLETE_SOURCE_EVIDENCE_MISMATCH/);
 assert.throws(()=>prepareR86DeckReview({...a,expectedRawSha256:'b'.repeat(64)}));
});
test('R86 repeat review is deterministic over immutable source without relaxing SHA',()=>{
 const a=pack(),original=JSON.stringify(a);
 const first=JSON.stringify(prepareR86DeckReview(a));
 for(let k=0;k<5;k++)
  assert.equal(JSON.stringify(prepareR86DeckReview(a)),first);
 assert.equal(JSON.stringify(a),original);
});
test('R86 generates SHA-bound review HTML/OBJ/JSON without overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r86-'));
 try{
  const a=pack(),out=writeR86DeckReview({...a,destination:dir});
  assert.equal(out.tierCount,7);
  const data=JSON.parse(fs.readFileSync(path.join(dir,
   'R86_READING_TIER_WIDTH_SCREEN.json'),'utf8'));
  const obj=fs.readFileSync(path.join(dir,'R86_READING_DECK_WIDTH_CANDIDATES.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,'R86_WIDE_DECK_CONCEPT_REVIEW.html'),'utf8');
  assert.equal(data.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(data.decisions.length,7);
  assert(html.includes('R85_SEVEN_TIER_ROUTE_REVIEW.html'));
  assert.equal((obj.match(/^f /gm)||[]).length,
   buildR86Candidate3D(a.r80Evidence.conceptualRouteNodes).faces.length);
  assert.throws(()=>writeR86DeckReview({...a,destination:dir}),/DO_NOT_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

test('R86 width catches hull impacts that a thin centerline would miss',()=>{
 const points=[[-.70,.10,-.18],[-.68,.10,0],[-.64,.12,.17]];
 const hull=[
  {kind:'left_outer',a:[-.63,.02,-.1],b:[-.63,.02,.3],c:[-.63,.30,.3]},
  {kind:'left_outer',a:[-.63,.02,-.1],b:[-.63,.30,.3],c:[-.63,.30,-.1]}
 ];
 const narrow=screenR86ResearchRibbon(points,'left',hull,{width:.008});
 assert.equal(narrow.accepted,true);
 const wide=screenR86ResearchRibbon(points,'left',hull,{width:.032});
 assert.equal(wide.accepted,false);
 assert.equal(wide.triangles.length,0);
 assert(wide.sampledHullIntersectionCount>0);
 assert(wide.reasonCodes.includes('WIDTH_OR_OVERHEAD_PROXY_INTERSECTS_HULL'));
});

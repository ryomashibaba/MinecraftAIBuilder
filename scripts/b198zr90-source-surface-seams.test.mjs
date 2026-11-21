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
import {prepareR87InteriorReview} from './b198zr87-seven-room-architecture.mjs';
import {prepareR88GalleryReview} from './b198zr88-gallery-circulation-study.mjs';
import {prepareR89AccessReview} from './b198zr89-gallery-interface-architecture.mjs';
import {sourceSurfaceAtXZ,buildR90SurfaceSeams,prepareR90SeamReview,
 writeR90SeamReview} from './b198zr90-source-surface-seams.mjs';
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
 a.r88Evidence=prepareR88GalleryReview(a);
 a.r89Evidence=prepareR89AccessReview(a);
 return a;
}
test('R90 true source triangle returns finite heights and rejects uncontained tip',()=>{
 const f={a:[0,.2,0],b:[.2,.3,0],c:[0,.2,.2]};
 const inside=sourceSurfaceAtXZ([.06,.23,.04],f);
 assert.equal(inside.containedXZ,true);
 assert(Math.abs(inside.verticalGap)<1e-7);
 assert.deepEqual(inside.barycentric.map(x=>+x.toFixed(2)),[.5,.3,.2]);
 const outside=sourceSurfaceAtXZ([.12,.2,.12],f);
 assert.equal(outside.containedXZ,false);
 assert.equal(sourceSurfaceAtXZ([0,0,0],
  {a:[0,0,0],b:[1,0,1],c:[2,0,2]}),null);
});
test('R90 uses real R80 ramp and R84 pad for every source-constrained connection',()=>{
 const a=pack(),study=buildR90SurfaceSeams(a.r80Evidence.conceptualRouteNodes);
 assert.equal(study.originalR89Triangles,4261);
 assert.equal(study.sourceDeckAnchorRegistered,7);
 assert.equal(study.originalPadEntryTapers,6);
 assert.equal(study.unresolvedTrue3DSeams,1);
 assert.equal(study.new3DSurfaceSeamTriangles,30);
 assert.equal(study.faces.length,4291);
 assert(study.tiers.every(t=>t.sourceDeckEdgeRegistered));
 const problem=study.tiers.find(t=>t.side==='right'&&t.tier===2);
 assert.equal(problem.terminalPadContained,false);
 assert.equal(problem.entryTaperAdded,false);
 assert.equal(problem.newFaces,0);
 assert(problem.issues.includes('R88_SOURCE_DECK_TERMINAL_OVERHANGS_TRUE_R84_PAD'));
 assert(study.tiers.filter(t=>t.entryTaperAdded).every(t=>t.newFaces===5));
 assert.equal(study.fullPhysicalHumanWalkabilityProven,false);
 assert.equal(study.gapDisclosuresCannotBeAutoPromotedToSafe,true);
});
test('R90 old evidence, approval and construction remain locked',()=>{
 const a=pack(),e=prepareR90SeamReview(a);
 assert.equal(e.r89FullEvidenceAuthenticated,true);
 assert.equal(e.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(e.humanAesthetics,'NOT_REVIEWED');
 assert.equal(e.safety.readiness,'NOT_PREPARED');
 assert.equal(e.safety.executionAllowed,false);
 assert.deepEqual(e.safety.BuildPlan.operations,[]);
 assert(e.safety.gates.every(x=>x==='BLOCKED'));
 assert.equal(e.modelCalls,0);
 assert.equal(e.worldContacts,0);
 const forged=structuredClone(a.r89Evidence);
 forged.actualHumanWalkabilityCertified=true;
 assert.throws(()=>prepareR90SeamReview({...a,r89Evidence:forged}),
  /R89_FULL_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR90SeamReview({...a,expectedRawSha256:'0'.repeat(64)}));
});
test('R90 evidence repetition is stable and source arguments immutable',()=>{
 const a=pack(),orig=JSON.stringify(a);
 const check=JSON.stringify(prepareR90SeamReview(a));
 assert.equal(JSON.stringify(prepareR90SeamReview(a)),check);
 assert.equal(JSON.stringify(a),orig);
});
test('R90 review writes inspectable three files, no overwrite, unresolved preserved',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r90-'));
 try{
  const a=pack(),result=writeR90SeamReview({...a,destination:dir});
  assert.equal(result.blocked,1);
  const data=JSON.parse(fs.readFileSync(path.join(dir,
   'R90_SOURCE_SURFACE_SEAM_EVIDENCE.json'),'utf8'));
  assert.equal(data.unresolvedTrue3DSeams,1);
  assert.equal(data.safety.readiness,'NOT_PREPARED');
  const model=fs.readFileSync(path.join(dir,'R90_SOURCE_DECK_TO_PAD_3D_SEAMS.obj'),'utf8');
  assert.equal((model.match(/^f /gm)||[]).length,4291);
  const html=fs.readFileSync(path.join(dir,
   'R90_GALLERY_THRESHOLD_VALIDITY_REVIEW.html'),'utf8');
  assert(html.includes('はみ出し'));
  assert(html.includes('R89_GALLERY_LANDING_INTEGRATION_REVIEW.html'));
  assert.throws(()=>writeR90SeamReview({...a,destination:dir}),/NO_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

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
import {prepareR90SeamReview} from './b198zr90-source-surface-seams.mjs';
import {prepareR91TurnoutReview} from './b198zr91-tapered-gallery-turnout.mjs';
import {designR92EntranceFolio,auditR92CirculationGraph,
 buildR92WholeLibraryAtlas,prepareR92WholeLibraryReview,
 writeR92WholeLibraryReview} from './b198zr92-whole-library-circulation-atlas.mjs';
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
 a.r90Evidence=prepareR90SeamReview(a);
 a.r91Evidence=prepareR91TurnoutReview(a);
 return a;
}
test('R92 entrance folio is truly anchored to both source public branches',()=>{
 const a=pack(),nodes=a.r80Evidence.conceptualRouteNodes;
 const r=designR92EntranceFolio(nodes);
 assert.equal(r.faces.length,12);
 assert.deepEqual(r.leftSourceBranch,nodes.westAccess[1]);
 assert.deepEqual(r.rightSourceBranch,nodes.entrance[1]);
 assert.equal(r.dimensionlessDesignOnly,true);
 assert.equal(r.verifiedGalleryBodyClearance,false);
 assert(r.faces.some(x=>x.kind==='left_R92_FOLDED_ENTRANCE_READING_FOLIO_NOT_CERTIFIED'));
 assert(r.faces.some(x=>x.kind==='right_R92_FOYER_FOLD_FIN_NOT_LOAD_CERTIFIED'));
 const corrupt=structuredClone(nodes);
 corrupt.westAccess[0][0]=.2;
 assert.throws(()=>designR92EntranceFolio(corrupt),/R80_REAL_FRONT_DOOR_BRANCH_REQUIRED/);
});
test('R92 traces seven true source segment attachments and conceptual top lounge',()=>{
 const a=pack(),nodes=a.r80Evidence.conceptualRouteNodes;
 const r=auditR92CirculationGraph(nodes);
 assert.equal(r.levels.length,7);
 assert.equal(r.summary.researchGraphRoomsReached,7);
 assert.equal(r.summary.sourceSegmentFractionsVerified,7);
 assert.equal(r.summary.researchGraphLoungeReached,true);
 assert.equal(r.summary.physicalCertifiedRoomsReached,0);
 assert.equal(r.summary.actualBodyWidthOrHeadroomProved,false);
 assert(r.levels.every(p=>p.limitedGeometricRouteCompleted));
 assert(r.levels.every(p=>p.originalLandingCrossSectionContained));
 assert(r.levels.some(p=>p.side==='right'&&p.tier===2&&
  p.terminalResearchPatch==='R91_TAPERED_REPLACEMENT'));
 assert.equal(r.roofLoungePosition[1],.8);
});
test('R92 building carries R91 full active source and real new folio triangles',()=>{
 const a=pack(),r=buildR92WholeLibraryAtlas(a.r80Evidence.conceptualRouteNodes);
 assert.equal(r.sourceR91ActiveTriangles,4294);
 assert.equal(r.newArchitecturalEntranceFaces,12);
 assert.equal(r.activeWholeLibraryTriangles,4306);
 assert.equal(r.faces.length,4306);
 assert.equal(r.sourceR91PreservedExactPrefix,true);
 assert.equal(r.atriumVoidStillPreservedInEntranceFolio,true);
 assert.equal(r.architecturalDesignNotIndependentlyApproved,true);
});
test('R92 strict source-proof does not promote HOLD or forged preceding evidence',()=>{
 const a=pack(),r=prepareR92WholeLibraryReview(a);
 assert.equal(r.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(r.r91FullEvidenceAuthenticated,true);
 assert.equal(r.independentArchitecturalArtReview,'NOT_REVIEWED');
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldWrites,0);
 const forged=structuredClone(a.r91Evidence);
 forged.approvedHumanWalkingPaths=7;
 assert.throws(()=>prepareR92WholeLibraryReview({...a,r91Evidence:forged}),
  /R91_COMPLETE_EVIDENCE_MISMATCH/);
 assert.throws(()=>prepareR92WholeLibraryReview({...a,
  expectedRawSha256:'f'.repeat(64)}));
});
test('R92 evidence deterministic, renders four real views, no overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r92-'));
 try{
  const a=pack(),before=JSON.stringify(a);
  const first=JSON.stringify(prepareR92WholeLibraryReview(a));
  assert.equal(first,JSON.stringify(prepareR92WholeLibraryReview(a)));
  assert.equal(JSON.stringify(a),before);
  const saved=writeR92WholeLibraryReview({...a,destination:dir});
  assert.equal(saved.wholeBuildingTriangles,4306);
  assert.equal(saved.researchRooms,7);
  const obj=fs.readFileSync(path.join(dir,
   'R92_FOLIO_ENTRANCE_WHOLE_ARCHITECTURE.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,
   'R92_ENTRANCE_SEVEN_ROOMS_LOUNGE_REVIEW.html'),'utf8');
  const json=JSON.parse(fs.readFileSync(path.join(dir,
   'R92_LIBRARY_PUBLIC_CIRCULATION_ATLAS.json'),'utf8'));
  assert.equal((obj.match(/^f /gm)||[]).length,4306);
  for(const view of ['FRONT','OBLIQUE','SIDE','AERIAL'])
   assert(html.includes(view));
  assert.equal(json.graph.summary.researchGraphRoomsReached,7);
  assert.equal(json.safety.readiness,'NOT_PREPARED');
  assert.throws(()=>writeR92WholeLibraryReview({...a,destination:dir}),/NO_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

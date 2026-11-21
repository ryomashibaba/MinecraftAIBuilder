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
import {prepareR87InteriorReview} from './b198zr87-seven-room-architecture.mjs';
import {prepareR88GalleryReview,buildR88GalleryStudy} from './b198zr88-gallery-circulation-study.mjs';
import {prepareR89AccessReview} from './b198zr89-gallery-interface-architecture.mjs';
import {prepareR90SeamReview,buildR90SurfaceSeams,sourceSurfaceAtXZ}
 from './b198zr90-source-surface-seams.mjs';
import {proposeR91Turnout,buildR91TurnoutStudy,prepareR91TurnoutReview,
 writeR91TurnoutReview} from './b198zr91-tapered-gallery-turnout.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function pack(){
 const p=r32Courtyard();
 p.design.elements.push({id:'outside',shape:'box',mode:'add',
  material:'stone',origin:[0,p.design.bounds.height,0],size:[2,1,2]});
 const raw=JSON.stringify(p),a={raw,expectedRawSha256:hash(raw),
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
 return a;
}
function samples(nodes){
 const r88=buildR88GalleryStudy(nodes),r84=buildR84MultilevelResearch(nodes);
 const rows=r88.tiers,ix=rows.findIndex(x=>x.side==='right'&&x.tier===2);
 assert(ix>=0);
 const from=r88.sourceR87Triangles+rows.slice(0,ix).reduce(
  (n,r)=>n+r.addedResearchTriangles,0);
 const group=r88.faces.slice(from,from+5);
 const tier=r84.tiers.find(x=>x.side==='right'&&x.tier===2);
 const kind=tier.reuseR83Landing?'right_contained_landing_PAD_NOT_CERTIFIED':
  'right_tier2_contained_bookstack_PAD_NOT_ACCESS_CERTIFIED';
 const [pad]=r84.faces.filter(f=>f.kind===kind);
 return {r88,r84,group,pad,ix};
}
test('R91 demonstrates the old R88 right-tier2 overhang before redesign',()=>{
 const a=pack(),{group,pad}=samples(a.r80Evidence.conceptualRouteNodes);
 assert.equal(group.length,5);
 assert.equal(group.slice(0,4).every(f=>f.kind==='R86_RESEARCH_DECK_NOT_CERTIFIED'),true);
 assert.equal(sourceSurfaceAtXZ(group[2].c,pad).containedXZ,false);
});
test('R91 tapers the actual R88 final corridor INTO the unchanged R84 pad',()=>{
 const a=pack(),{group,pad}=samples(a.r80Evidence.conceptualRouteNodes);
 const x=proposeR91Turnout(group,pad,[]);
 assert.equal(x.status,'SOURCE_PAD_CONTAINED_TAPERED_ALTERNATIVE_ONLY');
 assert.equal(x.chosenTaper,.75);
 assert.equal(x.resultingTerminalWidth,.024);
 assert.equal(x.faces.length,11);
 assert.equal(x.sourceOriginalTipUnmodified,true);
 assert(x.revisedTerminalBarycentrics.every(row=>Math.min(...row)>=.07));
 assert(x.probes.some(p=>p.taper===.95&&p.accepted===false));
 assert(x.probes.at(-1).accepted===true);
 assert(x.faces.some(f=>f.kind==='right_R91_TRUE_PAD_THRESHOLD_NOT_WALKABLE'));
 assert.equal(x.originalPadAccessible,false);
});
test('R91 active 3D variant replaces only obsolete tip and related rails',()=>{
 const a=pack(),model=buildR91TurnoutStudy(a.r80Evidence.conceptualRouteNodes);
 assert.equal(model.sourceR90Faces,4291);
 assert.equal(model.excludedObsoleteResearchFaceCount,8);
 assert.equal(model.newTurnoutFaces,11);
 assert.equal(model.activeModelTriangleCount,4294);
 assert.equal(model.faces.length,model.activeModelTriangleCount);
 assert.equal(model.rightTier2OriginalPadStillUnmodified,true);
 assert.equal(model.sourceR90PreservedSeparately,true);
 assert.equal(model.originalSourceOverhangRecorded,true);
 assert(model.rightTier2Alternative.revisedTerminalBarycentrics.every(
  row=>Math.min(...row)>=.07));
 assert.equal(model.approvedHumanWalkingPaths,0);
 assert.equal(model.independentAestheticReview,'NOT_REVIEWED');
});
test('R91 hardens tampered R90 evidence and keeps all 9 construction gates shut',()=>{
 const a=pack(),result=prepareR91TurnoutReview(a);
 assert.equal(result.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(result.r90FullEvidenceAuthenticated,true);
 assert.equal(result.safety.readiness,'NOT_PREPARED');
 assert(result.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(result.safety.BuildPlan.operations,[]);
 assert.equal(result.modelCalls,0);
 assert.equal(result.worldContacts,0);
 assert.equal(result.worldWrites,0);
 const altered=structuredClone(a.r90Evidence);
 altered.unresolvedTrue3DSeams=0;
 assert.throws(()=>prepareR91TurnoutReview({...a,r90Evidence:altered}),
  /R90_COMPLETE_EVIDENCE_MISMATCH/);
 assert.throws(()=>prepareR91TurnoutReview({...a,
  expectedRawSha256:'a'.repeat(64)}));
});
test('R91 protects original R90 evidence and repeats independently',()=>{
 const a=pack(),old=JSON.stringify(a);
 const first=JSON.stringify(prepareR91TurnoutReview(a));
 assert.equal(JSON.stringify(prepareR91TurnoutReview(a)),first);
 assert.equal(JSON.stringify(a),old);
});
test('R91 output is a genuine independent active 3D model and no overwrites',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r91-'));
 try{
  const a=pack(),saved=writeR91TurnoutReview({...a,destination:dir});
  assert.equal(saved.newTriangles,11);
  assert.equal(saved.excludedHistoricalTriangles,8);
  const json=JSON.parse(fs.readFileSync(path.join(dir,
   'R91_TRUE_PAD_TAPERED_RIGHT_TIER2_EVIDENCE.json'),'utf8'));
  const obj=fs.readFileSync(path.join(dir,
   'R91_TRUE_PAD_TAPERED_RIGHT_TIER2_ACTIVE_VARIANT.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,
   'R91_TRUE_PAD_TAPERED_RIGHT_TIER2_ARCHITECTURAL_REVIEW.html'),'utf8');
  assert.equal((obj.match(/^f /gm)||[]).length,4294);
  assert.equal(json.sourceR90Faces,4291);
  assert.equal(json.safety.readiness,'NOT_PREPARED');
  assert(html.includes('R90_GALLERY_THRESHOLD_VALIDITY_REVIEW.html'));
  assert.throws(()=>writeR91TurnoutReview({...a,destination:dir}),/NO_OVERWRITES/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

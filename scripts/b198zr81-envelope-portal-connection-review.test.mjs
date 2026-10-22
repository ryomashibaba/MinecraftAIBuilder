import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {prepareR61Sections} from './b198zr61-final-voxel-section-review.mjs';
import {prepareR62FutureDesignGuidance} from './b198zr62-evidence-backed-revision-guidance.mjs';
import {synthesizeR76ReviewDecisions} from './b198zr76-architecture-next-decisions.mjs';
import {prepareR77FutureArchitecturalBrief} from './b198zr77-cohesive-architecture-revision-brief.mjs';
import {prepareR78SpatialProgramSpec} from './b198zr78-spatial-program-design-spec.mjs';
import {prepareR79ParametricStudy} from './b198zr79-parametric-library-massing.mjs';
import {prepareR80ResearchEvidence} from './b198zr80-supported-route-concept-study.mjs';
import {intersectR81SegmentTriangle,buildR81EnvelopeVariant,
 prepareR81ArchitectureReview,writeR81ArchitectureReview}
 from './b198zr81-envelope-portal-connection-review.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
function pack(hold=false){
 const p=r32Courtyard();
 if(hold)p.design.elements.push({id:'outside',shape:'box',mode:'add',
  material:'stone',origin:[0,p.design.bounds.height,0],size:[2,1,2]});
 const raw=JSON.stringify(p);
 const a={raw,expectedRawSha256:sha(raw),
  b143Status:hold?'HOLD_B143_NOT_COMPILED':
   'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS'};
 if(!hold){
  const c=compileDesign(p.design);
  a.expectedGeometrySha256=c.geometrySha256;
  a.r61Evidence=prepareR61Sections({raw,expectedRawSha256:sha(raw),
   expectedGeometrySha256:c.geometrySha256});
 }
 a.r62Evidence=prepareR62FutureDesignGuidance(a);
 a.r76Evidence=synthesizeR76ReviewDecisions(a);
 a.r77Evidence=prepareR77FutureArchitecturalBrief(a);
 a.r78Evidence=prepareR78SpatialProgramSpec(a);
 a.r79Evidence=prepareR79ParametricStudy(a);
 a.r80Evidence=prepareR80ResearchEvidence(a);
 return a;
}
test('R81 actual 3D segment-triangle check detects a wall and ignores a miss',()=>{
 const f={a:[-1,-1,0],b:[1,-1,0],c:[0,1,0],kind:'wall'};
 const hit=intersectR81SegmentTriangle([0,0,-1],[0,0,1],f);
 assert(hit);
 assert.deepEqual(hit.point,[0,0,0]);
 assert.equal(intersectR81SegmentTriangle([2,0,-1],[2,0,1],f),null);
 assert.equal(intersectR81SegmentTriangle([0,0,-1],[0,0,-.5],f),null);
});
test('R81 finds original blocked two wing entrances and sky lounge glazing, opens only research triangles',()=>{
 const x=pack(true);
 const m=buildR81EnvelopeVariant(x.r80Evidence.conceptualRouteNodes);
 assert.equal(m.openingTests.length,3);
 for(const opening of m.openingTests){
  assert(opening.beforeNonCoplanarBarrierIntersections>0,
   opening.id+' should really hit the previous closed envelope');
  assert.equal(opening.afterNonCoplanarBarrierIntersections,0,
   opening.id+' needs an actual 3D portal cut');
  assert.equal(opening.portalOpenInSpecificCenterlineTest,true);
 }
 assert(m.removed.frontEntranceTriangles>0);
 assert(m.removed.glazedPortalTriangles>0);
 assert(m.removed.replacedBracketTriangles>0);
 assert.equal(m.bracketConnections.length,7);
 assert(m.faces.some(f=>f.kind==='research_hull_snapped_bracket'));
 assert(m.faces.some(f=>f.kind==='right_reading_terrace'));
 assert(m.faces.some(f=>f.kind==='lounge_deck'));
 assert(m.afterTriangleCount>1000);
 assert.equal(m.full3DCollisionNotTested,true);
});
test('R81 computes shell bracket starts from exact R79 source and warns about load verification',()=>{
 const m=buildR81EnvelopeVariant(pack(false).r80Evidence.conceptualRouteNodes);
 assert(m.previousLargestBracketHullGap>.015);
 for(const b of m.bracketConnections){
  assert.equal(b.newIdealizedSurfaceSampleGap,0);
  assert.equal(b.attachmentAndLoadUncertified,true);
  assert.equal(b.tipBelowDeck[1],+(b.linkedDeckCenter[1]-.012).toFixed(7));
  assert.notDeepEqual(b.proposedHullAnchor,b.formerStart);
 }
 assert(m.minWaypointToCrownVerticalGap>0);
});
test('R81 keeps evidence/frozen B143 on HOLD and never upgrades output to playable construction',()=>{
 const a=pack(true),r=prepareR81ArchitectureReview(a);
 assert.equal(r.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(r.r80RecomputedAndAuthenticated,true);
 assert.equal(r.genuineNewTriangleGeometryButNotArchitecturallyApproved,true);
 assert.equal(r.minecraftWalkingVerified,false);
 assert.equal(r.programRequirementsPassed,false);
 assert.equal(r.independentHumanQuality,'NOT_REVIEWED');
 assert.equal(r.actualQwenModelCalls,0);
 assert.equal(r.worldWrites,0);
 assert(r.safety.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
test('R81 supports compiled prior design but source geometric quality remains unverified',()=>{
 const r=prepareR81ArchitectureReview(pack(false));
 assert.equal(r.oldB143Status,'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS');
 assert.equal(r.selectedPortalCenterlineTests.length,3);
 assert.equal(r.sourceExactHullSampleUsedForNewAnchor,true);
 assert.equal(r.firstSourceModelOutputUnmodified,true);
});
test('R81 rejects forged R80 evidence, stale SHA and falsely compiled original',()=>{
 const a=pack(false),fake=structuredClone(a.r80Evidence);
 fake.circulationEvidence.minecraftPlayerRouteCertified=true;
 assert.throws(()=>prepareR81ArchitectureReview({...a,r80Evidence:fake}),
  /R80_RECOMPUTED_EVIDENCE_MISMATCH/);
 assert.throws(()=>prepareR81ArchitectureReview({
  ...a,expectedRawSha256:'f'.repeat(64)}),/FROZEN_RAW_SHA_REQUIRED/);
 assert.throws(()=>prepareR81ArchitectureReview({...pack(true),
  expectedGeometrySha256:'f'.repeat(64)}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});
test('R81 writes new OBJ research model and four source-projected views, never overwrites',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r81-openings-'));
 try{
  const a=pack(true),out=writeR81ArchitectureReview({...a,destination:dir});
  assert(out.triangles>1000);
  const json=JSON.parse(fs.readFileSync(path.join(dir,
   'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json')));
  const obj=fs.readFileSync(path.join(dir,
   'R81_TIDAL_LIBRARY_PORTAL_RELIEF_STUDY.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,
   'R81_ARCHITECTURE_PORTAL_AND_SUPPORT_REVIEW.html'),'utf8');
  assert.equal(json.r80RecomputedAndAuthenticated,true);
  assert(obj.includes('g research_hull_snapped_bracket'));
  assert.equal((obj.match(/^f /gm)||[]).length,out.triangles);
  assert.equal((html.match(/<svg /g)||[]).length,4);
  assert(html.includes('R80_LIBRARY_ACCESS_AND_STRUCTURE_VIEWS.html'));
  assert(html.includes('Minecraft'));
  assert.throws(()=>writeR81ArchitectureReview({...a,destination:dir}),
   /REFUSE_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

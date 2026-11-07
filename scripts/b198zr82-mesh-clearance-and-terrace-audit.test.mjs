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
import {prepareR81ArchitectureReview,buildR81EnvelopeVariant} from './b198zr81-envelope-portal-connection-review.mjs';
import {nearestR82TerracePointXZ,auditR82GeometricGaps,
 prepareR82GeometryAudit,writeR82GeometryAudit}
 from './b198zr82-mesh-clearance-and-terrace-audit.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const pack=(hold=false)=>{
 const p=r32Courtyard();
 if(hold)p.design.elements.push({id:'outside',shape:'box',mode:'add',
  material:'stone',origin:[0,p.design.bounds.height,0],size:[2,1,2]});
 const raw=JSON.stringify(p),a={raw,expectedRawSha256:sha(raw),
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
 a.r81Evidence=prepareR81ArchitectureReview(a);
 return a;
};
test('R82 true projected triangle closest-point geometry distinguishes inside and outside',()=>{
 const f={kind:'left_reading_terrace',
  a:[0,.2,0],b:[2,.2,0],c:[0,.2,2]};
 const inside=nearestR82TerracePointXZ([.3,.25,.4],f);
 assert.deepEqual(inside.point,[.3,.2,.4]);
 assert.equal(inside.horizontalDistance,0);
 assert.equal(inside.verticalDifference,-.05);
 const outside=nearestR82TerracePointXZ([2.3,.7,1],f);
 assert(outside.horizontalDistance>0);
 assert(outside.spatialDistance>=outside.horizontalDistance);
});
test('R82 scans 35 probe rays at each of three R81 portals, without extrapolating to certified opening',()=>{
 const a=pack(true);
 const m=buildR81EnvelopeVariant(a.r80Evidence.conceptualRouteNodes);
 const result=auditR82GeometricGaps({
  faces:m.faces,portalSites:m.openingTests,
  routeNodes:a.r80Evidence.conceptualRouteNodes});
 assert.equal(result.sampledPortalRays,105);
 assert.equal(result.portalSamples.length,3);
 assert(result.portalSamples.every(x=>x.grid.length===35));
 assert(result.portalSamples.every(x=>
  x.noSweptVolumeOrCertifiedDoorEnvelope===true));
 assert(result.portalSamples.every(x=>
  x.grid.some(p=>p.lateralOffset===0&&p.verticalOffset===0&&
   p.sampledCenterlineClear)));
 assert.equal(result.noContinuousVolumeCollisionTest,true);
});
test('R82 measures roof from actual crowns and nearest reading-terrace triangles',()=>{
 const a=pack(true);
 const m=buildR81EnvelopeVariant(a.r80Evidence.conceptualRouteNodes);
 const result=auditR82GeometricGaps({
  faces:m.faces,portalSites:m.openingTests,
  routeNodes:a.r80Evidence.conceptualRouteNodes});
 assert(result.roofProbeCount>4);
 assert(result.terraceProbeCount>4);
 assert(result.terraceProbes.every(x=>
  Number.isFinite(x.spatialGap)&&Number.isFinite(x.horizontalGap)&&
  Number.isFinite(x.verticalGap)));
 assert(result.terraceProbes.some(x=>x.spatialGap>.025));
 assert(result.terraceProbes.every(x=>
  x.exactPhysicalWalkingTransitionProven===false));
 assert(result.roofProbes.every(x=>
  x.roofGapFromRouteCenterPoint===null||
  Number.isFinite(x.roofGapFromRouteCenterPoint)));
 assert(result.unresolved.some(x=>
  x.id==='DECK_TO_READING_TERRACE_NOT_IN_SAME_SURFACE'));
 assert(result.annotationFaces.length>0);
 assert(result.annotationFaces.every(f=>f.kind.includes('_NOT_')));
 assert.equal(result.unscaledModelCannotCertifyRealHeadroom,true);
});
test('R82 refuses to invent new accessible connections or certified quality for B143 HOLD',()=>{
 const a=pack(true),r=prepareR82GeometryAudit(a);
 assert.equal(r.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(r.r81RecomputedAndAuthenticated,true);
 assert.equal(r.proposedPhysicalChanges.length,0);
 assert.equal(r.viewerMarkersAreNotWalkableSurfaces,true);
 assert.equal(r.noActual3DMeshIntersectionCompleteness,true);
 assert.equal(r.noHumanMovementOrAestheticPass,true);
 assert.equal(r.reviewerEvidenceStatus,'NOT_REVIEWED');
 assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
test('R82 compiles synthetic source without claiming new research mesh is B143 final',()=>{
 const r=prepareR82GeometryAudit(pack(false));
 assert.equal(r.oldB143Status,
  'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS');
 assert.equal(r.audit.sampledPortalRays,105);
 assert.equal(r.noAssumedMetreOrBlockScale,true);
 assert.equal(r.noNewQwenPermission,true);
 assert.equal(r.noHumanMovementOrAestheticPass,true);
});
test('R82 rejects altered R81 evidence, source SHA and fake B143 final',()=>{
 const a=pack(false),fake=structuredClone(a.r81Evidence);
 fake.selectedPortalCenterlineTests[0].afterNonCoplanarBarrierIntersections=123;
 assert.throws(()=>prepareR82GeometryAudit({...a,r81Evidence:fake}),
  /R81_COMPLETE_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR82GeometryAudit({...a,
  expectedRawSha256:'f'.repeat(64)}),/FROZEN_MODEL_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>prepareR82GeometryAudit({...pack(true),
  expectedGeometrySha256:'f'.repeat(64)}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});
test('R82 writes review JSON, original R81 mesh plus research issue markers and four SVG views',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r82-review-'));
 try{
  const a=pack(true),out=writeR82GeometryAudit({...a,destination:dir});
  assert(out.unresolvedCount>0);
  const json=JSON.parse(fs.readFileSync(path.join(dir,
   'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8'));
  const obj=fs.readFileSync(path.join(dir,
   'R82_ANNOTATED_GEOMETRY_ISSUES.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,
   'R82_INTERIOR_CLEARANCE_AND_LANDING_REVIEW.html'),'utf8');
  assert(json.r81RecomputedAndAuthenticated);
  assert(json.audit.annotationTriangles>0);
  assert(obj.includes('g unresolved_terrace_join_marker_NOT_WALKABLE'));
  assert.equal((html.match(/<svg /g)||[]).length,4);
  assert(html.includes('R81_ARCHITECTURE_PORTAL_AND_SUPPORT_REVIEW.html'));
  assert(html.includes('Minecraft'));
  assert.throws(()=>writeR82GeometryAudit({...a,destination:dir}),
   /REFUSE_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

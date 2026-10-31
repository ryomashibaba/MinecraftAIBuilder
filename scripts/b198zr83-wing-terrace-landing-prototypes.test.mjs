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
import {prepareR81ArchitectureReview} from './b198zr81-envelope-portal-connection-review.mjs';
import {prepareR82GeometryAudit} from './b198zr82-mesh-clearance-and-terrace-audit.mjs';
import {buildR83WingLandingStudy,prepareR83ArchitecturalLandingReview,
 writeR83ArchitecturalLandingReview}
 from './b198zr83-wing-terrace-landing-prototypes.mjs';
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
  a.r61Evidence=prepareR61Sections({
   raw,expectedRawSha256:sha(raw),expectedGeometrySha256:c.geometrySha256});
 }
 a.r62Evidence=prepareR62FutureDesignGuidance(a);
 a.r76Evidence=synthesizeR76ReviewDecisions(a);
 a.r77Evidence=prepareR77FutureArchitecturalBrief(a);
 a.r78Evidence=prepareR78SpatialProgramSpec(a);
 a.r79Evidence=prepareR79ParametricStudy(a);
 a.r80Evidence=prepareR80ResearchEvidence(a);
 a.r81Evidence=prepareR81ArchitectureReview(a);
 a.r82Evidence=prepareR82GeometryAudit(a);
 return a;
}
test('R83 proposes two localized inset pads on actual terrace triangles without remodeling the atrium',()=>{
 const a=pack(true),r=buildR83WingLandingStudy(a.r80Evidence.conceptualRouteNodes);
 assert.equal(r.landingPrototypes.length,2);
 assert.equal(r.containedLandingCount,2);
 assert.equal(r.candidateConnectorCount,2);
 assert.equal(r.sourceFaceCount+r.addedFaceCount,r.faces.length);
 assert(r.addedFaceCount>=2);
 assert(r.faces.some(f=>f.kind==='left_contained_landing_PAD_NOT_CERTIFIED'));
 assert(r.faces.some(f=>f.kind==='right_contained_landing_PAD_NOT_CERTIFIED'));
 assert(r.faces.some(f=>f.kind==='sky_lounge_glass'));
 assert.equal(r.publicRouteUntouched,true);
 assert.equal(r.noAssumptionThatProgramZonesAreNowAccessible,true);
 assert.equal(r.directConnectionsDoNotProveConstructionReadiness,true);
 assert(r.sourceR82UnresolvedCount>0);
 assert(r.faces.every(f=>[f.a,f.b,f.c].every(p=>
  p.length===3&&p.every(Number.isFinite))));
});
test('R83 landing triangle vertices are convex insets of one existing reading floor, not floating placeholder boxes',()=>{
 const a=pack(false);
 const r=buildR83WingLandingStudy(a.r80Evidence.conceptualRouteNodes);
 for(const landing of r.landingPrototypes){
  assert.equal(landing.landingTriangleInsetInOriginalTerrace,true);
  assert.equal(landing.padVertexCount,3);
  assert(landing.exactTerraceTriangleIndex>=0);
  assert(landing.targetedOriginalTerracePoint.every(Number.isFinite));
  assert.equal(landing.physicalFloorSupportCertified,false);
  assert.equal(landing.entireConnectorSweptCollisionVerified,false);
 }
});
test('R83 only emits local concept connector when intended-wing void and surface screens permit it',()=>{
 const a=pack(true);
 const r=buildR83WingLandingStudy(a.r80Evidence.conceptualRouteNodes);
 assert.equal(r.acceptedForArtStudyOnly+r.rejectedForArtStudy,2);
 for(const p of r.landingPrototypes){
  assert.equal(p.localLandingIsNotApprovedForConstruction,true);
  assert(p.sourceR82Gap>=0);
  assert(p.planLength>=0);
  assert(p.centerlineCollisionScreen.fullDeckSurfaceCollisionNotTested);
  assert(p.centerlineCollisionScreen.headroomAndBodyWidthNotVerified);
  if(p.connectorEmitted){
   assert(p.planLength>=.035&&p.planLength<=.28);
   assert(p.researchSlope<=.28);
   assert.equal(p.centerlineCollisionScreen.obstructions,0);
   assert.equal(p.centerlineCollisionScreen.entersProtectedAtrium,false);
   assert.equal(p.centerlineCollisionScreen.leavesIntendedWing,false);
   assert.deepEqual(p.rejectionReasons,[]);
  }else assert(p.rejectionReasons.length>0);
 }
 assert.equal(r.faces.some(f=>f.kind==='left_local_connection_CONCEPT_NOT_CERTIFIED'),
  r.landingPrototypes[0].connectorEmitted);
 assert.equal(r.faces.some(f=>f.kind==='right_local_connection_CONCEPT_NOT_CERTIFIED'),
  r.landingPrototypes[1].connectorEmitted);
});
test('R83 rejects nonexistent path and never fixes B143 HOLD through side study geometry',()=>{
 assert.throws(()=>buildR83WingLandingStudy({}),/R80_CONCEPT_PUBLIC_PATH_REQUIRED/);
 const r=prepareR83ArchitecturalLandingReview(pack(true));
 assert.equal(r.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(r.r82RecomputedAndAuthenticated,true);
 assert.equal(r.newlyGeneratedResearchTrianglesNotB143Voxels,true);
 assert.equal(r.actualMinecraftWalkingVerified,false);
 assert.equal(r.actualFunctionalLibraryUseVerified,false);
 assert.equal(r.structuralFloorOrLandingApproval,false);
 assert.equal(r.newModelInferenceNotAuthorized,true);
 assert.equal(r.independentHumanCriteria,'NOT_REVIEWED');
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldWrites,0);
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
test('R83 supports compiled older synthetic geometry but not human quality PASS',()=>{
 const r=prepareR83ArchitecturalLandingReview(pack(false));
 assert.equal(r.oldB143Status,'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS');
 assert.equal(r.candidateConnectorCount,2);
 assert.equal(r.oldR81GeometryUnmodified,true);
 assert.equal(r.independentHumanCriteria,'NOT_REVIEWED');
 assert.equal(r.executionAllowed,false);
});
test('R83 rejects changed R82 audit, fake human PASS or different original SHA',()=>{
 const a=pack(false),bad=structuredClone(a.r82Evidence);
 bad.audit.terraces[0].spatialGap=0;
 assert.throws(()=>prepareR83ArchitecturalLandingReview({...a,r82Evidence:bad}),
  /R82_FULL_GEOMETRIC_EVIDENCE_RECOMPUTE_MISMATCH/);
 const fake=structuredClone(a.r82Evidence);
 fake.noHumanMovementOrAestheticPass=false;
 assert.throws(()=>prepareR83ArchitecturalLandingReview({...a,r82Evidence:fake}),
  /R82_FULL_GEOMETRIC_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR83ArchitecturalLandingReview({
  ...a,expectedRawSha256:'f'.repeat(64)}),/FROZEN_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>prepareR83ArchitecturalLandingReview({
  ...pack(true),expectedGeometrySha256:'f'.repeat(64)}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});
test('R83 builds original research OBJ and 4 projected views and blocks overwritten evidence',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r83-wings-'));
 try{
  const a=pack(true),out=writeR83ArchitecturalLandingReview({
   ...a,destination:dir});
  assert(out.addedFaces>=2);
  const json=JSON.parse(fs.readFileSync(path.join(dir,
   'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8'));
  const obj=fs.readFileSync(path.join(dir,
   'R83_READING_WING_LANDING_STUDY.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,
   'R83_BOOKSTACK_ACCESS_GEOMETRY_REVIEW.html'),'utf8');
  assert.equal(json.r82RecomputedAndAuthenticated,true);
  assert.equal(json.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert(obj.includes('g left_contained_landing_PAD_NOT_CERTIFIED'));
  assert(obj.includes('g right_contained_landing_PAD_NOT_CERTIFIED'));
  assert.equal((obj.match(/^f /gm)||[]).length,
   buildR83WingLandingStudy(a.r80Evidence.conceptualRouteNodes).faces.length);
  assert.equal((html.match(/<svg /g)||[]).length,4);
  assert(html.includes('R82_INTERIOR_CLEARANCE_AND_LANDING_REVIEW.html'));
  assert(html.includes('Minecraft'));
  assert.throws(()=>writeR83ArchitecturalLandingReview({
   ...a,destination:dir}),/NO_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

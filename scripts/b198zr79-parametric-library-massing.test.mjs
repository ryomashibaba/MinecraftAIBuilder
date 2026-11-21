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
import {buildR79OriginalMesh,prepareR79ParametricStudy,writeR79ParametricStudy}
 from './b198zr79-parametric-library-massing.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const make=(hold=false)=>{
 const p=r32Courtyard();
 if(hold)p.design.elements.push({id:'invalid',shape:'box',mode:'add',
  material:'stone',origin:[0,p.design.bounds.height,0],size:[2,1,2]});
 const raw=JSON.stringify(p),base={raw,expectedRawSha256:sha(raw),
  b143Status:hold?'HOLD_B143_NOT_COMPILED':
   'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS'};
 if(!hold){
  const c=compileDesign(p.design);
  base.expectedGeometrySha256=c.geometrySha256;
  base.r61Evidence=prepareR61Sections({raw,expectedRawSha256:sha(raw),
   expectedGeometrySha256:c.geometrySha256});
 }
 const r62Evidence=prepareR62FutureDesignGuidance(base);
 const r76Evidence=synthesizeR76ReviewDecisions({...base,r62Evidence});
 const r77Evidence=prepareR77FutureArchitecturalBrief({...base,r62Evidence,r76Evidence});
 const r78Evidence=prepareR78SpatialProgramSpec({...base,r62Evidence,r76Evidence,r77Evidence});
 return {...base,r62Evidence,r76Evidence,r77Evidence,r78Evidence};
};
test('R79 parametric mesh has curved and asymmetric thick wings with genuinely open centre',()=>{
 const m=buildR79OriginalMesh();
 assert(m.facetedTriangles>1000);
 assert(m.leftCrownPeakBound<m.rightCrownPeakBound);
 assert(m.minSampledAirAtriumGap>.40);
 assert(m.minSampledWingDepth>.29);
 assert.equal(m.artStudy.length,m.facetedTriangles);
 assert(m.artStudy.some(f=>f.kind==='left_inner'));
 assert(m.artStudy.some(f=>f.kind==='right_outer'));
 assert(m.artStudy.some(f=>f.kind==='left_reading_terrace'));
 assert(m.artStudy.some(f=>f.kind==='right_reading_terrace'));
 assert(m.artStudy.some(f=>f.kind==='sky_lounge_glass'));
 assert.equal(m.conceptualTerraceGeometryNotCertifiedSupportedFloors,true);
 assert.equal(m.hasNoArchitecturallySafeConstructibleRoutes,true);
 assert.equal(m.humanVisualQuality,'NOT_REVIEWED');
});
test('R79 geometry never fills the central atrium by any opaque outer, inner, terrace or roof surface',()=>{
 const m=buildR79OriginalMesh();
 for(const f of m.artStudy){
  if(f.kind==='sky_lounge_glass')continue;
  const left=f.kind.startsWith('left_');
  const right=f.kind.startsWith('right_');
  assert(left||right);
  for(const p of [f.a,f.b,f.c]){
   if(left)assert(p[0]<-.15);
   if(right)assert(p[0]>.15);
  }
 }
});
test('R79 has only research-grade 3D mass even if older original is B143 HOLD',()=>{
 const r=prepareR79ParametricStudy(make(true));
 assert.equal(r.status,'NEW_ART_STUDY_MESH_NOT_REAL_MODEL_IMPROVEMENT');
 assert.equal(r.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(r.actual3DArtifact,true);
 assert.equal(r.originalArtNotActualQwenOutput,true);
 assert.equal(r.meshNotWatertightOrStructurallyCertified,true);
 assert.equal(r.approvedForModelInference,false);
 assert.equal(r.readyForConstruction,false);
 assert(r.independentHumanCriteria.every(x=>x.reviewStatus==='NOT_REVIEWED'));
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
});
test('R79 is grounded to R78 zones but does not award physical access or model quality',()=>{
 const r=prepareR79ParametricStudy(make(false));
 assert.equal(r.programReferences.length,8);
 assert.equal(r.r78RecomputedAndAuthenticated,true);
 assert.equal(r.svgIsProjectedFromSameMesh,true);
 assert.equal(r.terracesNotWalkabilityCertified,true);
 assert.equal(r.conceptualSkyLoungeNotCertifiedReachable,true);
 assert.equal(r.allHumanCriteria,'NOT_REVIEWED');
 assert.equal(r.dimensionlessGeometry.facetedTriangles,buildR79OriginalMesh().facetedTriangles);
 assert.equal(r.modelCalls,0);
});
test('R79 rejects altered R78 paper graph, human PASS fiction or stale source SHA',()=>{
 const p=make(false),bad=structuredClone(p.r78Evidence);
 bad.programGraphAudit.artisticQualityPass=true;
 assert.throws(()=>prepareR79ParametricStudy({...p,r78Evidence:bad}),
  /R78_SOURCE_EVIDENCE_RECOMPUTE_MISMATCH/);
 const fake=structuredClone(p.r78Evidence);
 fake.humanReviewCriteria[0].visualOrFunctionalHumanEvidence='PASS';
 assert.throws(()=>prepareR79ParametricStudy({...p,r78Evidence:fake}),
  /R78_SOURCE_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR79ParametricStudy({...p,expectedRawSha256:'f'.repeat(64)}),
  /ORIGINAL_MODEL_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>prepareR79ParametricStudy({
  ...make(true),expectedGeometrySha256:'f'.repeat(64)}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});
test('R79 generated OBJ is actual 3D faces, six static views are included and no overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r79-mass-'));
 try{
  const options=make(true);
  const out=writeR79ParametricStudy({...options,destination:dir});
  assert(out.triangleCount>1000);
  const obj=fs.readFileSync(path.join(dir,'R79_TIDAL_LIGHT_ART_STUDY.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,'R79_ARCHITECTURE_FOUR_VIEWS_AND_SECTIONS.html'),'utf8');
  const json=JSON.parse(fs.readFileSync(path.join(dir,'R79_ART_STUDY_EVIDENCE.json'),'utf8'));
  assert(obj.includes('o TidalLightLibrary_R79_ArtStudy'));
  assert(obj.includes('g left_outer')&&obj.includes('g right_inner'));
  assert.equal((obj.match(/^f /gm)||[]).length,out.triangleCount);
  assert((html.match(/<svg /g)||[]).length===6);
  assert(html.includes('正面断面')&&html.includes('俯瞰')&&html.includes('Minecraft'));
  assert(html.includes('R79_TIDAL_LIGHT_ART_STUDY.obj'));
  assert.equal(json.originalArtNotActualQwenOutput,true);
  assert.throws(()=>writeR79ParametricStudy({...options,destination:dir}),/DO_NOT_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

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
import {buildR80CompositeStudy,auditR80ResearchRoutes,
 prepareR80ResearchEvidence,writeR80ResearchGeometry}
 from './b198zr80-supported-route-concept-study.mjs';
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
  a.r61Evidence=prepareR61Sections({raw,
   expectedRawSha256:sha(raw),expectedGeometrySha256:c.geometrySha256});
 }
 a.r62Evidence=prepareR62FutureDesignGuidance(a);
 a.r76Evidence=synthesizeR76ReviewDecisions(a);
 a.r77Evidence=prepareR77FutureArchitecturalBrief(a);
 a.r78Evidence=prepareR78SpatialProgramSpec(a);
 a.r79Evidence=prepareR79ParametricStudy(a);
 return a;
}
test('R80 extends original R79 mesh with multiple actual 3D deck surfaces, landings, brackets and lounge floor',()=>{
 const c=buildR80CompositeStudy();
 assert(c.originalWingAndLoungeFaces>1000);
 assert(c.newlyAddedFaces>300);
 assert.equal(c.totalFaces,c.faces.length);
 assert(c.faces.some(f=>f.kind==='switchback_deck'));
 assert(c.faces.some(f=>f.kind==='flat_landing'));
 assert(c.faces.some(f=>f.kind==='entry_deck'));
 assert(c.faces.some(f=>f.kind==='shell_side_bracket'));
 assert(c.faces.some(f=>f.kind==='lounge_deck'));
 assert(c.faces.some(f=>f.kind==='left_outer'));
 assert(c.faces.some(f=>f.kind==='sky_lounge_glass'));
 assert(c.faces.every(f=>[f.a,f.b,f.c].every(p=>
  p.length===3&&p.every(Number.isFinite))));
 assert(c.originalR79AirAtriumGap>.4);
 assert.equal(c.humanAestheticQuality,'NOT_REVIEWED');
});
test('R80 split routes connect conceptual seaside entrance, both wings and right-side sky lounge',()=>{
 const s=auditR80ResearchRoutes();
 assert.equal(s.conceptRoutes,4);
 assert(s.conceptualSegments>=19);
 assert(s.maximumPlanSlope<.23);
 assert.equal(s.reachesWestReadingWing,true);
 assert.equal(s.reachesEastReadingWing,true);
 assert.equal(s.reachesConceptualSkyLounge,true);
 assert.equal(s.centralRoofHeightVoidPreservedByResearchDecks,true);
 assert.equal(s.realHumanWalkabilityProved,false);
 assert.equal(s.minecraftPlayerRouteCertified,false);
 assert.equal(s.structuralLoadCalculationPassed,false);
});
test('R80 fails closed for missing route link, fake too-steep ascent or crossing atrium',()=>{
 const original={
  entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
  westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
  westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
   [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
  eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
   [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],[.68,.64,.73],
   [.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
 };
 const short=structuredClone(original);
 short.eastAscent[0][0]+=.04;
 assert.throws(()=>auditR80ResearchRoutes(short),
  /PUBLIC_ROUTE_BRANCHES_OR_DESTINATION_DISCONNECTED/);
 const badSlope=structuredClone(original);
 badSlope.westAscent[1][1]=.85;
 assert.throws(()=>auditR80ResearchRoutes(badSlope),
  /CONTINUITY_OR_SLOPE_NOT_ACCEPTABLE_FOR_ART_REVIEW/);
 const crossing=structuredClone(original);
 crossing.entrance[1][2]=-.49;
 assert.throws(()=>auditR80ResearchRoutes(crossing),
  /(OPEN_ATRIUM_CROSSED_BY_DECK|FULL_HEIGHT_ATRIUM_INTRUDED)/);
 const missing=structuredClone(original);
 delete missing.westAscent;
 assert.throws(()=>auditR80ResearchRoutes(missing),
  /REQUIRED_PUBLIC_BRANCHES_MISSING/);
});
test('R80 authenticates prior entire evidence and never implies B143 HOLD is repaired',()=>{
 const a=pack(true),r=prepareR80ResearchEvidence(a);
 assert.equal(r.status,'CONCEPTUAL_STAIR_AND_SUPPORT_RESEARCH_NOT_PLAYABLE');
 assert.equal(r.previousB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(r.r79RecomputedAndAuthenticated,true);
 assert.equal(r.actualNew3DArtStudy,true);
 assert.equal(r.noPhysicalWalkingCertificate,true);
 assert.equal(r.noNewQwenInferenceAuthorized,true);
 assert.equal(r.noRealWorldOrMinecraftConstruction,true);
 assert.equal(r.fullHumanCriteria,'NOT_REVIEWED');
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldWrites,0);
 assert(r.safety.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
test('R80 works on compiled original but does not certify the new conceptual model as finished',()=>{
 const r=prepareR80ResearchEvidence(pack(false));
 assert.equal(r.previousB143Status,
  'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS');
 assert(r.mesh.newFaces>300);
 assert(r.circulationEvidence.maximumPlanSlope<.23);
 assert.equal(r.noHumanArchitecturalPass,true);
 assert.equal(r.geometryProposedButNotBuilt,true);
 assert.equal(r.modelCalls,0);
});
test('R80 rejects replaced R79 study, fabricated old B143 geometry and altered source sha',()=>{
 const a=pack(false),bad=structuredClone(a.r79Evidence);
 bad.allHumanCriteria='PASS';
 assert.throws(()=>prepareR80ResearchEvidence({...a,r79Evidence:bad}),
  /R79_SOURCE_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR80ResearchEvidence({...a,
  expectedRawSha256:'f'.repeat(64)}),/FROZEN_ORIGINAL_SHA_REQUIRED/);
 assert.throws(()=>prepareR80ResearchEvidence({...pack(true),
  expectedGeometrySha256:'f'.repeat(64)}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});
test('R80 creates OBJ face geometry, four views, route-plan and elevation with immutable audit',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r80-mesh-'));
 try{
  const a=pack(true),out=writeR80ResearchGeometry({...a,destination:dir});
  assert(out.triangles>1200);
  const obj=fs.readFileSync(path.join(dir,
   'R80_LIBRARY_RAMP_AND_SUPPORT_STUDY.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,
   'R80_LIBRARY_ACCESS_AND_STRUCTURE_VIEWS.html'),'utf8');
  const report=JSON.parse(fs.readFileSync(path.join(dir,
   'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8'));
  assert(obj.includes('g switchback_deck'));
  assert(obj.includes('g shell_side_bracket'));
  assert(obj.includes('g lounge_deck'));
  assert.equal((obj.match(/^f /gm)||[]).length,out.triangles);
  assert.equal((html.match(/<svg /g)||[]).length,6);
  assert(html.includes('正面')&&html.includes('俯瞰'));
  assert(html.includes('Minecraft'));
  assert.equal(report.r79RecomputedAndAuthenticated,true);
  assert.equal(report.noPhysicalWalkingCertificate,true);
  assert.throws(()=>writeR80ResearchGeometry({...a,destination:dir}),
   /NEVER_OVERWRITE_PREVIOUS_STUDY/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

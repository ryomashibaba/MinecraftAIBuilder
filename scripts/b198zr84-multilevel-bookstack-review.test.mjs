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
import {prepareR83ArchitecturalLandingReview} from './b198zr83-wing-terrace-landing-prototypes.mjs';
import {buildR84MultilevelResearch,prepareR84MultilevelReview,
 writeR84MultilevelReview}
 from './b198zr84-multilevel-bookstack-review.mjs';
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
 a.r83Evidence=prepareR83ArchitecturalLandingReview(a);
 return a;
}
test('R84 reviews seven original geometric bookstack tiers and preserves R83 pads',()=>{
 const a=pack(true),r=buildR84MultilevelResearch(a.r80Evidence.conceptualRouteNodes);
 assert.equal(r.tiers.length,7);
 assert.equal(r.leftTierCount,3);
 assert.equal(r.rightTierCount,4);
 assert.equal(r.originalR83ReusedLandings,2);
 assert.equal(r.newlyPlacedResearchLandings,5);
 assert.equal(r.additionalCandidateLinks,5);
 assert.equal(r.tentativeResearchLinks+r.rejectedAdditionalLinks,5);
 assert.equal(r.sourceFaceCount+r.addedFaces,r.faces.length);
 assert(r.addedFaces>=5);
 assert.equal(r.neverBridgesCentralAtriumAutomatically,true);
 assert.equal(r.multipleFloorsNotCertifiedReachable,true);
 assert(r.faces.every(f=>[f.a,f.b,f.c].every(p=>
  p.length===3&&p.every(Number.isFinite))));
 assert(r.faces.some(f=>f.kind==='sky_lounge_glass'));
});
test('R84 levels correspond to actual R79 three left and four right reading terraces',()=>{
 const a=pack(false),r=buildR84MultilevelResearch(a.r80Evidence.conceptualRouteNodes);
 for(const side of ['left','right']){
  const ts=r.tiers.filter(x=>x.side===side);
  assert.deepEqual(ts.map(x=>x.tier),
   side==='left'?[0,1,2]:[0,1,2,3]);
  assert.equal(ts.filter(x=>x.reuseR83Landing).length,1);
  for(const x of ts){
   assert(x.triangleIndex>=0&&x.padCenter.every(Number.isFinite));
   assert.equal(x.layerIsNotArchitecturallyAccessible,true);
   if(!x.reuseR83Landing){
    assert.equal(x.padVertices.length,3);
    assert(Number.isFinite(x.originalTerraceNearestDistance));
    assert(x.linkCreatedByR84===true||x.rejectionReasons.length>0);
    const type=side+'_tier'+x.tier+'_contained_bookstack_PAD_NOT_ACCESS_CERTIFIED';
    assert(r.faces.some(f=>f.kind===type));
    if(x.linkCreatedByR84){
     assert(x.connectionReview.normalizedSlope<=.24);
     assert.equal(x.connectionReview.surfaceIntersections,0);
     assert.equal(x.connectionReview.crossedVoid,false);
     assert.equal(x.connectionReview.crossedWrongWing,false);
    }
   }
  }
 }
});
test('R84 fail closed on missing public route, cannot manufacture walkability from a paper study',()=>{
 assert.throws(()=>buildR84MultilevelResearch({}),/R80_MULTILEVEL_CONCEPT_NODES_REQUIRED/);
 const a=pack(true),r=prepareR84MultilevelReview(a);
 assert.equal(r.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(r.r83RecomputedAndAuthenticated,true);
 assert.equal(r.allTierResearchLabeledNotConstruction,true);
 assert.equal(r.fullWidthDeckCollisionNotVerified,true);
 assert.equal(r.actualHeadroomAndLandingsNotVerified,true);
 assert.equal(r.minecraftActualWalkingProven,false);
 assert.equal(r.independentArchitecturalQuality,'NOT_REVIEWED');
 assert.equal(r.actualQwenCalls,0);
 assert.equal(r.worldWrites,0);
 assert(r.safety.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
test('R84 B143 compilation of older fixture is not misreported as new buildable bookstack',()=>{
 const r=prepareR84MultilevelReview(pack(false));
 assert.equal(r.oldB143Status,
  'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS');
 assert.equal(r.constructionAllowed,false);
 assert.equal(r.sourceUnmodified,true);
 assert.equal(r.independentArchitecturalQuality,'NOT_REVIEWED');
 assert.equal(r.tiers.length,7);
});
test('R84 refuses altered R83 full evidence, forged human PASS, SHA mismatch and fake B143 compilation',()=>{
 const a=pack(false),bad=structuredClone(a.r83Evidence);
 bad.containedLandingCount=7;
 assert.throws(()=>prepareR84MultilevelReview({...a,r83Evidence:bad}),
  /R83_COMPLETE_EVIDENCE_RECOMPUTE_MISMATCH/);
 const fake=structuredClone(a.r83Evidence);
 fake.actualMinecraftWalkingVerified=true;
 assert.throws(()=>prepareR84MultilevelReview({...a,r83Evidence:fake}),
  /R83_COMPLETE_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR84MultilevelReview({
  ...a,expectedRawSha256:'f'.repeat(64)}),/IMMUTABLE_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>prepareR84MultilevelReview({...pack(true),
  expectedGeometrySha256:'f'.repeat(64)}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});
test('R84 generates full 3D OBJ, four mesh-based views, seven-tier section and immutable audit',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r84-study-'));
 try{
  const a=pack(true),out=writeR84MultilevelReview({...a,destination:dir});
  assert.equal(out.tierCount,7);
  const json=JSON.parse(fs.readFileSync(path.join(dir,
   'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8'));
  const html=fs.readFileSync(path.join(dir,
   'R84_MULTILEVEL_LIBRARY_CIRCULATION_REVIEW.html'),'utf8');
  const obj=fs.readFileSync(path.join(dir,
   'R84_MULTILEVEL_BOOKSTACK_LANDINGS.obj'),'utf8');
  assert.equal(json.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(json.tiers.length,7);
  assert.equal(json.originalR83ReusedLandings,2);
  assert.equal(json.newlyPlacedResearchLandings,5);
  assert.equal((html.match(/<svg /g)||[]).length,5);
  assert(html.includes('Minecraft'));
  assert(html.includes('R83_BOOKSTACK_ACCESS_GEOMETRY_REVIEW.html'));
  assert(obj.includes('o TidalLightLibrary_R84_SevenTierStudy'));
  assert.equal((obj.match(/^f /gm)||[]).length,
   buildR84MultilevelResearch(a.r80Evidence.conceptualRouteNodes).faces.length);
  assert.throws(()=>writeR84MultilevelReview({...a,destination:dir}),
   /DO_NOT_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

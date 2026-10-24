
import test from 'node:test';
import assert from 'node:assert/strict';
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
import {studyR85RouteAlternatives,prepareR85RouteReview,writeR85RouteReview} from './b198zr85-wing-route-alternatives.mjs';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
function pack(){
 const p=r32Courtyard();p.design.elements.push({id:'outside',shape:'box',mode:'add',
  material:'stone',origin:[0,p.design.bounds.height,0],size:[2,1,2]});
 const raw=JSON.stringify(p),a={raw,expectedRawSha256:createHash('sha256').update(raw).digest('hex'),
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
 return a;
}
test('R85 conservatively maps seven tiers and proposes no fictitious bridge',()=>{
 const a=pack(),r=studyR85RouteAlternatives(a.r80Evidence.conceptualRouteNodes);
 assert.equal(r.rows.length,7);assert.equal(r.continuousWalkingProof,false);
 assert.equal(r.massAndAtriumUnmodified,true);
 for(const t of r.rows){
  assert.equal(t.unverifiedPhysicalAccess,true);
  if(!t.existingResearchConnector){
   assert.equal(t.alternatives.length,3);
   assert(t.alternatives.every(q=>q.points.length===3));
  }
 }
});
test('R85 full evidence recompute refuses forged R84 and preserves HOLD',()=>{
 const a=pack(),r=prepareR85RouteReview(a);
 assert.equal(r.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(r.certifiedTravelPaths,0);
 assert.equal(r.humanArtReview,'NOT_REVIEWED');
 assert(r.safety.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 const forged=structuredClone(a.r84Evidence);forged.independentArchitecturalQuality='PASS';
 assert.throws(()=>prepareR85RouteReview({...a,r84Evidence:forged}),/R84_FULL_EVIDENCE_MISMATCH/);
});
test('R85 files generated once, proposal OBJ contains no invented deck faces',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r85-'));
 try{
  const a=pack(),r=writeR85RouteReview({...a,destination:dir});
  assert.equal(r.tierCount,7);
  const obj=fs.readFileSync(path.join(dir,'R85_TENTATIVE_REVIEW_CENTERLINES.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,'R85_SEVEN_TIER_ROUTE_REVIEW.html'),'utf8');
  assert(obj.includes('NOT_A_DECK')||prepareR85RouteReview(a).unresolvedTierCount===0);
  assert(html.includes('R84_MULTILEVEL_LIBRARY_CIRCULATION_REVIEW.html'));
  assert.throws(()=>writeR85RouteReview({...a,destination:dir}),/DO_NOT_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

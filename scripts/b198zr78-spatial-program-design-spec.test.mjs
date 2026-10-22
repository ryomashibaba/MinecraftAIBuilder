import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {prepareR61Sections} from './b198zr61-final-voxel-section-review.mjs';
import {prepareR62FutureDesignGuidance}
 from './b198zr62-evidence-backed-revision-guidance.mjs';
import {synthesizeR76ReviewDecisions}
 from './b198zr76-architecture-next-decisions.mjs';
import {prepareR77FutureArchitecturalBrief}
 from './b198zr77-cohesive-architecture-revision-brief.mjs';
import {auditR78SpatialProgram,prepareR78SpatialProgramSpec,writeR78SpatialProgramSpec}
 from './b198zr78-spatial-program-design-spec.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const B143='B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS';
const pack=(p,hold=false)=>{
 const raw=JSON.stringify(p),base={raw,expectedRawSha256:sha(raw),
  b143Status:hold?'HOLD_B143_NOT_COMPILED':B143};
 if(!hold){
  const compiled=compileDesign(p.design);
  base.expectedGeometrySha256=compiled.geometrySha256;
  base.r61Evidence=prepareR61Sections({raw,
   expectedRawSha256:sha(raw),expectedGeometrySha256:compiled.geometrySha256});
 }
 const r62Evidence=prepareR62FutureDesignGuidance(base);
 const r76Evidence=synthesizeR76ReviewDecisions({...base,r62Evidence});
 const r77Evidence=prepareR77FutureArchitecturalBrief({...base,r62Evidence,r76Evidence});
 return {...base,r62Evidence,r76Evidence,r77Evidence};
};
const held=()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'overshoot',shape:'box',mode:'add',material:'stone',
  origin:[0,p.design.bounds.height,0],size:[2,1,2]});
 return pack(p,true);
};
test('R78 compiled old proposal yields program specification but absolutely no built geometry or quality PASS',()=>{
 const s=prepareR78SpatialProgramSpec(pack(r32Courtyard()));
 assert.equal(s.status,'FUTURE_HUMAN_PROGRAM_SPEC_COMPILED_OLD_BUT_QUALITY_UNVERIFIED');
 assert.equal(s.zones.length,8);
 assert.equal(s.sectionSequence.length,4);
 assert.equal(s.requiredPublicRouteEdges.length,6);
 assert.equal(s.nonWalkableDesignRelations.length,6);
 assert.equal(s.requiredHumanViews.length,6);
 assert.equal(s.programGraphAudit.programDestinationsReachableInPaperGraph,true);
 assert.equal(s.programGraphAudit.geometryOrWalkabilityVerified,false);
 assert.equal(s.independentHumanQualityPass,false);
 assert.equal(s.designCoordinatesNotInvented,true);
 assert.equal(s.modelArchitecturalQualityImproved,false);
 assert.equal(s.approvedForNewModelInference,false);
 assert.equal(s.humanReviewCriteria.length,4);
 assert(s.humanReviewCriteria.every(x=>x.visualOrFunctionalHumanEvidence==='NOT_REVIEWED'));
 assert(s.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(s.safety.BuildPlan.operations,[]);
 assert.equal(s.modelCalls,0);assert.equal(s.worldWrites,0);
});
test('R78 HOLD creates future paper spec but never asserts final B143 voxels exist',()=>{
 const s=prepareR78SpatialProgramSpec(held());
 assert.equal(s.status,'FUTURE_HUMAN_PROGRAM_SPEC_WITH_OLD_B143_HOLD');
 assert.equal(s.programGraphAudit.geometryOrWalkabilityVerified,false);
 assert.equal(s.programGraphAudit.artisticQualityPass,false);
 assert.equal(s.noConsentToUseOldQwenAuthorization,true);
 assert.equal(s.noFrozenSourceOrWorldModification,true);
 assert(s.unresolvedPhysicalDesignEvidence.some(x=>x.includes('not generated')));
});
test('R78 refuses route graph that omits required reading wing or lounge',()=>{
 const s=prepareR78SpatialProgramSpec(pack(r32Courtyard()));
 const p=structuredClone(s);
 p.requiredPublicRouteEdges=p.requiredPublicRouteEdges.filter(e=>
  e.to!=='RIGHT_BOOK_WING');
 assert.throws(()=>auditR78SpatialProgram(p),/UNFINISHED_REQUIRED_PUBLIC_ROUTE/);
 const c=structuredClone(s);
 c.zones=c.zones.filter(z=>z.id!=='GLASS_STARGAZING_LOUNGE');
 assert.throws(()=>auditR78SpatialProgram(c),/REQUIRED_ZONES_MISSING/);
});
test('R78 refuses treating giant central air void or exterior envelope as human walking route',()=>{
 const s=prepareR78SpatialProgramSpec(pack(r32Courtyard()));
 const a=structuredClone(s);
 a.requiredPublicRouteEdges[0].to='CENTRAL_SKY_ATRIUM';
 assert.throws(()=>auditR78SpatialProgram(a),
  /(UNSUPPORTED_ROUTE_OR_DUPLICATE|NON_WALKABLE_VOID_OR_SHELL_AS_ROUTE)/);
 const b=structuredClone(s);
 b.nonWalkableDesignRelations.pop();
 assert.throws(()=>auditR78SpatialProgram(b),/MASS_VOID_RELATIONS_INCOMPLETE/);
 const c=structuredClone(s);
 c.sectionSequence.reverse();
 assert.throws(()=>auditR78SpatialProgram(c),/SECTION_ORDER_OR_COVERAGE_MISMATCH/);
});
test('R78 rejects tampered R77 plan, fabricated c01 PASS, stale original SHA and false final B143',()=>{
 const orig=pack(r32Courtyard());
 const bad=structuredClone(orig.r77Evidence);
 bad.conceptHypothesis.name='FAKE APPROVED CONCEPT';
 assert.throws(()=>prepareR78SpatialProgramSpec({...orig,r77Evidence:bad}),
  /R77_COMPLETE_PROVENANCE_RECALCULATION_MISMATCH/);
 const fake=structuredClone(orig.r77Evidence);
 fake.independentCriteria[0].visualOrFunctionalHumanEvidence='PASS';
 assert.throws(()=>prepareR78SpatialProgramSpec({...orig,r77Evidence:fake}),
  /R77_COMPLETE_PROVENANCE_RECALCULATION_MISMATCH/);
 assert.throws(()=>prepareR78SpatialProgramSpec({
  ...orig,expectedRawSha256:'f'.repeat(64)}),
  /IMMUTABLE_MODEL_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>prepareR78SpatialProgramSpec({
  ...held(),expectedGeometrySha256:'f'.repeat(64)}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});
test('R78 writes immutable offline program JSON and readable section/route HTML',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r78-plan-'));
 try{
  const params=held();
  const out=writeR78SpatialProgramSpec({...params,destination:dir});
  assert.equal(out.modelCalls,0);
  const j=JSON.parse(fs.readFileSync(path.join(dir,
   'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8'));
  const h=fs.readFileSync(path.join(dir,'R78_LIBRARY_SECTIONS_AND_ROUTE_SPEC.html'),'utf8');
  assert.equal(j.programGraphAudit.conceptualZones,8);
  assert(h.includes('中央アトリウム')&&h.includes('ガラスラウンジ'));
  assert(h.includes('R77_COHESIVE_LIBRARY_DESIGN_BRIEF.html'));
  assert(h.includes('Minecraft Education'));
  assert.throws(()=>writeR78SpatialProgramSpec({...params,destination:dir}),
   /NO_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

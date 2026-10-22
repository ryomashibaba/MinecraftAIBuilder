import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {prepareR61Sections} from './b198zr61-final-voxel-section-review.mjs';
import {analyzeR64UnclaimedFloorConnectivity}
 from './b198zr64-unclaimed-floor-connectivity.mjs';
import {assessR66OverheadSpace}
 from './b198zr66-overhead-space-audit.mjs';
import {assessR67SpatialContainment}
 from './b198zr67-spatial-containment-audit.mjs';
import {inspectR68AirContinuity}
 from './b198zr68-horizontal-air-continuity.mjs';
import {analyzeR69VerticalAirAndMotion}
 from './b198zr69-vertical-air-vs-motion.mjs';
import {assessR70ProvisionalEntranceRoutes}
 from './b198zr70-exterior-approach-route-review.mjs';
import {inspectR71AbstractRouteGaps}
 from './b198zr71-abstract-route-gap-triage.mjs';
import {prepareR62FutureDesignGuidance,writeR62FutureDesignGuidance}
 from './b198zr62-evidence-backed-revision-guidance.mjs';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const c01=CREATION_CASES.find(x=>x.id==='c01');
const pack=p=>{
 const raw=JSON.stringify(p),compiled=compileDesign(p.design);
 const r61=prepareR61Sections({raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:compiled.geometrySha256});
 return {raw,compiled,r61};
};
test('R62 uses frozen independent Japanese human criteria, never invents automatic architecture success',()=>{
 const {raw,compiled,r61}=pack(r32Courtyard());
 const before=raw;
 const report=prepareR62FutureDesignGuidance({
  raw,expectedRawSha256:sha(raw),
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  expectedGeometrySha256:compiled.geometrySha256,r61Evidence:r61
 });
 assert.equal(report.b143Status,'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS');
 assert.equal(report.status,'FUTURE_REVISION_CANDIDATE_NOT_ACTIVATED');
 assert.equal(report.independentHumanCriteria.length,c01.criteria.length);
 assert(report.independentHumanCriteria.every(x=>x.assessment==='NOT_REVIEWED'&&
  x.fulfilledByAnySourceMetric===false));
 assert.equal(report.freshConsentRequired,true);
 assert.equal(report.approvedForInference,false);
 assert.equal(report.realModelImprovementDemonstrated,false);
 assert.equal(report.modelCallCount,0);
 assert(report.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(report.safety.BuildPlan.operations,[]);
 assert.equal(raw,before);
 assert(report.proposedOnePassGuidance.includes(c01.prompt));
 assert(!report.evidenceIssues.some(x=>x.kind==='PRESERVE_REQUIRED_AIR'));
});
test('R62 turns a final B143 voxel atrium obstruction into a spatial redesign priority',()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'late-fill',mode:'add',shape:'box',material:'metal',
  origin:[6,1,6],size:[4,4,4]});
 const {raw,compiled,r61}=pack(p);
 const report=prepareR62FutureDesignGuidance({
  raw,expectedRawSha256:sha(raw),
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  expectedGeometrySha256:compiled.geometrySha256,r61Evidence:r61
 });
 const issue=report.evidenceIssues.find(x=>x.kind==='PRESERVE_REQUIRED_AIR');
 assert(issue);assert.equal(issue.basis,
  'R43_FINAL_ABSTRACT_VOXELS_AGAINST_MODEL_DECLARED_PLAN');
 assert.equal(issue.objectiveFinalVoxelEvidence,true);
 assert.equal(issue.measured.occupied,64);
 assert.equal(report.independentHumanCriteria[1].assessment,'NOT_REVIEWED');
 assert.equal(report.generatedGeometry,false);
});
test('R62 diagnoses the original held source without fabricating final voxel spaces or R61 evidence',()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'outside-top',mode:'add',shape:'box',
  material:'glow',origin:[1,p.design.bounds.height,1],size:[2,1,2]});
 const raw=JSON.stringify(p);
 const report=prepareR62FutureDesignGuidance({
  raw,expectedRawSha256:sha(raw),b143Status:'HOLD_B143_NOT_COMPILED'
 });
 assert.equal(report.finalConceptualGeometrySha256,null);
 assert(report.evidenceIssues.some(x=>x.kind==='STRICT_B143_HOLD'));
 assert(report.evidenceIssues.some(x=>x.kind==='ELEMENT_OUTSIDE_LOCAL_BOUNDS'));
 assert(!report.evidenceIssues.some(x=>x.objectiveFinalVoxelEvidence));
 assert.equal(report.r61Status,null);
 assert.equal(report.approvedForInference,false);
});
test('R62 malformed source never invented spatial sections; no automatic model repair',()=>{
 const raw='{"design":';
 const report=prepareR62FutureDesignGuidance({
  raw,expectedRawSha256:sha(raw),b143Status:'HOLD_B143_NOT_COMPILED'
 });
 assert(report.evidenceIssues.some(x=>x.kind==='UNPARSEABLE_JSON'));
 assert.equal(report.generatedGeometry,false);
 assert.equal(report.priorModelOriginalRepaired,false);
});
test('R62 refuses dishonest source, wrong compiled geometry, and invented R61 on B143 HOLD',()=>{
 const p=pack(r32Courtyard());
 const options={raw:p.raw,expectedRawSha256:sha(p.raw),
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  expectedGeometrySha256:p.compiled.geometrySha256,r61Evidence:p.r61};
 assert.throws(()=>prepareR62FutureDesignGuidance({
  ...options,expectedRawSha256:'0'.repeat(64)}),
  /FROZEN_ORIGINAL_REQUIRED/);
 assert.throws(()=>prepareR62FutureDesignGuidance({
  ...options,expectedGeometrySha256:'f'.repeat(64)}),
  /R61_SOURCE_OR_GEOMETRY_PROVENANCE_MISMATCH/);
 assert.throws(()=>prepareR62FutureDesignGuidance({
  raw:p.raw,expectedRawSha256:sha(p.raw),
  b143Status:'HOLD_B143_NOT_COMPILED',r61Evidence:p.r61}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});
test('R62 new output only, no overwrite, with human review still pending',()=>{
 const p=pack(r32Courtyard());
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r62-revision-'));
 const opts={raw:p.raw,expectedRawSha256:sha(p.raw),
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  expectedGeometrySha256:p.compiled.geometrySha256,r61Evidence:p.r61,
  destination:dir};
 try{
  const r=writeR62FutureDesignGuidance(opts);
  assert.equal(r.status,'FUTURE_REVISION_CANDIDATE_NOT_ACTIVATED');
  const html=fs.readFileSync(path.join(dir,'R62_NEXT_DESIGN_REVIEW.html'),'utf8');
  assert(html.includes('将来'));assert(html.includes('未実行'));
  const j=JSON.parse(fs.readFileSync(path.join(dir,'R62_NEXT_DESIGN_EVIDENCE.json')));
  assert.equal(j.independentHumanCriteria[0].assessment,'NOT_REVIEWED');
  assert.equal(j.worldWrites,0);
  assert.throws(()=>writeR62FutureDesignGuidance(opts),
   /NEVER_OVERWRITE_DERIVED_REVIEW/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

test('R62 integrates independently reproduced R64 full-building network findings',()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'isolated-high-deck',shape:'box',mode:'add',
  material:'wood',origin:[2,8,2],size:[5,1,5]});
 const {raw,compiled,r61}=pack(p);
 const opts={raw,expectedRawSha256:sha(raw),
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  expectedGeometrySha256:compiled.geometrySha256,r61Evidence:r61};
 const r64Evidence=analyzeR64UnclaimedFloorConnectivity({
  raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:compiled.geometrySha256});
 const report=prepareR62FutureDesignGuidance({...opts,r64Evidence});
 assert.equal(report.modelIndependentNetworkEvidenceUsed,true);
 assert.equal(report.r65NetworkAuditStatus,'CONCEPT_NETWORK_FEEDBACK_DERIVED_NOT_APPLIED');
 const problem=report.evidenceIssues.find(x=>
  x.kind==='NO_LOW_LEVEL_CANDIDATE_IN_SOME_COMPONENTS');
 assert(problem);
 assert.equal(problem.objectiveFinalVoxelEvidence,true);
 assert.equal(problem.independentHumanReviewRequired,true);
 assert.equal(problem.automaticReject,false);
 assert(report.proposedOnePassGuidance.includes('NO_LOW_LEVEL_CANDIDATE_IN_SOME_COMPONENTS'));
 assert.equal(report.independentHumanCriteria.length,4);
 assert(report.independentHumanCriteria.every(x=>x.assessment==='NOT_REVIEWED'));
 assert.equal(report.approvedForInference,false);
});
test('R62 refuses injected R64 summary and does not invent final voxels for B143 HOLD',()=>{
 const {raw,compiled,r61}=pack(r32Courtyard());
 const valid=analyzeR64UnclaimedFloorConnectivity({
  raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:compiled.geometrySha256});
 const forged=structuredClone(valid);
 forged.metrics.conceptualMotionComponents+=2;
 const shared={raw,expectedRawSha256:sha(raw),
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  expectedGeometrySha256:compiled.geometrySha256,r61Evidence:r61};
 assert.throws(()=>prepareR62FutureDesignGuidance({
  ...shared,r64Evidence:forged}),/R64_NUMERICAL_EVIDENCE_TAMPER_OR_STALE/);
 assert.throws(()=>prepareR62FutureDesignGuidance({
  raw,expectedRawSha256:sha(raw),b143Status:'HOLD_B143_NOT_COMPILED',
  r64Evidence:valid}),/NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});

test('R62 integrates validated R66 open-air-versus-overhead evidence without passing architecture',()=>{
 const p=r32Courtyard();
 p.design.elements=[{id:'open-public-platform',shape:'box',mode:'add',
  material:'stone',origin:[0,0,0],size:[10,1,10]}];
 const {raw,compiled,r61}=pack(p);
 const evidence=assessR66OverheadSpace({raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:compiled.geometrySha256});
 const report=prepareR62FutureDesignGuidance({
  raw,expectedRawSha256:sha(raw),
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  expectedGeometrySha256:compiled.geometrySha256,r61Evidence:r61,
  r66Evidence:evidence});
 assert.equal(report.r66OverheadSourceIndependentUsed,true);
 assert.equal(report.r66CoveredStandingPositions,0);
 assert(report.evidenceIssues.some(x=>
  x.kind==='NO_STANDING_POSITION_HAS_ANY_OVERHEAD_SOLID'&&
  x.automaticReject===false));
 assert.equal(report.independentHumanCriteria.length,4);
 assert(report.independentHumanCriteria.every(x=>x.assessment==='NOT_REVIEWED'));
 assert.equal(report.approvedForInference,false);
});
test('R62 refuses R66 forged metrics and R66 final voxels if B143 HOLD',()=>{
 const {raw,compiled,r61}=pack(r32Courtyard());
 const valid=assessR66OverheadSpace({
  raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:compiled.geometrySha256});
 const forged=structuredClone(valid);
 forged.metrics.positionsWithAnyOverheadSolid++;
 const base={raw,expectedRawSha256:sha(raw),
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  expectedGeometrySha256:compiled.geometrySha256,r61Evidence:r61};
 assert.throws(()=>prepareR62FutureDesignGuidance({...base,
  r66Evidence:forged}),/R66_OVERHEAD_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR62FutureDesignGuidance({
  raw,expectedRawSha256:sha(raw),b143Status:'HOLD_B143_NOT_COMPILED',
  r66Evidence:valid}),/NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});

test('R62 consumes R67 room-proximity warning but preserves architectural creativity and human review',()=>{
 const p=r32Courtyard();
 p.design.elements=[
  {id:'floor',shape:'box',mode:'add',origin:[0,0,0],size:[12,1,12],material:'wood'},
  {id:'roof',shape:'box',mode:'add',origin:[0,6,0],size:[12,1,12],material:'glass'}
 ];
 const {raw,compiled,r61}=pack(p);
 const expectedRawSha256=sha(raw),
  expectedGeometrySha256=compiled.geometrySha256;
 const r66Evidence=assessR66OverheadSpace({raw,expectedRawSha256,expectedGeometrySha256});
 const r67Evidence=assessR67SpatialContainment({raw,expectedRawSha256,expectedGeometrySha256});
 const report=prepareR62FutureDesignGuidance({raw,expectedRawSha256,
  expectedGeometrySha256,b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  r61Evidence:r61,r66Evidence,r67Evidence});
 assert.equal(report.r67SourceIndependentUsed,true);
 assert.equal(report.r67ContainmentReviewStatus,'ROOF_AND_NEARBY_SOLID_PROXY_FOR_HUMAN_REVIEW');
 assert(report.evidenceIssues.some(x=>x.kind==='ROOFED_FLOORS_WITHOUT_3_NEARBY_SIDE_DIRECTIONS'));
 assert(report.evidenceIssues.some(x=>x.kind==='NO_ROOFED_3_DIRECTION_2X2_ROOM_PROXY'));
 assert(report.evidenceIssues.filter(x=>x.basis===
  'R67_FINAL_VOXEL_ROOF_AND_SIDE_SOLID_PROXY').every(x=>x.automaticReject===false));
 assert.equal(report.approvedForInference,false);
 assert(report.independentHumanCriteria.every(x=>x.assessment==='NOT_REVIEWED'));
});
test('R62 rejects forged R67 counts, cross-tool contradictions and B143 HOLD R67',()=>{
 const p=r32Courtyard(),{raw,compiled,r61}=pack(p);
 const expectedRawSha256=sha(raw),expectedGeometrySha256=compiled.geometrySha256;
 const good=assessR67SpatialContainment({raw,expectedRawSha256,expectedGeometrySha256});
 const altered=structuredClone(good);
 altered.metrics.roofedPositionsWith3PlusSideDirectionsWithin24++;
 const args={raw,expectedRawSha256,expectedGeometrySha256,
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',r61Evidence:r61};
 assert.throws(()=>prepareR62FutureDesignGuidance({...args,r67Evidence:altered}),
  /R67_SPATIAL_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR62FutureDesignGuidance({raw,expectedRawSha256,
  b143Status:'HOLD_B143_NOT_COMPILED',r67Evidence:good}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});

test('R62 incorporates connected-air review without claiming closed pocket is usable room',()=>{
 const p=r32Courtyard();
 p.design.elements=[
  {id:'floor',shape:'box',mode:'add',origin:[0,0,0],
   size:[12,1,12],material:'stone'},
  {id:'roof',shape:'box',mode:'add',origin:[0,6,0],
   size:[12,1,12],material:'glass'},
  {id:'west',shape:'box',mode:'add',origin:[0,1,0],
   size:[1,5,12],material:'stone'},
  {id:'east',shape:'box',mode:'add',origin:[11,1,0],
   size:[1,5,12],material:'stone'},
  {id:'north',shape:'box',mode:'add',origin:[0,1,0],
   size:[12,5,1],material:'stone'},
  {id:'south',shape:'box',mode:'add',origin:[0,1,11],
   size:[12,5,1],material:'stone'}
 ];
 const {raw,compiled,r61}=pack(p),expectedRawSha256=sha(raw),
  expectedGeometrySha256=compiled.geometrySha256;
 const r64Evidence=analyzeR64UnclaimedFloorConnectivity({raw,
  expectedRawSha256,expectedGeometrySha256});
 const r66Evidence=assessR66OverheadSpace({raw,
  expectedRawSha256,expectedGeometrySha256});
 const r67Evidence=assessR67SpatialContainment({raw,
  expectedRawSha256,expectedGeometrySha256});
 const r68Evidence=inspectR68AirContinuity({raw,
  expectedRawSha256,expectedGeometrySha256});
 const report=prepareR62FutureDesignGuidance({raw,
  expectedRawSha256,expectedGeometrySha256,
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  r61Evidence:r61,r64Evidence,r66Evidence,r67Evidence,r68Evidence});
 assert.equal(report.r68AirTopologyIndependentUsed,true);
 assert.equal(report.r68SealedCoveredPositions,100);
 assert(report.evidenceIssues.some(x=>x.kind===
  'LATERALLY_SEALED_AIR_POCKETS_NEED_ACCESS_REVIEW'&&
  x.automaticReject===false));
 assert.equal(report.realModelImprovementDemonstrated,false);
 assert.equal(report.approvedForInference,false);
 assert(report.independentHumanCriteria.every(x=>x.assessment==='NOT_REVIEWED'));
});
test('R62 rejects forged R68 evidence and disallows false B143-final air for HOLD',()=>{
 const {raw,compiled,r61}=pack(r32Courtyard());
 const expectedRawSha256=sha(raw),
  expectedGeometrySha256=compiled.geometrySha256;
 const original=inspectR68AirContinuity({raw,expectedRawSha256,
  expectedGeometrySha256});
 const forged=structuredClone(original);
 forged.metrics.roofedStandingInLaterallySealedAirPockets++;
 assert.throws(()=>prepareR62FutureDesignGuidance({raw,
  expectedRawSha256,expectedGeometrySha256,r61Evidence:r61,
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  r68Evidence:forged}),/R68_AIR_TOPOLOGY_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR62FutureDesignGuidance({raw,
  expectedRawSha256,b143Status:'HOLD_B143_NOT_COMPILED',
  r68Evidence:original}),/NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});

test('R62 includes R69 disconnected supported floors despite vertically continuous air',()=>{
 const p=r32Courtyard();
 p.design.elements=[
  {id:'base',shape:'box',mode:'add',material:'stone',origin:[0,0,0],size:[12,1,12]},
  {id:'upper',shape:'box',mode:'add',material:'stone',origin:[0,5,0],size:[12,1,12]},
  {id:'shaft',shape:'box',mode:'cut',origin:[5,5,5],size:[1,1,1]}
 ];
 const {raw,compiled,r61}=pack(p),expectedRawSha256=sha(raw),
  expectedGeometrySha256=compiled.geometrySha256;
 const r64Evidence=analyzeR64UnclaimedFloorConnectivity({raw,
  expectedRawSha256,expectedGeometrySha256});
 const r68Evidence=inspectR68AirContinuity({raw,
  expectedRawSha256,expectedGeometrySha256});
 const r69Evidence=analyzeR69VerticalAirAndMotion({raw,
  expectedRawSha256,expectedGeometrySha256});
 const report=prepareR62FutureDesignGuidance({
  raw,expectedRawSha256,expectedGeometrySha256,
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  r61Evidence:r61,r64Evidence,r68Evidence,r69Evidence});
 assert.equal(report.r69IndependentVerticalGraphUsed,true);
 assert.equal(report.r69SupportedInterlevelEdges,0);
 assert(report.evidenceIssues.some(x=>x.kind===
  'VERTICAL_AIR_CONNECTED_BUT_SUPPORTED_TRAVEL_DISCONNECTED'&&
  x.automaticReject===false));
 assert.equal(report.independentHumanCriteria.length,4);
 assert(report.independentHumanCriteria.every(x=>x.assessment==='NOT_REVIEWED'));
 assert.equal(report.approvedForInference,false);
});
test('R62 rejects injected R69 geometry graph data and B143-HOLD source',()=>{
 const {raw,compiled,r61}=pack(r32Courtyard()),
  expectedRawSha256=sha(raw),expectedGeometrySha256=compiled.geometrySha256;
 const good=analyzeR69VerticalAirAndMotion({raw,expectedRawSha256,
  expectedGeometrySha256});
 const forged=structuredClone(good);
 forged.metrics.abstractSupportedMotionInterlevelEdges++;
 assert.throws(()=>prepareR62FutureDesignGuidance({raw,expectedRawSha256,
  expectedGeometrySha256,r61Evidence:r61,
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  r69Evidence:forged}),/R69_VERTICAL_GRAPH_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR62FutureDesignGuidance({raw,expectedRawSha256,
  b143Status:'HOLD_B143_NOT_COMPILED',r69Evidence:good}),
  /NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});

test('R62 R70 upper-floor approach regression remains future human guidance only',()=>{
 const p=r32Courtyard();
 p.design.elements=[
  {id:'floor',shape:'box',mode:'add',material:'stone',origin:[0,0,0],size:[12,1,12]},
  {id:'upper',shape:'box',mode:'add',material:'stone',origin:[0,5,0],size:[12,1,12]}
 ];
 const {raw,compiled,r61}=pack(p),
  expectedRawSha256=sha(raw),
  expectedGeometrySha256=compiled.geometrySha256;
 const r64Evidence=analyzeR64UnclaimedFloorConnectivity({
  raw,expectedRawSha256,expectedGeometrySha256});
 const r69Evidence=analyzeR69VerticalAirAndMotion({
  raw,expectedRawSha256,expectedGeometrySha256});
 const r70Evidence=assessR70ProvisionalEntranceRoutes({
  raw,expectedRawSha256,expectedGeometrySha256});
 const report=prepareR62FutureDesignGuidance({
  raw,expectedRawSha256,expectedGeometrySha256,
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  r61Evidence:r61,r64Evidence,r69Evidence,r70Evidence});
 assert.equal(report.r70IndependentApproachUsed,true);
 assert.equal(report.r70ReachedHigherSupportPositions,0);
 assert(report.evidenceIssues.some(x=>x.kind===
  'LOW_LEVEL_CANDIDATES_DO_NOT_REACH_ANY_UPPER_SUPPORT'&&
  x.automaticReject===false));
 assert.equal(report.freshConsentRequired,true);
 assert.equal(report.approvedForInference,false);
 assert(report.independentHumanCriteria.every(x=>x.assessment==='NOT_REVIEWED'));
});
test('R62 R70 recomputes numeric evidence and B143 HOLD cannot claim real voxels',()=>{
 const {raw,compiled,r61}=pack(r32Courtyard());
 const expectedRawSha256=sha(raw),
  expectedGeometrySha256=compiled.geometrySha256;
 const good=assessR70ProvisionalEntranceRoutes({
  raw,expectedRawSha256,expectedGeometrySha256});
 const tampered=structuredClone(good);
 tampered.metrics.lowLevelClearAirRayApproachCandidates++;
 assert.throws(()=>prepareR62FutureDesignGuidance({
  raw,expectedRawSha256,expectedGeometrySha256,r61Evidence:r61,
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS',
  r70Evidence:tampered}),/R70_PROVISIONAL_APPROACH_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR62FutureDesignGuidance({
  raw,expectedRawSha256,b143Status:'HOLD_B143_NOT_COMPILED',
  r70Evidence:good}),/NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});

test('R62 uses R71 disconnected component coordinates only as human review',()=>{
 const p=r32Courtyard();
 p.design.elements=[
  {id:'ground',shape:'box',mode:'add',origin:[0,0,0],size:[12,1,12],material:'stone'},
  {id:'upper',shape:'box',mode:'add',origin:[0,5,0],size:[12,1,12],material:'wood'}
 ];
 const {raw,compiled,r61}=pack(p),expectedRawSha256=sha(raw),
  expectedGeometrySha256=compiled.geometrySha256;
 const r70Evidence=assessR70ProvisionalEntranceRoutes({
  raw,expectedRawSha256,expectedGeometrySha256});
 const r71Evidence=inspectR71AbstractRouteGaps({
  raw,expectedRawSha256,expectedGeometrySha256,r70Evidence});
 const report=prepareR62FutureDesignGuidance({
  raw,expectedRawSha256,expectedGeometrySha256,r61Evidence:r61,r70Evidence,r71Evidence,
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS'});
 assert.equal(report.r71SourceVerifiedRouteGapUsed,true);
 assert.equal(report.r71DisconnectedComponentCount,1);
 const gap=report.evidenceIssues.find(x=>x.kind==='R71_DISCONNECTED_SUPPORT_GAPS_TO_INSPECT');
 assert(gap);
 assert.deepEqual(gap.exampleDisconnectedComponents[0].closestReachedSupportedLocal.length,3);
 assert.equal(gap.exampleDisconnectedComponents[0].bridgeGeometryProposed,false);
 assert.equal(gap.automaticReject,false);
 assert.equal(report.approvedForInference,false);
 assert(report.independentHumanCriteria.every(x=>x.assessment==='NOT_REVIEWED'));
});
test('R62 refuses R71 forged counts or unauthenticated R70 source',()=>{
 const {raw,compiled,r61}=pack(r32Courtyard()),
  expectedRawSha256=sha(raw),expectedGeometrySha256=compiled.geometrySha256;
 const r70Evidence=assessR70ProvisionalEntranceRoutes({
  raw,expectedRawSha256,expectedGeometrySha256});
 const r71Evidence=inspectR71AbstractRouteGaps({
  raw,expectedRawSha256,expectedGeometrySha256,r70Evidence});
 const forged=structuredClone(r71Evidence);
 forged.metrics.originalR70ProvisionalApproachSeeds++;
 const base={raw,expectedRawSha256,expectedGeometrySha256,r61Evidence:r61,
  b143Status:'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS'};
 assert.throws(()=>prepareR62FutureDesignGuidance({...base,
  r70Evidence,r71Evidence:forged}),/R71_GAP_EVIDENCE_RECOMPUTE_MISMATCH/);
 assert.throws(()=>prepareR62FutureDesignGuidance({...base,
  r71Evidence}),/R71_REQUIRES_ORIGINAL_R70_REVIEW_EVIDENCE/);
 assert.throws(()=>prepareR62FutureDesignGuidance({
  raw,expectedRawSha256,b143Status:'HOLD_B143_NOT_COMPILED',
  r71Evidence}),/NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD/);
});

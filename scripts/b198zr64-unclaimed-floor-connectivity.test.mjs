import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {analyzeR64UnclaimedFloorConnectivity,writeR64UnclaimedFloorConnectivity}
 from './b198zr64-unclaimed-floor-connectivity.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const run=p=>{
 const raw=JSON.stringify(p),compiled=compileDesign(p.design);
 return analyzeR64UnclaimedFloorConnectivity({
  raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:compiled.geometrySha256});
};
test('R64 audits every abstract supported/clear standing position without trusting spatialPlan',()=>{
 const p=r32Courtyard(),a=run(p),q=structuredClone(p);
 q.spatialPlan={entrance:[999,999,999],headroom:500,
  destinations:[],protectedVoids:[],functionalZones:[]};
 const b=run(q);
 assert.deepEqual(a.metrics,b.metrics);
 assert.deepEqual(a.possibleSpatialConcerns,b.possibleSpatialConcerns);
 assert.equal(a.spatialPlanReadOrTrusted,false);
 assert.equal(a.metrics.supportedTwoHighStandingPositions>0,true);
 assert.equal(a.metrics.largestComponentPositions>0,true);
 assert(a.metrics.sameLevel2x2ClearPadCount>0);
 assert.equal(a.exhaustiveStandingCellCoverageVerified,true);
 assert.equal(a.independentArchitecturalQuality,'NOT_REVIEWED');
 assert.equal(a.minecraftCollisionOrWalkingNotVerified,true);
 assert(a.safety.gates.every(v=>v==='BLOCKED'));
 assert.deepEqual(a.safety.BuildPlan.operations,[]);
 assert.equal(a.modelCalls,0);assert.equal(a.worldWrites,0);
});
test('R64 finds a disconnected elevated floor even if model claims accessible zones',()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'upper-floating-deck',shape:'box',mode:'add',
  origin:[2,8,2],size:[5,1,5],material:'stone'});
 const r=run(p);
 assert(r.metrics.conceptualMotionComponents>=2);
 assert(r.metrics.positionsInComponentsWithoutLowLevelCandidates>=25);
 assert(r.metrics.candidateStandingByY.some(x=>x.y===9&&x.count>=25));
 assert(r.possibleSpatialConcerns.some(x=>
  x.kind==='NO_LOW_LEVEL_CANDIDATE_IN_SOME_COMPONENTS'));
 assert.equal(r.possibleSpatialConcerns.every(x=>x.automaticReject===false),true);
 assert.equal(r.publicAccessNotVerified,true);
});
test('R64 detects narrow-only clear support without declaring unsafe Minecraft walking',()=>{
 const p=r32Courtyard();
 p.design.elements=[{id:'one-cell-wide-floor',shape:'box',
  mode:'add',material:'wood',origin:[0,0,0],size:[1,1,10]}];
 const r=run(p);
 assert.equal(r.metrics.supportedTwoHighStandingPositions,10);
 assert.equal(r.metrics.sameLevel2x2ClearPadCount,0);
 assert.equal(r.metrics.conceptualMotionComponents,1);
 assert(r.possibleSpatialConcerns.some(x=>x.kind===
  'NO_SAME_LEVEL_2X2_CLEAR_STANDING_PAD'));
 assert.equal(r.stairAndDoorPhysicalSafetyNotCertified,true);
});
test('R64 refuses mismatched original SHA, stale geometry and invalid source',()=>{
 const p=r32Courtyard(),raw=JSON.stringify(p),
  c=compileDesign(p.design);
 assert.throws(()=>analyzeR64UnclaimedFloorConnectivity({
  raw,expectedRawSha256:'0'.repeat(64),
  expectedGeometrySha256:c.geometrySha256}),/IMMUTABLE_SOURCE_AND_GEOMETRY_SHA_REQUIRED/);
 assert.throws(()=>analyzeR64UnclaimedFloorConnectivity({
  raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:'0'.repeat(64)}),/B143_VERIFIED_GEOMETRY_SHA_MISMATCH/);
 const bad=structuredClone(p);
 bad.design.elements.push({id:'outside',shape:'box',mode:'add',
  origin:[0,bad.design.bounds.height,0],size:[2,1,2],material:'glass'});
 const corrupt=JSON.stringify(bad);
 assert.throws(()=>analyzeR64UnclaimedFloorConnectivity({
  raw:corrupt,expectedRawSha256:sha(corrupt),
  expectedGeometrySha256:c.geometrySha256}),/B143_FINAL_GEOMETRY_REQUIRED/);
});
test('R64 writes fresh HTML and JSON without any source repair or model call',()=>{
 const p=r32Courtyard(),raw=JSON.stringify(p),c=compileDesign(p.design);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r64-independent-'));
 try{
  const opts={raw,expectedRawSha256:sha(raw),
   expectedGeometrySha256:c.geometrySha256,destination:dir};
  const result=writeR64UnclaimedFloorConnectivity(opts);
  assert(result.standingPositions>0);
  assert.equal(result.modelCalls,0);
  const evidence=JSON.parse(fs.readFileSync(path.join(dir,'R64_INDEPENDENT_FLOOR_NETWORK.json')));
  assert.equal(evidence.spatialPlanReadOrTrusted,false);
  const html=fs.readFileSync(path.join(dir,'R64_FLOOR_CONNECTIVITY_REVIEW.html'),'utf8');
  assert(html.includes('自己申告'));assert(html.includes('Minecraft'));
  assert.throws(()=>writeR64UnclaimedFloorConnectivity(opts),/REVIEW_OUTPUT_EXISTS/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

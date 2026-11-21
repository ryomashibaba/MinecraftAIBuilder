import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileArchitecturePlan,auditArchitecturePlanCirculation,assessR125ProgramGeometry}
 from '../source/ai/r125-architecture-plan.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
const FILES=[
 {
  path:'./fixtures/r125-qwen14b-shop-20261024.json',
  title:'Minimalist Shop with Front and Back Zones',
  planSha:'e7a6f04c7aa6760805939a90ecce43d42a40cd68c9458d9591fe43ea76824e71',
  sourceSha:'05223596d3bfa47b5d408eb05343fdcaaae4c084d18ccf4839be1f3cd088c05d',
  geometrySha:'693edc6c969ef5c295d8ef84b499cc8140c3ab8ab550a00e500ae915256edb28',
  voxels:933,standingYs:[2,7],high:0,semanticRooms:2
 },
 {
  path:'./fixtures/r125-qwen14b-research-20261024.json',
  title:'Research Haven',
  planSha:'aaa0521547a284c2170be3cc8c5db9195f6a953faeb05655f68b474938d3ab87',
  sourceSha:'662a79ac44d9ed0cc9d9e49bbc644a25b2e8237a25d7832fa1f8be4e3c3f32c6',
  geometrySha:'c855de91535e632b2a97dc28a93d8a8cb92d5720d26f8df6f8379b2dc8c284af',
  voxels:2936,standingYs:[2,7,12,13,14,15],high:1,semanticRooms:4
 }
];
test('the TWO real 2026-10-24 Qwen14B model plans exactly replay genuine voxel geometry',()=>{
 const seen=new Set();
 for(const expected of FILES){
  const plan=JSON.parse(fs.readFileSync(new URL(expected.path,import.meta.url),'utf8'));
  assert.equal(plan.title,expected.title);
  const result=compileArchitecturePlan(plan);
  assert.equal(result.planSha256,expected.planSha);
  assert.equal(result.sourceSha256,expected.sourceSha);
  assert.equal(result.geometrySha256,expected.geometrySha);
  assert.equal(result.compiled.primitives.length,expected.voxels);
  assert.equal(result.program.flatMap(x=>x.zones).length,expected.semanticRooms);
  assert.deepEqual(result.compiled.BuildPlan.operations,[]);
  assert.equal(result.worldWrites,0);
  const critique=critiqueArchitecture({design:result.design,compiled:result.compiled});
  assert.deepEqual(critique.objectiveAudit.elevationConnectivity.map(x=>x.standingY),
   expected.standingYs);
  assert.equal(critique.highRiskCount,expected.high);
  const circulation=auditArchitecturePlanCirculation(result);
  assert.equal(circulation.status,'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(circulation.continuousRealPlayerPathCertified,false);
  const risk=assessR125ProgramGeometry(result,critique);
  assert.equal(risk.programFloorIssues.length,0);
  assert.equal(risk.worldWalking,'NOT_TESTED');
  if(expected.high){
   assert.equal(risk.status,'PROGRAM_FLOORS_CLEAR_EXTERIOR_REVIEW_REQUIRED');
   assert.deepEqual(risk.exteriorSurfaceAdvisories.map(x=>x.standingY),
    [12,13,14]);
  }else assert.equal(risk.status,'PROGRAM_FLOORS_CLEAR');
  // Source geometry has no features that refer to a modeled zone identifier,
  // despite the rich string purposes emitted by the model.
  const named=plan.levels.flatMap(l=>l.spaces.map(s=>s.id));
  assert.ok(!result.design.elements.some(e=>named.some(id=>e.id.includes(id))));
  seen.add(result.geometrySha256);
 }
 assert.equal(seen.size,2);
});
test('shop front/back semantic positions are not guaranteed by split axis',()=>{
 const x=JSON.parse(fs.readFileSync(new URL(FILES[0].path,import.meta.url),'utf8'));
 assert.equal(x.levels[0].splitAxis,'x');
 const y=compileArchitecturePlan(x);
 assert.equal(y.program[0].splitAxis,'x');
 // "front" and "back" are user meanings, NOT modeled spatial relations:
 assert.equal(y.program[0].zones[0].id,'front-retail-space');
 assert.equal(y.program[0].zones[1].id,'back-employee-space');
 assert.equal(y.program[0].zones[0].range.z[0],
  y.program[0].zones[1].range.z[0]);
 assert.equal(y.inGameWalking,'NOT_TESTED');
});

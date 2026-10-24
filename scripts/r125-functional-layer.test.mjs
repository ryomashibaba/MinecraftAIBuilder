import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
import {applyR125FeatureIntent,SCHEMA as FEATURES}
 from '../source/ai/r125-functional-layer.mjs';
const fixture=id=>JSON.parse(fs.readFileSync(new URL(
 './fixtures/r125-qwen14b-'+id+'-20261024.json',import.meta.url),'utf8'));
const originalHouse=()=>JSON.parse(fs.readFileSync(new URL(
 './fixtures/r125-qwen14b-residential-2024a.json',import.meta.url),'utf8'));
test('actual three user-supplied Qwen designs: interior entrance reaches all functional zones in SOURCE graph',()=>{
 const plans=[originalHouse(),fixture('shop'),fixture('research')];
 const expected=[2620,933,2936];
 for(let i=0;i<plans.length;i++){
  const base=compileArchitecturePlan(plans[i]);
  assert.equal(base.compiled.primitives.length,expected[i]);
  const a=auditR125SourceRoutes(base);
  assert.equal(a.status,'SOURCE_ROUTES_REACH_ALL_ZONES',JSON.stringify(a.issues));
  assert.equal(a.zones.length,plans[i].levels.length*2);
  assert.ok(a.reachedPadCount>40);
  assert.equal(a.continuousRealPlayerPathCertified,false);
  assert.equal(a.worldWrites,0);
  if(plans[i].levels.length===2)
   assert.ok(a.zones.some(z=>z.level===1&&z.reachedFromEntrance));
 }
});
test('new obstruction through the only internal doorway must HOLD even with clear zone floor witnesses',()=>{
 const p=fixture('shop'),b=compileArchitecturePlan(p);
 const d=structuredClone(b.design);
 const door=d.elements.find(x=>x.id==='l0-internal-door');
 assert.ok(door);
 d.elements.push({id:'deliberate-blocked-interior-portal',shape:'box',
  mode:'add',material:'stone',origin:door.origin,size:door.size});
 const c=compileDesign(d);
 const audit=auditR125SourceRoutes({...b,design:d,compiled:c,
  sourceSha256:c.sourceSha256,geometrySha256:c.geometrySha256});
 assert.equal(audit.status,'HOLD_SOURCE_ROUTES');
 assert.ok(audit.issues.some(x=>x.includes('UNREACHABLE_ZONE')));
});
test('real shop and research accept category-independent equipment intent without replacing original voxels',()=>{
 for(const [id,objects] of [
  ['shop',[
   {id:'merch-a',zoneId:'front-retail-space',role:'display-stand',corner:'far-left'},
   {id:'staff-a',zoneId:'back-employee-space',role:'storage-rack',corner:'far-right'}
  ]],
  ['research',[
   {id:'observation-bench',zoneId:'observation-lab',role:'work-surface',corner:'far-right'},
   {id:'equipment-bank',zoneId:'equipment-storage',role:'equipment-bank',corner:'far-right'},
   {id:'meeting-seat',zoneId:'collaboration-hub',role:'seating',corner:'far-left'},
   {id:'record-console',zoneId:'data-recording',role:'equipment-bank',corner:'far-right'}
  ]]
 ]){
  const p=fixture(id),base=compileArchitecturePlan(p);
  const frozen=JSON.stringify(base.design);
  const intent={schema:FEATURES,basePlanSha256:base.planSha256,objects};
  const out=applyR125FeatureIntent({base,intent});
  assert.equal(out.placements.length,objects.length);
  assert.ok(out.addedVoxelCount>0);
  assert.equal(out.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(out.immutableBaseGeometryProven,true);
  assert.equal(out.compiled.BuildPlan.operations.length,0);
  assert.equal(out.worldWrites,0);
  assert.deepEqual(out.gates,Array(9).fill('BLOCKED'));
  assert.equal(JSON.stringify(base.design),frozen);
  assert.equal(base.compiled.primitives.length,id==='shop'?933:2936);
 }
});
test('feature contract rejects unknown commands, stale sources and duplicate IDs',()=>{
 const base=compileArchitecturePlan(fixture('shop'));
 const good={schema:FEATURES,basePlanSha256:base.planSha256,objects:[
  {id:'retail-desk',zoneId:'front-retail-space',role:'work-surface',corner:'far-left'}
 ]};
 for(const mutated of [
  {...good,basePlanSha256:'0'.repeat(64)},
  {...good,objects:[{...good.objects[0],role:'command'}]},
  {...good,objects:[good.objects[0],good.objects[0]]},
  {...good,script:'setblock ~ ~ ~'}
 ]){
  assert.throws(()=>applyR125FeatureIntent({base,intent:mutated}),/R125_FEATURE_/);
 }
});

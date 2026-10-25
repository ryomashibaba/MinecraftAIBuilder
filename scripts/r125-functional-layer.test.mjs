import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
import {applyR125FeatureIntent,SCHEMA as FEATURES}
 from '../source/ai/r125-functional-layer.mjs';
import {proposeR125ThresholdRepair}
 from '../source/ai/r125-entrance-repair.mjs';
const fixture=id=>JSON.parse(fs.readFileSync(new URL(
 './fixtures/r125-qwen14b-'+id+'-20261024.json',import.meta.url),'utf8'));
const originalHouse=()=>JSON.parse(fs.readFileSync(new URL(
 './fixtures/r125-qwen14b-residential-2024a.json',import.meta.url),'utf8'));
test('three original Qwen designs uncover the REAL entrance conflict without rewriting source; bounded derived repair restores continuous source routes',()=>{
 const plans=[originalHouse(),fixture('shop'),fixture('research')];
 const expected=[2620,933,2936];
 const statuses=['HOLD_SOURCE_ROUTES','SOURCE_ROUTES_REACH_ALL_ZONES','HOLD_SOURCE_ROUTES'];
 for(let i=0;i<plans.length;i++){
  const base=compileArchitecturePlan(plans[i]);
  const frozen=JSON.stringify(base.design);
  assert.equal(base.compiled.primitives.length,expected[i]);
  const before=auditR125SourceRoutes(base);
  assert.equal(before.status,statuses[i],JSON.stringify(before.issues));
  const proposal=proposeR125ThresholdRepair(base);
  assert.equal(proposal.routeAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(proposal.routeAudit.zones.length,plans[i].levels.length*2);
  assert.ok(proposal.routeAudit.reachedPadCount>40);
  assert.equal(proposal.routeAudit.continuousRealPlayerPathCertified,false);
  assert.equal(proposal.worldWrites,0);
  assert.equal(JSON.stringify(base.design),frozen);
  if(i===1){
   assert.equal(proposal.sourceChanged,false);
   assert.equal(proposal.revisedSourceSha256,base.sourceSha256);
  }else{
   assert.equal(proposal.sourceChanged,true);
   assert.ok(proposal.changedVoxelCoordinates>0);
   assert.equal(proposal.changeFootprintConfinedToTwoDoorCutRegions,true);
   assert.notEqual(proposal.revisedSourceSha256,base.sourceSha256);
   assert.ok(proposal.routeAudit.zones.some(z=>z.level===1&&z.reachedFromEntrance));
  }
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
  const p=fixture(id),original=compileArchitecturePlan(p);
  const frozen=JSON.stringify(original.design);
  const repaired=proposeR125ThresholdRepair(original);
  const base=repaired.candidate;
  const intent={schema:FEATURES,basePlanSha256:base.planSha256,objects};
  const out=applyR125FeatureIntent({base,intent});
  assert.equal(out.placements.length,objects.length);
  assert.ok(out.addedVoxelCount>0);
  assert.equal(out.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(out.immutableBaseGeometryProven,true);
  assert.equal(out.compiled.BuildPlan.operations.length,0);
  assert.equal(out.worldWrites,0);
  assert.deepEqual(out.gates,Array(9).fill('BLOCKED'));
  assert.equal(JSON.stringify(original.design),frozen);
  assert.equal(original.compiled.primitives.length,id==='shop'?933:2936);
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

test('source-only service frontage rejects unreachable fixtures even if all zones are connected',()=>{
 const base=compileArchitecturePlan(fixture('shop'));
 const unchanged=auditR125SourceRoutes(base);
 assert.equal(unchanged.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 const checked=auditR125SourceRoutes(base,{featureTargets:[{
  id:'inaccessible-rack',zoneId:'front-retail-space',origin:[0,2,0],size:[2,2,1]
 }]});
 assert.equal(checked.status,'HOLD_SOURCE_ROUTES');
 assert.deepEqual(checked.featureAccess.map(x=>x.reachableFromEntrance),[false]);
 assert.ok(checked.issues.includes('UNREACHABLE_FEATURE_SERVICE_inaccessible-rack'));
 assert.equal(checked.worldWrites,0);
});
test('fifth feature in same zone uses perimeter-search beyond only four corners',()=>{
 const original=compileArchitecturePlan(fixture('shop'));
 const intent={schema:FEATURES,basePlanSha256:original.planSha256,
  objects:Array.from({length:5},(_,i)=>({
   id:'seat-'+String(i+1),zoneId:'front-retail-space',
   role:'seating',corner:'far-left'
  }))};
 const derived=applyR125FeatureIntent({base:original,intent});
 assert.equal(derived.placements.length,5);
 assert.equal(new Set(derived.placements.map(x=>x.origin.join(','))).size,5);
 assert.ok(derived.placements.some(x=>x.placementMethod==='perimeter-and-inward-band'));
 assert.equal(derived.everyFeatureSourceAccessible,true);
 assert.ok(derived.featureServiceAccessSourceOnly.every(x=>x.supportedTwoWideServiceWitness));
 assert.equal(derived.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(derived.originalSourceSha256,original.sourceSha256);
 assert.equal(derived.worldWrites,0);
 assert.deepEqual(derived.gates,Array(9).fill('BLOCKED'));
});

test('assembled geometry is multi-material and still source-reachable without replacing Qwen original',()=>{
 for(const [id,zoneId,role] of [
  ['shop','front-retail-space','display-stand'],
  ['research','observation-lab','work-surface'],
  ['research','equipment-storage','storage-rack'],
  ['research','data-recording','equipment-bank']
 ]){
  const old=compileArchitecturePlan(fixture(id));
  const base=proposeR125ThresholdRepair(old).candidate;
  const product=applyR125FeatureIntent({base,intent:{
   schema:'minecraftaibuilder-r130-feature-intent-v2',
   basePlanSha256:base.planSha256,objects:[
    {id:'built-fixture',zoneId,role,corner:'far-left',detail:'assembled'}
   ]}});
  assert.equal(product.assemblyMode,'MULTI_PART_ASSEMBLED');
  assert.ok(product.placements[0].elementIds.length>=2);
  assert.ok(product.addedVoxelCount>6);
  assert.equal(product.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(product.everyFeatureSourceAccessible,true);
  assert.equal(product.originalSourceSha256,base.sourceSha256);
  assert.equal(product.worldWrites,0);
  assert.deepEqual(product.gates,Array(9).fill('BLOCKED'));
 }
});

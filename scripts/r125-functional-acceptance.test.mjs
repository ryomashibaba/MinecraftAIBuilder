
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {proposeR125ThresholdRepair} from '../source/ai/r125-entrance-repair.mjs';
import {applyR125FeatureIntent,SCHEMA as FEATURES}
 from '../source/ai/r125-functional-layer.mjs';
import {auditR129FunctionalAcceptance,SCHEMA as ACCEPT}
 from '../source/ai/r125-functional-acceptance.mjs';
const load=id=>JSON.parse(fs.readFileSync(new URL(
 './fixtures/r125-qwen14b-'+id+'-20261024.json',import.meta.url),'utf8'));
function build(id,objects){
 const original=compileArchitecturePlan(load(id));
 const base=proposeR125ThresholdRepair(original).candidate;
 const featured=applyR125FeatureIntent({base,intent:{
  schema:FEATURES,basePlanSha256:base.planSha256,objects}});
 return {original,base,featured};
}
const obj=(id,zoneId,role,corner)=>({id,zoneId,role,corner});
const need=(id,zoneId,role,minCount=1,minAddedVoxels=1,minReachablePads=1)=>
 ({id,zoneId,role,minCount,minAddedVoxels,minReachablePads});
const spec=(base,needs,zoneOrders=[])=>({
 schema:ACCEPT,basePlanSha256:base.planSha256,needs,zoneOrders});
const shopObjects=[
 obj('retail-stand','front-retail-space','display-stand','far-left'),
 obj('storage-rack','back-employee-space','storage-rack','far-right')
];
test('real shop 933-voxel source with physical independent counts can meet source-only goals',()=>{
 const {original,base,featured}=build('shop',shopObjects);
 const r=auditR129FunctionalAcceptance({base,featured,spec:spec(base,[
  need('display','front-retail-space','display-stand',1,3,1),
  need('storage','back-employee-space','storage-rack',1,4,1)])});
 assert.equal(original.compiled.primitives.length,933);
 assert.equal(original.sourceSha256,
  '05223596d3bfa47b5d408eb05343fdcaaae4c084d18ccf4839be1f3cd088c05d');
 assert.equal(r.addedVoxelsVerified,7);
 assert.equal(r.status,'SOURCE_ONLY_REQUIREMENTS_MET_REAL_FUNCTION_UNVERIFIED');
 assert.equal(r.minecraftFunctionCertified,false);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.equal(r.worldWrites,0);
});
test('real shop front/back names do NOT prove required front-back geometry',()=>{
 const {base,featured}=build('shop',shopObjects);
 const r=auditR129FunctionalAcceptance({base,featured,spec:spec(base,[
  need('displays-needed','front-retail-space','display-stand',2,9,1)
 ],[{id:'customer-zone-front',nearZoneId:'front-retail-space',
  farZoneId:'back-employee-space',axis:'z'}])});
 assert.equal(r.status,'HOLD_INDEPENDENT_FUNCTIONAL_REQUIREMENTS');
 assert.ok(r.unmetIds.includes('displays-needed'));
 assert.ok(r.unmetIds.includes('customer-zone-front'));
 assert.deepEqual(r.spatialChecks[0].nearRange,r.spatialChecks[0].farRange);
 assert.ok(r.needChecks[0].problems.includes('ITEM_COUNT_DEFICIT'));
});
test('independent equipment checks apply to research without a genre router',()=>{
 const objects=[
  obj('observing','observation-lab','work-surface','far-right'),
  obj('equipment','equipment-storage','equipment-bank','far-right'),
  obj('collaboration','collaboration-hub','seating','far-left'),
  obj('recording','data-recording','equipment-bank','far-right')
 ];
 const {original,base,featured}=build('research',objects);
 const r=auditR129FunctionalAcceptance({base,featured,spec:spec(base,[
  need('observe','observation-lab','work-surface',1,6,1),
  need('equipment-store','equipment-storage','equipment-bank',1,6,1),
  need('teamwork','collaboration-hub','seating',1,2,1),
  need('record-data','data-recording','equipment-bank',1,6,1)])});
 assert.equal(original.compiled.primitives.length,2936);
 assert.equal(r.status,'SOURCE_ONLY_REQUIREMENTS_MET_REAL_FUNCTION_UNVERIFIED');
 assert.equal(r.needChecks.length,4);
 assert.equal(r.worldWrites,0);
});
test('single tiny device fails volume and usable walking-space requirements',()=>{
 const {base,featured}=build('shop',shopObjects.slice(0,1));
 const r=auditR129FunctionalAcceptance({base,featured,spec:spec(base,[
  need('functional-merchandising','front-retail-space','display-stand',1,40,5000)])});
 assert.equal(r.status,'HOLD_INDEPENDENT_FUNCTIONAL_REQUIREMENTS');
 assert.ok(r.needChecks[0].problems.includes('PHYSICAL_VOLUME_DEFICIT'));
 assert.ok(r.needChecks[0].problems.includes('REACHABLE_CLEAR_FLOOR_DEFICIT'));
});
test('malicious specs and forged featured positions fail closed',()=>{
 const {base,featured}=build('shop',shopObjects);
 const good=spec(base,[need('display','front-retail-space','display-stand')]);
 for(const bad of [
  {...good,basePlanSha256:'0'.repeat(64)},
  {...good,needs:[{...good.needs[0],minCount:0}]},
  {...good,zoneOrders:[{id:'wrong',nearZoneId:'invented',
   farZoneId:'back-employee-space',axis:'z'}]},
  {...good,extra:'execute commands'}
 ])assert.throws(()=>auditR129FunctionalAcceptance({
  base,featured,spec:bad}),/R129_ACCEPTANCE_/);
 const forged=structuredClone(featured);
 forged.placements[0].role='equipment-bank';
 assert.throws(()=>auditR129FunctionalAcceptance({
  base,featured:forged,spec:good}),/R129_ACCEPTANCE_/);
});

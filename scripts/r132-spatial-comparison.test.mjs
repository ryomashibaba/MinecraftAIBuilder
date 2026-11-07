import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {deriveR132SpatialPlan,SCHEMA}
 from '../source/ai/r132-spatial-relations.mjs';
import {buildR132SpatialComparison,saveR132SpatialComparison}
 from './r132-spatial-comparison.mjs';
const original=id=>compileArchitecturePlan(JSON.parse(fs.readFileSync(
 new URL('./fixtures/r125-qwen14b-'+id+'-20261024.json',import.meta.url),'utf8')));
const order=(id,near,far,axis)=>({
 id,nearZoneId:near,farZoneId:far,axis});
const spec=(base,zoneOrders)=>({
 schema:SCHEMA,basePlanSha256:base.planSha256,zoneOrders});
test('Qwen shop original stays byte-identical; explicit front/back z-order now realized in B143 geometry',()=>{
 const orig=original('shop'),before=JSON.stringify(orig.plan),source=JSON.stringify(orig.design);
 const r=deriveR132SpatialPlan({original:orig,requirements:spec(orig,[
  order('front-before-back','front-retail-space','back-employee-space','z')])});
 assert.equal(orig.compiled.primitives.length,933);
 assert.equal(orig.sourceSha256,
  '05223596d3bfa47b5d408eb05343fdcaaae4c084d18ccf4839be1f3cd088c05d');
 assert.equal(JSON.stringify(orig.plan),before);
 assert.equal(JSON.stringify(orig.design),source);
 assert.equal(r.status,'SOURCE_SPATIAL_ORDER_DERIVED_REAL_WORLD_UNVERIFIED');
 assert.equal(r.changedLevels.length,1);
 assert.equal(r.changedLevels[0].oldAxis,'x');
 assert.equal(r.changedLevels[0].newAxis,'z');
 assert.equal(r.after[0].satisfiedByActualCompiledZoneGeometry,true);
 assert.equal(r.before[0].satisfiedByActualCompiledZoneGeometry,false);
 assert.equal(r.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.candidatePlan.levels[0].splitAxis,'z');
 assert.equal(r.originalSourceUnchanged,true);
 assert.equal(r.modelCalls,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});
test('generic room order can be reversed with no genre-specific code',()=>{
 const orig=original('shop');
 const r=deriveR132SpatialPlan({original:orig,requirements:spec(orig,[
  order('reverse-z-relationship','back-employee-space','front-retail-space','z')])});
 assert.equal(r.candidatePlan.levels[0].splitAxis,'z');
 assert.equal(r.candidatePlan.levels[0].spaces[0].id,'back-employee-space');
 assert.equal(r.after[0].satisfiedByActualCompiledZoneGeometry,true);
 assert.equal(r.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
});
test('unknown and cross-level requirements HOLD, no silent room-name reinterpretation',()=>{
 const a=original('shop');
 const bads=[
  spec(a,[order('unknown-zone','no-such-zone','back-employee-space','z')]),
  spec(a,[order('front-before-back','front-retail-space','back-employee-space','y')]),
  spec(a,[]),
  {...spec(a,[order('front-before-back','front-retail-space','back-employee-space','z')]),
   basePlanSha256:'0'.repeat(64)},
  spec(a,[order('front-before-back','front-retail-space','back-employee-space','z'),
   order('reverse-conflict','back-employee-space','front-retail-space','z')])
 ];
 for(const requirements of bads)
  assert.throws(()=>deriveR132SpatialPlan({original:a,requirements}),/R132_SPATIAL_/);
});
test('3 original/assembled/corrected real 3D outputs, spatial HOLD lifted only in corrected derivative',()=>{
 const r=buildR132SpatialComparison();
 assert.equal(r.records.length,3);
 assert.equal(r.records[0].voxels,933);
 assert.equal(r.spatial.changedLevels.length,1);
 assert.ok(r.previousIndependent.unmet.includes('front-before-back-depth'));
 assert.deepEqual(r.correctedIndependent.unmet,[]);
 assert.equal(r.correctedIndependent.status,
  'SOURCE_ONLY_REQUIREMENTS_MET_REAL_FUNCTION_UNVERIFIED');
 assert.notEqual(r.records[1].sourceSha256,r.records[2].sourceSha256);
 assert.equal(r.originalQwenSourceImmutable,true);
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.pages.length,4);
 assert.ok(r.pages[0].html.includes('iframe'));
 assert.ok(r.pages.every(p=>!p.html.includes('__B143_GALLERY_JSON__')));
});
test('offline R132 review is save-once with no world operation',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r132-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const dir=path.join(tmp,'out'),r=saveR132SpatialComparison(dir);
 assert.equal(r.pages.length,4);
 for(const page of r.pages)assert.ok(fs.existsSync(path.join(dir,page.file)));
 const saved=JSON.parse(fs.readFileSync(
  path.join(dir,'R132_SPATIAL_EVIDENCE.json'),'utf8'));
 assert.equal(saved.worldWrites,0);
 assert.deepEqual(saved.gates,Array(9).fill('BLOCKED'));
 assert.throws(()=>saveR132SpatialComparison(dir),/R132_VISUAL_NO_OVERWRITE/);
});

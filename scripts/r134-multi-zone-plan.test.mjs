import test from 'node:test';
import assert from 'node:assert/strict';
import {compileR134MultiZonePlan,validateR134MultiZonePlan,SCHEMA}
 from '../source/ai/r134-multi-zone-plan.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
import {auditR129FunctionalAcceptance,SCHEMA as ACCEPT}
 from '../source/ai/r125-functional-acceptance.mjs';
const base=(axis='z',count=3)=>({
 schema:SCHEMA,id:'new-program-study',
 title:'Original multi-function creative workshop',
 brief:'Unknown multi-use workshop with a public and specialized progression',
 footprint:{width:28,depth:28},
 materials:{floor:'wood',wall:'stone',roof:'concrete'},
 layout:{axis,spaces:Array.from({length:count},(_,i)=>({
  id:'zone-'+(i+1),purpose:'Distinct meaningful studio activity '+(i+1),
  weight:1+i%3}))},
 form:{roofProfile:'ridge',facadeLanguage:'fins'}
});
const get=(p,x,y,z)=>p.compiled.primitives.some(
 v=>v[0]===x&&v[1]===y&&v[2]===z);
test('three actual independent studio rooms: supported air, walls, 2-wide openings and exterior entrance',()=>{
 const plan=base('z',3),snapshot=structuredClone(plan);
 const result=compileR134MultiZonePlan(plan);
 assert.deepEqual(plan,snapshot);
 assert.equal(validateR134MultiZonePlan(plan),true);
 assert.equal(verifyCompiled(result.design,result.compiled),true);
 assert.equal(result.program[0].zones.length,3);
 assert.equal(result.program[0].partitionCount,2);
 assert.equal(result.design.elements.filter(x=>x.id.startsWith('zone-door')).length,2);
 assert.ok(result.compiled.primitives.length>500);
 assert.ok(get(result,5,1,5));
 assert.equal(get(result,5,2,5),false);
 assert.ok(get(result,1,2,5));
 assert.ok(get(result,3,3,1));
 assert.ok(result.sourceRouteAudit.zones.every(x=>x.reachedFromEntrance));
 assert.equal(result.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.worldWrites,0);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
});
test('four distinct zones along front-back direction maintain linked source paths and varied weights',()=>{
 const plan=base('z',4);
 plan.layout.spaces[0].weight=4;
 const product=compileR134MultiZonePlan(plan);
 const z=product.program[0].zones;
 assert.equal(z.length,4);
 assert.equal(product.program[0].partitionCount,3);
 assert.ok(z[0].allocatedAxisCells>z[1].allocatedAxisCells);
 for(let i=0;i<3;i++)assert.ok(z[i].range.z[1]<z[i+1].range.z[0]);
 for(const v of product.sourceRouteAudit.zones){
  assert.ok(v.reachedTwoWidePadCount>0);
  assert.ok(v.sourceGraphMoves!==null);
 }
 assert.equal(product.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
});
test('generic west-east multi-zone plan still gives front entrance and accessible physical partitions',()=>{
 const p=base('x',3),result=compileR134MultiZonePlan(p);
 assert.equal(result.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.program[0].zones.length,3);
 assert.equal(result.design.elements.filter(e=>e.id.startsWith('zone-door')).length,2);
 assert.ok(result.program[0].zones[0].range.x[1]<
  result.program[0].zones[1].range.x[0]);
 assert.equal(result.worldWrites,0);
});
test('true assembled furniture can be placed and independently counted in a four-room 3D model',()=>{
 const original=compileR134MultiZonePlan(base('z',4));
 const objects=[
  {id:'workbench',zoneId:'zone-1',role:'work-surface',corner:'near-left',detail:'assembled'},
  {id:'display',zoneId:'zone-2',role:'display-stand',corner:'far-right',detail:'assembled'},
  {id:'storage',zoneId:'zone-3',role:'storage-rack',corner:'far-left',detail:'assembled'}
 ];
 const result=applyR125FeatureIntent({base:original,intent:{
  schema:ASSEMBLED_SCHEMA,basePlanSha256:original.planSha256,objects
 }});
 assert.equal(result.placements.length,3);
 assert.ok(result.addedVoxelCount>50);
 assert.equal(result.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.everyFeatureSourceAccessible,true);
 const ev=auditR129FunctionalAcceptance({base:original,featured:result,spec:{
  schema:ACCEPT,basePlanSha256:original.planSha256,
  needs:objects.map(o=>({id:'need-'+o.id,zoneId:o.zoneId,role:o.role,
   minCount:1,minAddedVoxels:8,minReachablePads:1})),
  zoneOrders:[{id:'front-back',nearZoneId:'zone-1',farZoneId:'zone-3',axis:'z'}]
 }});
 assert.equal(ev.status,'SOURCE_ONLY_REQUIREMENTS_MET_REAL_FUNCTION_UNVERIFIED');
 assert.equal(ev.unmetIds.length,0);
 assert.equal(ev.worldWrites,0);
});
test('an invalid tight footprint or malicious program fails without emitting source',()=>{
 for(const x of [
  p=>p.footprint.depth=18,
  p=>p.layout.spaces.push({id:'zone-five',purpose:'A fifth room is unsupported',weight:1}),
  p=>p.layout.spaces[0].id=p.layout.spaces[1].id,
  p=>p.layout.spaces[0].weight=0,
  p=>p.layout.axis='execute',
  p=>p.materials.roof='command_block',
  p=>p.script='shell',
  p=>p.layout.spaces[0].purpose='<exec>'
 ]){
  const p=base('z',4);x(p);
  assert.throws(()=>compileR134MultiZonePlan(p),/R134_MULTIZONE_/);
 }
});
test('semantic weights and orientation really alter geometries, without any building genre switch',()=>{
 const a=base('z',3),b=base('z',3);
 b.layout.spaces[0].weight=4;
 const c=base('x',3);
 const r1=compileR134MultiZonePlan(a),r2=compileR134MultiZonePlan(b),
  r3=compileR134MultiZonePlan(c);
 assert.notEqual(r1.geometrySha256,r2.geometrySha256);
 assert.notEqual(r1.geometrySha256,r3.geometrySha256);
 assert.ok(r1.design.elements.some(x=>x.id.startsWith('roof-profile')));
 assert.ok(r2.program[0].zones[0].allocatedAxisCells>
  r1.program[0].zones[0].allocatedAxisCells);
 assert.ok(r1.sourceRouteAudit.reachedPadCount>100);
 assert.deepEqual(r3.BuildPlan.operations,[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,validateSpatialComposition,placeSpatialRooms,
 compileSpatialComposition} from '../source/ai/r125-spatial-composition.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const r=(id,width,depth,roofY,attach)=>({
 id,purpose:'Distinct functional space '+id,width,depth,roofY,
 ...(attach?{attach}:{})
});
const p=(id,rooms)=>({schema:SCHEMA,id,title:'Independent building composition',
 brief:'A source-authored arrangement of connected functional volumes',
 materials:{floor:'wood',wall:'concrete',roof:'stone'},rooms});
const examples=[
 p('offset-side-wing',[r('front',12,10,6),
  r('rear',9,8,8,{to:'front',side:'east',shift:0})]),
 p('rear-courtyard-axis',[r('front',12,8,7),
  r('rear',9,10,6,{to:'front',side:'south',shift:0})]),
 p('branched-three-rooms',[r('front',12,10,7),
  r('west',8,9,6,{to:'front',side:'west',shift:1}),
  r('east',8,9,9,{to:'front',side:'east',shift:1})])
];
test('3 independent building compositions make distinct real voxels and 2-wide routes',()=>{
 const hashes=new Set();
 for(const plan of examples){
  assert.equal(validateSpatialComposition(plan),true);
  const result=compileSpatialComposition(plan);
  assert.equal(verifyCompiled(result.design,result.compiled),true);
  assert.equal(result.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(result.sourceRoutes.zones.length,plan.rooms.length);
  assert(result.sourceRoutes.zones.every(z=>z.reachedTwoWidePadCount>0));
  assert(result.compiled.primitives.length>100);
  assert.equal(result.layout.connectedDoors,plan.rooms.length-1);
  assert(result.layout.exteriorWindows>0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.readiness,'NOT_PREPARED');
  assert.deepEqual(result.BuildPlan.operations,[]);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  hashes.add(result.geometrySha256);
 }
 assert.equal(hashes.size,3);
});
test('unknown adjacency, unsafe shift, volume collisions and blocked public entry fail',()=>{
 const a=structuredClone(examples[0]);a.rooms[1].attach.to='unknown';
 assert.throws(()=>validateSpatialComposition(a),/ADJACENCY_CONTRACT/);
 const b=structuredClone(examples[0]);b.rooms[1].attach.shift=30;
 assert.throws(()=>validateSpatialComposition(b),/ADJACENCY_CONTRACT/);
 const c=p('overlapping',[r('front',12,10,6),
  r('east',9,10,7,{to:'front',side:'east',shift:0}),
  r('other',9,10,8,{to:'front',side:'east',shift:1})]);
 assert.throws(()=>placeSpatialRooms(c),/VOLUMES_OVERLAP/);
 const d=p('blocked',[r('front',12,10,6),
  r('north',12,9,6,{to:'front',side:'north',shift:0})]);
 assert.throws(()=>placeSpatialRooms(d),/PUBLIC_ENTRY_NOT_EXTERIOR/);
});
test('no mutation of author plan and no implied model or world certification',()=>{
 const a=structuredClone(examples[0]);const before=JSON.stringify(a);
 const result=compileSpatialComposition(a);
 assert.equal(JSON.stringify(a),before);
 assert.equal(result.modelAuthorship,'CALLER_PROVIDED_PLAN_UNVERIFIED');
 assert.equal(result.inGameWalking,'NOT_TESTED');
 assert.equal(result.architecturalQuality,'NOT_REVIEWED');
});

test('universal compact 6-wide or 6-deep rooms are accepted only when real B143 voxels and two-wide interior routes pass',()=>{
 const designs=[
  p('compact-side',[r('front',12,10,6),
   r('compact-back',9,6,7,{to:'front',side:'east',shift:0})]),
  p('compact-front',[r('front',6,10,6),
   r('compact-back',6,6,8,{to:'front',side:'south',shift:0})]),
  p('compact-three-zone',[r('front',12,10,7),
   r('east',6,6,6,{to:'front',side:'east',shift:0}),
   r('west',6,6,8,{to:'front',side:'west',shift:0})])
 ];
 for(const design of designs){
  assert.equal(validateSpatialComposition(design),true);
  const result=compileSpatialComposition(design);
  assert.equal(verifyCompiled(result.design,result.compiled),true);
  assert.equal(result.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(result.sourceRoutes.zones.every(z=>z.reachedTwoWidePadCount>=1));
  assert(result.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
  assert.equal(result.worldWrites,0);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(result.BuildPlan.operations,[]);
 }
 const tooSmall=structuredClone(designs[0]);
 tooSmall.rooms[1].depth=5;
 assert.throws(()=>validateSpatialComposition(tooSmall),/ROOM_CONTRACT/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA as SPATIAL,compileSpatialComposition} from '../source/ai/r125-spatial-composition.mjs';
import {ENVELOPE_SCHEMA,compileExpressiveEnvelopeV2} from '../source/ai/r125-expressive-envelope-v2.mjs';
import {FUNCTION_SCHEMA,validateFunctionalIntent,compileFunctionalFacadeV3}
 from '../source/ai/r125-functional-facade-v3.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const room=(id,width,depth,roofY,attach)=>({id,
 purpose:'Independent use and accessible connected space '+id,
 width,depth,roofY,...(attach?{attach}:{})});
const plan=(id,childSide)=>({
 schema:SPATIAL,id,title:'Independent source building '+id,
 brief:'Genuine program with two distinct human functional rooms and visible physical service elements',
 materials:{floor:'wood',wall:'concrete',roof:'stone'},
 rooms:[room('arrival',12,10,8),
 room('support',8,8,7,{to:'arrival',side:childSide,shift:0})]
});
const roof=p=>({schema:ENVELOPE_SCHEMA,planId:p.id,
 roofs:p.rooms.map((r,i)=>({roomId:r.id,
 form:i?'shed':'ridge',axis:i?'z':'x',rise:2}))});
const kind=['counter','worktable','bench','display','storage'];
const fixtureIntent=(p,attachedTo,caseIndex)=>({
 schema:FUNCTION_SCHEMA,planId:p.id,
 rooms:p.rooms.map((r,i)=>({
  roomId:r.id,
  fixture:{kind:kind[(i+caseIndex)%kind.length],
   side:i?'east':'west',offset:0,
   material:i?'stone':'wood',purpose:'Functional service for '+r.id},
  opening:{side:i?'south':attachedTo==='south'?'west':'south',
   offset:0,width:4,height:2}
 }))
});
const sample=[
 plan('home-functional','east'),plan('retail-functional','south'),
 plan('laboratory-functional','west'),plan('gallery-functional','east'),
 plan('station-functional','south')
];
test('five genres express different HOST-generic functional elements and truly new glazing with service routes',()=>{
 let sourceProducts=0;
 const differentShapes=new Set();
 for(const [i,p] of sample.entries()){
  const r=roof(p),intention=fixtureIntent(p,p.rooms[1].attach.side,i);
  const baseline=compileSpatialComposition(p);
  const envelope=compileExpressiveEnvelopeV2({originalPlan:p,intent:r});
  const original=JSON.stringify(p),authored=JSON.stringify(intention),originalRoof=JSON.stringify(r);
  assert.equal(validateFunctionalIntent(p,intention),true);
  const v3=compileFunctionalFacadeV3({originalPlan:p,envelopeIntent:r,functionalIntent:intention});
  assert.equal(JSON.stringify(p),original);
  assert.equal(JSON.stringify(r),originalRoof);
  assert.equal(JSON.stringify(intention),authored);
  assert.equal(v3.baseSpatialGeometrySha256,baseline.geometrySha256);
  assert.equal(v3.originalEnvelopeGeometrySha256,envelope.geometrySha256);
  assert.notEqual(v3.finalGeometrySha256,envelope.geometrySha256);
  assert.equal(verifyCompiled(v3.design,v3.compiled),true);
  assert.equal(v3.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(v3.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
  assert.equal(v3.sourceRoutes.featureAccess.length,p.rooms.length);
  assert(v3.sourceRoutes.featureAccess.every(x=>x.reachableFromEntrance));
  assert(v3.physicalProgram.independentlyAddedGlassCells>=1);
  assert(v3.physicalProgram.physicallyVerifiedFixtureCells>=p.rooms.length);
  assert(v3.physicalProgram.features.every(x=>x.genreTemplateUsed===false));
  assert.equal(v3.physicalProgram.roomPurposesNotCertifiedByShape,true);
  assert.deepEqual(v3.gates,Array(9).fill('BLOCKED'));
  assert.equal(v3.architecturalArt,'NOT_REVIEWED');
  assert.equal(v3.minecraftExecution,'NOT_TESTED');
  assert.equal(v3.worldWrites,0);
  assert.deepEqual(v3.BuildPlan.operations,[]);
  differentShapes.add(v3.finalGeometrySha256);
  sourceProducts++;
 }
 assert.equal(sourceProducts,5);
 assert.equal(differentShapes.size,5);
});
test('an unadorned or host-invented room cannot silently become an authored functional room',()=>{
 const p=sample[0],r=roof(p),intent=fixtureIntent(p,'east',0);
 assert.throws(()=>compileFunctionalFacadeV3({originalPlan:p,envelopeIntent:r}),/TOP_LEVEL/);
 const noRoom=structuredClone(intent);noRoom.rooms.pop();
 assert.throws(()=>validateFunctionalIntent(p,noRoom),/TOP_LEVEL/);
 const bogus=structuredClone(intent);bogus.rooms[0].roomId='unknown';
 assert.throws(()=>validateFunctionalIntent(p,bogus),/ROOM_CONTRACT/);
 const duplicate=structuredClone(intent);duplicate.rooms[1].roomId='arrival';
 assert.throws(()=>validateFunctionalIntent(p,duplicate),/ROOM_CONTRACT/);
 const material=structuredClone(intent);material.rooms[1].fixture.material='lava';
 assert.throws(()=>validateFunctionalIntent(p,material),/ROOM_INTENT/);
 const item=structuredClone(intent);item.rooms[0].fixture.kind='genre-specific-station-fixture';
 assert.throws(()=>validateFunctionalIntent(p,item),/ROOM_INTENT/);
 const hidden=structuredClone(intent);hidden.rooms[1].opening.width=1;
 assert.throws(()=>validateFunctionalIntent(p,hidden),/ROOM_INTENT/);
 const extra=structuredClone(intent);extra.rooms[0].fixture.worldPosition=[1,2,3];
 assert.throws(()=>validateFunctionalIntent(p,extra),/ROOM_CONTRACT/);
});
test('an interior/shared facade is NOT a real exterior window',()=>{
 const p=sample[0],r=roof(p),intent=fixtureIntent(p,'east',0);
 const fake=structuredClone(intent);
 fake.rooms[0].opening.side='east'; // east room is joined to its neighbor
 assert.throws(()=>compileFunctionalFacadeV3({
  originalPlan:p,envelopeIntent:r,functionalIntent:fake}),
  /OPENING_(TO_OTHER_ROOM|PARTLY_SHARED)/);
});
test('too-large furniture or glazing fails instead of moving a model-authored element',()=>{
 const p=sample[1],r=roof(p),intent=fixtureIntent(p,'south',1);
 const big=structuredClone(intent);big.rooms[0].fixture.offset=4;
 assert.throws(()=>compileFunctionalFacadeV3({
  originalPlan:p,envelopeIntent:r,functionalIntent:big}),
  /FIXTURE_TOO_LONG|FIXTURE_TOO_WIDE/);
 const glass=structuredClone(intent);glass.rooms[1].opening.offset=4;
 assert.throws(()=>compileFunctionalFacadeV3({
  originalPlan:p,envelopeIntent:r,functionalIntent:glass}),
  /WINDOW_OUTSIDE_ROOM/);
});

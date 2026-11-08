import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA as V1,compileSpatialComposition} from '../source/ai/r125-spatial-composition.mjs';
import {ENVELOPE_SCHEMA,validateEnvelopeIntent,buildEnvelopeElements,
 compileExpressiveEnvelopeV2} from '../source/ai/r125-expressive-envelope-v2.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const room=(id,width,depth,roofY,attach)=>({
 id,purpose:'Distinct usable functional space '+id,width,depth,roofY,
 ...(attach?{attach}:{})
});
const plan=(id,rs)=>({schema:V1,id,title:'Source-authored '+id,
 brief:'Useful human circulation and a major independently authored skyline',
 materials:{floor:'wood',wall:'concrete',roof:'stone'},rooms:rs});
const intent=(p,i)=>({schema:ENVELOPE_SCHEMA,planId:p.id,
 roofs:p.rooms.map((r,j)=>({roomId:r.id,
  form:j%2===0?'ridge':'shed',axis:(j+i)%2===0?'x':'z',rise:2+(j+i)%2}))});
const designs=[
 plan('house-concept',[room('living',12,10,7),
  room('bedroom',9,8,6,{to:'living',side:'east',shift:0})]),
 plan('shop-concept',[room('sales',12,10,8),
  room('stock',9,7,7,{to:'sales',side:'south',shift:0})]),
 plan('laboratory-concept',[room('laboratory',12,10,8),
  room('observation',8,7,6,{to:'laboratory',side:'west',shift:0})]),
 plan('gallery-concept',[room('entry',12,10,8),
  room('exhibition',10,8,10,{to:'entry',side:'east',shift:0})]),
 plan('station-concept',[room('tickets',10,8,8),
  room('waiting',12,10,8,{to:'tickets',side:'south',shift:0})])
];
test('five unrelated building genres share the SAME opt-in authored envelope compiler',()=>{
 const hashes=new Set();
 for(const [i,p] of designs.entries()){
  const modelIntent=intent(p,i);
  assert.equal(validateEnvelopeIntent(p,modelIntent),true);
  const original=JSON.stringify(p),authored=JSON.stringify(modelIntent);
  const before=compileSpatialComposition(p);
  const v2=compileExpressiveEnvelopeV2({originalPlan:p,intent:modelIntent});
  assert.equal(JSON.stringify(p),original);
  assert.equal(JSON.stringify(modelIntent),authored);
  assert.equal(v2.originalGeometrySha256,before.geometrySha256);
  assert.equal(v2.originalSourceSha256,before.sourceSha256);
  assert.notEqual(v2.geometrySha256,before.geometrySha256);
  assert.equal(verifyCompiled(v2.design,v2.compiled),true);
  assert.equal(v2.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(v2.sourceRoutes.zones.length,p.rooms.length);
  assert(v2.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
  assert.equal(v2.massing.headroom.length,p.rooms.length);
  assert(v2.massing.headroom.every(x=>x.raisedTwoWidePads>0&&x.raisedAirCells>=4));
  assert(v2.massing.headroom.every(x=>x.voxelSource==='REAL_FINAL_B143'));
  assert.deepEqual(v2.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(v2.BuildPlan.operations,[]);
  assert.equal(v2.worldWrites,0);
  assert.equal(v2.constructionApproved,false);
  assert.equal(v2.architecturalArt,'NOT_REVIEWED');
  assert.equal(v2.authorship,'ROOF_INTENT_SUPPLIED_EXTERNALLY_NOT_AUTOMATICALLY_QWEN_VERIFIED');
  hashes.add(v2.geometrySha256);
 }
 assert.equal(hashes.size,5);
});
test('five-room volume can use author profiles without violating B143 160-element limit',()=>{
 const p=plan('multi-wing-common',[
  room('entry',12,10,7),
  room('east',8,7,8,{to:'entry',side:'east',shift:0}),
  room('west',8,7,8,{to:'entry',side:'west',shift:0}),
  room('south',10,8,8,{to:'entry',side:'south',shift:0}),
  room('south-second',8,7,8,{to:'south',side:'south',shift:0})
 ]);
 const v2=compileExpressiveEnvelopeV2({originalPlan:p,intent:intent(p,2)});
 assert(v2.design.elements.length<=160);
 assert.equal(v2.sourceRoutes.zones.length,5);
 assert(v2.massing.allRoomsTrueRaisedTwoWideAir);
 assert.equal(v2.worldWrites,0);
});
test('generic envelope changes are authored; missing, duplicate or made-up intents are rejected',()=>{
 const p=designs[0],g=intent(p,0);
 assert.throws(()=>compileExpressiveEnvelopeV2({originalPlan:p}),/CONTRACT/);
 const missing=structuredClone(g);missing.roofs.pop();
 assert.throws(()=>validateEnvelopeIntent(p,missing),/CONTRACT/);
 const duplicate=structuredClone(g);duplicate.roofs[1].roomId=duplicate.roofs[0].roomId;
 assert.throws(()=>validateEnvelopeIntent(p,duplicate),/ROOF_INTENT/);
 const unknown=structuredClone(g);unknown.roofs[1].roomId='unknown-genre-fixture';
 assert.throws(()=>validateEnvelopeIntent(p,unknown),/ROOF_INTENT/);
 const unsupported=structuredClone(g);unsupported.roofs[0].form='fake-curve';
 assert.throws(()=>validateEnvelopeIntent(p,unsupported),/ROOF_INTENT/);
 const tooHigh=structuredClone(g);tooHigh.roofs[0].rise=4;
 assert.throws(()=>validateEnvelopeIntent(p,tooHigh),/ROOF_INTENT/);
 const injection=structuredClone(g);injection.roofs[0].worldPosition=[10,20,30];
 assert.throws(()=>validateEnvelopeIntent(p,injection),/ROOF_INTENT/);
});
test('GENRE is absent from the shared roof builder input and profiles materially differ',()=>{
 const p=designs[0],rooms=compileSpatialComposition(p).layout.rooms;
 const a=buildEnvelopeElements(rooms,intent(p,0),p.materials);
 const b=buildEnvelopeElements(rooms,intent(p,1),p.materials);
 assert(a.elements.length>0&&b.elements.length>0);
 assert.notDeepEqual(a.elements,b.elements);
 assert(a.elements.every(e=>e.shape==='box'&&e.mode==='add'));
 assert(a.elements.every(e=>e.id.startsWith('mass-')));
 assert(a.diagnostics.every(d=>d.distinctRoofLevels>=2));
});

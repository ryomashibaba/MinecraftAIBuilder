import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,compileSpatialComposition}
 from '../source/ai/r125-spatial-composition.mjs';
import {APPROACH_SCHEMA,validatePublicApproachIntent,
 compilePublicApproachV4A} from '../source/ai/r125-public-approach-v4a.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const ids=['home','retail','laboratory','gallery','station'];
const plan=i=>({
 schema:SCHEMA,id:'v4a-'+ids[i],title:'Distinct authored program for '+ids[i],
 brief:'A publicly accessible functional building with two independent working zones',
 materials:{floor:i===0?'wood':'stone',wall:'concrete',roof:'metal'},
 rooms:[
  {id:'public-room',purpose:'Public reception and active functional uses',
   width:12,depth:10,roofY:8},
  {id:'service-room',purpose:'Separate support and maintenance activities',
   width:8,depth:8,roofY:7,
   attach:{to:'public-room',side:i%2===0?'east':'south',shift:0}}
 ]
});
const approach=(p,i)=>({
 schema:APPROACH_SCHEMA,planId:p.id,rootRoomId:p.rooms[0].id,
 offset:2+i%3,width:4+(i%2),depth:2+i%2
});
const clone=x=>JSON.parse(JSON.stringify(x));

test('five distinct functional briefs accept author-chosen recessed public space using the SAME generic B143 source',()=>{
 const results=[];
 for(let i=0;i<ids.length;i++){
  const p=plan(i),intent=approach(p,i),frozen=clone(p);
  const base=compileSpatialComposition(p);
  const result=compilePublicApproachV4A({originalPlan:p,intent});
  assert.deepEqual(p,frozen);
  assert.deepEqual(compileSpatialComposition(p).geometrySha256,base.geometrySha256);
  assert.equal(result.originalGeometrySha256,base.geometrySha256);
  assert.notEqual(result.geometrySha256,base.geometrySha256);
  assert(verifyCompiled(result.design,result.compiled));
  assert.equal(result.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(result.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
  assert.equal(result.sourceProof.supportedCourtyardCells,
   (intent.width-2)*intent.depth);
  assert.equal(result.sourceProof.roofCellsRemoved,
   (intent.width-2)*intent.depth);
  assert.deepEqual(result.sourceProof.authorSelectedEntrance,[
   result.design.elements.find(e=>e.id==='exterior-entrance').origin[0],
   2,result.design.elements.find(e=>e.id==='exterior-entrance').origin[2]]);
  assert.equal(result.worldContacts,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.constructionApproved,false);
  assert.deepEqual(result.BuildPlan.operations,[]);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert.equal(result.authorship,'SUPPLIED_EXTERNAL_INTENT_NOT_PROVEN_REAL_MODEL');
  assert.equal(result.art,'NOT_REVIEWED');
  assert.equal(result.minecraft,'NOT_TESTED');
  assert(!result.design.elements.some(e=>
   e.id==='MAKECODE_EDUCATION' || Object.hasOwn(e,'worldCoordinates')));
  results.push(result.geometrySha256);
 }
 assert.equal(new Set(results).size,5);
});
test('missing author dimensions, invented defaults, wrong plan or extra keys HOLD',()=>{
 const p=plan(0),base=compileSpatialComposition(p);
 const good=approach(p,0);
 validatePublicApproachIntent(p,good,base);
 const bads=[
  {...good,planId:'another-plan'}, {...good,rootRoomId:'service-room'},
  {...good,offset:-1}, {...good,offset:7},
  {...good,width:3}, {...good,width:7},
  {...good,depth:1}, {...good,depth:4},
  {...good,offset:2.5}, {...good,width:'4'},
  {...good,style:'freely-invented'},
  Object.fromEntries(Object.entries(good).filter(([k])=>k!=='depth'))
 ];
 for(const bad of bads)
  assert.throws(()=>compilePublicApproachV4A({originalPlan:p,intent:bad}),
   /R125_APPROACH_AUTHOR_/);
 assert.equal(compileSpatialComposition(p).geometrySha256,base.geometrySha256);
});
test('route audit refuses a court over the neighboring connected room',()=>{
 const p=plan(0);
 // Move the auxiliary room in front of the root, away from the frozen
 // centered V1 threshold but over the requested new public forecourt.
 p.rooms[1].width=6;
 p.rooms[1].depth=8;
 p.rooms[1].attach={to:'public-room',side:'north',shift:-3};
 const base=compileSpatialComposition(p);
 const intent={...approach(p,0),offset:2};
 assert.throws(()=>compilePublicApproachV4A({originalPlan:p,intent}),
  /R125_APPROACH_OTHER_ROOM_OBSTRUCTS_APPROACH/);
 assert.equal(compileSpatialComposition(p).geometrySha256,base.geometrySha256);
});
test('no fallback to pretending V4A is a new real Qwen or world-write result',()=>{
 const p=plan(1),raw=JSON.stringify(p),a=approach(p,1);
 const result=compilePublicApproachV4A({originalPlan:p,intent:a});
 assert.equal(JSON.stringify(p),raw);
 assert.equal(result.sourceProof.outsideWorldTerrainVerified,false);
 assert.equal(result.sourceProof.realMinecraftWalkable,'NOT_TESTED');
 assert.equal(result.readiness,'NOT_PREPARED');
 assert.equal(result.originalPlanSha256.length,64);
 assert.equal(result.intentSha256.length,64);
});

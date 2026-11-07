import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseR125Original,parseR125ReplayArgs} from './r125-offline-replay.mjs';
import {SCHEMA as B143} from '../source/ai/b143-building-dsl.mjs';

function good(){
 return {design:{schema:B143,id:'original-v1',title:'Generic small hall',
  brief:'Functional supported hall',bounds:{width:16,height:12,depth:16},
  designOnly:true,elements:[{id:'platform',shape:'box',mode:'add',
   material:'wood',origin:[2,1,2],size:[9,1,9]}]},
  explanation:'A platform for a small hall.',assumptions:[]};
}
test('saved genuine source shape can be independently validated without changing it',()=>{
 const raw=JSON.stringify(good());
 const result=diagnoseR125Original(raw);
 assert.equal(result.status,'SOURCE_CANDIDATE_REVIEW_REQUIRED');
 assert.equal(result.compilerReason,null);
 assert.equal(result.sourceSha256.length,64);
 assert.equal(result.occupiedVoxels,81);
 assert.equal(result.originalEdited,false);
 assert.equal(result.modelCalls,0);
 assert.equal(result.worldWrites,0);
});
test('14B-style bad assumptions plus type/mode/ID/geometry all surface at once',()=>{
 const original=good();
 original.design.id='original_with_underscores';
 original.assumptions='Not a list of strings';
 original.design.elements=[
  {id:'floor_1',type:'add',shape:'box',origin:[2,0,2],
   size:[9,1,9],material:'wood'},
  {id:'floor_2',type:'add',shape:'box',origin:[2,1,2],
   size:[9,1,9],material:'wood'},
  {id:'door',type:'add',shape:'box',origin:[5,1,5],
   size:[2,2,1],material:'wood'},
  {id:'room_1',type:'add',shape:'box',origin:[3,1,3],
   size:[4,5,4],material:'wood'},
  {id:'staircase',type:'add',shape:'staircase',origin:[6,1,6],
   axis:'z',direction:1,width:4,steps:8,treadDepth:2}
 ];
 const raw=JSON.stringify(original),snapshot=structuredClone(original);
 const r=diagnoseR125Original(raw);
 const codes=r.findings.map(x=>x.code);
 for(const code of ['ASSUMPTIONS_NOT_BOUNDED_STRING_ARRAY',
  'DESIGN_ID_INVALID','UNKNOWN_TYPE_FIELD_USE_MODE',
  'MISSING_OR_INVALID_MODE','MISSING_OR_INVALID_ADD_MATERIAL',
  'STAIRCASE_EXCEEDS_DESIGN_BOUNDS',
  'DOOR_OR_WINDOW_MAY_NOT_CUT_WALL_OPENING',
  'ROOM_VOLUME_FILLED_NOT_EMPTY','FLOOR_SEPARATION_UNUSABLE'])
  assert.ok(codes.includes(code),code);
 assert.match(r.compilerReason,/B198A_UNTRUSTED_ASSUMPTIONS/);
 assert.equal(r.status,'HOLD_ORIGINAL_SOURCE');
 assert.equal(r.sourceSha256,null);
 assert.deepEqual(original,snapshot);
 assert.equal(JSON.stringify(original),raw);
 assert.deepEqual(r.worldGates,Array(9).fill('BLOCKED'));
});
test('malformed JSON is HOLD and CLI forbids overwrite/incomplete arguments',()=>{
 const r=diagnoseR125Original('{"design":');
 assert.equal(r.status,'HOLD_INVALID_ORIGINAL');
 assert.equal(r.originalEdited,false);
 assert.throws(()=>parseR125ReplayArgs(['--raw','a']),/REQUIRE_RAW_AND_OUT/);
 assert.throws(()=>parseR125ReplayArgs(['--raw','a','--out','a']),
  /INPUT_OUTPUT_CONFLICT/);
 assert.throws(()=>parseR125ReplayArgs(['--raw','a','--raw','b']),
  /INVALID_ARGUMENT/);
});

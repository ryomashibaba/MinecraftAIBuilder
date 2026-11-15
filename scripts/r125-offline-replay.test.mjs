import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseR125Original,diagnoseR125ArchitecturePlanOriginal,
 parseR125ReplayArgs,writeArchitecturePlanReplay} from './r125-offline-replay.mjs';
import {readFileSync,mkdtempSync,existsSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
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

test('saved real Nov-1 Qwen ArchitecturePlan replays through TRUE B143 and SOURCE routes',()=>{
 const original=readFileSync(new URL('../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url),'utf8');
 const r=diagnoseR125ArchitecturePlanOriginal(original);
 assert.equal(r.originalSha256,
  createHash('sha256').update(original).digest('hex'));
 assert.equal(r.originalEdited,false);
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.worldGates,Array(9).fill('BLOCKED'));
 assert.equal(r.artStatus,'NOT_REVIEWED');
 assert.equal(r.modelAuthorshipVerified,false);
 assert.equal(r.status,'B143_SOURCE_CANDIDATE_ART_HOLD',
  'genuine saved plan must compile into reachable source; no fake B143');
 assert.equal(r.sourceVerified,true);
 assert.equal(r.occupiedVoxels,1336);
 assert.equal(r.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.circulation,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(r.sourceDesign.designOnly,true);
});
test('ArchitecturePlan replay rejects corrupted plan without silent model correction',()=>{
 const malformed=diagnoseR125ArchitecturePlanOriginal('{invalid');
 assert.equal(malformed.status,'HOLD_INVALID_ORIGINAL_JSON');
 assert.equal(malformed.sourceVerified,false);
 assert.equal(malformed.modelCalls,0);
 const fake=diagnoseR125ArchitecturePlanOriginal(JSON.stringify({
  schema:'minecraftaibuilder-r125-architecture-plan-v1',
  id:'bad',title:'Test',brief:'a test',footprint:{width:18,depth:18},
  levels:[],materials:{floor:'wood',wall:'wood',roof:'wood'},
  unsafeWorldWrite:true
 }));
 assert.equal(fake.status,'HOLD_PLAN_COMPILER_OR_QA');
 assert.equal(fake.sourceDesign,undefined);
 assert.equal(fake.originalEdited,false);
 assert.deepEqual(fake.worldGates,Array(9).fill('BLOCKED'));
});

test('saved genuine Qwen plan yields true B143 HTML for human review without another model call',()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'r125-qwen-3d-'));
 const rawPath=fileURLToPath(new URL(
  '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url));
 const dest=path.join(root,'review');
 try{
  const receipt=writeArchitecturePlanReplay({'--raw':rawPath,'--out':dest});
  const report=JSON.parse(readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  const html=readFileSync(path.join(dest,'B143_SOURCE_3D_REVIEW_ONLY.html'),'utf8');
  assert.equal(receipt.status,'B143_SOURCE_CANDIDATE_ART_HOLD');
  assert.equal(report.sourceVerified,true);
  assert.equal(report.modelCalls,0);
  assert.equal(report.artStatus,'NOT_REVIEWED');
  assert.equal(report.worldWrites,0);
  assert.ok(html.includes('minecraftaibuilder-b143-gallery-v1'));
  assert.ok(html.includes(report.geometrySha256));
  assert.equal(readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),
   readFileSync(rawPath,'utf8'));
 }finally{rmSync(root,{recursive:true,force:true})}
});

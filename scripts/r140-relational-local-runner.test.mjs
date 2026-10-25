/**
 * R140 one real-compatible localhost workflow: request a NEW spatial graph
 * in the SAME Ollama response as room program and assembled furniture.
 * HTTP is intentionally stubbed in CI, NOT real Ollama or Minecraft.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runR134FreshModel,parseR134FreshArgs}
 from './r134-fresh-model-pilot.mjs';
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r140-graph-'));
const brief='Invent a small repair-and-learning pavilion with spatially connected functional rooms.';
const reply=()=>({
 id:'fresh-unknown-program',title:'A new experimental community atelier',
 footprint:{width:26,depth:30},
 materials:{floor:'stone',wall:'concrete',roof:'metal'},
 layout:{axis:'z',spaces:Array.from({length:4},(_,i)=>({
  id:'zone-'+(i+1),purpose:'Different practical room activity number '+(i+1),
  weight:1}))},
 form:{roofProfile:'flat',facadeLanguage:'plain'},
 objects:[
  {id:'object-1',zoneId:'zone-1',role:'work-surface',corner:'near-left'},
  {id:'object-2',zoneId:'zone-2',role:'storage-rack',corner:'far-right'},
  {id:'object-3',zoneId:'zone-3',role:'display-stand',corner:'near-right'},
  {id:'object-4',zoneId:'zone-4',role:'seating',corner:'far-left'}
 ],
 relations:{entryFacingZoneId:'zone-4',
  directAdjacencies:[['zone-1','zone-2'],['zone-3','zone-4']]}
});
const fakeLocal=(answer,inspect=()=>{})=>async(url,opts)=>{
 assert.match(url,/^http:\/\/127\.0\.0\.1:11434\//);
 if(opts.method==='GET')return {ok:true,text:async()=>JSON.stringify({
  models:[{name:'qwen3:14b'}]})};
 assert.equal(opts.method,'POST');
 const body=JSON.parse(opts.body);
 assert.equal(body.model,'qwen3:14b');
 assert.equal(body.max_tokens,
  !Object.hasOwn(answer,'architecture')?1750:
   answer.architecture?.schema==='minecraftaibuilder-r152-envelope-intent-v1'?2050:1900);
 assert.equal(body.stream,false);
 assert.ok(body.messages[0].content.includes('entryFacingZoneId'));
 assert.ok(body.messages[0].content.includes('directAdjacencies'));
 assert.ok(body.messages[0].content.includes('objects,relations'));
 inspect(body);
 return {ok:true,text:async()=>JSON.stringify({choices:[
  {finish_reason:'stop',message:{content:JSON.stringify(answer)}}
 ]})};
};
test('same existing CLI accepts graph topology and rejects unsafe combinations',()=>{
 const args=parseR134FreshArgs(['--model','qwen3:14b','--brief',brief,
  '--equipment','assembled','--topology','graph','--out','new-gallery']);
 assert.equal(args.topologyMode,'graph');
 for(const tail of [
  ['--equipment','none','--topology','graph'],
  ['--equipment','assembled','--topology','graph','--recovery','bounded'],
  ['--equipment','assembled','--topology','graph','--site-width','20'],
  ['--equipment','assembled','--topology','octagon']
 ]){
  assert.throws(()=>parseR134FreshArgs(['--model','qwen3:14b',
   '--brief',brief,'--out','new-gallery',...tail]),/R134_MODEL_/);
 }
});
test('one local-shaped synthetic response generates actual graph doors, assembled furniture, source 3D and evidence',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const folder=path.join(dir,'new');
 const r=await runR134FreshModel({model:'qwen3:14b',brief,outDir:folder,
  equipmentMode:'assembled',topologyMode:'graph'},
  {fetcher:fakeLocal(reply())});
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(r.modelCalls,1);
 assert.equal(r.zoneCount,4);
 assert.equal(r.equipmentCount,4);
 assert.equal(r.relationalIntentFromModel,false);
 assert.equal(r.realRoomGraph3D,true);
 assert.equal(r.eachRoomHasModelChosenEquipment,true);
 assert.equal(r.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.ok(r.voxels>2500);
 assert.equal(r.worldWrites,0);
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.equal(fs.readFileSync(path.join(folder,'MODEL_RAW_ORIGINAL.txt'),'utf8'),
  JSON.stringify(reply()));
 const relation=JSON.parse(fs.readFileSync(
  path.join(folder,'R139_MODEL_SPATIAL_RELATIONS.json'),'utf8'));
 const source=JSON.parse(fs.readFileSync(
  path.join(folder,'R139_GRAPH_SOURCE_AUDIT.json'),'utf8'));
 assert.equal(relation.entryFacingZoneId,'zone-4');
 assert.equal(source.directDoors.length,2);
 assert.equal(source.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.ok(fs.existsSync(path.join(folder,'index.html')));
 assert.ok(fs.existsSync(path.join(folder,'shell.html')));
});
test('invalid model-chosen room relationship is not silently rewritten or given a valid scene',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const bad=reply();bad.relations.directAdjacencies=[['zone-1','zone-2'],['zone-2','zone-3']];
 const folder=path.join(dir,'hold');
 const r=await runR134FreshModel({model:'qwen3:14b',brief,outDir:folder,
  equipmentMode:'assembled',topologyMode:'graph'},
  {fetcher:fakeLocal(bad)});
 assert.equal(r.status,'HOLD_MODEL_OUTPUT_OR_GEOMETRY');
 assert.match(r.reason,/R139_RELATIONS_GRAPH_REQUIRES_RICHER_GEOMETRY/);
 assert.equal(r.relationalIntentFromModel,false);
 assert.equal(r.realRoomGraph3D,false);
 assert.ok(fs.existsSync(path.join(folder,'MODEL_RAW_ORIGINAL.txt')));
 assert.equal(fs.existsSync(path.join(folder,'DERIVED_B143_SOURCE.json')),false);
 assert.equal(r.worldWrites,0);
});

test('R151: one local-shaped model response emits semantic architecture IR and distinct source 3D; fake inference is not certified',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const answer=reply();
 answer.architecture={
  schema:'minecraftaibuilder-r151-envelope-intent-v1',
  entryHierarchy:'quiet',daylightStrategy:'focused',roofEdge:'parapet'};
 const out=path.join(dir,'expressive');
 const r=await runR134FreshModel({
  model:'qwen3:14b',brief,outDir:out,equipmentMode:'assembled',
  topologyMode:'graph',architectureMode:'intent'
 },{fetcher:fakeLocal(answer,body=>{
  assert.ok(body.messages[0].content.includes('objects,relations,architecture'));
  assert.ok(body.messages[0].content.includes('roofEdge fine or parapet'));
  assert.ok(body.messages[0].content.includes('\narchitecture is exactly'));
 })});
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE',r.reason);
 assert.equal(r.modelCalls,1);
 assert.equal(r.architectureIntentFromModel,false);
 assert.equal(r.architecture3DSourceOnly,true);
 assert.equal(r.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.equipmentCount,4);
 assert.ok(fs.existsSync(path.join(out,'R151_MODEL_ARCHITECTURE_IR.json')));
 assert.ok(fs.existsSync(path.join(out,'R151_HOST_ARCHITECTURE_EVIDENCE.json')));
 assert.ok(fs.existsSync(path.join(out,'index.html')));
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.equal(r.worldWrites,0);
 const oldArgs=['--model','qwen3:14b','--brief',brief,'--out','new-dir'];
 assert.throws(()=>parseR134FreshArgs([...oldArgs,'--architecture','intent']),
  /R134_MODEL_ARCHITECTURE_REQUIRES_GRAPH_TOPOLOGY/);
 const opts=parseR134FreshArgs([...oldArgs,
  '--equipment','assembled','--topology','graph','--architecture','intent']);
 assert.equal(opts.architectureMode,'intent');
});

test('R152 single synthetic provider response makes raised-section B143 with original room equipment routes',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const answer=reply();
 answer.architecture={schema:'minecraftaibuilder-r152-envelope-intent-v1',
  entryHierarchy:'quiet',daylightStrategy:'focused',
  roofEdge:'fine',section:'raised-entry'};
 const dest=path.join(dir,'r152-massing');
 const result=await runR134FreshModel({model:'qwen3:14b',brief,
  outDir:dest,topologyMode:'graph',
  equipmentMode:'assembled',architectureMode:'massing'},
  {fetcher:fakeLocal(answer,body=>{
   assert.ok(body.messages[0].content.includes('section MUST be continuous or raised-entry'));
   assert.ok(body.messages[0].content.includes('minecraftaibuilder-r152-envelope-intent-v1'));
  })});
 assert.equal(result.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE',result.reason);
 assert.equal(result.architectureIntentFromModel,false);
 assert.equal(result.architecture3DSourceOnly,true);
 assert.equal(result.equipmentCount,4);
 assert.equal(result.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.ok(fs.existsSync(path.join(dest,'R152_MODEL_ARCHITECTURE_IR.json')));
 assert.ok(fs.existsSync(path.join(dest,'R152_HOST_ARCHITECTURE_EVIDENCE.json')));
 assert.ok(fs.existsSync(path.join(dest,'index.html')));
 assert.equal(result.worldWrites,0);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 const opts=parseR134FreshArgs(['--model','qwen3:14b','--brief',brief,
  '--equipment','assembled','--topology','graph',
  '--architecture','massing','--out','r152-test']);
 assert.equal(opts.architectureMode,'massing');
});

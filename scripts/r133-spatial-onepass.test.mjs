import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {runR133OnePass,parseR133UncoachedReply,
 makeR133UncoachedRequest,parseR133Args}
 from './r133-spatial-onepass.mjs';
const source=id=>JSON.parse(fs.readFileSync(new URL(
 './fixtures/r125-qwen14b-'+id+'-20261024.json',import.meta.url),'utf8'));
const goals=()=>JSON.parse(fs.readFileSync(new URL(
 './fixtures/r133-shop-independent-goals.json',import.meta.url),'utf8'));
const proposal=axis=>({zoneOrders:[{id:'front-first',
 nearZoneId:'front-retail-space',farZoneId:'back-employee-space',axis}],
 objects:[{id:'customer-display',zoneId:'front-retail-space',
  role:'display-stand',corner:'far-left'},
 {id:'staff-storage',zoneId:'back-employee-space',
  role:'storage-rack',corner:'far-right'}]});
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r133-'));
const mocked=(output,verifyPrompt=()=>{})=>async(url,opt)=>{
 if(opt.method==='GET')return {ok:true,text:async()=>JSON.stringify({
  models:[{name:'qwen3.5:2b'}]})};
 assert.equal(opt.method,'POST');
 assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
 const body=JSON.parse(opt.body);
 assert.equal(body.model,'qwen3.5:2b');
 assert.equal(body.max_tokens,1024);
 const prompt=JSON.parse(body.messages[1].content);
 assert.equal(Object.hasOwn(prompt,'independentGoals'),false);
 assert.equal(Object.hasOwn(prompt,'zoneOrders'),false);
 assert.equal(JSON.stringify(prompt).includes('minAddedVoxels'),false);
 verifyPrompt(prompt);
 return {ok:true,text:async()=>JSON.stringify({
  choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]})};
};
test('one uncoached mock POST produces actual B143 geometry and independently passing spatial layout',async t=>{
 const root=temp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const plan=source('shop'),original=compileArchitecturePlan(plan);
 const r=await runR133OnePass({model:'qwen3.5:2b',plan,
  outDir:path.join(root,'run'),independentGoals:goals()},
  {fetcher:mocked(proposal('z'),prompt=>{
   assert.equal(prompt.buildingBrief,plan.brief);
   assert.equal(prompt.levels[0].spaces.length,2);
   assert.equal(Object.hasOwn(prompt.levels[0],'splitAxis'),false);
   assert.equal(JSON.stringify(prompt).includes('front-before-back-depth'),false);
  })});
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(r.modelCalls,1);
 assert.equal(r.originalVoxelCount,933);
 assert.equal(r.originalSourceSha256,
  '05223596d3bfa47b5d408eb05343fdcaaae4c084d18ccf4839be1f3cd088c05d');
 assert.equal(r.independentResult,'SOURCE_ONLY_REQUIREMENTS_MET_REAL_FUNCTION_UNVERIFIED');
 assert.equal(r.sourceRouteStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.ok(r.derivedVoxelCount>933);
 assert.ok(r.addedEquipmentVoxels>=20);
 assert.equal(r.assembledEquipmentCount,2);
 const dir=path.join(root,'run');
 const raw=fs.readFileSync(path.join(dir,'MODEL_ORIGINAL_UNMODIFIED.txt'),'utf8');
 assert.equal(raw,JSON.stringify(proposal('z')));
 const candidate=JSON.parse(fs.readFileSync(path.join(dir,'DERIVED_ARCHITECTURE_PLAN.json'),'utf8'));
 assert.equal(candidate.levels[0].splitAxis,'z');
 const acceptance=JSON.parse(fs.readFileSync(path.join(dir,'INDEPENDENT_ACCEPTANCE.json'),'utf8'));
 assert.deepEqual(acceptance.unmetIds,[]);
 assert.ok(fs.existsSync(path.join(dir,'index.html')));
 assert.equal(r.world.worldWrites,0);
 assert.deepEqual(r.world.gates,Array(9).fill('BLOCKED'));
});
test('a valid model proposal can produce geometry but is independently rejected for wrong room axis',async t=>{
 const root=temp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const r=await runR133OnePass({model:'qwen3.5:2b',plan:source('shop'),
  outDir:path.join(root,'wrong'),independentGoals:goals()},
  {fetcher:mocked(proposal('x'))});
 assert.equal(r.status,'HOLD_INDEPENDENT_FUNCTIONAL_REQUIREMENTS');
 assert.equal(r.modelCalls,1);
 assert.equal(r.independentResult,'HOLD_INDEPENDENT_FUNCTIONAL_REQUIREMENTS');
 assert.ok(fs.existsSync(path.join(root,'wrong/DERIVED_B143_SCENE.json')));
 const ev=JSON.parse(fs.readFileSync(
  path.join(root,'wrong/INDEPENDENT_ACCEPTANCE.json'),'utf8'));
 assert.ok(ev.unmetIds.includes('front-before-back-depth'));
 assert.equal(r.world.worldWrites,0);
});
test('malicious and ambiguous model output fails closed while preserving the original raw response',async t=>{
 const original=compileArchitecturePlan(source('shop'));
 for(const bad of [
  '{"zoneOrders":[],"objects":[]}',
  JSON.stringify({...proposal('z'),script:'execute'}),
  JSON.stringify({...proposal('z'),objects:[
   {...proposal('z').objects[0],role:'minecraft-command'}]}),
  JSON.stringify({...proposal('z'),zoneOrders:[
   {...proposal('z').zoneOrders[0],farZoneId:'ghost'}]})
 ])assert.throws(()=>parseR133UncoachedReply(bad,original),/R133_ONEPASS_/);
 const root=temp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const invalid={...proposal('z'),objects:[
  {...proposal('z').objects[0],role:'shell-command'}]};
 const r=await runR133OnePass({model:'qwen3.5:2b',plan:source('shop'),
  outDir:path.join(root,'bad')},{fetcher:mocked(invalid)});
 assert.equal(r.status,'HOLD_MODEL_OUTPUT_OR_SOURCE_CONSTRUCTION');
 assert.ok(fs.existsSync(path.join(root,'bad/MODEL_ORIGINAL_UNMODIFIED.txt')));
 assert.ok(!fs.existsSync(path.join(root,'bad/DERIVED_B143_SOURCE.json')));
 assert.equal(r.world.worldWrites,0);
});
test('missing local model makes zero POST, no inference, and no world writes',async t=>{
 const root=temp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let requests=0;
 const r=await runR133OnePass({model:'qwen3.5:2b',plan:source('shop'),
  outDir:path.join(root,'missing')},{fetcher:async(url,opt)=>{
   if(opt.method==='POST')requests++;
   return {ok:true,text:async()=>JSON.stringify({models:[]})};
  }});
 assert.equal(r.status,'HOLD_MODEL_NOT_INSTALLED');
 assert.equal(r.modelCalls,0);
 assert.equal(requests,0);
 assert.equal(r.world.worldWrites,0);
});
test('request and CLI contracts are model-size-compatible and loopback-only',()=>{
 const original=compileArchitecturePlan(source('shop'));
 const payload=makeR133UncoachedRequest(original);
 assert.equal(payload.levels.length,1);
 assert.equal(payload.axisMeaning.z,'entrance-front-to-rear');
 assert.throws(()=>parseR133Args(['--model','qwen3.5:2b','--out','x',
  '--plan','y','--endpoint','https://cloud.example/v1/chat/completions']),
  /R133_ONEPASS_LOOPBACK_ONLY/);
});
test('multi-level research fixture uses the same room-ID and role code path without a building template',async t=>{
 const root=temp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const ans={zoneOrders:[
  {id:'research-floor',nearZoneId:'observation-lab',farZoneId:'equipment-storage',axis:'x'},
  {id:'upper-floor',nearZoneId:'collaboration-hub',farZoneId:'data-recording',axis:'z'}
 ],objects:[
  {id:'observation-bench',zoneId:'observation-lab',role:'work-surface',corner:'far-right'},
  {id:'equipment-bank',zoneId:'equipment-storage',role:'equipment-bank',corner:'far-right'},
  {id:'meeting-seat',zoneId:'collaboration-hub',role:'seating',corner:'far-left'},
  {id:'record-console',zoneId:'data-recording',role:'equipment-bank',corner:'far-right'}
 ]};
 const r=await runR133OnePass({model:'qwen3.5:2b',plan:source('research'),
  outDir:path.join(root,'research')},
  {fetcher:mocked(ans,request=>assert.equal(request.levels.length,2))});
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(r.originalVoxelCount,2936);
 assert.equal(r.assembledEquipmentCount,4);
 assert.equal(r.sourceRouteStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.independentResult,'NOT_EVALUATED_NO_GOALS');
 assert.equal(r.world.worldWrites,0);
});

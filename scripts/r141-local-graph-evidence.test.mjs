import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseR141Args,runR141GraphTrial}
 from './r141-local-graph-evidence.mjs';
const dir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r141-test-'));
const valid=()=>({
 id:'new-untrained-commons',title:'Fresh multifunctional model concept',
 footprint:{width:26,depth:30},
 materials:{floor:'stone',wall:'concrete',roof:'metal'},
 layout:{axis:'z',spaces:Array.from({length:4},(_,i)=>({
  id:'unique-zone-'+(i+1),purpose:'Independent active purpose '+(i+1),
  weight:1+i%2}))},
 form:{roofProfile:'flat',facadeLanguage:'plain'},
 objects:Array.from({length:4},(_,i)=>({
  id:'custom-object-'+(i+1),zoneId:'unique-zone-'+(i+1),
  role:['work-surface','equipment-bank','seating','storage-rack'][i],
  corner:['near-left','far-left','far-right','near-right'][i]})),
 relations:{entryFacingZoneId:'unique-zone-4',
  directAdjacencies:[['unique-zone-1','unique-zone-2'],
   ['unique-zone-3','unique-zone-4']]}
});
const mock=(response=valid(),models=['qwen3:14b'])=>async(url,opts)=>{
 assert.ok(url.startsWith('http://127.0.0.1:11434/'));
 if(opts.method==='GET')
  return {ok:true,text:async()=>JSON.stringify({models:models.map(name=>({name}))})};
 assert.equal(opts.method,'POST');
 const body=JSON.parse(opts.body);
 assert.equal(body.model,'qwen3:14b');
 assert.ok(body.messages[0].content.includes('directAdjacencies'));
 return {ok:true,text:async()=>JSON.stringify({choices:[{
  finish_reason:'stop',message:{content:JSON.stringify(response)}
 }]})};
};
test('R141 parses one-command local request and rejects remote endpoints',()=>{
 assert.equal(parseR141Args([]).model,null);
 assert.equal(parseR141Args(['--model','qwen3:14b']).model,'qwen3:14b');
 assert.throws(()=>parseR141Args(['--endpoint',
  'https://paid.ai/v1/chat/completions']),/R141_TRIAL_ONLY_LOCAL_EXACT_MODEL/);
});
test('R141 fake Ollama creates actual source graph and evidence but NEVER says genuine inference',async t=>{
 const root=dir();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const destination=path.join(root,'run');
 const r=await runR141GraphTrial({outDir:destination},
  {fetcher:mock()});
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(r.selectedModel,'qwen3:14b');
 assert.equal(r.modelCalls,1);
 assert.equal(r.compiledGraph3D,true);
 assert.equal(r.modelSelectedRelations,false);
 assert.equal(r.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.equipmentCount,4);
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.equal(r.readiness,'NOT_PREPARED');
 const report=JSON.parse(fs.readFileSync(
  path.join(destination,'R141_REPORT.json'),'utf8'));
 assert.equal(report.testInjectionPresent,true);
 assert.ok(fs.existsSync(path.join(destination,'index.html')));
 assert.ok(fs.existsSync(path.join(destination,
  'single-real-local-attempt','R139_MODEL_SPATIAL_RELATIONS.json')));
 await assert.rejects(runR141GraphTrial({outDir:destination},
  {fetcher:mock()}),/R141_TRIAL_NO_OVERWRITE/);
});
test('R141 no local Qwen/Gemma prevents any POST or false 3D',async t=>{
 const root=dir();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let posts=0;
 const provider=async(url,opts)=>{
  if(opts.method==='POST')posts++;
  return {ok:true,text:async()=>JSON.stringify({models:[]})};
 };
 const dest=path.join(root,'missing');
 const result=await runR141GraphTrial({outDir:dest},
  {fetcher:provider});
 assert.equal(result.status,'HOLD_NO_QWEN_GEMMA_INSTALLED');
 assert.equal(result.modelCalls,0);
 assert.equal(posts,0);
 assert.equal(result.worldWrites,0);
});

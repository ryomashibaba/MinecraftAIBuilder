import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runV7PrivateOnce} from './r125-v7-private-once.mjs';
import {INTEGRATED_SEMANTIC_SCHEMA} from '../source/ai/r125-integrated-semantic-bridge.mjs';
const sha='a'.repeat(40);
const ciName=['R125 V4D Local Author Bridge — INJECTED TEST ONLY','Education-first offline QA'];
const jsonResponse=obj=>({ok:true,text:async()=>JSON.stringify(obj)});
function fakeCi(state='completed'){
 return async()=>({ok:true,json:async()=>({total_count:2,workflow_runs:
  ciName.map((name,i)=>({name,id:i+1,head_sha:sha,status:state,conclusion:state==='completed'?'success':null}))})});
}
function fakeModel(author,log){
 return async(url,req)=>{
  log.push({url,method:req?.method});
  if(req?.method==='GET')return jsonResponse({models:[{name:'qwen3:14b'}]});
  if(req?.method==='POST')return jsonResponse({model:'qwen3:14b',
   choices:[{finish_reason:'stop',message:{content:JSON.stringify(author)}}]});
  throw Error('NO_OTHER_TRANSPORT');
 };
}
const author=()=>({
 schema:INTEGRATED_SEMANTIC_SCHEMA,id:'water-observatory',
 concept:'Small public atmospheric observatory with separated staff and visitor functions',
 spaces:[
  {key:'arrival',purpose:'Arrival and public weather exhibition',link:null},
  {key:'observe',purpose:'Restricted staff observation and instrument desk',link:{to:'arrival',kind:'door'}}
 ],
 roofs:[
  {space:'arrival',profile:'shed',axis:'x',rank:'primary'},
  {space:'observe',profile:'shed',axis:'z',rank:'secondary'}
 ],
 entry:{face:'south',space:'arrival',intent:'Sheltered and clear visitor entrance'},
 shelters:[{purpose:'Outdoor waiting and weather observation',connectTo:'arrival',edge:'south',scale:'medium',roof:'flat'}],
 features:[{space:'observe',kind:'equipment',purpose:'Weather observation equipment'}]
});
const safeProduct=(base)=>({
 design:base.design,compiled:base.compiled,
 readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 worldContacts:0,worldWrites:0,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
});
const resource=async()=>({status:'SAFE_FOR_ONE_REQUEST',measuredAtEpochMs:Date.now()});
function sandbox(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'v7-private-one-'));
 return {root,outDir:path.join(root,'private')};
}
const params=(dir,other={})=>({
 model:'qwen3:14b',outDir:dir,headSha:sha,
 deriveIntegratedShell:safeProduct,checkResourceSafety:resource,...other
});
test('CI pending keeps model calls ZERO, still records safe HOLD',async()=>{
 const tmp=sandbox(),calls=[];
 try{
  const r=await runV7PrivateOnce(params(tmp.outDir),{
   ciFetcher:fakeCi('in_progress'),modelFetcher:fakeModel(author(),calls),headReader:()=>sha});
  assert.equal(r.status,'HOLD_REQUIRED_CI');assert.equal(r.modelGenerationAttempts,0);
  assert.equal(calls.length,0);
  assert(!fs.existsSync(path.join(tmp.outDir,'V7_MODEL_RESPONSE_ORIGINAL_PRIVATE.txt')));
  assert.equal(r.worldWrites,0);assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 }finally{fs.rmSync(tmp.root,{recursive:true,force:true});}
});
test('missing or stale physical RAM clearance keeps Ollama calls ZERO',async()=>{
 for(const clearance of [undefined,
  async()=>({status:'SAFE_FOR_ONE_REQUEST',measuredAtEpochMs:Date.now()-90000})]){
  const tmp=sandbox(),calls=[];
  try{
   const r=await runV7PrivateOnce(params(tmp.outDir,
    {checkResourceSafety:clearance}),{
    ciFetcher:fakeCi(),modelFetcher:fakeModel(author(),calls),headReader:()=>sha});
   assert.equal(r.modelGenerationAttempts,0);assert.equal(calls.length,0);
   assert.match(r.status,/^HOLD/);
  }finally{fs.rmSync(tmp.root,{recursive:true,force:true});}
 }
});
test('exactly one injected model response is stored PRIVATE, B143 candidate never promoted',async()=>{
 const tmp=sandbox(),calls=[];
 try{
  const a=author();
  const r=await runV7PrivateOnce(params(tmp.outDir),{
   ciFetcher:fakeCi(),modelFetcher:fakeModel(a,calls),headReader:()=>sha});
  assert.equal(calls.filter(x=>x.method==='POST').length,1);
  assert.equal(r.modelGenerationAttempts,1);
  assert.equal(r.status,'HOLD_INJECTED_TEST_NOT_MODEL');
  assert.equal(r.b143Recompiled,true);
  assert.equal(r.semanticFulfillment,'NOT_CERTIFIED');
  assert.equal(r.worldWrites,0);
  assert.equal(fs.readFileSync(path.join(tmp.outDir,'V7_MODEL_RESPONSE_ORIGINAL_PRIVATE.txt'),'utf8'),
   JSON.stringify(a));
  const safe=JSON.parse(fs.readFileSync(path.join(tmp.outDir,'V7_SEMANTIC_SHAREABLE.json'),'utf8'));
  assert.deepEqual(safe,r);assert(!JSON.stringify(safe).includes('observatory'));
  assert(!JSON.stringify(safe).includes(tmp.root));
  assert(fs.existsSync(path.join(tmp.outDir,'V7_TRUE_B143_SOURCE_PRIVATE.json')));
 }finally{fs.rmSync(tmp.root,{recursive:true,force:true});}
});
test('unsupported roof is rejected with original preserved, no auto-retry',async()=>{
 const tmp=sandbox(),calls=[],a=author();a.roofs[0].profile='gable';
 try{
  const r=await runV7PrivateOnce(params(tmp.outDir),{
   ciFetcher:fakeCi(),modelFetcher:fakeModel(a,calls),headReader:()=>sha});
  assert.equal(r.status,'HOLD_HOST');
  assert.equal(calls.filter(x=>x.method==='POST').length,1);
  assert(!fs.existsSync(path.join(tmp.outDir,'V7_TRUE_B143_SOURCE_PRIVATE.json')));
  assert.equal(fs.readFileSync(path.join(tmp.outDir,'V7_MODEL_RESPONSE_ORIGINAL_PRIVATE.txt'),'utf8'),
   JSON.stringify(a));
  assert.equal(r.b143Recompiled,false);assert.equal(r.worldWrites,0);
 }finally{fs.rmSync(tmp.root,{recursive:true,force:true});}
});

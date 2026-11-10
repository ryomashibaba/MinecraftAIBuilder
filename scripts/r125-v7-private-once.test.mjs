import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runV7PrivateOnce,verifyCleanHead,V7_V4H_COMPACT_SYSTEM_PROMPT} from './r125-v7-private-once.mjs';
import {INTEGRATED_SEMANTIC_SCHEMA} from '../source/ai/r125-integrated-semantic-bridge.mjs';
const sha='a'.repeat(40);
const ciName=['R125 V4D Local Author Bridge — INJECTED TEST ONLY','Education-first offline QA'];
const jsonResponse=obj=>({ok:true,text:async()=>JSON.stringify(obj)});
function fakeCi(state='completed'){
 return async()=>({ok:true,json:async()=>({total_count:2,workflow_runs:
  ciName.map((name,i)=>({name,id:i+1,head_sha:sha,status:state,
   event:i===0?'push':'workflow_dispatch',
   path:i===0?'.github/workflows/r125-v4d-local-author-bridge.yml':'.github/workflows/qa.yml',
   conclusion:state==='completed'?'success':null}))})});
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

test('resource safety revoked after Ollama listing forbids model POST',async()=>{
 const tmp=sandbox(),calls=[];let checks=0;
 try{
  const monitor=async()=>{
   checks++;
   return checks===1?
    {status:'SAFE_FOR_ONE_REQUEST',measuredAtEpochMs:Date.now()}:
    {status:'HOLD_RESOURCE_REVOKED',measuredAtEpochMs:Date.now()};
  };
  const r=await runV7PrivateOnce(params(tmp.outDir,
   {checkResourceSafety:monitor}),{
   ciFetcher:fakeCi(),modelFetcher:fakeModel(author(),calls),headReader:()=>sha});
  assert.equal(checks,2);
  assert.equal(r.status,'HOLD_RESOURCE_UNKNOWN');
  assert.equal(r.modelGenerationAttempts,0);
  assert.deepEqual(calls.map(c=>c.method),['GET']);
  assert(!fs.existsSync(path.join(tmp.outDir,'V7_MODEL_RESPONSE_ORIGINAL_PRIVATE.txt')));
  assert.equal(r.worldWrites,0);
 }finally{fs.rmSync(tmp.root,{recursive:true,force:true});}
});
test('future-dated resource assertions fail closed before Ollama contact',async()=>{
 const tmp=sandbox(),calls=[];
 try{
  const r=await runV7PrivateOnce(params(tmp.outDir,{
   checkResourceSafety:async()=>({status:'SAFE_FOR_ONE_REQUEST',
    measuredAtEpochMs:Date.now()+10000})
  }),{ciFetcher:fakeCi(),modelFetcher:fakeModel(author(),calls),headReader:()=>sha});
  assert.equal(r.status,'HOLD_RESOURCE_UNKNOWN');
  assert.equal(r.modelGenerationAttempts,0);
  assert.equal(calls.length,0);
 }finally{fs.rmSync(tmp.root,{recursive:true,force:true});}
});

test('exact-head verifier rejects dirty checkout before trusting Git SHA',()=>{
 const seen=[];
 assert.throws(()=>verifyCleanHead({gitCommand:'git',repoRoot:'/isolated',
  gitExec:(_bin,args)=>{
   seen.push(args[2]);
   return args[2]==='status'?'?? modified-file.mjs\n':sha+'\n';
  }
 }),/WORKTREE_DIRTY_OR_UNVERIFIED/);
 assert.deepEqual(seen,['status']);
 const cleanCalls=[];
 assert.equal(verifyCleanHead({gitCommand:'git',repoRoot:'/isolated',
  gitExec:(_bin,args)=>{
   cleanCalls.push(args[2]);
   return args[2]==='status'?'':sha+'\n';
  }
 }),sha);
 assert.deepEqual(cleanCalls,['status','rev-parse']);
});
test('HEAD changed after Ollama listing forbids one-shot model POST',async()=>{
 const tmp=sandbox(),calls=[];let reads=0;
 try{
  const r=await runV7PrivateOnce(params(tmp.outDir),{
   ciFetcher:fakeCi(),modelFetcher:fakeModel(author(),calls),
   headReader:()=>++reads===1?sha:'b'.repeat(40)
  });
  assert.equal(reads,2);
  assert.equal(r.status,'HOLD_HEAD_MISMATCH');
  assert.equal(r.reason,'HEAD_CHANGED_BEFORE_MODEL');
  assert.equal(r.modelGenerationAttempts,0);
  assert.deepEqual(calls.map(c=>c.method),['GET']);
  assert.equal(r.worldWrites,0);
  assert(!fs.existsSync(path.join(tmp.outDir,'V7_MODEL_RESPONSE_ORIGINAL_PRIVATE.txt')));
 }finally{fs.rmSync(tmp.root,{recursive:true,force:true});}
});

test('real network transport combined with fake HEAD or CI must HOLD before all requests',async()=>{
 const tmp=sandbox();
 try{
  const r=await runV7PrivateOnce(params(tmp.outDir),{
   ciFetcher:fakeCi(),headReader:()=>sha
  });
  assert.equal(r.status,'HOLD_REAL_TRANSPORT_WITH_INJECTION');
  assert.equal(r.modelGenerationAttempts,0);
  assert.equal(r.worldWrites,0);
  assert(!fs.existsSync(path.join(tmp.outDir,'V7_MODEL_RESPONSE_ORIGINAL_PRIVATE.txt')));
 }finally{fs.rmSync(tmp.root,{recursive:true,force:true});}
});

test('independent monitor must advance both heartbeat and actual measurement time',async()=>{
 const {monitorSampleAdvanced}=await import('./r125-v7-private-once.mjs');
 const now=Date.now();
 const base={status:'SAFE_FOR_ONE_REQUEST',measuredAtEpochMs:now-1500,
  independentMonitorActive:true,monitorId:'private-worker-001',
  monitorHeartbeatEpochMs:now-1200};
 const advanced={...base,measuredAtEpochMs:now-200,
  monitorHeartbeatEpochMs:now-100};
 assert.equal(monitorSampleAdvanced(base,advanced,now),true);
 assert.equal(monitorSampleAdvanced(base,base,now),false);
 // A live heartbeat with cached measurements must not be treated as live sampling.
 assert.equal(monitorSampleAdvanced(base,{...advanced,
  measuredAtEpochMs:base.measuredAtEpochMs},now),false);
 assert.equal(monitorSampleAdvanced(base,{...advanced,
  measuredAtEpochMs:base.measuredAtEpochMs-1},now),false);
 assert.equal(monitorSampleAdvanced(base,{...advanced,
  measuredAtEpochMs:now+100},now),false);
 assert.equal(monitorSampleAdvanced(base,{...advanced,
  measuredAtEpochMs:undefined},now),false);
 assert.equal(monitorSampleAdvanced(base,{...advanced,
  monitorId:'private-worker-002'},now),false);
 assert.equal(monitorSampleAdvanced(base,{...advanced,
  monitorHeartbeatEpochMs:now+100},now),false);
 assert.equal(monitorSampleAdvanced(base,{...advanced,
  monitorHeartbeatEpochMs:now-3500},now),false);
 assert.equal(monitorSampleAdvanced({...base,independentMonitorActive:false},
  advanced,now),false);
});

test('pre-POST clearance rejects cached SAFE measurements before any model attempt',async()=>{
 const {prePostMonitorReady}=await import('./r125-v7-private-once.mjs');
 const now=Date.now();
 const first={status:'SAFE_FOR_ONE_REQUEST',measuredAtEpochMs:now-1500,
  independentMonitorActive:true,monitorId:'private-worker-001',
  monitorHeartbeatEpochMs:now-1400};
 const next={...first,measuredAtEpochMs:now-100,
  monitorHeartbeatEpochMs:now-50};
 assert.equal(prePostMonitorReady(first,next,now),true);
 assert.equal(prePostMonitorReady(first,first,now),false);
 assert.equal(prePostMonitorReady(first,{...next,
  measuredAtEpochMs:first.measuredAtEpochMs},now),false);
 assert.equal(prePostMonitorReady(first,{...next,
  monitorHeartbeatEpochMs:first.monitorHeartbeatEpochMs},now),false);
 assert.equal(prePostMonitorReady(first,{...next,
  monitorId:'private-worker-002'},now),false);
 assert.equal(prePostMonitorReady(first,{...next,
  status:'HOLD_RESOURCE_REVOKED'},now),false);
 assert.equal(prePostMonitorReady(first,{...next,
  measuredAtEpochMs:now+1},now),false);
 assert.equal(prePostMonitorReady({...first,
  measuredAtEpochMs:now-46000},next,now),false);
});

test('V7 V4H monitored injected source compiles true B143 yet never promotes ART or model',async()=>{
 const {MEZZANINE_SCHEMA}=await import('../source/ai/r125-v4h-mezzanine-author-ir.mjs');
 const {syntheticFiveAuthorMezzanineCases}=await import('./r125-v4h-mezzanine-source-study.mjs');
 const sample=syntheticFiveAuthorMezzanineCases()[0];
 const a={...structuredClone(sample.heightAuthor),schema:MEZZANINE_SCHEMA,
  mezzanine:structuredClone(sample.mezzanine)};
 const tmp=sandbox(),calls=[],raw=JSON.stringify(a);
 const {MEZZANINE_SYSTEM_PROMPT}=await import('../source/ai/r125-v4h-mezzanine-author-ir.mjs');
 assert(V7_V4H_COMPACT_SYSTEM_PROMPT.length<MEZZANINE_SYSTEM_PROMPT.length/2);
 assert(V7_V4H_COMPACT_SYSTEM_PROMPT.length>=2500);
 assert(V7_V4H_COMPACT_SYSTEM_PROMPT.length<4000);
 for(const requirement of ['spaces,massing,wing,floorplate,atrium,mezzanine',
  'id,purpose,kind,width,depth,roof,height,facade,windowPriority,feature,featureMaterial,attach',
  'spaceId,corner,cutWidth,cutDepth,publicAccessSide',
  'side,stairLane,deckOffsetX,deckWidth,rise,purpose',
  'nine construction gates remain BLOCKED']){
  assert(V7_V4H_COMPACT_SYSTEM_PROMPT.includes(requirement),requirement);
 }
 const fake=fakeModel(a,calls),checkedTransport=async(url,opt)=>{
  if(opt?.method==='POST'){
   const request=JSON.parse(opt.body);
   assert.equal(request.messages[0].content,V7_V4H_COMPACT_SYSTEM_PROMPT);
   assert.equal(request.options.num_ctx,2048);
   assert.equal(request.options.num_predict,1024);
   assert.equal(request.think,false);
   assert.equal(request.stream,false);
  }
  return fake(url,opt);
 };
 try{
  const result=await runV7PrivateOnce(params(tmp.outDir,{authorMode:'v4h-mezzanine'}),{
   ciFetcher:fakeCi(),modelFetcher:checkedTransport,headReader:()=>sha});
  assert.equal(result.status,'HOLD_INJECTED_TEST_NOT_MODEL',result.reason);
  assert.equal(result.protocol,'V7_PRIVATE_MONITORED_V4H_MEZZANINE_V1');
  assert.equal(calls.filter(x=>x.method==='POST').length,1);
  assert.equal(result.modelGenerationAttempts,1);
  assert.equal(result.b143Recompiled,true);
  assert(result.b143CellCount>1000);
  assert.equal(result.worldWrites,0);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert.equal(JSON.stringify(a),raw);
  assert.equal(fs.readFileSync(path.join(tmp.outDir,'V7_MODEL_RESPONSE_ORIGINAL_PRIVATE.txt'),'utf8'),raw);
  const saved=JSON.parse(fs.readFileSync(path.join(tmp.outDir,'V7_TRUE_B143_HASHES_PRIVATE.json'),'utf8'));
  assert.equal(saved.authorContract,MEZZANINE_SCHEMA);
  assert.equal(saved.geometrySha256,result.geometrySha256);
  assert(!fs.readFileSync(path.join(tmp.outDir,'V7_SEMANTIC_SHAREABLE.json'),'utf8').includes(sample.mezzanine.purpose));
 }finally{fs.rmSync(tmp.root,{recursive:true,force:true});}
});
test('V7 V4H malformed author and pending CI both HOLD without retry',async()=>{
 const tmp=sandbox(),calls=[];
 try{
  await assert.rejects(runV7PrivateOnce(params(tmp.outDir,{authorMode:'unknown'})),/AUTHOR_MODE_UNSUPPORTED/);
  assert(!fs.existsSync(tmp.outDir));
  const pending=await runV7PrivateOnce(params(tmp.outDir,{authorMode:'v4h-mezzanine'}),{
   ciFetcher:fakeCi('in_progress'),modelFetcher:fakeModel(author(),calls),headReader:()=>sha});
  assert.equal(pending.status,'HOLD_REQUIRED_CI');
  assert.equal(pending.modelGenerationAttempts,0);
  assert.equal(calls.length,0);
 }finally{fs.rmSync(tmp.root,{recursive:true,force:true});}
});

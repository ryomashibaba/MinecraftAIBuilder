import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createB198SNativeBridge,classifyOllamaServerError}
 from '../source/ai/b198s-native-ollama-source.mjs';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {runB198SSingleSource,parseB198SArgs}
 from './b198s-single-source-probe.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';

const MODEL='B198S_FIXTURE_NOT_REAL_LLM';
const mk=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198s-single-'));
async function local(handler){
 const server=http.createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {port:server.address().port,
  endpoint:'http://127.0.0.1:'+server.address().port+'/v1/chat/completions',
  close:()=>new Promise(resolve=>server.close(resolve))};
}
async function json(req){let b='';for await(const x of req)b+=String(x);return JSON.parse(b)}
function source(){
 return {
  schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'b198s-source-mock',title:'Native transport source sample',
  brief:'Deterministic CI source only, not a real authored building.',
  bounds:{width:42,height:35,depth:36},designOnly:true,
  elements:[
   {id:'entrance-floor',shape:'box',mode:'add',material:'stone',
    origin:[2,3,2],size:[37,1,30]},
   {id:'upper-floor',shape:'box',mode:'add',material:'wood',
    origin:[2,14,2],size:[14,1,30]},
   {id:'roof',shape:'ellipsoid',mode:'add',material:'glass',
    center:[20,26,17],radii:[18,7,14],shell:2},
   {id:'atrium',shape:'box',mode:'cut',
    origin:[18,4,12],size:[6,20,11]}
  ]
 };
}
const nativeResponse=(d=source(),options={})=>({
 done:options.done??true,
 done_reason:options.reason??'stop',
 message:{content:options.content??JSON.stringify({
  design:d,explanation:'Mock-generated source for CI only.',assumptions:[]})},
 total_duration:2300000000,load_duration:200000000,
 prompt_eval_duration:600000000,prompt_eval_count:190,
 eval_duration:1500000000,eval_count:72
});
function openaiInput(){
 return {method:'POST',redirect:'error',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({model:MODEL,stream:false,temperature:0.35,
   response_format:{type:'json_object'},
   messages:[{role:'system',content:'Build original valid B143 source only.'},
    {role:'user',content:'海沿いの未来型図書館と大きな吹き抜けを設計して'}]})};
}
test('B198Y classifies Ollama failures without disclosing arbitrary error text',()=>{
 assert.equal(classifyOllamaServerError('model runner has unexpectedly stopped, exit status 2'),'MODEL_RUNNER_STOPPED');
 assert.equal(classifyOllamaServerError('CUDA error: out of memory at private path'),'RESOURCE_ALLOCATION');
 assert.equal(classifyOllamaServerError('failed to allocate compute buffers'),'RESOURCE_ALLOCATION');
 assert.equal(classifyOllamaServerError('model \\"bad\\" not found'),'MODEL_NOT_FOUND');
 assert.equal(classifyOllamaServerError('invalid option json'),'REQUEST_OPTION_UNSUPPORTED');
 assert.equal(classifyOllamaServerError('private arbitrary text'),'UNCLASSIFIED_SERVER_FAILURE');
});
test('B198Y HTTP 500 stores only sanitized diagnostic class and fingerprint, not private server error text',async()=>{
 const secret='C:/Users/PrivateAccount/hidden/path';
 const message='model runner process has terminated: exit status 2 '+secret;
 let calls=0;
 const srv=await local(async(req,res)=>{
  calls++;await json(req);
  res.writeHead(500,{'Content-Type':'application/json'});
  res.end(JSON.stringify({error:message}));
 });
 try{
  const bridge=createB198SNativeBridge();
  const response=await bridge.fetcher(srv.endpoint,openaiInput());
  assert.equal(calls,1);
  assert.equal(response.ok,false);
  assert.equal(response.status,500);
  assert.deepEqual(await response.json(),{});
  const [t]=bridge.telemetry();
  assert.equal(t.outcome,'SERVER_HTTP_HOLD');
  assert.equal(t.status,500);
  assert.equal(t.serverErrorClass,'MODEL_RUNNER_STOPPED');
  assert.match(t.serverErrorFingerprintSha256,/^[a-f0-9]{64}$/);
  assert.equal(t.serverErrorTextDisclosed,false);
  assert(!JSON.stringify(t).includes(secret));
  assert(!JSON.stringify(t).includes(message));
 }finally{await srv.close()}
});
test('B198Y keeps HTTP status for non-JSON error bodies, rather than reporting invalid JSON',async()=>{
 const srv=await local(async(req,res)=>{
  await json(req);
  res.writeHead(500,{'Content-Type':'text/plain'});
  res.end('CUDA error: out of memory at secret machine location');
 });
 try{
  const b=createB198SNativeBridge();
  const response=await b.fetcher(srv.endpoint,openaiInput());
  assert.equal(response.status,500);
  assert.equal(response.ok,false);
  assert.equal(b.telemetry()[0].serverErrorClass,'RESOURCE_ALLOCATION');
  assert(!JSON.stringify(b.telemetry()).includes('secret machine location'));
 }finally{await srv.close()}
});
test('native transport actually sends thinking OFF, strict JSON, compact model budgets, and preserves source-only OpenAI bridge',async()=>{
 let seen=null,visits=0;
 const srv=await local(async(req,res)=>{
  visits++;assert.equal(req.method,'POST');
  assert.equal(req.url,'/api/chat');
  seen=await json(req);
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify(nativeResponse()));
 });
 try{
  const b=createB198SNativeBridge();
  const response=await b.fetcher(srv.endpoint,openaiInput());
  assert.equal(response.ok,true);
  const data=await response.json();
  assert.equal(data.choices[0].finish_reason,'stop');
  assert.equal(JSON.parse(data.choices[0].message.content).design.id,'b198s-source-mock');
  assert.equal(visits,1);
  assert.equal(seen.model,MODEL);
  assert.equal(seen.think,false);
  assert.equal(seen.format,'json');
  assert.equal(seen.stream,false);
  assert.equal(seen.keep_alive,'10m');
  assert.equal(seen.options.num_predict,3072);
  assert.equal(seen.options.num_ctx,6144);
  assert.equal(seen.messages[1].role,'user');
  assert(!JSON.stringify(seen).includes('BuildPlan'));
  assert.equal(b.telemetry().length,1);
  assert.equal(b.telemetry()[0].generatedTokensPerSecond,48);
  assert.equal(b.telemetry()[0].requestedThinkingOff,true);
  assert.equal(b.requestBudget.worldWrites,0);
 }finally{await srv.close()}
});
test('native endpoint rejects remote hosts, credentials and unsupported parameter budgets',async()=>{
 const b=createB198SNativeBridge();
 for(const url of ['https://api.openai.com/v1/chat/completions',
  'http://localhost:11434/v1/chat/completions',
  'http://127.0.0.2:11434/v1/chat/completions',
  'http://127.0.0.1:11434/api/generate']){
  await assert.rejects(b.fetcher(url,openaiInput()),/B198S_LOCAL_TRANSPORT_LOOPBACK_URL_ONLY/);
 }
 await assert.rejects(b.fetcher('http://127.0.0.1:11434/v1/chat/completions',
  {...openaiInput(),headers:{Authorization:'secret'}}),/UNSAFE_REQUEST_OPTIONS/);
 assert.throws(()=>createB198SNativeBridge({numPredict:8000}),/OUTPUT_TOKENS/);
 assert.throws(()=>createB198SNativeBridge({numCtx:1024}),/CONTEXT/);
 assert.throws(()=>createB198SNativeBridge({numCtx:4096,numPredict:3072}),/INSUFFICIENT_CONTEXT_ROOM/);
});
test('explicit deadline aborts slow source-model request without transport retries',async()=>{
 let calls=0;
 const srv=await local(async(req,res)=>{
  calls++;await json(req);
  setTimeout(()=>{if(!res.destroyed){res.writeHead(200);res.end(JSON.stringify(nativeResponse()))}},250);
 });
 try{
  const b=createB198SNativeBridge();
  const ctrl=new AbortController();
  const stop=setTimeout(()=>ctrl.abort(),35);
  await assert.rejects(b.fetcher(srv.endpoint,{
   ...openaiInput(),signal:ctrl.signal
  }),/B198S_LOCAL_TRANSPORT_MODEL_DEADLINE_EXPIRED/);
  clearTimeout(stop);
  assert.equal(calls,1);
  assert.equal(b.telemetry()[0].outcome,'TRANSPORT_HOLD');
 }finally{await srv.close()}
});
test('native incomplete JSON is NOT presented as a successful building',async()=>{
 const srv=await local(async(req,res)=>{
  await json(req);
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify(nativeResponse(source(),{reason:'length',content:'{"design":{'})));
 });
 try{
  const bridge=createB198SNativeBridge();
  const adapter=createB198GLocalModelAdapter({
   model:MODEL,endpoint:srv.endpoint,
   fetcher:bridge.fetcher,timeoutMs:2000
  });
  await assert.rejects(adapter({mode:'creation',prompt:'海沿いの未来型公共図書館を設計して'}),
   /B198G_LOCAL_TRUNCATED_MODEL_RESPONSE/);
  assert.equal(bridge.telemetry()[0].outcome,'MODEL_INCOMPLETE');
 }finally{await srv.close()}
});
test('single source pilot makes exactly ONE native model request, independently compiles source and writes offline 3D review',async()=>{
 let requests=0;
 const srv=await local(async(req,res)=>{
  requests++;await json(req);
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify(nativeResponse()));
 });
 const folder=mk(),study=path.join(folder,'study');
 try{
  const result=await runB198SSingleSource({
   model:MODEL,outDir:study,port:srv.port,
   timeoutSeconds:60,sourceTokens:3072,contextTokens:6144
  });
  assert.equal(requests,1);
  assert.equal(result.summary.status,'SOURCE_COMPILED_HUMAN_ARCHITECTURE_REVIEW_REQUIRED');
  assert.equal(result.summary.singleOriginalModelCallLimit,1);
  assert.equal(result.summary.full16ArchitectureBenchmarkCompleted,false);
  assert.equal(result.summary.modelCalls.length,1);
  assert.equal(result.summary.safety.worldWrites,0);
  assert.equal(result.summary.architectureSemanticOrAestheticQualityCertified,false);
  const sourceFile=path.join(study,'c01','source-design.json');
  const d=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
  const compiled=compileDesign(d);
  assert(verifyCompiled(d,compiled));
  assert.equal(result.summary.independentlyCompiled.sourceSha256,compiled.sourceSha256);
  const html=fs.readFileSync(path.join(study,'c01','index.html'),'utf8');
  assert(html.includes('MODEL PROPOSAL'));
  assert(fs.existsSync(path.join(folder,'B198S_UPLOAD_THIS_SUMMARY.json')));
  assert.equal(result.report.successfullyCompiledCaseCount,1);
 }finally{await srv.close();fs.rmSync(folder,{recursive:true,force:true})}
});
test('strictly invalid source yields a SINGLE failure and honest HOLD with diagnostic summary',async()=>{
 let calls=0;
 const srv=await local(async(req,res)=>{
  calls++;await json(req);
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify(nativeResponse(source(),{
   content:JSON.stringify({design:{no:'valid-B143'},explanation:'bad geometry',assumptions:[]})
  })));
 });
 const folder=mk();
 try{
  const run=await runB198SSingleSource({
   model:MODEL,outDir:path.join(folder,'study'),port:srv.port,timeoutSeconds:60
  });
  assert.equal(calls,1);
  assert.equal(run.summary.status,'HOLD_NO_COMPILED_SOURCE');
  assert.equal(run.summary.independentlyCompiled,null);
  assert.equal(run.report.successfullyCompiledCaseCount,0);
  assert.equal(run.summary.safety.worldWrites,0);
 }finally{await srv.close();fs.rmSync(folder,{recursive:true,force:true})}
});
test('CLI stays explicit, bounded and rejects missing/colliding options',()=>{
 const good=parseB198SArgs(['--model','qwen3.8:27b','--out','new-study']);
 assert.equal(good.sourceTokens,3072);
 assert.equal(good.contextTokens,6144);
 assert.equal(good.timeoutSeconds,300);
 assert.equal(good.port,11434);
 assert.throws(()=>parseB198SArgs(['--out','foo']),/MODEL_AND_OUT_REQUIRED/);
 assert.throws(()=>parseB198SArgs(['--model','qwen:27b','--out','foo',
  '--port','99999']),/INVALID_NUMERIC_OPTION/);
 assert.throws(()=>parseB198SArgs(['--model','qwen:27b','--out','foo',
  '--source-tokens','7000']),/INVALID_NUMERIC_OPTION/);
 assert.throws(()=>parseB198SArgs(['--model','qwen:27b','--out','foo',
  '--source-tokens','4096','--context-tokens','4096']),/OUTPUT_CONTEXT_OVERLAP/);
 assert.throws(()=>parseB198SArgs(['--model','qwen:27b','--out','foo',
  '--endpoint','https://api.openai.com']),/INVALID_OR_DUPLICATE_FLAG/);
});

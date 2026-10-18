import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {runB198RDiagnostic,parseB198RArgs,SCHEMA}
 from './b198r-local-diagnostic.mjs';

const MOCK='B198R_MOCK_NOT_REAL_LLM';
async function server(reply){
 const srv=http.createServer(reply);
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 return {port:srv.address().port,
  close:()=>new Promise(resolve=>srv.close(resolve))};
}
async function body(req){
 let s='';for await(const chunk of req)s+=String(chunk);
 return JSON.parse(s);
}
function json(res,obj,code=200){
 res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(obj));
}
test('real 127.0.0.1 HTTP request sends short NO-thinking JSON; reports model speed and VRAM as source-only evidence',async()=>{
 let posts=0,askedThinkOff=false,askedNumPredict=false;
 const srv=await server(async(req,res)=>{
  if(req.url==='/api/ps'){
   return json(res,{models:[{name:MOCK,size:17000000000,
    size_vram:14000000000,context_length:2048}]});
  }
  if(req.url==='/api/show'){
   posts++;const reqBody=await body(req);
   assert.equal(reqBody.model,MOCK);
   return json(res,{thinking:{values:[true,false],default:true}});
  }
  if(req.url==='/api/chat'){
   posts++;const reqBody=await body(req);
   askedThinkOff=reqBody.think===false;
   askedNumPredict=reqBody.options.num_predict===128;
   assert.equal(reqBody.format,'json');
   assert.equal(reqBody.stream,false);
   assert.equal(reqBody.model,MOCK);
   assert.equal(reqBody.options.num_ctx,2048);
   assert.equal(reqBody.keep_alive,'5m');
   return json(res,{model:MOCK,done:true,done_reason:'stop',
    message:{content:'{"ready":true,"parts":["floor","wall","roof"]}'},
    total_duration:2300000000,load_duration:300000000,
    prompt_eval_count:35,prompt_eval_duration:500000000,
    eval_count:40,eval_duration:1500000000});
  }
  throw Error('UNEXPECTED_ROUTE');
 });
 try{
  const report=await runB198RDiagnostic({model:MOCK,port:srv.port});
  assert.equal(report.schema,SCHEMA);
  assert.equal(report.status,'LOCAL_SMALL_JSON_PROBE_PASS');
  assert.equal(posts,2);
  assert(askedThinkOff&&askedNumPredict);
  assert.equal(report.telemetry.generatedTokens,40);
  assert.equal(report.telemetry.generatedTokensPerSecond,26.67);
  assert.equal(report.telemetry.loadSeconds,0.3);
  assert.equal(report.telemetry.promptEvalSeconds,0.5);
  assert.equal(report.modelResidency.loaded,true);
  assert.equal(report.modelResidency.vramBytes,14000000000);
  assert.equal(report.modelResidency.gpuFractionOfModelSize,0.824);
  assert.deepEqual(report.thinkingAdvertisedValues,[true,false]);
  assert.equal(report.thinkingDisabledGuaranteed,false);
  assert.equal(report.didNotAttemptFullBuilding,true);
  assert.equal(report.frozenArchitectureCasesAttempted,0);
  assert.equal(report.safety.worldWrites,0);
  assert(report.safety.gates.every(x=>x==='BLOCKED'));
 }finally{await srv.close()}
});
test('honest failure output is returned for short diagnostic deadline without retry or fabricated architecture',async()=>{
 let calls=0;
 const r=await runB198RDiagnostic({
  model:MOCK,timeoutSeconds:15,getDeviceInfo:false,
  request:async()=>{
   calls++;throw Error('B198R_DEADLINE_EXPIRED');
  }
 });
 assert.equal(calls,1);
 assert.equal(r.status,'HOLD_MODEL_REQUEST');
 assert.equal(r.problem,'B198R_DEADLINE_EXPIRED');
 assert.equal(r.modelResidency.loaded,false);
 assert.equal(r.telemetry.generatedTokensPerSecond,null);
 assert.equal(r.response.jsonMatchedExpectedShape,false);
 assert.equal(r.safety.worldWrites,0);
});
test('non-JSON and wrong answer are HOLD, not a false success',async()=>{
 const r=await runB198RDiagnostic({
  model:MOCK,getDeviceInfo:false,
  request:async()=>({
   done:true,message:{content:'not JSON'},
   eval_count:12,eval_duration:1e9
  })
 });
 assert.equal(r.status,'HOLD_SMALL_JSON_VALIDATION');
 assert.equal(r.completedShortProbe,true);
 assert.equal(r.telemetry.generatedTokensPerSecond,12);
 assert.equal(r.response.jsonMatchedExpectedShape,false);
});
test('only caller-supplied local model IDs, bounded times/ports, fresh output and known CLI flags',async()=>{
 const a=parseB198RArgs(['--model',MOCK,'--out','fresh-result.json',
  '--timeout-seconds','60','--port','11434']);
 assert.equal(a.timeoutSeconds,60);
 assert.equal(a.port,11434);
 assert.equal(parseB198RArgs(['--help']).help,true);
 await assert.rejects(runB198RDiagnostic({model:'m'}),/B198R_EXPLICIT_LOCAL_MODEL_REQUIRED/);
 for(const timeoutSeconds of [0,14,121,900,3.5]){
  await assert.rejects(runB198RDiagnostic({model:MOCK,timeoutSeconds}),
   /B198R_TIMEOUT_SECONDS_15_TO_120/);
 }
 assert.throws(()=>parseB198RArgs(['--model',MOCK,'--out','x','--port','99999']),
  /B198R_INVALID_LOCAL_PORT/);
 assert.throws(()=>parseB198RArgs(['--model',MOCK,'--out','x',
  '--timeout-seconds','360']),/B198R_INVALID_WAIT/);
 assert.throws(()=>parseB198RArgs(['--model',MOCK,'--out','x','--endpoint',
  'https://ollama.com/api']),/B198R_UNKNOWN_OR_DUPLICATE_FLAG/);
});

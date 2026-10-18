import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createB198QLoopbackFetcher}
 from '../source/ai/b198q-loopback-http.mjs';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {runB198KPairedStudy}
 from '../source/ai/b198k-paired-study.mjs';

const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198q-'));
async function local(handler){
 const server=http.createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:'http://127.0.0.1:'+server.address().port+'/v1/chat/completions',
  close:()=>new Promise(resolve=>server.close(resolve))};
}
const opts=()=>({method:'POST',redirect:'error',
 headers:{'Content-Type':'application/json'},
 body:JSON.stringify({model:'fixture-not-real-inference'})});
test('native loopback HTTP tolerates delayed headers and returns strict JSON without fetch hidden header timeout',async()=>{
 let visits=0;
 const srv=await local((req,res)=>{
  visits++;
  assert.equal(req.method,'POST');
  assert.equal(req.url,'/v1/chat/completions');
  assert.equal(req.headers.host.startsWith('127.0.0.1:'),true);
  setTimeout(()=>{
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({choices:[{message:{content:'{}'}}]}));
  },165);
 });
 try{
  const fetcher=createB198QLoopbackFetcher();
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),1200);
  const response=await fetcher(srv.url,{...opts(),signal:ctrl.signal});
  clearTimeout(timer);
  assert.equal(response.ok,true);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{choices:[{message:{content:'{}'}}]});
  assert.equal(visits,1);
 }finally{await srv.close()}
});
test('explicit AbortSignal deadline controls waiting even before model response headers',async()=>{
 const srv=await local((req,res)=>{
  setTimeout(()=>{if(!res.destroyed){res.writeHead(200);res.end('{}')}},250);
 });
 try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),45);
  const started=performance.now();
  await assert.rejects(createB198QLoopbackFetcher()(srv.url,{
   ...opts(),signal:controller.signal
  }),/B198Q_LOCAL_TRANSPORT_MODEL_DEADLINE_EXPIRED/);
  clearTimeout(timer);
  assert(performance.now()-started<700);
 }finally{await srv.close()}
});
test('server connection reset is categorized, and no silent auto retry occurs',async()=>{
 let requests=0;
 const srv=await local((req,res)=>{requests++;req.socket.destroy()});
 try{
  await assert.rejects(createB198QLoopbackFetcher()(srv.url,opts()),
   /B198Q_LOCAL_TRANSPORT_ECONNRESET/);
  assert.equal(requests,1);
 }finally{await srv.close()}
});
test('no SSRF or follow-redirect: only explicit numeric loopback can be addressed',async()=>{
 const fetcher=createB198QLoopbackFetcher();
 for(const url of [
  'https://api.openai.com/v1/chat/completions',
  'http://localhost:11434/v1/chat/completions',
  'http://127.0.0.2:11434/v1/chat/completions',
  'http://127.0.0.1:11434/v1/models',
  'http://127.0.0.1:99999/v1/chat/completions']){
  await assert.rejects(fetcher(url,opts()),/B198Q_LOCAL_TRANSPORT_NON_LOOPBACK_ENDPOINT/);
 }
 await assert.rejects(fetcher('http://127.0.0.1:11434/v1/chat/completions',
  {...opts(),headers:{Authorization:'secret'}}),/UNSAFE_REQUEST_OPTIONS/);
 const srv=await local((req,res)=>{
  res.writeHead(302,{Location:'https://api.openai.com/v1/chat/completions'});res.end('redirect');
 });
 try{
  const r=await fetcher(srv.url,opts());
  assert.equal(r.status,302);assert.equal(r.ok,false);
 }finally{await srv.close()}
});
test('both model adapters accept the strict bounded native localhost fetch transport and still validate B143',async()=>{
 const source={schema:'minecraftaibuilder-b143-building-dsl-v1',
 id:'b198q-http-source',title:'Mock actual HTTP valid voxel source',
 brief:'A floor with supported full two by two accessible tiles.',
 bounds:{width:16,height:12,depth:16},designOnly:true,
 elements:[{id:'floor-stone',mode:'add',shape:'box',material:'stone',
  origin:[2,2,2],size:[10,1,10]}]};
 let payloadSeen=null;
 const srv=await local(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  payloadSeen=JSON.parse(body);
  res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{
   content:JSON.stringify({design:source,explanation:'Loopback mock fixture for transport proof',
    assumptions:[]})}}]}));
 });
 try{
  const fn=createB198GLocalModelAdapter({model:'local-test:latest',
   endpoint:srv.url,fetcher:createB198QLoopbackFetcher(),timeoutMs:2000});
  const got=await fn({mode:'creation',prompt:'日本語の公共施設に石の床を設けて'});
  assert.equal(got.design.elements[0].id,'floor-stone');
  assert.equal(payloadSeen.model,'local-test:latest');
  assert.equal(payloadSeen.response_format.type,'json_object');
  assert.equal(payloadSeen.stream,false);
 }finally{await srv.close()}
});
test('one broken direct request prevents ALL expensive directed regeneration when stop-on-timeout enabled',async()=>{
 const parent=tmp(),dir=path.join(parent,'study');
 let requestCount=0,plannerCount=0;
 const srv=await local((req,res)=>{requestCount++;req.socket.destroy()});
 try{
  const fetcher=createB198QLoopbackFetcher();
  const generator=createB198GLocalModelAdapter({
   model:'test-double',endpoint:srv.url,fetcher,timeoutMs:2000});
  const outcome=await runB198KPairedStudy({
   generator,planner:async()=>{plannerCount++;throw Error('Should not call')},
   modelId:'TEST_DOUBLE',outDir:dir,
   providerOrigin:'INJECTED_TEST_DOUBLE',
   creationCount:1,includeRevisions:false,stopOnTimeout:true,
   directedAttempts:3,directedTopologyRounds:2,directAttempts:1
  });
  assert.equal(requestCount,1);
  assert.equal(plannerCount,0);
  assert.equal(outcome.timing.transportFailureCount,1);
  assert.equal(outcome.timing.calls[0].outcome,'TRANSPORT_FAILURE');
  assert.equal(outcome.cases.find(x=>x.caseId==='c01').armBRecord.status,
   'NOT_RUN_PRIOR_ARM_TIMEOUT');
  assert.equal(outcome.counts.directlyComparableWithBothSources,0);
  assert.equal(outcome.safety.worldWrites,0);
 }finally{await srv.close();fs.rmSync(parent,{recursive:true,force:true})}
});

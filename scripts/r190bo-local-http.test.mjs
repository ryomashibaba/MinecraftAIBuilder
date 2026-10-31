/** Offline HTTP contract regression. No model, no sockets, no waiting five minutes. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {postLocalOllama,BO_LOCAL_ENDPOINT,BO_HEADERS_TIMEOUT_MS,
 BO_TOTAL_TIMEOUT_MS,transportErrorFacts} from './r190bo-local-http.mjs';
const opts=()=>({method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},
 body:Buffer.from('{}'),signal:AbortSignal.timeout(2000)});

test('longer-than-simulated-old-header-limit reply succeeds with exact bytes and one POST',async()=>{
 let calls=0;
 const requestImpl=(url,init,listener)=>{
  calls++;assert.equal(url,BO_LOCAL_ENDPOINT);assert.equal(init.method,'POST');
  assert.equal(init.agent,false);assert.equal(init.headers['Content-Length'],'2');
  const req=new EventEmitter();req.destroyed=false;
  req.end=payload=>{
   assert.deepEqual(payload,Buffer.from('{}'));
   setTimeout(()=>{
    const res=new EventEmitter();res.statusCode=200;
    listener(res);res.emit('data',Buffer.from('{"done":true}'));res.emit('end');
   },40);
  };
  req.destroy=e=>{req.destroyed=true;req.emit('error',e)};
  return req;
 };
 const response=await postLocalOllama(BO_LOCAL_ENDPOINT,opts(),
  {requestImpl,headersTimeoutMs:100,bodyIdleTimeoutMs:100,maxResponseBytes:100});
 assert.equal(calls,1);assert.equal(response.status,200);
 assert.equal(Buffer.from(await response.arrayBuffer()).toString(),'{"done":true}');
 assert.ok(BO_HEADERS_TIMEOUT_MS>300_000);
 assert.ok(BO_TOTAL_TIMEOUT_MS>BO_HEADERS_TIMEOUT_MS);
});
test('header expiry is a bounded HOLD-classified error; no built-in retry',async()=>{
 let calls=0;
 const requestImpl=()=>{
  calls++;
  const req=new EventEmitter();req.destroyed=false;req.end=()=>{};
  req.destroy=e=>{req.destroyed=true;req.emit('error',e)};
  return req;
 };
 await assert.rejects(postLocalOllama(BO_LOCAL_ENDPOINT,opts(),{
  requestImpl,headersTimeoutMs:15,bodyIdleTimeoutMs:20}),e=>
  e.code==='R190BO_HEADERS_TIMEOUT');
 assert.equal(calls,1);
});
test('fail closed for non-local endpoint and expose only bounded transport cause',async()=>{
 let calls=0;
 assert.throws(()=>postLocalOllama('http://example.com/',opts(),{
  requestImpl:()=>{calls++;throw Error('UNSAFE')}}),/Only one exact localhost/);
 assert.equal(calls,0);
 assert.deepEqual(transportErrorFacts(Object.assign(new Error('fetch failed'),{
  cause:Object.assign(new Error('headers timed out'),{code:'UND_ERR_HEADERS_TIMEOUT'})
 })),{name:'Error',code:null,message:'fetch failed',causeName:'Error',
  causeCode:'UND_ERR_HEADERS_TIMEOUT',causeMessage:'headers timed out'});
});

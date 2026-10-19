import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {checkR8LocalModelAvailable}
 from '../source/ai/b198zr8-read-only-model-preflight.mjs';

async function server(handler){
 const actions=[];
 const s=http.createServer((req,res)=>{
  actions.push({method:req.method,url:req.url,host:req.headers.host});
  handler(req,res);
 });
 await new Promise(ok=>s.listen(0,'127.0.0.1',ok));
 return {port:s.address().port,actions,
  close:()=>new Promise(ok=>s.close(ok))};
}
test('tags check is GET-only, exact model match; aliases cannot silently substitute',async()=>{
 const s=await server((req,res)=>{
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({models:[
   {name:'qwen3.8:27b-other'},{name:'qwen3.8:27b'}]}));
 });
 try{
  const result=await checkR8LocalModelAvailable({model:'qwen3.8:27b',port:s.port});
  assert.equal(result.status,'EXACT_MODEL_LISTED');
  assert.equal(result.inferenceRequests,0);
  assert.equal(result.modelGenerationTriggered,false);
  assert.equal(result.modelActuallyLoaded,false);
  assert.deepEqual(s.actions.map(a=>[a.method,a.url]),[['GET','/api/tags']]);
  const missing=await checkR8LocalModelAvailable({model:'qwen3.8:27b2',port:s.port});
  assert.equal(missing.status,'HOLD_EXACT_MODEL_MISSING');
  assert.equal(s.actions.length,2);
 }finally{await s.close()}
});
test('stalled tags request is reported as a real timeout, not a misleading connection failure',async()=>{
 const s=await server(()=>{/* intentionally never answer */});
 try{
  const result=await checkR8LocalModelAvailable({
   model:'qwen3.8:27b',port:s.port,timeoutMs:1000});
  assert.equal(result.status,'HOLD_TAGS_TIMEOUT');
  assert.equal(result.inferenceRequests,0);
  assert.equal(s.actions.length,1);
 }finally{await s.close()}
});
test('malformed tags cannot trigger generation or be misread as installed',async()=>{
 const s=await server((req,res)=>{
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end('not a JSON response');
 });
 try{
  const result=await checkR8LocalModelAvailable({model:'qwen3.8:27b',port:s.port});
  assert.equal(result.status,'HOLD_INVALID_TAGS_JSON');
  assert.deepEqual(s.actions.map(a=>a.method),['GET']);
 }finally{await s.close()}
});

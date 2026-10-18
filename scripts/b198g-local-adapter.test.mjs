import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA as B143,compileDesign}
 from '../source/ai/b143-building-dsl.mjs';
import {createB198GLocalModelAdapter,DEFAULT_LOCAL_ENDPOINT}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {generateArchitectureWithFeedback}
 from '../source/ai/b198g-autonomous-quality.mjs';
import {parseArguments}
 from './b198g-local-design.mjs';

const design={
 schema:B143,id:'b198g-local-sample',
 title:'Independent local-provider test source',
 brief:'A supported public platform with clear headroom.',
 bounds:{width:16,height:12,depth:16},designOnly:true,
 elements:[{id:'platform',shape:'box',mode:'add',material:'stone',
   origin:[2,2,2],size:[10,1,10]}]
};
const valid=()=>JSON.stringify({
 design,explanation:'Actual geometry from the mock completion payload.',
 assumptions:[]
});
const response=(content,finish_reason='stop')=>({
 ok:true,json:async()=>({choices:[{finish_reason,message:{content}}]})
});

test('no remote/paid endpoint or unstated model is permitted; creating adapter is silent',()=>{
 let called=0;
 const fake=async()=>{called++;return response(valid());};
 assert.throws(()=>createB198GLocalModelAdapter({fetcher:fake}),
   /B198G_LOCAL_EXPLICIT_MODEL_ID_REQUIRED/);
 for(const endpoint of [
  'https://api.openai.com/v1/chat/completions',
  'http://localhost:11434/v1/chat/completions',
  'http://127.0.0.2:11434/v1/chat/completions',
  'http://127.0.0.1:11434/unsafe',
  'http://127.0.0.1:99999/v1/chat/completions',
  'http://127.0.0.1:11434/v1/chat/completions?redirect=x'
 ]){
  assert.throws(()=>createB198GLocalModelAdapter({
   model:'local-test:latest',endpoint,fetcher:fake
  }),/B198G_LOCAL_ONLY_EXPLICIT_127_0_0_1_CHAT_COMPLETIONS_ALLOWED/);
 }
 const adapter=createB198GLocalModelAdapter({
  model:'local-test:latest',fetcher:fake
 });
 assert.equal(typeof adapter,'function');
 assert.equal(called,0);
});

test('mock local JSON protocol drives a genuine B143 compile but never claims actual model',async()=>{
 let visits=0;
 const adapter=createB198GLocalModelAdapter({
  model:'my-local-model:latest',
  fetcher:async(url,opts)=>{
   visits++;
   assert.equal(url,DEFAULT_LOCAL_ENDPOINT);
   assert.equal(opts.method,'POST');
   assert.equal(opts.headers.Authorization,undefined);
   const sent=JSON.parse(opts.body);
   assert.equal(sent.model,'my-local-model:latest');
   assert.equal(sent.stream,false);
   assert.equal(sent.messages[0].role,'system');
   assert.equal(sent.messages[1].role,'user');
   assert.equal(JSON.parse(sent.messages[1].content).mode,'creation');
   return response(valid());
  }
 });
 const result=await generateArchitectureWithFeedback({
  prompt:'公共施設の見通しがよい広い石造りの床を設計して',
  generator:adapter
 });
 assert.equal(visits,1);
 assert.equal(result.report.modelInvocationCount,1);
 assert.equal(result.report.finalHighRiskCount,0);
 assert.equal(result.report.designSemanticQuality,'UNREVIEWED');
 assert.equal(result.report.generatorProvenance,
  'CALLER_SUPPLIED_NOT_INDEPENDENTLY_VERIFIED');
 assert.equal(result.report.world.worldWrites,0);
 assert.equal(compileDesign(result.design).primitives.length,100);
});

test('malformed or truncated local model content is rejected by the original strict proposal gate',async()=>{
 const failWith=async res=>{
  const adapter=createB198GLocalModelAdapter({
   model:'mock',fetcher:async()=>res
  });
  await assert.rejects(adapter({
   mode:'creation',prompt:'任意の公共施設の建築を設計して',
   previousDesign:null,feedback:[]
  }),/B198A_|B198G_LOCAL_/);
 };
 await failWith(response('not JSON'));
 await failWith(response(valid(),'length'));
 await failWith(response(JSON.stringify({design,explanation:'ok',
  assumptions:[],worldWrite:true})));
 await failWith({ok:false,status:401,json:async()=>({})});
});

test('the local CLI requires explicit model, prompt and a new output directory',()=>{
 const opts=parseArguments([
  '--model','local-model','--prompt','建築の設計指示です',
  '--out','new-review','--rounds','0'
 ]);
 assert.equal(opts.maxRepairRounds,0);
 assert.equal(opts.model,'local-model');
 assert.throws(()=>parseArguments(['--model','m']),
  /B198G_MISSING_/);
 assert.throws(()=>parseArguments([
  '--model','m','--prompt','建築指示','--out','new','--rounds','9'
 ]),/B198G_INVALID_ROUNDS/);
 assert.equal(parseArguments(['--help']).help,true);
});

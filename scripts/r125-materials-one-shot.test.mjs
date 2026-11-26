import test from 'node:test';
import assert from 'node:assert/strict';
import {createR125MaterialsTrialTransport,prepareR125MaterialsTrialRequest,replayR125DelegatedResponse} from './r125-delegated-model-trial.mjs';
import {createR125ArchitecturePlanLocalAdapter,DEFAULT_LOCAL_ENDPOINT,r125ResponseFormatForEndpoint} from '../source/ai/b198g-local-model-adapter.mjs';
import {parseR125LocalPlanArgs} from './r125-local-architecture-plan-run.mjs';
const brief='自然光の入る小さな交流施設を作ってください';
const base={model:'fake-local-author',stream:false,temperature:.55,max_tokens:4096,response_format:r125ResponseFormatForEndpoint(DEFAULT_LOCAL_ENDPOINT),messages:[{role:'system',content:'base'},{role:'user',content:JSON.stringify({architecturalRequest:brief})}]};
test('exact request capture precedes one POST; settings and user message preserved',async()=>{
 const order=[];let sent;
 const transport=createR125MaterialsTrialTransport(async(url,init)=>{order.push('post');sent=init.body;return {ok:true}},body=>{order.push('capture');assert.equal(body,JSON.stringify(prepareR125MaterialsTrialRequest(base)))});
 const init={method:'POST',redirect:'error',body:JSON.stringify(base)};
 await transport(DEFAULT_LOCAL_ENDPOINT,init);
 assert.deepEqual(order,['capture','post']);const req=JSON.parse(sent);
 assert.deepEqual(req.messages[1],base.messages[1]);assert.equal(req.model,base.model);assert.equal(req.max_tokens,4096);
 assert.ok(req.response_format.json_schema.schema.anyOf.every(v=>v.properties.roofSurface&&v.properties.wallRelief&&v.properties.blockPalette));
 await assert.rejects(transport(DEFAULT_LOCAL_ENDPOINT,init),/ONE_POST_ONLY/);
});
test('failed capture never issues POST; remote and unstructured requests rejected',async()=>{
 let posts=0;const send=async()=>{posts++};
 const init={method:'POST',redirect:'error',body:JSON.stringify(base)};
 await assert.rejects(createR125MaterialsTrialTransport(send,()=>{throw Error('disk')})(DEFAULT_LOCAL_ENDPOINT,init),/disk/);
 await assert.rejects(createR125MaterialsTrialTransport(send,()=>{})('https://example.com/v1/chat/completions',init),/TRANSPORT_BOUNDARY/);
 await assert.rejects(createR125MaterialsTrialTransport(send,()=>{})(DEFAULT_LOCAL_ENDPOINT,{...init,body:JSON.stringify({...base,response_format:{type:'json_object'}})}),/STRICT_SCHEMA/);
 assert.equal(posts,0);
});
const plan={schema:'minecraftaibuilder-r125-architecture-plan-v1',id:'material-test',title:'Synthetic',brief,footprint:{width:24,depth:24},levels:[{splitAxis:'x',splitPercent:50,spaces:[{id:'first-room',purpose:'public room',access:'public'},{id:'other-room',purpose:'shared room',access:'shared'}]}],materials:{floor:'wood',wall:'stone',roof:'wood'},blockPalette:{roof:'spruce_planks'},roofSurface:'slabs',delegatedDimensions:{width:[24,28]}};
test('adapter captures unchanged extended response and delegated replay validates it',async()=>{
 const raw=JSON.stringify(plan);let captured,posts=0;
 const fetcher=createR125MaterialsTrialTransport(async()=>{posts++;return {ok:true,json:async()=>({choices:[{message:{content:raw},finish_reason:'stop'}]})}},()=>{});
 const adapter=createR125ArchitecturePlanLocalAdapter({model:'fake-local-author',fetcher,allowDelegatedDimensions:true,onRawModelResponse:s=>captured=s});
 const answer=await adapter({prompt:brief});assert.equal(posts,1);assert.equal(captured,raw);
 assert.deepEqual(answer.plan.delegatedDimensions,plan.delegatedDimensions);
 const result=replayR125DelegatedResponse(captured,brief);assert.equal(result.originalEdited,false);
 assert.equal(result.delegationSelected,true);
 const strict=createR125ArchitecturePlanLocalAdapter({model:'fake-local-author',fetcher:async()=>({ok:true,json:async()=>({choices:[{message:{content:raw},finish_reason:'stop'}]})}),onRawModelResponse:()=>{}});
 await assert.rejects(strict({prompt:brief}));
});
test('CLI mode opt-in and no repair',()=>{
 const args=['--model','qwen3:14b','--prompt',brief,'--out','private-new'];
 assert.equal(parseR125LocalPlanArgs([...args,'--trial-mode','--materials-trial']).materialsTrial,true);
 assert.throws(()=>parseR125LocalPlanArgs([...args,'--materials-trial']),/MATERIALS_TRIAL/);
 assert.throws(()=>parseR125LocalPlanArgs([...args,'--trial-mode','--materials-trial','--repair-once']),/MATERIALS_TRIAL/);
});

test('extended fresh prompt distinguishes ordinary rooms from explicit staff observation',async()=>{
 const prompts=['自然光の入る小さな図書館を作ってください','職員の組立作業をガラス越しに見学できる施設を作ってください'];
 for(const [i,prompt] of prompts.entries()){
  let sent;
  const adapter=createR125ArchitecturePlanLocalAdapter({model:'fake-local-author',allowDelegatedDimensions:true,onRawModelResponse:()=>{},
   fetcher:createR125MaterialsTrialTransport(async(url,init)=>{sent=JSON.parse(init.body);return {ok:false,status:400}},()=>{})});
  await assert.rejects(adapter({prompt}));
  const user=JSON.parse(sent.messages[1].content);
  assert.equal(user.architecturalRequest,prompt);
  assert.match(user.observationRelationRule,i===0?/^Omit observationLink unless/:/^REQUIRED BY THIS BRIEF/);
  assert.equal(sent.response_format.json_schema.schema.anyOf.every(v=>v.required.includes('observationLink')),i===1);
  assert.equal(sent.response_format.json_schema.schema.anyOf.every(v=>Object.hasOwn(v.properties,'observationLink')),i===1);
  assert.ok(sent.response_format.json_schema.schema.anyOf.every(v=>!v.required.includes('blockPalette')));
 }
});

test('materials trial preserves required observation and spatial-only mode, without editing base',()=>{
 for(const observationRequired of [false,true])for(const spatialTreeOnly of [false,true]){
  const req={...base,response_format:r125ResponseFormatForEndpoint(DEFAULT_LOCAL_ENDPOINT,{observationRequired,spatialTreeOnly})};
  const saved=JSON.stringify(req),next=prepareR125MaterialsTrialRequest(req);
  assert.equal(JSON.stringify(req),saved);
  const vars=next.response_format.json_schema.schema.anyOf;
  assert.equal(vars.length,spatialTreeOnly?1:5);
  assert.ok(vars.every(v=>Object.hasOwn(v.properties,'observationLink')===observationRequired));
  assert.ok(vars.every(v=>v.required.includes('observationLink')===observationRequired));
  assert.ok(vars.every(v=>!v.required.includes('blockPalette')));
 }
});

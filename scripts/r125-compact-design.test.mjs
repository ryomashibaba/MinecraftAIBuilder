import test from 'node:test';
import assert from 'node:assert/strict';
import {r125ResponseFormatForEndpoint,DEFAULT_LOCAL_ENDPOINT} from '../source/ai/b198g-local-model-adapter.mjs';
import {prepareR125MaterialsTrialRequest,prepareR125CompactSpatialRequest,createR125MaterialsTrialTransport} from './r125-delegated-model-trial.mjs';
import {parseR125LocalPlanArgs} from './r125-local-architecture-plan-run.mjs';
const request=(spatialTreeOnly=true,observationRequired=false)=>({model:'qwen3:14b',stream:false,temperature:.55,max_tokens:4096,
 response_format:r125ResponseFormatForEndpoint(DEFAULT_LOCAL_ENDPOINT,{spatialTreeOnly,observationRequired}),
 messages:[{role:'system',content:'Old full system'},{role:'user',content:JSON.stringify({architecturalRequest:'明るい共同作業場所を作って。',requiredFixtureRoles:['table'],observationRelationRule:'unchanged'})}]});
test('compact replaces system base only; exact schema and task retained',()=>{
 for(const observationRequired of [false,true]){
  const full=prepareR125MaterialsTrialRequest(request(true,observationRequired)),saved=structuredClone(full);
  const compact=prepareR125CompactSpatialRequest(full);
  assert.deepEqual(full,saved);
  assert.deepEqual({...compact,messages:full.messages},full);
  assert.deepEqual(compact.messages[1],full.messages[1]);
  assert.ok(compact.messages[0].content.includes('compare possible silhouettes'));
  assert.equal(compact.messages[0].content.slice(compact.messages[0].content.indexOf('\nOPTIONAL DIMENSION DELEGATION')),full.messages[0].content.slice(full.messages[0].content.indexOf('\nOPTIONAL DIMENSION DELEGATION')));
 }
 assert.throws(()=>prepareR125CompactSpatialRequest(prepareR125MaterialsTrialRequest(request(false))),/COMPACT_SPATIAL_ONLY/);
});
test('single capture and POST of actual compact payload',async()=>{
 const original=request();let captured,sent,posts=0;
 const send=createR125MaterialsTrialTransport(async(url,init)=>{posts++;sent=init.body;return {ok:true}},body=>{captured=body},{compactDesign:true});
 await send(DEFAULT_LOCAL_ENDPOINT,{method:'POST',redirect:'error',body:JSON.stringify(original)});
 assert.equal(posts,1);assert.equal(captured,sent);
 assert.deepEqual(JSON.parse(sent),prepareR125CompactSpatialRequest(prepareR125MaterialsTrialRequest(original)));
 await assert.rejects(send(DEFAULT_LOCAL_ENDPOINT,{method:'POST',redirect:'error',body:JSON.stringify(original)}),/ONE_POST_ONLY/);
});
test('compact mode cannot bypass fresh spatial materials trial',()=>{
 const base=['--model','qwen3:14b','--prompt','建物を作って','--out','private'];
 assert.equal(parseR125LocalPlanArgs([...base,'--trial-mode','--materials-trial','--spatial-tree-only','--compact-design']).compactDesign,true);
 assert.throws(()=>parseR125LocalPlanArgs([...base,'--trial-mode','--materials-trial','--compact-design']),/COMPACT_DESIGN/);
 assert.throws(()=>parseR125LocalPlanArgs([...base,'--spatial-tree-only','--compact-design']),/COMPACT_DESIGN/);
});

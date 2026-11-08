import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyOllamaStopEvidence} from '../source/ai/r125-v7-ollama-stop-evidence.mjs';

test('normal completion + empty list is only point-in-time evidence',()=>{
 const x=classifyOllamaStopEvidence({completionResponseObserved:true,models:[]});
 assert.equal(x.unloadConfirmed,true);assert.equal(x.ollamaModelAbsentAtProbe,true);
 assert.equal(x.serverStopEvidence,'COMPLETION_RESPONSE_OBSERVED');
});
test('client abort plus empty /api/ps does not prove server stop',()=>{
 const x=classifyOllamaStopEvidence({clientAbortSignaled:true,models:[]});
 assert.equal(x.unloadConfirmed,false);
 assert.equal(x.serverStopEvidence,'UNKNOWN_AFTER_CLIENT_ABORT');
});
test('abort signaled despite completion fails closed',()=>{
 assert.equal(classifyOllamaStopEvidence({clientAbortSignaled:true,completionResponseObserved:true,models:[]}).unloadConfirmed,false);
});
test('no server completion never certifies an empty loaded-model list',()=>{
 assert.equal(classifyOllamaStopEvidence({models:[]}).unloadConfirmed,false);
});
test('model still loaded denies unload',()=>{
 assert.equal(classifyOllamaStopEvidence({completionResponseObserved:true,models:[{name:'qwen3:14b'}]}).unloadConfirmed,false);
});
test('missing or malformed /api/ps denies unload',()=>{
 for(const models of [null,undefined,{},'empty',false])
  assert.equal(classifyOllamaStopEvidence({completionResponseObserved:true,models}).unloadConfirmed,false);
});
test('non-boolean completion never authorizes unload',()=>{
 for(const completionResponseObserved of [null,0,'stop',false])
  assert.equal(classifyOllamaStopEvidence({completionResponseObserved,models:[]}).unloadConfirmed,false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {r125ResponseFormatForEndpoint,DEFAULT_LOCAL_ENDPOINT,createR125ArchitecturePlanLocalAdapter} from '../source/ai/b198g-local-model-adapter.mjs';
const get=(previous,required=false)=>r125ResponseFormatForEndpoint(DEFAULT_LOCAL_ENDPOINT,{observationRequired:required,revisionBase:previous}).json_schema.schema.anyOf;
test('revision removes unsolicited observation but preserves previous relation and explicit request',()=>{
 for(const v of get({}))assert.equal(Object.hasOwn(v.properties,'observationLink'),false);
 for(const v of get({observationLink:{viewerSpaceId:'a',workSpaceId:'b'}}))assert.ok(v.properties.observationLink);
 for(const v of get({},true))assert.ok(v.required.includes('observationLink'));
 for(const v of get(null))assert.ok(v.properties.observationLink);
});
test('revision offers previous extensions without freezing decoration or mutating original',()=>{
 const prev={blockPalette:{roof:'spruce_planks'},roofSurface:'slabs',windowRelief:'hoods'},saved=structuredClone(prev);
 for(const v of get(prev)){
  assert.ok(v.properties.blockPalette&&v.properties.windowRelief);
  assert.equal(Object.hasOwn(v.properties,'wallRelief'),false);
  assert.equal(Object.hasOwn(v.properties,'observationLink'),false);
  const [plain,shape]=v.anyOf;
  assert.equal(plain.required.includes('blockPalette'),false);
  assert.equal(Object.hasOwn(plain.properties,'roofSurface'),false);
  assert.ok(shape.required.includes('blockPalette')&&shape.required.includes('roofSurface'));
  assert.deepEqual(shape.properties.blockPalette.required,['roof']);
  assert.equal(Object.hasOwn(shape.properties,'observationLink'),false);
 }
 assert.deepEqual(prev,saved);
 for(const v of get({blockPalette:{wall:'stone'}})){
  assert.ok(v.properties.blockPalette);
  assert.equal(Object.hasOwn(v.properties,'roofSurface'),false);
 }
});
test('actual revision adapter wire uses restricted schema and unchanged previous plan',async()=>{
 const prev={id:'prior-market',blockPalette:{wall:'stone_bricks'}};
 const prompt='市場の用途を保ちながら外観を改善してください。';
 let sent;
 const author=createR125ArchitecturePlanLocalAdapter({model:'fake-local-author',onRawModelResponse:()=>{},
  fetcher:async(url,init)=>{sent=JSON.parse(init.body);return {ok:false,status:400}}});
 await assert.rejects(author({prompt,revisionContext:{previousArchitecturePlan:prev,revisionRequest:prompt}}),/LOCAL_HTTP_400/);
 assert.ok(sent.response_format.json_schema.schema.anyOf.every(v=>!Object.hasOwn(v.properties,'observationLink')&&v.properties.blockPalette));
 const payload=JSON.parse(sent.messages[1].content);
 assert.deepEqual(payload.previousArchitecturePlan,prev);
 assert.equal(payload.architecturalRequest,prompt);
 assert.match(payload.observationRelationRule,/^Omit observationLink/);
 assert.match(sent.messages[0].content,/The requested scope controls the revision/);
 assert.match(sent.messages[0].content,/preserve all unaffected authored fields exactly/);
 assert.match(sent.messages[0].content,/Do not add equipment merely to increase the fixture count/);
 assert.match(sent.messages[0].content,/When a whole-building redesign is requested/);
 assert.match(payload.modelRevisionRule,/not permission to redesign unrelated parts/);
});

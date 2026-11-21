import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {r32Courtyard,r32Bridge} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {R47_JSON_SCHEMA,R47_JSON_SCHEMA_SHA256,R47_SCHEMA_UTF8_BYTES,
 inspectR47SavedCandidate} from '../source/ai/b198zr47-json-schema-format-gate.mjs';
import {createB198SNativeBridge}
 from '../source/ai/b198s-native-ollama-source.mjs';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const variants=R47_JSON_SCHEMA.properties.design.properties.elements.items.oneOf;
const variant=(shape,mode)=>variants.find(x=>
 x.properties.shape.const===shape&&x.properties.mode.const===mode);
test('R47 schema precisely closes documented grammar escape hatches',()=>{
 assert.equal(R47_JSON_SCHEMA_SHA256,
  sha(JSON.stringify(R47_JSON_SCHEMA)));
 assert.equal(R47_SCHEMA_UTF8_BYTES,
  Buffer.byteLength(JSON.stringify(R47_JSON_SCHEMA)));
 assert.deepEqual(Object.keys(R47_JSON_SCHEMA.properties).sort(),
  ['assumptions','design','explanation','spatialPlan']);
 assert.equal(R47_JSON_SCHEMA.additionalProperties,false);
 const d=R47_JSON_SCHEMA.properties.design;
 assert.equal(d.additionalProperties,false);
 assert.deepEqual(Object.keys(d.properties.bounds.properties).sort(),
  ['depth','height','width']);
 assert.equal(d.properties.bounds.additionalProperties,false);
 assert.equal(d.properties.bounds.properties.width.minimum,8);
 assert.equal(d.properties.bounds.properties.height.maximum,96);
 assert.equal(d.properties.bounds.properties.depth.maximum,128);
 assert.equal(variants.length,11);
 for(const x of variants){
  assert.equal(x.additionalProperties,false);
  assert(x.required.includes('shape'));
  assert(x.required.includes('mode'));
  assert.equal(x.properties.shape.type,'string');
  assert.equal(x.properties.repeat.properties.count.maximum,32);
  if(x.properties.mode.const==='cut'){
   assert.equal(x.properties.material,undefined);
   assert(!x.required.includes('material'));
  }else{
   assert(x.required.includes('material'));
  }
 }
 assert.equal(variant('staircase','cut'),undefined);
 assert.equal(variant('staircase','add').properties.steps.maximum,32);
 assert.equal(variant('staircase','add').properties.steps.minimum,2);
 assert.equal(variant('staircase','add').properties.treadDepth.maximum,3);
 assert.equal(variant('staircase','add').properties.width.maximum,12);
 assert.equal(variant('box','add').properties.size.minItems,3);
 assert.equal(variant('ellipsoid','add').properties.radii.maxItems,3);
 const p=R47_JSON_SCHEMA.properties.spatialPlan;
 assert.equal(p.additionalProperties,false);
 assert.equal(p.properties.entrance.minItems,3);
 assert.equal(p.properties.headroom.enum.length,2);
 assert.deepEqual(p.properties.headroom.enum,[2,3]);
 assert.equal(p.properties.protectedVoids.items.additionalProperties,false);
 assert.equal(p.properties.destinations.items.additionalProperties,false);
 assert.equal(p.properties.functionalZones.items.additionalProperties,false);
});
test('R47 existing B143 rejects R46 extra bounds key without healing the source',()=>{
 const p=r32Courtyard();p.design.bounds.volume=3072;
 const raw=JSON.stringify(p),r=inspectR47SavedCandidate(raw);
 assert.equal(r.rawSha256,sha(raw));
 assert.equal(r.status,'HOLD_SOURCE_SYNTAX');
 assert.equal(r.errorCode,'B143_BOUNDS_FIELDS');
 assert.equal(r.rawUnmodified,true);
 assert.equal(r.modelRequests,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.safety.BuildPlan.operations.length,0);
 assert.equal(JSON.parse(raw).design.bounds.volume,3072);
});
test('R47 existing B143 rejects invalid stair steps=36; no fixup',()=>{
 const p=r32Courtyard();
 p.design.elements.push({
  id:'too-many-steps',mode:'add',shape:'staircase',
  material:'metal',origin:[2,1,2],axis:'x',direction:1,
  width:3,steps:36,treadDepth:1});
 const raw=JSON.stringify(p),r=inspectR47SavedCandidate(raw);
 assert.equal(r.status,'HOLD_SOURCE_SYNTAX');
 assert.equal(r.errorCode,'B143_STAIRCASE_FIELDS');
 assert.equal(JSON.parse(raw).design.elements.at(-1).steps,36);
});
test('R47 authentic B143 shapes remain general and not a fixed building template',()=>{
 for(const fn of [r32Courtyard,r32Bridge]){
  const raw=JSON.stringify(fn());
  const r=inspectR47SavedCandidate(raw);
  assert.equal(r.status,'STRICT_B143_AND_MODEL_DECLARED_SPATIAL_PASS_HUMAN_PENDING');
  assert(r.compilerVoxelCount>0);
  assert.equal(r.rawSha256,sha(raw));
  assert.equal(r.declaredPlanIsNotIndependent,true);
  assert.equal(r.functionalReachabilityVerified,true);
  assert.equal(r.independentlyVerifiedSpatialProgram,false);
  assert.equal(r.declaredPlanStatus,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
  assert.equal(r.visualOriginalityApproved,false);
  assert.equal(r.modelRequests,0);
 }
});
test('R47 final ordered voxels detect fake void and stop without claiming a room',()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'fill-claimed-courtyard',shape:'box',
  mode:'add',material:'metal',origin:[6,1,6],size:[4,4,4]});
 const raw=JSON.stringify(p),r=inspectR47SavedCandidate(raw);
 assert.equal(r.status,'HOLD_MODEL_DECLARED_SPATIAL_FAILURE');
 assert.equal(r.rawSha256,sha(raw));
 assert(r.voidResults.some(x=>x.id==='court-air'&&
  x.passed===false&&x.occupied>0));
 assert.equal(r.independentlyVerifiedSpatialProgram,false);
 assert.equal(r.modelQualityApproved,false);
 assert.equal(r.worldContacts,0);
});
test('R47 final ordered voxels reject blocked declared entrance without repairing coordinates',()=>{
 const p=r32Courtyard();
 p.design.elements.push({id:'block-entrance',shape:'box',
  mode:'add',material:'glass',origin:[7,1,2],size:[1,3,1]});
 const raw=JSON.stringify(p),r=inspectR47SavedCandidate(raw);
 assert.equal(r.status,'HOLD_ABSTRACT_SPATIAL_CONTRACT');
 assert.equal(r.errorCode,'B198ZR3_CONTRACT_ENTRANCE_NOT_STANDABLE');
 assert.deepEqual(JSON.parse(raw).spatialPlan.entrance,[7,1,2]);
 assert.equal(r.actualMinecraftWalkabilityCertified,false);
});
async function fakeServer(raw){
 const calls=[];
 const server=http.createServer(async(req,res)=>{
  assert.equal(req.url,'/api/chat');
  assert.equal(req.method,'POST');
  let s='';for await(const c of req)s+=c.toString();
  calls.push(JSON.parse(s));
  res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify({done:true,done_reason:'stop',
   message:{content:raw},eval_count:144,total_duration:2000000000,
   eval_duration:1400000000}));
 });
 return await new Promise((ok,no)=>{
  server.once('error',no);
  server.listen(0,'127.0.0.1',()=>ok({
   calls,port:server.address().port,
   close:()=>new Promise(done=>server.close(done))}));
 });
}
test('R47 future opt-in serializes the exact schema to native Ollama; old R46 keeps json',async()=>{
 const original=JSON.stringify(r32Courtyard());
 const fake=await fakeServer(original);
 const pin=[];
 try{
  const bridge=createB198SNativeBridge({
   plannedSourceMode:true,r47SchemaFormat:true,
   onModelResponse:v=>pin.push(v.originalContent)});
  assert.equal(bridge.requestBudget.r47SchemaFormatOptIn,true);
  assert.equal(bridge.requestBudget.r47SchemaFormatSha256,
   R47_JSON_SCHEMA_SHA256);
  assert.equal(bridge.requestBudget.r46CorrectedGuideProfileOptIn,false);
  const generator=createB198GLocalModelAdapter({
   model:'qwen3.8:27b',
   endpoint:'http://127.0.0.1:'+fake.port+'/v1/chat/completions',
   fetcher:bridge.fetcher,timeoutMs:20000,plannedSourceMode:true});
  await generator({mode:'creation',prompt:'未来型の公共図書館を設計する',attempt:1,maxAttempts:1});
  assert.equal(fake.calls.length,1);
  assert.deepEqual(fake.calls[0].format,R47_JSON_SCHEMA);
  assert.equal(fake.calls[0].think,false);
  assert.equal(fake.calls[0].stream,false);
  assert.equal(fake.calls[0].options.num_predict,3072);
  assert.equal(fake.calls[0].options.num_ctx,6144);
  assert.deepEqual(pin,[original]);
  assert.equal(bridge.telemetry()[0].rawModelOutputEvidenceStored,true);

  const old=createB198SNativeBridge({plannedSourceMode:true,
   r46CorrectedGuide:true});
  assert.equal(old.requestBudget.r47SchemaFormatOptIn,false);
  assert.equal(old.requestBudget.r46CorrectedGuideProfileOptIn,true);
  const genOld=createB198GLocalModelAdapter({
   model:'qwen3.8:27b',
   endpoint:'http://127.0.0.1:'+fake.port+'/v1/chat/completions',
   fetcher:old.fetcher,plannedSourceMode:true,timeoutMs:20000});
  await genOld({mode:'creation',prompt:'未来型の公共図書館を設計する',attempt:1,maxAttempts:1});
  assert.equal(fake.calls.length,2);
  assert.equal(fake.calls[1].format,'json');
 }finally{await fake.close()}
});
test('R47 rejects stacking structured mode with any historical or ungated profile',()=>{
 for(const bad of [
  {r46CorrectedGuide:true},{r44SpaceGuide:true},
  {compactPlannedGuide:true},{r22QualityGuide:true},
  {plannedSourceMode:false},{addArchitectureGuide:false}
 ]){
  assert.throws(()=>createB198SNativeBridge({
   plannedSourceMode:true,addArchitectureGuide:true,
   r47SchemaFormat:true,...bad
  }),/R47_SCHEMA_REQUIRES_EXCLUSIVE_PLANNED_MODE/);
 }
});

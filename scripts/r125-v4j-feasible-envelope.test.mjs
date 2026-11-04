import test from 'node:test';
import assert from 'node:assert/strict';
import {V4J_ENVELOPE_PROTOCOL,V4J_ENVELOPE_BOUNDS,
 V4J_ENVELOPE_CIVIC_SCHEMA as s,V4J_ENVELOPE_RESPONSE_FORMAT as fmt,
 V4J_ENVELOPE_SYSTEM_PROMPT as p}
 from '../source/ai/r125-v4j-feasible-envelope.mjs';
import {V4J_STRUCTURED_CIVIC_JSON_SCHEMA as original}
 from '../source/ai/r125-v4j-structured-author-schema.mjs';

test('V4 mathematically guarantees the massing width/depth prerequisite for ANY covered target and selected cut',()=>{
 const covered=s.properties.spaces.items.oneOf.find(x=>x.properties.kind.enum[0]==='covered');
 const sky=s.properties.spaces.items.oneOf.find(x=>x.properties.kind.enum[0]==='sky');
 assert(covered&&sky);
 const dims=[covered.properties.width,covered.properties.depth];
 const cuts=[s.properties.massing.properties.cutWidth,
  s.properties.massing.properties.cutDepth];
 assert.equal(dims[0].minimum,22);
 assert.equal(cuts[0].maximum,8);
 for(let axis=0;axis<2;axis++){
  for(let room=dims[axis].minimum;room<=dims[axis].maximum;room++){
   for(let cut=cuts[axis].minimum;cut<=cuts[axis].maximum;cut++){
    assert(room>=2*cut+6,{room,cut,axis});
   }
  }
 }
 assert.deepEqual(V4J_ENVELOPE_BOUNDS,
  {coveredMin:22,coveredMax:30,cutMin:7,cutMax:8});
 assert.equal(sky.properties.width.minimum,18);
 assert.equal(sky.properties.depth.maximum,30);
});
test('V4 does not change any prior V3 schema/contract or fix model chosen geometry',()=>{
 assert.equal(original.properties.spaces.items.oneOf[0].properties.width.minimum,18);
 assert.equal(original.properties.massing.properties.cutWidth.maximum,10);
 assert.notEqual(s,original);
 assert.equal(s.required.length,12);
 assert.equal(s.properties.spaces.minItems,3);
 assert.deepEqual(s.properties.schema.enum,original.properties.schema.enum);
 assert.deepEqual(s.properties.arcade,original.properties.arcade);
 assert.equal(fmt.type,'json_schema');
 assert.equal(fmt.json_schema.strict,true);
 assert.deepEqual(fmt.json_schema.schema,s);
 assert.equal(V4J_ENVELOPE_PROTOCOL,'V4J_SINGLE_RESPONSE_FEASIBLE_MASSING_V4');
 assert(p.includes('22..30')&&p.includes('7..8'));
 assert(p.includes('ANY covered room'));
 assert(p.includes('no pair of rooms has area overlap'));
 for(const genre of ['housing','shop','research','gallery','station']){
  assert(!JSON.stringify(s).includes('"'+genre+'"'));
 }
});

test('V4 one local synthetic request uses envelope schema once, V2/V3 remain unchanged',async()=>{
 const {runV4DLocalAuthor}=await import('./r125-v4d-local-architect.mjs');
 const {createHash}=await import('node:crypto');
 const fs=await import('node:fs');
 const os=await import('node:os');
 const path=await import('node:path');
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'v4j-v4-envelope-'));
 const dest=path.join(d,'one'),calls=[];
 const fetcher=async(_url,options)=>{
  calls.push({method:options?.method,body:options?.body});
  if(options.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:[{name:'qwen3:14b'}]})};
  if(options.method==='POST')return {ok:true,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',message:{
    role:'assistant',content:'{"schema":"fake-invalid-model-output"}'}}]
  })};
  throw Error('UNEXPECTED_REQUEST');
 };
 try{
  await assert.rejects(runV4DLocalAuthor({
   model:'qwen3:14b',outDir:dest,prompt:'new public architectural housing brief',
   authorArcade:true,precisionCivicContract:true,geometryEnvelopeV4:true
  },{fetcher}),/V4_ENVELOPE_REQUIRES_STRUCTURED_CIVIC_AUTHOR/);
  assert.equal(calls.length,0);
  const r=await runV4DLocalAuthor({
   model:'qwen3:14b',outDir:dest,prompt:'new public architectural housing brief',
   authorArcade:true,precisionCivicContract:true,
   structuredCivicContract:true,geometryEnvelopeV4:true
  },{fetcher});
  assert.equal(r.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.equal(r.testInjectionPresent,true);
  assert.deepEqual(calls.map(c=>c.method),['GET','POST']);
  const body=JSON.parse(calls[1].body);
  assert.deepEqual(body.response_format,fmt);
  assert.equal(body.messages[0].content,p);
  assert.equal(body.stream,false);
  const h=createHash('sha256').update(JSON.stringify(s)).digest('hex');
  assert.equal(r.promptProtocol,V4J_ENVELOPE_PROTOCOL);
  assert.equal(r.structuredSchemaSha256,h);
  const req=JSON.parse(fs.readFileSync(path.join(dest,'LOCAL_REQUEST.json'),'utf8'));
  assert.equal(req.promptProtocol,V4J_ENVELOPE_PROTOCOL);
  assert.equal(req.structuredSchemaSha256,h);
  assert.equal(req.nModelGenerationAttemptsAllowed,1);
  assert.equal(req.noPaidAPI,true);
  assert.equal(req.noWorldAccess,true);
  assert.equal(r.worldWrites,0);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {V4J_STRUCTURED_CIVIC_JSON_SCHEMA as s,
 V4J_STRUCTURED_RESPONSE_FORMAT as fmt,V4J_STRUCTURED_SYSTEM_PROMPT as p,
 V4J_STRUCTURED_PROTOCOL as v} from '../source/ai/r125-v4j-structured-author-schema.mjs';
import {CIVIC_ARCADE_SCHEMA}
 from '../source/ai/r125-v4j-civic-author-ir.mjs';
import {V4J_PRECISION_SYSTEM_PROMPT}
 from '../source/ai/r125-v4j-precision-prompt.mjs';

test('one strict shared schema, distinct author-defined geometry: all 11 real compiler root keys',()=>{
 assert.deepEqual(s.required,[
  'schema','id','title','brief','materials','spaces',
  'massing','wing','floorplate','atrium','mezzanine','arcade']);
 assert.equal(s.additionalProperties,false);
 assert.deepEqual(s.properties.schema.enum,[CIVIC_ARCADE_SCHEMA]);
 assert.equal(s.properties.spaces.minItems,3);
 assert.equal(s.properties.spaces.maxItems,5);
 for(const shape of s.properties.spaces.items.oneOf){
  assert.equal(shape.additionalProperties,false);
  assert.equal(shape.required.length,12);
  assert(shape.required.includes('windowPriority'));
  assert.equal(shape.properties.attach.anyOf.length,2);
 }
 assert.equal(s.properties.massing.additionalProperties,false);
 assert.equal(s.properties.wing.additionalProperties,false);
 assert.equal(s.properties.atrium.additionalProperties,false);
 assert.equal(s.properties.arcade.properties.roofline.minItems,3);
 assert.equal(s.properties.arcade.properties.roofline.maxItems,3);
 assert.equal(fmt.type,'json_schema');
 assert.equal(fmt.json_schema.strict,true);
 assert.deepEqual(fmt.json_schema.schema,s);
 assert.equal(v,'V4J_SINGLE_RESPONSE_SCHEMA_GUIDED_V3');
});
test('V3 preserves independent authorship and math feasibility instead of host repair',()=>{
 assert(p.includes(V4J_PRECISION_SYSTEM_PROMPT));
 assert(p.includes('2*cutWidth+6'));
 assert(p.includes('2*cutDepth+6'));
 assert(p.includes('ALL earlier rooms'));
 assert(p.includes('no silent repair'));
 assert(!p.includes('example-house'));
 assert(!p.includes('example-shop'));
 const snap=JSON.stringify(s);
 for(const word of ['housing','shop','research','gallery','station']){
  assert(!snap.includes('"'+word+'"'));
 }
});

test('V3 only: actual V4D HTTP request uses strict JSON schema, single TEST POST and no SOURCE promotion',async()=>{
 const {runV4DLocalAuthor}=await import('./r125-v4d-local-architect.mjs');
 const {createHash}=await import('node:crypto');
 const fs=await import('node:fs');
 const path=await import('node:path');
 const os=await import('node:os');
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'v4j-v3-schema-test-'));
 const dest=path.join(d,'study'),calls=[];
 const fetcher=async(_url,opts)=>{
  calls.push({method:opts.method,body:opts.body});
  if(opts.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:[{name:'qwen3:14b'}]})};
  if(opts.method==='POST')return {ok:true,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',message:{
    role:'assistant',content:'{"schema":"invalid"}'}}]})};
  throw Error('UNEXPECTED');
 };
 try{
  await assert.rejects(runV4DLocalAuthor({
   model:'qwen3:14b',prompt:'artfully designed public building',
   outDir:dest,structuredCivicContract:true,precisionCivicContract:false,
   authorArcade:true},{fetcher}),/STRUCTURED_CONTRACT_REQUIRES_V4J_PRECISION/);
  assert.equal(calls.length,0);
  const r=await runV4DLocalAuthor({model:'qwen3:14b',
   outDir:dest,prompt:'artfully designed public building',
   precisionCivicContract:true,structuredCivicContract:true,authorArcade:true},
   {fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.equal(r.promptProtocol,v);
  assert.equal(r.testInjectionPresent,true);
  assert.deepEqual(calls.map(c=>c.method),['GET','POST']);
  const body=JSON.parse(calls[1].body);
  assert.deepEqual(body.response_format,fmt);
  assert.equal(body.messages[0].content,p);
  assert.equal(body.stream,false);
  assert.equal(body.max_tokens,4096);
  const h=createHash('sha256').update(JSON.stringify(s)).digest('hex');
  assert.equal(r.structuredSchemaSha256,h);
  const req=JSON.parse(fs.readFileSync(path.join(dest,'LOCAL_REQUEST.json'),'utf8'));
  assert.equal(req.structuredSchemaSha256,h);
  assert.equal(req.promptProtocol,v);
  assert.equal(req.nModelGenerationAttemptsAllowed,1);
  assert.equal(req.noWorldAccess,true);
  assert.equal(req.noPaidAPI,true);
  assert.equal(r.worldWrites,0);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});

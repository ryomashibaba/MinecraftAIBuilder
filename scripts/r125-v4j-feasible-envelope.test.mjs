import test from 'node:test';
import assert from 'node:assert/strict';
import {V4J_ENVELOPE_PROTOCOL,V4J_ENVELOPE_BOUNDS,
 V4J_ENVELOPE_CIVIC_SCHEMA as s,V4J_ENVELOPE_RESPONSE_FORMAT as fmt,
 V4J_ENVELOPE_SYSTEM_PROMPT as p}
 from '../source/ai/r125-v4j-feasible-envelope.mjs';
import {V4J_STRUCTURED_CIVIC_JSON_SCHEMA as original}
 from '../source/ai/r125-v4j-structured-author-schema.mjs';
import {makeV4DCompactSynthetic}
 from './r125-v4d-compact-model-fixture.mjs';
import {translateCompactModelIntent}
 from '../source/ai/r125-v4d-compact-model-ir.mjs';
import {translateRelativeAuthorIntent}
 from '../source/ai/r125-v4d-relative-author-ir.mjs';

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

test('V4 root north entry collision is independently proven by frozen graph SOURCE; no implicit author repair',()=>{
 const author=makeV4DCompactSynthetic();
 const unchanged=structuredClone(author);
 const good=translateCompactModelIntent(author).expandedMechanicalIR;
 assert.doesNotThrow(()=>translateRelativeAuthorIntent(good));
 const conflicting=structuredClone(author);
 conflicting.spaces[2].attach={
  to:conflicting.spaces[0].id,side:'north',shift:0
 };
 const doomed=translateCompactModelIntent(conflicting).expandedMechanicalIR;
 assert.throws(()=>translateRelativeAuthorIntent(doomed),/R125_V4D_GRAPH_ENTRY/);
 assert.deepEqual(author,unchanged);
 assert.equal(conflicting.spaces[2].attach.side,'north');
 assert(p.includes('Never attach ANY later space directly to spaces[0].id with attach.side="north"'));
 assert(p.includes('no host redirection or hidden repair'));
});

test('V4 shared geometry guidance rejects same-side sibling overlap in frozen graph, without host repair',()=>{
 const author=makeV4DCompactSynthetic();
 const original=structuredClone(author);
 const good=translateCompactModelIntent(author).expandedMechanicalIR;
 assert.doesNotThrow(()=>translateRelativeAuthorIntent(good));
 const collision=structuredClone(author);
 collision.spaces[2].attach={
  to:collision.spaces[0].id,side:'west',shift:0
 };
 const doomed=translateCompactModelIntent(collision).expandedMechanicalIR;
 assert.throws(()=>translateRelativeAuthorIntent(doomed),
  /R125_V4D_GRAPH_SOLID_FOOTPRINT_OVERLAP/);
 assert.deepEqual(author,original);
 assert.equal(collision.spaces[2].attach.side,'west');
 assert(p.includes('V4 RELATIVE PLAN CHECK'));
 assert(p.includes('parent.x+parent.width-1'));
 assert(p.includes('parent.z-child.depth+1'));
 assert(p.includes('floor((parentSize-childSize)/2)+attach.shift'));
 assert(p.includes('>=7 cells of contact'));
 assert(p.includes('failed original JSON is never silently moved or repaired'));
});

test('V4 real GRAPH_ENTRY evidence prompts a root-relative final adjacency check without disabling other north links',()=>{
 assert(p.includes('set rootId=spaces[0].id'));
 assert(p.includes('attach.to equals rootId AND attach.side is north'));
 assert(p.includes('north attachment on a NONROOT parent is not automatically forbidden'));
 assert(p.includes('do not ask the HOST to relocate any room'));
 assert.deepEqual(s.properties.spaces.items.oneOf[0].properties.attach,
  original.properties.spaces.items.oneOf[0].properties.attach);
});

test('V5 independently authored root entry forces attach:null without tuple/prefixItems, retaining V4',async()=>{
 const {V4J_ENTRY_FIRST_PROTOCOL,V4J_ENTRY_FIRST_CIVIC_SCHEMA:v5,
  V4J_ENTRY_FIRST_RESPONSE_FORMAT:format,V4J_ENTRY_FIRST_SYSTEM_PROMPT:prompt,
  materializeV4JEntryFirstAuthor:convert}=
  await import('../source/ai/r125-v4j-feasible-envelope.mjs');
 assert.equal(V4J_ENTRY_FIRST_PROTOCOL,'V4J_SINGLE_RESPONSE_EXPLICIT_ENTRY_V5');
 assert.equal(v5.properties.spaces,undefined);
 assert.equal(v5.properties.entrySpace.properties.kind.enum[0],'covered');
 assert.deepEqual(v5.properties.entrySpace.properties.attach,{type:'null'});
 assert.deepEqual(v5.properties.entrySpace.required,
  s.properties.spaces.items.oneOf[0].required);
 assert.equal(v5.properties.otherSpaces.minItems,2);
 assert.equal(v5.properties.otherSpaces.maxItems,4);
 assert(v5.properties.otherSpaces.items.oneOf.every(x=>
  x.properties.attach.type==='object'));
 assert.equal(format.json_schema.strict,true);
 assert.deepEqual(format.json_schema.schema,v5);
 assert.deepEqual(v5.properties.massing,s.properties.massing);
 assert(s.properties.spaces.items.oneOf[0].properties.attach.anyOf.some(x=>x.type==='null'));
 assert(prompt.includes('entrySpace and otherSpaces INSTEAD'));
 const author={};
 for(const k of v5.required)author[k]={};
 author.schema=s.properties.schema.enum[0];
 author.entrySpace={kind:'covered',attach:null,id:'public-entry'};
 author.otherSpaces=[
  {id:'west-wing',kind:'covered',attach:{to:'public-entry',side:'west',shift:0}},
  {id:'open-yard',kind:'sky',attach:{to:'west-wing',side:'south',shift:1}}
 ];
 const snapshot=JSON.stringify(author),restored=convert(author);
 assert.equal(JSON.stringify(author),snapshot);
 assert.deepEqual(restored.spaces,[author.entrySpace,...author.otherSpaces]);
 assert.equal(restored.spaces[0].attach,null);
 assert.equal(restored.spaces[1].attach.side,'west');
 assert(!Object.hasOwn(restored,'entrySpace'));
 const wrong=structuredClone(author);
 wrong.entrySpace.attach={to:'x',side:'north',shift:0};
 assert.throws(()=>convert(wrong),/R125_V4K_ENTRY_FIRST_ROOT_ENTRY_CONTRACT/);
 const missing=structuredClone(author);
 missing.otherSpaces[1].attach=null;
 assert.throws(()=>convert(missing),/R125_V4K_ENTRY_FIRST_CHILD_ATTACHMENT_REQUIRED/);
});

test('V5 lossless entry mapping preserves genuine one-building B143 geometry and routes without host repair',async()=>{
 const {syntheticFiveV4JArcadeAuthors}=
  await import('./r125-v4j-civic-facade-study.mjs');
 const {CIVIC_ARCADE_SCHEMA,compileCivicArcadeAuthorIntent}=
  await import('../source/ai/r125-v4j-civic-author-ir.mjs');
 const {materializeV4JEntryFirstAuthor:convert}=
  await import('../source/ai/r125-v4j-feasible-envelope.mjs');
 const example=syntheticFiveV4JArcadeAuthors().find(x=>x.genre==='housing');
 assert(example);
 const authored={...structuredClone(example.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(example.arcade)};
 const {spaces,...unchangedFields}=authored;
 const separated={...unchangedFields,entrySpace:structuredClone(spaces[0]),
  otherSpaces:structuredClone(spaces.slice(1))};
 const exactOriginal=JSON.stringify(separated);
 const mapped=convert(separated);
 assert.equal(JSON.stringify(separated),exactOriginal);
 assert.deepEqual(mapped.spaces,authored.spaces);
 const a=compileCivicArcadeAuthorIntent(authored);
 const b=compileCivicArcadeAuthorIntent(mapped);
 assert.equal(b.b143.geometrySha256,a.b143.geometrySha256);
 assert.equal(b.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(b.b143.sourceRoutes.zones.length,a.b143.sourceRoutes.zones.length);
 assert.equal(b.worldContacts,0);
 assert.equal(b.worldWrites,0);
 assert.equal(b.constructionApproved,false);
 assert.deepEqual(b.gates,Array(9).fill('BLOCKED'));
 assert.equal(b.humanArt,'NOT_REVIEWED');
});

test('V6 numbered attachment reserves north of root while keeping nonroot north available',async()=>{
 const {V4J_PARENT_INDEX_PROTOCOL,V4J_PARENT_INDEX_CIVIC_SCHEMA:q,
  V4J_PARENT_INDEX_RESPONSE_FORMAT:fmt6,V4J_PARENT_INDEX_SYSTEM_PROMPT:prompt,
  materializeV4JParentIndexAuthor:adapt}=
  await import('../source/ai/r125-v4j-feasible-envelope.mjs');
 assert.equal(V4J_PARENT_INDEX_PROTOCOL,'V4J_SINGLE_RESPONSE_AUTHOR_PARENT_INDEX_V6');
 assert.equal(q.properties.entrySpace.properties.attach.type,'null');
 const roomVariants=q.properties.otherSpaces.items.oneOf;
 assert(roomVariants.length===2);
 for(const room of roomVariants){
  const options=room.properties.attach.oneOf;
  assert.equal(options.length,2);
  assert.deepEqual(options[0].properties.parentIndex.enum,[0]);
  assert(!options[0].properties.side.enum.includes('north'));
  assert(options[0].properties.side.enum.includes('west'));
  assert.equal(options[1].properties.parentIndex.minimum,1);
  assert.equal(options[1].properties.parentIndex.maximum,3);
  assert(options[1].properties.side.enum.includes('north'));
 }
 assert.equal(fmt6.json_schema.strict,true);
 assert.deepEqual(fmt6.json_schema.schema,q);
 assert(q.properties.massing.properties.cutWidth.maximum===8);
 assert(prompt.includes('parentIndex=0'));
 const sample={};
 for(const k of q.required)sample[k]={};
 sample.schema=q.properties.schema.enum[0];
 sample.entrySpace={id:'housing-entry',kind:'covered',attach:null};
 sample.otherSpaces=[
  {id:'reading-wing',kind:'covered',attach:{parentIndex:0,side:'east',shift:2}},
  {id:'sky-plaza',kind:'sky',attach:{parentIndex:1,side:'north',shift:-1}}
 ];
 const exact=JSON.stringify(sample),mapped=adapt(sample);
 assert.equal(JSON.stringify(sample),exact);
 assert.equal(mapped.spaces[1].attach.to,'housing-entry');
 assert.deepEqual(mapped.spaces[1].attach,{to:'housing-entry',side:'east',shift:2});
 assert.deepEqual(mapped.spaces[2].attach,{to:'reading-wing',side:'north',shift:-1});
 const north=structuredClone(sample);north.otherSpaces[0].attach.side='north';
 assert.throws(()=>adapt(north),/R125_V4L_PARENT_INDEX_ROOT_NORTH_FORBIDDEN/);
 const future=structuredClone(sample);future.otherSpaces[0].attach.parentIndex=1;
 assert.throws(()=>adapt(future),/R125_V4L_PARENT_INDEX_PARENT_BEFORE_CHILD/);
 const self=structuredClone(sample);self.otherSpaces[1].attach.parentIndex=2;
 assert.throws(()=>adapt(self),/R125_V4L_PARENT_INDEX_PARENT_BEFORE_CHILD/);
 const wrong=structuredClone(sample);wrong.entrySpace.attach={parentIndex:0,side:'east',shift:0};
 assert.throws(()=>adapt(wrong),/R125_V4L_PARENT_INDEX_ENTRY_CONTRACT/);
});
test('V6 authentic housing SOURCE geometry equals original model-authored reference topology',async()=>{
 const {syntheticFiveV4JArcadeAuthors}=
  await import('./r125-v4j-civic-facade-study.mjs');
 const {CIVIC_ARCADE_SCHEMA,compileCivicArcadeAuthorIntent}=
  await import('../source/ai/r125-v4j-civic-author-ir.mjs');
 const {materializeV4JParentIndexAuthor:adapt}=
  await import('../source/ai/r125-v4j-feasible-envelope.mjs');
 const sample=syntheticFiveV4JArcadeAuthors().find(x=>x.genre==='housing');
 assert(sample);
 const original={...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)};
 const {spaces,...otherFields}=original;
 const input={...otherFields,entrySpace:structuredClone(spaces[0]),
  otherSpaces:spaces.slice(1).map((s,i)=>{
   const parentIndex=spaces.slice(0,i+1).findIndex(p=>p.id===s.attach.to);
   assert(parentIndex>=0);
   return {...structuredClone(s),attach:{
    parentIndex,side:s.attach.side,shift:s.attach.shift
   }};
  })};
 const snapshot=JSON.stringify(input);
 const restored=adapt(input);
 assert.equal(JSON.stringify(input),snapshot);
 assert.deepEqual(restored.spaces,original.spaces);
 const sourceBefore=compileCivicArcadeAuthorIntent(original);
 const sourceAfter=compileCivicArcadeAuthorIntent(restored);
 assert.equal(sourceBefore.b143.geometrySha256,sourceAfter.b143.geometrySha256);
 assert.equal(sourceBefore.b143.sourceSha256,sourceAfter.b143.sourceSha256);
 assert.equal(sourceAfter.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(sourceAfter.worldWrites,0);
 assert.equal(sourceAfter.worldContacts,0);
 assert.equal(sourceAfter.constructionApproved,false);
 assert.deepEqual(sourceAfter.gates,Array(9).fill('BLOCKED'));
 assert.equal(sourceAfter.humanArt,'NOT_REVIEWED');
});

test('V6 room IDs are structurally bounded for unchanged frozen fixture and glazing suffixes',async()=>{
 const {V4J_PARENT_INDEX_CIVIC_SCHEMA:contract,V4J_PARENT_INDEX_SYSTEM_PROMPT:prompt,
  materializeV4JParentIndexAuthor:adapt}=
  await import('../source/ai/r125-v4j-feasible-envelope.mjs');
 const rootId=contract.properties.entrySpace.properties.id;
 const children=contract.properties.otherSpaces.items.oneOf;
 assert.equal(rootId.minLength,3);
 assert.equal(rootId.maxLength,25);
 assert.equal(rootId.pattern,'^[a-z][a-z0-9-]{2,24}$');
 assert(children.every(item=>item.properties.id.maxLength===25));
 assert(prompt.includes('3..25 characters'));
 assert.equal(25+'-fixture'.length<=35,true);
 assert.equal(25+'-glazing-1'.length,35);
 const v={};
 for(const k of contract.required)v[k]={};
 v.schema=contract.properties.schema.enum[0];
 v.entrySpace={id:'a'+'b'.repeat(24),kind:'covered',attach:null};
 v.otherSpaces=[
  {id:'study-room',kind:'covered',attach:{parentIndex:0,side:'east',shift:0}},
  {id:'public-garden',kind:'sky',attach:{parentIndex:1,side:'south',shift:0}}
 ];
 const original=JSON.stringify(v);
 const mapped=adapt(v);
 assert.equal(JSON.stringify(v),original);
 assert.equal(mapped.spaces[0].id.length,25);
 assert.equal(mapped.spaces[1].attach.to,mapped.spaces[0].id);
 const oldAcceptedTooLong=structuredClone(v);
 oldAcceptedTooLong.entrySpace.id='a'+'b'.repeat(27);
 assert.throws(()=>adapt(oldAcceptedTooLong),
  /R125_V4L_PARENT_INDEX_DERIVED_ROOM_IDENTIFIER_LIMIT/);
 const tooLongChild=structuredClone(v);
 tooLongChild.otherSpaces[1].id='a'+'b'.repeat(25);
 assert.throws(()=>adapt(tooLongChild),
  /R125_V4L_PARENT_INDEX_DERIVED_ROOM_IDENTIFIER_LIMIT/);
});

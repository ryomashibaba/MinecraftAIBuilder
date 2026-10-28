/** AE regression: synthetic only, no provider or world writes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {R190_STATIC_SYNTHETIC_CASES,R190_FACETED_STATIC_SYNTHETIC_CASE}
 from './r190-semantic-fixtures.mjs';
import {R190AB_SEMANTIC_FORMAT_SHA256} from '../source/ai/r190ab-semantic-contract.mjs';
import {R190AD_FORMAT_SHA256} from '../source/ai/r190ad-expressive-semantic-contract.mjs';
import {R190AE_FORMAT,R190AE_FORMAT_SHA256,inspectR190AEReply}
 from '../source/ai/r190ae-flexible-semantic-contract.mjs';
import {parseR190ABArgs,runR190AB} from './r190ab-structured-output-pilot.mjs';
const plain=()=>{const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[1]);
 p.spaces=p.spaces.map(s=>({...s,spatialRole:'enclosed'}));return p;};
const featured=()=>{const p=structuredClone(R190_FACETED_STATIC_SYNTHETIC_CASE);
 p.spaces=p.spaces.map(s=>({...s,spatialRole:s.spatialRole??'enclosed'}));
 p.roofFormIntent={spaceId:'studio',profile:'sawtooth',axis:'x',rise:3,toothWidth:3};
 p.glazedOpenings=[{spaceId:'studio',face:'south',offset:2,baseY:5,width:3,height:2}];
 return p;};
test('AE optional features are genuinely optional and schema independent',()=>{
 assert.deepEqual(R190AE_FORMAT.required,
  ['schema','id','title','brief','site','entrySpaceId','spaces','materials']);
 assert.equal(R190AE_FORMAT.properties.glazedOpenings.minItems,1);
 assert.equal(R190AE_FORMAT.additionalProperties,false);
 assert.equal(inspectR190AEReply(JSON.stringify(plain())).report.schema,
  'minecraftaibuilder-r190ae-flexible-result-v1');
 assert.notEqual(R190AE_FORMAT_SHA256,R190AD_FORMAT_SHA256);
 assert.notEqual(R190AE_FORMAT_SHA256,R190AB_SEMANTIC_FORMAT_SHA256);
 assert.equal(parseR190ABArgs(['--contract','semantic-space-flexible',
  '--task','tidal-workshop','--study','flexible-workshop-01']).contract,'semantic-space-flexible');
});
test('AE produces true 3D from three unrelated plain programs with no invented features',()=>{
 for(const source of R190_STATIC_SYNTHETIC_CASES){
  const p=structuredClone(source);p.spaces=p.spaces.map(s=>({...s,spatialRole:'enclosed'}));
  const raw=JSON.stringify(p),r=inspectR190AEReply(raw);
  assert.equal(JSON.stringify(p),raw);
  assert.equal(r.report.status,'HOST_DERIVED_FLEXIBLE_SOURCE_PROXIES_PASS_ART_HOLD',r.report.error??p.id);
  assert.equal(r.report.featureAudit.modelAuthoredFacetedWing,null);
  assert.equal(r.report.featureAudit.modelAuthoredRoofProfile,null);
  assert.equal(r.report.featureAudit.exteriorGlassCells,0);
  assert.equal(r.report.featureAudit.realOpenSkyCourtColumns,0);
  assert.equal(r.report.featureAudit.omittedFeaturesNotGeneratedByHost,true);
  assert.equal(r.report.sourceRouteAudit.reachableRoomCount,p.spaces.length);
  assert.equal(r.report.modelAuthoredB143,false);
  assert.equal(r.report.aestheticMerit,'ART_HOLD');
  assert.equal(r.report.worldWrites,0);
  assert.deepEqual(r.report.gates,Array(9).fill('BLOCKED'));
 }
});
test('AE preserves real faceting, courtyard, sawtooth roof and glazing when chosen',()=>{
 const p=featured(),r=inspectR190AEReply(JSON.stringify(p));
 assert.equal(r.report.status,'HOST_DERIVED_FLEXIBLE_SOURCE_PROXIES_PASS_ART_HOLD',r.report.error??'failed');
 assert.equal(r.report.featureAudit.trueFacetedMissingRoofCorners,12);
 assert.equal(r.report.featureAudit.realOpenSkyCourtColumns,144);
 assert.equal(r.report.featureAudit.modelAuthoredRoofProfile,'sawtooth');
 assert.equal(r.report.featureAudit.exteriorGlassCells,6);
 assert.equal(r.report.worldContacts,0);
});
test('AE holds invalid constraints and does not silently repair absent features',()=>{
 const x=plain();x.glazedOpenings=[];
 const q=inspectR190AEReply(JSON.stringify(x));assert.equal(q.report.real3D,false);
 assert.match(q.report.error,/GLAZING_COUNT/);
 const bad=plain();bad.site.height=12;bad.spaces[0].height=12;
 const before=JSON.stringify(bad),r=inspectR190AEReply(before);
 assert.equal(before,JSON.stringify(bad));
 assert.equal(r.report.real3D,false);
 assert.match(r.report.error,/R190_SEMANTIC_SPACE/);
 assert.equal(r.report.worldWrites,0);
});
test('AE fake provider single call, immutable study and no retry',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ae-fake-'));
 const calls=[],raw=JSON.stringify(plain());
 const args=['--run','--contract','semantic-space-flexible',
  '--task','tidal-workshop','--study','flexible-workshop-01'];
 try{
  const r=await runR190AB(args,{evidenceRoot:path.join(root,'evidence'),fetcher:async(url,opt)=>{
   calls.push(url);
   if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:'qwen3:14b'}]})};
   assert.equal(url,'http://127.0.0.1:11434/api/chat');
   const request=JSON.parse(opt.body);
   assert.deepEqual(request.format.required,R190AE_FORMAT.required);
   return {ok:true,json:async()=>({model:'qwen3:14b',done_reason:'stop',message:{content:raw}})};
  }});
  assert.equal(calls.length,2);
  assert.equal(r.contract,'semantic-space-flexible');
  assert.equal(r.schema,'minecraftaibuilder-r190ae-flexible-study-v1');
  assert.equal(r.schemaSha256,R190AE_FORMAT_SHA256);
  assert.equal(r.response.real3D,true);
  assert.equal(r.worldWrites,0);
  const folder=path.join(root,'evidence','flexible-workshop-01');
  assert.equal(fs.readFileSync(path.join(folder,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  assert.ok(fs.statSync(path.join(folder,'HOST_DERIVED_SOURCE_TRUE_3D.html')).size>0);
  await assert.rejects(runR190AB(args,{evidenceRoot:path.join(root,'evidence'),
   fetcher:async()=>{calls.push('RETRY');throw Error('retry was made')}}),
   /PREVIOUS_STUDY_NO_AUTOMATIC_RETRY/);
  assert.equal(calls.length,2);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AE refuses unsupported vertical and hillside cases before Ollama',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ae-hold-')),calls=[];
 try{
  for(const task of ['library','observatory','bridge-hall','vertical-market'])
   await assert.rejects(runR190AB(['--run','--contract','semantic-space-flexible',
    '--task',task,'--study','blocked-'+task],{evidenceRoot:path.join(root,'data'),
    fetcher:async()=>{calls.push(task)}}),/SEMANTIC_SINGLE_LEVEL_TASK_UNSUPPORTED/);
  assert.deepEqual(calls,[]);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

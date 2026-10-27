/** Tests are synthetic/mocked. No actual Qwen/Gemma requests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseR190RArgs,runR190RStudy} from './r190r-one-click-direct-study.mjs';
import {STUDY_BRIEF} from './r190n-one-click-research.mjs';
const raw=()=>JSON.stringify({design:{
 schema:'minecraftaibuilder-b143-building-dsl-v1',
 id:'r190r-synthetic-slab',title:'SYNTHETIC TEST SLAB',
 brief:'Flat supported platform for test, not an actual building proposal',
 bounds:{width:24,height:16,depth:24},designOnly:true,
 elements:[{id:'base',shape:'box',mode:'add',material:'stone',
  origin:[2,1,2],size:[18,1,18]}]},
 explanation:'Artificial platform only, not a model architectural result.',
 assumptions:[],spatialPlan:{
 designIntent:'Synthetic only, not an architectural design',
 massStrategy:'Single unsupported architectural slab with no building',
 circulationStrategy:'Simple unconstrained horizontal walking',
 entrance:[4,2,4],headroom:2,protectedVoids:[],
 destinations:[{id:'zone-goal',point:[11,2,11],maximumPathSteps:30}],
 functionalZones:[{id:'walk-zone',origin:[4,2,4],size:[8,1,8],
 minimumReachablePositions:50,minimumReachablePercent:70}]}});
const fetchFor=answer=>async(url,opts)=>{
 if(url==='http://127.0.0.1:11434/api/tags')
  return {ok:true,json:async()=>({models:[{name:'qwen3:14b'}]})};
 assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
 assert.equal(JSON.parse(opts.body).model,'qwen3:14b');
 return {ok:true,json:async()=>({choices:[{finish_reason:'stop',
  message:{content:answer}}]})};
};
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r190r-'));
test('R190-R options and exact original Japanese prompt',()=>{
 assert.deepEqual(parseR190RArgs([]),{model:null,fresh:false});
 assert.equal(parseR190RArgs(['--fresh']).fresh,true);
 assert.equal(parseR190RArgs(['--model','qwen3:14b']).model,'qwen3:14b');
 assert.throws(()=>parseR190RArgs(['--fresh','--fresh']),/INVALID_ARGUMENT/);
 assert.throws(()=>parseR190RArgs(['--model','bad tag']),/INVALID_ARGUMENT/);
 assert.match(STUDY_BRIEF,/修理工房/);
});
test('R190-R fake response compiles genuine B143, reuses verified original with ZERO calls',async()=>{
 const root=temporary();let n=0;
 try{
  const f=async(...args)=>{n++;return fetchFor(raw())(...args)};
  const one=await runR190RStudy([],{evidenceRoot:root,
   semanticEvidenceRoot:path.join(root,'none'),transport:'openai',
   fetcher:f,timestamp:()=>101});
  assert.equal(n,2);
  assert.equal(one.actualNewModelRequests,1);
  assert.equal(one.previewAvailable,true);
  assert.equal(one.humanArtReview,'ART_HOLD');
  assert.equal(fs.readFileSync(path.join(one.directory,
   'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),raw());
  assert.ok(fs.existsSync(path.join(one.directory,'R190_H_REAL_B143_3D.html')));
  const report=JSON.parse(fs.readFileSync(path.join(one.directory,
   'R190R_ROUTE_COMPARISON.json'),'utf8'));
  assert.equal(report.directReviewStatus,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
  assert.equal(report.hostCreatedOrRepairedDirectGeometry,false);
  assert.equal(report.modelIdentityCryptographicallyVerified,false);
  assert.equal(report.sameFrozenJapaneseRequest,true);
  assert.equal(report.semanticComparison.status,'NO_VERIFIED_MATCHING_SEMANTIC_ORIGINAL');
  assert.equal(report.qualitySuperiority,'NOT_ESTABLISHED');
  assert.equal(report.BuildPlan.operations.length,0);
  const two=await runR190RStudy([],{evidenceRoot:root,
   fetcher:()=>{throw Error('FORBIDDEN_NETWORK')}});
  assert.equal(two.actualNewModelRequests,0);
  assert.equal(two.reused,true);
  assert.equal(two.directory,one.directory);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R190-R malformed provider reply saved as HOLD; never create fake 3D',async()=>{
 const root=temporary();let n=0;
 try{
  const f=async(...args)=>{n++;return fetchFor('{"broken":true')(...args)};
  const a=await runR190RStudy([],{evidenceRoot:root,
   semanticEvidenceRoot:path.join(root,'none'),transport:'openai',
   fetcher:f,timestamp:()=>102});
  assert.equal(a.modelRunnerHOLD,true);
  assert.equal(a.previewAvailable,false);
  assert.equal(n,2);
  assert.equal(fs.readFileSync(path.join(a.directory,
   'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),'{"broken":true');
  assert.equal(fs.existsSync(path.join(a.directory,'R190_H_REAL_B143_3D.html')),false);
  const b=await runR190RStudy([],{evidenceRoot:root,
   fetcher:()=>{throw Error('FORBIDDEN_NEW_MODEL_REQUEST')}});
  assert.equal(b.reused,true);
  assert.equal(b.actualNewModelRequests,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R190-R stale SHA forces HOLD before new request, never repairs original',async()=>{
 const root=temporary();
 try{
  const a=await runR190RStudy([],{evidenceRoot:root,
   transport:'openai',fetcher:fetchFor(raw()),timestamp:()=>103});
  const original=path.join(a.directory,'R190_I_ORIGINAL_RESPONSE.txt');
  fs.appendFileSync(original,'CORRUPTED');
  await assert.rejects(runR190RStudy([],{evidenceRoot:root,
   fetcher:()=>{throw Error('OFFLINE')}}),/LOCAL_OLLAMA_UNAVAILABLE/);
  assert.ok(fs.readFileSync(original,'utf8').endsWith('CORRUPTED'));
  assert.equal(fs.readdirSync(root).length,1);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R190-R --fresh executes one fresh source request, no implicit download',async()=>{
 const root=temporary();let chat=0;
 const f=async(...args)=>{
  if(args[0].endsWith('/chat/completions'))chat++;
  return fetchFor(raw())(...args);
 };
 try{
  await runR190RStudy([],{evidenceRoot:root,fetcher:f,
   transport:'openai',timestamp:()=>104});
  await runR190RStudy(['--fresh'],{evidenceRoot:root,fetcher:f,
   transport:'openai',timestamp:()=>105});
  assert.equal(chat,2);
  await assert.rejects(runR190RStudy(['--fresh','--model','gemma4:26b'],
   {evidenceRoot:root,fetcher:f,transport:'openai',timestamp:()=>106}),
   /REQUESTED_MODEL_NOT_INSTALLED/);
  assert.equal(chat,2);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R190-R CMD is consent-gated and source-only',()=>{
 const cmd=fs.readFileSync(new URL('../RUN_R190R_DIRECT_B143.cmd',import.meta.url),'utf8');
 assert.match(cmd,/choice \/C YN \/N \/M/);
 assert.match(cmd,/git clone --depth 1 --single-branch --branch feature\/b198zr1-protected-architectural-revision/);
 assert.match(cmd,/node.exe "%runner%" %\*/);
 assert.doesNotMatch(cmd,/git pull|git reset|git checkout|ollama pull/i);
});

test('R190-R matches strictly hashed same-brief semantic evidence without upgrading its HOLD',async()=>{
 const root=temporary(),sem=path.join(root,'semantic'),evidence=path.join(sem,'r190n-100-100');
 fs.mkdirSync(evidence,{recursive:true});
 const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
 const prior='{"syntheticSemantic":"formal HOLD"}';
 const safety={readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(evidence,'R190_M_UNMODIFIED_MODEL_RESPONSE.txt'),prior);
 fs.writeFileSync(path.join(evidence,'R190_M_ORIGINAL_BRIEF.txt'),STUDY_BRIEF);
 fs.writeFileSync(path.join(evidence,'R190N_STUDY_MANIFEST.json'),JSON.stringify({
  schema:'minecraftaibuilder-r190n-study-v1',
  modelRequestedOrClaimed:'qwen3:14b',briefSha256:sha(STUDY_BRIEF),
  originalRawSha256:sha(prior),...safety}));
 fs.writeFileSync(path.join(evidence,'R190_M_EVIDENCE_RECEIPT.json'),JSON.stringify({
  originalRawSha256:sha(prior),originalBriefSha256:sha(STUDY_BRIEF),
  status:'HOLD_ORIGINAL_SEMANTIC_RESPONSE_REJECTED',
  sourceKind:null,hostDeterminedRoomCoordinates:false,...safety}));
 try{
  const result=await runR190RStudy([],{evidenceRoot:path.join(root,'direct'),
   semanticEvidenceRoot:sem,fetcher:fetchFor(raw()),
   transport:'openai',timestamp:()=>201});
  assert.equal(result.semanticComparison,'SAME_FROZEN_BRIEF_AND_CLAIMED_MODEL');
  const comparison=JSON.parse(fs.readFileSync(path.join(result.directory,
   'R190R_ROUTE_COMPARISON.json'),'utf8'));
  assert.equal(comparison.semanticComparison.statusOfSemanticRoute,
   'HOLD_ORIGINAL_SEMANTIC_RESPONSE_REJECTED');
  assert.equal(comparison.semanticComparison.artReview,'ART_HOLD');
  assert.equal(comparison.qualitySuperiority,'NOT_ESTABLISHED');
  assert.equal(fs.readFileSync(path.join(evidence,
   'R190_M_UNMODIFIED_MODEL_RESPONSE.txt'),'utf8'),prior);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {contrastV6RankedLayer,readSavedV6Study} from './r125-v6-offline-ranked-contrast.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {V4J_PARENT_INDEX_PROTOCOL,V4J_PARENT_INDEX_SYSTEM_PROMPT} from '../../source/ai/r125-v4j-feasible-envelope.mjs';
import {syntheticFiveV4JArcadeAuthors}
 from '../r125-v4j-civic-facade-study.mjs';
import {CIVIC_ARCADE_SCHEMA,compileCivicArcadeAuthorIntent}
 from '../../source/ai/r125-v4j-civic-author-ir.mjs';
import {materializeV4JParentIndexAuthor}
 from '../../source/ai/r125-v4j-feasible-envelope.mjs';
import {RANKED_SCHEMA,runWithRankedExteriorCenterStripResearch,
 compileRankedExteriorIntent}
 from '../../source/ai/r125-v4e-ranked-exterior-ir.mjs';

function toV6(original){
 const {spaces,...rest}=structuredClone(original);
 const entrySpace=spaces[0];
 const otherSpaces=spaces.slice(1).map((s,i)=>{
  const index=spaces.slice(0,i+1).findIndex(n=>n.id===s.attach.to);
  assert(index>=0);
  return {...s,attach:{parentIndex:index,side:s.attach.side,shift:s.attach.shift}};
 });
 return {...rest,entrySpace,otherSpaces};
}
test('public housing V6 author: read-only ranked baseline and research opt-in, no full V6 promotion',()=>{
 const sample=syntheticFiveV4JArcadeAuthors().find(x=>x.genre==='housing');
 assert(sample);
 const original={...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)};
 const v6=toV6(original);
 const frozen=JSON.stringify(v6);
 const result=contrastV6RankedLayer(v6);
 assert.equal(JSON.stringify(v6),frozen);
 assert.equal(result.legacyRankedStatus,'PASS');
 assert.equal(result.researchRankedStatus,'PASS');
 assert.equal(result.fullV6Source,'RESEARCH_SOURCE_PASS_NOT_ART_OR_APPROVAL');
 assert.equal(result.fullV6CompilerExecuted,true);
 assert.equal(result.fullV6LegacyStatus,'PASS');
 assert.equal(result.fullV6ResearchStatus,'PASS');
 assert.equal(result.fullV6WorldSafetyVerified,true);
 assert.equal(result.fullV6SourceRoutesVerified,true);
 assert.equal(result.additionalModelCalls,0);
 assert.equal(result.worldWrites,0);
 assert.equal(result.rankedPhysicalWitness.allNineGatesBlocked,true);
 assert.equal(result.rankedPhysicalWitness.allZonesReached,true);
 assert.equal(result.rankedPhysicalWitness.allFeaturesReached,true);
 // Independent full V6 pipeline is still the ORIGINAL legacy source path.
 const rehydrated=materializeV4JParentIndexAuthor(v6);
 const full=compileCivicArcadeAuthorIntent(rehydrated);
 const direct=compileCivicArcadeAuthorIntent(original);
 assert.equal(full.b143.geometrySha256,direct.b143.geometrySha256);
 assert.equal(full.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(full.worldWrites,0);
 assert.equal(full.constructionApproved,false);
 assert.deepEqual(full.gates,Array(9).fill('BLOCKED'));
 assert.equal(JSON.stringify(v6),frozen);
});
test('V6 corner-only reject reproduces, opt-in ranked improves without touching higher layers',()=>{
 const sample=syntheticFiveV4JArcadeAuthors().find(x=>x.genre==='housing');
 assert(sample);
 const original={...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)};
 const mk=(id,kind,side,parentIndex)=>({
  id,purpose:'Independent civic education and service area',kind,
  width:24,depth:24,roof:kind==='sky'?null:'ridgeX',
  height:kind==='sky'?null:'low',facade:kind==='sky'?null:'wall',
  windowPriority:kind==='sky'?null:['north','east','west','south'],
  feature:'Community learning service',featureMaterial:'wood',
  attach:parentIndex===null?null:{parentIndex,side,shift:0}
 });
 const v6=toV6(original);
 v6.entrySpace=mk('root-hall','covered',null,null);
 v6.otherSpaces=[
  mk('middle-hall','covered','east',0),
  mk('open-court','sky','north',1),
  mk('east-studio','covered','east',1)
 ];
 v6.materials={floor:'wood',wall:'stone',roof:'wood',public:'stone'};
 const before=JSON.stringify(v6);
 const result=contrastV6RankedLayer(v6,
  'R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_1');
 assert.equal(JSON.stringify(v6),before);
 assert.equal(result.legacyRankedStatus,'HOLD');
 assert.equal(result.legacyCompilerRejectCode,'RANKED_NO_EXTERIOR_OPTION');
 assert.equal(result.originalCompilerErrorReproduced,true);
 assert.equal(result.researchRankedStatus,'PASS');
 assert.equal(result.rankedPhysicalWitness.windows,3);
 assert.equal(result.rankedPhysicalWitness.glassCells,54);
 assert.equal(result.rankedPhysicalWitness.inwardAirCells,54);
 assert.equal(result.rankedPhysicalWitness.outwardAirCells,54);
 assert.equal(result.fullV6Source,'HOLD_NOT_APPROVED');
 assert.equal(result.fullV6CompilerExecuted,true);
 assert.equal(result.fullV6LegacyStatus,'HOLD');
 assert.equal(result.fullV6ResearchStatus,'HOLD');
 assert.equal(result.fullV6LegacyRejectCode,'RANKED_NO_EXTERIOR_OPTION');
 assert.notEqual(result.fullV6ResearchRejectCode,'RANKED_NO_EXTERIOR_OPTION');
 assert.equal(result.originalFullV6ErrorReproduced,true);
 assert.equal(result.modelIdentityAttested,false);
 assert.equal(result.gateCP1,'HOLD');
 // This prevents a false claim that the optional ranked-only PASS has
 // repaired the complete V6 architecture. Full V6 is still unmodified.
 const fullV6=materializeV4JParentIndexAuthor(v6);
 assert.throws(()=>compileCivicArcadeAuthorIntent(fullV6),
  /R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_1$/);
 assert.equal(JSON.stringify(v6),before);
});


test('synthetic LOCAL V6 study: SHA-verified CLI contrast is fail-closed on unsafe gates',()=>{
 // Synthetic fixtures only: neither a real Qwen response nor model identity proof.
 const sample=syntheticFiveV4JArcadeAuthors().find(x=>x.genre==='housing');
 assert(sample);
 const v6=toV6({...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)});
 const mk=(id,kind,side,parentIndex)=>({
  id,purpose:'Independent civic education and service area',kind,
  width:24,depth:24,roof:kind==='sky'?null:'ridgeX',
  height:kind==='sky'?null:'low',facade:kind==='sky'?null:'wall',
  windowPriority:kind==='sky'?null:['north','east','west','south'],
  feature:'Community learning service',featureMaterial:'wood',
  attach:parentIndex===null?null:{parentIndex,side,shift:0}
 });
 v6.entrySpace=mk('root-hall','covered',null,null);
 v6.otherSpaces=[
  mk('middle-hall','covered','east',0),
  mk('open-court','sky','north',1),
  mk('east-studio','covered','east',1)
 ];
 v6.materials={floor:'wood',wall:'stone',roof:'wood',public:'stone'};
 const raw=JSON.stringify(v6);
 const promptSha='d97831b3b0fcdd3af8675799a64e3e9e3842d5dd7bb124f692032fe880255111';
 const schemaSha='f'.repeat(64);
 const manifest={
  schema:'minecraftaibuilder-r125-v4d-local-model-author-attempt-v1',
  authorContract:CIVIC_ARCADE_SCHEMA,promptProtocol:V4J_PARENT_INDEX_PROTOCOL,
  systemPromptSha256:promptSha,structuredSchemaSha256:schemaSha,
  status:'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR',
  reason:'R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_1',
  modelCalls:1,rawCaptured:true,testInjectionPresent:false,modelFinishReason:'stop',
  responseRawSha256:createHash('sha256').update(raw).digest('hex'),
  worldContacts:0,worldWrites:0,constructionApproved:false,
  executionAllowed:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 const request={
  sourceOnly:true,noWorldAccess:true,noPaidAPI:true,
  nModelGenerationAttemptsAllowed:1,
  authorContract:CIVIC_ARCADE_SCHEMA,promptProtocol:V4J_PARENT_INDEX_PROTOCOL,
  systemPromptSha256:promptSha,structuredSchemaSha256:schemaSha
 };
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mab-synthetic-local-contrast-'));
 const report=()=>fs.writeFileSync(path.join(dir,'V4D_LOCAL_AUTHOR_REPORT.json'),JSON.stringify(manifest));
 const req=()=>fs.writeFileSync(path.join(dir,'LOCAL_REQUEST.json'),JSON.stringify(request));
 try{
  fs.writeFileSync(path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt'),raw);
  report();req();
  const a=readSavedV6Study(dir);
  assert.deepEqual(a.input,v6);
  const script=fileURLToPath(new URL('./r125-v6-offline-ranked-contrast.mjs',import.meta.url));
  const run=spawnSync(process.execPath,[script,'--study',dir],
   {encoding:'utf8',timeout:20000});
  assert.equal(run.status,0,'Synthetic offline CLI must exit success');
  const safe=JSON.parse(run.stdout);
  assert.equal(safe.originalCompilerErrorReproduced,true);
  assert.equal(safe.status,'RESEARCH_RANKED_LAYER_ONLY_PASS_NOT_V6');
  assert.equal(safe.originalRawIntegrity,'SHA256_MATCH');
  assert.equal(safe.fullV6CompilerExecuted,true);
  assert.equal(safe.originalFullV6ErrorReproduced,true);
  assert.equal(safe.fullV6ResearchStatus,'HOLD');
  assert.equal(safe.fullV6WorldSafetyVerified,false);
  assert.equal(safe.worldWrites,0);
  assert.equal(safe.additionalModelCalls,0);
  assert(!run.stdout.includes(v6.entrySpace.id));
  assert(!run.stdout.includes(dir));
  // An unsafe saved original must be rejected; no permissive promotion.
  manifest.gates[4]='PASS';report();
  assert.throws(()=>readSavedV6Study(dir),/ORIGINAL_STUDY_MANIFEST_NOT_VERIFIED/);
  manifest.gates[4]='BLOCKED';report();
  manifest.BuildPlan.operations.push({kind:'fake-world-write'});report();
  assert.throws(()=>readSavedV6Study(dir),/ORIGINAL_STUDY_MANIFEST_NOT_VERIFIED/);
  manifest.BuildPlan.operations=[];report();
  request.structuredSchemaSha256='e'.repeat(64);req();
  assert.throws(()=>readSavedV6Study(dir),/ORIGINAL_STUDY_MANIFEST_NOT_VERIFIED/);
  request.structuredSchemaSha256=schemaSha;req();
  manifest.responseRawSha256='0'.repeat(64);report();
  assert.throws(()=>readSavedV6Study(dir),/ORIGINAL_RAW_SHA256_MISMATCH/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});



test('V9 native format: immutable original and HTTP evidence remain PRIVATE',()=>{
 const sample=syntheticFiveV4JArcadeAuthors().find(x=>x.genre==='housing');
 const v6=toV6({...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)});
 const mk=(id,kind,side,parentIndex)=>({
  id,purpose:'PRIVATE_PURPOSE_MUST_NOT_PRINT',kind,
  width:24,depth:24,roof:kind==='sky'?null:'ridgeX',
  height:kind==='sky'?null:'low',facade:kind==='sky'?null:'wall',
  windowPriority:kind==='sky'?null:['north','east','west','south'],
  feature:'Public service',featureMaterial:'wood',
  attach:parentIndex===null?null:{parentIndex,side,shift:0}
 });
 v6.entrySpace=mk('root-hall','covered',null,null);
 v6.otherSpaces=[mk('middle-hall','covered','east',0),
  mk('open-court','sky','north',1),mk('east-studio','covered','east',1)];
 v6.materials={floor:'wood',wall:'stone',roof:'wood',public:'stone'};
 const hash=s=>createHash('sha256').update(s).digest('hex');
 const raw=JSON.stringify(v6),head='aba967c7d76b6351ce60aafd55927a274de4a386';
 const req={model:'qwen3:14b',headSha:head,contract:V4J_PARENT_INDEX_PROTOCOL,
  systemPromptSha256:hash(V4J_PARENT_INDEX_SYSTEM_PROMPT),
  maxAttempts:1,num_ctx:12288,num_predict:7168,v6ThinkingStudy:true,think:true};
 const m={schema:'minecraftaibuilder-r125-v7-private-one-safe-v1',
  protocol:V4J_PARENT_INDEX_PROTOCOL,headSha:head,
  status:'HOLD_AUTHOR',reason:'V6_AUTHOR_OR_B143_REJECTED',
  compilerRejectCode:'RANKED_NO_EXTERIOR_OPTION',
  explicitlyInjectedTestResponse:false,modelGenerationAttempts:1,rawCaptured:true,
  ollamaCompletionObserved:true,unloadConfirmed:true,activeMonitorSamples:3,
  clientAbortSignaled:false,b143Recompiled:false,
  worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  responseRawSha256:hash(raw),v6ThinkingStudy:true,thinkingObserved:true,
  thinkingTokenBudgetVerified:true,thinkingCharacterCount:0,
  observedPromptTokens:3000,observedGeneratedTokens:1700};
 const http={model:'qwen3:14b',done:true,done_reason:'stop',
  message:{content:raw,thinking:'PRIVATE_THINKING_SENTINEL'},
  prompt_eval_count:3000,eval_count:1700};
 m.thinkingCharacterCount=http.message.thinking.length;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mab-native-v9-synthetic-'));
 const write=(name,x)=>fs.writeFileSync(path.join(dir,name),
  typeof x==='string'?x:JSON.stringify(x));
 const script=fileURLToPath(new URL('./r125-v6-offline-ranked-contrast.mjs',import.meta.url));
 try{
  write('V7_LOCAL_REQUEST_PRIVATE.json',req);
  write('V7_SEMANTIC_SHAREABLE.json',m);
  write('V7_MODEL_RESPONSE_ORIGINAL_PRIVATE.txt',raw);
  write('V6_THINKING_HTTP_ENVELOPE_ORIGINAL_PRIVATE.json',http);
  assert.deepEqual(readSavedV6Study(dir).input,v6);
  const run=spawnSync(process.execPath,[script,'--study',dir],
   {encoding:'utf8',timeout:20000});
  assert.equal(run.status,0,run.stdout);
  const safe=JSON.parse(run.stdout);
  assert.equal(safe.studyFormat,'V9_NATIVE');
  assert.equal(safe.originalSafeRejectReproduced,true);
  assert.equal(safe.fullV6LegacyRejectCode,'RANKED_NO_EXTERIOR_OPTION');
  assert.equal(safe.fullV6ResearchStatus,'HOLD');
  assert.equal(safe.worldWrites,0);
  for(const secret of ['PRIVATE_PURPOSE_MUST_NOT_PRINT',
   'PRIVATE_THINKING_SENTINEL',dir,v6.otherSpaces[0].id])
   assert(!run.stdout.includes(secret));
  m.responseRawSha256='0'.repeat(64);
  write('V7_SEMANTIC_SHAREABLE.json',m);
  assert.throws(()=>readSavedV6Study(dir),/ORIGINAL_RAW_SHA256_MISMATCH/);
  m.responseRawSha256=hash(raw);m.gates[2]='PASS';
  write('V7_SEMANTIC_SHAREABLE.json',m);
  assert.throws(()=>readSavedV6Study(dir),/NATIVE_STUDY_MANIFEST_NOT_VERIFIED/);
  m.gates[2]='BLOCKED';
  write('V7_SEMANTIC_SHAREABLE.json',m);
  http.message.content='MISMATCH';
  write('V6_THINKING_HTTP_ENVELOPE_ORIGINAL_PRIVATE.json',http);
  assert.throws(()=>readSavedV6Study(dir),/NATIVE_HTTP_EVIDENCE_NOT_VERIFIED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('research-only scoped context reaches nested V6 compilation without changing its legacy default',()=>{
 const sample=syntheticFiveV4JArcadeAuthors().find(x=>x.genre==='housing');
 assert(sample);
 const original={...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)};
 const v6=toV6(original),before=JSON.stringify(v6);
 const baseline=materializeV4JParentIndexAuthor(v6);
 const legacy=compileCivicArcadeAuthorIntent(baseline);
 assert.equal(legacy.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');

 // Explicit synchronous research scope: same single AUTHOR answer, across
 // all nested ranked references. The original entrypoint remains untouched.
 let candidate=null,candidateError=null;
 try{
  candidate=runWithRankedExteriorCenterStripResearch(()=>
   compileCivicArcadeAuthorIntent(baseline));
 }catch(e){candidateError=e;}
 if(candidate){
  assert.equal(candidate.worldWrites,0);
  assert.equal(candidate.worldContacts,0);
  assert.equal(candidate.constructionApproved,false);
  assert.equal(candidate.executionAllowed,false);
  assert.deepEqual(candidate.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(candidate.BuildPlan.operations,[]);
  assert.equal(candidate.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 }else{
  // Real downstream counterexample is informative but must not be called a
  // successful full-V6 repair, even if the ranked-layer proof is green.
  assert(candidateError instanceof Error);
  assert.doesNotMatch(String(candidateError.message),
   /R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_/);
 }
 const reverted=compileCivicArcadeAuthorIntent(baseline);
 assert.equal(reverted.b143.geometrySha256,legacy.b143.geometrySha256);
 assert.equal(reverted.b143.sourceSha256,legacy.b143.sourceSha256);
 assert.equal(JSON.stringify(v6),before);
 console.log('PUBLIC_SYNTHETIC_NESTED_V6_RESEARCH_STATUS='+(
  candidate?'FULL_V6_SOURCE_PASS_NOT_ART_OR_REAL_MODEL':
   'DOWNSTREAM_HOLD_NOT_FULL_V6_REPAIR'));
});

test('scoped research choice reaches nested V6 while the same corner author still HOLDs without scope',()=>{
 const sample=syntheticFiveV4JArcadeAuthors().find(x=>x.genre==='housing');
 assert(sample);
 const original={...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)};
 const v6=toV6(original);
 const mk=(id,kind,side,parentIndex)=>({
  id,purpose:'Independent civic education and service area',kind,
  width:24,depth:24,roof:kind==='sky'?null:'ridgeX',
  height:kind==='sky'?null:'low',facade:kind==='sky'?null:'wall',
  windowPriority:kind==='sky'?null:['north','east','west','south'],
  feature:'Community learning service',featureMaterial:'wood',
  attach:parentIndex===null?null:{parentIndex,side,shift:0}
 });
 v6.entrySpace=mk('root-hall','covered',null,null);
 v6.otherSpaces=[
  mk('middle-hall','covered','east',0),
  mk('open-court','sky','north',1),
  mk('east-studio','covered','east',1)
 ];
 v6.materials={floor:'wood',wall:'stone',roof:'wood',public:'stone'};
 const before=JSON.stringify(v6);
 const materialized=materializeV4JParentIndexAuthor(v6);
 const ranked={
  schema:RANKED_SCHEMA,
  id:materialized.id,title:materialized.title,brief:materialized.brief,
  materials:materialized.materials,spaces:materialized.spaces
 };
 assert.throws(()=>compileRankedExteriorIntent(ranked),
  /R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_1$/);
 const single=runWithRankedExteriorCenterStripResearch(()=>
  compileRankedExteriorIntent(ranked));
 assert.equal(single.normalizedBy,'AUTHOR_RANKED_CENTER_STRIP_RESEARCH_V2');
 assert.equal(single.rankedPhysicalGlazingSourceProof.verifiedPanelGlassCells,54);
 let full=null,error=null;
 try{
  full=runWithRankedExteriorCenterStripResearch(()=>
   compileCivicArcadeAuthorIntent(materialized));
 }catch(e){error=e;}
 if(full){
  assert.equal(full.worldWrites,0);
  assert.equal(full.worldContacts,0);
  assert.equal(full.constructionApproved,false);
  assert.deepEqual(full.gates,Array(9).fill('BLOCKED'));
  assert.equal(full.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 }else{
  assert(error instanceof Error);
  assert.doesNotMatch(String(error.message),
   /R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_1$/);
 }
 assert.throws(()=>compileCivicArcadeAuthorIntent(materialized),
  /R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_1$/);
 assert.equal(JSON.stringify(v6),before);
 console.log('PUBLIC_SYNTHETIC_CORNER_FULL_V6_RESEARCH_STATUS='+(
  full?'FULL_V6_SOURCE_PASS_NOT_ART_OR_REAL_MODEL':
   'DOWNSTREAM_HOLD_NOT_FULL_V6_REPAIR'));
});

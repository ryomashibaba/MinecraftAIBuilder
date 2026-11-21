import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {SCHEMA as SPATIAL,compileSpatialComposition}
 from '../source/ai/r125-spatial-composition.mjs';
import {ENVELOPE_SCHEMA,compileExpressiveEnvelopeV2}
 from '../source/ai/r125-expressive-envelope-v2.mjs';
import {FUNCTION_SCHEMA,compileFunctionalFacadeV3,
 surveyFunctionalFacadeOpenings,surveyFunctionalFixturePlacements}
 from '../source/ai/r125-functional-facade-v3.mjs';
import {GENRES} from './r125-cross-genre-pilot.mjs';
import {auditOriginalHomeTopLevel,inspectFailedOnlyV3Evidence,
 runFailedOnlyV3} from './r125-v3-failed-only-home-recovery.mjs';
import {exportSavedFiveGenreOverview} from './r125-v3-export-saved-overview.mjs';

const digest=s=>createHash('sha256').update(s).digest('hex');
const save=(folder,name,data)=>fs.writeFileSync(path.join(folder,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
const plan=i=>({schema:SPATIAL,id:'author-plan-'+i,
 title:'Genuinely different independent genre source '+i,
 brief:'Arrival and enclosed functional support with real internal circulation',
 materials:{floor:'wood',wall:'concrete',roof:'stone'},
 rooms:[
  {id:'arrival',purpose:'Entry and visitor public functional zone',
   width:12,depth:10,roofY:8},
  {id:'support',purpose:'Independent working functional zone',
   width:8,depth:8,roofY:7,
   attach:{to:'arrival',side:i%2?'south':'east',shift:0}}
 ]});
const roof=p=>({schema:ENVELOPE_SCHEMA,planId:p.id,
 roofs:p.rooms.map((r,i)=>({roomId:r.id,form:i?'shed':'ridge',
  axis:i?'z':'x',rise:2}))});
function compatibleIntent(p,e,i){
 // A test-double author; NEVER present as real Qwen authorship.
 const windows=surveyFunctionalFacadeOpenings({
  originalPlan:p,envelopeIntent:e});
 const service=surveyFunctionalFixturePlacements({
  originalPlan:p,envelopeIntent:e});
 for(const first of service[0].availableFunctionalFixturePlacements)
  for(const second of service[1].availableFunctionalFixturePlacements)
   for(const glazing of windows[0].availableLargeExteriorOpenings){
    const intent={schema:FUNCTION_SCHEMA,planId:p.id,rooms:[
     {roomId:p.rooms[0].id,
      fixture:{kind:first.kinds[0],side:first.side,offset:first.offset,
       material:'wood',purpose:'Serve and support visitors on entering'},
      opening:{side:glazing.side,offset:glazing.offset,width:glazing.width,
       height:glazing.height}},
     {roomId:p.rooms[1].id,
      fixture:{kind:second.kinds[0],side:second.side,offset:second.offset,
       material:'stone',purpose:'Provide separate useful staff services'},
      opening:null}
    ]};
    try{compileFunctionalFacadeV3({
     originalPlan:p,envelopeIntent:e,functionalIntent:intent});return intent}
    catch{}
   }
 throw Error('TEST_FIXTURE_NO_VALID_V3_CONFIGURATION');
}
function setup(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-failed-only-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const study=path.join(root,'original'),diagnostic=path.join(root,'diagnostic');
 const envelopes=path.join(root,'envelopes'),functions=path.join(root,'functions');
 for(const d of [study,diagnostic,envelopes,functions])fs.mkdirSync(d);
 const oldCases=[],diagnosed=[],roofCases=[],functionCases=[],recovered=[];
 const originals=[];
 for(const [i,g] of GENRES.entries()){
  const sp=plan(i),raw=JSON.stringify(sp),
   spatial=compileSpatialComposition(sp),intent=roof(sp),
   roofRaw=JSON.stringify(intent),envelope=compileExpressiveEnvelopeV2({
    originalPlan:sp,intent});
  const originalStatus=i===4?'HOLD_MODEL_IR_INVALID':'SOURCE_AND_3D_READY_ART_HOLD';
  const original={id:g.id,genre:g.genre,status:originalStatus,
   rawSha256:digest(raw),geometrySha256:i===4?null:spatial.geometrySha256,
   sourceSha256:i===4?null:spatial.sourceSha256};
  const originalFolder=path.join(study,'cases',g.id);
  const envelopeFolder=path.join(envelopes,'cases',g.id);
  const functionFolder=path.join(functions,'cases',g.id);
  for(const d of [originalFolder,envelopeFolder,functionFolder])
   fs.mkdirSync(d,{recursive:true});
  save(originalFolder,'MODEL_RESPONSE_ORIGINAL.txt',raw);
  save(originalFolder,'CASE_REPORT.json',original);
  oldCases.push(original);
  diagnosed.push({id:g.id,genre:g.genre,originalStatus,
   originalRawSha256:digest(raw),rawIntegrity:'SHA256_MATCHED',
   sourceReplay:i===4?'OFFLINE_SOURCE_NOW_COMPILED_NOT_ORIGINAL_QWEN_RETRY':
    'MATCHED_SAVED_GEOMETRY',replayedGeometrySha256:spatial.geometrySha256});
  if(i===4)recovered.push({id:g.id,geometrySha256:spatial.geometrySha256,
   sourceSha256:spatial.sourceSha256,
   sourceRoutes:'SOURCE_ROUTES_REACH_ALL_ZONES',
   originalFailureStillRecorded:true});
  const roofReceipt={id:g.id,genre:g.genre,status:'NEW_SOURCE_ENVELOPE_ART_HOLD',
   modelRawSha256:digest(roofRaw),newGeometrySha256:envelope.geometrySha256,
   newSourceSha256:envelope.sourceSha256,
   originalGeometrySha256:spatial.geometrySha256,
   frozenOriginalRawSha256:digest(raw)};
  save(envelopeFolder,'MODEL_ENVELOPE_RESPONSE_ORIGINAL.txt',roofRaw);
  save(envelopeFolder,'CASE_REPORT.json',roofReceipt);
  roofCases.push(roofReceipt);
  let functionRaw,func;
  if(i===0)functionRaw=JSON.stringify({result:{schema:FUNCTION_SCHEMA,
   planId:sp.id,rooms:[]}}); // known TOP_LEVEL structural hold
  else{
   const v3intent=compatibleIntent(sp,intent,i);
   functionRaw=JSON.stringify(v3intent);
   func=compileFunctionalFacadeV3({
    originalPlan:sp,envelopeIntent:intent,functionalIntent:v3intent});
   save(functionFolder,'FUNCTION_INTENT.json',v3intent);
  }
  const row={id:g.id,genre:g.genre,
   status:i===0?'HOLD_MODEL_FUNCTION_IR':'NEW_FUNCTIONAL_SOURCE_ART_HOLD',
   preservedSpatialGeometrySha256:spatial.geometrySha256,
   preservedRoofGeometrySha256:envelope.geometrySha256,
   originalRoofRawSha256:digest(roofRaw),
   rawSha256:digest(functionRaw),
   newGeometrySha256:func?.finalGeometrySha256??null,
   newSourceSha256:func?.finalSourceSha256??null,
   sourceServiceAccess:func?.sourceRoutes.featureAccess.filter(
    x=>x.reachableFromEntrance).length??null,
   newGlazingCells:func?.physicalProgram.independentlyAddedGlassCells??null,
   physicalFeatureCells:func?.physicalProgram.physicallyVerifiedFixtureCells??null,
   modelCalls:1,failureCategory:i===0?'MODEL_FUNCTION_IR':null,
   reason:i===0?'R125_FUNCTIONAL_TOP_LEVEL':null,
   art:'NOT_REVIEWED',worldWrites:0};
  save(functionFolder,'MODEL_FUNCTION_RESPONSE_ORIGINAL.txt',functionRaw);
  save(functionFolder,'CASE_REPORT.json',row);
  functionCases.push(row);
  originals.push({plan:sp,roof:intent});
 }
 const savedOriginal={schema:'r125-local-cross-genre-study-v1',
  model:'qwen3:14b',modelCalls:5,testInjectionPresent:false,
  cases:oldCases,status:'HOLD_GENRE_BATCH_PARTIAL'};
 save(study,'CROSS_GENRE_REPORT.json',savedOriginal);
 const studySha=digest(fs.readFileSync(
  path.join(study,'CROSS_GENRE_REPORT.json'),'utf8'));
 save(diagnostic,'DIAGNOSTIC_REPORT.json',{
  schema:'r125-saved-cross-genre-offline-diagnostic-v1',
  originalReportSha256:studySha,originalStudyPath:fs.realpathSync(study),
  reInferenceCalls:0,cases:diagnosed,recoveredSourceCandidates:recovered});
 const diagSha=digest(fs.readFileSync(
  path.join(diagnostic,'DIAGNOSTIC_REPORT.json'),'utf8'));
 save(envelopes,'EXPRESSIVE_ENVELOPE_REPORT.json',{
  schema:'r125-real-five-genre-envelope-pilot-v1',
  source:'FROZEN_VERIFIED_FIVE_GENRES',
  model:'qwen3:14b',modelCalls:5,testInjectionPresent:false,
  originalStudySha256:studySha,previousDiagnosticSha256:diagSha,
  cases:roofCases});
 const envSha=digest(fs.readFileSync(path.join(envelopes,
  'EXPRESSIVE_ENVELOPE_REPORT.json'),'utf8'));
 save(functions,'FUNCTIONAL_FACADE_REPORT.json',{
  schema:'r125-five-genre-functional-author-study-v1',
  status:'HOLD_PARTIAL_FUNCTIONS',model:'qwen3:14b',modelCalls:5,
  originalStudySha256:studySha,previousDiagnosticSha256:diagSha,
  frozenEnvelopeReportSha256:envSha,testInjectionPresent:false,
  originalProgramsPreserved:5,originalEnvelopesPreserved:5,
  cases:functionCases,summary:{
   sourcePass:4,technicallyCompiled:4,sharedSymptoms:[]},worldWrites:0});
 return {studyDir:study,diagnosticFile:path.join(diagnostic,'DIAGNOSTIC_REPORT.json'),
  envelopeDir:envelopes,functionsDir:functions,
  outDir:path.join(root,'incremental'),originals};
}
function localFake(p,{bad=false,noModel=false}={}){
 let posts=0;
 const fetcher=async(_url,req)=>{
  if(req.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:noModel?[]:[{name:'qwen3:14b'}]})};
  posts++;
  const prompt=JSON.parse(JSON.parse(req.body).messages[1].content);
  assert.equal(prompt.originalModelWrittenPlan.id,p.originals[0].plan.id);
  assert.equal(prompt.requiredRootShape.schema,FUNCTION_SCHEMA);
  const ans=bad?{answer:{status:'bad'}}:
   compatibleIntent(p.originals[0].plan,p.originals[0].roof,0);
  return {ok:true,text:async()=>JSON.stringify({choices:[{
   finish_reason:'stop',message:{content:JSON.stringify(ans)}}]})};
 };
 return {fetcher,getPosts:()=>posts};
}
test('single-home recovery preserves 4 frozen distinct SOURCE geom SHA and makes 1 fake model request only',async t=>{
 const p=setup(t),fake=localFake(p);
 const report=await runFailedOnlyV3(p,{fetcher:fake.fetcher});
 assert.equal(fake.getPosts(),1);
 assert.equal(report.modelCalls,1);
 assert.equal(report.testInjectionPresent,true);
 assert.equal(report.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL');
 assert.equal(report.sourceReadyCount,5);
 assert.equal(report.reusedVerifiedSources,4);
 assert.equal(report.cases.slice(1).filter(c=>c.status==='REUSED_SHA_VERIFIED_ART_HOLD').length,4);
 assert.equal(report.cases[0].newModelCalls,1);
 assert.equal(report.cases[0].status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL');
 assert(report.homeRecoveredGeometrySha256?.length===64);
 assert.equal(report.worldWrites,0);
 assert.equal(report.originalHomeReason,'R125_FUNCTIONAL_TOP_LEVEL');
 assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(report.BuildPlan.operations,[]);
 const diag=JSON.parse(fs.readFileSync(path.join(p.outDir,'cases','home',
  'ORIGINAL_HOME_IR_DIAGNOSTIC.json'),'utf8'));
 assert.deepEqual(diag.actualKeys,['result']);
 assert.deepEqual(diag.missingKeys,['schema','planId','rooms']);
 assert.equal(diag.rawEdited,false);
 assert(fs.existsSync(path.join(p.outDir,'index.html')));
 for(const g of GENRES)
  assert(fs.existsSync(path.join(p.outDir,'cases',g.id,'index.html')));
 assert.equal(fs.existsSync(path.join(p.outDir,'MAKECODE_EDUCATION.ts')),false);
});
test('bad retry does not alter original 4 successful original receipts or claim five ready',async t=>{
 const p=setup(t),fake=localFake(p,{bad:true});
 const oldBytes=fs.readFileSync(path.join(p.functionsDir,
  'FUNCTIONAL_FACADE_REPORT.json'));
 const report=await runFailedOnlyV3(p,{fetcher:fake.fetcher});
 assert.equal(fake.getPosts(),1);
 assert.equal(report.status,'HOLD_FAILED_ONLY_HOME');
 assert.equal(report.sourceReadyCount,4);
 assert.equal(report.cases.slice(1).filter(c=>c.status==='REUSED_SHA_VERIFIED_ART_HOLD').length,4);
 assert.deepEqual(fs.readFileSync(path.join(p.functionsDir,
  'FUNCTIONAL_FACADE_REPORT.json')),oldBytes);
 assert.equal(report.worldWrites,0);
});
test('tampering with original successful response aborts BEFORE even one new model call',async t=>{
 const p=setup(t),fake=localFake(p);
 fs.appendFileSync(path.join(p.functionsDir,'cases','retail',
  'MODEL_FUNCTION_RESPONSE_ORIGINAL.txt'),' ');
 await assert.rejects(runFailedOnlyV3(p,{fetcher:fake.fetcher}),
  /MODEL_RAW_SHA_retail/);
 assert.equal(fake.getPosts(),0);
 assert.equal(fs.existsSync(p.outDir),false);
});
test('tampering original failed-home raw is also detected before model request',async t=>{
 const p=setup(t),fake=localFake(p);
 fs.appendFileSync(path.join(p.functionsDir,'cases','home',
  'MODEL_FUNCTION_RESPONSE_ORIGINAL.txt'),' ');
 await assert.rejects(runFailedOnlyV3(p,{fetcher:fake.fetcher}),
  /MODEL_RAW_SHA_home/);
 assert.equal(fake.getPosts(),0);
});
test('missing exact model does not POST, records a fail-closed report and keeps four successes',async t=>{
 const p=setup(t),fake=localFake(p,{noModel:true});
 const report=await runFailedOnlyV3(p,{fetcher:fake.fetcher});
 assert.equal(fake.getPosts(),0);
 assert.equal(report.modelCalls,0);
 assert.equal(report.sourceReadyCount,4);
 assert.equal(report.status,'HOLD_FAILED_ONLY_HOME');
 assert(fs.existsSync(path.join(p.outDir,'FAILED_ONLY_RECOVERY_REPORT.json')));
 assert.equal(report.worldWrites,0);
});
test('original home TOP_LEVEL inspection does not guess an unseen model cause',()=>{
 const report=auditOriginalHomeTopLevel('{"answer":{}}','original-home',4);
 assert.deepEqual(report.actualKeys,['answer']);
 assert.equal(report.schemaMatches,false);
 assert.equal(report.planIdMatches,false);
 assert.equal(report.roomCountMatches,false);
 assert.equal(report.rawEdited,false);
});

test('offline export reuses all five completed model source scenes without ANY new inference',async t=>{
 const p=setup(t),fake=localFake(p);
 const initial=await runFailedOnlyV3(p,{fetcher:fake.fetcher});
 assert.equal(initial.sourceReadyCount,5);
 assert.equal(fake.getPosts(),1);
 const outDir=path.join(path.dirname(p.outDir),'art-evidence-only');
 const result=exportSavedFiveGenreOverview({...p,recoveryDir:p.outDir,outDir});
 assert.equal(fake.getPosts(),1); // export did not and cannot POST
 assert.equal(result.additionalModelCalls,0);
 assert.equal(result.fourOldV3ModelsReused,4);
 assert.equal(result.newHomeV3ModelReplayed,1);
 assert.equal(result.status,'TEST_DOUBLE_OFFLINE_PREVIEW_ONLY');
 assert.equal(result.embeddedMetadata.sourceReadyCount,5);
 assert.equal(result.embeddedMetadata.worldWrites,0);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 const png=fs.readFileSync(path.join(outDir,'SOURCE_ART_OVERVIEW.png'));
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(digest(png),result.imageSha256);
 assert(png.includes(Buffer.from('MAB_Source_Evidence\0','utf8')));
 assert(fs.existsSync(path.join(outDir,'OVERVIEW_AUDIT_REPORT.json')));
 assert(fs.existsSync(path.join(outDir,'index.html')));
 assert.equal(fs.existsSync(path.join(outDir,'NEW_HOME_MODEL_RESPONSE_ORIGINAL.txt')),false);
});
test('an altered saved home response is rejected before creating any contact sheet',async t=>{
 const p=setup(t),fake=localFake(p);
 await runFailedOnlyV3(p,{fetcher:fake.fetcher});
 const outDir=path.join(path.dirname(p.outDir),'art-evidence-only');
 fs.appendFileSync(path.join(p.outDir,'cases','home',
  'NEW_HOME_MODEL_RESPONSE_ORIGINAL.txt'),' ');
 assert.throws(()=>exportSavedFiveGenreOverview({...p,recoveryDir:p.outDir,outDir}),
  /NEW_HOME_ORIGINAL_RAW_SHA_DRIFT/);
 assert.equal(fake.getPosts(),1);
 assert.equal(fs.existsSync(outDir),false);
});
test('a tampered successful Qwen raw aborts offline export, with no silent reset',async t=>{
 const p=setup(t),fake=localFake(p);
 await runFailedOnlyV3(p,{fetcher:fake.fetcher});
 const outDir=path.join(path.dirname(p.outDir),'art-evidence-only');
 fs.appendFileSync(path.join(p.functionsDir,'cases','retail',
  'MODEL_FUNCTION_RESPONSE_ORIGINAL.txt'),' ');
 assert.throws(()=>exportSavedFiveGenreOverview({...p,recoveryDir:p.outDir,outDir}),
  /MODEL_RAW_SHA_retail/);
 assert.equal(fake.getPosts(),1);
 assert.equal(fs.existsSync(outDir),false);
});

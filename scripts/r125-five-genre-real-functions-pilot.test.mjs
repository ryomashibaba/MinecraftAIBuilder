import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {SCHEMA as SPATIAL,compileSpatialComposition}
 from '../source/ai/r125-spatial-composition.mjs';
import {ENVELOPE_SCHEMA,compileExpressiveEnvelopeV2}
 from '../source/ai/r125-expressive-envelope-v2.mjs';
import {FUNCTION_SCHEMA} from '../source/ai/r125-functional-facade-v3.mjs';
import {GENRES} from './r125-cross-genre-pilot.mjs';
import {runFiveGenreFunctions,summarizeFunctionBatch,classifyFunctionFailure}
 from './r125-five-genre-real-functions-pilot.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const save=(dir,name,value)=>fs.writeFileSync(path.join(dir,name),
 typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const plan=i=>({schema:SPATIAL,id:'function-batch-genre-'+i,
 title:'Distinct user authored building '+i,
 brief:'Actual functional public and private room layout designed independently',
 materials:{floor:'wood',wall:'concrete',roof:'stone'},
 rooms:[{id:'entry',purpose:'Entrance and distinct public use room',
  width:12,depth:10,roofY:8},
 {id:'secondary',purpose:'Enclosed room for supporting work and functions',
  width:8,depth:8,roofY:7,
  attach:{to:'entry',side:i%2?'south':'east',shift:0}}]});
const roof=p=>({schema:ENVELOPE_SCHEMA,planId:p.id,roofs:p.rooms.map((r,i)=>({
 roomId:r.id,form:i?'shed':'ridge',axis:i?'z':'x',rise:2}))});
function setup(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-five-function-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const study=path.join(root,'study'),diagnostic=path.join(root,'diagnostic');
 const envelopes=path.join(root,'envelopes'),outDir=path.join(root,'new');
 for(const dir of [study,diagnostic,envelopes])fs.mkdirSync(dir);
 const oldCases=[],diagCases=[],envCases=[],recovered=[];
 for(const [i,g] of GENRES.entries()){
  const folder=path.join(study,'cases',g.id);
  const roofFolder=path.join(envelopes,'cases',g.id);
  fs.mkdirSync(folder,{recursive:true});fs.mkdirSync(roofFolder,{recursive:true});
  const p=plan(i),raw=JSON.stringify(p),source=compileSpatialComposition(p);
  const oldGeom=i===4?null:source.geometrySha256;
  const oldStatus=i===4?'HOLD_MODEL_IR_INVALID':'SOURCE_AND_3D_READY_ART_HOLD';
  const old={id:g.id,genre:g.genre,status:oldStatus,rawSha256:sha(raw),
   geometrySha256:oldGeom,sourceSha256:i===4?null:source.sourceSha256};
  save(folder,'MODEL_RESPONSE_ORIGINAL.txt',raw);
  save(folder,'CASE_REPORT.json',old);
  oldCases.push(old);
  diagCases.push({id:g.id,genre:g.genre,originalStatus:oldStatus,
   originalRawSha256:sha(raw),rawIntegrity:'SHA256_MATCHED',
   replayedGeometrySha256:source.geometrySha256,
   sourceReplay:i===4?'OFFLINE_SOURCE_NOW_COMPILED_NOT_ORIGINAL_QWEN_RETRY':'MATCHED_SAVED_GEOMETRY'});
  if(i===4)recovered.push({id:g.id,
   geometrySha256:source.geometrySha256,sourceSha256:source.sourceSha256,
   sourceRoutes:'SOURCE_ROUTES_REACH_ALL_ZONES',originalFailureStillRecorded:true});
  const r=roof(p),roofRaw=JSON.stringify(r);
  const v2=compileExpressiveEnvelopeV2({originalPlan:p,intent:r});
  const row={id:g.id,genre:g.genre,status:'NEW_SOURCE_ENVELOPE_ART_HOLD',
   originalGeometrySha256:source.geometrySha256,
   frozenOriginalRawSha256:sha(raw),
   modelRawSha256:sha(roofRaw),
   newGeometrySha256:v2.geometrySha256,newSourceSha256:v2.sourceSha256};
  save(roofFolder,'MODEL_ENVELOPE_RESPONSE_ORIGINAL.txt',roofRaw);
  save(roofFolder,'CASE_REPORT.json',row);
  envCases.push(row);
 }
 const oldReport={schema:'r125-local-cross-genre-study-v1',
  status:'HOLD_GENRE_BATCH_PARTIAL',model:'qwen3:14b',
  modelCalls:5,testInjectionPresent:false,cases:oldCases};
 save(study,'CROSS_GENRE_REPORT.json',oldReport);
 const rawReport=fs.readFileSync(path.join(study,'CROSS_GENRE_REPORT.json'),'utf8');
 const dia={schema:'r125-saved-cross-genre-offline-diagnostic-v1',
  originalReportSha256:sha(rawReport),originalStudyPath:fs.realpathSync(study),
  reInferenceCalls:0,cases:diagCases,recoveredSourceCandidates:recovered};
 save(diagnostic,'DIAGNOSTIC_REPORT.json',dia);
 const diaBytes=fs.readFileSync(path.join(diagnostic,'DIAGNOSTIC_REPORT.json'),'utf8');
 const envReport={schema:'r125-real-five-genre-envelope-pilot-v1',
  source:'FROZEN_VERIFIED_FIVE_GENRES',model:'qwen3:14b',modelCalls:5,
  testInjectionPresent:false,originalStudySha256:sha(rawReport),
  previousDiagnosticSha256:sha(diaBytes),cases:envCases};
 save(envelopes,'EXPRESSIVE_ENVELOPE_REPORT.json',envReport);
 return {studyDir:study,diagnosticFile:path.join(diagnostic,'DIAGNOSTIC_REPORT.json'),
  envelopeDir:envelopes,outDir};
}
function fakeModel({invalidCase=-1}={}){
 let posts=0;
 const fetcher=async(_url,request)=>{
  if(request.method==='GET')return {ok:true,
   text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  const p=JSON.parse(request.body),payload=p.messages[1].content;
  const json=JSON.parse(payload.slice(payload.indexOf('\n')+1));
  const original=json.plan,childSide=original.rooms[1].attach.side;
  const i=posts++;
  const ans={schema:FUNCTION_SCHEMA,planId:original.id,
   rooms:original.rooms.map((r,j)=>({
    roomId:r.id,
    fixture:{kind:['counter','worktable','bench','display','storage'][(i+j)%5],
     material:j?'stone':'wood',side:j?childSide:'north',offset:0,
     purpose:'Useful equipment for '+r.id},
    opening:{side:j?'south':childSide==='south'?'west':'south',
     offset:0,width:4,height:2}
   }))};
  if(i===invalidCase)ans.rooms[1].fixture.kind='pretend-real-art';
  return {ok:true,text:async()=>JSON.stringify({
   choices:[{finish_reason:'stop',message:{content:JSON.stringify(ans)}}]})};
 };
 return {fetcher,getCalls:()=>posts};
}
test('five private saved cross-genre Qwen sources survive a fake five-function batch without false real attribution',async t=>{
 const input=setup(t),mock=fakeModel();
 const r=await runFiveGenreFunctions(input,{fetcher:mock.fetcher});
 assert.equal(mock.getCalls(),5);
 assert.equal(r.modelCalls,5);
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL');
 assert.equal(r.testInjectionPresent,true);
 assert.equal(r.summary.technicallyCompiled,5);
 assert.equal(r.summary.sourcePass,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.cases.length,5);
 assert(r.cases.every(c=>c.newGeometrySha256?.length===64));
 assert(r.cases.every(c=>c.sourceServiceAccess===2));
 assert(r.cases.every(c=>c.newGlazingCells>0));
 assert(r.cases.every(c=>c.physicalFeatureCells>1));
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert(fs.existsSync(path.join(input.outDir,'index.html')));
 const picture=fs.readFileSync(path.join(input.outDir,'SOURCE_ART_OVERVIEW.png'));
 assert.deepEqual([...picture.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert(picture.includes(Buffer.from('MAB_Source_Evidence\0','utf8')));
 assert.equal(r.artOverview?.sourceOnly,true);
 assert.equal(r.artOverview?.worldWrites,0);
 assert.equal(r.artOverview?.artApproved,false);
 assert(fs.existsSync(path.join(input.outDir,'cases','station','index.html')));
 assert(!fs.existsSync(path.join(input.outDir,'MAKECODE_EDUCATION.ts')));
 assert(!fs.existsSync(path.join(input.outDir,'MODEL_RESPONSE_ORIGINAL.txt')));
});
test('one invalid model response is rejected without rewriting four valid independent genres',async t=>{
 const input=setup(t),mock=fakeModel({invalidCase:3});
 const r=await runFiveGenreFunctions(input,{fetcher:mock.fetcher});
 assert.equal(mock.getCalls(),5);
 assert.equal(r.cases.length,5);
 assert.equal(r.summary.technicallyCompiled,4);
 assert.equal(r.cases[3].status,'HOLD_MODEL_FUNCTION_IR');
 assert(r.cases[3].rawSha256?.length===64);
 assert.equal(r.cases[3].newGeometrySha256,null);
 assert.equal(r.worldWrites,0);
});
test('a missing exact model never triggers any POST or fictional result',async t=>{
 const input=setup(t);let post=0;
 const fetcher=async(_url,req)=>{if(req.method==='POST')post++;
  return {ok:true,text:async()=>JSON.stringify({models:[]})};};
 const r=await runFiveGenreFunctions(input,{fetcher});
 assert.equal(post,0);
 assert.equal(r.modelCalls,0);
 assert.equal(r.status,'HOLD_LOCAL_MODEL_NOT_READY');
 assert.equal(r.worldWrites,0);
 assert(fs.existsSync(path.join(input.outDir,'FUNCTIONAL_FACADE_REPORT.json')));
});
test('a modified frozen envelope response must block before another model request',async t=>{
 const input=setup(t),mock=fakeModel();
 fs.appendFileSync(path.join(input.envelopeDir,'cases','home',
  'MODEL_ENVELOPE_RESPONSE_ORIGINAL.txt'),' ');
 await assert.rejects(runFiveGenreFunctions(input,{fetcher:mock.fetcher}),/ENVELOPE_RAW_DRIFT_home/);
 assert.equal(mock.getCalls(),0);
 assert.equal(fs.existsSync(input.outDir),false);
});
test('cross-genre source failures are grouped as symptoms not proven common causes',()=>{
 assert.equal(classifyFunctionFailure('R125_FUNCTIONAL_REAL_SOURCE_FUNCTION_ACCESS_HOLD'),
  'SHARED_PHYSICAL_RELATIONSHIP');
 assert.equal(classifyFunctionFailure('R125_FUNCTIONAL_ROOM_INTENT'),
  'MODEL_FUNCTION_IR');
 const summary=summarizeFunctionBatch([
  {genre:'住宅',failureCategory:'SHARED_PHYSICAL_RELATIONSHIP'},
  {genre:'駅舎',failureCategory:'SHARED_PHYSICAL_RELATIONSHIP'},
  {genre:'店舗',failureCategory:'MODEL_FUNCTION_IR'}]);
 assert.equal(summary.sharedSymptoms.length,1);
 assert.equal(summary.sharedSymptoms[0].sharedRootCause,'NOT_YET_PROVEN');
 assert.equal(classifyFunctionFailure('R125_FUNCTIONAL_NO_NEW_REAL_FACADE_GLAZING_BUILDING'),
  'MODEL_FUNCTION_PROGRAM_NO_NEW_DAYLIGHT');
 assert.equal(classifyFunctionFailure('R125_FUNCTION_BATCH_NO_EXTERIOR_OPENING_OPTION_IN_BUILDING'),
  'SHARED_SPATIAL_NO_EXTERIOR_GLAZING_SITE');
});

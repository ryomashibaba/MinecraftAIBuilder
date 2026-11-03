import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {SCHEMA as V1,compileSpatialComposition}
 from '../source/ai/r125-spatial-composition.mjs';
import {ENVELOPE_SCHEMA}
 from '../source/ai/r125-expressive-envelope-v2.mjs';
import {GENRES} from './r125-cross-genre-pilot.mjs';
import {runFiveGenreEnvelopeStudy,classifyEnvelopeTrialFailure,
 summarizeEnvelopeTrials} from './r125-five-genre-real-envelope-pilot.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const save=(dir,name,value)=>fs.writeFileSync(path.join(dir,name),
 typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const modelPlan=i=>({
 schema:V1,id:'original-genre-'+i,
 title:'Independent source-authored architectural genre '+i,
 brief:'A distinct functional arrival and secondary enclosed human-scale program',
 materials:{floor:'wood',wall:'concrete',roof:'stone'},
 rooms:[
  {id:'arrival',purpose:'Entrance and public building area',
   width:12,depth:10,roofY:6+i%3},
  {id:'service',purpose:'Different private room and functional services',
   width:9,depth:i===4?6:8,roofY:7+i%2,
   attach:{to:'arrival',side:i%2?'south':'east',shift:0}}
 ]
});
function setup(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'mab-real-envelope-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const study=path.join(base,'original-source');fs.mkdirSync(study);
 const diagnostic=path.join(base,'diagnostic');fs.mkdirSync(diagnostic);
 const cases=[],diags=[],recovered=[];
 for(const [i,g] of GENRES.entries()){
  const folder=path.join(study,'cases',g.id);fs.mkdirSync(folder,{recursive:true});
  const p=modelPlan(i),raw=JSON.stringify(p),compiled=compileSpatialComposition(p);
  const old=i===4?null:compiled.geometrySha256;
  const status=i===4?'HOLD_MODEL_IR_INVALID':'SOURCE_AND_3D_READY_ART_HOLD';
  const row={id:g.id,genre:g.genre,status,rawSha256:sha(raw),
   geometrySha256:old,sourceSha256:i===4?undefined:compiled.sourceSha256};
  save(folder,'MODEL_RESPONSE_ORIGINAL.txt',raw);
  save(folder,'CASE_REPORT.json',row);
  cases.push(row);
  diags.push({id:g.id,genre:g.genre,originalStatus:status,
   originalRawSha256:sha(raw),rawIntegrity:'SHA256_MATCHED',
   replayedGeometrySha256:compiled.geometrySha256,
   sourceReplay:i===4?'OFFLINE_SOURCE_NOW_COMPILED_NOT_ORIGINAL_QWEN_RETRY':
    'MATCHED_SAVED_GEOMETRY'});
  if(i===4)recovered.push({id:g.id,geometrySha256:compiled.geometrySha256,
   sourceSha256:compiled.sourceSha256,
   sourceRoutes:'SOURCE_ROUTES_REACH_ALL_ZONES',
   originalFailureStillRecorded:true});
 }
 const original={
  schema:'r125-local-cross-genre-study-v1',model:'qwen3:14b',
  testInjectionPresent:false,modelCalls:5,cases,
  status:'HOLD_GENRE_BATCH_PARTIAL'
 };
 save(study,'CROSS_GENRE_REPORT.json',original);
 const originalBytes=fs.readFileSync(path.join(study,'CROSS_GENRE_REPORT.json'),'utf8');
 const diag={schema:'r125-saved-cross-genre-offline-diagnostic-v1',
  originalStudyPath:fs.realpathSync(study),originalReportSha256:sha(originalBytes),
  reInferenceCalls:0,cases:diags,recoveredSourceCandidates:recovered};
 save(diagnostic,'DIAGNOSTIC_REPORT.json',diag);
 return {studyDir:study,
  diagnosticFile:path.join(diagnostic,'DIAGNOSTIC_REPORT.json'),
  outDir:path.join(base,'new-envelope')};
}
function localModelFake({badIndex=-1}={}){
 let calls=0;
 const fetcher=async (_url,options)=>{
  if(options.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:[{name:'qwen3:14b'}]})};
  const parsed=JSON.parse(options.body);
  const text=parsed.messages[1].content;
  const plan=JSON.parse(text.slice(text.indexOf('\n')+1));
  const i=calls++;
  const roofIntent={schema:ENVELOPE_SCHEMA,planId:plan.id,
   roofs:plan.rooms.map((r,j)=>({roomId:r.id,
    form:j%2?'shed':'ridge',axis:j%2?'z':'x',rise:2+i%2}))};
  if(i===badIndex)roofIntent.roofs[1].roomId='bogus-room';
  return {ok:true,text:async()=>JSON.stringify({choices:[{
   finish_reason:'stop',message:{content:JSON.stringify(roofIntent)}}]})};
 };
 return {fetcher,getCalls:()=>calls};
}
test('five distinct model-author envelopes compile real B143, but test doubles are never promoted to real inference',async t=>{
 const paths=setup(t),f=localModelFake();
 const report=await runFiveGenreEnvelopeStudy(paths,{fetcher:f.fetcher});
 assert.equal(f.getCalls(),5);
 assert.equal(report.modelCalls,5);
 assert.equal(report.testInjectionPresent,true);
 assert.equal(report.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL');
 assert.equal(report.summary.sourcePassCases,0);
 assert.equal(report.worldWrites,0);
 assert.equal(report.cases.length,5);
 assert(report.cases.every(c=>c.newGeometrySha256?.length===64));
 assert(report.cases.every(c=>c.raisedTwoWidePads>0));
 assert(report.cases.every(c=>c.routeStatus==='SOURCE_ROUTES_REACH_ALL_ZONES'));
 assert(report.cases.every(c=>c.art==='NOT_REVIEWED'));
 assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 assert.equal(report.BuildPlan.operations.length,0);
 assert(fs.existsSync(path.join(paths.outDir,'index.html')));
 assert(fs.existsSync(path.join(paths.outDir,'cases','station','index.html')));
 assert(!fs.existsSync(path.join(paths.outDir,'MAKECODE_EDUCATION.ts')));
 assert(!fs.existsSync(path.join(paths.outDir,'MODEL_RESPONSE_ORIGINAL.txt')));
 const source=JSON.parse(fs.readFileSync(path.join(paths.outDir,'cases','home','CASE_REPORT.json'),'utf8'));
 assert.equal(source.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL');
 assert(source.newGeometrySha256!==source.originalGeometrySha256);
});
test('one invalid genre cannot silently repair the supplied author intent or erase four other successes',async t=>{
 const p=setup(t),f=localModelFake({badIndex:3});
 const report=await runFiveGenreEnvelopeStudy(p,{fetcher:f.fetcher});
 assert.equal(f.getCalls(),5);
 assert.equal(report.cases.length,5);
 assert.equal(report.cases[3].failureCategory,'MODEL_ARCHITECTURAL_INTENT_INVALID');
 assert.equal(report.cases[3].newGeometrySha256,null);
 assert.equal(report.cases.filter(c=>c.newGeometrySha256).length,4);
 assert.equal(report.modelCalls,5);
 assert.equal(report.worldWrites,0);
 assert(fs.existsSync(path.join(p.outDir,'cases','gallery','MODEL_ENVELOPE_RESPONSE_ORIGINAL.txt')));
 assert(!fs.existsSync(path.join(p.outDir,'cases','gallery','index.html')));
});
test('missing local model performs zero POST, while original study and diagnostic remain untouched',async t=>{
 const p=setup(t);let posts=0;
 const fetcher=async(_url,opt)=>{
  if(opt.method==='POST')posts++;
  return {ok:true,text:async()=>JSON.stringify({models:[]})};
 };
 const report=await runFiveGenreEnvelopeStudy(p,{fetcher});
 assert.equal(posts,0);
 assert.equal(report.modelCalls,0);
 assert.equal(report.status,'HOLD_LOCAL_MODEL_NOT_READY');
 assert.equal(report.worldWrites,0);
 assert(fs.existsSync(path.join(p.outDir,'EXPRESSIVE_ENVELOPE_REPORT.json')));
 assert(!fs.existsSync(path.join(p.outDir,'index.html')));
});
test('classifications distinguish common geometry SOURCE faults from model authorship, not ART certification',()=>{
 assert.equal(classifyEnvelopeTrialFailure('R125_ENVELOPE_ROOF_INTENT'),
  'MODEL_ARCHITECTURAL_INTENT_INVALID');
 assert.equal(classifyEnvelopeTrialFailure('R125_ENVELOPE_EAVE_PERIMETER_GAP_foo'),
  'SHARED_MASSING_OR_ENVELOPE');
 const summary=summarizeEnvelopeTrials([
  {failureCategory:'SHARED_MASSING_OR_ENVELOPE'},
  {failureCategory:'SHARED_MASSING_OR_ENVELOPE'},
  {failureCategory:'MODEL_ARCHITECTURAL_INTENT_INVALID'}]);
 assert.equal(summary.commonFailureSymptoms.length,1);
 assert.equal(summary.commonFailureSymptoms[0].rootCause,'NOT_DETERMINED');
 assert.equal(summary.artisticQuality,'NOT_REVIEWED');
});

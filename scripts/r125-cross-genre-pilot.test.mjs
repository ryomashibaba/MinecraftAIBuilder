import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SCHEMA} from '../source/ai/r125-spatial-composition.mjs';
import {GENRES,runGenreBatch,analyzeGenreBatch,classifyGenreFailure,
 parseGenreArgs} from './r125-cross-genre-pilot.mjs';

const plan=i=>({
 schema:SCHEMA,id:'genre-test-'+i,title:'Independent functional architecture '+i,
 brief:'A distinct group of usable architectural rooms with an exterior entrance',
 materials:{floor:'wood',wall:'concrete',roof:'stone'},
 rooms:[
  {id:'entry-zone',purpose:'Public arrival and functional work area',
   width:12,depth:10,roofY:6+i%3},
  {id:'second-zone',purpose:'Separate functional and service activities',
   width:9,depth:8,roofY:7+i%3,
   attach:{to:'entry-zone',side:i%2===0?'east':'south',shift:0}}
 ]
});
test('five substantively different genre briefs share only the spatial compiler',()=>{
 assert.equal(GENRES.length,5);
 assert.equal(new Set(GENRES.map(x=>x.genre)).size,5);
 assert.deepEqual(GENRES.map(x=>x.id),['home','retail','laboratory','gallery','station']);
 assert.throws(()=>parseGenreArgs(['--model','qwen3:14b']),/ARGS/);
});
test('common genre symptoms are grouped but never asserted as proven shared cause',()=>{
 const result=analyzeGenreBatch([
  {id:'a',genre:'住宅',failureCategory:'SPATIAL_RELATIONS_INVALID'},
  {id:'b',genre:'店舗',failureCategory:'SPATIAL_RELATIONS_INVALID'},
  {id:'c',genre:'美術館',failureCategory:'MODEL_IR_INVALID'}]);
 assert.equal(result.sharedSymptoms.length,1);
 assert.equal(result.sharedSymptoms[0].genreCount,2);
 assert.equal(result.sharedSymptoms[0].rootCause,'NOT_DETERMINED');
 assert.equal(classifyGenreFailure('R125_SPATIAL_VOLUMES_OVERLAP_east'),'SPATIAL_RELATIONS_INVALID');
 assert.equal(classifyGenreFailure('B143_OUTSIDE_LOCAL_BOUNDS'),'COMMON_GEOMETRY_ENGINE');
});
test('five model-response test doubles compile distinct real source but remain strictly unverified',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-five-genre-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let posts=0;
 const fetcher=async(_url,opt)=>{
  if(opt.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:[{name:'qwen3:14b'}]})};
  const raw=JSON.stringify(plan(posts++));
  return {ok:true,text:async()=>JSON.stringify({choices:[
   {finish_reason:'stop',message:{content:raw}}]})};
 };
 const out=path.join(root,'private-batch');
 const report=await runGenreBatch({model:'qwen3:14b',outDir:out},{fetcher});
 assert.equal(posts,5);assert.equal(report.modelCalls,5);
 assert.equal(report.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(report.analysis.sourceCompiled,5);
 assert.equal(report.analysis.requestedGenreCount,5);
 assert.equal(report.analysis.allSourcePass,true);
 assert.equal(report.worldWrites,0);
 assert(report.cases.every(x=>x.status==='HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE'));
 assert(fs.existsSync(path.join(out,'index.html')));
 assert(fs.existsSync(path.join(out,'cases','gallery','index.html')));
 assert(!fs.existsSync(path.join(out,'MAKECODE_EDUCATION.ts')));
 assert.equal(fs.readFileSync(path.join(out,'cases','home','MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),
  JSON.stringify(plan(0)));
});
test('five invalid independent original responses retain provenance and cluster shared failures',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-genre-hold-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let posts=0;
 const fetcher=async(_url,opt)=>{
  if(opt.method==='GET')return {ok:true,text:async()=>JSON.stringify({
   models:[{name:'qwen3:14b'}]})};
  const original=plan(posts++);
  original.rooms[1].attach.to='nonexistent';
  return {ok:true,text:async()=>JSON.stringify({choices:[
   {finish_reason:'stop',message:{content:JSON.stringify(original)}}]})};
 };
 const out=path.join(root,'private-batch');
 const report=await runGenreBatch({model:'qwen3:14b',outDir:out},{fetcher});
 assert.equal(posts,5);
 assert.equal(report.analysis.sourceCompiled,0);
 assert.equal(report.analysis.sharedSymptoms[0].genreCount,5);
 assert.equal(report.analysis.sharedSymptoms[0].rootCause,'NOT_DETERMINED');
 assert.equal(report.analysis.sharedSymptoms[0].category,'MODEL_IR_INVALID');
 assert(report.cases.every(x=>x.rawSha256?.length===64));
 assert.equal(report.worldWrites,0);
});
test('a missing local Ollama model cannot cause any POST or false real 3D claims',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-genre-model-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let posts=0;
 const fetcher=async(_url,opt)=>{
  if(opt.method==='POST')posts++;
  return {ok:true,text:async()=>JSON.stringify({models:[]})};
 };
 const out=path.join(root,'private-batch');
 const report=await runGenreBatch({model:'qwen3:14b',outDir:out},{fetcher});
 assert.equal(posts,0);assert.equal(report.modelCalls,0);
 assert.equal(report.status,'HOLD_MODEL_NOT_INSTALLED');
 assert.equal(report.analysis.sourceCompiled,0);
 assert(fs.existsSync(path.join(out,'CROSS_GENRE_REPORT.json')));
 assert.equal(report.worldWrites,0);
});

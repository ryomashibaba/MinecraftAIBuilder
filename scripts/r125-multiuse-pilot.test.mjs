import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runR125Multiuse,parseR125MultiuseArgs,SUITES}
 from './r125-multiuse-pilot.mjs';
import {SCHEMA} from '../source/ai/r125-architecture-plan.mjs';

const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r125-multi-'));
function sample(caseId){
 const two=caseId==='research-studio';
 return {schema:SCHEMA,id:two?'unique-study-center':'small-retail-space',
  title:two?'New research workspace':'Contemporary local shop',
  brief:two?'Scientific model workshop and public study rooms':'Neighborhood customer and staff spaces',
  footprint:{width:two?24:18,depth:two?28:20},
  levels:[0,...(two?[1]:[])].map(n=>({
   splitAxis:n?'z':'x',splitPercent:n?40:60,
   spaces:[{id:'a-zone-'+n,purpose:'Experimental independent function'},
    {id:'b-zone-'+n,purpose:'Complementary independent function'}]
  })),
  materials:{floor:'wood',wall:'stone',roof:'metal'}
 };
}
test('two real-geometry-generating local stub calls across distinct uses, never mislabel test as real',async t=>{
 const root=tmp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const out=path.join(root,'comparison');let gets=0,posts=0;
 const fetcher=async(url,options)=>{
  if(options.method==='GET'){
   gets++;return {ok:true,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  }
  posts++;
  const payload=JSON.parse(options.body);
  const suite=SUITES.find(x=>x.prompt===payload.messages[1].content);
  assert.ok(suite);
  return {ok:true,text:async()=>JSON.stringify({
   choices:[{finish_reason:'stop',message:{content:JSON.stringify(sample(suite.id))}}]
  })};
 };
 const result=await runR125Multiuse({model:'qwen3:14b',outDir:out},{fetcher});
 assert.equal(gets,2);assert.equal(posts,2);
 assert.equal(result.newModelCalls,2);
 assert.equal(result.reportedTrials.length,2);
 assert.equal(result.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(result.testInjectionPresent,true);
 assert.equal(result.knownPreviousResidence.voxels,2620);
 assert.equal(result.reportedTrials.every(x=>x.originalRawCaptured===true),true);
 assert.equal(result.reportedTrials.every(x=>typeof x.geometrySha256==='string'),true);
 assert.equal(result.reportedTrials.every(x=>x.status==='HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE'),true);
 assert.equal(result.worldWrites,0);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.equal(fs.existsSync(path.join(out,'entry-shop','index.html')),true);
 assert.equal(fs.existsSync(path.join(out,'research-studio','index.html')),true);
 const persisted=JSON.parse(fs.readFileSync(path.join(out,'R125_MULTIUSE_REPORT.json'),'utf8'));
 assert.equal(persisted.newModelCalls,2);
 assert.equal(persisted.originalResidenceRetained,true);
});
test('missing exact model calls zero POST and stops after one preflight',async t=>{
 const root=tmp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let posts=0;
 const out=path.join(root,'missing');
 const r=await runR125Multiuse({model:'qwen3:14b',outDir:out},{
  fetcher:async(url,options)=>{
   if(options.method==='POST'){posts++;throw Error('POST_NOT_ALLOWED');}
   return {ok:true,text:async()=>JSON.stringify({models:[]})};
  }});
 assert.equal(posts,0);
 assert.equal(r.reportedTrials.length,1);
 assert.equal(r.reportedTrials[0].status,'HOLD_MODEL_NOT_INSTALLED');
 assert.equal(r.newModelCalls,0);
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
});
test('command parsing rejects dangerous remote endpoint and overwriting evidence',async t=>{
 assert.throws(()=>parseR125MultiuseArgs(['--model','qwen3:14b',
  '--out','sample','--endpoint','https://elsewhere.com/v1/chat/completions']),
 /LOOPBACK_ONLY/);
 const root=tmp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 await assert.rejects(()=>runR125Multiuse({
  model:'qwen3:14b',outDir:root}),/OUTPUT_ALREADY_EXISTS/);
 assert.equal(SUITES.length,2);
 assert.notEqual(SUITES[0].prompt,SUITES[1].prompt);
});

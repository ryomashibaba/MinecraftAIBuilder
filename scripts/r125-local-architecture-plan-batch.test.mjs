import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runR125ArchitecturePlanBatch,parseR125BatchBriefs,parseR125BatchArgs}
 from './r125-local-architecture-plan-batch.mjs';
import {renderR125BatchComparison} from './r125-batch-compare.mjs';

const original=fs.readFileSync(new URL(
 '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
 import.meta.url),'utf8');
const provider=raw=>({ok:true,json:async()=>({
 choices:[{message:{content:raw},finish_reason:'stop'}]})});
const requests=[
 {id:'shop',prompt:'店舗として展示と販売の動線を明確にした独創的な小建築を設計してください。'},
 {id:'lab',prompt:'実験と記録作業を区別できる小さな研究施設を設計してください。'},
 {id:'home',prompt:'採光と生活動線を工夫した小規模な住宅を設計してください。'}
];
const input=JSON.stringify(requests);

test('batch parser preflights unique bounded original briefs',()=>{
 assert.deepEqual(parseR125BatchBriefs(input),requests);
 assert.throws(()=>parseR125BatchBriefs('[]'),/BRIEF_COUNT_1_TO_3/);
 assert.throws(()=>parseR125BatchBriefs(JSON.stringify([
  requests[0],{...requests[0],id:'second'}])),/INVALID_DUPLICATE/);
 assert.throws(()=>parseR125BatchBriefs(JSON.stringify([
  requests[0],{...requests[1],id:'../evil'}])),/INVALID_DUPLICATE/);
 assert.throws(()=>parseR125BatchBriefs(JSON.stringify([
  requests[0],requests[1],requests[2],requests[0]])),/BRIEF_COUNT_1_TO_3/);
 assert.deepEqual(parseR125BatchArgs(['--help']),{help:true});
 const pilotFile=fileURLToPath(new URL('./r125-v11-pilot-three.json',import.meta.url));
 const pilot=parseR125BatchBriefs(fs.readFileSync(pilotFile,'utf8'));
 assert.deepEqual(pilot.map(x=>x.id),['housing','retail','research']);
 assert.ok(pilot.every(x=>x.prompt.length>=80));
 const args=parseR125BatchArgs(['--model','qwen3:14b',
  '--pilot-three','--out','/private/result']);
 assert.equal(args.pilotThree,true);
 assert.equal(args.briefsFile,null);
 assert.throws(()=>parseR125BatchArgs(['--model','qwen3:14b',
  '--pilot-three','--briefs','x','--out','y']),/ARGS_/);
 assert.equal(parseR125BatchArgs(['--model','qwen3:14b','--briefs',
  '/private/briefs.json','--out','/private/review']).model,'qwen3:14b');
});
test('one sequential SOURCE call per distinct brief, original files persisted',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-batch-'));
 try{
  let postCount=0,active=0,peak=0;
  const fake=async()=>{active++;peak=Math.max(active,peak);
   postCount++;const p=JSON.parse(original);
   // Different real voxel dimensions, not differing source IDs alone.
   p.footprint.width=24+(postCount-1)*2;
   active--;
   return provider(JSON.stringify(p));
  };
  const output=path.join(root,'private-batch');
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:output},{fetcher:fake});
  assert.equal(postCount,3);
  assert.equal(peak,1);
  assert.equal(report.attempted,3);
  assert.equal(report.planned,3);
  assert.equal(report.sourcePassCount,3);
  assert.equal(report.originalResponseCount,3);
  assert.equal(report.evaluatedAllBriefs,true);
  assert.equal(report.experimentOutcome,'COMPLETE_WITH_REPEATED_AUTHOR_FORMS');
  assert.equal(report.geometryHashesDistinct,true);
  assert.equal(report.modelAuthoredFormFamiliesDistinct,false,
   'different dimensions are not creative differences in roof or massing');
  assert.equal(report.allSourceVerified,true);
  assert.equal(report.worldWrites,0);
  assert.equal(report.visualDiversity,'NOT_REVIEWED');
  assert.equal(fs.readFileSync(path.join(output,'BRIEFS_ORIGINAL.json'),'utf8'),input);
  assert.equal(fs.existsSync(path.join(output,'shop','B143_SOURCE_3D_REVIEW_ONLY.html')),true);
  assert.equal(fs.existsSync(path.join(output,'lab','B143_SOURCE_3D_REVIEW_ONLY.html')),true);
  assert.equal(fs.existsSync(path.join(output,'home','B143_SOURCE_3D_REVIEW_ONLY.html')),true);
  assert.ok(report.completed.every(x=>x.sourceVerified&&x.originalSha256));
  const html=fs.readFileSync(path.join(output,'BATCH_COMPARE_3D.html'),'utf8');
  assert.equal((html.match(/<iframe /g)||[]).length,3);
  assert.ok(html.includes('REPEATED model-authored form families'));
  assert.ok(html.includes('Human ART NOT REVIEWED'));
  assert.ok(html.includes('./home/B143_SOURCE_3D_REVIEW_ONLY.html'));
  assert.ok(report.completed.every(x=>x.authoredProgram?.length===1));
  assert.ok(html.includes('MAKECODE_EDUCATION_SOURCE_ONLY.ts'));
  assert.ok(report.completed.every(x=>x.makeCodeStatus==='OFFLINE_CODE_GENERATED_ONLY'));
  assert.ok(fs.existsSync(path.join(output,'shop','MAKECODE_EDUCATION_SOURCE_ONLY.ts')));
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('bad source schema does NOT suppress the other two real-brief original attempts',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-batch-stop-'));
 let calls=0;
 try{
  const output=path.join(root,'stopped');
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:output},
   {fetcher:async()=>{calls++;return provider('{"schema":')}});
  assert.equal(calls,3);
  assert.equal(report.attempted,3);
  assert.equal(report.originalResponseCount,3);
  assert.equal(report.sourcePassCount,0);
  assert.equal(report.evaluatedAllBriefs,true);
  assert.equal(report.experimentOutcome,'COMPLETE_WITH_REJECTED_ARCHITECTURES');
  assert.equal(report.completed[0].modelResponsesCaptured,1);
  assert.equal(report.stopReason,null);
  assert.equal(report.allSourceVerified,false);
  assert.equal(fs.existsSync(path.join(output,'lab')),true);
  const html=fs.readFileSync(path.join(output,'BATCH_COMPARE_3D.html'),'utf8');
  assert.ok(html.includes('No 3D scene (HOLD)'));
  assert.ok(!html.includes('NOT ATTEMPTED: lab'));
  assert.ok(html.includes('COMPLETE_WITH_REJECTED_ARCHITECTURES'));
  assert.equal((html.match(/<iframe /g)||[]).length,0);
  assert.equal(fs.readFileSync(path.join(output,'shop',
   'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),'{"schema":');
  assert.equal(report.completed[0].failureReason,'B198G_LOCAL_PLAN_NOT_JSON');
  assert.ok(fs.existsSync(path.join(output,'shop','SOURCE_DIAGNOSIS.json')));
  assert.ok(fs.readFileSync(path.join(output,'BATCH_COMPARE_3D.html'),'utf8')
   .includes('B198G_LOCAL_PLAN_NOT_JSON'));
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('identical buildings are still recorded for ALL three briefs and marked poor diversity',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-batch-same-'));
 let calls=0;
 try{
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:path.join(root,'same')},
   {fetcher:async()=>{calls++;return provider(original)}});
  assert.equal(calls,3);
  assert.equal(report.geometryHashesDistinct,false);
  assert.equal(report.modelAuthoredFormFamiliesDistinct,false);
  assert.equal(report.stopReason,null);
  assert.equal(report.sourcePassCount,3);
  assert.equal(report.evaluatedAllBriefs,true);
  assert.equal(report.experimentOutcome,'COMPLETE_WITH_IDENTICAL_B143_GEOMETRY');
  assert.equal(report.allSourceVerified,true);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('transport failure WITHOUT raw model content stops further POSTs',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-no-raw-stop-'));
 let calls=0;
 try{
  const out=path.join(root,'out');
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:out
  },{fetcher:async()=>{calls++;return {ok:false,status:503}}});
  assert.equal(calls,1);
  assert.equal(report.attempted,1);
  assert.equal(report.originalResponseCount,0);
  assert.equal(report.stopReason,'STOP_PROVIDER_DID_NOT_RETURN_CAPTURABLE_ORIGINAL');
  assert.equal(report.experimentOutcome,'HOLD_PROVIDER_OR_INCOMPLETE');
  assert.equal(fs.existsSync(path.join(out,'lab')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('mixed invalid first and valid later proposals keep true source comparison',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-mixed-research-'));
 let calls=0;
 try{
  const out=path.join(root,'output');
  const fake=async()=>{
   calls++;
   if(calls===1)return provider('invalid-original-json');
   const plan=JSON.parse(original);
   plan.footprint.width=24+(calls-2)*2;
   return provider(JSON.stringify(plan));
  };
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:out
  },{fetcher:fake});
  assert.equal(calls,3);
  assert.equal(report.originalResponseCount,3);
  assert.equal(report.sourcePassCount,2);
  assert.equal(report.evaluatedAllBriefs,true);
  assert.equal(report.allSourceVerified,false);
  assert.equal(report.experimentOutcome,'COMPLETE_WITH_REJECTED_ARCHITECTURES');
  assert.equal(report.completed[0].sourceVerified,false);
  assert.equal(report.completed[1].sourceVerified,true);
  assert.equal(report.completed[2].sourceVerified,true);
  const html=fs.readFileSync(path.join(out,'BATCH_COMPARE_3D.html'),'utf8');
  assert.equal((html.match(/<iframe /g)||[]).length,2);
  assert.ok(html.includes('SOURCE passes 2/3'));
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('remote endpoints reject before creating output or calling model',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-batch-url-'));
 let requests=0;
 try{
  const output=path.join(root,'remote');
  await assert.rejects(runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:output,
   endpoint:'https://api.openai.com/v1/chat/completions'
  },{fetcher:async()=>{requests++;return provider(original)}}),/B198G_LOCAL_ONLY_EXPLICIT/);
  assert.equal(requests,0);assert.equal(fs.existsSync(output),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('comparison escapes untrusted original request text',()=>{
 const html=renderR125BatchComparison([{id:'safe',prompt:'<img src=x onerror=alert(1)>'}],{
  model:'qwen3:14b',attempted:0,planned:1,allSourceVerified:false,
  modelAuthoredFormFamiliesDistinct:null,stopReason:'NOT_STARTED',completed:[]});
 assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(!html.includes('<img src=x'));
});

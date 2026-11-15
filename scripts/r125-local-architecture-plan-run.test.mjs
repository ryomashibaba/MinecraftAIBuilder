import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createR125ArchitecturePlanLocalAdapter,R125_ARCHITECTURE_RESPONSE_SCHEMA}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {runR125LocalArchitecturePlan,parseR125LocalPlanArgs}
 from './r125-local-architecture-plan-run.mjs';
import {diagnoseR125ArchitecturePlanOriginal}
 from './r125-offline-replay.mjs';

const original=fs.readFileSync(
 new URL('../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
 import.meta.url),'utf8');
const digest=s=>createHash('sha256').update(s).digest('hex');
const provider=raw=>({ok:true,json:async()=>({
 choices:[{message:{content:raw},finish_reason:'stop'}],
 usage:{prompt_tokens:157,completion_tokens:423,total_tokens:580}})});
const prompt='未知の用途に対応し、入口・屋内動線・採光を持つ独創的な店舗を設計してください。';

test('existing real Qwen original replays through the unchanged B143 and circulation',()=>{
 const r=diagnoseR125ArchitecturePlanOriginal(original);
 assert.equal(r.originalSha256,digest(original));
 assert.equal(r.status,'B143_SOURCE_CANDIDATE_ART_HOLD');
 assert.equal(r.sourceVerified,true);
 assert.equal(r.occupiedVoxels,1336);
 assert.equal(r.modelCalls,0);
 assert.equal(r.artStatus,'NOT_REVIEWED');
 assert.equal(r.worldWrites,0);
});

test('new R125 adapter has no direct B143 fallback, remote endpoint, or implicit POST',async()=>{
 let posts=0;
 const fake=async()=>{posts++;return provider(original);};
 for(const endpoint of [
  'https://api.openai.com/v1/chat/completions',
  'http://localhost:11434/v1/chat/completions',
  'http://127.0.0.2:11434/v1/chat/completions',
  'http://127.0.0.1:11434/unsafe'
 ])assert.throws(()=>createR125ArchitecturePlanLocalAdapter({
   model:'qwen3:14b',endpoint,fetcher:fake,onRawModelResponse:()=>{}
  }),/B198G_LOCAL_ONLY_EXPLICIT/);
 assert.throws(()=>createR125ArchitecturePlanLocalAdapter({
  model:'qwen3:14b',fetcher:fake
 }),/B198G_LOCAL_REQUIRED_RAW_CAPTURE_CALLBACK/);
 const captured=[];
 const author=createR125ArchitecturePlanLocalAdapter({
  model:'qwen3:14b',fetcher:async(url,opts)=>{
   posts++;
   assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
   const request=JSON.parse(opts.body);
   assert.equal(request.response_format.type,'json_schema');
   assert.equal(request.response_format.json_schema.name,'r125_architecture_plan_v11');
   assert.equal(request.response_format.json_schema.strict,true);
   const structured=request.response_format.json_schema.schema;
   assert.deepEqual(structured,R125_ARCHITECTURE_RESPONSE_SCHEMA);
   assert.equal(structured.additionalProperties,false);
   assert.equal(structured.properties.levels.maxItems,2);
   assert.equal(structured.properties.levels.items.properties.spaces.minItems,2);
   assert.equal(structured.properties.levels.items.properties.spaces.maxItems,2);
   const room=structured.properties.levels.items.properties.spaces.items;
   assert.equal(room.additionalProperties,false);
   assert.ok(room.properties.fixtures.items.enum.includes('electronics'));
   assert.equal(room.properties.fixtures.maxItems,3);
   const options=structured.properties.expression.anyOf;
   assert.equal(options.length,9);
   assert.ok(options.every(v=>v.type==='object'&&
    v.additionalProperties===false));
   const pitchedEaves=options.filter(v=>v.required.includes('roofOverhang'));
   assert.equal(pitchedEaves.length,2);
   assert.ok(pitchedEaves.every(v=>
    v.required.includes('roofVolume')&&
    v.properties.roofOverhang.enum.join(',')==='one-block'&&
    v.properties.roofProfile.enum.join(',')==='ridge,sawtooth'&&
    !Object.hasOwn(v.properties,'rearCornerCut')));
   const monitor=options.filter(v=>v.properties.roofProfile.enum.includes('split-monitor'));
   assert.equal(monitor.length,1);
   assert.deepEqual(monitor[0].properties.setbackSide.enum,['none']);
   assert.deepEqual(monitor[0].properties.setbackDepth.enum,[0]);
   assert.deepEqual(monitor[0].properties.roofAxis.enum,['x']);
   assert.ok(monitor[0].required.includes('roofVolume'));
   assert.equal(Object.hasOwn(monitor[0].properties,'rearCornerCut'),false);
   const courtyard=options.filter(v=>v.required.includes('rearCornerCut'));
   assert.equal(courtyard.length,2);
   assert.ok(courtyard.every(v=>
    v.properties.setbackSide.enum.join(',')==='none'));
   assert.ok(courtyard.every(v=>
    v.properties.roofProfile.enum.every(x=>x==='flat'||x==='ridge')));
   const setback=options.filter(v=>
    v.properties.setbackSide.enum.includes('east'));
   assert.equal(setback.length,3);
   assert.ok(setback.every(v=>
    !v.properties.roofProfile.enum.includes('split-monitor')&&
    !Object.hasOwn(v.properties,'rearCornerCut')));
   assert.equal(request.stream,false);
   assert.equal(request.messages[1].role,'user');
   assert.equal(request.messages[0].content.includes('B143 elements'),true);
   assert.equal(request.messages[0].content.includes('footprint'),true);
   assert.equal(request.messages[0].content.includes('No fixed building-type template'),true);
   assert.equal(request.messages[0].content.includes('actively SELECT an expression'),true);
   assert.equal(request.messages[0].content.includes('raised roof volume'),true);
   assert.equal(request.messages[0].content.includes('ROOM-APPROPRIATE fixture'),true);
   assert.equal(request.messages[0].content.includes('REAL ROOM BUDGET'),true);
   assert.equal(request.messages[0].content.includes('3-wide control room'),true);
   assert.equal(request.messages[1].content.includes('sourceOnly'),true);
   assert.equal(opts.headers.Authorization,undefined);
   return provider(original);
  },onRawModelResponse:x=>captured.push(x)
 });
 assert.equal(posts,0);
 const out=await author({prompt});
 assert.equal(posts,1);
 assert.deepEqual(captured,[original]);
 assert.equal(out.originalSha256,digest(original));
 assert.equal(out.plan.schema,'minecraftaibuilder-r125-architecture-plan-v1');
 assert.equal(out.sourceVerified,false);
});

test('one call records raw and true SOURCE, without privately leaking raw into report',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-plan-'));
 const dest=path.join(root,'result');
 let requests=0;
 try{
  const out=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt,outDir:dest
  },{fetcher:async()=>{requests++;return provider(original)}});
  assert.equal(requests,1);
  assert.equal(out.report.status,'B143_SOURCE_CANDIDATE_ART_HOLD');
  assert.equal(out.report.sourceVerified,true);
  assert.equal(out.report.originalSha256,digest(original));
  assert.equal(out.report.modelResponsesCaptured,1);
  assert.ok(Number.isSafeInteger(out.report.modelRequestElapsedMs));
  assert.ok(out.report.modelRequestElapsedMs>=0);
  assert.deepEqual(out.report.providerReportedTokenUsage,{
   promptTokens:157,completionTokens:423,totalTokens:580});
  assert.equal(fs.readFileSync(path.join(dest,'REQUEST_ORIGINAL.txt'),'utf8'),prompt);
  assert.equal(out.report.requestSha256,digest(prompt));
  assert.deepEqual(out.report.requestedGenerationSettings,{
   temperature:0.55,responseFormat:'json_schema',
   maxOutputTokens:4096,reasoningEffort:null,timeoutMs:180000
  });
  assert.equal(out.report.nineWorldGates.length,9);
  assert.ok(out.report.nineWorldGates.every(x=>x==='BLOCKED'));
  assert.equal(out.report.artStatus,'NOT_REVIEWED');
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),original);
  const diag=JSON.parse(fs.readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(diag.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(diag.circulation,'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(diag.modelAuthorshipVerified,false);
  const runText=fs.readFileSync(path.join(dest,'RUN_REPORT.json'),'utf8');
  assert.equal(runText.includes('Customer retail display and sales'),false);
  assert.ok(fs.existsSync(path.join(dest,'B143_SOURCE_REVIEW_ONLY.json')));
  const viewer=fs.readFileSync(path.join(dest,
   'B143_SOURCE_3D_REVIEW_ONLY.html'),'utf8');
  assert.ok(viewer.includes('minecraftaibuilder-b143-gallery-v1'));
  assert.ok(viewer.includes(diag.geometrySha256));
  assert.equal(out.report.review3d,'TRUE_B143_HTML_GENERATED_ART_PENDING');
  assert.equal(out.report.makeCodeStatus,'OFFLINE_CODE_GENERATED_ONLY');
  assert.equal(typeof out.report.makeCodeSourceSha256,'string');
  const exportReport=JSON.parse(fs.readFileSync(path.join(dest,
   'MAKECODE_EXPORT_REPORT.json'),'utf8'));
  assert.equal(exportReport.status,'OFFLINE_CODE_GENERATED_ONLY');
  assert.equal(exportReport.sourceSha256,diag.sourceSha256);
  assert.equal(exportReport.geometrySha256,diag.geometrySha256);
  assert.equal(exportReport.programExecuted,false);
  assert.equal(exportReport.worldWrites,0);
  assert.deepEqual(exportReport.BuildPlan.operations,[]);
  assert.equal(exportReport.materialMode,'STRICT_USER_ATTESTED');
  const makecode=fs.readFileSync(path.join(dest,
   'MAKECODE_EDUCATION_SOURCE_ONLY.ts'),'utf8');
  assert.ok(makecode.includes('player.onChat("mabbuild"'));

 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('daylight authoring passes local adapter to true B143 3D and MakeCode',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-daylight-full-'));
 const dest=path.join(root,'result');
 const modelOriginal=JSON.parse(original);
 modelOriginal.id='authored-daylight-e2e';
 modelOriginal.levels[0].spaces[0].daylight='wide-bay';
 const raw=JSON.stringify(modelOriginal);
 let requests=0;
 try{
  const {report}=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt,outDir:dest
  },{fetcher:async()=>{requests++;return provider(raw)}});
  assert.equal(requests,1);
  assert.equal(report.sourceVerified,true);
  assert.equal(report.makeCodeStatus,'OFFLINE_CODE_GENERATED_ONLY');
  const diagnosis=JSON.parse(fs.readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(diagnosis.modelChosenDaylight,1);
  assert.equal(diagnosis.daylightSourceWindows[0].kind,'wide-bay');
  assert.equal(diagnosis.daylightSourceWindows[0].outsideAirVerified,true);
  assert.equal(diagnosis.originalSha256,digest(raw));
  const exportReport=JSON.parse(fs.readFileSync(path.join(dest,'MAKECODE_EXPORT_REPORT.json'),'utf8'));
  assert.equal(exportReport.sourceSha256,diagnosis.sourceSha256);
  assert.equal(exportReport.geometrySha256,diagnosis.geometrySha256);
  assert.equal(exportReport.worldWrites,0);
  assert.equal(exportReport.programExecuted,false);
  assert.deepEqual(exportReport.BuildPlan.operations,[]);
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  assert.equal(report.artStatus,'NOT_REVIEWED');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('invalid response is captured verbatim but never repaired, re-requested or promoted',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-hold-'));
 const dest=path.join(root,'result');
 let requests=0;
 try{
  const out=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt,outDir:dest
  },{fetcher:async()=>{requests++;return provider('{"schema":');}});
  assert.equal(requests,1);
  assert.equal(out.report.status,'HOLD_MODEL_OR_SOURCE');
  assert.equal(out.report.modelResponsesCaptured,1);
  assert.equal(out.report.originalSha256,digest('{"schema":'));
  assert.equal(out.report.automaticRetries,0);
  assert.equal(out.report.sourceVerified,false);
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),'{"schema":');
  assert.equal(fs.existsSync(path.join(dest,'B143_SOURCE_REVIEW_ONLY.json')),false);
  assert.equal(fs.existsSync(path.join(dest,'MAKECODE_EDUCATION_SOURCE_ONLY.ts')),false);
  const diagnosis=JSON.parse(fs.readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(diagnosis.status,'HOLD_INVALID_ORIGINAL_JSON');
  assert.equal(diagnosis.originalEdited,false);
  assert.equal(out.report.offlineDiagnosisStatus,'HOLD_INVALID_ORIGINAL_JSON');
  assert.equal(out.report.automaticRetries,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('valid JSON invalid schema retains specific offline compiler reason without retries',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-reject-'));
 const dest=path.join(root,'invalid-plan');
 const bad=JSON.stringify({...JSON.parse(original),unexpectedAuthorKey:'unverified'});
 let calls=0;
 try{
  const {report}=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt,outDir:dest
  },{fetcher:async()=>{calls++;return provider(bad)}});
  assert.equal(calls,1);
  assert.equal(report.sourceVerified,false);
  assert.equal(report.modelResponsesCaptured,1);
  assert.equal(report.automaticRetries,0);
  assert.equal(report.status,'HOLD_MODEL_OR_SOURCE');
  assert.equal(report.offlineDiagnosisStatus,'HOLD_PLAN_COMPILER_OR_QA');
  assert.match(report.offlineCompilerReason,/R125_PLAN_TOP_LEVEL_FIELDS/);
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),bad);
  const diagnosis=JSON.parse(fs.readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(diagnosis.status,'HOLD_PLAN_COMPILER_OR_QA');
  assert.equal(diagnosis.modelCalls,0);
  assert.equal(fs.existsSync(path.join(dest,'B143_SOURCE_REVIEW_ONLY.json')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('CLI insists on explicit model/prompt/new private path',()=>{
 assert.deepEqual(parseR125LocalPlanArgs(['--help']),{help:true});
 assert.throws(()=>parseR125LocalPlanArgs(['--model','qwen3:14b']),
  /ARGS_MODEL_PROMPT_OUT_REQUIRED/);
 assert.equal(parseR125LocalPlanArgs(['--model','qwen3:14b','--prompt',
  prompt,'--out','somewhere']).model,'qwen3:14b');
});

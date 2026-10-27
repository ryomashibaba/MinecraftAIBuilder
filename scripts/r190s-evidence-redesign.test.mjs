/** R190-S fake-provider regression; no real inference / no Minecraft. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {STUDY_BRIEF} from './r190n-one-click-research.mjs';
import {parseR190SArgs,inspectR190SOriginal,diagnoseR190SGeometry,
 buildR190SRedesignPrompt,runR190SStudy} from './r190s-evidence-redesign.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const empty=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r190s-test-'));
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldWrites:0,worldContacts:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
function design(){
 return {schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'synthetic-architectural-failure',
  title:'SYNTHETIC SOLID VOID FAILURE',
  brief:'Synthetic stacked volumes, not a real model proposal',
  bounds:{width:24,depth:24,height:14},designOnly:true,
  elements:[
   {id:'wide-floor-1',shape:'box',mode:'add',material:'concrete',origin:[2,1,2],size:[20,2,20]},
   {id:'wide-floor-2',shape:'box',mode:'add',material:'wood',origin:[2,3,2],size:[20,2,20]},
   {id:'wide-roof-3',shape:'box',mode:'add',material:'wood',origin:[2,5,2],size:[20,2,20]}
  ]};
}
function raw(){return JSON.stringify({design:design(),
 explanation:'SYNTHETIC only, no real AI model',assumptions:[],
 spatialPlan:{designIntent:'a fake solid building',
 massStrategy:'solid floor and roof',circulationStrategy:'claimed but blocked',
 entrance:[5,2,5],headroom:2,protectedVoids:[],
 destinations:[{id:'zone',point:[5,2,5],maximumPathSteps:1}],
 functionalZones:[{id:'interior-zone',origin:[5,2,5],size:[8,3,8],
  minimumReachablePositions:4,minimumReachablePercent:20}]}});}
function baseline(root){
 const dir=path.join(root,'original'),r=raw(),scene=compileDesign(design());
 fs.mkdirSync(dir);
 fs.writeFileSync(path.join(dir,'R190_I_ORIGINAL_RESPONSE.txt'),r);
 fs.writeFileSync(path.join(dir,'R190_I_ORIGINAL_BRIEF.txt'),STUDY_BRIEF);
 fs.writeFileSync(path.join(dir,'R190_I_CAPTURE_RECEIPT.json'),JSON.stringify({
  schema:'minecraftaibuilder-r190-j-capture-v1',
  status:'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW',
  originalRawSha256:sha(r),originalRequestSha256:sha(STUDY_BRIEF),
  rawProviderBytesPreserved:true,modelRequested:'qwen3:14b',
  providerConfirmedComplete:true,
  unapprovedGeometryEvidence:{sourceSha256:scene.sourceSha256,
   geometrySha256:scene.geometrySha256,trueB143Voxels:scene.primitives.length},
  ...safety()}));
 fs.writeFileSync(path.join(dir,'R190R_ROUTE_COMPARISON.json'),JSON.stringify({
  schema:'minecraftaibuilder-r190r-direct-v1',
  directReviewStatus:'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW',
  originalDirectRawSha256:sha(r),frozenBriefSha256:sha(STUDY_BRIEF),
  modelRequested:'qwen3:14b',...safety()}));
 return dir;
}
const fakeFetch=(reply,tracker)=>async(url,opts)=>{
 tracker.count++;
 assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
 const body=JSON.parse(opts.body);
 assert.equal(body.model,'qwen3:14b');
 assert.match(JSON.stringify(body),/鋸歯状/);
 assert.match(JSON.stringify(body),/立脚/);
 return {ok:true,json:async()=>({choices:[{finish_reason:'stop',
  message:{content:reply}}]})};
};
test('S: real voxel sampling exposes solid layers without declaring finished architecture',()=>{
 const geometry=compileDesign(design());
 const critique=diagnoseR190SGeometry({design:design(),
  compiled:geometry,spatialPlan:JSON.parse(raw()).spatialPlan});
 assert.equal(critique.finalVoxelCount,geometry.primitives.length);
 assert.equal(critique.nearSolidHorizontalLayers.length,6);
 assert.equal(critique.modelDeclaredEntranceStandable,false);
 assert.ok(critique.modelDeclaredZoneSamples[0].standablePositions===0);
 assert.equal(critique.modelDeclaredZoneSamples[0].belowModelDeclaredMinimum,true);
 assert.equal(critique.roofTopHeightLevels,1);
 assert.equal(critique.qualityImprovementCertified,false);
 const prompt=buildR190SRedesignPrompt(critique);
 assert.match(prompt,/最初から再構想/);
 assert.match(prompt,/鋸歯状/);
 assert.match(prompt,/最低数に満たない機能領域/);
 assert.doesNotMatch(prompt,/origin:\s*\[/);
});
test('S: rejects a poisoned baseline before any model request',async()=>{
 const root=empty();
 try{
  const src=baseline(root);
  fs.appendFileSync(path.join(src,'R190_I_ORIGINAL_RESPONSE.txt'),'CORRUPTED');
  assert.throws(()=>inspectR190SOriginal(src),/BASELINE_EVIDENCE_CHAIN/);
  await assert.rejects(runR190SStudy(['--from',src],{
   evidenceRoot:path.join(root,'output'),
   fetcher:()=>{throw Error('MODEL_MUST_NOT_BE_CALLED')},transport:'openai'
  }),/BASELINE_EVIDENCE_CHAIN/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('S: one explicit FAKE redesign then replay without any new model request',async()=>{
 const root=empty(),tracker={count:0};
 try{
  const src=baseline(root),result=path.join(root,'out');
  const first=await runR190SStudy(['--from',src],{
   evidenceRoot:result,transport:'openai',timestamp:()=>108,
   fetcher:fakeFetch(raw(),tracker)});
  assert.equal(tracker.count,1);
  assert.equal(first.modelCalls,1);
  assert.equal(first.originalParentSha256,sha(raw()));
  const check=JSON.parse(fs.readFileSync(path.join(first.directory,
   'R190S_COMPARISON.json'),'utf8'));
  assert.equal(check.hostRepairedOrGeneratedGeometry,false);
  assert.equal(check.newModelCalls,1);
  assert.equal(check.qualitySuperiority,'NOT_ESTABLISHED');
  const pair=JSON.parse(fs.readFileSync(path.join(first.directory,
   'R190T_PAIR_EVIDENCE.json'),'utf8'));
  assert.equal(pair.status,'NO_FINAL_VOXEL_CHANGE');
  assert.equal(pair.genuineModelQualityImprovement,'NOT_ESTABLISHED');
  assert.equal(pair.files.length,3);
  assert.ok(fs.existsSync(path.join(first.directory,'R190T_VISUAL_COMPARE.html')));
  assert.equal(check.parentVoxelCritique.nearSolidHorizontalLayers.length,6);
  assert.notEqual(check.redesignPromptSha256,sha(STUDY_BRIEF));
  assert.equal(fs.readFileSync(path.join(src,'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),raw());
  // Simulate a saved R190-S result predating R190-T: independently
  // backfill missing physical evidence without a second model request.
  for(const name of pair.files)fs.rmSync(path.join(first.directory,name));
  fs.rmSync(path.join(first.directory,'R190T_PAIR_EVIDENCE.json'));
  const second=await runR190SStudy(['--from',src],{
   evidenceRoot:result,transport:'openai',
   fetcher:()=>{throw Error('NO_NETWORK_ALLOWED_AFTER_CAPTURE')}});
  assert.equal(second.reused,true);
  assert.equal(second.modelCalls,0);
  assert.equal(second.directory,first.directory);
  assert.equal(second.beforeAfterStatus,'NO_FINAL_VOXEL_CHANGE');
  assert.ok(fs.existsSync(path.join(first.directory,'R190T_VISUAL_COMPARE.html')));
  assert.equal(fs.readFileSync(path.join(src,
   'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),raw());
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('S: malformed new provider JSON saved as HOLD; cannot pass architecture',async()=>{
 const root=empty();
 try{
  const src=baseline(root);
  const one=await runR190SStudy(['--from',src],{
   evidenceRoot:path.join(root,'out'),transport:'openai',timestamp:()=>109,
   fetcher:fakeFetch('{"broken":true', {count:0})});
  assert.equal(one.status,'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW');
  assert.equal(one.errorCaptured,true);
  assert.equal(fs.existsSync(path.join(one.directory,'R190_H_REAL_B143_3D.html')),false);
  assert.equal(fs.readFileSync(path.join(one.directory,'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),
    '{"broken":true');
  assert.equal(one.worldWrites,0);
  const pair=JSON.parse(fs.readFileSync(path.join(one.directory,
   'R190T_PAIR_EVIDENCE.json'),'utf8'));
  assert.equal(pair.status,'CANDIDATE_B143_NOT_COMPARABLE');
  assert.deepEqual(pair.files,[]);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('S: explicit source option and native/local approval only',()=>{
 assert.deepEqual(parseR190SArgs([]),{from:null});
 assert.deepEqual(parseR190SArgs(['--from','X']),{from:'X'});
 assert.throws(()=>parseR190SArgs(['--from','X','--from','Y']),/INVALID_ARGUMENT/);
});

test('S: launcher refuses stale source missing real-voxel comparison',()=>{
 const cmd=fs.readFileSync(new URL('../RUN_R190S_REDESIGN.cmd',import.meta.url),'utf8');
 assert.match(cmd,/r190t-source-comparison\.mjs/);
 assert.match(cmd,/findstr \/C:"compareR190TSource"/);
 assert.match(cmd,/if errorlevel 1 goto :outdated/);
 assert.match(cmd,/Projects\\MinecraftAIBuilder/);
 assert.doesNotMatch(cmd,/git pull|git reset|git checkout|ollama pull/i);
});

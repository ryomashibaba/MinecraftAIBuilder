/** R190-W local two-stage research; ALL provider fixtures are fake. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {STUDY_BRIEF} from './r190n-one-click-research.mjs';
import {parseR190WArgs,inspectR190WPlan,buildR190WFirstPrompt,
 buildR190WGeometryPrompt,runR190WStudy} from './r190w-two-stage-study.mjs';
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldWrites:0,worldContacts:0});
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r190w-test-'));
const design=()=>({schema:'minecraftaibuilder-b143-building-dsl-v1',
 id:'synthetic-no-real-rooms',title:'FAKE geometry',brief:'NOT Qwen output',
 designOnly:true,bounds:{width:24,depth:24,height:14},elements:[
 {id:'solid',shape:'box',mode:'add',material:'stone',
  origin:[2,1,2],size:[20,8,20]}]});
const raw=()=>JSON.stringify({design:design(),explanation:'Synthetic invalid building',
 assumptions:[],spatialPlan:{designIntent:'fake',massStrategy:'solid',
 circulationStrategy:'claimed',entrance:[5,2,5],headroom:2,protectedVoids:[],
 destinations:[{id:'workshop',point:[7,2,7],maximumPathSteps:10}],
 functionalZones:[]}});
const plan=()=>JSON.stringify({schema:'minecraftaibuilder-r190w-model-plan-v1',
 architecturalThesis:'A public workshop embracing reuse of shore materials',
 massAndVoids:'Two real air-filled spaces around an asymmetric shared court',
 functionalSpaces:[
  {id:'gallery',purpose:'Public exhibition of reused materials',
   realVoid:'A walkable empty room with actual floor and headroom',
   access:'Approach from the exterior to the gallery entry'},
  {id:'workshop',purpose:'Repair space connected directly to the gallery',
   realVoid:'Interior air volume supports working and headroom',
   access:'Full width opening from the exhibition to the workshop'}
 ],circulation:'Visitors should traverse the gallery to workshop directly',
 roofAndEnvelope:'Actual sawtooth roof drains rain off each angled plane',
 unresolvedRisks:'Independent physical verification still required'});
function baseline(root){
 const directory=path.join(root,'old'),r=raw(),compiled=compileDesign(design());
 fs.mkdirSync(directory);
 fs.writeFileSync(path.join(directory,'R190_I_ORIGINAL_RESPONSE.txt'),r);
 fs.writeFileSync(path.join(directory,'R190_I_ORIGINAL_BRIEF.txt'),STUDY_BRIEF);
 fs.writeFileSync(path.join(directory,'R190_I_CAPTURE_RECEIPT.json'),JSON.stringify({
 schema:'minecraftaibuilder-r190-j-capture-v1',
 status:'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW',
 originalRawSha256:sha(r),originalRequestSha256:sha(STUDY_BRIEF),
 providerConfirmedComplete:true,modelRequested:'qwen3:14b',
 unapprovedGeometryEvidence:{sourceSha256:compiled.sourceSha256,
 geometrySha256:compiled.geometrySha256,trueB143Voxels:compiled.primitives.length},
 ...safe()}));
 fs.writeFileSync(path.join(directory,'R190R_ROUTE_COMPARISON.json'),JSON.stringify({
 schema:'minecraftaibuilder-r190r-direct-v1',
 directReviewStatus:'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW',
 originalDirectRawSha256:sha(r),frozenBriefSha256:sha(STUDY_BRIEF),
 modelRequested:'qwen3:14b',...safe()}));
 return directory;
}
const provider=(texts,calls)=>async(url,options)=>{
 assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
 assert.equal(options.method,'POST');
 const b=JSON.parse(options.body);
 assert.equal(b.model,'qwen3:14b');
 const index=calls.length;
 calls.push(b);
 return {ok:true,json:async()=>({choices:[{finish_reason:'stop',
  message:{content:texts[index]??'{}'}}]})};
};
test('W plan fields are program-only; no predetermined genre or coordinates',()=>{
 const p=inspectR190WPlan(plan());
 assert.equal(p.functionalSpaces.length,2);
 assert.doesNotMatch(buildR190WFirstPrompt('A genuine unique Japanese public building request with rooms'),/origin:\[/);
 assert.match(buildR190WGeometryPrompt('Japanese original request',p),/B143/);
 assert.throws(()=>inspectR190WPlan('{}'),/PLAN_CONTRACT/);
 assert.deepEqual(parseR190WArgs(['--fresh']),{from:null,fresh:true});
});
test('W one fake two-response attempt saves exact raw and does not certify quality',async()=>{
 const root=temp(),calls=[];
 try{
  const before=baseline(root),result=await runR190WStudy(['--from',before],{
   evidenceRoot:path.join(root,'new'),timestamp:()=>123,
   fetcher:provider([plan(),raw()],calls)});
  assert.equal(calls.length,2);
  assert.equal(result.modelCalls,2);
  assert.equal(result.status,'B143_COMPARABLE_ART_HOLD');
  assert.equal(result.beforeAfterStatus,'NO_FINAL_VOXEL_CHANGE');
  assert.equal(result.worldWrites,0);
  assert.equal(fs.readFileSync(path.join(result.directory,'R190W_PLAN_RAW.txt'),'utf8'),plan());
  assert.equal(fs.readFileSync(path.join(result.directory,'b143-model-original',
   'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),raw());
  const compare=JSON.parse(fs.readFileSync(path.join(result.directory,
   'R190W_PHYSICAL_COMPARISON.json'),'utf8'));
  assert.equal(compare.samePhysicalVoxels,true);
  assert.equal(compare.numericArchitecturalWinner,'NOT_ESTABLISHED');
  const summary=JSON.parse(fs.readFileSync(path.join(result.directory,
   'R190W_RESULT.json'),'utf8'));
  assert.equal(summary.hostGeneratedGeometry,false);
  assert.equal(summary.humanArtReview,'ART_HOLD');
  assert.equal(fs.readFileSync(path.join(before,'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),raw());
  const reused=await runR190WStudy(['--from',before],{
   evidenceRoot:path.join(root,'new'),
   fetcher:()=>{throw Error('REPEAT_MODEL_FORBIDDEN')}});
  assert.equal(reused.reused,true);
  assert.equal(reused.modelCalls,0);
  assert.equal(reused.directory,result.directory);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('W malformed plan is captured as HOLD and B143 is never requested',async()=>{
 const root=temp(),calls=[];
 try{
  const before=baseline(root),result=await runR190WStudy(['--from',before],{
   evidenceRoot:path.join(root,'new'),timestamp:()=>456,
   fetcher:provider(['{"incomplete":true}',raw()],calls)});
  assert.equal(calls.length,1);
  assert.equal(result.status,'HOLD_STAGE1_OR_PROVIDER');
  assert.equal(fs.readFileSync(path.join(result.directory,'R190W_PLAN_RAW.txt'),'utf8'),
   '{"incomplete":true}');
  assert.equal(fs.existsSync(path.join(result.directory,'b143-model-original')),false);
  assert.equal(result.worldContacts,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

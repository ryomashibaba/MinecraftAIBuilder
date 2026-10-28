/** Offline synthetic ONLY, never Qwen or Minecraft. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {STUDY_BRIEF} from './r190n-one-click-research.mjs';
import {inspectR190SOriginal,diagnoseR190SGeometry,
 buildR190SRedesignPrompt} from './r190s-evidence-redesign.mjs';
import {buildR190WFirstPrompt,buildR190WGeometryPrompt} from './r190w-two-stage-study.mjs';
import {compareR190TSource} from './r190t-source-comparison.mjs';
import {compareR190XSaved} from './r190x-saved-quality-compare.mjs';
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
const dir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r190x-test-'));
const put=(d,n,v)=>fs.writeFileSync(path.join(d,n),
 typeof v==='string'?v:JSON.stringify(v));
const design=(hollow=false)=>({schema:'minecraftaibuilder-b143-building-dsl-v1',
 id:hollow?'synthetic-hollow':'synthetic-solid',title:'Synthetic only',
 brief:'Fixture, never a real model reply',designOnly:true,
 bounds:{width:24,height:14,depth:24},elements:hollow?[
 {id:'floor',shape:'box',mode:'add',material:'stone',origin:[2,1,2],size:[20,1,20]},
 {id:'walls',shape:'box',mode:'add',material:'stone',origin:[2,2,2],size:[20,6,20],shell:1},
 {id:'roof',shape:'box',mode:'add',material:'metal',origin:[2,8,2],size:[20,1,20]},
 {id:'entry',shape:'box',mode:'cut',origin:[11,2,2],size:[2,3,1]}
 ]:[{id:'solid',shape:'box',mode:'add',material:'concrete',
 origin:[2,1,2],size:[20,8,20]}]});
const original=(hollow=false)=>JSON.stringify({design:design(hollow),explanation:'Fake fixture',
 assumptions:[],spatialPlan:{entrance:[12,2,3],headroom:2,functionalZones:[]}});
function bundle(root,{mutate=false}={}){
 const b=path.join(root,'baseline'),s=path.join(root,'r190s'),w=path.join(root,'r190w');
 const wOriginal=path.join(w,'b143-model-original');
 for(const p of [b,s,w,wOriginal])fs.mkdirSync(p);
 const bad=original(false),good=original(true),bDesign=design(false),gDesign=design(true);
 const cb=compileDesign(bDesign),cg=compileDesign(gDesign);
 put(b,'R190_I_ORIGINAL_RESPONSE.txt',bad);
 put(b,'R190_I_ORIGINAL_BRIEF.txt',STUDY_BRIEF);
 put(b,'R190_I_CAPTURE_RECEIPT.json',{schema:'minecraftaibuilder-r190-j-capture-v1',
  status:'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW',originalRawSha256:sha(bad),
  originalRequestSha256:sha(STUDY_BRIEF),providerConfirmedComplete:true,
  modelRequested:'qwen3:14b',rawProviderBytesPreserved:true,
  unapprovedGeometryEvidence:{sourceSha256:cb.sourceSha256,
  geometrySha256:cb.geometrySha256,trueB143Voxels:cb.primitives.length},...safety()});
 put(b,'R190R_ROUTE_COMPARISON.json',{schema:'minecraftaibuilder-r190r-direct-v1',
  directReviewStatus:'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW',
  originalDirectRawSha256:sha(bad),frozenBriefSha256:sha(STUDY_BRIEF),
  modelRequested:'qwen3:14b',...safety()});
 const baseline=inspectR190SOriginal(b);
 const negative=buildR190SRedesignPrompt(diagnoseR190SGeometry(baseline));
 put(s,'R190_I_ORIGINAL_RESPONSE.txt',good);
 put(s,'R190_I_ORIGINAL_BRIEF.txt',negative);
 put(s,'R190_I_CAPTURE_RECEIPT.json',{schema:'minecraftaibuilder-r190-j-capture-v1',
  status:'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW',originalRawSha256:sha(good),
  originalRequestSha256:sha(negative),providerConfirmedComplete:true,
  modelRequested:'qwen3:14b',rawProviderBytesPreserved:true,
  unapprovedGeometryEvidence:{sourceSha256:cg.sourceSha256,
  geometrySha256:cg.geometrySha256,trueB143Voxels:cg.primitives.length},...safety()});
 put(s,'R190S_COMPARISON.json',{schema:'minecraftaibuilder-r190s-redesign-v1',
  parentOriginalRawSha256:sha(bad),modelRequested:'qwen3:14b',
  redesignPromptSha256:sha(negative),redesignOriginalRawSha256:sha(good),
  newModelCalls:1,newModelStatus:'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW',
  hostRepairedOrGeneratedGeometry:false,parentOriginalUnmodified:true,...safety()});
 const plan={schema:'minecraftaibuilder-r190w-model-plan-v1',
  architecturalThesis:'Reclaimed shore material community workshop vision',
  massAndVoids:'Separate real exhibit and repair voids around covered court',
  functionalSpaces:[
   {id:'exhibit',purpose:'Exhibition of recycled coastal materials',
    realVoid:'Walkable fully hollow public space with a support floor',
    access:'The external door reaches exhibition via covered walkway'},
   {id:'repair',purpose:'Working repair area linked directly to exhibit',
    realVoid:'Usable clear internal volume for work and tools',
    access:'Two-wide passage between repair and exhibit zones'}
  ],circulation:'Visitors move from entry to exhibit then repair',
  roofAndEnvelope:'Rain-bearing sawtooth slopes linked to drainage',
  unresolvedRisks:'Exterior and actual walkability still require inspection'};
 const first=buildR190WFirstPrompt(negative);
 const second=buildR190WGeometryPrompt(negative,plan);
 const planRaw=JSON.stringify(plan);
 put(w,'R190W_PLAN_PROMPT.txt',first);put(w,'R190W_PLAN_RAW.txt',planRaw);
 put(w,'R190W_GEOMETRY_PROMPT.txt',second);
 put(wOriginal,'R190_I_ORIGINAL_RESPONSE.txt',good);
 put(wOriginal,'R190_I_ORIGINAL_BRIEF.txt',second);
 put(wOriginal,'R190_I_CAPTURE_RECEIPT.json',{schema:'minecraftaibuilder-r190-j-capture-v1',
  status:'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW',originalRawSha256:sha(good),
  originalRequestSha256:sha(second),providerConfirmedComplete:true,
  modelRequested:'qwen3:14b',rawProviderBytesPreserved:true,
  unapprovedGeometryEvidence:{sourceSha256:cg.sourceSha256,
  geometrySha256:cg.geometrySha256,trueB143Voxels:cg.primitives.length},...safety()});
 const c=compareR190TSource({beforeDesign:bDesign,afterDesign:gDesign,
  beforePlan:JSON.parse(bad).spatialPlan,afterPlan:JSON.parse(good).spatialPlan});
 put(w,'R190W_RESULT.json',{schema:'minecraftaibuilder-r190w-result-v1',
  status:'B143_COMPARABLE_ART_HOLD',parentRawSha256:sha(bad),
  modelRequested:'qwen3:14b',planningPromptSha256:sha(first),
  stage1RawSha256:sha(planRaw),stage1ProviderFinishReason:'stop',
  stage2PromptSha256:sha(second),stage2RawSha256:sha(good),
  hostGeneratedGeometry:false,modelCallsAttempted:2,
  beforeAfterStatus:c.status,...safety()});
 put(w,'R190W_PHYSICAL_COMPARISON.json',c);
 if(mutate)fs.appendFileSync(path.join(wOriginal,'R190_I_ORIGINAL_RESPONSE.txt'),'CORRUPTED');
 return {b,s,w};
}
test('X: saved source triptych measures identical W/S final voxels without crowning winner',()=>{
 const root=dir();
 try{
  const p=bundle(root),output=path.join(root,'output');
  const r=compareR190XSaved({from:p.b,s:p.s,w:p.w,out:output});
  assert.equal(r.status,'THREE_SAVED_B143_SOURCES_COMPARABLE_ART_HOLD');
  assert.equal(r.modelCalls,0);
  const m=JSON.parse(fs.readFileSync(path.join(output,'R190X_OFFLINE_COMPARE.json'),'utf8'));
  assert.equal(m.samePhysicalVoxels.SvsW,true);
  assert.equal(m.samePhysicalVoxels.baselineToS,false);
  assert.equal(m.winner,'NOT_ESTABLISHED');
  assert.equal(m.humanArtReview,'ART_HOLD');
  assert.equal(m.modelCalls,0);
  for(const file of ['R190X_VISUAL_REVIEW.html','BASELINE_3D.html',
    'R190S_3D.html','R190W_3D.html'])assert.ok(fs.statSync(path.join(output,file)).size>150);
  assert.throws(()=>compareR190XSaved({from:p.b,s:p.s,w:p.w,out:output}),
   /R190X_OUTPUT_ALREADY_EXISTS/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('X: corrupted W original is rejected without any model call or report',()=>{
 const root=dir();
 try{
  const p=bundle(root,{mutate:true}),output=path.join(root,'out');
  assert.throws(()=>compareR190XSaved({from:p.b,s:p.s,w:p.w,out:output}),
   /R190X_SOURCE_RECEIPT_OR_PROMPT/);
  assert.equal(fs.existsSync(output),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('X: missing one real source stays HOLD and never manufactures evidence',()=>{
 const root=dir();
 try{
  const p=bundle(root);
  const r=compareR190XSaved({from:p.b,s:p.s,w:null,
    out:path.join(root,'out')});
  // Default location is not available to synthetic tests, so reject missing.
  assert.equal(r.status,'HOLD_SAVED_REAL_MODEL_RESULTS_MISSING');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

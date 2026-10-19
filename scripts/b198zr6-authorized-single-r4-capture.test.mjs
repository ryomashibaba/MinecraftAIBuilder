/** R6 source-only tests use a local HTTP fixture, never a real Qwen model. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {runR6AuthorizedCapture,EXPLICIT_AUTHORIZATION,parseR6Args}
 from './b198zr6-authorized-single-r4-capture.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const fixture=()=>({
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',designOnly:true,
  id:'r6-fixture-pavilion',title:'R6 Mock Only Pavilion',
  brief:'Synthetic test fixture: not a Qwen output or approved building',
  bounds:{width:16,height:12,depth:16},elements:[
   {id:'base',shape:'box',mode:'add',material:'concrete',
    origin:[0,0,0],size:[16,1,16]},
   {id:'shell',shape:'box',mode:'add',material:'glass',
    origin:[1,1,1],size:[14,5,14],shell:1},
   {id:'clear-bottom',shape:'box',mode:'cut',origin:[2,1,2],size:[12,1,12]},
   {id:'skylight',shape:'box',mode:'cut',origin:[6,5,6],size:[4,1,4]},
   {id:'open-entrance',shape:'box',mode:'cut',origin:[6,1,1],size:[4,3,2]}
  ]},
 explanation:'A deterministic test double, not a genuine model response.',
 assumptions:['Independent human aesthetic review has not happened.'],
 spatialPlan:{
  designIntent:'A public multiuse covered courtyard for visitors.',
  massStrategy:'A small protective hollow pavilion with an opening above.',
  circulationStrategy:'The entry opens directly to an accessible public floor.',
  entrance:[7,1,2],headroom:2,
  protectedVoids:[{id:'courtyard',origin:[6,1,6],size:[4,4,4],maxOccupiedCells:0}],
  destinations:[{id:'rear-public-zone',point:[8,1,10],maximumPathSteps:25}],
  functionalZones:[{id:'usable-interior',origin:[3,1,3],size:[10,1,10],
   minimumReachablePositions:90,minimumReachablePercent:90}]
 }
});
const mk=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198zr6-ci-'));
async function serverWith(content,reason='stop',tags=['R6_CI_FAKE_PROVIDER']){
 let count=0,captured=null,tagsChecks=0;
 const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/api/tags'){
   tagsChecks++;
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({models:tags.map(name=>({name}))}));
   return;
  }
  if(req.method!=='POST'||req.url!=='/api/chat'){
   res.writeHead(404);res.end();return;
  }
  count++;let data='';for await(const part of req)data+=String(part);
  captured=JSON.parse(data);
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({done:true,done_reason:reason,
   message:{content},total_duration:3100000000,eval_count:100,
   eval_duration:2000000000}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {port:server.address().port,get count(){return count},
  get tagsChecks(){return tagsChecks},
  get payload(){return captured},
  close:()=>new Promise(resolve=>server.close(resolve))};
}
const cfg=(root,srv)=>({
 authorization:EXPLICIT_AUTHORIZATION,model:'R6_CI_FAKE_PROVIDER',
 outDir:path.join(root,'single'),port:srv.port,timeoutSeconds:60
});
test('R6 refuses absent explicit authorization BEFORE any folder or model contact',async()=>{
 const root=mk();const output=path.join(root,'unauthorized');
 try{
  await assert.rejects(runR6AuthorizedCapture({
   authorization:'',model:'qwen3.8:27b',outDir:output}),
   /NO_EXPLICIT_AUTHORIZATION/);
  assert.equal(fs.existsSync(output),false);
  assert.throws(()=>parseR6Args(['--model','qwen3.8:27b','--out',output]),
   /EXPLICIT_AUTHORIZATION_MODEL_AND_OUT_REQUIRED/);
  assert.throws(()=>parseR6Args([
   '--model','qwen3.8:27b','--out',output,'--authorize-one',EXPLICIT_AUTHORIZATION,
   '--source-tokens','4096','--context-tokens','4096']),/MODEL_BUDGET/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R6 native single request preserves four-key original byte for byte and independently checks actual voxels',async()=>{
 const root=mk();const raw=JSON.stringify(fixture(),null,2)+'\n';
 const srv=await serverWith(raw);
 try{
  const report=await runR6AuthorizedCapture(cfg(root,srv));
  assert.equal(srv.count,1);
  assert.equal(srv.tagsChecks,1);
  assert.equal(report.readOnlyPreflight.status,'EXACT_MODEL_LISTED');
  assert.equal(report.readOnlyPreflight.inferenceRequests,0);
  assert.equal(srv.payload.think,false);
  assert.equal(srv.payload.format,'json');
  assert.equal(srv.payload.stream,false);
  assert.equal(srv.payload.model,'R6_CI_FAKE_PROVIDER');
  assert.match(srv.payload.messages[0].content,/spatialPlan/);
  assert.equal(report.originalSaved,true);
  assert.equal(report.originalRawSha256,sha(raw));
  assert.equal(fs.readFileSync(path.join(root,'single','R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt'),'utf8'),raw);
  const receipt=JSON.parse(fs.readFileSync(
   path.join(root,'single','R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json'),'utf8'));
  assert.equal(receipt.rawSha256,sha(raw));
  assert.equal(receipt.modelId,'R6_CI_FAKE_PROVIDER');
  assert.equal(receipt.modelRequestsClaimed,1);
  assert.equal(report.status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
  assert.equal(report.visualReviewStatus,'WAITING_FOR_HUMAN_VISUAL_AND_SEMANTIC_REVIEW');
  const reviewFolder=path.join(root,'single');
  const viewer=fs.readFileSync(path.join(reviewFolder,'index.html'),'utf8');
  assert(viewer.includes('R7 MODEL CANDIDATE'));
  assert(viewer.includes('minecraftaibuilder-b143-gallery-v1'));
  assert(!viewer.includes('fetch('));
  assert(!viewer.includes('ChatGPTが設計した新規建築'));
  const dossier=JSON.parse(fs.readFileSync(
   path.join(reviewFolder,'B198W_SOURCE_QUALITY_EVIDENCE.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(
   path.join(reviewFolder,'R7_VISUAL_REVIEW_MANIFEST.json'),'utf8'));
  assert.equal(manifest.sourceSha256,report.sourceSha256);
  assert.equal(dossier.independentlyCompiled.sourceSha256,report.sourceSha256);
  assert.equal(manifest.automaticAestheticQualityCertification,false);
  assert(fs.readFileSync(path.join(reviewFolder,'B198W_REVIEW_BOARD.html'),'utf8')
   .includes('B198W'));
  assert.equal(report.modelDeclaredSpatialReview.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
  assert.equal(report.modelGeneralizationCertified,false);
  assert.equal(report.modelAuthorshipIndependentlyAuthenticated,false);
  assert.equal(report.safety.readiness,'NOT_PREPARED');
  assert.equal(report.safety.gates.filter(x=>x==='BLOCKED').length,9);
  assert.deepEqual(report.safety.BuildPlan.operations,[]);
  assert.equal(report.worldWrites,0);
  await assert.rejects(runR6AuthorizedCapture(cfg(root,srv)),/NEW_OUTPUT_FOLDER_REQUIRED/);
  assert.equal(srv.count,1);
 }finally{await srv.close();fs.rmSync(root,{recursive:true,force:true})}
});
test('R6 saves bad three-key model raw and reports HOLD rather than replaying the provider',async()=>{
 const root=mk();const x=fixture();delete x.spatialPlan;
 const raw=JSON.stringify(x);const srv=await serverWith(raw);
 try{
  const report=await runR6AuthorizedCapture(cfg(root,srv));
  assert.equal(srv.count,1);assert.equal(report.originalSaved,true);
  assert.equal(report.status,'HOLD_MODEL_TRANSPORT_OR_SOURCE_REVIEW');
  assert.equal(report.reasonCode,'B198ZR4_EXPECTED_FOUR_KEYS');
  assert.equal(report.originalRawSha256,sha(raw));
  assert.equal(report.elementCount,5);
  assert.equal(report.sourcePreviewSalvagedFromUnacceptedR4Envelope,true);
  assert.equal(report.visualReviewStatus,'WAITING_FOR_HUMAN_VISUAL_AND_SEMANTIC_REVIEW');
  assert(fs.existsSync(path.join(root,'single','index.html')));
  assert.equal(report.worldWrites,0);
 }finally{await srv.close();fs.rmSync(root,{recursive:true,force:true})}
});
test('R6 records truncated reply without any automatic retry or success claim',async()=>{
 const root=mk();const raw='{"design":{';
 const srv=await serverWith(raw,'length');
 try{
  const report=await runR6AuthorizedCapture(cfg(root,srv));
  assert.equal(srv.count,1);
  assert.equal(report.originalSaved,true);
  assert.equal(report.status,'HOLD_MODEL_TRANSPORT_OR_SOURCE_REVIEW');
  assert.equal(report.reasonCode,'B198G_LOCAL_TRUNCATED_MODEL_RESPONSE');
  assert.equal(report.originalRawSha256,sha(raw));
  assert.equal(report.geometrySha256,null);
  assert.equal(report.safety.worldWrites,0);
 }finally{await srv.close();fs.rmSync(root,{recursive:true,force:true})}
});
test('R6 rejects model-declared occupied protected void but preserves source receipt',async()=>{
 const root=mk();const x=fixture();
 x.design.elements.push({id:'later-fill',shape:'box',mode:'add',
  material:'metal',origin:[6,1,6],size:[4,4,4]});
 const raw=JSON.stringify(x);const srv=await serverWith(raw);
 try{
  const report=await runR6AuthorizedCapture(cfg(root,srv));
  assert.equal(srv.count,1);
  assert.equal(report.status,'HOLD_SPATIAL_PLAN_OR_INDEPENDENT_CONTRACT');
  assert.equal(report.visualReviewStatus,'WAITING_FOR_HUMAN_VISUAL_AND_SEMANTIC_REVIEW',
   'bad declared intent remains inspectable when strict geometry still compiles');
  assert(fs.existsSync(path.join(root,'single','index.html')));
  assert.equal(report.modelDeclaredSpatialReview.results.protectedVoids[0].passed,false);
  assert.equal(report.originalSaved,true);
  assert.equal(report.originalRawSha256,sha(raw));
  assert.equal(report.safety.constructionApproved,false);
 }finally{await srv.close();fs.rmSync(root,{recursive:true,force:true})}
});

test('R8 preflight stops non-installed model before any heavy POST; evidence HOLD is still saved',async()=>{
 const root=mk();const srv=await serverWith(JSON.stringify(fixture()),'stop',[]);
 try{
  const result=await runR6AuthorizedCapture(cfg(root,srv));
  assert.equal(srv.tagsChecks,1);
  assert.equal(srv.count,0);
  assert.equal(result.originalSaved,false);
  assert.equal(result.requestedSingleCall,false);
  assert.equal(result.readOnlyPreflight.status,'HOLD_EXACT_MODEL_MISSING');
  assert.equal(result.reasonCode,'B198ZR6_PRECHECK_HOLD_EXACT_MODEL_MISSING');
  assert.equal(result.status,'HOLD_MODEL_TRANSPORT_OR_SOURCE_REVIEW');
  assert.equal(fs.existsSync(path.join(root,'single','R6_SINGLE_CAPTURE_RESULT.json')),true);
  assert.equal(result.safety.worldWrites,0);
 }finally{await srv.close();fs.rmSync(root,{recursive:true,force:true})}
});

test('R8 malformed R4 spatial claim does not destroy compiled design or falsely mark plan valid',async()=>{
 const root=mk(),x=fixture();
 x.spatialPlan.entrance=[99,3,99];
 const raw=JSON.stringify(x),srv=await serverWith(raw);
 try{
  const result=await runR6AuthorizedCapture(cfg(root,srv));
  assert.equal(srv.count,1);
  assert.equal(result.status,'HOLD_MODEL_TRANSPORT_OR_SOURCE_REVIEW');
  assert.equal(result.originalRawSha256,sha(raw));
  assert.equal(result.sourcePreviewSalvagedFromUnacceptedR4Envelope,true);
  assert.equal(result.salvagedGeometryCannotCountAsAcceptedR4Plan,true);
  assert(result.sourceSha256);
  assert.equal(result.visualReviewStatus,'WAITING_FOR_HUMAN_VISUAL_AND_SEMANTIC_REVIEW');
  assert.equal(result.safety.constructionApproved,false);
  assert(fs.existsSync(path.join(root,'single','B198W_REVIEW_BOARD.html')));
 }finally{await srv.close();fs.rmSync(root,{recursive:true,force:true})}
});

/** R190 E1 second model-authored attempt: strict offline fake-model tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {reviseR190E1Study} from './r190-e1-revise-study.mjs';
import {runR190FreeEngine,R190_E1_STUDY_BRIEFS}
 from './r125-r190-free-engine.mjs';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
import {compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
function fixture(root){
 const previous=path.join(root,'old');fs.mkdirSync(previous);
 const rows=[];
 for(const item of R190_E1_STUDY_BRIEFS){
  const model=path.join(previous,item.id,'model');
  fs.mkdirSync(model,{recursive:true});
  const data=structuredClone(R190_STATIC_SYNTHETIC_CASES[0]);
  data.id='r190-e1-'+item.id;data.spaces[1].depth=6;
  const original=JSON.stringify(data);
  fs.writeFileSync(path.join(model,'MODEL_RESPONSE_ORIGINAL.txt'),original);
  rows.push({id:item.id,status:'HOLD_OR_INCOMPLETE_SOURCE',
   sourceCompiled:false,modelRequests:1,reason:'R190_SEMANTIC_SPACE',
   originalResponseSha256:sha(original),
   validationIssues:[{rule:'SPACE_DIMENSION',where:'spaces[1].depth',actual:6,
    expected:'integer 7..22'}],output:path.join(previous,item.id)});
 }
 fs.writeFileSync(path.join(previous,'E1_STUDY_REPORT.json'),JSON.stringify({
  schema:'r190-e1-three-use-source-comparison-v1',
  provenance:'SYNTHETIC_TEST_DOUBLE_NOT_REAL_MODEL',
  studyMode:'MASSING_ONLY_WINDOWS_DEFERRED',model:'qwen3:14b',
  requestedUseCount:3,realModelRequests:0,sourceCompiledCount:0,rows
 }));
 return previous;
}
test('E1 locked revision sends original with actionable reasons exactly once per failed use',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190-revision-'));
 try{
  const previous=fixture(root);
  const baseline=fs.readFileSync(path.join(previous,'E1_STUDY_REPORT.json'));
  let requests=0;
  const out=await reviseR190E1Study({previousDir:previous},{
   single:async args=>{
    requests++;
    assert.equal(args.massingOnly,true);
    assert.equal(args.revisionContext.reason,'R190_SEMANTIC_SPACE');
    assert.equal(sha(args.revisionContext.priorOriginal),args.revisionContext.priorSha256);
    assert(R190_E1_STUDY_BRIEFS.some(item=>item.brief===args.prompt));
    assert.equal(args.model,'qwen3:14b');
    return {status:'HOLD',reason:'MODEL_REVISED_STILL_INVALID',
     modelRequests:1,worldWrites:0};
   }
  });
  assert.equal(requests,3);
  assert.equal(out.sourceCompiledCount,0);
  assert.equal(out.status,'TEST_DOUBLE_ONLY');
  assert.equal(out.modelRequestsInRevision,0);
  assert.equal(out.attemptedSecondCalls,3);
  assert.equal(out.worldWrites,0);
  assert.equal(out.makecode,'NOT_GENERATED');
  assert.deepEqual(out.rows.map(x=>x.attemptNumber),[2,2,2]);
  assert.deepEqual(fs.readFileSync(path.join(previous,'E1_STUDY_REPORT.json')),baseline);
  assert(fs.existsSync(path.join(out.dir,'E1_REVISION_REPORT.json')));
  assert(fs.readFileSync(path.join(out.dir,'E1_REVISION_REVIEW.html'),'utf8').includes('SOURCE HOLD'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('E1 revision rejects changed original before any extra model request',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190-revision-tamper-'));
 try{
  const prev=fixture(root);
  fs.appendFileSync(path.join(prev,'flower-shop','model','MODEL_RESPONSE_ORIGINAL.txt'),' ');
  let calls=0;
  await assert.rejects(reviseR190E1Study({previousDir:prev},{
   single:async()=>{calls++;return {};}
  }),/ORIGINAL_SHA_MISMATCH/);
  assert.equal(calls,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('E1 saved revision records true compiled B143 but never grants ART or Minecraft',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190-revision-positive-'));
 try{
  const prev=fixture(root);
  let n=0;
  const result=await reviseR190E1Study({previousDir:prev},{
   single:async({outDir})=>{
    n++;
    if(n>1)return {status:'HOLD',reason:'NO_SOURCE',modelRequests:1,worldWrites:0};
    const modelDir=path.join(outDir,'model');
    fs.mkdirSync(modelDir,{recursive:true});
    const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[0]);
    p.id='r190-revised-model-architecture';
    const built=compileR190SemanticPlan(p);
    assert(verifyCompiled(built.design,built.compiled));
    const original=JSON.stringify(p);
    fs.writeFileSync(path.join(modelDir,'MODEL_RESPONSE_ORIGINAL.txt'),original);
    fs.writeFileSync(path.join(modelDir,'ARCHITECTURE_PLAN.json'),JSON.stringify(p));
    fs.writeFileSync(path.join(modelDir,'B143_SOURCE.json'),JSON.stringify(built.design));
    fs.writeFileSync(path.join(modelDir,'B143_SCENE.json'),JSON.stringify(built.compiled));
    return {status:'SOURCE_MASSING_ART_HOLD',modelRequests:1,worldWrites:0,
     originalResponseSha256:sha(original),sourceSha256:built.compiled.sourceSha256,
     geometrySha256:built.compiled.geometrySha256,windows:'DEFERRED',makecode:'NOT_GENERATED'};
   }
  });
  assert.equal(n,3);
  assert.equal(result.status,'TEST_DOUBLE_ONLY');
  assert.equal(result.sourceCompiledCount,1);
  assert(result.rows[0].features.roomCount>=2);
  assert.equal(result.rows[0].status,'SOURCE_READY_ART_HOLD');
  assert.equal(result.humanArt,'NOT_REVIEWED');
  assert.equal(result.minecraftWalking,'NOT_TESTED');
  assert.equal(result.worldWrites,0);
  assert.equal(result.constructionApproved,false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('E1 engine rejects fabricated revision lineage before model/network or filesystem output',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r190-revision-invalid-'));
 try{
  const outDir=path.join(tmp,'out');
  await assert.rejects(runR190FreeEngine({
   prompt:'Design a new expressive house',
   model:'qwen3:14b',outDir,
   paletteFile:path.join(tmp,'missing.json'),
   massingOnly:true,revisionContext:{
    priorOriginal:'{"schema":"fake"}',priorSha256:'0'.repeat(64),
    reason:'R190_SEMANTIC_SPACE',issues:[]}
  }),/REVISION_SOURCE_INVALID/);
  assert.equal(fs.existsSync(outDir),false);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

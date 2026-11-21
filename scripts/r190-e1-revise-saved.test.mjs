import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runR190E1ReviseSaved} from './r190-e1-revise-saved.mjs';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
function valid(){
 const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[0]);
 p.site={width:52,depth:52,height:14};
 p.materials={floor:'stone',wall:'wood',roof:'wood'};
 return p;
}
function savedOriginal(root,{wrongHash=false}={}){
 const parent=path.join(root,'E1-two-stage-old');
 fs.mkdirSync(parent);
 const rows=[];
 for(const id of ['modern-home','flower-shop','research-lab']){
  const folder=path.join(parent,id);fs.mkdirSync(folder);
  const p=valid();p.spaces[1].height=6;
  const raw=JSON.stringify(p);
  fs.writeFileSync(path.join(folder,'STAGE_A_ORIGINAL.txt'),raw);
  rows.push({id,reason:'R190_SEMANTIC_SPACE',
   stageAOriginalSha256:wrongHash&&id==='modern-home'?'bad':sha(raw)});
 }
 fs.writeFileSync(path.join(parent,'E1_TWO_STAGE_REPORT.json'),JSON.stringify({
  schema:'r190-e1-two-stage-comparison-v1',status:'SOURCE_INCOMPLETE_HOLD',
  realModelRequests:3,rows}));
 return parent;
}
test('Explicit revision: 3 preserved A originals, 3 new model revisions, 3 model window selections, genuine B143 source with no real requests',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e1-revise-pass-'));
 try{
  const source=savedOriginal(root);let calls=0;
  const response=await runR190E1ReviseSaved({savedRunDir:source,outRoot:root,maxWindowSlots:8},{
   request:async({stage,slots,onAttempt})=>{
    onAttempt();calls++;
    if(stage==='A_REVISION')return {raw:JSON.stringify(valid())};
    assert.equal(stage,'B_CHOICE');
    return {raw:JSON.stringify({selectedWindowSlotIds:[slots[0].slotId]})};
   }});
  assert.equal(response.status,'TEST_DOUBLE_ONLY');
  assert.equal(response.realModelRequests,0);
  assert.equal(response.syntheticStageCalls,6);
  assert.equal(response.sourceCompiledCount,3);
  assert.equal(calls,6);
  assert.equal(response.worldWrites,0);
  for(const row of response.rows){
   assert(row.originalShaVerified&&row.sourceCompiled&&row.modelWindowSelected);
   const d=path.join(response.dir,row.id);
   assert(fs.existsSync(path.join(d,'REVISION_MODEL_ORIGINAL.txt')));
   assert(fs.existsSync(path.join(d,'WINDOW_CHOICE_MODEL_ORIGINAL.txt')));
   assert(fs.existsSync(path.join(d,'compiled','model','B143_SCENE.json')));
   assert(!fs.existsSync(path.join(source,row.id,'WINDOW_CHOICE_MODEL_ORIGINAL.txt')));
   assert.equal(fs.readdirSync(path.join(source,row.id)).length,1);
  }
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});
test('Explicit revision refuses a mismatched original SHA without a hidden repair call',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e1-revise-sha-'));
 try{
  const source=savedOriginal(root,{wrongHash:true});let count=0;
  const result=await runR190E1ReviseSaved({savedRunDir:source,outRoot:root,maxWindowSlots:8},{
   request:async({stage,slots,onAttempt})=>{
    onAttempt();count++;
    return {raw:stage==='A_REVISION'?JSON.stringify(valid()):
     JSON.stringify({selectedWindowSlotIds:[slots[0].slotId]})};
   }});
  assert.equal(result.rows[0].reason,'E1_REVISION_ORIGINAL_HASH_MISMATCH');
  assert.equal(result.rows[0].revisionOriginalSha256,null);
  assert.equal(result.sourceCompiledCount,2);
  assert.equal(count,4);
  assert.equal(result.realModelRequests,0);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});
test('Explicit revision rejects unsound new authoring; no model window choice request',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e1-revise-hold-'));
 try{
  const source=savedOriginal(root);let calls=0;
  const result=await runR190E1ReviseSaved({savedRunDir:source,outRoot:root,maxWindowSlots:8},{
   request:async({stage,onAttempt})=>{
    assert.equal(stage,'A_REVISION');onAttempt();calls++;
    const plan=valid();plan.spaces[2].height=6;
    return {raw:JSON.stringify(plan)};
   }});
  assert.equal(calls,3);
  assert.equal(result.sourceCompiledCount,0);
  assert(result.rows.every(x=>x.reason==='R190_SEMANTIC_SPACE'&&
   x.validationIssues?.some(y=>y.rule==='SPACE_HEIGHT')));
  assert.equal(result.worldWrites,0);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});

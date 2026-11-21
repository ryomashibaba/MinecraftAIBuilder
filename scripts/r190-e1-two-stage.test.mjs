import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runR190E1TwoStageStudy} from './r190-e1-two-stage.mjs';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';

function fakePlan(){
 const plan=structuredClone(R190_STATIC_SYNTHETIC_CASES[0]);
 plan.site={width:52,depth:52,height:14};
 plan.materials={floor:'stone',wall:'stone',roof:'wood'};
 return plan;
}
test('Two-stage synthetic architecture is fully source-compiled from explicit model-selected certified window',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'e1-two-stage-good-'));
 let count=0;
 try{
  const result=await runR190E1TwoStageStudy({outRoot:temp,maxWindowSlots:8},{
   request:async({stage,slots,onAttempt})=>{
    onAttempt();count++;
    if(stage==='A')return {raw:JSON.stringify(fakePlan())};
    assert.equal(stage,'B');
    assert(slots.length>=1);
    return {raw:JSON.stringify({selectedWindowSlotIds:[slots[0].slotId]})};
   }});
  assert.equal(result.provenance,'TEST_DOUBLE_ONLY');
  assert.equal(result.realModelRequests,0);
  assert.equal(result.syntheticStageCalls,count);
  assert.equal(result.worldWrites,0);
  assert.equal(result.sourceCompiledCount,3);
  assert.equal(result.rows.length,3);
  assert(result.rows.every(row=>row.sourceCompiled&&row.modelSelectionAuthored));
  for(const row of result.rows){
   const target=path.join(result.dir,row.id);
   const orig=fs.readFileSync(path.join(target,'STAGE_A_ORIGINAL.txt'),'utf8');
   const selection=JSON.parse(fs.readFileSync(path.join(target,'STAGE_B_ORIGINAL.txt'),'utf8'));
   const chosen=JSON.parse(fs.readFileSync(path.join(target,'EXPLICITLY_COMPOSED_PLAN.json'),'utf8'));
   const cat=JSON.parse(fs.readFileSync(path.join(target,'WINDOW_CATALOG.json'),'utf8'));
   assert(cat.sourceChecked&&cat.slots.length>=1);
   assert(!Object.hasOwn(JSON.parse(orig),'glazedOpenings'));
   assert.equal(chosen.glazedOpenings.length,1);
   assert(cat.slots.some(c=>c.slotId===selection.selectedWindowSlotIds[0]));
   assert(fs.existsSync(path.join(target,'compiled','model','B143_SCENE.json')));
   assert(fs.existsSync(path.join(target,'compiled','model','index.html')));
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Two-stage model choice not in certified slots fails closed; preserve A/B originals',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'e1-two-stage-no-slot-'));
 try{
  const result=await runR190E1TwoStageStudy({outRoot:temp,maxWindowSlots:8},{
   request:async({stage,onAttempt})=>{
    onAttempt();
    return {raw:stage==='A'?JSON.stringify(fakePlan()):
     JSON.stringify({selectedWindowSlotIds:['NOT-IN-CATALOG']})};
   }});
  assert.equal(result.sourceCompiledCount,0);
  assert.equal(result.realModelRequests,0);
  assert(result.rows.every(r=>r.reason==='E1_TWO_STAGE_WINDOW_NOT_CERTIFIED'&&
   !r.sourceCompiled&&!r.modelSelectionAuthored));
  for(const row of result.rows){
   const target=path.join(result.dir,row.id);
   assert(fs.existsSync(path.join(target,'STAGE_A_ORIGINAL.txt')));
   assert(fs.existsSync(path.join(target,'STAGE_B_ORIGINAL.txt')));
   assert(!fs.existsSync(path.join(target,'EXPLICITLY_COMPOSED_PLAN.json')));
   assert(!fs.existsSync(path.join(target,'compiled')));
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Stage-A invalid authored spaces stop before stage-B; no hidden retry or repair',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'e1-two-stage-bad-shape-'));
 let calls=0;
 try{
  const result=await runR190E1TwoStageStudy({outRoot:temp,maxWindowSlots:8},{
   request:async({stage,onAttempt})=>{
    onAttempt();calls++;
    assert.equal(stage,'A');
    const p=fakePlan();p.spaces[2].depth=6;
    return {raw:JSON.stringify(p)};
   }});
  assert.equal(calls,3);
  assert.equal(result.sourceCompiledCount,0);
  assert(result.rows.every(r=>r.reason==='R190_SEMANTIC_SPACE'&&
   r.validationIssues.some(i=>i.rule==='SPACE_DIMENSION')));
  assert.equal(result.worldWrites,0);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

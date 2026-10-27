/** R190-H: mock provider only; no genuine Qwen/Gemma run in CI. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseR190Arguments,runR190Local} from './r190-local-semantic-run.mjs';
const fixture=()=>({
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',designOnly:true,
  id:'r190-h-mock-building',title:'Synthetic open circulation building',
  brief:'Synthetic B143 source fixture, not independent model creativity.',
  bounds:{width:16,height:12,depth:16},elements:[
   {id:'base',shape:'box',mode:'add',material:'concrete',origin:[0,0,0],size:[16,1,16]},
   {id:'shell',shape:'box',mode:'add',material:'glass',origin:[1,1,1],size:[14,5,14],shell:1},
   {id:'floor-clearance',shape:'box',mode:'cut',origin:[2,1,2],size:[12,1,12]},
   {id:'real-skylight',shape:'box',mode:'cut',origin:[6,5,6],size:[4,1,4]},
   {id:'real-entrance',shape:'box',mode:'cut',origin:[6,1,1],size:[4,3,2]}
  ]},
 explanation:'Mock data: design, space plan and actual voxels are reviewed.',
 assumptions:['The site is flat.'],
 spatialPlan:{
  designIntent:'A community interior organized around an open center.',
  massStrategy:'The exterior perimeter encloses connected usable space.',
  circulationStrategy:'Ground-level access connects a public inner court.',
  entrance:[7,1,2],headroom:2,
  protectedVoids:[{id:'court',origin:[6,1,6],size:[4,4,4],maxOccupiedCells:0}],
  destinations:[{id:'inner',point:[8,1,10],maximumPathSteps:25}],
  functionalZones:[{id:'public',origin:[3,1,3],size:[10,1,10],
   minimumReachablePositions:90,minimumReachablePercent:90}]
 }
});
const sampleArgs=out=>['--model','mock-qwen','--prompt',
 '未知用途に対応する公共建築をモデル自身が設計してください',
 '--out',out,'--mode','architectural-b143'];
test('H chooses expressive B143 path without pretending old semantic capability coverage',()=>{
 const a=parseR190Arguments(sampleArgs('./review'));
 assert.equal(a.mode,'architectural-b143');
 assert.equal(parseR190Arguments(sampleArgs('./review').slice(0,-2)).mode,'semantic');
 assert.throws(()=>parseR190Arguments([...sampleArgs('./review'),
  '--expect','spec.json']),/CANNOT_CERTIFY/);
 assert.throws(()=>parseR190Arguments([...sampleArgs('./review'),
  '--required','multiple-levels']),/CANNOT_CERTIFY/);
 assert.throws(()=>parseR190Arguments([...sampleArgs('./review'),
  '--mode','bad']),/R190_F_FLAG|R190_H_INVALID_MODE/);
});
test('H one mocked local provider response produces unchanged model B143 and actual compiled 3D, no approval',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190h-source-'));
 const out=path.join(root,'architecture');
 let calls=0;
 try{
  const options=parseR190Arguments(sampleArgs(out));
  const receipt=await runR190Local(options,{fetcher:async(url,req)=>{
   calls++;
   assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
   const packet=JSON.parse(req.body);
   assert.equal(packet.model,'mock-qwen');
   assert.equal(packet.messages[1].role,'user');
   assert.match(packet.messages[0].content,/spatialPlan/);
   return {ok:true,json:async()=>({choices:[{
    finish_reason:'stop',message:{content:JSON.stringify(fixture())}
   }]})};
  }});
  assert.equal(calls,1);
  assert.equal(receipt.status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
  assert.equal(receipt.originalRequestCoverage,'NOT_INDEPENDENTLY_CERTIFIED');
  assert.equal(receipt.independentAcceptanceReview,'NOT_SUPPLIED');
  assert.equal(receipt.modelIdentityCryptographicallyVerified,false);
  assert.equal(receipt.hostFilledGeometry,false);
  assert.equal(receipt.humanArtReview,'ART_HOLD');
  assert.equal(receipt.minecraftWalking,'NOT_TESTED');
  assert.equal(receipt.readiness,'NOT_PREPARED');
  assert.equal(receipt.constructionApproved,false);
  assert.equal(receipt.executionAllowed,false);
  assert.deepEqual(receipt.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(receipt.BuildPlan.operations,[]);
  assert.equal(receipt.worldWrites,0);assert.equal(receipt.worldContacts,0);
  const original=JSON.parse(fs.readFileSync(path.join(out,'R190_H_MODEL_DESIGNED_B143.json'),'utf8'));
  assert.deepEqual(original,fixture().design);
  assert.equal(receipt.trueB143Voxels>100,true);
  assert.ok(fs.readFileSync(path.join(out,'R190_H_REAL_B143_3D.html'),'utf8').includes('r190-h-mock-building'));
  for(const side of ['front','rear','west','east','roof']){
   const svg=fs.readFileSync(path.join(out,'R190_H_'+side+'.svg'),'utf8');
   assert.match(svg,/svg/);
  }
  await assert.rejects(()=>runR190Local(options,{fetcher:async()=>{throw Error('must not request');}}),
   /REFUSE_EXISTING_OUTPUT/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('H rejects transport errors without writing any 3D or pretending a model run',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190h-rejected-'));
 const out=path.join(root,'candidate');
 try{
  await assert.rejects(()=>runR190Local(parseR190Arguments(sampleArgs(out)),{
   fetcher:async()=>({ok:false,status:503})}),/LOCAL_HTTP_503/);
  assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

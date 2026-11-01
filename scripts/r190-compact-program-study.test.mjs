import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runR190CompactThreeUse,replayR190CompactSaved,R190_COMPACT_SYSTEM}
 from './r190-compact-program-study.mjs';
import {R190_COMPACT_SCHEMA} from '../source/ai/r190-compact-program.mjs';
function program(id,form){
 return {schema:R190_COMPACT_SCHEMA,id:'r190-compact-'+id,
  title:'Original independent architecture',
  brief:'Original building program authored by a synthetic fixture',
  entranceFace:'south',materials:{floor:'wood',wall:'stone',roof:'wood'},
  spaces:[
   {id:'entry',purpose:'Public arrival and welcome',size:'balanced',proportion:'wide',
    height:'medium',parentId:null,preferredSide:null,privacy:'public',form:'plain'},
   {id:'main-room',purpose:'Primary area for main work',size:'generous',proportion:'long',
    height:'high',parentId:'entry',preferredSide:'north',privacy:'shared',form},
   {id:'private-room',purpose:'Quiet private functional zone',size:'compact',
    proportion:'square',height:'low',parentId:'entry',preferredSide:'east',
    privacy:'private',form:'plain'}
  ]};
}
test('R190 compact one-request study: 3 independent model programs, real voxels, no construction',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190-compact-study-'));
 let calls=0;
 try{
  const result=await runR190CompactThreeUse({outRoot:root},{
   request:async({system,user,onAttempt,onRaw})=>{
    assert(system.includes(R190_COMPACT_SCHEMA));
    assert(!system.includes('MakeCode'));
    assert(user.includes('日本語の依頼'));
    onAttempt();calls++;
    const response=JSON.stringify(program(['house','store','laboratory'][calls-1],
     ['ridge','sky-court','facet'][calls-1]));
    onRaw(response);
    return {raw:response};
   }
  });
  assert.equal(calls,3);
  assert.equal(result.modelRequests,0);
  assert.equal(result.attemptedModelCalls,3);
  assert.equal(result.provenance,'SYNTHETIC_TEST_DOUBLE_NOT_REAL_MODEL');
  assert.equal(result.sourceCompiledCount,3);
  assert.equal(result.distinctGeometryHashCount,3);
  assert.equal(result.worldWrites,0);
  assert.equal(result.makecode,'NOT_GENERATED');
  assert.equal(result.art,'NOT_REVIEWED');
  assert(result.rows.every(x=>x.sourceCompiled&&x.features.occupiedVoxelCount>100));
  for(const r of result.rows){
   assert(fs.existsSync(path.join(r.output,'model','index.html')));
   assert(fs.existsSync(path.join(r.output,'model','MODEL_RESPONSE_ORIGINAL.txt')));
   assert(fs.existsSync(path.join(r.output,'model','HOST_RESOLUTION.json')));
   assert(!fs.existsSync(path.join(r.output,'makecode')));
  }
  assert.match(fs.readFileSync(path.join(result.dir,'E1_COMPACT_REVIEW.html'),'utf8'),/HOST derived/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('R190 compact invalid output stays HOLD instead of host correcting the authored JSON',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190-compact-hold-'));
 try{
  const result=await runR190CompactThreeUse({outRoot:root},{
   request:async({onAttempt,onRaw})=>{
    onAttempt();
    const raw=JSON.stringify({schema:R190_COMPACT_SCHEMA,id:'bad',title:'Bad',
     brief:'Invalid authored response',spaces:[]});
    onRaw(raw);return {raw};
   }
  });
  assert.equal(result.sourceCompiledCount,0);
  assert.equal(result.status,'TEST_DOUBLE_ONLY');
  assert(result.rows.every(x=>x.status==='HOLD'&&!x.sourceCompiled));
  assert.equal(result.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('R190 compact preserved study replay preserves original hashes, zero model requests and real viewer',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190-compact-replay-'));
 try{
  let i=0;
  const prev=await runR190CompactThreeUse({outRoot:root},{
   request:async({onAttempt,onRaw})=>{
    onAttempt();
    const raw=JSON.stringify(program(['home','store','lab'][i],
     ['ridge','sky-court','facet'][i++]));
    onRaw(raw);return {raw};
   }
  });
  const before=fs.readFileSync(path.join(prev.dir,'E1_COMPACT_REPORT.json'));
  const result=replayR190CompactSaved({previousDir:prev.dir});
  assert.equal(result.sourceCompiledCount,3);
  assert.equal(result.localModelRequests,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.makecode,'SHELL_RESEARCH_ONLY_NOT_APPROVED');
  assert.equal(result.shellPacketCount,3);
  assert.equal(result.windowCandidateCount,3);
  assert(result.rows.every(r=>r.windowResearch.clearRoomFloorCells?.length===3&&
   r.windowResearch.clearRoomFloorCells.every(x=>
    Number.isInteger(x.padsReachableFromEntrance)&&
    x.padsReachableFromEntrance>0&&x.padsReachableFromEntrance<=x.pads2x2&&
    x.disconnectedPads===x.pads2x2-x.padsReachableFromEntrance&&
    x.reachablePadFraction>0&&x.reachablePadFraction<=1)));
  assert(result.rows.every(r=>r.windowResearch.status==='HOST_DERIVED_WINDOWS_SOURCE_ART_HOLD'&&
   r.windowResearch.numberOfRealWindows>=1&&r.windowResearch.worldWrites===0));
  assert(result.rows.every(r=>r.sourceCompiled&&r.modelRequests===0&&
   r.educationExport.status==='OFFLINE_SHELL_RESEARCH_PACKET_ONLY'));
  for(const row of result.rows){
   const roomEvidence=JSON.parse(fs.readFileSync(path.join(result.dir,row.id,
    'WINDOWS_HOST_DERIVED_RESEARCH_ONLY','ROOM_SOURCE_FLOOR_REVIEW.json'),'utf8'));
   assert.equal(roomEvidence.schema,'r190-compact-interior-source-evidence-v1');
   assert.equal(roomEvidence.worldWrites,0);
   assert(roomEvidence.rooms.every(x=>x.twoByTwoSupportedClearPads>0));
   const meta=JSON.parse(fs.readFileSync(row.educationExport.report,'utf8'));
   const source=fs.readFileSync(row.educationExport.output,'utf8');
   assert.equal(meta.worldWrites,0);
   assert.equal(meta.constructionApproved,false);
   assert.deepEqual(meta.BuildPlan.operations,[]);
   assert.equal(meta.researchStage,'UNFINISHED_SHELL_NO_WINDOWS_OR_ART_APPROVAL');
   assert.match(source,/FillOperation.Keep/);
   assert.doesNotMatch(source,/FillOperation.Replace/);
   assert(row.educationExport.bounds.width*row.educationExport.bounds.height*
    row.educationExport.bounds.depth<=40000);
  }
  assert.deepEqual(fs.readFileSync(path.join(prev.dir,'E1_COMPACT_REPORT.json')),before);
  assert(fs.readFileSync(path.join(result.dir,'E1_COMPACT_REPLAY_REVIEW.html'),'utf8')
   .includes('HOST派生・窓付き研究案'));
  for(const row of result.rows){
   assert(fs.existsSync(path.join(result.dir,row.viewer)));
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('R190 compact replay rejects tampered archived model response before writing replay',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190-compact-replay-bad-'));
 try{
  let i=0;
  const prev=await runR190CompactThreeUse({outRoot:root},{
   request:async({onAttempt,onRaw})=>{
    onAttempt();
    const raw=JSON.stringify(program(['home','store','lab'][i],
     ['ridge','sky-court','facet'][i++]));
    onRaw(raw);return {raw};
   }
  });
  const file=path.join(prev.dir,'flower-shop','model','MODEL_RESPONSE_ORIGINAL.txt');
  fs.appendFileSync(file,' ');
  assert.throws(()=>replayR190CompactSaved({previousDir:prev.dir}),
   /ORIGINAL_SHA_MISMATCH/);
  assert.equal(fs.readdirSync(root).some(x=>x.startsWith('R190-COMPACT-REPLAY-')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

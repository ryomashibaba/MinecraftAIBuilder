/** R190-H: mock provider only; no genuine Qwen/Gemma run in CI. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import http from 'node:http';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
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
  assert.equal(receipt.rawProviderBytesPreserved,true);
  assert.equal(receipt.transport,'openai');
  const savedRaw=fs.readFileSync(path.join(out,'R190_I_ORIGINAL_RESPONSE.txt'),'utf8');
  assert.equal(savedRaw,JSON.stringify(fixture()));
  assert.equal(receipt.originalRawSha256,createHash('sha256').update(savedRaw).digest('hex'));
  assert.equal(fs.readFileSync(path.join(out,'R190_I_ORIGINAL_BRIEF.txt'),'utf8'),options.prompt);
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

test('I captures rejected, unchanged source and request without constructing false 3D',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190i-invalid-'));
 const out=path.join(root,'hold');
 const invalid='{"design": {"schema":"bad"}, "explanation":"present", "assumptions":[], "spatialPlan":{}}';
 try{
  let calls=0;
  const options=parseR190Arguments(sampleArgs(out));
  await assert.rejects(()=>runR190Local(options,{fetcher:async()=>{
   calls++;return {ok:true,json:async()=>({choices:[{
    finish_reason:'stop',message:{content:invalid}}]})};
  }}),/R190_I_CAPTURED_HOLD_/);
  assert.equal(calls,1);
  assert.equal(fs.readFileSync(path.join(out,'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),invalid);
  assert.equal(fs.readFileSync(path.join(out,'R190_I_ORIGINAL_BRIEF.txt'),'utf8'),options.prompt);
  const receipt=JSON.parse(fs.readFileSync(path.join(out,'R190_I_CAPTURE_RECEIPT.json')));
  assert.equal(receipt.status,'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW');
  assert.equal(receipt.sourceGenerated,false);
  assert.equal(receipt.rawProviderBytesPreserved,true);
  assert.deepEqual(receipt.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(receipt.BuildPlan.operations,[]);
  assert.equal(receipt.worldWrites,0);
  assert.equal(fs.existsSync(path.join(out,'R190_H_REAL_B143_3D.html')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('I truncated JSON response is still preserved as a HOLD, not claimed as architecture',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190i-truncated-'));
 const out=path.join(root,'hold');
 try{
  await assert.rejects(()=>runR190Local(parseR190Arguments(sampleArgs(out)),{
   fetcher:async()=>({ok:true,json:async()=>({choices:[{
    finish_reason:'length',message:{content:'{"design":{"incomplete":true}'}
   }]})})
  }),/R190_I_CAPTURED_HOLD/);
  assert.equal(fs.readFileSync(path.join(out,'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),
   '{"design":{"incomplete":true}');
  const receipt=JSON.parse(fs.readFileSync(path.join(out,'R190_I_CAPTURE_RECEIPT.json'),'utf8'));
  assert.equal(receipt.sourceGenerated,false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('I reuses native localhost Ollama bridge and retains response bytes with no real model',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190i-native-'));
 const out=path.join(root,'building');
 let calls=0,request=null;
 const server=http.createServer(async(req,res)=>{
  calls++;let raw='';for await(const ch of req)raw+=String(ch);
  request=JSON.parse(raw);
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({done:true,done_reason:'stop',
   message:{content:JSON.stringify(fixture())},eval_count:100,eval_duration:1200000000}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const options=parseR190Arguments([...sampleArgs(out),
   '--transport','native','--endpoint',
   'http://127.0.0.1:'+server.address().port+'/v1/chat/completions']);
  const receipt=await runR190Local(options);
  assert.equal(calls,1);
  assert.equal(request.think,false);
  assert.equal(request.stream,false);
  assert.equal(request.format,'json');
  assert.equal(receipt.transport,'native');
  assert.equal(receipt.rawProviderBytesPreserved,true);
  assert.equal(receipt.nativeOllamaTelemetry.length,1);
  assert.equal(receipt.status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
  assert.equal(fs.readFileSync(path.join(out,'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),
   JSON.stringify(fixture()));
  assert.equal(receipt.worldWrites,0);assert.equal(receipt.worldContacts,0);
 }finally{await new Promise(resolve=>server.close(resolve));
  fs.rmSync(root,{recursive:true,force:true});}
});
test('I rejects native transport for semantic mode and unexpected transport',()=>{
 assert.throws(()=>parseR190Arguments(['--model','fake-model','--prompt',
  'Some building brief','--out','./out','--transport','native']),
  /INVALID_TRANSPORT_FOR_MODE/);
 assert.throws(()=>parseR190Arguments([...sampleArgs('./out'),'--transport','remote']),
  /INVALID_TRANSPORT_FOR_MODE/);
});

test('J preserves valid model B143 as genuinely compiled 3D when its own spatial claims are invalid',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190j-b143-hold-'));
 const out=path.join(root,'review');
 const bad=fixture();bad.spatialPlan.entrance=[5,5,5];
 const original=JSON.stringify(bad);
 let calls=0;
 try{
  await assert.rejects(()=>runR190Local(parseR190Arguments(sampleArgs(out)),{
   fetcher:async()=>{calls++;return {ok:true,json:async()=>({choices:[{
    finish_reason:'stop',message:{content:original}
   }]})};}
  }),/R190_I_CAPTURED_HOLD/);
  assert.equal(calls,1);
  assert.equal(fs.readFileSync(path.join(out,'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),original);
  const receipt=JSON.parse(fs.readFileSync(path.join(out,'R190_I_CAPTURE_RECEIPT.json')));
  assert.equal(receipt.status,'HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW');
  assert.equal(receipt.providerConfirmedComplete,true);
  assert.equal(receipt.sourceGenerated,false);
  assert.equal(receipt.unapprovedGeometryEvidence.status,'COMPILED_B143_ONLY_R4_SPATIAL_HOLD');
  assert.equal(receipt.unapprovedGeometryEvidence.real3DFromModelSource,true);
  assert.equal(receipt.unapprovedGeometryEvidence.strictR4ReviewAccepted,false);
  assert.equal(receipt.unapprovedGeometryEvidence.humanArtReview,'ART_HOLD');
  assert.equal(receipt.unapprovedGeometryEvidence.independentUserRequestCoverage,false);
  assert.ok(receipt.unapprovedGeometryEvidence.trueB143Voxels>100);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'R190_J_HOLD_MODEL_B143.json'),'utf8')),bad.design);
  assert.match(fs.readFileSync(path.join(out,'R190_J_HOLD_B143_3D.html'),'utf8'),
   /r190-h-mock-building/);
  for(const side of ['front','rear','west','east','roof'])
   assert.match(fs.readFileSync(path.join(out,'R190_J_HOLD_'+side+'.svg'),'utf8'),/<svg/);
  assert.ok(fs.existsSync(path.join(out,'R190_J_GLOBAL_DIAGNOSTIC.json')));
  assert.deepEqual(receipt.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(receipt.BuildPlan.operations,[]);
  assert.equal(receipt.worldWrites,0);assert.equal(receipt.worldContacts,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('J never renders apparently complete B143 from provider-reported truncated answer',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190j-truncation-'));
 const out=path.join(root,'review'),raw=JSON.stringify(fixture());
 try{
  await assert.rejects(()=>runR190Local(parseR190Arguments(sampleArgs(out)),{
   fetcher:async()=>({ok:true,json:async()=>({choices:[{
    finish_reason:'length',message:{content:raw}
   }]})})
  }),/R190_I_CAPTURED_HOLD/);
  const receipt=JSON.parse(fs.readFileSync(path.join(out,'R190_I_CAPTURE_RECEIPT.json')));
  assert.equal(receipt.providerConfirmedComplete,false);
  assert.equal(receipt.unapprovedGeometryEvidence.real3DFromModelSource,false);
  assert.equal(fs.existsSync(path.join(out,'R190_J_HOLD_B143_3D.html')),false);
  assert.equal(fs.readFileSync(path.join(out,'R190_I_ORIGINAL_RESPONSE.txt'),'utf8'),raw);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

const semanticFixture=()=>({
 schema:'minecraftaibuilder-r190-model-proposal-v1',
 semanticPlan:structuredClone(R190_STATIC_SYNTHETIC_CASES[1]),
 architecturalRationale:'Synthetic model-shaped public workshop, not real AI inference.',
 assumptions:['A flat site is assumed'],unrepresentedRequirements:[]
});
const semanticArgs=out=>['--model','mock-qwen','--prompt',
 'Design a community workshop with public entry and an accessible layout.',
 '--out',out,'--mode','semantic'];
test('M one mocked semantic provider reply saves immutable original and honest HOST-projected B143 3D',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190m-semantic-'));
 const out=path.join(root,'evidence'),raw=JSON.stringify(semanticFixture());
 let calls=0;
 try{
  const receipt=await runR190Local(parseR190Arguments(semanticArgs(out)),{
   fetcher:async()=>{calls++;return {ok:true,json:async()=>({choices:[{
    finish_reason:'stop',message:{content:raw}}]})};}
  });
  assert.equal(calls,1);
  assert.equal(receipt.status,'SOURCE_VERIFIED_ART_HOLD');
  assert.equal(receipt.hostDeterminedRoomCoordinates,true);
  assert.equal(receipt.modelAuthoredB143,false);
  assert.equal(receipt.sourceKind,'HOST_DETERMINISTIC_B143_FROM_MODEL_SEMANTIC_IR');
  assert.equal(receipt.actualModelRequestsByRunner,1);
  assert.equal(receipt.originalRawSha256,createHash('sha256').update(raw).digest('hex'));
  assert.equal(fs.readFileSync(path.join(out,'R190_M_UNMODIFIED_MODEL_RESPONSE.txt'),'utf8'),raw);
  assert.equal(receipt.independentBriefAcceptance,'NOT_SUPPLIED');
  assert.ok(fs.readFileSync(path.join(out,
   'R190_M_HOST_PROJECTED_REAL_B143_3D.html'),'utf8').includes('r190-shop'));
  for(const side of ['front','rear','west','east','roof'])
   assert.match(fs.readFileSync(path.join(out,'R190_M_HOST_PROJECTED_'+side+'.svg'),'utf8'),/<svg/);
  assert.deepEqual(receipt.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(receipt.BuildPlan.operations,[]);
  assert.equal(receipt.worldContacts,0);assert.equal(receipt.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('M offline replay reuses saved original without connecting or retrying a model',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190m-replay-'));
 const source=path.join(root,'original.txt'),out=path.join(root,'replayed');
 const raw=JSON.stringify(semanticFixture());
 fs.writeFileSync(source,raw);
 let calls=0;
 try{
  const options=parseR190Arguments([...semanticArgs(out),'--replay',source]);
  const receipt=await runR190Local(options,{fetcher:async()=>{calls++;throw Error('NO_NETWORK');}});
  assert.equal(calls,0);assert.equal(receipt.replayWithoutModelCalls,true);
  assert.equal(receipt.actualModelRequestsByRunner,0);
  assert.equal(receipt.providerFinishReason,'UNKNOWN_ARCHIVED_SOURCE');
  assert.equal(fs.readFileSync(path.join(out,'R190_M_UNMODIFIED_MODEL_RESPONSE.txt'),'utf8'),raw);
  assert.equal(receipt.sourceGenerated,true);
  assert.equal(receipt.modelIdentityCryptographicallyVerified,false);
  assert.throws(()=>parseR190Arguments([...semanticArgs('./x'),
   '--replay',source,'--mode','architectural-b143']),/R190_F_FLAG|R190_M_REPLAY/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('M saved actual archived Qwen14B grammar cannot masquerade as R190 compliant architecture',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190m-archived-'));
 const out=path.join(root,'hold'),file=path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  './fixtures/r146-user-qwen14b-20261025-raw.json');
 const raw=fs.readFileSync(file,'utf8');
 try{
  await assert.rejects(()=>runR190Local(parseR190Arguments([...semanticArgs(out),
   '--replay',file]),{fetcher:async()=>{throw Error('NO_NETWORK');}}),
   /R190_M_CAPTURED_HOLD/);
  const r=JSON.parse(fs.readFileSync(path.join(out,'R190_M_EVIDENCE_RECEIPT.json')));
  assert.equal(r.status,'HOLD_ORIGINAL_SEMANTIC_RESPONSE_REJECTED');
  assert.equal(r.sourceGenerated,false);
  assert.equal(r.actualModelRequestsByRunner,0);
  assert.equal(r.rawBytesPreserved,true);
  assert.equal(r.originalRawSha256,createHash('sha256').update(raw).digest('hex'));
  assert.equal(fs.readFileSync(path.join(out,'R190_M_UNMODIFIED_MODEL_RESPONSE.txt'),'utf8'),raw);
  assert.equal(fs.existsSync(path.join(out,'R190_M_HOST_PROJECTED_REAL_B143_3D.html')),false);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.equal(r.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('M truncated semantic response is captured and held, no invented 3D',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190m-truncated-'));
 const out=path.join(root,'hold'),raw=JSON.stringify(semanticFixture());
 try{
  await assert.rejects(()=>runR190Local(parseR190Arguments(semanticArgs(out)),{
   fetcher:async()=>({ok:true,json:async()=>({choices:[{
    finish_reason:'length',message:{content:raw}}]})})
  }),/R190_M_CAPTURED_HOLD/);
  const r=JSON.parse(fs.readFileSync(path.join(out,'R190_M_EVIDENCE_RECEIPT.json')));
  assert.equal(r.status,'HOLD_ORIGINAL_SEMANTIC_RESPONSE_REJECTED');
  assert.equal(r.providerFinishReason,'length');
  assert.equal(r.sourceGenerated,false);
  assert.equal(fs.existsSync(path.join(out,'R190_M_HOST_PROJECTED_REAL_B143_3D.html')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('M connection failure never creates fake evidence and output dirs never overwrite',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190m-fail-'));
 const out=path.join(root,'not-created');
 try{
  await assert.rejects(()=>runR190Local(parseR190Arguments(semanticArgs(out)),{
   fetcher:async()=>({ok:false,status:503})}),/LOCAL_HTTP_503/);
  assert.equal(fs.existsSync(out),false);
  assert.throws(()=>parseR190Arguments([...semanticArgs(out),
   '--replay','old.txt','--endpoint','http://127.0.0.1:11434/v1/chat/completions']),
   /R190_M_REPLAY_SEMANTIC_ONLY_NO_PROVIDER/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

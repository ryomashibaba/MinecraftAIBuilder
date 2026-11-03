import test from 'node:test';
import {buildV4DShareableReceipt,classifyPrivateV4DFailure,SAFE_SHARE_SCHEMA}
 from './r125-v4d-shareable-receipt.mjs';
import {makeV4DCompactSynthetic}
 from './r125-v4d-compact-model-fixture.mjs';
import {COMPACT_SCHEMA,COMPACT_SYSTEM_PROMPT,
 translateCompactModelIntent,compileCompactModelIntent}
 from '../source/ai/r125-v4d-compact-model-ir.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeV4DRelativeAuthorSynthetic}
 from './r125-v4d-relative-author-synthetic.mjs';
import {translateRelativeAuthorIntent,compileRelativeAuthorIntent}
 from '../source/ai/r125-v4d-relative-author-ir.mjs';
import {parseV4DLocalAuthorArgs,runV4DLocalAuthor,
 V4D_RELATIVE_SYSTEM_PROMPT}
 from './r125-v4d-local-architect.mjs';

function sandbox(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4d-local-bridge-'));
 return {root,out:path.join(root,'private-attempt'),
  clean:()=>fs.rmSync(root,{recursive:true,force:true})};
}
function fakeOllama({raw=JSON.stringify(makeV4DRelativeAuthorSynthetic()),
 finish='stop',installed=true}={}){
 const calls=[];
 const stub=async (url,init)=>{
  calls.push({url,method:init?.method,body:init?.body});
  if(init?.method==='GET')return {ok:true,status:200,
   text:async()=>JSON.stringify({models:installed?[{name:'qwen3:14b'}]:[]})};
  if(init?.method==='POST')return {ok:true,status:200,
   text:async()=>JSON.stringify({
    model:'qwen3:14b',
    choices:[{finish_reason:finish,message:{role:'assistant',content:raw}}]
   })};
  throw Error('UNEXPECTED_REQUEST');
 };
 return {fetcher:stub,calls};
}
test('compact model AUTHORED relationships become true verified B143 without modifying the author text',()=>{
 const input=makeV4DRelativeAuthorSynthetic(),frozen=structuredClone(input);
 const rel=translateRelativeAuthorIntent(input);
 assert.deepEqual(input,frozen);
 assert.equal(rel.plan.nodes.length,4);
 assert.equal(rel.plan.links.length,3);
 assert.equal(rel.envelope.gables.length,3);
 assert.equal(rel.envelope.publicShelters.length,1);
 assert.deepEqual(rel.hostLocalOrigin,{x:48,z:42});
 assert.equal(rel.plan.nodes[0].x,48);
 assert.equal(rel.plan.nodes[1].x,25);
 assert.equal(rel.plan.nodes[2].x,71);
 assert.equal(rel.plan.nodes[3].z,65);
 const r=compileRelativeAuthorIntent(input);
 assert.equal(r.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.b143.sourceRoutes.zones.length,4);
 assert(r.b143.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
 assert.equal(r.b143.sourceRoutes.featureAccess.length,4);
 assert(r.b143.sourceRoutes.featureAccess.every(f=>f.reachableFromEntrance));
 assert(r.b143.sourceProof.originalRoofWallMissingCells>100);
 assert(r.b143.sourceProof.shelteredSupportedRoofCells>=50);
 assert.equal(r.worldWrites,0);
 assert.equal(r.constructionApproved,false);
 assert.equal(r.architectureArt,'NOT_REVIEWED');
 assert.equal(r.minecraftWalking,'NOT_TESTED');
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});
test('only explicit model chosen relative geometry changes output; no silent repair or genre templates',()=>{
 const a=makeV4DRelativeAuthorSynthetic();
 const b=structuredClone(a);
 b.spaces[0].roof.peakY--;
 const x=compileRelativeAuthorIntent(a),y=compileRelativeAuthorIntent(b);
 assert.notEqual(x.b143.geometrySha256,y.b143.geometrySha256);
 assert.notEqual(x.originalIntentSha256,y.originalIntentSha256);
});
test('fail closed for malformed author fields, impossible relationships and Windows-side shell collisions',()=>{
 const p=makeV4DRelativeAuthorSynthetic(),snap=JSON.stringify(p),bad=[];
 const vary=f=>{const x=structuredClone(p);f(x);bad.push(x)};
 vary(x=>x.schema='unsafe');
 vary(x=>x.constructNow=true);
 vary(x=>x.spaces.pop());
 vary(x=>x.spaces[0].attach={to:'garden',side:'west',shift:0,doorOffset:8});
 vary(x=>x.spaces[1].attach.to='not-yet-authored');
 vary(x=>x.spaces[1].attach.side='northeast');
 vary(x=>x.spaces[1].attach.shift=999);
 vary(x=>x.spaces[2].attach.side='west');
 vary(x=>x.spaces[0].roof.peakY=50);
 vary(x=>x.spaces[0].roof.type='curvy');
 vary(x=>x.spaces[3].shelter.edge='east');
 vary(x=>x.spaces[1].facade='gold');
 vary(x=>x.spaces[0].windows[0].offset=8);
 vary(x=>x.spaces[1].fixture.offsetX=0);
 vary(x=>x.spaces[3].roof={axis:'x',type:'ridge',eaveY:10,peakY:18,peakPercent:50});
 vary(x=>x.extraLinks=[{from:'reading',to:'makers',side:'east',offset:8}]);
 for(const x of bad){
  assert.throws(()=>translateRelativeAuthorIntent(x),/R125_/);
  assert.throws(()=>compileRelativeAuthorIntent(x),/R125_/);
 }
 assert.equal(JSON.stringify(p),snap);
});
test('test injection can exercise ONE model protocol and real B143 while NEVER marking model authorship as real',async()=>{
 const temp=sandbox(),f=fakeOllama();
 try{
  const result=await runV4DLocalAuthor({
   model:'qwen3:14b',outDir:temp.out,
   prompt:'Design an original civic learning building with an open public garden.'
  },{fetcher:f.fetcher,timeoutMs:15000});
  assert.equal(result.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',result.reason);
  assert.equal(result.testInjectionPresent,true);
  assert.equal(result.modelCalls,1);
  assert.equal(result.worldWrites,0);
  assert.equal(result.constructionApproved,false);
  assert.equal(result.modelNameCryptographicallyAttested,false);
  assert.equal(result.sourceRoutesStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(result.actualB143VoxelCount>5000);
  assert.equal(f.calls.filter(c=>c.method==='POST').length,1);
  assert.equal(f.calls.filter(c=>c.method==='GET').length,1);
  assert(f.calls.every(c=>c.url.startsWith('http://127.0.0.1:')));
  assert(fs.existsSync(path.join(temp.out,'MODEL_RESPONSE_ORIGINAL.txt')));
  assert(fs.existsSync(path.join(temp.out,'AUTHOR_INTENT_ORIGINAL.json')));
  assert(fs.existsSync(path.join(temp.out,'TRUE_B143_SOURCE.json')));
  assert(fs.existsSync(path.join(temp.out,'index.html')));
  assert.equal(JSON.parse(fs.readFileSync(
   path.join(temp.out,'V4D_LOCAL_AUTHOR_REPORT.json'),'utf8')).status,
   'HOLD_TEST_DOUBLE_NOT_REAL_MODEL');
  assert(V4D_RELATIVE_SYSTEM_PROMPT.includes('AUTHOR'));
 }finally{temp.clean();}
});
test('missing local model preflight FAILS before any model generation request',async()=>{
 const tmp=sandbox(),f=fakeOllama({installed:false});
 try{
  const r=await runV4DLocalAuthor({model:'qwen3:14b',
   outDir:tmp.out,prompt:'A specific public architecture project prompt.'
  },{fetcher:f.fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_MODEL_NOT_INSTALLED');
  assert.equal(r.modelCalls,0);
  assert.equal(f.calls.filter(c=>c.method==='POST').length,0);
  assert(fs.existsSync(path.join(tmp.out,'V4D_LOCAL_AUTHOR_REPORT.json')));
  assert(!fs.existsSync(path.join(tmp.out,'TRUE_B143_SOURCE.json')));
 }finally{tmp.clean();}
});
test('truncated response is saved verbatim and never silently repaired or retried',async()=>{
 const temp=sandbox(),raw='{"schema":"partial","spaces":[',f=fakeOllama({raw,finish:'length'});
 try{
  const r=await runV4DLocalAuthor({model:'qwen3:14b',outDir:temp.out,
   prompt:'Design one meaningful public architecture with genuine civic spaces.'
  },{fetcher:f.fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.match(r.reason,/MODEL_TRUNCATED_NO_AUTO_RETRY/);
  assert.equal(fs.readFileSync(
   path.join(temp.out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  assert.equal(r.modelCalls,1);
  assert.equal(f.calls.filter(c=>c.method==='POST').length,1);
  assert(!fs.existsSync(path.join(temp.out,'index.html')));
  assert(!fs.existsSync(path.join(temp.out,'TRUE_B143_SOURCE.json')));
 }finally{temp.clean();}
});
test('structurally invalid model design retains original but is never accepted as source',async()=>{
 const temp=sandbox(),p=makeV4DRelativeAuthorSynthetic();
 p.spaces[1].attach.to='unknown';
 const raw=JSON.stringify(p),f=fakeOllama({raw});
 try{
  const r=await runV4DLocalAuthor({model:'qwen3:14b',outDir:temp.out,
   prompt:'Design a high quality building from this explicit public request.'
  },{fetcher:f.fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.match(r.reason,/R125_V4D_RELATIVE_/);
  assert.equal(fs.readFileSync(path.join(temp.out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  assert.equal(r.modelCalls,1);
  assert(!fs.existsSync(path.join(temp.out,'TRUE_B143_SOURCE.json')));
 }finally{temp.clean();}
});
test('reject remote or unapproved endpoint, bad flags, repo output and existing dirs',async()=>{
 assert.throws(()=>parseV4DLocalAuthorArgs([
  '--model','qwen3:14b','--out','temp','--endpoint','http://192.168.0.1:11434/v1/chat/completions'
 ]),/LOCAL_LOOPBACK_ONLY/);
 assert.throws(()=>parseV4DLocalAuthorArgs(['--model','qwen3:14b','--model','other','--out','new']),
  /ARGUMENT_/);
 assert.throws(()=>parseV4DLocalAuthorArgs(['--model','qwen3:14b','--out','new','--paid-api','yes']),
  /ARGUMENT_/);
 const tmp=sandbox();
 try{
  fs.mkdirSync(tmp.out);
  const f=fakeOllama();
  await assert.rejects(()=>runV4DLocalAuthor({
   model:'qwen3:14b',outDir:tmp.out,
   prompt:'Design a unique public building with functional rooms.'
  },{fetcher:f.fetcher}),/PRIVATE_OUTPUT_MUST_BE_NEW_DIR/);
  assert.equal(f.calls.length,0);
 }finally{tmp.clean();}
});

test('real-model feedback guard: literal contract schema and both sides of shared wall window never silently repaired',()=>{
 const prompt=COMPACT_SYSTEM_PROMPT;
 assert(prompt.includes('"schema":"'+COMPACT_SCHEMA+'"'));
 assert(prompt.includes('Never omit or rename schema'));
 assert(prompt.includes('other five root keys id,title,brief,materials,spaces'));
 assert(prompt.includes('parent EAST and child WEST walls touch'));
 assert(prompt.includes('every later child'));
 assert(prompt.includes('windowSide="none"'));
 const original=makeV4DCompactSynthetic();
 const cases=[
  x=>{delete x.schema;},
  x=>{x.schema='invalid-model-guessed-schema';},
  x=>{delete x.materials;},
  x=>{x.spaces[1].windowSide='east';}, // child east wall touches parent west
  x=>{x.spaces[0].windowSide='west';}, // parent's west wall touches child east
  x=>{x.spaces[0].windowSide='south';} // parent's south wall touches sky north
 ];
 for(const change of cases){
  const candidate=structuredClone(original);
  change(candidate);
  assert.throws(()=>compileCompactModelIntent(candidate),/R125_/);
 }
 assert.equal(compileCompactModelIntent(original).worldWrites,0);
 assert.equal(compileCompactModelIntent(original).art,'NOT_REVIEWED');
 assert.equal(original.schema,COMPACT_SCHEMA);
});

test('compact small-model IR retains AUTHORED space topology while mechanically normalizing dimensions',()=>{
 const original=makeV4DCompactSynthetic(),snap=structuredClone(original);
 const translated=translateCompactModelIntent(original);
 assert.deepEqual(original,snap);
 assert.equal(translated.compactAuthorOriginal.schema,COMPACT_SCHEMA);
 assert(translated.expandedMechanicalIR.spaces.length===3);
 assert(JSON.stringify(original).length<
  JSON.stringify(translated.expandedMechanicalIR).length);
 assert.equal(translated.normalization.madeGenreSpecificChoices,false);
 assert.equal(translated.normalization.modelSizeOrMacMemoryTested,false);
 assert.equal(translated.expandedMechanicalIR.spaces[1].attach.side,'west');
 assert.equal(translated.expandedMechanicalIR.spaces[2].shelter.edge,'north');
 const finished=compileCompactModelIntent(original);
 assert.equal(finished.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(finished.b143.sourceRoutes.zones.length,3);
 assert.equal(finished.b143.sourceRoutes.featureAccess.length,3);
 assert(finished.b143.sourceRoutes.zones.every(x=>x.reachedFromEntrance));
 assert(finished.b143.sourceRoutes.featureAccess.every(x=>x.reachableFromEntrance));
 assert(finished.b143.compiled.primitives.length>3000);
 assert(finished.b143.sourceProof.originalRoofWallMissingCells>100);
 assert.equal(finished.sourceProvenance,'COMPACT_AUTHOR_USER_OR_LLM_UNATTESTED');
 assert.equal(finished.modelIdentity,'NOT_ATTESTED');
 assert.equal(finished.art,'NOT_REVIEWED');
 assert.equal(finished.worldWrites,0);
 assert.deepEqual(finished.gates,Array(9).fill('BLOCKED'));
});
test('compact author-chosen height materially changes final voxels, no geometry template by name',()=>{
 const p=makeV4DCompactSynthetic(),q=structuredClone(p);
 q.spaces[0].height='high';
 const first=compileCompactModelIntent(p),second=compileCompactModelIntent(q);
 assert.notEqual(first.b143.geometrySha256,second.b143.geometrySha256);
 assert.notEqual(first.compactAuthorSha256,second.compactAuthorSha256);
});
test('compact invalid model designs stay REJECTED rather than host auto-correcting them',()=>{
 const p=makeV4DCompactSynthetic(),frozen=JSON.stringify(p);
 const mutations=[
  x=>x.schema='some-other-schema',
  x=>x.worldWrites=1,
  x=>x.spaces.pop(),
  x=>x.spaces[0].windowSide='north',
  x=>x.spaces[0].roof='arch',
  x=>x.spaces[0].height='tower',
  x=>x.spaces[1].attach.to='not-yet-authored',
  x=>x.spaces[1].attach.side='diagonal',
  x=>x.spaces[1].attach.shift=20,
  x=>x.spaces[1].windowSide='east',
  x=>x.spaces[2].attach.to='unknown-room',
  x=>x.spaces[2].roof='ridgeX',
  x=>x.spaces[2].windowSide='none',
  x=>x.materials.roof='explosive',
  x=>x.spaces[0].featureMaterial='lava'
 ];
 for(const [i,mutation] of mutations.entries()){
  const candidate=structuredClone(p);
  mutation(candidate);
  assert.throws(()=>compileCompactModelIntent(candidate),
   /R125_V4D_COMPACT_|R125_V4D_RELATIVE_|R125_V4D_GRAPH_|R125_V4D_INTEGRITY_/);
 }
 assert.equal(JSON.stringify(p),frozen);
});
test('ONE compact LOCAL model path reaches real B143 but injected transport never counts as Qwen success',async()=>{
 const p=makeV4DCompactSynthetic(),f=fakeOllama({raw:JSON.stringify(p)}),temp=sandbox();
 try{
  const args=parseV4DLocalAuthorArgs(['--model','qwen3:14b',
   '--out',temp.out,'--compact']);
  assert.equal(args.compact,true);
  const result=await runV4DLocalAuthor({
   ...args,prompt:'Create a meaningful public learning hall and an open civic garden.'
  },{fetcher:f.fetcher,timeoutMs:15000});
  assert.equal(result.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',result.reason);
  assert.equal(result.authorContract,COMPACT_SCHEMA);
  assert.equal(result.modelCalls,1);
  assert.equal(result.modelNameCryptographicallyAttested,false);
  assert(result.rawCaptured);
  assert.equal(result.sourceRoutesStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(result.actualB143VoxelCount>3000);
  assert.equal(f.calls.filter(x=>x.method==='POST').length,1);
  assert.equal(f.calls.filter(x=>x.method==='GET').length,1);
  const posted=JSON.parse(f.calls.find(x=>x.method==='POST').body);
  assert(posted.messages[0].content.includes(COMPACT_SCHEMA));
  assert(posted.messages[0].content.includes('mechanical dimensions'));
  assert(COMPACT_SYSTEM_PROMPT.includes(COMPACT_SCHEMA));
  assert.equal(fs.readFileSync(path.join(temp.out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),
   JSON.stringify(p));
  assert(fs.existsSync(path.join(temp.out,'MECHANICALLY_EXPANDED_AUTHOR_IR.json')));
  assert(fs.existsSync(path.join(temp.out,'GENERIC_MECHANICAL_NORMALIZATION.json')));
  assert(fs.existsSync(path.join(temp.out,'TRUE_B143_SOURCE.json')));
  assert(fs.existsSync(path.join(temp.out,'index.html')));
  assert.equal(result.worldWrites,0);
 }finally{temp.clean();}
});
test('one compact malformed model response is preserved verbatim but not compiled or retried',async()=>{
 const p=makeV4DCompactSynthetic(),temp=sandbox();
 p.spaces[1].attach.to='ghost-parent';
 const raw=JSON.stringify(p),f=fakeOllama({raw});
 try{
  const r=await runV4DLocalAuthor({
   model:'qwen3:14b',outDir:temp.out,compact:true,
   prompt:'Create an original public architecture with working spatial relations.'
  },{fetcher:f.fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.equal(r.authorContract,COMPACT_SCHEMA);
  assert.equal(r.modelCalls,1);
  assert.equal(f.calls.filter(x=>x.method==='POST').length,1);
  assert.equal(fs.readFileSync(path.join(temp.out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),
   raw);
  assert(!fs.existsSync(path.join(temp.out,'TRUE_B143_SOURCE.json')));
 }finally{temp.clean();}
});
test('compact flag can be selected only once, full legacy mode stays default',()=>{
 const args=parseV4DLocalAuthorArgs(['--model','qwen3:14b','--out','new-private-dir']);
 assert.equal(args.compact,false);
 assert.throws(()=>parseV4DLocalAuthorArgs([
  '--model','qwen3:14b','--out','new-private-dir','--compact','--compact'
 ]),/DUPLICATE_COMPACT/);
});

test('source receipt exposes only allowlisted metadata, never private model text/prompt/errors/paths',()=>{
 const secret='PRIVATE_LONG_MODEL_RESPONSE_AND_WINDOWS_PATH_C_USERS';
 const report={
  schema:'minecraftaibuilder-r125-v4d-local-model-author-attempt-v1',
  status:'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR',
  reason:'R125_V4D_GRAPH_INVALID_'+secret,
  modelId:'qwen3:14b',authorContract:COMPACT_SCHEMA,
  prompt:secret,endpoint:'http://127.0.0.1:11434/v1/chat/completions',
  localPath:'C:\\Users\\Somebody\\Documents\\Private\\',
  testInjectionPresent:false,modelCalls:1,rawCaptured:true,
  responseRawSha256:'a'.repeat(64),
  sourceRoutesStatus:'NOT_TESTED',sourceSha256:null,geometrySha256:null,
  actualB143VoxelCount:null,
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0
 };
 const safe=buildV4DShareableReceipt(report);
 const text=JSON.stringify(safe);
 assert.equal(safe.schema,SAFE_SHARE_SCHEMA);
 assert.equal(safe.reportedStatus,report.status);
 assert.equal(safe.failureCategory,'ARCHITECTURAL_GRAPH_INVALID');
 assert.equal(safe.originalRawSavedPrivately,true);
 assert.equal(safe.originalRawSha256,'a'.repeat(64));
 assert.equal(safe.sourceCandidateVerified,false);
 assert.equal(safe.actualOllamaInferenceAttested,false);
 assert.equal(safe.modelIdentityCryptographicallyVerified,false);
 assert.equal(safe.worldWrites,0);
 assert(!text.includes(secret));
 assert(!text.includes('C:\\Users'));
 assert(!text.includes(report.endpoint));
 assert(!Object.hasOwn(safe,'reason'));
 assert(!Object.hasOwn(safe,'prompt'));
 assert(!Object.hasOwn(safe,'localPath'));
 assert(!Object.hasOwn(safe,'endpoint'));
 assert.equal(classifyPrivateV4DFailure('MODEL_TRUNCATED_NO_AUTO_RETRY'),'MODEL_COMPLETENESS');
 assert.equal(classifyPrivateV4DFailure('R125_V4D_COMPACT_BAD'),'COMPACT_AUTHOR_IR_INVALID');
});
test('shareable receipt refuses contradictory ART promotion, model promotion, 2 POST, or any world writes',()=>{
 const source={
  schema:'minecraftaibuilder-r125-v4d-local-model-author-attempt-v1',
  modelId:'qwen3:14b',authorContract:COMPACT_SCHEMA,
  status:'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',reason:null,
  testInjectionPresent:true,modelCalls:1,rawCaptured:true,
  responseRawSha256:'a'.repeat(64),
  sourceRoutesStatus:'SOURCE_ROUTES_REACH_ALL_ZONES',
  sourceSha256:'b'.repeat(64),geometrySha256:'c'.repeat(64),
  actualB143VoxelCount:6000,
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0
 };
 const safe=buildV4DShareableReceipt(source);
 assert.equal(safe.sourceCandidateVerified,true);
 assert.equal(safe.explicitlyInjectedTestResponse,true);
 assert.equal(safe.actualOllamaInferenceAttested,false);
 assert.equal(safe.humanArchitecturalArt,'NOT_REVIEWED');
 const edit=(change)=>{const z=structuredClone(source);change(z);return z};
 assert.throws(()=>buildV4DShareableReceipt(edit(x=>x.worldWrites=1)),/SAFE_RECEIPT_/);
 assert.throws(()=>buildV4DShareableReceipt(edit(x=>x.modelCalls=2)),/SAFE_RECEIPT_/);
 assert.throws(()=>buildV4DShareableReceipt(edit(x=>x.constructionApproved=true)),/SAFE_RECEIPT_/);
 assert.throws(()=>buildV4DShareableReceipt(edit(x=>x.gates[0]='PASS')),/SAFE_RECEIPT_/);
 assert.throws(()=>buildV4DShareableReceipt(edit(x=>x.status='HOLD_NOT_A_KNOWN_STATUS')),/SAFE_RECEIPT_/);
 assert.throws(()=>buildV4DShareableReceipt(edit(x=>{x.testInjectionPresent=false;})),/SAFE_RECEIPT_/);
 assert.throws(()=>buildV4DShareableReceipt(edit(x=>{
  x.status='SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED';x.geometrySha256=null;
 })),/SAFE_RECEIPT_/);
});
test('one compact injected study generates safe-to-share receipt without publishing full request or model answer',async()=>{
 const temp=sandbox();
 const p=makeV4DCompactSynthetic(),raw=JSON.stringify(p),fake=fakeOllama({raw});
 try{
  const r=await runV4DLocalAuthor({model:'qwen3:14b',outDir:temp.out,
   compact:true,prompt:'A brand new public maker institution with a sheltered civic garden.'
  },{fetcher:fake.fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL');
  const fp=path.join(temp.out,'REVIEW_SUMMARY_SHAREABLE.json');
  assert(fs.existsSync(fp));
  const safeText=fs.readFileSync(fp,'utf8'),safe=JSON.parse(safeText);
  assert.equal(safe.reportedStatus,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL');
  assert.equal(safe.sourceCandidateVerified,true);
  assert.equal(safe.explicitlyInjectedTestResponse,true);
  assert.equal(safe.humanArchitecturalArt,'NOT_REVIEWED');
  assert.equal(safe.modelCallAttempts,1);
  assert.equal(safe.worldWrites,0);
  assert(!safeText.includes(raw));
  assert(!safeText.includes('brand new public maker institution'));
  assert(!safeText.includes(temp.root));
  assert(fs.existsSync(path.join(temp.out,'MODEL_RESPONSE_ORIGINAL.txt')));
  assert(fs.existsSync(path.join(temp.out,'index.html')));
 }finally{temp.clean();}
});

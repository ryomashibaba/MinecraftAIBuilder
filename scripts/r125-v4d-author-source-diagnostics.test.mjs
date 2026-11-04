import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runV4DLocalAuthor} from './r125-v4d-local-architect.mjs';
import {replayPrivateV4D} from './r125-v4d-replay-private.mjs';
import {makeV4DCompactSynthetic} from './r125-v4d-compact-model-fixture.mjs';
import {makeV4DRelativeAuthorSynthetic} from './r125-v4d-relative-author-synthetic.mjs';
import {
 diagnosePrivateV4DAuthor,diagnosePrivateV4DInvalidJSON,DIAGNOSTIC_SCHEMA
} from './r125-v4d-author-source-diagnostics.mjs';
import {COMPACT_SCHEMA} from '../source/ai/r125-v4d-compact-model-ir.mjs';
import {RELATIVE_SCHEMA} from '../source/ai/r125-v4d-relative-author-ir.mjs';

const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function temp(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'v4d-diagnostic-test-'));
 return {root,study:path.join(root,'study'),replay:path.join(root,'replay'),
  clean:()=>fs.rmSync(root,{recursive:true,force:true})};
}
function modelFake(raw,finish='stop'){
 const calls=[];
 return {calls,fetcher:async(url,opts)=>{
  calls.push(opts?.method);
  if(opts?.method==='GET')return {ok:true,status:200,
   text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  if(opts?.method==='POST')return {ok:true,status:200,
   text:async()=>JSON.stringify({model:'qwen3:14b',
    choices:[{finish_reason:finish,message:{content:raw}}]})};
  throw Error('UNEXPECTED_TEST_TRANSPORT');
 }};
}
const trial=(s,model)=>runV4DLocalAuthor({
 model:'qwen3:14b',outDir:s.study,compact:true,
 prompt:'A novel small public library and workshop with a sheltered courtyard.'
},{fetcher:model.fetcher,timeoutMs:15000});

test('valid compact and detailed intent yield explicit NOT_ART source summaries with no identity claim',()=>{
 for(const [contract,author] of [
  [COMPACT_SCHEMA,makeV4DCompactSynthetic()],
  [RELATIVE_SCHEMA,makeV4DRelativeAuthorSynthetic()]
 ]){
  const original=JSON.stringify(author);
  const r=diagnosePrivateV4DAuthor(author,contract);
  assert.equal(JSON.stringify(author),original);
  assert.equal(r.schema,DIAGNOSTIC_SCHEMA);
  assert.equal(r.format,'VALID_JSON');
  assert.equal(r.coveredSpaceCount>=2,true);
  assert.equal(r.openPublicSpaceCount>=1,true);
  assert.equal(r.authorParentAttachmentCount,author.spaces.length-1);
  assert.equal(r.missingTopLevelKeyCount,0);
  assert.equal(r.unexpectedTopLevelKeyCount,0);
  assert.equal(r.issues.length,0,JSON.stringify(r.issues));
  assert.equal(r.sourcePassNotInferred,true);
  assert.equal(r.artApproved,false);
  assert.equal(r.privateStringsIncluded,false);
  assert.equal(r.sourceModelCalls,0);
 }
});
test('diagnostic identifies missing keys, future parent, window shared partition, roof and semantic violations without leaking authored names',()=>{
 const x=makeV4DCompactSynthetic(),secret='PRIVATE_USER_AUTHORED_ROOM_LABEL';
 x.spaces[0].purpose=secret;
 x.spaces[0].windowSide='south';
 x.spaces[1].attach.to='future-not-present';
 x.spaces[1].roof='unknown-roof';
 x.spaces[1].featureMaterial='unsafe';
 x.spaces[2].width=1;
 x.materials.roof='invalid-material';
 delete x.spaces[2].feature;
 const r=diagnosePrivateV4DAuthor(x,COMPACT_SCHEMA);
 const codes=r.issues.map(i=>i.code);
 for(const expected of [
  'GLOBAL_MATERIAL_VALUE','SPACE_FIELD_SHAPE','SPACE_DIMENSION_RANGE',
  'ROOF_PROFILE_DECISION_INVALID','PROGRAM_FUNCTION_OR_MATERIAL_INVALID',
  'PARENT_ATTACHMENT_INVALID','WINDOW_ON_SHARED_PARTITION'
 ])assert(codes.includes(expected),expected+': '+JSON.stringify(codes));
 const serialized=JSON.stringify(r);
 assert(!serialized.includes(secret));
 assert(!serialized.includes('future-not-present'));
 assert(!serialized.includes('learning'));
 assert(!serialized.includes('welcome'));
 assert(r.issues.every(i=>i.spaceIndex===null||
  (Number.isSafeInteger(i.spaceIndex)&&i.spaceIndex>=0&&i.spaceIndex<6)));
});
test('invalid JSON emits only a static parse code and no raw string or exception snippet',()=>{
 const r=diagnosePrivateV4DInvalidJSON(COMPACT_SCHEMA);
 assert.equal(r.format,'INVALID_JSON');
 assert.deepEqual(r.issues,[{code:'ORIGINAL_RESPONSE_NOT_JSON',spaceIndex:null}]);
 assert(!JSON.stringify(r).includes('user'));
 assert.throws(()=>diagnosePrivateV4DInvalidJSON('unknown'),/UNRECOGNIZED_CONTRACT/);
 assert.deepEqual(diagnosePrivateV4DAuthor(null,COMPACT_SCHEMA).issues,
  [{code:'TOP_LEVEL_NOT_OBJECT',spaceIndex:null}]);
});
test('verified saved invalid model response produces NONPROMOTABLE structural diagnosis without second POST',async()=>{
 const s=temp(),input=makeV4DCompactSynthetic();
 input.spaces[1].attach.to='PRIVATE_FUTURE_ROOM';
 input.spaces[1].roof='impossible';
 const raw=JSON.stringify(input),model=modelFake(raw);
 try{
  const prev=await trial(s,model);
  assert.equal(prev.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  const originalBytes=fs.readFileSync(path.join(s.study,'MODEL_RESPONSE_ORIGINAL.txt'));
  const oldCalls=model.calls.length;
  const res=replayPrivateV4D(s.study,s.replay);
  assert.equal(res.status,'HOLD_REPLAY_SOURCE_REJECTED');
  assert.equal(model.calls.length,oldCalls);
  assert.equal(res.additionalModelCalls,0);
  assert.deepEqual(fs.readFileSync(path.join(s.study,'MODEL_RESPONSE_ORIGINAL.txt')),originalBytes);
  const diagnostic=readJSON(path.join(s.replay,'AUTHOR_SOURCE_DIAGNOSTIC.json'));
  const codes=diagnostic.issues.map(i=>i.code);
  assert(codes.includes('PARENT_ATTACHMENT_INVALID'));
  assert(codes.includes('ROOF_PROFILE_DECISION_INVALID'));
  assert.equal(res.structuralDiagnosticIssueCount,codes.length);
  const safe=readJSON(path.join(s.replay,'REPLAY_SHAREABLE_STATUS.json'));
  assert.equal(safe.structuralDataDerivedOnlyFromShaVerifiedOriginal,true);
  assert(safe.structuralIssueCodes.includes('PARENT_ATTACHMENT_INVALID'));
  for(const output of ['AUTHOR_SOURCE_DIAGNOSTIC.json','REPLAY_SHAREABLE_STATUS.json','OFFLINE_REPLAY_REPORT.json']){
   const content=fs.readFileSync(path.join(s.replay,output),'utf8');
   assert(!content.includes('PRIVATE_FUTURE_ROOM'));
   assert(!content.includes(s.root));
   assert(!content.includes(raw));
  }
  assert(!fs.existsSync(path.join(s.replay,'index.html')));
 }finally{s.clean();}
});
test('tampered original SHA cannot be diagnosed and no JSON from tampered model is copied',async()=>{
 const s=temp(),raw=JSON.stringify(makeV4DCompactSynthetic()),model=modelFake(raw);
 try{
  await trial(s,model);
  fs.appendFileSync(path.join(s.study,'MODEL_RESPONSE_ORIGINAL.txt'),' ');
  const r=replayPrivateV4D(s.study,s.replay);
  assert.equal(r.status,'HOLD_TAMPERED_ORIGINAL_RESPONSE');
  assert(!fs.existsSync(path.join(s.replay,'AUTHOR_SOURCE_DIAGNOSTIC.json')));
  const safe=readJSON(path.join(s.replay,'REPLAY_SHAREABLE_STATUS.json'));
  assert.equal(safe.structuralDataDerivedOnlyFromShaVerifiedOriginal,false);
  assert.equal(safe.structuralIssueCount,null);
 }finally{s.clean();}
});
test('original invalid JSON is diagnosed from authenticated original without attempting automatic repairs',async()=>{
 const s=temp(),model=modelFake('{"hello": [','stop');
 try{
  const original=await trial(s,model);
  assert.equal(original.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  const result=replayPrivateV4D(s.study,s.replay);
  assert.equal(result.status,'HOLD_ORIGINAL_MODEL_INVALID_JSON');
  assert.equal(result.additionalModelCalls,0);
  const x=readJSON(path.join(s.replay,'AUTHOR_SOURCE_DIAGNOSTIC.json'));
  assert.equal(x.format,'INVALID_JSON');
  assert.equal(x.issues[0].code,'ORIGINAL_RESPONSE_NOT_JSON');
  assert(!fs.existsSync(path.join(s.replay,'TRUE_B143_REPLAY_SOURCE.json')));
 }finally{s.clean();}
});

test('frozen graph north entry conflict is separately diagnosed for original compact IR without repair or private identifiers',()=>{
 const valid=makeV4DCompactSynthetic();
 const noConflict=diagnosePrivateV4DAuthor(valid,COMPACT_SCHEMA);
 assert(!noConflict.issues.some(i=>i.code==='ENTRY_NORTH_SIDE_OCCUPIED'));
 const invalid=structuredClone(valid),root=invalid.spaces[0].id;
 invalid.spaces[2].attach={to:root,side:'north',shift:0};
 const original=JSON.stringify(invalid);
 const report=diagnosePrivateV4DAuthor(invalid,COMPACT_SCHEMA);
 assert.equal(JSON.stringify(invalid),original);
 assert.deepEqual(report.issues.filter(i=>i.code==='ENTRY_NORTH_SIDE_OCCUPIED'),
  [{code:'ENTRY_NORTH_SIDE_OCCUPIED',spaceIndex:2}]);
 assert.equal(report.sourcePassNotInferred,true);
 assert.equal(report.privateStringsIncluded,false);
 assert.equal(report.sourceModelCalls,0);
 assert(!JSON.stringify(report).includes(root));
 const other=structuredClone(valid);
 other.spaces[2].attach={to:other.spaces[1].id,side:'north',shift:0};
 assert(!diagnosePrivateV4DAuthor(other,COMPACT_SCHEMA).issues
  .some(i=>i.code==='ENTRY_NORTH_SIDE_OCCUPIED'));
});

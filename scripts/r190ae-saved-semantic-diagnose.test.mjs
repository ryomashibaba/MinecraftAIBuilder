/** Synthetic evidence only. Never publish or embed the user's model original. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {diagnoseR190AERaw} from '../source/ai/r190ad-semantic-diagnostics.mjs';
import {R190AE_FORMAT_SHA256,inspectR190AEReply} from '../source/ai/r190ae-flexible-semantic-contract.mjs';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
import {diagnoseSavedR190AE,parseR190AEDiagnoseArgs} from './r190ae-saved-semantic-diagnose.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
function broken(){
 const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[1]);
 p.id='synthetic-ae-errors';p.title='Synthetic source constraints';
 p.brief='Hand-authored fixture, not a Qwen design';
 p.site={width:48,depth:40,height:20};
 p.spaces=p.spaces.map(s=>({...s,height:9,spatialRole:'enclosed'}));
 const root=p.spaces.find(s=>s.id===p.entrySpaceId);
 root.side='east';
 const child=p.spaces.find(s=>s.parentId===root.id);
 p.glazedOpenings=[root,child].map(s=>({spaceId:s.id,face:'north',
  offset:2,baseY:19,width:2,height:3}));
 p.crossConnections=[[root.id,child.id]];
 return p;
}
function study(dir){
 fs.mkdirSync(dir);
 const raw=JSON.stringify(broken())+'\n',hash=H(raw);
 const a={schema:'minecraftaibuilder-r190ab-attempt-v1',
  contract:'semantic-space-flexible',modelRequested:'SYNTHETIC-NO-PROVIDER',
  sourceTask:'synthetic-task',promptSha256:H('synthetic prompt'),
  requestSha256:H('synthetic request'),schemaSha256:R190AE_FORMAT_SHA256,
  providerCallsAttempted:1,...safe()};
 const r={schema:'minecraftaibuilder-r190ae-flexible-study-v1',
  study:'synthetic-study',contract:a.contract,modelClaimed:a.modelRequested,
  sourceTask:a.sourceTask,b143Authorship:'HOST_DERIVED_FROM_MODEL_SEMANTIC_IR',
  providerDoneReason:'stop',providerError:null,providerCallsAttempted:1,
  originalPromptSha256:a.promptSha256,schemaSha256:R190AE_FORMAT_SHA256,
  response:inspectR190AEReply(raw).report,humanArtReview:'ART_HOLD',
  independentArtApproval:false,noAutomaticRetry:true,noHostGeometryRepair:true,...safe()};
 fs.writeFileSync(path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt'),raw);
 fs.writeFileSync(path.join(dir,'R190AB_ATTEMPT.json'),JSON.stringify(a));
 fs.writeFileSync(path.join(dir,'R190AB_RESULT.json'),JSON.stringify(r));
 return {studyDir:dir,expectedSha256:hash};
}
const snapshot=dir=>fs.readdirSync(dir).map(n=>[n,H(fs.readFileSync(path.join(dir,n)))]);
test('AE enumerates root, two height conflicts and redundant tree edge with precise paths',()=>{
 const p=broken(),raw=JSON.stringify(p),r=diagnoseR190AERaw(raw);
 assert.deepEqual(r.errors.map(x=>x.code),[
  'ENTRY_RELATION_INVALID','GLAZING_OUTSIDE_ROOM_HEIGHT',
  'GLAZING_OUTSIDE_ROOM_HEIGHT','CROSS_LINK_DUPLICATES_TREE']);
 assert.equal(r.issueCount,4);assert.equal(JSON.stringify(p),raw);
 assert.equal(r.rawSha256,H(raw));assert.equal(r.sourceGeometryBuilt,false);
 assert.equal(r.errors[1].minimumBaseY,5);
 assert.equal(r.errors[1].maximumBaseY,5);
 assert.equal(r.errors[1].minimumRequiredRoomHeight,23);
 assert.ok(r.errors.every(x=>!x.path.includes('undefined')));
 const child=p.spaces.find(s=>s.parentId===p.entrySpaceId);
 child.side='south';
 const issue=diagnoseR190AERaw(JSON.stringify(p)).errors.find(x=>x.code==='ENTRY_APPROACH_BLOCKED');
 assert.equal(issue.path,`spaces[${p.spaces.indexOf(child)}].side`);
 assert.equal(r.modelCalls,0);assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});
test('AE omits optional features without AD missing-feature errors or a false geometry PASS',()=>{
 for(const source of R190_STATIC_SYNTHETIC_CASES){
  const p=structuredClone(source);
  p.spaces=p.spaces.map(s=>({...s,spatialRole:'enclosed'}));
  const r=diagnoseR190AERaw(JSON.stringify(p));
  assert.deepEqual(r.errors,[]);assert.equal(r.sourceGeometryBuilt,false);
  assert.equal(r.status,'NO_STATIC_ISSUES_COMPILER_CHECK_REQUIRED');
  assert.equal(r.independentArtReview,'ART_HOLD');
 }
 const p=broken();p.glazedOpenings=[];p.crossConnections=[];
 const codes=diagnoseR190AERaw(JSON.stringify(p)).errors.map(x=>x.code);
 assert.ok(codes.includes('GLAZING_COUNT_INVALID'));assert.ok(codes.includes('CROSS_LINK_COUNT_INVALID'));
 assert.equal(diagnoseR190AERaw('{').errors[0].code,'MALFORMED_JSON');
});
test('AE archived audit and CLI preserve every original byte and keep the original first error',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ae-diagnosis-'));
 try{
  const x=study(path.join(root,'saved')),before=snapshot(x.studyDir);
  const r=diagnoseSavedR190AE(x);
  assert.equal(r.issueCount,4);assert.equal(r.preservedOriginalResult.error,'R190_SEMANTIC_RELATION');
  assert.equal(r.preservedOriginalResult.status,'HOLD_INVALID_FLEXIBLE_PROGRAM');
  assert.equal(r.provenance.modelCallsByDiagnosis,0);assert.equal(r.sourceEvidenceWritten,false);
  assert.equal(r.provenance.modelIdentityIndependentlyVerified,false);
  const cli=fileURLToPath(new URL('./r190ae-saved-semantic-diagnose.mjs',import.meta.url));
  const run=spawnSync(process.execPath,[cli,'--study',x.studyDir,'--expected-sha',x.expectedSha256],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).issueCount,4);
  assert.deepEqual(snapshot(x.studyDir),before);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AE rejects forged provenance and unsafe flags at every receipt layer',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ae-tamper-'));
 try{
  const x=study(path.join(root,'saved'));
  for(const name of ['R190AB_ATTEMPT.json','R190AB_RESULT.json']){
   const file=path.join(x.studyDir,name),original=fs.readFileSync(file);
   const mutations=[r=>{r.contract='semantic-space-expressive'},r=>{r.schemaSha256='0'.repeat(64)},
    r=>{r.worldWrites=1},r=>{r.readiness='PREPARED'},r=>{r.gates[2]='OPEN'},
    r=>{r.BuildPlan.operations=[{}]},r=>{r.providerCallsAttempted=2}];
   if(name==='R190AB_RESULT.json')mutations.push(
    r=>{r.response.schema='minecraftaibuilder-r190ad-expressive-result-v1'},
    r=>{r.response.contract='semantic-space-expressive'},r=>{r.response.worldContacts=1},
    r=>{r.response.readiness='PREPARED'},r=>{r.response.gates[0]='OPEN'},
    r=>{r.response.BuildPlan.operations=[{}]},r=>{r.response.exactModelRawUnmodified=false},
    r=>{r.modelClaimed='another-model'},r=>{r.sourceTask='another-task'},
    r=>{r.providerDoneReason='length'},r=>{r.response.bytes++},
    r=>{r.response.originalRawSha256='0'.repeat(64)},r=>{r.originalPromptSha256='0'.repeat(64)});
   for(const mutate of mutations){
    const r=JSON.parse(original);mutate(r);fs.writeFileSync(file,JSON.stringify(r));
    assert.throws(()=>diagnoseSavedR190AE(x),/PROVENANCE_OR_SAFETY/);
   }
   fs.writeFileSync(file,original);
  }
  assert.throws(()=>diagnoseSavedR190AE({...x,expectedSha256:'0'.repeat(64)}),/PROVENANCE_OR_SAFETY/);
  fs.appendFileSync(path.join(x.studyDir,'MODEL_RESPONSE_ORIGINAL.txt'),' ');
  assert.throws(()=>diagnoseSavedR190AE(x),/PROVENANCE_OR_SAFETY/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AE rejects invalid UTF-8, oversized evidence and unsafe arguments',()=>{
 assert.deepEqual(parseR190AEDiagnoseArgs(['--help']),{help:true});
 assert.throws(()=>parseR190AEDiagnoseArgs(['--study','relative','--expected-sha','a'.repeat(64)]),/ARGS/);
 assert.throws(()=>parseR190AEDiagnoseArgs(['--study','a','--study','b']),/ARGS/);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ae-file-'));
 try{
  const x=study(path.join(root,'saved')),file=path.join(x.studyDir,'MODEL_RESPONSE_ORIGINAL.txt');
  fs.writeFileSync(file,Buffer.from([0xff]));
  assert.throws(()=>diagnoseSavedR190AE(x),/INVALID_UTF8/);
  fs.writeFileSync(file,'a'.repeat(120001));
  assert.throws(()=>diagnoseSavedR190AE(x),/UNSAFE_EVIDENCE/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('Windows wrapper accepts offline AE diagnosis and rejects inference combinations before Git',
 {skip:process.platform!=='win32'},()=>{
 const script=fileURLToPath(new URL('./r190ab-semantic-workshop.ps1',import.meta.url));
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ae-wrapper-'));
 const run=args=>spawnSync('powershell.exe',['-NoProfile','-NonInteractive',
  '-ExecutionPolicy','Bypass','-File',script,...args],{encoding:'utf8'});
 try{
  const allowed=run(['-Flexible','-Diagnose','-DiagnosisSha','a'.repeat(64),
   '-Repository',path.join(root,'absent')]);
  assert.notEqual(allowed.status,0);
  assert.match(allowed.stdout+allowed.stderr,/Run from the canonical MinecraftAIBuilder repository/);
  const missingHash=run(['-Flexible','-Diagnose']);
  assert.notEqual(missingHash.status,0);
  assert.match(missingHash.stdout+missingHash.stderr,/requires explicit -DiagnosisSha/);
  const mixed=run(['-Flexible','-Diagnose','-Run']);
  assert.notEqual(mixed.status,0);
  assert.match(mixed.stdout+mixed.stderr,/strictly read-only/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

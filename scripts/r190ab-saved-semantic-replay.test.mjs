/** Fake-only tests; original study is simulated in OS temp. No model calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {R190_SCHEMA} from '../source/ai/r190-semantic-massing.mjs';
import {R190AB_SEMANTIC_FORMAT_SHA256}
 from '../source/ai/r190ab-semantic-contract.mjs';
import {parseSavedSemanticReplayArgs,replaySavedSemanticStudy}
 from './r190ab-saved-semantic-replay.mjs';
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const build=()=>({
 schema:R190_SCHEMA,id:'coastal-test',
 title:'Coastal workshop test',brief:'Completely synthetic room program',
 site:{width:40,depth:30,height:20},entrySpaceId:'entry',
 spaces:[
  {id:'entry',purpose:'Public entry',width:10,depth:10,height:7,
   parentId:null,side:null,privacy:'public'},
  {id:'exhibition',purpose:'Public exhibits',width:20,depth:15,height:15,
   parentId:'entry',side:'north',privacy:'public'},
  {id:'workshop',purpose:'Repairs',width:18,depth:12,height:8,
   parentId:'exhibition',side:'east',privacy:'private'},
  {id:'storage',purpose:'Storage',width:12,depth:10,height:7,
   parentId:'entry',side:'west',privacy:'private'}
 ],
 materials:{floor:'concrete',wall:'concrete',roof:'metal'},
 roofFormIntent:{spaceId:'exhibition',profile:'ridge',axis:'x',rise:4},
 glazedOpenings:[{spaceId:'exhibition',face:'north',offset:3,baseY:5,width:5,height:4}]
});
function setup(root){
 const studyDir=path.join(root,'semantic-workshop-01');
 fs.mkdirSync(studyDir);
 const raw=JSON.stringify(build()),hash=sha(raw);
 const attempt={contract:'semantic-space',sourceTask:'tidal-workshop',
  modelRequested:'qwen3:14b',promptSha256:sha('synthetic prompt'),
  schemaSha256:R190AB_SEMANTIC_FORMAT_SHA256,providerCallsAttempted:1};
 const result={
  schema:'minecraftaibuilder-r190ab-semantic-study-v1',
  study:'semantic-workshop-01',contract:'semantic-space',
  sourceTask:'tidal-workshop',modelClaimed:'qwen3:14b',
  originalPromptSha256:attempt.promptSha256,
  schemaSha256:R190AB_SEMANTIC_FORMAT_SHA256,
  providerDoneReason:'stop',providerCallsAttempted:1,
  noAutomaticRetry:true,noHostGeometryRepair:true,
  b143Authorship:'HOST_DERIVED_FROM_MODEL_SEMANTIC_IR',
  response:{originalRawSha256:hash,bytes:Buffer.byteLength(raw),
   formatSchemaSha256:R190AB_SEMANTIC_FORMAT_SHA256,
   status:'HOLD_INVALID_SEMANTIC_PROGRAM',
   real3D:false,error:'R190_SEMANTIC_NO_FEASIBLE_SPATIAL_LAYOUT'},
  executionAllowed:false,constructionApproved:false,
  worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 fs.writeFileSync(path.join(studyDir,'MODEL_RESPONSE_ORIGINAL.txt'),raw);
 fs.writeFileSync(path.join(studyDir,'R190AB_ATTEMPT.json'),JSON.stringify(attempt));
 fs.writeFileSync(path.join(studyDir,'R190AB_RESULT.json'),JSON.stringify(result));
 return {studyDir,raw,hash};
}
test('current host replays previously rejected room topology without editing originals',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ab-replay-'));
 try{
  const s=setup(root),outDir=path.join(root,'replay-output');
  const originals=fs.readdirSync(s.studyDir).map(name=>[
   name,sha(fs.readFileSync(path.join(s.studyDir,name),'utf8'))]);
  const r=replaySavedSemanticStudy({studyDir:s.studyDir,outDir,
   expectedSha256:s.hash});
  assert.equal(r.oldRecordedStatus,'HOLD_INVALID_SEMANTIC_PROGRAM');
  assert.equal(r.oldRecordedError,'R190_SEMANTIC_NO_FEASIBLE_SPATIAL_LAYOUT');
  assert.equal(r.status,'CURRENT_HOST_DERIVED_3D_ART_HOLD');
  assert.equal(r.modelCallsByReplay,0);
  assert.equal(r.sourceGeometryPresent,true);
  assert.equal(r.modelAuthoredB143,false);
  assert.equal(r.originalModelResponseRetrospectivelyReclassified,false);
  assert.equal(r.currentHostSourceRouteAudit.reachableRoomCount,4);
  assert.equal(r.humanArtReview,'ART_HOLD');
  assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  for(const name of ['REPLAY_RESULT.json','HOST_DERIVED_B143_SOURCE.json',
   'HOST_DERIVED_SOURCE_TRUE_3D.html','HOST_DERIVED_front.svg',
   'HOST_DERIVED_rear.svg','HOST_DERIVED_west.svg',
   'HOST_DERIVED_east.svg','HOST_DERIVED_roof.svg'])
   assert.ok(fs.statSync(path.join(outDir,name)).size>0,name);
  assert.deepEqual(fs.readdirSync(s.studyDir).map(name=>[
   name,sha(fs.readFileSync(path.join(s.studyDir,name),'utf8'))]),originals);
  assert.throws(()=>replaySavedSemanticStudy({studyDir:s.studyDir,outDir,
   expectedSha256:s.hash}),/OUTPUT_NOT_ISOLATED_OR_EXISTS/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('replay rejects hash mismatch, tampered receipts and same-directory writes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ab-replay-hold-'));
 try{
  const s=setup(root);
  const a={studyDir:s.studyDir,outDir:path.join(root,'new'),expectedSha256:'0'.repeat(64)};
  assert.throws(()=>replaySavedSemanticStudy(a),/ORIGINAL_PROVENANCE_OR_BOUNDARY/);
  assert.equal(fs.existsSync(a.outDir),false);
  assert.throws(()=>replaySavedSemanticStudy({...a,expectedSha256:s.hash,
   outDir:path.join(s.studyDir,'inner')}),/OUTPUT_NOT_ISOLATED_OR_EXISTS/);
  const p=path.join(s.studyDir,'R190AB_RESULT.json'),v=JSON.parse(fs.readFileSync(p,'utf8'));
  v.worldWrites=1;fs.writeFileSync(p,JSON.stringify(v));
  assert.throws(()=>replaySavedSemanticStudy({...a,expectedSha256:s.hash}),
   /ORIGINAL_PROVENANCE_OR_BOUNDARY/);
  assert.equal(fs.existsSync(a.outDir),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('replay CLI accepts only strict absolute paths and pinned raw hash',()=>{
 assert.deepEqual(parseSavedSemanticReplayArgs(['--help']),{help:true});
 assert.throws(()=>parseSavedSemanticReplayArgs(['--study','relative',
  '--out','relative','--expected-sha','a'.repeat(64)]),/ARGS/);
 assert.throws(()=>parseSavedSemanticReplayArgs(['--study','/tmp/input',
  '--out','/tmp/output']),/ARGS/);
});

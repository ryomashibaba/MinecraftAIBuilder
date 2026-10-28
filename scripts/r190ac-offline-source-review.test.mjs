/** R190-AC fake-only, zero models, no file writes outside OS temp. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {sourceStructureDiagnostics,inspectSavedR190AC,
 parseR190ACArgs} from './r190ac-offline-source-review.mjs';
import {inspectR190ABReply,R190AB_FORMAT} from './r190ab-structured-output-pilot.mjs';
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
const here=path.dirname(fileURLToPath(import.meta.url));
const baseline=path.resolve(here,'../evidence/r190aa/pilot-01');
const old=fs.readFileSync(path.join(baseline,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0});
const fakeResult=(raw,reason='stop')=>{
 const inspected=inspectR190ABReply(raw,reason).report;
 return {schema:'minecraftaibuilder-r190ab-result-v1',
  pilot01OriginalSha256:sha(old),schemaSha256:sha(JSON.stringify(R190AB_FORMAT)),
  originalPromptSha256:sha('fake-request'),modelClaimed:'qwen3:14b',
  providerCallsAttempted:1,providerDoneReason:reason,
  noAutomaticRetry:true,noHostGeometryRepair:true,response:inspected,
  ...safe()};
};
const saved=(base,raw,receipt)=>{
 const p=path.join(base,'ab');fs.mkdirSync(p);
 fs.writeFileSync(path.join(p,'MODEL_RESPONSE_ORIGINAL.txt'),raw);
 fs.writeFileSync(path.join(p,'R190AB_RESULT.json'),JSON.stringify(receipt));
 fs.writeFileSync(path.join(p,'R190AB_ATTEMPT.json'),JSON.stringify({
  schemaSha256:receipt.schemaSha256,promptSha256:receipt.originalPromptSha256,
  modelRequested:receipt.modelClaimed, ...safe()}));
 return p;
};
test('AC old published Qwen original is cited by precise sha and shows six defects',()=>{
 assert.equal(Buffer.byteLength(old),2581);
 assert.equal(sha(old),'0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17');
 const x=sourceStructureDiagnostics(old);
 assert.equal(x.elementCount,9);
 assert.equal(x.addElements,6);
 assert.equal(x.cutElements,3);
 assert.deepEqual(x.topLevelExtraKeys,['attempt','maxAttempts']);
 assert.deepEqual(x.cutBoxesWithNoPrecedingAddBoxOverlap,['light-well']);
 assert.equal(x.violations.filter(z=>z.kind==='CUT_MATERIAL_PRESENT').length,3);
 assert.ok(x.violations.some(z=>z.kind==='STAIRCASE_AXIS_OR_MODE'&&z.axis==='y'));
 assert.ok(x.duplicateAddedBoxes.some(p=>p.includes('base')&&p.includes('storage-floor')));
 assert.deepEqual(x.declaredPointInsideAddBoxes.find(x=>x.id==='entrance')
  .addBoxesContainingPoint,['base','storage-floor']);
 assert.equal(x.structuralComplianceCertified,false);
});
test('AC saved invalid AB remains HOLD; no model call and no art winner',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ac-test-'));
 try{
  const ab=saved(root,'{"wrong":true}',fakeResult('{"wrong":true}'));
  const review=inspectSavedR190AC({abDir:ab,baselineDir:baseline});
  assert.equal(review.modelCalls,0);
  assert.equal(review.status,'OFFLINE_EVIDENCE_VERIFIED_ART_HOLD');
  assert.equal(review.format.newStrictB143,false);
  assert.equal(review.geometry.newVoxelCount,null);
  assert.equal(review.improvement.winner,'NOT_ESTABLISHED');
  assert.equal(review.worldWrites,0);
  assert.equal(review.gates.length,9);
  const again=inspectSavedR190AC({abDir:ab,baselineDir:baseline});
  assert.deepEqual(again,review);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AC rejects AB result with mismatching original sha without modifying it',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ac-test-'));
 try{
  const raw='{"bad":true}',r=fakeResult(raw);
  r.response.originalRawSha256='0'.repeat(64);
  const ab=saved(root,raw,r);
  const original=fs.readFileSync(path.join(ab,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
  assert.throws(()=>inspectSavedR190AC({abDir:ab,baselineDir:baseline}),
   /AB_RESULT_PROVENANCE_OR_SAFETY/);
  assert.equal(fs.readFileSync(path.join(ab,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),original);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AC refuses unsafe arguments and non-read-only artifacts',()=>{
 assert.deepEqual(parseR190ACArgs([]),{ab:path.resolve(here,'../r190ab-local-evidence/contract-01')});
 assert.deepEqual(parseR190ACArgs(['--help']),{help:true});
 assert.throws(()=>parseR190ACArgs(['--ab','../wrong']),/ARGS/);
 assert.throws(()=>parseR190ACArgs(['--run']),/ARGS/);
 assert.equal(sourceStructureDiagnostics('not-json').jsonValid,false);
 assert.equal(sourceStructureDiagnostics('{}').jsonValid,true);
});
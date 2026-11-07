import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {prepareBO} from './r190bo-spatial-local.mjs';
import {inspectOneModel,runOneModel,cliStaged} from './r190bo-one-model-gate.mjs';
test('staged gate reuses EXACT request and cannot send before separate consent',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190bo-stage-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const prepared=path.join(root,'prepared'),output=path.join(root,'output');
 const p=prepareBO({out:prepared,model:'qwen3:14b',schemaPrompt:'native-only',
  think:false,maxTokens:16384,contextTokens:32768});
 const before=fs.readFileSync(path.join(prepared,'EXACT_REQUEST.json'));
 const inspected=inspectOneModel(prepared);
 assert.equal(inspected.requestSha256,p.requestSha256);
 assert.equal(inspected.sourcePinsVerified,true);
 assert.equal(inspected.think,false);
 assert.equal(inspected.attemptConsumed,false);
 assert.equal(inspected.maxTokens,16384);
 assert.equal(inspected.modelCalls,0);
 let posts=0;
 await assert.rejects(runOneModel({prepared,approval:'',out:output},{transport:async()=>{posts++;throw Error('unsafe')}}),
  /NEW_EXACT_APPROVAL_REQUIRED/);
 await assert.rejects(cliStaged(['run','--prepared',prepared,'--out',output]),/EXACT_APPROVAL_AND_OUTPUT_REQUIRED/);
 assert.equal(posts,0);
 assert.equal(fs.existsSync(output),false);
 assert.equal(fs.existsSync(path.join(prepared,'ATTEMPT_CONSUMED.json')),false);
 assert.deepEqual(fs.readFileSync(path.join(prepared,'EXACT_REQUEST.json')),before);
});
test('only authorized Qwen transport is attempted once; on failure still writes private HOLD summary, no Gemma',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190bo-stage-run-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const prepared=path.join(root,'prepared'),out=path.join(root,'result');
 const p=prepareBO({out:prepared,model:'qwen3:14b',schemaPrompt:'native-only',think:false});
 let postCount=0;
 const report=await runOneModel({prepared,approval:p.approvalPhrase,out},{
  transport:async()=>{postCount++;throw Error('SIMULATED_NO_PROVIDER');}
 });
 assert.equal(postCount,1);
 assert.equal(report.providerPostAttempts,1);
 assert.equal(report.boStatus,'HOLD');
 assert.equal(report.nextModel,'NOT_RUN_SEPARATE_DECISION_REQUIRED');
 assert.equal(report.gitHubUpload,false);
 assert.equal(report.worldWrites,0);
 assert.equal(report.ceStatus,'NOT_RUN_NO_BO_CAPTURE');
 assert.ok(fs.existsSync(path.join(prepared,'ATTEMPT_CONSUMED.json')));
 assert.ok(fs.existsSync(path.join(out,'RESULT_SUMMARY.json')));
 await assert.rejects(runOneModel({prepared,approval:p.approvalPhrase,out:path.join(root,'again')}),
  /ATTEMPT_ALREADY_CONSUMED/);
});

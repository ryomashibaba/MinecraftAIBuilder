import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseB198HArgs,executeB198H}
 from './b198h-local-workflow.mjs';
import {runB198HBenchmark}
 from '../source/ai/b198h-model-benchmark.mjs';
import {compileDesign}
 from '../source/ai/b143-building-dsl.mjs';
import {fixtureAmphitheater,candidate}
 from './b198a-fixtures.mjs';

const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198h-source-'));
const prompt='未来型の公共図書館。周辺の公共床を保持し、展望ラウンジを追加する。';
const newSource=()=>{
 const d=fixtureAmphitheater();
 d.elements.push({
  id:'source-preserved-raised-lounge',shape:'box',mode:'add',
  material:'accent',origin:[44,32,37],size:[5,1,5]
 });
 return d;
};
const badSource=()=>{
 const d=newSource();
 d.elements.push({
  id:'new-blocking-ceiling',shape:'box',mode:'add',
  material:'glass',origin:[14,8,15],size:[8,2,8]
 });
 return d;
};

test('B198H CLI refuses implicit model spending and incompatible modes',()=>{
 assert.throws(()=>parseB198HArgs(['benchmark','--out','new']),
  /B198H_WORKFLOW_BENCHMARK_EXPLICIT_MODEL_AND_OUTPUT_REQUIRED/);
 assert.throws(()=>parseB198HArgs(['studio','--project','dir',
  '--endpoint','http:\/\/127.0.0.1:11434\/v1\/chat\/completions']),
 /B198H_WORKFLOW_ENDPOINT_WITHOUT_MODEL/);
 assert.throws(()=>parseB198HArgs(['benchmark','--local-model','my-local',
   '--out','next','--cases','13']),/B198H_WORKFLOW_BENCHMARK_CREATION_COUNT/);
 assert.throws(()=>parseB198HArgs(['studio','--project','dir',
  '--out','next']),/B198H_WORKFLOW_STUDIO_BENCHMARK_OPTION/);
 assert.throws(()=>parseB198HArgs(['benchmark','--local-model','my-local',
  '--out','new','--no-revisions','--no-revisions']),/B198H_WORKFLOW_INVALID_OR_REPEATED_/);
 const v=parseB198HArgs(['benchmark','--local-model','local-architect',
  '--out','new-directory']);
 assert.equal(v.creationCount,12);
 assert.equal(v.includeRevisions,true);
 const ro=parseB198HArgs(['studio','--project','dir']);
 assert.equal(ro.model,null);
 assert.equal(ro.port,0);
 assert.throws(()=>parseB198HArgs(['studio','--project','new',
  '--prompt','展望ラウンジのある建築を設計して']),
  /B198H_WORKFLOW_PROMPT_REQUIRES_EXPLICIT_MODEL/);
 assert.throws(()=>parseB198HArgs(['studio','--project','new',
  '--design','old.json','--prompt','未来建築を設計して',
  '--local-model','mock']),
  /B198H_WORKFLOW_PROMPT_AND_EXISTING_DESIGN_MUTUALLY_EXCLUSIVE/);
});

test('existing Studio is reused with draft review + explicit rejection, preserving approval and zero world actions',async()=>{
 const dir=temp();
 const sourceFile=path.join(dir,'original-source.json');
 fs.writeFileSync(sourceFile,JSON.stringify(fixtureAmphitheater()));
 const params=parseB198HArgs(['studio','--project',dir,'--design',sourceFile]);
 // Caller-injected generator is a TEST DOUBLE, not a claimed live model.
 const app=await executeB198H(params,{
  generator:async()=>candidate(newSource())
 });
 try{
  assert.equal(app.providerClassification,'INJECTED_TEST_DOUBLE');
  assert.equal(app.modelConnected,true);
  assert(app.url.startsWith('http://127.0.0.1:'));
  const html=await(await fetch(app.url)).text();
  assert(html.includes('b198d-approve'));
  assert(html.includes('b198d-undo'));
  assert(html.includes('b198d-comparison'));
  const original=(await(await fetch(app.url+'/api/status')).json());
  assert.equal(original.headId,'v0001');
  assert.equal(original.safety.worldWrites,0);
  assert.equal(original.approvedDesign.elements.length,8);
  const token=html.match(/const TOKEN="([a-f0-9]{64})"/)?.[1];
  assert(token);
  const headers={'Content-Type':'application/json',Origin:app.url,
   'X-B198D-CSRF':token};
  const req=await fetch(app.url+'/api/propose',{
   method:'POST',headers,body:JSON.stringify({prompt,protectedElementIds:[]})
  });
  assert.equal(req.status,200);
  const draft=(await(await fetch(app.url+'/api/status')).json());
  assert.equal(draft.headId,'v0001');
  assert(draft.proposedDraft);
  assert.equal(draft.proposedDraft.reviewStatus,
   'AWAITING_EXPLICIT_HUMAN_APPROVAL');
  const refused=await fetch(app.url+'/api/reject',{
   method:'POST',headers,
   body:JSON.stringify({draftId:draft.proposedDraft.id})
  });
  assert.equal(refused.status,200);
  const final=(await(await fetch(app.url+'/api/status')).json());
  assert.equal(final.headId,'v0001');
  assert.equal(final.proposedDraft,null);
  assert.equal(final.approvedHeadSha256,original.approvedHeadSha256);
  assert.equal(final.safety.BuildPlan.operations.length,0);
 }finally{await app.app.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('new Studio without a local model still has exactly the old read-only protections',async()=>{
 const dir=temp();
 try{
  const file=path.join(dir,'initial-source.json');
  fs.writeFileSync(file,JSON.stringify(fixtureAmphitheater()));
  const opt=parseB198HArgs(['studio','--project',
   path.join(dir,'studio'),'--design',file]);
  const process=await executeB198H(opt);
  try{
   const status=(await(await fetch(process.url+'/api/status')).json());
   assert.equal(process.modelConnected,false);
   assert.equal(status.requiresRealModel,true);
   assert.equal(status.safety.readiness,'NOT_PREPARED');
   assert.equal(status.safety.worldWrites,0);
  }finally{await process.app.close();}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('one original + one revised benchmark builds actual B143 snapshots, but all semantic grades stay unreviewed',async()=>{
 const dir=temp(),outDir=path.join(dir,'review');
 let called=0;
 try{
  const opt=parseB198HArgs(['benchmark','--local-model','test-double',
   '--out',outDir,'--cases','1']);
  const result=await executeB198H(opt,{
   generator:async args=>{
    called++;
    return candidate(args.mode==='creation'?fixtureAmphitheater():newSource());
   }
  });
  const r=result.report;
  assert.equal(result.worldWrites,0);
  assert.equal(r.providerOrigin,'INJECTED_TEST_DOUBLE');
  assert.equal(r.modelId,'test-double');
  assert.equal(r.requiredAll16Executed,false);
  assert.equal(r.expectedFrozenCaseCount,16);
  assert.equal(r.modelGeneratorInvocations,2);
  assert.equal(called,2);
  assert.equal(r.successfullyCompiledCaseCount,2);
  assert.equal(r.humanSemanticReviewCompleted,0);
  assert.equal(r.humanAestheticReviewCompleted,0);
  assert.equal(r.finalStatus,'INCOMPLETE_SOURCE_BENCHMARK_HOLD');
  assert.equal(r.cases.filter(c=>c.status==='NOT_RUN').length,14);
  assert.equal(r.cases.find(c=>c.caseId==='r01').sourceReview
   .inheritedGeometryProtection.exactOriginalGeometryAndClearancePreserved,true);
  assert.equal(r.cases.find(c=>c.caseId==='c01').humanSemantics,'UNREVIEWED');
  assert.equal(r.world.worldWrites,0);
  assert(r.world.gates.every(g=>g==='BLOCKED'));
  assert.equal(r.world.BuildPlan.operations.length,0);
  const saved=JSON.parse(fs.readFileSync(
   path.join(outDir,'B198H_INDEPENDENT_SOURCE_EVIDENCE.json'),'utf8'));
  assert.deepEqual(saved,r);
  assert.equal(compileDesign(JSON.parse(fs.readFileSync(
    path.join(outDir,'c01','source-design.json'),'utf8'))).primitives.length>0,true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('destructive later add cannot be credited as a safe revision, even if source element IDs remain intact',async()=>{
 const dir=temp(),outDir=path.join(dir,'guarded-review');
 try{
  const r=await runB198HBenchmark({
   provider:async p=>candidate(p.mode==='creation'?fixtureAmphitheater():badSource()),
   outDir,modelId:'test-double',creationCount:1,includeRevisions:true,
   providerOrigin:'INJECTED_TEST_DOUBLE'
  });
  const report=r.report;
  assert.equal(report.revisionRequestsRefusedBySourceGuard,1);
  assert.equal(report.successfullyCompiledCaseCount,1);
  assert.equal(report.cases.find(x=>x.caseId==='r01').status,'MODEL_OR_SOURCE_HOLD');
  assert.equal(report.cases.find(x=>x.caseId==='r01').actualCompiledEvidence,null);
  assert.equal(report.finalStatus,'INCOMPLETE_SOURCE_BENCHMARK_HOLD');
  assert.equal(report.world.worldWrites,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('benchmark run refuses existing directory before invoking any generator',async()=>{
 const dir=temp();
 let calls=0;
 try{
  await assert.rejects(runB198HBenchmark({
   provider:async()=>{calls++;return candidate(fixtureAmphitheater());},
   outDir:dir,modelId:'test-double'
  }),/B198H_REFUSE_EXISTING_OUTPUT/);
  assert.equal(calls,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test('one Japanese instruction creates initial exact source and opens live draft-review Studio in one call, without replacing history',async()=>{
 const dir=temp(),project=path.join(dir,'one-command-studio');
 let calls=0;
 const good=fixtureAmphitheater();
 good.elements=[{id:'large-original-public-floor',shape:'box',mode:'add',
  material:'stone',origin:[6,3,6],size:[22,1,22]}];
 const opts=parseB198HArgs(['studio','--project',project,
  '--prompt','大きな床を持つ明るい建築を作り、のちほど自分で修正したい',
  '--local-model','test-provider']);
 const provider=async req=>{
  calls++;
  assert.equal(req.mode,'creation');
  return candidate(good);
 };
 try{
  const produced=await executeB198H(opts,{generator:provider});
  try{
   assert.equal(produced.modelConnected,true);
   assert.equal(produced.initialSourceReport.status,
    'SOURCE_CANDIDATE_REVIEW_REQUIRED');
   assert.equal(produced.initialSourceReport.finalHighRiskCount,0);
   assert.equal(calls,1);
   assert.equal(produced.initialSourceReport.world.worldWrites,0);
   const status=await(await fetch(produced.url+'/api/status')).json();
   assert.equal(status.headId,'v0001');
   assert.equal(status.approvedDesign.elements.length,1);
   assert.equal(status.proposedDraft,null);
   assert.equal(status.requiresRealModel,false);
   assert.equal(status.safety.readiness,'NOT_PREPARED');
   const evidence=JSON.parse(fs.readFileSync(path.join(project,
    'B198H_INITIAL_MODEL_SOURCE_REVIEW.json'),'utf8'));
   assert.equal(evidence.sourceSha256,status.approvedHeadSha256);
   await assert.rejects(executeB198H(opts,{generator:provider}),
    /B198H_WORKFLOW_PROMPT_REQUIRES_NEW_EMPTY_PROJECT/);
   assert.equal(calls,1);
   assert.equal((await(await fetch(produced.url+'/api/status')).json())
    .approvedHeadSha256,status.approvedHeadSha256);
  }finally{await produced.app.close();}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

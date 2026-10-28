/** R190-AJ uses ONLY injected fake local provider data and synthetic sources. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {plainFixtures,jointWindowFixture} from './r190ag-synthetic-fixtures.mjs';
import {R190AJ_SYSTEM_GUIDE,reviewR190AJOriginal,preflightR190AJBrief,
 createR190AJLocalIntentAdapter} from '../source/ai/r190aj-model-intent-adapter.mjs';
const brief='来場者用展示ホールと制作工房、倉庫がある公共建築を設計してください。';
const sample=()=>plainFixtures()[1];
const raw=()=>JSON.stringify(sample());
const sha=s=>createHash('sha256').update(s).digest('hex');
const safe=r=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
 assert.equal(r.art,'ART_HOLD');
};
test('AJ guide uses AF daylight intents and deliberately authored geometry',()=>{
 assert.match(R190AJ_SYSTEM_GUIDE,/Never add offset or baseY/);
 assert.match(R190AJ_SYSTEM_GUIDE,/PURPOSE and PRIVACY fields are labels/);
 assert.match(R190AJ_SYSTEM_GUIDE,/parentId, side and optional additionalPassages/);
 assert.equal(preflightR190AJBrief(brief).unsupported.length,0);
 assert(preflightR190AJBrief('鋸歯屋根の工房を必ず設ける公共建築').detected
  .some(x=>x.capability==='roof-profile-design'));
});
test('AJ preserves original source and exposes metadata-only contrast',()=>{
 const original=raw(),r=reviewR190AJOriginal(original,{brief,maxLayoutVariantsPerStrategy:2});
 assert.equal(r.originalRaw,original);assert.equal(r.receipt.originalSha256,sha(original));
 assert.equal(r.receipt.status,'PROVISIONAL_B143_NO_ART_APPROVAL');
 assert.equal(r.ag.baseline.audit.allProgramSpacesReachable,true);
 assert.equal(r.receipt.geometryExpressesPurpose,'NOT_CERTIFIED');
 assert.equal(r.receipt.geometryExpressesPrivacy,'NOT_CERTIFIED');
 const alt=sample();alt.root.purpose='Alternate cultural program';
 alt.root.privacy='private';
 const contrast=reviewR190AJOriginal(JSON.stringify(alt),{brief});
 assert.equal(contrast.ag.baseline.compiled.geometrySha256,
  r.ag.baseline.compiled.geometrySha256);
 safe(r.receipt);safe(contrast.receipt);
});
test('AJ joint window proof remains explicitly UNAPPROVED',()=>{
 const r=reviewR190AJOriginal(JSON.stringify(jointWindowFixture()),{brief});
 assert.equal(r.receipt.status,'HOLD_UNAPPROVED_B143_PROPOSALS');
 assert(r.receipt.unapprovedB143ProposalCount>0);
 assert.equal(r.ag.proposals[0].trial.audit.realGlazingCells,12);
 assert.equal(r.receipt.proposalApproved,false);safe(r.receipt);
});
test('AJ refuses roof loss without host semantic repair',()=>{
 const r=reviewR190AJOriginal(raw(),{brief:'鋸歯屋根の工房を必ず設ける公共建築'});
 assert.equal(r.receipt.status,'HOLD_ORIGINAL_INTENT');
 assert.equal(r.receipt.reason,'EXPLICIT_ROOF_LOST');
 assert.equal(r.ag,null);safe(r.receipt);
});
test('AJ requires explicit consent and injected fake fetcher, one call only',async()=>{
 assert.throws(()=>createR190AJLocalIntentAdapter({model:'qwen3:14b'}),
  /EXPLICIT_FETCHER_REQUIRED/);
 assert.throws(()=>createR190AJLocalIntentAdapter({model:'qwen3:14b',
  endpoint:'https://example.com/v1/chat/completions',fetcher:async()=>{}}),
  /LOCALHOST_ONLY/);
 let calls=0,archived=null;
 const run=createR190AJLocalIntentAdapter({model:'mock-qwen',
  onRawModelResponse:(s,meta)=>{archived={s,meta};},
  fetcher:async(url,opts)=>{
   calls++;assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
   const input=JSON.parse(opts.body);
   assert.match(input.messages[0].content,/daylightIntents/);
   return {ok:true,json:async()=>({choices:[{finish_reason:'stop',
    message:{content:raw()}}]})};
  }});
 await assert.rejects(()=>run({brief}),/NEW_CONSENT_REQUIRED/);
 assert.equal(calls,0);
 const result=await run({brief,consentToOneModelCall:true});
 assert.equal(calls,1);assert.equal(archived.s,raw());
 assert.equal(archived.meta.finishReason,'stop');
 assert.equal(result.receipt.modelCallsInRequest,1);safe(result.receipt);
});
test('AJ preflight blocks explicit unsupported levels BEFORE provider request',async()=>{
 const prompt='2階建てで階段が必要な建物を設計してください。';
 assert(preflightR190AJBrief(prompt).unsupported.length>0);
 let calls=0;
 const run=createR190AJLocalIntentAdapter({model:'fake-qwen',fetcher:async()=>{calls++;}});
 const r=await run({brief:prompt,consentToOneModelCall:true});
 assert.equal(r.receipt.status,'HOLD_UNSUPPORTED_EXPLICIT_BRIEF');
 assert.equal(r.receipt.modelCalls,0);assert.equal(calls,0);safe(r.receipt);
});
test('AJ preserves malformed original and truncated original, no invented B143',async()=>{
 const bad='{"schema":"invalid"}';
 for(const reason of ['stop','length']){
  let calls=0,original=null;
  const run=createR190AJLocalIntentAdapter({model:'fake-qwen',
   onRawModelResponse:s=>{original=s;},
   fetcher:async()=>{calls++;return {ok:true,json:async()=>({choices:[{
    finish_reason:reason,message:{content:bad}}]})};}});
  const r=await run({brief,consentToOneModelCall:true});
  assert.equal(calls,1);assert.equal(original,bad);
  assert.equal(r.originalRaw,bad);assert.equal(r.ag,null);
  assert.equal(r.receipt.status,reason==='length'?
   'HOLD_TRUNCATED_MODEL_RESPONSE':'HOLD_ORIGINAL_INTENT');
  safe(r.receipt);
 }
});
test('AJ rejects malformed budgets, raw input and any world-write claims',()=>{
 assert.throws(()=>reviewR190AJOriginal(raw(),{maxLayoutVariantsPerStrategy:8}),
  /LAYOUT_BUDGET/);
 for(const original of ['{',null,'x'.repeat(120001)]){
  const r=reviewR190AJOriginal(original);
  assert.equal(r.ag,null);assert.equal(r.receipt.status,'HOLD_ORIGINAL_INTENT');
  safe(r.receipt);
 }
});

const validProgram=()=>({requiredProgram:[
 {label:'arrival',purposeFragment:'Public display',privacy:'public'},
 {label:'production',purposeFragment:'Workshop for making',privacy:'shared'},
 {label:'receiving',purposeFragment:'Stock receiving',privacy:'private'}
],requiredDirectConnections:[['arrival','production'],['production','receiving']]});
test('AK independent author-supplied program is verified in actual B143 portals and voxels',()=>{
 const spec=validProgram(),original=raw();
 const result=reviewR190AJOriginal(original,{brief,acceptanceSpec:spec});
 assert.equal(result.receipt.originalSha256,sha(original));
 assert.equal(result.receipt.status,'PROVISIONAL_B143_NO_ART_APPROVAL');
 assert.equal(result.receipt.independentProgramReview.status,
  'VERIFIED_EXPLICIT_PROGRAM_IN_B143');
 assert.equal(result.receipt.independentProgramReview.independentlyVerified,true);
 assert.equal(result.receipt.independentProgramReview.requirementsCount,5);
 assert.equal(result.receipt.independentProgramReview.sourceChecks.length,1);
 const physical=result.receipt.independentProgramReview.sourceChecks[0];
 assert.equal(physical.status,'VERIFIED_EXPLICIT_PROGRAM_IN_B143');
 assert.equal(physical.directConnections.length,2);
 assert(physical.directConnections.every(e=>e.compiledPortal));
 assert.equal(result.receipt.proposalApproved,false);
 assert.deepEqual(spec,validProgram());
 safe(result.receipt);
});
test('AK catches missing purpose, mismatched privacy and absent direct adjacency',()=>{
 const variants=[
  p=>{p.children[1].purpose='Generic stock room';},
  p=>{p.children[1].privacy='public';},
  p=>{p.children[1].parentId='showroom';p.children[1].side='east';}
 ];
 for(const mutate of variants){
  const p=sample();mutate(p);
  const original=JSON.stringify(p);
  const r=reviewR190AJOriginal(original,{brief,acceptanceSpec:validProgram()});
  assert.equal(r.receipt.status,'HOLD_UNSATISFIED_EXPLICIT_PROGRAM');
  assert.equal(r.receipt.independentProgramReview.status,'FAILED');
  assert(r.receipt.independentProgramReview.semanticIssues.length>0);
  assert.equal(r.ag,null,'No host rearrangement to hide missing model intent');
  assert.equal(r.originalRaw,original);
  safe(r.receipt);
 }
});
test('AK checks only fully realized glass trials when daylight is requested',()=>{
 const original=JSON.stringify(jointWindowFixture());
 const spec={requiredProgram:[
  {label:'arrival',purposeFragment:'Public display'},
  {label:'production',purposeFragment:'Workshop for making'}
 ],requiredDirectConnections:[['arrival','production']]};
 const r=reviewR190AJOriginal(original,{brief,acceptanceSpec:spec});
 assert.equal(r.receipt.status,'HOLD_UNAPPROVED_B143_PROPOSALS');
 assert(r.ag.proposals.length>0);
 assert.equal(r.receipt.independentProgramReview.status,
  'VERIFIED_EXPLICIT_PROGRAM_IN_B143');
 assert.equal(r.receipt.independentProgramReview.sourceChecks.length,r.ag.proposals.length);
 assert(r.receipt.independentProgramReview.sourceChecks.every(x=>
  x.status==='VERIFIED_EXPLICIT_PROGRAM_IN_B143'));
 safe(r.receipt);
});
test('AK malformed independent acceptance constraints are blocked before model call',async()=>{
 const invalid={requiredProgram:[{label:'arr',purposeFragment:'Public display'}],
  requiredDirectConnections:[['arr','nonexistent']]};
 let calls=0;
 const run=createR190AJLocalIntentAdapter({model:'fake-qwen',
  fetcher:async()=>{calls++;throw Error('provider should not be reached');}});
 await assert.rejects(()=>run({brief,consentToOneModelCall:true,
  acceptanceSpec:invalid}),/R190_REQUEST_COVERAGE_EDGE/);
 assert.equal(calls,0);
 assert.throws(()=>reviewR190AJOriginal(raw(),{acceptanceSpec:invalid}),
  /R190_REQUEST_COVERAGE_EDGE/);
});
test('AK a consented FAKE call keeps acceptance spec out of model prompt',async()=>{
 const spec=validProgram();let calls=0,observed=null;
 const run=createR190AJLocalIntentAdapter({model:'mock-qwen',
  fetcher:async(url,options)=>{
   calls++;
   observed=JSON.parse(options.body);
   return {ok:true,json:async()=>({choices:[{finish_reason:'stop',
    message:{content:raw()}}]})};
  }});
 const r=await run({brief,consentToOneModelCall:true,acceptanceSpec:spec});
 assert.equal(calls,1);
 assert(!JSON.stringify(observed).includes('purposeFragment'));
 assert.equal(r.receipt.independentProgramReview.status,
  'VERIFIED_EXPLICIT_PROGRAM_IN_B143');
 assert.equal(r.receipt.modelCallsInRequest,1);
 assert.equal(r.receipt.sourceAuthorUnverified,true);
 safe(r.receipt);
});

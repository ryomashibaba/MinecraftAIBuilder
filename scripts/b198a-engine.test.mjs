import test from 'node:test';import assert from 'node:assert/strict';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {proposeArchitecture,readModelProposal,validateB198Review}
 from '../source/ai/b198-natural-language-design.mjs';
import {createB198OpenAIAdapter,B198_MODEL_RESPONSE_ENVELOPE}
 from '../source/ai/b198-openai-provider.mjs';
import {fixtureAmphitheater,fixtureLighthouse,candidate} from './b198a-fixtures.mjs';
const fixed=d=>async()=>candidate(d);
test('distinct genre-independent REAL authored DSL proposals compile unique 3D forms; fixtures are NOT live NLP',async()=>{
 const a=await proposeArchitecture({prompt:'三段客席とガラス舞台の野外劇場を設計して',generator:fixed(fixtureAmphitheater())});
 const b=await proposeArchitecture({prompt:'展望球体と惑星リングの灯台を設計して',generator:fixed(fixtureLighthouse())});
 assert(a.compiled.primitives.length>1000&&b.compiled.primitives.length>1000);
 assert.notEqual(a.compiled.geometrySha256,b.compiled.geometrySha256);
 assert.notDeepEqual(a.design.elements.map(x=>x.shape),b.design.elements.map(x=>x.shape));
 assert.equal(a.review.action,'creation');assert.equal(b.review.action,'creation');
 assert(validateB198Review(a.review));assert(validateB198Review(b.review));
 assert.equal(a.review.semanticComplianceNotAutomaticallyCertified,true);
 assert.deepEqual(b.review.safety.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(b.review.safety.BuildPlan.operations,[]);
});
test('real atomic revision preserves protected geometry and does NOT mutate original authored input',async()=>{
 const before=fixtureAmphitheater(),copy=structuredClone(before);
 const after=structuredClone(before);after.elements[5].majorRadius=11;
 after.elements.push({id:'moonlit-balcony',shape:'box',mode:'add',
  origin:[14,28,31],size:[32,1,6],material:'glow'});
 const res=await proposeArchitecture({prompt:'ステージの光を大きく、後方に輝くバルコニーを追加',
  generator:fixed(after),baseDesign:before,
  expectedBaseSha256:compileDesign(before).sourceSha256,
  protectedElementIds:['main-limestone-court','middle-audience-deck'],
  maxChangedElements:5});
 assert.deepEqual(before,copy);
 assert.equal(res.review.action,'revision');
 assert.deepEqual(res.review.revisionDiff.added,['moonlit-balcony']);
 assert.deepEqual(res.review.revisionDiff.changed,['stage-light-halo']);
 assert.deepEqual(res.review.revisionDiff.removed,[]);
 assert.equal(res.review.revisionDiff.totalTouched,2);
 assert.notEqual(res.compiled.geometrySha256,compileDesign(before).geometrySha256);
});
test('missing true adapter, brief prompt and stale source SHA fail closed',async()=>{
 const base=fixtureAmphitheater();
 await assert.rejects(()=>proposeArchitecture({prompt:'Please alter the original roof glass',
  baseDesign:base,expectedBaseSha256:'0'.repeat(64),generator:fixed(base)}),
  /B198A_STALE_REVISION_REJECTED/);
 await assert.rejects(()=>proposeArchitecture({prompt:'Make a vast palace of glass'}),/B198A_ACTUAL_MODEL_ADAPTER_REQUIRED/);
 await assert.rejects(()=>proposeArchitecture({prompt:'castle',generator:fixed(base)}),/B198A_INVALID_NATURAL_LANGUAGE_PROMPT/);
});
test('invalid geometry is rejected and actionable feedback repairs next MODEL attempt',async()=>{
 const valid=fixtureLighthouse(),bad=structuredClone(valid);
 bad.elements[0].material='minecraft:command_block';
 let count=0,last;
 const res=await proposeArchitecture({prompt:'A tall glass observatory with internal viewing levels',
  generator:async({feedback,attempt})=>{
   count++;last={feedback,attempt};return candidate(count===1?bad:valid);
  }});
 assert.equal(count,2);assert.equal(last.feedback.length,1);
 assert.match(last.feedback[0].reason,/B143_MATERIAL/);
 assert.equal(res.review.attemptCount,2);
 assert.equal(res.review.failedAttempts.length,1);
 await assert.rejects(()=>proposeArchitecture({prompt:'A tall glass observatory with internal viewing levels',
  generator:fixed(bad)}),/B198A_CANDIDATE_REJECTED_AFTER_2_ATTEMPTS/);
});
test('untrusted model cannot insert commands, extra fields, world approval or JavaScript',()=>{
 const p=candidate(fixtureLighthouse());assert(readModelProposal(p));
 for(const bad of [
  {...p,commands:['fill 0 0 0 100 0 0']},
  {...p,design:{...p.design,constructionApproved:true}},
  {...p,design:{...p.design,BuildPlan:{operations:[{cmd:'fill'}]}}},
  {...p,design:{...p.design,worldCoordinates:[1,2,3]}},
  {...p,design:{...p.design,designOnly:false}},
  {...p,design:{...p.design,elements:[...p.design.elements,{id:'run-js',shape:'javascript',mode:'add',material:'stone'}]}}
 ])assert.throws(()=>readModelProposal(bad));
 assert.throws(()=>readModelProposal('not JSON'),/B198A_MODEL_RESPONSE_NOT_JSON/);
});
test('unauthorized removal, protected edit, too many edits and shrinking bounds are all rejected',async()=>{
 const base=fixtureAmphitheater(),digest=compileDesign(base).sourceSha256;
 const check=(d,options={})=>proposeArchitecture({prompt:'Update the building without damaging its support',
  baseDesign:base,expectedBaseSha256:digest,generator:fixed(d),...options});
 const remove=structuredClone(base);remove.elements.splice(0,1);
 await assert.rejects(()=>check(remove),/B198A_CANDIDATE_REJECTED_AFTER_2_ATTEMPTS/);
 const protectedEdit=structuredClone(base);protectedEdit.elements[0].size[0]-=3;
 await assert.rejects(()=>check(protectedEdit,{protectedElementIds:['main-limestone-court']}),
  /B198A_CANDIDATE_REJECTED_AFTER_2_ATTEMPTS/);
 const smaller=structuredClone(base);smaller.bounds.width-=2;
 await assert.rejects(()=>check(smaller),/B198A_CANDIDATE_REJECTED_AFTER_2_ATTEMPTS/);
 const budget=structuredClone(base);budget.elements[0].size[0]-=3;budget.elements[1].size[0]-=3;
 await assert.rejects(()=>check(budget,{maxChangedElements:1}),
  /B198A_CANDIDATE_REJECTED_AFTER_2_ATTEMPTS/);
});
test('offline geometry tests cannot certify real language understanding; user review mandatory',async()=>{
 const r=await proposeArchitecture({prompt:'An ornate Japanese temple surrounded by torii gates',
  generator:fixed(fixtureLighthouse())});
 assert.equal(r.design.id,'glass-observatory-tower');
 assert.equal(r.review.semanticComplianceNotAutomaticallyCertified,true);
 assert.equal(r.review.sourceOnlyHumanReviewRequired,true);
 assert.equal(r.review.actualMinecraftPlacementNotCertified,true);
});
test('real model provider makes strict outer Responses request and never logs/stores secret',async()=>{
 const secret='sk-b198a-unit-test-not-real';let call;
 const backend=createB198OpenAIAdapter({apiKey:secret,model:'test-model',
  fetcher:async(url,opts)=>{
   call={url,opts};return {ok:true,status:200,json:async()=>({
    status:'completed',output:[{type:'message',content:[
     {type:'output_text',text:JSON.stringify({proposal_json:JSON.stringify(candidate(fixtureLighthouse()))})}
    ]}]})};
  }});
 const res=await proposeArchitecture({prompt:'Build an orbital glass museum with telescope decks',generator:backend});
 assert.equal(res.review.attemptCount,1);
 assert.equal(call.url,'https://api.openai.com/v1/responses');
 const args=JSON.parse(call.opts.body);
 assert.equal(args.store,false);assert.equal(args.model,'test-model');
 assert.deepEqual(args.text.format,B198_MODEL_RESPONSE_ENVELOPE);
 assert(!call.opts.body.includes(secret));
 assert.equal(call.opts.headers.Authorization,'Bearer '+secret);
 const rejectBackend=createB198OpenAIAdapter({apiKey:secret,model:'test-model',fetcher:async()=>({ok:false,status:401})});
 await assert.rejects(()=>proposeArchitecture({prompt:'Make a vast orbital glass tower',generator:rejectBackend}),
  e=>e.message.includes('B198A_PROVIDER_HTTP_401')&&!e.message.includes(secret));
});
test('all safety gates fail-closed against spoofed Minecraft execution report',async()=>{
 const r=(await proposeArchitecture({prompt:'Build a tall observatory lighthouse of glass',
  generator:fixed(fixtureLighthouse())})).review;
 for(const mutate of [
  x=>x.safety.constructionApproved=true,x=>x.safety.executionAllowed=true,
  x=>x.safety.worldWrites=1,x=>x.safety.worldContacts=1,
  x=>x.safety.worldCoordinates=[0,60,0],x=>x.safety.gates[0]='PASS',
  x=>x.safety.BuildPlan.operations.push({cmd:'fill'}),
  x=>x.semanticComplianceNotAutomaticallyCertified=false,
  x=>x.actualMinecraftPlacementNotCertified=false]){
  const wrong=structuredClone(r);mutate(wrong);
  assert.equal(validateB198Review(wrong),false);
 }
});

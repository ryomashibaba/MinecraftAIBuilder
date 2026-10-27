import test from 'node:test';
import assert from 'node:assert/strict';
import {R190_STATIC_SYNTHETIC_CASES}
 from './r190-semantic-fixtures.mjs';
import {readR190ModelProposal,R190_MODEL_PROPOSAL_SCHEMA}
 from '../source/ai/r190-model-proposal.mjs';
import {createR190SemanticModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
const base=()=>({schema:R190_MODEL_PROPOSAL_SCHEMA,
 semanticPlan:structuredClone(R190_STATIC_SYNTHETIC_CASES[1]),
 architecturalRationale:'Public showroom faces entry with service rooms behind.',
 assumptions:['A flat site is assumed'],
 unrepresentedRequirements:[]});
const raw=()=>JSON.stringify(base());
test('R190-F synthetic MODEL-SHAPED fixture generates one bounded source only',()=>{
 const original=raw(),r=readR190ModelProposal(original);
 assert.equal(r.status,'SOURCE_VERIFIED_ART_HOLD');
 assert.equal(r.modelProposal.semanticPlan.spaces.length,4);
 assert.equal(r.sourceResult.layoutStrategy,'centered');
 assert.ok(r.sourceResult.trueB143Voxels>1000);
 assert.equal(r.sourceResult.realSourceRouteAudit.allProgramSpacesReachable,true);
 assert.equal(r.responseSha256.length,64);
 assert.equal(r.hostFilledRoomGeometry,false);
 assert.equal(r.hostFilledRoomTopology,false);
 assert.equal(r.modelIdentityCryptographicallyVerified,false);
 assert.equal(r.actualProviderCallsByContract,0);
 assert.equal(r.humanArtReview,'ART_HOLD');
 assert.equal(r.minecraftPlayerWalking,'NOT_TESTED');
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.executionAllowed,false);
 assert.equal(r.constructionApproved,false);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.worldWrites,0);assert.equal(r.worldContacts,0);
 assert.equal(original,raw());
});
test('R190-F forced unsupported levels or vertical access HOLD; no silent flattening',()=>{
 const p=base();p.unrepresentedRequirements=['stairs','multiple-levels'];
 let r=readR190ModelProposal(JSON.stringify(p));
 assert.equal(r.status,'HOLD_UNREPRESENTABLE_REQUIREMENTS');
 assert.equal(r.sourceGenerated,false);assert.equal(r.sourceResult,null);
 assert.deepEqual(r.blockers,['stairs','multiple-levels']);
 assert.deepEqual(r.BuildPlan.operations,[]);
 p.unrepresentedRequirements=[];
 r=readR190ModelProposal(JSON.stringify(p),
  {requiredCapabilities:['multiple-levels','stairs']});
 assert.equal(r.status,'HOLD_UNREPRESENTABLE_REQUIREMENTS');
 assert.deepEqual(r.modelOmittedUnsupportedRequirements,['multiple-levels','stairs']);
 assert.equal(r.sourceGenerated,false);
});
test('R190-F no host completion, no extra keys, unknown capabilities, commands or geometry',()=>{
 const a=base();delete a.semanticPlan.spaces[1].width;
 assert.throws(()=>readR190ModelProposal(JSON.stringify(a)),/R190_SEMANTIC_SPACE/);
 const b=base();b.runCommand='/fill';
 assert.throws(()=>readR190ModelProposal(JSON.stringify(b)),/RESPONSE_FIELDS/);
 const c=base();c.semanticPlan.worldCommand='/setblock';
 assert.throws(()=>readR190ModelProposal(JSON.stringify(c)),/R190_SEMANTIC_FIELDS/);
 const d=base();d.unrepresentedRequirements=['multi-level-fake'];
 assert.throws(()=>readR190ModelProposal(JSON.stringify(d)),/UNKNOWN_OR_DUPLICATE_CAPABILITY/);
 const e=base();e.unrepresentedRequirements=['single-level-rooms'];
 assert.throws(()=>readR190ModelProposal(JSON.stringify(e)),/FALSE_UNREPRESENTABLE/);
 const f=base();f.semanticPlan.spaces[2].side='teleport';
 assert.throws(()=>readR190ModelProposal(JSON.stringify(f)),/R190_SEMANTIC_RELATION/);
 assert.throws(()=>readR190ModelProposal(' ```json '+raw()),/INVALID_JSON/);
});
test('R190-F mocked LOCAL HTTP transport is not counted as verified real LLM',async()=>{
 const captures=[];
 const fetcher=async(url,request)=>{
  captures.push({url,request});
  return {ok:true,json:async()=>({choices:[
   {finish_reason:'stop',message:{content:raw()}}]})};
 };
 const model=createR190SemanticModelAdapter({
  model:'mock-qwen',fetcher,timeoutMs:4000});
 const r=await model({prompt:'Design an original publicly accessible community shop.'});
 assert.equal(r.status,'SOURCE_VERIFIED_ART_HOLD');
 assert.equal(captures.length,1);
 assert.equal(captures[0].url,'http://127.0.0.1:11434/v1/chat/completions');
 const packet=JSON.parse(captures[0].request.body);
 assert.equal(packet.stream,false);
 assert.equal(packet.model,'mock-qwen');
 assert.match(packet.messages[0].content,/R190/);
 assert.equal(r.actualProviderCallsByContract,0);
 assert.equal(r.modelIdentityCryptographicallyVerified,false);
 assert.throws(()=>createR190SemanticModelAdapter({
  model:'safe',endpoint:'https://example.com/v1/chat/completions'}),
  /ONLY_EXPLICIT_127_0_0_1/);
 const truncated=createR190SemanticModelAdapter({
  model:'mock-qwen',fetcher:async()=>({ok:true,json:async()=>({
   choices:[{finish_reason:'length',message:{content:raw()}}]})})});
 await assert.rejects(()=>truncated({prompt:'A realistic cultural center building.'}),
  /TRUNCATED/);
});

test('R190-K explicit roof request is model-authored, physical and not silently substituted',()=>{
 const p=base();
 p.semanticPlan.roofFormIntent={spaceId:'showroom',profile:'sawtooth',
  axis:'x',rise:4,toothWidth:5};
 const r=readR190ModelProposal(JSON.stringify(p),{
  requestText:'鋸歯状の屋根を持つ公共工房を設計してください'});
 assert.equal(r.status,'SOURCE_VERIFIED_ART_HOLD');
 assert.equal(r.sourceGenerated,true);
 assert.equal(r.sourceResult.realSourceRouteAudit.roofForm.profile,'sawtooth');
 assert.equal(r.modelChosenPaths.includes('semanticPlan.roofFormIntent'),true);
 assert.equal(r.blockers.includes('roof-profile-design'),false);
 assert.equal(r.sourceResult.realSourceRouteAudit.roofForm.achievedRise,4);
 assert.equal(r.worldWrites,0);
 let wrong=structuredClone(p);
 wrong.semanticPlan.roofFormIntent.profile='ridge';
 delete wrong.semanticPlan.roofFormIntent.toothWidth;
 let h=readR190ModelProposal(JSON.stringify(wrong),{
  requestText:'鋸歯状の屋根を持つ公共工房を設計してください'});
 assert.equal(h.status,'HOLD_UNSATISFIED_EXPLICIT_ROOF_PROFILE');
 assert.equal(h.expectedExplicitRoofProfile,'sawtooth');
 assert.equal(h.sourceGenerated,false);
 delete wrong.semanticPlan.roofFormIntent;
 h=readR190ModelProposal(JSON.stringify(wrong),{
  requiredCapabilities:['roof-profile-design']});
 assert.equal(h.status,'HOLD_UNSATISFIED_EXPLICIT_ROOF_PROFILE');
 assert.equal(h.sourceGenerated,false);
 wrong.unrepresentedRequirements=['roof-profile-design'];
 assert.throws(()=>readR190ModelProposal(JSON.stringify(wrong)),
  /FALSE_UNREPRESENTABLE_SUPPORTED_CAPABILITY/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
import {readR190ModelProposal,R190_MODEL_PROPOSAL_SCHEMA}
 from '../source/ai/r190-model-proposal.mjs';
import {scanR190ExplicitBriefCapabilities,validateR190ProgramSpec}
 from '../source/ai/r190-request-coverage.mjs';
import {createR190SemanticModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';

const model=()=>({schema:R190_MODEL_PROPOSAL_SCHEMA,
 semanticPlan:structuredClone(R190_STATIC_SYNTHETIC_CASES[1]),
 architecturalRationale:'Public showroom leads to a workshop and a private stock room.',
 assumptions:['Flat site assumed'],unrepresentedRequirements:[]});
const program=()=>({requiredProgram:[
 {label:'arrival',purposeFragment:'public display',privacy:'public'},
 {label:'making',purposeFragment:'making goods',privacy:'shared'},
 {label:'stock',purposeFragment:'stock receiving',privacy:'private'}
],requiredDirectConnections:[['arrival','making'],['making','stock']]});
test('G: explicit Japanese/English multilevel request cannot be silently flattened',()=>{
 for(const prompt of ['2階建ての小さな図書館と階段を設計して',
  'Design a two-story cultural center with a stairway',
  '複数階で吹き抜けのある公共ギャラリーを設計して']){
  const a=readR190ModelProposal(JSON.stringify(model()),{requestText:prompt});
  assert.equal(a.status,'HOLD_UNREPRESENTABLE_REQUIREMENTS');
  assert.equal(a.sourceGenerated,false);
  assert.ok(a.independentlyDetectedBriefCapabilities.length>0);
  assert.equal(a.worldWrites,0);assert.deepEqual(a.BuildPlan.operations,[]);
 }
 assert.equal(scanR190ExplicitBriefCapabilities(
  '図書館に片流れ屋根を設計して').at(0).capability,'roof-profile-design');
});
test('G: an unknown functional program is verified against real B143 room source',()=>{
 const spec=program();
 const result=readR190ModelProposal(JSON.stringify(model()),{
  requestText:'Build a public display hall, workshop and stock receiving room.',
  acceptanceSpec:spec});
 assert.equal(result.status,'SOURCE_VERIFIED_ART_HOLD');
 assert.equal(result.userIntentCoverage.status,'VERIFIED_EXPLICIT_PROGRAM_IN_B143');
 assert.equal(result.userIntentCoverage.independentlyVerified,true);
 assert.equal(result.userIntentCoverage.matchedRooms.length,3);
 assert.equal(result.userIntentCoverage.directConnections.length,2);
 assert.ok(result.userIntentCoverage.directConnections.every(x=>x.compiledPortal));
 assert.ok(result.userIntentCoverage.matchedRooms.every(x=>x.twoWideReachabilityWitness));
 assert.ok(result.sourceResult.trueB143Voxels>1000);
 assert.equal(result.modelIdentityCryptographicallyVerified,false);
 assert.equal(result.humanArtReview,'ART_HOLD');
 assert.equal(result.minecraftPlayerWalking,'NOT_TESTED');
 assert.equal(result.readiness,'NOT_PREPARED');
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(result.BuildPlan.operations,[]);
 assert.equal(result.worldContacts,0);assert.equal(result.worldWrites,0);
});
test('G: absent independent expectations cannot be presented as coverage PASS',()=>{
 const r=readR190ModelProposal(JSON.stringify(model()));
 assert.equal(r.userIntentCoverage.status,'NO_INDEPENDENT_PROGRAM_COVERAGE');
 assert.equal(r.userIntentCoverage.independentlyVerified,false);
 assert.equal(r.originalRequestIndependentlyAudited,false);
});
test('G: independent requirements never silently create or change model rooms',()=>{
 const orig=model(),before=JSON.stringify(orig),s=program();
 let bad=structuredClone(orig);bad.semanticPlan.spaces[2].purpose='Staff office';
 let a=readR190ModelProposal(JSON.stringify(bad),{acceptanceSpec:s});
 assert.equal(a.status,'HOLD_UNSATISFIED_EXPLICIT_PROGRAM');
 assert.ok(a.userIntentCoverage.issues.some(x=>x.type==='MISSING_ROOM'));
 assert.equal(a.sourceGenerated,false);
 bad=structuredClone(orig);
 bad.semanticPlan.spaces.find(x=>x.id==='receiving').parentId='showroom';
 a=readR190ModelProposal(JSON.stringify(bad),{acceptanceSpec:s});
 assert.equal(a.status,'HOLD_UNSATISFIED_EXPLICIT_PROGRAM');
 assert.ok(a.userIntentCoverage.issues.some(x=>x.type==='MISSING_DIRECT_ADJACENCY'));
 bad=structuredClone(orig);
 bad.semanticPlan.spaces[1].privacy='public';
 a=readR190ModelProposal(JSON.stringify(bad),{acceptanceSpec:s});
 assert.equal(a.status,'HOLD_UNSATISFIED_EXPLICIT_PROGRAM');
 assert.ok(a.userIntentCoverage.issues.some(x=>x.type==='ROOM_PRIVACY_MISMATCH'));
 assert.equal(JSON.stringify(orig),before);
 assert.equal(JSON.stringify(s),JSON.stringify(program()));
});
test('G: injection and ambiguous acceptance rules fail closed',()=>{
 const p=program();p.worldCommand='/fill';
 assert.throws(()=>validateR190ProgramSpec(p),/SPEC_FIELDS/);
 const duplicate=program();duplicate.requiredProgram[1].purposeFragment='public display';
 const result=readR190ModelProposal(JSON.stringify(model()),{acceptanceSpec:duplicate});
 assert.equal(result.status,'HOLD_UNSATISFIED_EXPLICIT_PROGRAM');
 assert.ok(result.userIntentCoverage.issues.some(x=>x.type==='ROOM_REUSED_FOR_TWO_REQUIREMENTS'));
 const bad=program();bad.requiredDirectConnections=[['making','missing']];
 assert.throws(()=>validateR190ProgramSpec(bad),/EDGE/);
});
test('G: the existing LOCAL request carries the original brief into independent audit',async()=>{
 let calls=0;
 const fn=createR190SemanticModelAdapter({model:'mock-local',
  fetcher:async()=>{calls++;return {ok:true,json:async()=>({choices:[{
   finish_reason:'stop',message:{content:JSON.stringify(model())}}]})};}});
 const r=await fn({prompt:'Build a two-story community library with stairs.'});
 assert.equal(calls,1);
 assert.equal(r.status,'HOLD_UNREPRESENTABLE_REQUIREMENTS');
 assert.equal(r.sourceGenerated,false);
 assert.ok(r.independentlyDetectedBriefCapabilities.some(x=>x.capability==='multiple-levels'));
});

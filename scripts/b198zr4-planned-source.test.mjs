/** R4 deterministic source-only fixture tests. NEVER use actual Qwen in CI. */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {createB198GLocalModelAdapter} from '../source/ai/b198g-local-model-adapter.mjs';
import {createB198SNativeBridge} from '../source/ai/b198s-native-ollama-source.mjs';
import {readR4PlannedProposal,proposeR4PlannedSource,reviewR4PlannedProposal}
 from '../source/ai/b198zr4-planned-source.mjs';
import {SCHEMA as CONTRACT} from '../source/ai/b198zr3-functional-review-contract.mjs';
const fixture=()=>({
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',designOnly:true,
  id:'r4-generic-pavilion',title:'Generic independent functional fixture',
  brief:'Not Qwen; fictional pavilion with hollow courtyard and actual entrance.',
  bounds:{width:16,height:12,depth:16},elements:[
   {id:'base',shape:'box',mode:'add',material:'concrete',
    origin:[0,0,0],size:[16,1,16]},
   {id:'hall-shell',shape:'box',mode:'add',material:'glass',
    origin:[1,1,1],size:[14,5,14],shell:1},
   {id:'clear-bottom',shape:'box',mode:'cut',origin:[2,1,2],size:[12,1,12]},
   {id:'skylight',shape:'box',mode:'cut',origin:[6,5,6],size:[4,1,4]},
   {id:'entrance-opening',shape:'box',mode:'cut',origin:[6,1,1],size:[4,3,2]}
  ]},
 explanation:'Fixture architecture response only, no genuine model reasoning.',
 assumptions:['Review requires genuine original source and independent approval.'],
 spatialPlan:{
  designIntent:'Visitors gather safely around an illuminated central courtyard.',
  massStrategy:'A perimeter shell creates a protected public interior.',
  circulationStrategy:'A continuous entrance-facing ground floor leads to inner zones.',
  entrance:[7,1,2],headroom:2,
  protectedVoids:[{id:'protected-courtyard',origin:[6,1,6],
   size:[4,4,4],maxOccupiedCells:0}],
  destinations:[{id:'court-center',point:[8,1,10],maximumPathSteps:25}],
  functionalZones:[{id:'interior-public-floor',origin:[3,1,3],size:[10,1,10],
   minimumReachablePositions:90,minimumReachablePercent:90}]
 }
});
const reviewer=(d=fixture().design)=>({
 schema:CONTRACT,caseId:'independent-neutral-test',
 authorship:'INDEPENDENT_REVIEW_DRAFT',
 sourceSha256:compileDesign(d).sourceSha256,
 entrance:[7,1,2],headroom:2,
 protectedVoids:[{id:'reviewer-protected-air',origin:[6,1,6],
  size:[4,4,4],maxOccupiedCells:0}],
 destinations:[{id:'reviewer-destination',point:[8,1,10],maximumPathSteps:20}],
 functionalZones:[{id:'reviewer-functional-area',origin:[3,1,3],size:[10,1,10],
  minimumReachablePositions:90,minimumReachablePercent:90}]
});
test('R4 one injected generator call yields separate UNVERIFIED model plan + independently verified functional result',async()=>{
 let count=0;
 const result=await proposeR4PlannedSource({
  prompt:'未知の用途にも共通する中庭を持つ公共建物を設計してください',
  generator:async data=>{count++;
   assert.equal(data.attempt,1);assert.equal(data.maxAttempts,1);
   assert.equal(data.outputMode,'PLANNED_SOURCE_V1');return fixture();
  },
  independentContract:reviewer()
 });
 assert.equal(count,1);
 assert.equal(result.status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
 assert.equal(result.planProvenance,'MODEL_DECLARED_UNVERIFIED');
 assert.equal(result.independentReview.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 assert.equal(result.actualModelIdentityAuthenticated,false);
 assert.equal(result.conceptQualityApproved,false);
 assert.equal(result.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(result.safety.BuildPlan.operations,[]);
});
test('default three-key parser rejects extra model spatialProgram; R4 never weakens B198A',()=>{
 const proposal=fixture();
 assert.equal(readR4PlannedProposal(proposal).design.id,'r4-generic-pavilion');
 const lacking={...proposal};delete lacking.spatialPlan;
 assert.throws(()=>readR4PlannedProposal(lacking),/EXPECTED_FOUR_KEYS/);
 assert.throws(()=>readR4PlannedProposal({...proposal,constructionApproved:true}),
  /EXPECTED_FOUR_KEYS/);
});
test('actual final voxel contract catches honest-looking plan with a fake open area',()=>{
 const bad=fixture();
 bad.design.elements.push({id:'refill-courtyard-late',shape:'box',
  mode:'add',material:'metal',origin:[6,1,6],size:[4,4,4]});
 const review=reviewR4PlannedProposal(bad);
 assert.equal(review.status,'HOLD_SPATIAL_PLAN_OR_INDEPENDENT_CONTRACT');
 assert.equal(review.declaredPlanReview.results.protectedVoids[0].passed,false);
});
test('model-chosen trivially easy plan cannot override independent reviewer requirements',()=>{
 const d=fixture();const weak=structuredClone(d);
 weak.spatialPlan.protectedVoids=[];
 weak.spatialPlan.destinations=[{id:'easy-destination',point:[7,1,2],maximumPathSteps:1}];
 weak.spatialPlan.functionalZones=[{id:'tiny-zone',origin:[7,1,2],size:[1,1,1],
  minimumReachablePositions:1,minimumReachablePercent:100}];
 const impossible=reviewer(weak.design);
 impossible.functionalZones[0].minimumReachablePositions=100;
 impossible.functionalZones[0].minimumReachablePercent=100;
 const blocked=reviewR4PlannedProposal(weak,{independentContract:impossible});
 // This particular pavilion has 100 walkable cells, so an independently
 // impossible target must refer to actual final-block volume.
 assert.equal(blocked.status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
 const changed=structuredClone(weak);
 changed.design.elements.push({id:'fill-half-public-floor',shape:'box',
  mode:'add',material:'metal',origin:[3,1,3],size:[5,2,10]});
 const tailored={...impossible,sourceSha256:compileDesign(changed.design).sourceSha256};
 const held=reviewR4PlannedProposal(changed,{independentContract:tailored});
 assert.equal(held.declaredPlanReview.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 assert.equal(held.independentReview.status,'HOLD_FUNCTIONAL_CONTRACT_FAILURE');
 assert.equal(held.status,'HOLD_SPATIAL_PLAN_OR_INDEPENDENT_CONTRACT');
});
test('reusable R4 native Ollama fixture sends four-key plan with ONE HTTP request and no real model',async()=>{
 let requests=0,modelPayload=null,originalSaved=null;
 const server=http.createServer(async(req,res)=>{
  requests++;let raw='';for await(const c of req)raw+=String(c);
  modelPayload=JSON.parse(raw);
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({done:true,done_reason:'stop',
   message:{content:JSON.stringify(fixture())},eval_count:200,
   eval_duration:1200000000}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const b=createB198SNativeBridge({
   plannedSourceMode:true,numPredict:3072,numCtx:6144,
   onModelResponse:({originalContent})=>{originalSaved=originalContent}
  });
  const adapter=createB198GLocalModelAdapter({
   plannedSourceMode:true,model:'R4_TEST_FIXTURE_NOT_MODEL',
   endpoint:'http://127.0.0.1:'+server.address().port+'/v1/chat/completions',
   fetcher:b.fetcher,timeoutMs:15000
  });
  const result=await proposeR4PlannedSource({
   prompt:'Design a safe open courtyard pavilion with a coherent circulation plan.',
   generator:adapter,independentContract:reviewer()
  });
  assert.equal(requests,1);
  assert.equal(modelPayload.think,false);
  assert.equal(modelPayload.format,'json');
  assert.equal(modelPayload.stream,false);
  assert.match(modelPayload.messages[0].content,/spatialPlan/);
  assert.match(modelPayload.messages[0].content,/SAME response/);
  assert.equal(originalSaved,JSON.stringify(fixture()));
  assert.equal(result.status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
  assert.equal(result.actualModelIdentityAuthenticated,false);
  assert.equal(b.requestBudget.r4PlannedSourceOptIn,true);
 }finally{await new Promise(resolve=>server.close(resolve))}
});

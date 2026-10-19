/** B198Z-R3 -- real-compiler contract tests, source-only and zero model calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {evaluateFunctionalReviewContract,SCHEMA} from '../source/ai/b198zr3-functional-review-contract.mjs';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const baseline=read('../evidence/b198zr2/assistant-revised-library-r2.json');
const contract=read('../evidence/b198zr3/r2-functional-review-contract.json');
const compiled=compileDesign(baseline);
const verify=(design,claim)=>evaluateFunctionalReviewContract({
 design,compiled:compileDesign(design),contract:claim});
test('R2 real B143 cells prove 5 functional floor zones, shelf approach, atrium, observatory and terraces',()=>{
 assert(verifyCompiled(baseline,compiled));
 assert.equal(baseline.elements.length,156);
 assert.equal(compiled.primitives.length,15312);
 const r=evaluateFunctionalReviewContract({design:baseline,compiled,contract});
 assert.equal(r.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 assert.equal(r.results.protectedVoids[0].volume,4356);
 assert.equal(r.results.protectedVoids[0].occupied,0);
 assert.equal(r.results.destinations.length,7);
 assert(r.results.destinations.every(x=>x.passed&&x.shortestPathSteps<=x.maximumPathSteps));
 assert.equal(r.results.functionalZones.length,6);
 assert(r.results.functionalZones.every(x=>x.passed));
 assert(r.results.functionalZones.every(x=>x.reachable>=x.reachable));
 assert.equal(r.contractAuthorship,'ASSISTANT_PROPOSED_UNAPPROVED');
 assert.equal(r.unverified.architecturalQuality,true);
 assert.equal(r.unverified.minecraftActualWalking,true);
 assert.equal(r.modelCalls,0);
 assert.equal(r.safety.worldWrites,0);
 assert.equal(r.safety.gates.filter(x=>x==='BLOCKED').length,9);
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
const repin=(source,original=contract)=>({...structuredClone(original),
 sourceSha256:compileDesign(source).sourceSha256});
test('filling the atrium AFTER all cuts is caught even when a fresh source SHA is valid',()=>{
 const altered=structuredClone(baseline);
 altered.elements.push({id:'late-atrium-refill',shape:'box',mode:'add',
  material:'metal',origin:[23,12,23],size:[3,10,3]});
 const result=verify(altered,repin(altered));
 assert.equal(result.status,'HOLD_FUNCTIONAL_CONTRACT_FAILURE');
 assert.equal(result.results.protectedVoids[0].passed,false);
 assert(result.results.protectedVoids[0].occupied>0);
});
test('an unusably filled upper functional region is NOT rescued by nearby reachable anchors',()=>{
 const altered=structuredClone(baseline);
 altered.elements.push({id:'fake-observatory-occupancy',shape:'box',mode:'add',
  material:'metal',origin:[11,34,12],size:[9,2,28]});
 const result=verify(altered,repin(altered));
 assert.equal(result.status,'HOLD_FUNCTIONAL_CONTRACT_FAILURE');
 const upper=result.results.functionalZones.find(x=>x.id==='upper-observation-circulation');
 assert.equal(upper.passed,false);
 assert.equal(upper.reachable,0);
});
test('blocking the actual entrance fails closed before any optimistic room counting',()=>{
 const altered=structuredClone(baseline);
 altered.elements.push({id:'unsafe-entrance-seal',shape:'box',mode:'add',
  material:'metal',origin:[22,2,43],size:[5,3,5]});
 assert.throws(()=>verify(altered,repin(altered)),/ENTRANCE_NOT_STANDABLE/);
});
test('stale or model-forged review contract can never claim certified quality',()=>{
 const r=evaluateFunctionalReviewContract({design:baseline,compiled,
  contract:{...contract,authorship:'MODEL_DECLARED_UNVERIFIED'}});
 assert.equal(r.unverified.requestSemantics,true);
 assert.equal(r.unverified.modelGeneralization,true);
 assert.equal(r.unverified.humanApproval,true);
 assert.throws(()=>evaluateFunctionalReviewContract({design:baseline,compiled,
  contract:{...contract,authorship:'HUMAN_APPROVED'}}),/HONEST_PROVENANCE/);
 assert.throws(()=>evaluateFunctionalReviewContract({design:baseline,compiled,
  contract:{...contract,sourceSha256:'0'.repeat(64)}}),/SOURCE_SHA_STALE/);
 assert.throws(()=>evaluateFunctionalReviewContract({design:baseline,compiled,
  contract:{...contract,destinations:[...contract.destinations,
    {...contract.destinations[0]}]}}),/DESTINATION_LIST/);
});
test('same contract evaluator works on an unrelated empty pavilion without typology templates',()=>{
 const d={schema:'minecraftaibuilder-b143-building-dsl-v1',designOnly:true,
  id:'r3-neutral-pavilion-fixture',title:'Generic pavilion test',
  brief:'Genre-neutral courtyard fixture, not AI generated or construction approved',
  bounds:{width:16,height:12,depth:16},elements:[
   {id:'base',shape:'box',mode:'add',material:'concrete',
    origin:[0,0,0],size:[16,1,16]},
   {id:'hall-shell',shape:'box',mode:'add',material:'glass',
    origin:[1,1,1],size:[14,5,14],shell:1},
   {id:'clear-skylight',shape:'box',mode:'cut',origin:[6,5,6],size:[4,1,4]},
   {id:'open-entrance',shape:'box',mode:'cut',origin:[6,1,1],size:[4,3,2]}
  ]};
 const c=compileDesign(d);
 const review={schema:SCHEMA,caseId:'fixture-no-library-template',
  authorship:'TEST_FIXTURE',sourceSha256:c.sourceSha256,
  entrance:[7,1,2],headroom:2,
  protectedVoids:[{id:'inner-void',origin:[6,1,6],size:[4,4,4],maxOccupiedCells:0}],
  destinations:[{id:'courtyard-center',point:[8,1,10],maximumPathSteps:25}],
  functionalZones:[{id:'public-interior',origin:[3,1,3],size:[10,1,10],
   minimumReachablePositions:90,minimumReachablePercent:90}]};
 const result=evaluateFunctionalReviewContract({design:d,compiled:c,contract:review});
 assert.equal(result.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 assert.equal(result.results.functionalZones[0].reachable,100);
});

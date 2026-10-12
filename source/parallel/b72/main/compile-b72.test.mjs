import test from 'node:test';
import assert from 'node:assert/strict';
import {buildB72,readPinnedGrammar} from './run-b72.mjs';
import {compileB72,preflightProductionPlan} from './compile-b72.mjs';
const {report,b71,b65,b66,b69,b70}=buildB72();
const clone=x=>structuredClone(x);
const bad=(fn,s)=>assert.throws(fn,new RegExp('B72_'+s));
const run=(source=readPinnedGrammar())=>compileB72(b65,b66,b69,b70,b71,source);
test('five exact, source grammar supported production input candidates',()=>{
 assert.equal(report.jobs.length,5);assert(report.jobs.every(j=>j.createBuildingPlanInputCandidate.floorHeight===5));
 assert.equal(report.summary.sourceSupportedFloorPitchFiveCandidates,30);
 assert.equal(report.summary.existingFourHighDefaultBuildings,4);
});
test('all candidate height and width/depth in real grammar bounds',()=>assert(report.jobs.every(j=>{
 const p=j.createBuildingPlanInputCandidate;return p.width>=15&&p.width<=48&&p.depth>=12&&p.depth<=40&&p.floors===6;
})));
test('source-backed replay deterministic',()=>assert.deepEqual(run(),report));
test('altered pinned grammar rejected',()=>bad(()=>run(readPinnedGrammar().replace('4, 5)','4, 6')),'PRODUCTION_GRAMMAR_CONTRACT_DRIFT'));
test('tampered frozen B65 SHA denied',()=>{const b=clone(b65);b.sections[0].id='hotel/fake/L1';bad(()=>compileB72(b,b66,b69,b70,b71,readPinnedGrammar()),'BAD_HASH_B65');});
test('tampered frozen B71 gateway denied',()=>{const b=clone(b71);b.gates[0].status='PASS';bad(()=>compileB72(b65,b66,b69,b70,b,readPinnedGrammar()),'BAD_HASH_B71');});
test('inherited no construction, blocked gates',()=>{assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.gates.length,9);assert(report.gates.every(x=>x.status==='BLOCKED'));assert.deepEqual(report.BuildPlan.operations,[]);assert.equal(report.engineCalls,0);});
test('no actual production plan or physical door claimed',()=>{assert.equal(report.summary.realOutputVerifiedFloors,0);assert.equal(report.summary.physicalDoorBlocks,0);assert(report.jobs.every(x=>x.productionOutputReceived===false&&x.sendToPlannerAllowed===false));});
const job=report.jobs.find(x=>x.id==='hotel/candidate-01');
const example={type:'general_building',composition:{program:'hotel',floorCount:6,floorHeight:5,dimensions:{width:26,depth:20},orientation:'north'},
 masses:[{x:0,z:0,width:26,depth:20,start:0,end:6}],operations:[]};
test('snapshot preflight confirms hotel slab nominal mask, but never physical approval',()=>{
 const result=preflightProductionPlan(example,job,b66);
 assert.equal(result.emissionAllowed,false);assert.equal(result.BuildPlan.operations.length,0);
 assert.equal(result.footprintParity,'FOOTPRINT_CELLS_MATCH_NOT_FULL_RUNTIME_PARITY');
 assert.equal(result.missingNominalCells,0);assert.equal(result.extraProductionCells,0);
 assert.equal(result.constructionApproved,false);
});
test('production snapshot with incorrect pitch blocked',()=>{const p=clone(example);p.composition.floorHeight=4;bad(()=>preflightProductionPlan(p,job,b66),'PLAN_COMPOSITION');});
test('production snapshot with invalid geometry rejected',()=>{const p=clone(example);p.masses[0].width=50;bad(()=>preflightProductionPlan(p,job,b66),'INVALID_PRODUCTION_MASS');});
test('unrecognized operation type cannot pass preflight',()=>{const p=clone(example);p.operations=[{type:'setblock',from:{x:1,y:1,z:1},to:{x:1,y:1,z:1}}];bad(()=>preflightProductionPlan(p,job,b66),'UNKNOWN_OPERATION');});
test('tampered B66 frozen mask rejected',()=>{const b=clone(b66);const r=b.sections[0].floorMaskRows[0];b.sections[0].floorMaskRows[0]=(r[0]==='1'?'0':'1')+r.slice(1);bad(()=>preflightProductionPlan(example,job,b),'BAD_HASH_B66');});
test('mutable job permission blocked',()=>{const j=clone(job);j.sendToPlannerAllowed=true;bad(()=>preflightProductionPlan(example,j,b66),'UNSAFE_JOB');});

test('narrow production mass creates mask mismatch and blocks parity',()=>{const p=clone(example);p.masses[0].width=25;const r=preflightProductionPlan(p,job,b66);assert.equal(r.footprintParity,'BLOCKED_FOOTPRINT_DISAGREEMENT');assert(r.missingNominalCells>0);assert.equal(r.emissionAllowed,false);});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileB44Main,verifyB44Main} from './integrate-b44.mjs';
import {inputsFromSource,buildFromSource} from './run-b44-main.mjs';
import {reviewCandidateIR} from '../sub-c/preflight.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const inp=inputsFromSource(),output=compileB44Main(inp);
const clone=o=>JSON.parse(JSON.stringify(o));

test('pinned source inputs replay and portfolio compiles',()=>{
 assert.deepEqual(buildFromSource(),output);
 assert.equal(verifyB44Main(output,inp),true);
});
test('B43 frozen origin is symbolically retained and cross-building aggregates balance',()=>{
 assert.equal(output.aggregate.buildings,5);
 assert.equal(output.aggregate.floors,30);
 assert.equal(output.portfolio.length,5);
 assert.deepEqual(output.portfolio.map(b=>b.levelCount),[6,6,6,6,6]);
 assert.equal(output.aggregate.sourceFloorCells,12778);
 assert.equal(output.aggregate.hypotheticalCutoutCells,50);
 assert.equal(output.aggregate.nominalDoorPorts,314);
 assert.equal(output.aggregate.nominalStairInterfaces,25);
});
test('SubA only applied to apartment, not falsely all 5 buildings',()=>{
 assert.equal(output.portfolio.filter(b=>b.circulationCoverage==='HYPOTHETICAL_SIX_LEVEL_REVIEW').length,1);
 assert.equal(output.portfolio.filter(b=>b.circulationCoverage==='NOT_YET_EVALUATED_BY_SUB_A').length,4);
});
test('SubA path results remain unapproved & graph-only',()=>{
 assert.equal(output.apartmentCirculation.variants.length,2);
 assert.deepEqual(output.apartmentCirculation.variants.map(v=>v.routeSteps),[56,496]);
 assert.deepEqual(output.apartmentCirculation.variants.map(v=>v.wallCollisionCandidateCells),[24,0]);
 assert.equal(output.apartmentCirculation.physicalPassableDoors,null);
 assert.equal(output.apartmentCirculation.levelOneFootprintProven,false);
 assert(output.apartmentCirculation.variants.every(v=>v.designAdopted===false));
});
test('118 old/new door topology mismatches remain visible not erased',()=>{
 assert.equal(output.aggregate.knownCrossGenerationDoorHintsRequiringReview,118);
 assert.match(output.outstanding.join('\n'),/118 of 314/);
});
test('raw A report is strictly rejected by SubC (expected contract mismatch)',()=>{
 assert.throws(()=>reviewCandidateIR(inp.a,'sub-a'),/MISSING_BLOCKED_STATUS/);
});
test('raw B report is strictly rejected by SubC (expected field vocabulary mismatch)',()=>{
 assert.throws(()=>reviewCandidateIR(inp.b,'sub-b'),/EXECUTABLE_PAYLOAD/);
});
test('review envelopes accepted without changing SubC strictness',()=>{
 for(const role of ['A','B']){
  const r=output.crossChecks[`normalizedInput${role}`];
  assert.equal(r.acceptedForOfflineReview,true);
  assert.equal(r.constructionApproved,false);
  assert.equal(r.executionAllowed,false);
  assert.equal(r.buildOperations,0);
 }
});
test('all nine M4 gates remain blocked',()=>{
 assert.equal(output.crossChecks.cGatesBlocked,9);
 assert(inp.c.gates.every((g,i)=>g.id===`M4-0${i+1}`&&g.status==='BLOCKED'));
});
test('no command or deploy payload exists',()=>{
 assert.equal(output.readiness,'NOT_PREPARED');
 assert.equal(output.deployment,'BLOCKED');
 assert.equal(output.constructionApproved,false);
 assert.equal(output.executionAllowed,false);
 assert.equal(output.engineCalls,0);
 assert.equal(output.buildOperations,0);
 assert.deepEqual(output.BuildPlan.operations,[]);
 assert.equal(output.BuildPlan.worldCoordinates,null);
});
test('reject changed A report including safety promotion',()=>{
 const i={...inp,a:clone(inp.a)};
 i.a.safety.constructionApproved=true;
 assert.throws(()=>compileB44Main(i),/B44A_|B44_MAIN_/);
});
test('reject modified B material ID',()=>{
 const i={...inp,b:clone(inp.b)};
 i.b.buildings[0].floors[0].exterior.facadeMaterialId='minecraft:stone';
 assert.throws(()=>compileB44Main(i),/B44_SUB_B_|B44_MAIN_/);
});
test('reject C forged open gate',()=>{
 const i={...inp,c:clone(inp.c)};
 i.c.gates[0].status='READY';
 assert.throws(()=>compileB44Main(i),/B44_MAIN_C_GATES/);
});
test('reject C forged approval',()=>{
 const i={...inp,c:clone(inp.c)};
 i.c.constructionApproved=true;
 assert.throws(()=>compileB44Main(i),/B44_MAIN_C_/);
});
test('reject missing data',()=>{
 assert.throws(()=>compileB44Main({...inp,a:null}),/B44_MAIN_MISSING_SOURCE/);
});
test('tampering with integration result fails recheck',()=>{
 const x=clone(output);x.aggregate.nominalDoorPorts=315;
 assert.throws(()=>verifyB44Main(x,inp),/B44_MAIN_OUTPUT_TAMPER/);
});
test('stable output in main-owned report, no overwrite of B43',()=>{
 const saved=JSON.parse(fs.readFileSync(path.join(HERE,'B44_MAIN_PORTFOLIO_REVIEW.json'),'utf8'));
 assert.deepEqual(saved,output);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {R190_SCHEMA,validateR190SemanticPlan,compileR190SemanticPlan,
 exploreR190SemanticPlan,R190_LAYOUT_STRATEGIES}
 from '../source/ai/r190-semantic-massing.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

import {R190_STATIC_SYNTHETIC_CASES as cases} from './r190-semantic-fixtures.mjs';

test('R190 synthetic programs: B143 source, 2-wide access and safe world gates',()=>{
 const signatures=[];
 for(const input of cases){
  const snapshot=JSON.stringify(input);
  assert.equal(validateR190SemanticPlan(input),true);
  const r=compileR190SemanticPlan(input);
  assert.equal(JSON.stringify(input),snapshot);
  assert.ok(verifyCompiled(r.design,r.compiled));
  assert.equal(r.audit.witnesses.length,input.spaces.length);
  assert.equal(r.audit.allProgramSpacesReachable,true);
  assert.ok(r.audit.sourceWalkingPads>30);
  assert.equal(r.layout.portals.length,input.spaces.length-1);
  assert.equal(r.design.elements.filter(x=>x.shape==='box'&&x.mode==='cut').length,
   input.spaces.length);
  assert.ok(r.compiled.primitives.length>1000);
  assert.equal(r.modelAuthorship,'CALLER_PROVIDED_IR_UNVERIFIED');
  assert.equal(r.art,'ART_HOLD');
  assert.equal(r.readiness,'NOT_PREPARED');
  assert.equal(r.constructionApproved,false);
  assert.equal(r.executionAllowed,false);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(r.BuildPlan.operations,[]);
  assert.equal(r.worldWrites,0);
  signatures.push(r.compiled.geometrySha256);
 }
 assert.equal(new Set(signatures).size,3);
});
test('R190 rejects cycles, infeasible plots, and untrusted world commands',()=>{
 const cyclic=structuredClone(cases[0]);
 cyclic.spaces[1].parentId='storage';
 cyclic.spaces[3].parentId='sleeping';
 assert.throws(()=>compileR190SemanticPlan(cyclic),/R190_SEMANTIC_CYCLE/);
 const impossible=structuredClone(cases[0]);
 impossible.site.width=24;impossible.site.depth=24;
 assert.throws(()=>compileR190SemanticPlan(impossible),/NO_FEASIBLE_SPATIAL_LAYOUT/);
 const injection=structuredClone(cases[0]);
 injection.worldCommand='/fill 0 0 0 1 1 1 stone';
 assert.throws(()=>compileR190SemanticPlan(injection),/R190_SEMANTIC_FIELDS/);
});
test('R190 rejects stale mutated compiled voxel source',()=>{
 const r=compileR190SemanticPlan(cases[0]);
 r.compiled.primitives=r.compiled.primitives.slice(1);
 assert.equal(verifyCompiled(r.design,r.compiled),false);
});

test('R190 Phase B explores three distinct source placements per synthetic use',()=>{
 const all=[];
 for(const plan of cases){
  const before=JSON.stringify(plan),result=exploreR190SemanticPlan(plan);
  assert.equal(JSON.stringify(plan),before);
  assert.equal(result.conceptsIndependentlyDesigned,false);
  assert.equal(result.actualLocalModelCalls,0);
  assert.equal(result.provenance,'CALLER_PROVIDED_IR_UNVERIFIED');
  assert.equal(result.art,'ART_HOLD');
  assert.equal(result.candidates.length,3);
  assert.deepEqual(result.candidates.map(x=>x.layout.strategy),R190_LAYOUT_STRATEGIES);
  const layouts=new Set();
  for(const c of result.candidates){
   assert.equal(c.layout.sourcePlanSha256,result.inputSha256);
   assert.ok(verifyCompiled(c.design,c.compiled));
   assert.equal(c.audit.allProgramSpacesReachable,true);
   assert.equal(c.layout.portals.length,plan.spaces.length-1);
   for(const s of plan.spaces){
    const a=c.layout.spaces.find(x=>x.id===s.id);
    assert.deepEqual([a.w,a.d,a.h],[s.width,s.depth,s.height]);
    assert.equal(a.parentId,s.parentId);
    assert.equal(a.side,s.side);
   }
   const root=c.layout.spaces.find(s=>s.id===plan.entrySpaceId);
   const fingerprint=c.layout.spaces.map(s=>
    [s.id,s.x-root.x,s.z-root.z,s.w,s.d,s.h].join(':')).join('|');
   assert.ok(!layouts.has(fingerprint));
   layouts.add(fingerprint);
   assert.equal(c.art,'ART_HOLD');
   assert.equal(c.readiness,'NOT_PREPARED');
   assert.deepEqual(c.gates,Array(9).fill('BLOCKED'));
   assert.deepEqual(c.BuildPlan.operations,[]);
   assert.equal(c.worldWrites,0);assert.equal(c.worldContacts,0);
   all.push(c.compiled.geometrySha256);
  }
 }
 assert.equal(new Set(all).size,9);
 assert.throws(()=>compileR190SemanticPlan(cases[0],
  {layoutStrategy:'override-world'}),/R190_SEMANTIC_LAYOUT_STRATEGY/);
});

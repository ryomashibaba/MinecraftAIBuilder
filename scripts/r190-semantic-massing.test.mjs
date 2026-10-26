import test from 'node:test';
import assert from 'node:assert/strict';
import {R190_SCHEMA,validateR190SemanticPlan,compileR190SemanticPlan}
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

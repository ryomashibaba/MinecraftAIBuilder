import test from 'node:test';
import assert from 'node:assert/strict';
import {R190_SCHEMA,validateR190SemanticPlan,compileR190SemanticPlan,
 auditR190SourceRoutes,exploreR190SemanticPlan,R190_LAYOUT_STRATEGIES}
 from '../source/ai/r190-semantic-massing.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

import {R190_STATIC_SYNTHETIC_CASES as cases,
 R190_COURT_STATIC_SYNTHETIC_CASE as court,
 R190_FACETED_STATIC_SYNTHETIC_CASE as faceted} from './r190-semantic-fixtures.mjs';

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

test('R190-C: a first-class court changes mass, true sky and connected usable rooms',()=>{
 const saved=JSON.stringify(court),ex=exploreR190SemanticPlan(court);
 assert.equal(JSON.stringify(court),saved);
 assert.equal(ex.candidates.length,3);assert.equal(ex.actualLocalModelCalls,0);
 const shapes=new Set();
 for(const c of ex.candidates){
  assert.ok(verifyCompiled(c.design,c.compiled));
  assert.equal(c.audit.outdoorCourtCount,1);
  assert.equal(c.audit.verifiedOpenSkyColumns,144);
  assert.equal(c.audit.witnesses.length,4);
  assert.equal(c.layout.portals.length,3);
  assert.equal(c.audit.allProgramSpacesReachable,true);
  assert.ok(c.audit.sourceWalkingPads>50);
  assert.ok(!c.design.elements.some(e=>e.id==='arrival-roof'||e.id==='arrival-west'||e.id==='entry-cut'));
  assert.equal(c.modelAuthorship,'CALLER_PROVIDED_IR_UNVERIFIED');
  assert.equal(c.art,'ART_HOLD');assert.equal(c.readiness,'NOT_PREPARED');
  assert.equal(c.constructionApproved,false);assert.equal(c.executionAllowed,false);
  assert.deepEqual(c.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(c.BuildPlan.operations,[]);
  assert.equal(c.worldWrites,0);assert.equal(c.worldContacts,0);
  shapes.add(c.compiled.geometrySha256);
 }
 assert.equal(shapes.size,3);
});
test('R190-C: invalid role or a covered court fails closed',()=>{
 for(const role of ['world-write','build','arbitrary']){
  const bad=structuredClone(court);bad.spaces[0].spatialRole=role;
  assert.throws(()=>compileR190SemanticPlan(bad),/R190_SEMANTIC_SPACE/);
 }
 const tooMany=structuredClone(court);
 tooMany.spaces[1].spatialRole='open-court';
 assert.throws(()=>compileR190SemanticPlan(tooMany),/COURT_BUDGET/);
 const c=compileR190SemanticPlan(court),pos=c.layout.spaces.find(s=>s.id==='arrival');
 const modified=structuredClone(c.design);
 modified.elements.push({id:'unauthorized-court-cover',shape:'box',mode:'add',
  material:'concrete',origin:[pos.x+3,6,pos.z+3],size:[3,1,3]});
 const compiled=compileDesign(modified);
 assert.ok(verifyCompiled(modified,compiled));
 assert.throws(()=>auditR190SourceRoutes(c.inputPlan,c.layout,modified,compiled),
  /COURT_SKY_OBSTRUCTED_arrival/);
});

test('R190-D: genuine model-selectable faceted envelope has real floor, roof, and routes',()=>{
 const original=JSON.stringify(faceted),variants=exploreR190SemanticPlan(faceted);
 assert.equal(JSON.stringify(faceted),original);
 assert.equal(variants.candidates.length,3);
 assert.equal(variants.actualLocalModelCalls,0);
 assert.equal(variants.provenance,'CALLER_PROVIDED_IR_UNVERIFIED');
 const shapes=new Set();
 for(const c of variants.candidates){
  assert.ok(verifyCompiled(c.design,c.compiled));
  assert.equal(c.audit.allProgramSpacesReachable,true);
  assert.equal(c.audit.outdoorCourtCount,1);
  assert.equal(c.audit.verifiedOpenSkyColumns,144);
  assert.equal(c.audit.witnesses.length,4);
  assert.equal(c.audit.facetedEnvelope.spaceId,'public-hall');
  assert.equal(c.audit.facetedEnvelope.face,'south');
  assert.equal(c.audit.facetedEnvelope.missingRoofCornerColumns,12);
  assert.ok(c.audit.facetedEnvelope.occupiedRoofColumns>100);
  assert.ok(c.design.elements.some(e=>e.id==='public-hall-facet-roof-core'));
  assert.ok(!c.design.elements.some(e=>e.id==='public-hall-roof'));
  assert.equal(c.art,'ART_HOLD');
  assert.equal(c.constructionApproved,false);
  assert.equal(c.executionAllowed,false);
  assert.equal(c.readiness,'NOT_PREPARED');
  assert.deepEqual(c.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(c.BuildPlan.operations,[]);
  assert.equal(c.worldWrites,0);
  assert.equal(c.worldContacts,0);
  shapes.add(c.compiled.geometrySha256);
 }
 assert.equal(shapes.size,3);
});
test('R190-D: rejects unknown face, incompatible dimensions, and covered faceted void',()=>{
 for(const face of ['north-west','/fill','around']){
  const invalid=structuredClone(faceted);
  invalid.formIntent.face=face;
  assert.throws(()=>compileR190SemanticPlan(invalid),/FORM_INTENT/);
 }
 const invalid=structuredClone(faceted);
 invalid.formIntent.spaceId='arrival';
 assert.throws(()=>compileR190SemanticPlan(invalid),/FORM_SPACE/);
 const small=structuredClone(faceted);
 small.formIntent.cornerInset=3;
 small.spaces.find(s=>s.id==='public-hall').width=10;
 assert.throws(()=>compileR190SemanticPlan(small),/FACET_CANNOT_FIT/);
 const built=compileR190SemanticPlan(faceted),
  room=built.layout.spaces.find(s=>s.id==='public-hall');
 const obstructed=structuredClone(built.design);
 obstructed.elements.push({id:'hostile-facet-cover',shape:'box',
  mode:'add',material:'metal',origin:[room.x,room.h,room.z],size:[3,1,1]});
 const compiled=compileDesign(obstructed);
 assert.ok(verifyCompiled(obstructed,compiled));
 assert.throws(()=>auditR190SourceRoutes(
  built.inputPlan,built.layout,obstructed,compiled),
  /FACET_NOT_TRULY_OPEN/);
});

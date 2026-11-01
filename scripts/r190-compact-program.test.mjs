import test from 'node:test';
import assert from 'node:assert/strict';
import {R190_COMPACT_SCHEMA,inspectR190CompactProgram,compileR190CompactProgram}
 from '../source/ai/r190-compact-program.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const base=(id,forms=['plain','ridge','facet'])=>({
 schema:R190_COMPACT_SCHEMA,id,title:'Independent model-authored concept',
 brief:'A new functional building with a coherent volume and connected rooms.',
 entranceFace:'south',materials:{floor:'wood',wall:'stone',roof:'wood'},
 spaces:[
  {id:'entrance',purpose:'Public entrance hall',size:'balanced',
   proportion:'wide',height:'medium',parentId:null,preferredSide:null,
   privacy:'public',form:forms[0]},
  {id:'creative-room',purpose:'Primary activity room',size:'generous',
   proportion:'long',height:'high',parentId:'entrance',
   preferredSide:'north',privacy:'shared',form:forms[1]},
  {id:'quiet-room',purpose:'Quiet private use',size:'compact',
   proportion:'square',height:'low',parentId:'entrance',
   preferredSide:'east',privacy:'private',form:forms[2]}
 ]});
test('R190 compact model selects programs and real independent forms without numeric authoring',()=>{
 const inputs=[base('r190-synthetic-home',['plain','ridge','facet']),
  base('r190-synthetic-shop',['plain','sky-court','shed']),
  base('r190-synthetic-lab',['plain','facet','open-court'])];
 const hashes=new Set();
 for(const p of inputs){
  const original=JSON.stringify(p),r=compileR190CompactProgram(p);
  assert.equal(JSON.stringify(p),original);
  assert.equal(r.status,'COMPILED_SOURCE_ONLY_ART_HOLD');
  assert.equal(r.hostDerivedPlan.spaces.length,3);
  assert.equal(r.hostResolution.modelRelationsPreserved,true);
  assert.equal(r.hostResolution.modelSelectedShapeTypesPreserved,true);
  assert(r.hostResolution.attemptedPlacements>=1);
  assert(verifyCompiled(r.built.design,r.built.compiled));
  assert(r.built.audit.allProgramSpacesReachable);
  assert.equal(r.built.worldWrites,0);
  assert.equal(r.built.worldContacts,0);
  assert.equal(r.built.constructionApproved,false);
  assert.equal(r.built.executionAllowed,false);
  assert.deepEqual(r.built.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(r.built.BuildPlan.operations,[]);
  hashes.add(r.built.compiled.geometrySha256);
 }
 assert.equal(hashes.size,3);
});
test('R190 compact fails closed on unknown fields and parent cycles, not false authorship',()=>{
 const p=base('r190-valid-house');
 assert.equal(inspectR190CompactProgram(p).spaces.length,3);
 const q=structuredClone(p);q.worldCommand='/fill 1 1 1 stone';
 assert.throws(()=>compileR190CompactProgram(q),/IDENTITY/);
 const r=structuredClone(p);r.spaces[1].parentId='quiet-room';
 assert.throws(()=>compileR190CompactProgram(r),/RELATION/);
 const dup=structuredClone(p);dup.spaces[2].id=dup.spaces[1].id;
 assert.throws(()=>compileR190CompactProgram(dup),/SPACE_VALUES/);
 const x=structuredClone(p);x.spaces[0].form='open-court';
 assert.throws(()=>compileR190CompactProgram(x),/ENTRANCE_MUST_BE_ENCLOSED/);
});

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

test('R190 compact never puts a child on the root entrance when preferred sides conflict',()=>{
 const p=base('r190-root-entrance-regression',['plain','ridge','plain']);
 p.spaces[1].preferredSide='south';
 p.spaces[2].preferredSide='south';
 const original=JSON.stringify(p);
 const result=compileR190CompactProgram(p);
 assert.equal(JSON.stringify(p),original);
 assert(result.hostResolution.excludedRootEntranceSides>=2);
 assert(result.hostResolution.relativeSideDeviations.length>=2);
 for(const s of result.hostDerivedPlan.spaces.slice(1))
  if(s.parentId===p.spaces[0].id)assert.notEqual(s.side,p.entranceFace);
 assert.equal(result.built.worldWrites,0);
 assert.equal(result.built.audit.allProgramSpacesReachable,true);
});

test('optional Qwen-authored daylight intent is strictly validated and leaves frozen source untouched',()=>{
 const p=base('r190-daylight-model',['plain','plain','plain']);
 p.daylightIntent=[{spaceId:'creative-room',preferredFace:'north',scale:'generous'},
  {spaceId:'entrance',preferredFace:'west',scale:'balanced'}];
 const frozen=structuredClone(p),r=compileR190CompactProgram(p);
 assert.equal(r.status,'COMPILED_SOURCE_ONLY_ART_HOLD');
 assert.deepEqual(r.modelProgram.daylightIntent,p.daylightIntent);
 assert.equal(r.hostDerivedPlan.glazedOpenings,undefined);
 assert.equal(r.built.audit.allProgramSpacesReachable,true);
 assert.equal(r.built.worldWrites,0);
 assert.deepEqual(r.built.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(p,frozen);
 const invalid=[
  [{spaceId:'creative-room',preferredFace:'north',scale:'huge'}],
  [{spaceId:'creative-room',preferredFace:'north',scale:'generous'},
   {spaceId:'creative-room',preferredFace:'west',scale:'modest'}],
  [{spaceId:'ghost-room',preferredFace:'west',scale:'modest'}],
  [{spaceId:'entrance',preferredFace:'up',scale:'balanced'}]
 ];
 for(const daylightIntent of invalid)
  assert.throws(()=>compileR190CompactProgram({...p,daylightIntent}),
   /R190_COMPACT_DAYLIGHT_INTENT_FIELDS/);
});

test('model-authored entrance canopy creates real attached shelter over safely traversable entry',()=>{
 for(const face of ['south','north','west','east']){
  const original=base('r190-entry-canopy-'+face,['plain','plain','plain']);
  original.entranceFace=face;
  original.arrivalIntent={form:'sheltered',projection:'deep',span:'wide'};
  const frozen=JSON.stringify(original);
  const scene=compileR190CompactProgram(original);
  const audit=scene.built.audit.entranceCanopy;
  assert.equal(JSON.stringify(original),frozen);
  assert.equal(audit.status,'SOURCE_ATTACHED_SHELTER_OVER_WALKABLE_DOOR');
  assert.equal(audit.realRoofCells,12);
  assert.equal(audit.wallAttachmentCells,2);
  assert.equal(scene.built.audit.entranceApproachTwoWide,true);
  assert.equal(scene.built.audit.allProgramSpacesReachable,true);
  assert(verifyCompiled(scene.built.design,scene.built.compiled));
  assert.equal(scene.built.worldWrites,0);
  assert.deepEqual(scene.built.gates,Array(9).fill('BLOCKED'));
  const old=structuredClone(original);delete old.arrivalIntent;
  const baseline=compileR190CompactProgram(old);
  assert.equal(baseline.built.audit.entranceCanopy,null);
  assert.notEqual(scene.built.compiled.geometrySha256,baseline.built.compiled.geometrySha256);
 }
});
test('no decorative or unsafe arrival intent enters B143',()=>{
 const p=base('r190-canopy-reject');
 for(const arrivalIntent of [
  {form:'floating',projection:'deep',span:'wide'},
  {form:'sheltered',projection:'huge',span:'door'},
  {form:'sheltered',projection:'compact',span:'full'},
  {form:'sheltered',span:'door'},
  {form:'sheltered',projection:'deep',span:'door',worldCommand:'/fill'}])
  assert.throws(()=>compileR190CompactProgram({...p,arrivalIntent}),
   /R190_COMPACT_ARRIVAL_INTENT/);
});

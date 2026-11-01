import test from 'node:test';
import assert from 'node:assert/strict';
import {compileR190CompactProgram,R190_COMPACT_SCHEMA}
 from '../source/ai/r190-compact-program.mjs';
import {deriveR190CompactMinimumWindows}
 from '../source/ai/r190-compact-daylight.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
function sample(id,forms){
 return {schema:R190_COMPACT_SCHEMA,id,title:'Distinct building use and materials',
  brief:'Independent spatial purpose with daylight and functional rooms.',
  entranceFace:'south',materials:{floor:'wood',wall:'stone',roof:'wood'},
  spaces:[
   {id:'entrance',purpose:'Welcome and entrance',size:'balanced',proportion:'wide',
    height:'medium',parentId:null,preferredSide:null,privacy:'public',form:'plain'},
   {id:'large-room',purpose:'Primary work room',size:'generous',proportion:'long',
    height:'high',parentId:'entrance',preferredSide:'north',privacy:'shared',form:forms[0]},
   {id:'quiet-room',purpose:'Quiet functional room',size:'compact',proportion:'square',
    height:'low',parentId:'entrance',preferredSide:'east',privacy:'private',form:forms[1]}
  ]};
}
test('host-derived minimum daylight on three unrelated model programs is full real glazing not cosmetic',()=>{
 for(const [i,forms] of [['ridge','facet'],['sky-court','plain'],['facet','sky-court']].entries()){
  const p=sample('r190-daylight-synthetic-'+i,forms);
  const modelOriginal=JSON.stringify(p),base=compileR190CompactProgram(p);
  const sourceOriginal=JSON.stringify(base.hostDerivedPlan);
  const result=deriveR190CompactMinimumWindows(base);
  assert.equal(result.status,'HOST_DERIVED_WINDOWS_SOURCE_ART_HOLD');
  assert.equal(JSON.stringify(p),modelOriginal);
  assert.equal(JSON.stringify(base.hostDerivedPlan),sourceOriginal);
  assert(result.applied.length>=1);
  assert.equal(result.modelOriginalUnaffected,true);
  assert.notEqual(result.derivedGeometrySha256,result.originalGeometrySha256);
  assert(verifyCompiled(result.current.design,result.current.compiled));
  assert(result.current.audit.allProgramSpacesReachable);
  assert(result.current.audit.realGlazingCells>=4);
  assert(result.applied.every(x=>x.authorship==='HOST_DERIVED_MINIMUM_DAYLIGHT'));
  assert(result.current.inputPlan.glazedOpenings.length===result.applied.length);
  assert.equal(result.worldWrites,0);
  assert.equal(result.modelRequests,0);
  assert.equal(result.constructionApproved,false);
  assert.deepEqual(result.current.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(result.current.BuildPlan.operations,[]);
  assert.equal(result.art,'NOT_REVIEWED');
 }
});
test('daylight refuses unverifiable old source or pre-existing window changes',()=>{
 const base=compileR190CompactProgram(sample('r190-daylight-denial',['plain','plain']));
 const copied=structuredClone(base);
 copied.built.compiled.primitives[0][3]=99;
 assert.throws(()=>deriveR190CompactMinimumWindows(copied),/BASE_NOT_VERIFIED/);
 const duplicate=structuredClone(base);
 duplicate.hostDerivedPlan.glazedOpenings=[{
  spaceId:'entrance',face:'west',offset:3,baseY:5,width:2,height:2}];
 assert.throws(()=>deriveR190CompactMinimumWindows(duplicate),/BASE_ALREADY_HAS_WINDOWS/);
});

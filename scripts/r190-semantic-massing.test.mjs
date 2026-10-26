import test from 'node:test';
import assert from 'node:assert/strict';
import {R190_SCHEMA,validateR190SemanticPlan,compileR190SemanticPlan}
 from '../source/ai/r190-semantic-massing.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const S=(id,purpose,width,depth,height,parentId,side,privacy)=>
 ({id,purpose,width,depth,height,parentId,side,privacy});
const common=(id,spaces)=>({schema:R190_SCHEMA,id,title:'Semantic spatial composition',
 brief:'Real source-volume experiment, caller IR only, not genuine model architecture',
 site:{width:76,depth:76,height:24},entrySpaceId:spaces[0].id,spaces,
 materials:{floor:'wood',wall:'concrete',roof:'metal'}});
const cases=[
 common('r190-home',[
  S('living','Shared day room',13,14,8,null,null,'shared'),
  S('sleeping','Private bedroom',12,11,7,'living','north','private'),
  S('cooking','Food preparation',9,10,8,'living','east','shared'),
  S('storage','Service storage',7,9,7,'cooking','north','private')]),
 common('r190-shop',[
  S('showroom','Public display and customer arrival',17,13,10,null,null,'public'),
  S('workshop','Workshop for making goods',13,14,9,'showroom','north','shared'),
  S('receiving','Stock receiving',10,12,7,'workshop','east','private'),
  S('office','Staff bookkeeping',8,9,8,'showroom','west','private')]),
 common('r190-lab',[
  S('commons','Small communal arrival hall',12,11,8,null,null,'public'),
  S('analysis','Analysis and shared instruments',11,13,10,'commons','west','shared'),
  S('wetlab','Experimental bench area',12,12,9,'analysis','north','private'),
  S('archives','Documentation storage',9,12,7,'commons','north','private')])
];
export const R190_STATIC_SYNTHETIC_CASES=cases;

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

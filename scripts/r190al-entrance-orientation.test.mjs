/** Model-authored directional entrance; synthetic B143, no Minecraft I/O. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
import {asAF} from './r190ag-synthetic-fixtures.mjs';
import {compileR190SemanticPlan,validateR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {inspectR190AFIntent} from '../source/ai/r190af-program-intent.mjs';
import {studyR190AG,r190AGSemanticProjection} from '../source/ai/r190ag-integrated-proposals.mjs';
import {reviewR190AJOriginal} from '../source/ai/r190aj-model-intent-adapter.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const faces=['south','north','east','west'];
const source=(face='south')=>{
 const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[1]);
 p.spaces=p.spaces.slice(0,3);
 if(face==='north')p.spaces[1].side='east';
 return p;
};
const expected=(r,face)=>{
 const x=r.x+Math.floor((r.w-2)/2),z=r.z+Math.floor((r.d-2)/2);
 if(face==='south')return {door:[x,2,r.z],shape:[2,3,1],approach:[x,1,r.z-3],land:[2,1,3]};
 if(face==='north')return {door:[x,2,r.z+r.d-1],shape:[2,3,1],approach:[x,1,r.z+r.d],land:[2,1,3]};
 if(face==='west')return {door:[r.x,2,z],shape:[1,3,2],approach:[r.x-3,1,z],land:[3,1,2]};
 return {door:[r.x+r.w-1,2,z],shape:[1,3,2],approach:[r.x+r.w,1,z],land:[3,1,2]};
};
const safe=r=>{
 assert.equal(r.worldWrites,0);assert.equal(r.worldContacts,0);
 assert.equal(r.constructionApproved,false);assert.equal(r.executionAllowed,false);
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.art,'ART_HOLD');
};
test('AL default south geometry and all design elements remain backward compatible',()=>{
 const old=compileR190SemanticPlan(source());
 const explicit=source();explicit.entranceFace='south';
 const next=compileR190SemanticPlan(explicit);
 assert.equal(next.compiled.geometrySha256,old.compiled.geometrySha256);
 assert.deepEqual(next.design.elements,old.design.elements);
 assert.deepEqual(next.layout.spaces,old.layout.spaces);
 assert.equal(old.audit.entranceFace,'south');safe(old);safe(next);
});
test('AL four model-authored entry faces produce correct physical doors and real exterior floors',()=>{
 const hashes=new Set();
 for(const face of faces){
  const plan=source(face);plan.entranceFace=face;
  const before=JSON.stringify(plan),built=compileR190SemanticPlan(plan);
  assert.equal(JSON.stringify(plan),before);
  assert.equal(built.layout.entranceFace,face);
  assert.equal(built.audit.entranceFace,face);
  assert.equal(built.audit.entranceApproachTwoWide,true);
  assert.equal(built.audit.allProgramSpacesReachable,true);
  assert.equal(built.audit.witnesses.length,plan.spaces.length);
  const r=built.layout.spaces.find(s=>s.id===plan.entrySpaceId),e=expected(r,face);
  const door=built.design.elements.find(x=>x.id==='entry-cut');
  const landing=built.design.elements.find(x=>x.id==='approach-floor');
  assert.deepEqual(door.origin,e.door);assert.deepEqual(door.size,e.shape);
  assert.deepEqual(landing.origin,e.approach);assert.deepEqual(landing.size,e.land);
  assert.equal(built.compiled.stats.designOperations.find(x=>x.element==='entry-cut').removed,6);
  assert(verifyCompiled(built.design,built.compiled));safe(built);
  hashes.add(built.compiled.geometrySha256);
 }
 assert.equal(hashes.size,4);
});
test('AL root child on selected entrance face or invalid face fails closed',()=>{
 for(const face of faces){
  const p=source(face);p.entranceFace=face;
  p.spaces[1].side=face;
  assert.throws(()=>validateR190SemanticPlan(p),/ENTRY_COLLISION/);
 }
 for(const face of ['up',null,0,'']){
  const p=source();p.entranceFace=face;
  assert.throws(()=>validateR190SemanticPlan(p),/ENTRANCE_FACE/);
 }
});
test('AL model-authored west doorway conflicts with root facade window sill',()=>{
 const p=source();p.entranceFace='west';
 const root=p.spaces[0],offset=Math.floor((root.depth-2)/2);
 p.glazedOpenings=[{spaceId:root.id,face:'west',offset,baseY:5,width:2,height:2}];
 assert.throws(()=>validateR190SemanticPlan(p),/GLAZING_ENTRY_DOOR_CONFLICT/);
 p.glazedOpenings[0].baseY=6;
 assert.equal(validateR190SemanticPlan(p),true);
});
test('AL AF AG AJ preserve four authored directions through true B143 pipeline',()=>{
 for(const face of faces){
  const p=asAF(source(face));p.entranceFace=face;
  const raw=JSON.stringify(p),af=inspectR190AFIntent(raw);
  assert.equal(af.status,'PROVISIONAL_SOURCE_ONLY_NO_ART_APPROVAL',af.error);
  assert.equal(r190AGSemanticProjection(p).entranceFace,face);
  const ag=studyR190AG(raw);
  assert.equal(ag.baseline.audit.entranceFace,face);
  assert.equal(ag.baseline.compiled.geometrySha256,af.sourcePreview.geometrySha256);
  const aj=reviewR190AJOriginal(raw);
  assert.equal(aj.receipt.status,'PROVISIONAL_B143_NO_ART_APPROVAL');
  assert.equal(aj.ag.baseline.audit.entranceFace,face);
  safe(ag.baseline);safe(aj.receipt);
 }
});

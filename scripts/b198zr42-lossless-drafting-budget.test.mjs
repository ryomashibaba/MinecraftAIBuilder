/**
 * R42: real B143 parity with synthetic architecture only.
 * No Qwen calls, Minecraft contact, source mutation or output repair.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {inspectR42AuthoringBudget} from
 '../source/ai/b198zr42-lossless-drafting-budget.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,origin,size,...(material?{material}:{})});
const sample=()=>{
 const p=r32Courtyard();
 for(let i=0;i<4;i++)
  p.design.elements.push(box('column'+i,'add',
   [2+i*3,1,12],[1,3,1],'metal'));
 return p;
};
test('R42 identifies four contiguous repeated authored columns with exact voxel parity',()=>{
 const p=sample(),raw=JSON.stringify(p);
 const before=compileDesign(p.design);
 const result=inspectR42AuthoringBudget(raw);
 assert.equal(result.status,'OFFLINE_DRAFTING_EFFICIENCY_INSPECTED');
 assert.equal(result.designSourceSha256,before.sourceSha256);
 assert.equal(result.rawSha256,sha(raw));
 assert.equal(result.originalBytes,Buffer.byteLength(raw));
 assert.equal(result.canonicalWholeResponseBytes,Buffer.byteLength(raw));
 assert.equal(result.consecutiveRepeatCandidateGroups,1);
 assert.equal(result.parityVerifiedSuggestions.length,1);
 const s=result.parityVerifiedSuggestions[0];
 assert.deepEqual(s.originalElementIds,['column0','column1','column2','column3']);
 assert.deepEqual(s.proposedRepeat,{count:4,offset:[3,0,0]});
 assert(s.savedCanonicalDesignBytes>0);
 assert.equal(s.exactFinalPrimitivesParity,true);
 assert.equal(result.finalConceptualVoxelCount,before.primitives.length);
 assert.equal(result.originalUntouched,true);
 assert.equal(result.sourceAutoRepaired,false);
 assert.equal(result.modelCalls,0);
 assert.equal(result.worldContacts,0);
 assert.equal(result.worldWrites,0);
 assert(result.safety.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(result.safety.BuildPlan.operations,[]);
});
test('R42 does not infer a repetitive run from irregular offsets',()=>{
 const p=sample();
 p.design.elements.at(-1).origin[0]--;
 const a=inspectR42AuthoringBudget(JSON.stringify(p));
 assert.equal(a.consecutiveRepeatCandidateGroups,1);
 assert.equal(a.parityVerifiedSuggestions[0].consecutiveCount,3);
});
test('R42 preserves ADD/CUT ordering: nonconsecutive items never merge',()=>{
 const p=sample();
 const elements=p.design.elements;
 elements.splice(elements.length-2,0,box('interrupt-cut','cut',[3,1,12],[1,1,1]));
 const a=inspectR42AuthoringBudget(JSON.stringify(p));
 assert.equal(a.parityVerifiedSuggestions.length,0);
});
test('R42 accepts geometry that has no repeats without treating it as model success',()=>{
 const raw=JSON.stringify(r32Courtyard());
 const a=inspectR42AuthoringBudget(raw);
 assert.equal(a.status,'OFFLINE_DRAFTING_EFFICIENCY_INSPECTED');
 assert.equal(a.consecutiveRepeatCandidateGroups,0);
 assert.equal(a.parityVerifiedSuggestions.length,0);
 assert.equal(a.outputTokensMeasured,false);
 assert.equal(a.actualArchitectureQualityVerified,false);
 assert.equal(a.originalAuthorshipVerified,false);
});
test('R42 fails closed on an illegal CUT material without changing original',()=>{
 const p=r32Courtyard();p.design.elements.find(e=>e.mode==='cut').material='glass';
 const raw=JSON.stringify(p),a=inspectR42AuthoringBudget(raw);
 assert.equal(a.status,'HOLD_SOURCE_NOT_ANALYZABLE');
 assert.equal(a.sourceErrorCode,'B143_MATERIAL');
 assert.equal(a.rawSha256,sha(raw));
 assert.equal(JSON.parse(raw).design.elements.find(e=>e.mode==='cut').material,'glass');
 assert.deepEqual(a.parityVerifiedSuggestions,[]);
});
test('R42 does not repair truncated JSON or invent output token savings',()=>{
 const a=inspectR42AuthoringBudget('{"design":');
 assert.equal(a.status,'HOLD_SOURCE_NOT_ANALYZABLE');
 assert.equal(a.outputTokensMeasured,false);
 assert.equal(a.modelArchitecturalImprovementProven,false);
 assert.equal(a.sourceAutoRepaired,false);
 assert.equal(a.liveProfileEnabled,false);
});
test('R42 candidate does not alter frozen source and does not sum independent savings',()=>{
 const p=sample(),raw=JSON.stringify(p);
 const original=structuredClone(p);
 const a=inspectR42AuthoringBudget(raw);
 assert.deepEqual(p,original);
 assert.equal(a.totalSavingsCannotBeAddedWithoutJointValidation,true);
 assert.equal(a.noModificationWasApplied,true);
 assert.equal(a.actualOutputTokenReductionVerified,false);
});

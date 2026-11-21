/** R9: genuine B143 compiler/source-only geometric and route regressions.
 * These are SELF-GENERATED FIXTURES, never real Qwen samples or world proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileDesign,validateDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
import {evaluateFunctionalReviewContract,SCHEMA as CONTRACT}
 from '../source/ai/b198zr3-functional-review-contract.mjs';
import {R4_PLANNING_GUIDE} from '../source/ai/b198zr4-planned-source.mjs';
import {createB198SNativeBridge} from '../source/ai/b198s-native-ollama-source.mjs';
const bounds={width:40,height:18,depth:24};
const box=(id,origin,size)=>({id,mode:'add',shape:'box',material:'concrete',
 origin,size});
const flight=(axis='x',direction=1)=>({
 id:'one-flight',shape:'staircase',mode:'add',material:'concrete',
 origin:axis==='x'?[3,1,4]:[4,1,3],axis,direction,
 width:3,steps:6,treadDepth:2
});
const design=(elements)=>({schema:'minecraftaibuilder-b143-building-dsl-v1',
 designOnly:true,id:'r9-compact-functional-test',title:'Compact structural stair',
 brief:'Source-only generic geometry; not an approved Minecraft stairblock',
 bounds:{...bounds},elements});
function equivalentBoxes(e){
 const along=e.axis==='x'?0:2;
 return Array.from({length:e.steps},(_,i)=>{
  const p=e.origin.slice();
  // With negative progression, each tread block occupies the reverse span.
  p[along]+=e.direction===1?i*e.treadDepth:
   -(i*e.treadDepth+e.treadDepth-1);
  const size=[e.axis==='x'?e.treadDepth:e.width,i+1,
   e.axis==='z'?e.treadDepth:e.width];
  return box('old-step-'+i,p,size);
 });
}
test('R9 compact staircase is EXACTLY the same final conceptual voxels as repeated supported boxes',()=>{
 for(const [axis,direction,origin] of [
  ['x',1,[3,1,4]],['x',-1,[19,1,4]],
  ['z',1,[4,1,3]],['z',-1,[4,1,19]]
 ]){
  const e={...flight(axis,direction),origin};
  const compact=compileDesign(design([e]));
  const expanded=compileDesign(design(equivalentBoxes(e)));
  assert.deepEqual(compact.primitives,expanded.primitives,
   'No approximation, data loss or shape substitution');
  assert.equal(compact.stats.voxels,expanded.stats.voxels);
  assert.equal(compact.stats.voxels,
   e.width*e.treadDepth*e.steps*(e.steps+1)/2);
  assert(verifyCompiled(design([e]),compact));
  assert.equal(compact.worldContacts,0);
  assert.equal(compact.BuildPlan.operations.length,0);
 }
});
test('R9 29 historical stair boxes compress into exactly one source element',()=>{
 const e={...flight(),steps:29,origin:[1,1,1],width:3,treadDepth:1};
 const large={width:40,height:40,depth:24};
 const c=design([e]);c.bounds=large;
 const b=design(equivalentBoxes(e));b.bounds=large;
 const compact=compileDesign(c),expanded=compileDesign(b);
 assert.deepEqual(compact.primitives,expanded.primitives);
 assert.equal(c.elements.length,1);assert.equal(b.elements.length,29);
 const saved=1-JSON.stringify(c.elements).length/JSON.stringify(b.elements).length;
 assert(saved>0.9,'source JSON should shrink by more than 90%');
 assert.notEqual(compact.sourceSha256,expanded.sourceSha256,
  'different source authorship must remain separately hashable');
});
test('R9 real B198Z-R3 occupancy sees ascending connected two-wide flight and upper landing',()=>{
 const d=design([
  box('ground',[0,0,0],[40,1,24]),
  flight(),
  box('upper-landing',[15,6,4],[8,1,3])
 ]);
 const c=compileDesign(d);
 const review=evaluateFunctionalReviewContract({design:d,compiled:c,contract:{
  schema:CONTRACT,caseId:'r9-staircase-contract',
  authorship:'TEST_FIXTURE',sourceSha256:c.sourceSha256,
  entrance:[2,1,5],headroom:2,protectedVoids:[],
  destinations:[{id:'top-floor',point:[17,7,5],maximumPathSteps:30}],
  functionalZones:[{id:'upper-functional-area',origin:[15,7,4],size:[7,1,3],
   minimumReachablePositions:18,minimumReachablePercent:85}]
 }});
 assert.equal(review.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 assert.equal(review.results.destinations[0].passed,true);
 assert.equal(review.results.functionalZones[0].passed,true);
 assert.equal(review.unverified.minecraftActualWalking,true,
  'Minecraft physical stair block/collision is NEVER automatically certified');
});
test('R9 refuses schema pollution, incomplete or outside bounds and unsupported modes',()=>{
 const e=flight();
 const invalid=[
  {...e,direction:0},{...e,axis:'y'}, {...e,width:1},
  {...e,steps:33},{...e,steps:1},{...e,treadDepth:0},
  {...e,treadDepth:4},{...e,origin:[39,1,4]},
  {...e,origin:[3,17,4]},{...e,shape:'staircase',mode:'cut',material:undefined},
  {...e,shell:1},{...e,unexpected:'unsafe-extra'},
  {...e,thickness:1},{...e,origin:[-1,1,4]}
 ];
 for(const wrong of invalid)
  assert.throws(()=>validateDesign(design([wrong])),/B143_/,
   'bad staircase should never bypass strict grammar');
});
test('R9 staircase-only options can NEVER be smuggled onto pre-existing shape types',()=>{
 const base=box('legacy-rectangle',[1,1,1],[3,2,3]);
 for(const key of ['direction','width','steps','treadDepth']){
  const polluted={...base,[key]:2};
  assert.throws(()=>validateDesign(design([polluted])),/B143_NON_STAIRCASE_EXTRA/);
 }
});
test('R9 ordered cut of open shaft still obeys final B143 voxel occupancy',()=>{
 const d=design([
  flight(),
  {id:'clear-middle',shape:'box',mode:'cut',origin:[8,1,4],size:[3,7,3]}
 ]);
 const compiled=compileDesign(d);
 assert.equal(compiled.stats.designOperations[1].mode,'cut');
 assert(compiled.stats.designOperations[1].removed>0);
 assert(compiled.primitives.every(p=>!(p[0]>=8&&p[0]<=10&&
  p[1]>=1&&p[1]<=7&&p[2]>=4&&p[2]<=6)));
});
test('R9 generic native guidance offers staircase, without changing default R4 consent',()=>{
 assert(R4_PLANNING_GUIDE.includes('staircase'));
 const bridge=createB198SNativeBridge({plannedSourceMode:true});
 assert.equal(bridge.requestBudget.r4PlannedSourceOptIn,true);
 assert.equal(bridge.requestBudget.worldWrites,0);
});
test('R9 legacy real assistant-authored R2 source SHA and voxel count are unchanged',()=>{
 const source=JSON.parse(fs.readFileSync(
  new URL('../evidence/b198zr2/assistant-revised-library-r2.json',import.meta.url),
  'utf8'));
 const c=compileDesign(source);
 assert.equal(c.sourceSha256,
  '7e5b1885a398d5e98f1298915947bc66eae56d4ccf4b413274da780a3778c218');
 assert.equal(c.primitives.length,15312);
 assert.equal(c.worldContacts,0);
 assert.equal(c.readiness,'NOT_PREPARED');
});

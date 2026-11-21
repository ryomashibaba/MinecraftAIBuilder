/**
 * B198Z R10: constrained generic architectural repetition.
 * Fixtures here are programmatically authored; NEVER real Qwen evidence.
 * No localhost, Qwen, Minecraft client, block writer, or GPU use.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileDesign,validateDesign,verifyCompiled,MAX_WORK}
 from '../source/ai/b143-building-dsl.mjs';
import {evaluateFunctionalReviewContract,SCHEMA as CONTRACT}
 from '../source/ai/b198zr3-functional-review-contract.mjs';
import {R4_PLANNING_GUIDE} from '../source/ai/b198zr4-planned-source.mjs';
import {createB198SNativeBridge} from '../source/ai/b198s-native-ollama-source.mjs';

const design=(elements,bounds={width:64,height:48,depth:64})=>({
 schema:'minecraftaibuilder-b143-building-dsl-v1',
 id:'r10-offline-generic-test',title:'R10 geometric fixtures',
 brief:'Fixture only, not a Qwen proposal or Minecraft building',
 bounds,designOnly:true,elements
});
const box=(id,origin,size,mode='add')=>({
 id,shape:'box',mode,...(mode==='add'?{material:'concrete'}:{}),origin,size
});
const shifted=(e,i)=>{
 const delta=e.repeat.offset.map(v=>v*i),v={...e,id:e.id+'-expanded-'+i};
 delete v.repeat;
 for(const key of ['origin','center','start','end']){
  if(Array.isArray(e[key]))
   v[key]=e[key].map((n,j)=>n+delta[j]);
 }
 return v;
};
const assertParity=(e,other=[])=>{
 const repeated=design([...other,e]),
  expanded=design([...other,...Array.from({length:e.repeat.count},
   (_,i)=>shifted(e,i))]);
 const a=compileDesign(repeated),b=compileDesign(expanded);
 assert.deepEqual(a.primitives,b.primitives,'Every final voxel and material must match');
 assert.notEqual(a.sourceSha256,b.sourceSha256,'Never relabel expanded authorship');
 assert(verifyCompiled(repeated,a));
 assert.equal(a.designOnly,true);
 assert.equal(a.readiness,'NOT_PREPARED');
 assert.deepEqual(a.BuildPlan.operations,[]);
 assert.equal(a.worldContacts,0);
 return {a,b,repeated,expanded};
};
test('R10 translate repeated boxes, windows, beams, cylinders, ellipsoids, torus and stairs exactly',()=>{
 const primitives=[
  {id:'columns',shape:'box',mode:'add',material:'metal',
   origin:[4,1,4],size:[2,10,2],repeat:{count:10,offset:[4,0,0]}},
  {id:'window-voids',shape:'box',mode:'cut',
   origin:[3,3,3],size:[2,4,1],repeat:{count:9,offset:[4,0,0]}},
  {id:'beams',shape:'beam',mode:'add',material:'wood',
   start:[4,14,4],end:[14,14,4],thickness:1,
   repeat:{count:3,offset:[0,0,5]}},
  {id:'cylinders',shape:'cylinder',mode:'add',material:'metal',
   origin:[5,5,5],axis:'y',length:7,radius:2,
   repeat:{count:5,offset:[7,0,0]}},
  {id:'domes',shape:'ellipsoid',mode:'add',material:'glass',
   center:[9,10,9],radii:[3,3,3],
   repeat:{count:4,offset:[9,0,0]}},
  {id:'rings',shape:'torus',mode:'add',material:'accent',
   center:[12,12,12],axis:'y',majorRadius:5,tubeRadius:2,
   repeat:{count:3,offset:[15,0,0]}},
  {id:'stair-flights',shape:'staircase',mode:'add',material:'concrete',
   origin:[3,2,4],axis:'z',direction:1,width:3,steps:5,treadDepth:2,
   repeat:{count:3,offset:[10,0,0]}}
 ];
 for(const e of primitives)assertParity(e,e.mode==='cut'?
   [box('wall',[1,1,1],[51,15,16])]:[]);
});
test('R10 reverse/signed offsets obey negative progression but never negative voxel coordinates',()=>{
 const e={id:'negative-ribs',shape:'box',mode:'add',material:'accent',
  origin:[52,4,9],size:[2,10,2],
  repeat:{count:9,offset:[-5,0,2]}};
 const {a}=assertParity(e);
 assert.equal(a.stats.designOperations[0].instances,9);
 assert.equal(a.primitives.length,9*2*10*2);
});
test('R10 repeated source reduces 20 identical facade ribs to one source element',()=>{
 const e={id:'facade-rib',shape:'box',mode:'add',material:'metal',
  origin:[1,1,2],size:[1,9,2],repeat:{count:20,offset:[3,0,0]}};
 const {a,repeated,expanded}=assertParity(e);
 assert.equal(repeated.elements.length,1);
 assert.equal(expanded.elements.length,20);
 const small=JSON.stringify(repeated.elements).length,
  large=JSON.stringify(expanded.elements).length;
 assert((1-small/large)>.88,'JSON element count should shrink >88% in this fixture');
 assert.equal(a.stats.designOperations[0].instances,20);
});
test('R10 repeated CUT removes original cells in correct ordering before later ADD',()=>{
 const cut={id:'array-windows',shape:'box',mode:'cut',origin:[4,4,1],
  size:[2,3,2],repeat:{count:5,offset:[5,0,0]}};
 const base=box('envelope',[2,1,1],[31,9,12]);
 const final=box('new-trim',[4,4,1],[1,1,2]);
 const {a,b}=assertParity(cut,[base]);
 const all=compileDesign(design([base,cut,final]));
 const legacy=compileDesign(design([base,
  ...Array.from({length:5},(_,i)=>shifted(cut,i)),final]));
 assert.deepEqual(all.primitives,legacy.primitives);
 assert(a.stats.designOperations[1].removed>0);
 assert.equal(all.stats.designOperations.length,3);
 assert.equal(b.stats.designOperations.length,6);
 assert.equal(all.stats.designOperations[2].mode,'add');
});
test('R10 rejects repeat schema pollution, invalid counts/offsets and out-of-bounds last copy',()=>{
 const base=box('window',[2,2,2],[2,2,2]);
 const invalid=[
  {count:1,offset:[1,0,0]},
  {count:33,offset:[1,0,0]},
  {count:2,offset:[0,0,0]},
  {count:2,offset:[1.5,0,0]},
  {count:2,offset:[200,0,0]},
  {count:2,offset:[1,0]},
  {count:2,offset:'1,0,0'},
  {count:2,offset:[1,0,0],extra:'nested'},
  {count:2},
  {count:3,offset:[1,0,0],repeat:{count:2}},
  null, [],
  {count:2,offset:[1,0,0],constructionApproved:true}
 ];
 for(const rep of invalid)
  assert.throws(()=>validateDesign(design([{...base,repeat:rep}])),
   /B143_REPEAT_FIELDS/,JSON.stringify(rep));
 for(const [origin,offset,count] of [
  [[61,2,2],[1,0,0],3],[[2,1,2],[-2,0,0],3],
  [[2,46,2],[0,2,0],2],[[2,2,62],[0,0,1],2]
 ]){
  assert.throws(()=>validateDesign(design([{
   ...base,origin,repeat:{count,offset}
  }])),/B143_OUTSIDE_LOCAL_BOUNDS/);
 }
});
test('R10 rejects multiplicative work budget even if final geometry would overlap',()=>{
 const e=box('massive-repeated-areas',[0,0,0],[48,32,48]);
 const d=design([{...e,repeat:{count:32,offset:[1,0,0]}}],
  {width:90,height:60,depth:60});
 assert(d.bounds.width*d.bounds.height*d.bounds.depth<=500000);
 assert(48*32*48*32>MAX_WORK);
 assert.throws(()=>validateDesign(d),/B143_WORK_BUDGET/);
});
test('R10 generic repeated columns preserve an independent reachable public entrance corridor',()=>{
 const d=design([
  box('base',[0,0,0],[64,1,35]),
  {id:'edge-columns',shape:'box',mode:'add',material:'stone',
   origin:[3,1,3],size:[2,8,2],repeat:{count:8,offset:[7,0,0]}}
 ]);
 const c=compileDesign(d);
 const review=evaluateFunctionalReviewContract({design:d,compiled:c,contract:{
  schema:CONTRACT,caseId:'r10-open-public-floor',
  authorship:'TEST_FIXTURE',sourceSha256:c.sourceSha256,
  entrance:[1,1,12],headroom:2,
  protectedVoids:[{id:'open-foyer',origin:[2,1,11],size:[8,4,8],
   maxOccupiedCells:0}],
  destinations:[{id:'rear-reception',point:[55,1,12],maximumPathSteps:65}],
  functionalZones:[{id:'main-floor',origin:[5,1,8],size:[30,1,15],
   minimumReachablePositions:420,minimumReachablePercent:93}]
 }});
 assert.equal(review.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 assert.equal(review.unverified.minecraftActualWalking,true);
});
test('R10 cannot weaken legacy R2 SHA, existing R9 staircase or model provenance',()=>{
 const legacy=JSON.parse(fs.readFileSync(
  new URL('../evidence/b198zr2/assistant-revised-library-r2.json',import.meta.url),
  'utf8'));
 const c=compileDesign(legacy);
 assert.equal(c.sourceSha256,
  '7e5b1885a398d5e98f1298915947bc66eae56d4ccf4b413274da780a3778c218');
 assert.equal(c.primitives.length,15312);
 assert(c.stats.designOperations.every(e=>!Object.hasOwn(e,'instances')));
 assert(R4_PLANNING_GUIDE.includes('repeat'));
 const bridge=createB198SNativeBridge({plannedSourceMode:true});
 assert.equal(bridge.requestBudget.r4PlannedSourceOptIn,true);
 assert.equal(bridge.requestBudget.worldWrites,0);
 assert.deepEqual(c.BuildPlan.operations,[]);
});

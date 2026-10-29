import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {compileR190BNAssembly} from '../source/ai/r190bn-spatial-assembly.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {twoLevelReadingProbe,longConcourseProbe} from './fixtures/r190bn-spatial-assemblies.mjs';
import {studyR190BNCapacity} from './r190bn-offline-design-study.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
const run=q=>compileR190BNAssembly(Buffer.from(JSON.stringify(q.plan)),
 {originalBrief:q.brief,authorship:'SYNTHETIC_TEST_FIXTURE'});

test('BN enclosure matches independent six-face cell/material oracle; interior remains air',()=>{
 const q=twoLevelReadingProbe(),p=q.plan;
 p.levels=[{id:'test-level',standingY:1}];
 p.spaces=[{id:'test-space',levelId:'test-level',purpose:'合成検証の空間',origin:[1,1],
  size:[8,9],clearHeight:6,minimumReachablePositions:50,minimumReachablePercent:80}];
 p.operations=[{kind:'enclosure',id:'test-envelope',spaceId:'test-space',thickness:1,
  materials:{floor:'wood',wall:'concrete',roof:'metal'}}];
 p.protectedVoids=[];p.entrance=[2,1,2];p.destinations=[{id:'test-goal',point:[7,1,8],maximumPathSteps:30}];
 const r=run(q),actual=new Map(r.compiled.primitives.map(([x,y,z,m])=>[[x,y,z].join(','),m]));
 const expected=new Map();
 for(let y=0;y<8;y++)for(let z=0;z<11;z++)for(let x=0;x<10;x++){
  let material=null;
  if(y===0)material=4; // B143 wood
  else if(y===7)material=2; // metal
  else if(x===0||x===9||z===0||z===10)material=1; // concrete
  if(material!==null)expected.set([x,y,z].join(','),material);
 }
 assert.deepEqual(actual,expected);
 assert.equal(r.spaceEvidence[0].obstructedAirCells,0);
 assert.equal(r.hostChoseLayoutOrLevels,false);
 assert.equal(r.outputIsOriginalModelAuthoredB143,false);
});

test('BN preserves authored two storeys and enclosed stair/landing route using existing R4',()=>{
 const q=twoLevelReadingProbe(),before=Buffer.from(q.original),r=compileR190BNAssembly(q.original,
  {originalBrief:q.brief,authorship:'SYNTHETIC_TEST_FIXTURE'});
 assert.deepEqual(q.original,before);assert.equal(r.originalInputSha256,H(before));
 assert.deepEqual(r.levels,q.plan.levels);assert.deepEqual(r.programSpaces,q.plan.spaces);
 assert.equal(r.status,'SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD');
 const flight=r.proposal.design.elements.find(x=>x.id==='authored-flight');
 assert.deepEqual(flight.origin,[18,0,3]);assert.equal(flight.steps,9);assert.equal(flight.axis,'z');
 assert(r.spaceEvidence.every(x=>x.declaredArea===288&&x.unsupportedFloorCells===0&&x.obstructedAirCells===0));
 const dest=r.functionalReview.evidence.results.destinations[0];
 assert.equal(dest.reachable,true);assert(dest.shortestPathSteps>30&&dest.shortestPathSteps<100);
 assert.equal(r.art,'ART_HOLD');assert.equal(r.worldContacts,0);assert.equal(r.modelCalls,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
});

test('BN cannot invent a missing stair or upper portal; usable floors stay unreachable',()=>{
 for(const remove of ['authored-flight','upper-core-portal']){
  const q=twoLevelReadingProbe();q.plan.operations=q.plan.operations.filter(x=>(x.element?.id??x.id)!==remove);
  const r=run(q);
  assert.equal(r.status,'HOLD_DERIVED_SOURCE_FUNCTION');
  assert.equal(r.functionalReview.evidence.results.destinations[0].reachable,false);
  assert.equal(r.spaceEvidence[1].obstructedAirCells,0);
  assert.equal(r.hostRepairedSource,false);
 }
});

test('BN rejects invalid stair syntax without material/axis/step repair',()=>{
 for(const [field,value,expected] of [['axis','y',/B143_STAIRCASE_FIELDS/],
  ['steps',96,/B143_STAIRCASE_FIELDS/],['material',undefined,/B143_MATERIAL/]]){
  const q=twoLevelReadingProbe(),stair=run(q).proposal.design.elements.find(x=>x.id==='authored-flight');
  stair[field]=value;
  q.plan.operations=q.plan.operations.map(x=>x.id==='authored-flight'?{kind:'primitive',element:stair}:x);
  assert.throws(()=>run(q),expected);
 }
 const diagonal=twoLevelReadingProbe();diagonal.plan.operations.find(x=>x.kind==='flight').end=[19,20];
 assert.throws(()=>run(diagonal),/FLIGHT_HORIZONTAL_ALIGNMENT/);
 const tooHigh=twoLevelReadingProbe();tooHigh.plan.bounds.height=64;
 tooHigh.plan.levels[1].standingY=40;
 assert.throws(()=>run(tooHigh),/FLIGHT_RISE_EXCEEDS_B143/);
});

test('BN detects an actual filled room after ordered composition; purpose labels do not pass',()=>{
 const q=twoLevelReadingProbe();q.plan.operations.push({kind:'primitive',element:{
  id:'bad-solid-room',shape:'box',mode:'add',material:'concrete',origin:[3,9,3],size:[12,7,24]}});
 const r=run(q);
 assert.equal(r.spaceEvidence[1].obstructedAirCells,12*7*24);
 assert.equal(r.status,'HOLD_DERIVED_SOURCE_FUNCTION');
 assert.equal(r.hostRepairedSource,false);
});

test('BN changed level is preserved; a reachable old roof point cannot certify the new upper space',()=>{
 const stale=twoLevelReadingProbe();stale.plan.levels[1].standingY=13;
 assert.throws(()=>run(stale),/FLIGHT_ENDPOINT_LEVEL_MISMATCH/);
 const q=twoLevelReadingProbe(),oldStair=run(q).proposal.design.elements.find(x=>x.id==='authored-flight');
 q.plan.operations=q.plan.operations.map(x=>x.id==='authored-flight'?{kind:'primitive',element:oldStair}:x);
 q.plan.levels[1].standingY=13;
 const r=run(q);
 assert.equal(r.proposal.design.elements.find(e=>e.id==='upper-envelope-skin').origin[1],12);
 assert.deepEqual(r.proposal.spatialPlan.destinations,q.plan.destinations);
 assert.equal(r.status,'HOLD_DERIVED_SOURCE_FUNCTION');
 // The old point still stands on the lower enclosure's roof at y=9.
 // That is NOT access to the upper program space now authored at y=13.
 assert.equal(r.functionalReview.evidence.results.destinations[0].reachable,true);
 assert.equal(r.functionalReview.evidence.results.functionalZones[1].reachable,0);
 const bad=twoLevelReadingProbe();bad.plan.levels[1].standingY=96;
 assert.throws(()=>run(bad),/R190BN_LEVEL/);
 assert.throws(()=>compileR190BNAssembly(q.original,{originalBrief:Buffer.from('別の日本語依頼です。')}),/BRIEF_BINDING/);
});

test('BN retains non-box authorship in a distinct long public-space probe',()=>{
 const q=longConcourseProbe(),r=run(q);
 const before=q.plan.operations.find(x=>x.element?.id==='curved-cover').element;
 const after=r.proposal.design.elements.find(x=>x.id==='curved-cover');
 assert.deepEqual(after,before);assert.equal(r.spaceEvidence[0].declaredArea,1160);
 assert.equal(r.status,'SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD');
});

test('BN capacity measures transient CSG failure separately from final geometry and height',()=>{
 const r=studyR190BNCapacity(),m=new Map(r.results.map(x=>[x.id,x]));
 assert.equal(m.get('solid-then-cut').failure,'B143_VOXEL_BUDGET');
 assert.equal(m.get('direct-shell').voxels,21768);
 assert.equal(m.get('explicit-six-surfaces').physicalCellsSha256,m.get('direct-shell').physicalCellsSha256);
 assert.equal(m.get('shell-with-23-floors').voxels,62688);
 assert.equal(m.get('wide-25-floors').voxels,156360);
 assert.equal(m.get('wide-26-floors').failure,'B143_VOXEL_BUDGET');
 assert.equal(r.wide26AlgebraicCells,161148);
 assert.equal(m.get('height-128').failure,'B143_BOUNDS');
 const q=twoLevelReadingProbe(),p=q.plan;
 p.bounds={width:64,height:96,depth:32};
 p.levels=[{id:'single-level',standingY:1}];
 p.spaces=[{id:'large-air-space',levelId:'single-level',purpose:'大空間の変換容量検証',
  origin:[1,1],size:[62,30],clearHeight:94,minimumReachablePositions:1800,minimumReachablePercent:90}];
 p.operations=[{kind:'enclosure',id:'large-envelope',spaceId:'large-air-space',thickness:1,
  materials:{floor:'concrete',wall:'concrete',roof:'concrete'}}];
 p.entrance=[2,1,2];p.destinations=[{id:'far-goal',point:[60,1,29],maximumPathSteps:150}];
 p.protectedVoids=[];
 const converted=run(q);
 assert.equal(converted.compiled.primitives.length,21768);
 assert.equal(converted.status,'SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD');
});

test('BN official BM raw failures cannot be converted or relabelled as the new format',()=>{
 const expected=['e54f2abf87d36e0957d8393c960d2fce8075862d00ea1ea736365121a4b6a469',
  '8e2590128e8bd932cddc2df595fcc01c3cbd660298cedd445431d0787bb90c86'];
 for(const [i,side] of ['A','B'].entries()){
  const raw=fs.readFileSync(new URL('../evidence/r190bm/'+side+'/model-original/R190_I_ORIGINAL_RESPONSE.txt',import.meta.url));
  assert.equal(H(raw),expected[i]);const p=JSON.parse(raw);
  assert.throws(()=>compileDesign(p.design),i===0?/B143_SCHEMA_OR_MODE/:/B143_MATERIAL/);
  assert.throws(()=>compileR190BNAssembly(raw,{originalBrief:Buffer.from('形式を勝手に変換しません。')}),/R190BN_FORMAT/);
  assert.equal(H(raw),expected[i]);
 }
});

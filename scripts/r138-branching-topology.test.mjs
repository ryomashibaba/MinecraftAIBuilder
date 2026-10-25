import test from 'node:test';
import assert from 'node:assert/strict';
import {compileR134MultiZonePlan,SCHEMA}
 from '../source/ai/r134-multi-zone-plan.mjs';
import {deriveR138BranchedTopology}
 from '../source/ai/r138-branching-topology.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
const program=(count=4)=>({
 schema:SCHEMA,id:'unknown-unfixed-building',
 title:'An original building with independently selected zones',
 brief:'A generic mixed purpose test for genuinely branched rooms',
 footprint:{width:24,depth:28},
 materials:{floor:'wood',wall:'stone',roof:'metal'},
 layout:{axis:'z',spaces:Array.from({length:count},(_,i)=>({
  id:'physical-zone-'+(i+1),purpose:'An independent activity room '+(i+1),
  weight:1+i%2}))},
 form:{roofProfile:'ridge',facadeLanguage:'plain'}
});
test('4 rooms arranged into genuinely disjoint two-wing / two-row plan, entrance reaches each',()=>{
 const source=compileR134MultiZonePlan(program());
 const snapshot=JSON.stringify(source.design);
 const branched=deriveR138BranchedTopology(source);
 assert.equal(JSON.stringify(source.design),snapshot);
 assert.notEqual(branched.sourceSha256,source.sourceSha256);
 assert.notEqual(branched.geometrySha256,source.geometrySha256);
 assert.equal(branched.program[0].zones.length,4);
 assert.equal(branched.zoneDoorEvidence.length,4);
 assert.deepEqual(branched.program[0].zones.map(z=>z.physicalSector),
  ['front-left','front-right','rear-left','rear-right']);
 assert.equal(branched.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.ok(branched.sourceRouteAudit.zones.every(z=>z.reachedFromEntrance));
 assert.equal(branched.program[0].centralSharedSpine.range.x[1]-
  branched.program[0].centralSharedSpine.range.x[0]+1,4);
 assert.equal(branched.originalQwenRoomIntentUnmodified,true);
 assert.equal(branched.modelAuthorship.includes('HOST_ARCHITECTURAL_ALTERNATIVE'),true);
 assert.equal(branched.worldWrites,0);
 assert.deepEqual(branched.gates,Array(9).fill('BLOCKED'));
});
test('3-room topology can make full-depth right wing instead of a linear corridor',()=>{
 const r=deriveR138BranchedTopology(compileR134MultiZonePlan(program(3)));
 assert.equal(r.program[0].zones.length,3);
 assert.deepEqual(r.program[0].zones.map(z=>z.physicalSector),
  ['front-left','whole-right','rear-left']);
 assert.equal(r.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
});
test('all four branched rooms support real assembled equipment with source-reachable frontage',()=>{
 const base=deriveR138BranchedTopology(compileR134MultiZonePlan(program()));
 const objects=[
  {id:'branch-work',zoneId:'physical-zone-1',role:'work-surface',corner:'near-left',detail:'assembled'},
  {id:'branch-display',zoneId:'physical-zone-2',role:'display-stand',corner:'far-right',detail:'assembled'},
  {id:'branch-storage',zoneId:'physical-zone-3',role:'storage-rack',corner:'near-right',detail:'assembled'},
  {id:'branch-seat',zoneId:'physical-zone-4',role:'seating',corner:'far-left',detail:'assembled'}
 ];
 const result=applyR125FeatureIntent({base,intent:{
  schema:ASSEMBLED_SCHEMA,basePlanSha256:base.planSha256,objects}});
 assert.equal(result.placements.length,4);
 assert.ok(result.addedVoxelCount>25);
 assert.equal(result.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.everyFeatureSourceAccessible,true);
 assert.equal(result.worldWrites,0);
});
test('reject too-narrow volumes or unsupported x-axis layout rather than silently pretending branching',()=>{
 const x=program();x.footprint.width=20;
 assert.throws(()=>deriveR138BranchedTopology(
  compileR134MultiZonePlan(x)),/R138_BRANCH_/);
 const y=program();y.layout.axis='x';
 assert.throws(()=>deriveR138BranchedTopology(
  compileR134MultiZonePlan(y)),/R138_BRANCH_/);
});

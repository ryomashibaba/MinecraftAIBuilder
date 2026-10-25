import test from 'node:test';
import assert from 'node:assert/strict';
import {compileR134MultiZonePlan,SCHEMA as BASE}
 from '../source/ai/r134-multi-zone-plan.mjs';
import {deriveR138BranchedTopology}
 from '../source/ai/r138-branching-topology.mjs';
import {SCHEMA,deriveR139RelationalTopology}
 from '../source/ai/r139-room-relations.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';

const plan=(count=4)=>({
 schema:BASE,id:'unknown-activity-complex',
 title:'Unfixed multi-use architectural test',
 brief:'Invent zones and actually connect them using semantic relations',
 footprint:{width:26,depth:30},
 materials:{floor:'stone',wall:'concrete',roof:'metal'},
 layout:{axis:'z',spaces:Array.from({length:count},(_,i)=>({
  id:'room-'+(i+1),purpose:'Distinct functional space for activity '+(i+1),
  weight:1+(i%2)}))},
 form:{roofProfile:'ridge',facadeLanguage:'plain'}
});
const intent=(base,entry='room-4',pairs=[['room-1','room-2'],['room-3','room-4']])=>({
 schema:SCHEMA,basePlanSha256:base.planSha256,
 entryFacingZoneId:entry,directAdjacencies:pairs
});
test('four-room model-selectable adjacency genuinely cuts supported doorways',()=>{
 const original=compileR134MultiZonePlan(plan());
 const originalSnapshot=JSON.stringify(original);
 const graph=intent(original);
 const result=deriveR139RelationalTopology(original,graph);
 const branch=deriveR138BranchedTopology(original);
 assert.equal(JSON.stringify(original),originalSnapshot);
 assert.equal(result.relationIntent.entryFacingZoneId,'room-4');
 assert.ok(['front-left','front-right'].includes(
  result.entryFacingZoneEvidence.physicalSector));
 assert.deepEqual(new Set(result.program[0].zones.map(z=>z.id)),
  new Set(original.program[0].zones.map(z=>z.id)));
 assert.equal(result.directAdjacencyDoorEvidence.length,2);
 assert.ok(result.directAdjacencyVerifiedBySourceDoorVoxels);
 // R142: the exterior entrance must physically OPEN into the model-chosen
 // zone instead of always opening to the host's central corridor.
 const evidence=result.entryFacingZoneEvidence;
 const [ex,ey,ez]=evidence.exteriorOpeningOrigin;
 const zone=result.program[0].zones.find(z=>z.id==='room-4');
 assert.equal(evidence.exteriorEntranceDirectlyOpensIntoSelectedRoom,true);
 assert.equal(evidence.interiorThresholdSupportedAndClearInB143Source,true);
 assert.ok(ex>=zone.range.x[0]&&ex+1<=zone.range.x[1]);
 assert.equal(ez,1);
 assert.equal(ey,2);
 assert.equal(result.sourceRouteAudit.sourceInteriorEntrance.x,ex);
 assert.equal(result.sourceRouteAudit.sourceInteriorEntrance.z,2);
 const voxels=new Set(result.compiled.primitives.map(p=>p.slice(0,3).join(',')));
 for(let dx=0;dx<2;dx++){
  assert.equal(voxels.has([ex+dx,1,2].join(',')),true);
  for(let y=2;y<=4;y++)assert.equal(voxels.has([ex+dx,y,1].join(',')),false);
 }
 const oldSpine=branch.design.elements.find(x=>x.id==='exterior-entrance');
 assert.notDeepEqual(evidence.exteriorOpeningOrigin,oldSpine.origin);
 assert.deepEqual(branch.design.elements.find(x=>x.id==='exterior-entrance').origin,
  oldSpine.origin);
 assert.notEqual(result.sourceSha256,branch.sourceSha256);
 assert.notEqual(result.geometrySha256,branch.geometrySha256);
 assert.equal(result.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.ok(result.sourceRouteAudit.zones.every(x=>x.reachedFromEntrance));
 assert.equal(result.originalQwenRoomIntentUnmodified,true);
 assert.equal(result.modelSelectedRelationsAuthenticated,false);
 assert.equal(result.readiness,'NOT_PREPARED');
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(result.BuildPlan.operations,[]);
 assert.equal(result.worldWrites,0);
});
test('three-zone source graph selects entry face and a direct adjacent pair',()=>{
 const base=compileR134MultiZonePlan(plan(3));
 const result=deriveR139RelationalTopology(base,intent(base,'room-3',
  [['room-1','room-2']]));
 assert.equal(result.program[0].zones.length,3);
 assert.equal(result.directAdjacencyDoorEvidence.length,1);
 assert.equal(result.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 // The other pair occupies the left front/rear wing, so the entrance-facing
 // third zone MUST occupy the physically front-reaching whole-right wing.
 assert.equal(result.program[0].zones.find(x=>x.id==='room-3')
  .physicalSector,'whole-right');
 const entry=result.entryFacingZoneEvidence;
 assert.equal(entry.exteriorEntranceDirectlyOpensIntoSelectedRoom,true);
 assert.equal(entry.physicalSector,'whole-right');
 assert.equal(result.sourceRouteAudit.sourceInteriorEntrance.x,
  entry.exteriorOpeningOrigin[0]);
});
test('short semantic IR preserves R130 assembled furniture compatibility',()=>{
 const base=compileR134MultiZonePlan(plan());
 const graph=deriveR139RelationalTopology(base,intent(base));
 const objects=base.program[0].zones.map((z,i)=>({
  id:'furniture-'+i,zoneId:z.id,
  role:['work-surface','storage-rack','equipment-bank','seating'][i],
  corner:['near-left','far-right','near-right','far-left'][i],
  detail:'assembled'
 }));
 const furnished=applyR125FeatureIntent({base:graph,intent:{
  schema:ASSEMBLED_SCHEMA,basePlanSha256:graph.planSha256,objects
 }});
 assert.equal(furnished.placements.length,4);
 assert.equal(furnished.everyFeatureSourceAccessible,true);
 assert.equal(furnished.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.deepEqual(furnished.gates,Array(9).fill('BLOCKED'));
});
test('R142 exterior entrance avoids real facade fins and reaches the model-selected zone',()=>{
 const model=plan();model.form.facadeLanguage='fins';
 const base=compileR134MultiZonePlan(model);
 // Leave the direct adjacency pair in the left wing so the selected third
 // room occupies the full-depth right wing, opposite to the old spine.
 const derivative=deriveR139RelationalTopology(base,intent(base,'room-4',
  [['room-1','room-2'],['room-3','room-4']]));
 const selected=derivative.entryFacingZoneEvidence;
 const [x,y,z]=selected.exteriorOpeningOrigin;
 const solids=new Set(derivative.compiled.primitives.map(p=>
  p.slice(0,3).join(',')));
 assert.equal(selected.exteriorEntranceDirectlyOpensIntoSelectedRoom,true);
 for(let dx=0;dx<2;dx++)for(let clearY=2;clearY<=4;clearY++){
  assert.equal(solids.has([x+dx,clearY,z].join(',')),false);
  assert.equal(solids.has([x+dx,clearY,0].join(',')),false,
   'No facade fin may block the two-column source approach');
 }
 assert.equal(derivative.sourceRouteAudit.status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(derivative.worldWrites,0);
});
test('impossible or forged graphs HOLD instead of faking adjacency',()=>{
 const base=compileR134MultiZonePlan(plan());
 assert.throws(()=>deriveR139RelationalTopology(base,
  intent(base,'room-4',[['room-1','room-2'],['room-2','room-3']])),
  /R139_RELATIONS_GRAPH_REQUIRES_RICHER_GEOMETRY/);
 assert.throws(()=>deriveR139RelationalTopology(base,
  intent(base,'room-4',[['room-1','room-missing']])),
  /R139_RELATIONS_INVALID_DIRECT_PAIR/);
 const corrupted=intent(base);corrupted.basePlanSha256='not-the-base';
 assert.throws(()=>deriveR139RelationalTopology(base,corrupted),
  /R139_RELATIONS_CONTRACT_OR_BASE_PIN/);
 const x=plan();x.layout.axis='x';
 const unsupported=compileR134MultiZonePlan(x);
 assert.throws(()=>deriveR139RelationalTopology(unsupported,intent(unsupported)),
  /R138_BRANCH_/);
});

test('R158 model-selected side balance physically changes rooms and direct doors',()=>{
 const p=plan();p.footprint.width=30;
 const base=compileR134MultiZonePlan(p),relation=intent(base);
 const balanced=deriveR139RelationalTopology(base,relation);
 const left=deriveR139RelationalTopology(base,relation,{spatialBalance:'left-wide'});
 const right=deriveR139RelationalTopology(base,relation,{spatialBalance:'right-wide'});
 assert.ok(left.r158SpatialBalanceEvidence.leftWingInteriorWidth>left.r158SpatialBalanceEvidence.rightWingInteriorWidth);
 assert.ok(right.r158SpatialBalanceEvidence.rightWingInteriorWidth>right.r158SpatialBalanceEvidence.leftWingInteriorWidth);
 assert.notEqual(left.geometrySha256,right.geometrySha256);
 assert.notEqual(left.sourceSha256,balanced.sourceSha256);
 for(const x of [left,right]){
  assert.equal(x.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(x.directAdjacencyDoorEvidence.length,2);
  assert.equal(x.originalQwenRoomIntentUnmodified,true);
  assert.equal(x.readiness,'NOT_PREPARED');
  assert.deepEqual(x.gates,Array(9).fill('BLOCKED'));
  assert.equal(x.worldWrites,0);
 }
});
test('R158 narrow site and hallucinated IR cannot silently become centered',()=>{
 const base=compileR134MultiZonePlan(plan());
 assert.throws(()=>deriveR139RelationalTopology(base,intent(base),{spatialBalance:'left-wide'}),
  /R138_BRANCH_SHIFTED_SPINE_NEEDS_REAL_ROOM_WIDTH/);
 assert.throws(()=>deriveR139RelationalTopology(base,intent(base),{spatialBalance:'invalid'}),
  /R139_RELATIONS_INVALID_SPATIAL_BALANCE/);
});

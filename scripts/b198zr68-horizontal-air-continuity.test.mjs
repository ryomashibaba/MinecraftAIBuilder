import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {analyzeR64UnclaimedFloorConnectivity}
 from './b198zr64-unclaimed-floor-connectivity.mjs';
import {assessR66OverheadSpace}
 from './b198zr66-overhead-space-audit.mjs';
import {inspectR68AirContinuity,writeR68AirContinuity}
 from './b198zr68-horizontal-air-continuity.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,origin,size,material='stone')=>({
 id,shape:'box',mode:'add',material,origin,size});
function scene(elements){
 const p=r32Courtyard();
 p.design.elements=elements;
 return p;
}
function inspect(p){
 const raw=JSON.stringify(p),compiled=compileDesign(p.design);
 const args={raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:compiled.geometrySha256};
 return {report:inspectR68AirContinuity(args),args};
}
const floor=()=>box('foundation',[0,0,0],[12,1,12],'wood');
const roof=()=>box('high-ceiling',[0,6,0],[12,1,12],'glass');
const walls=()=>[
 box('west',[0,1,0],[1,5,12]),
 box('east',[11,1,0],[1,5,12]),
 box('north',[0,1,0],[12,5,1]),
 box('south',[0,1,11],[12,5,1])
];
test('R68 open roofed canopy has floor and air laterally connected to grid edge',()=>{
 const {report,args}=inspect(scene([floor(),roof()]));
 const m=report.metrics;
 assert.equal(m.supportedTwoHighStandingPositions,288);
 assert.equal(m.positionsWithAnyOverheadVoxel,144);
 assert.equal(m.roofedStandingInLaterallyBoundaryConnectedAir,144);
 assert.equal(m.roofedStandingInLaterallySealedAirPockets,0);
 assert.equal(m.laterallySealedRoofedComponents,0);
 assert.equal(m.roofed2x2SupportedPads,121);
 assert.equal(report.originalSpatialPlanRead,false);
 assert.equal(report.doorCollisionAndAccessibleUseNotProven,true);
 assert.equal(report.independentHumanReview,'NOT_REVIEWED');
 assert.equal(report.safety.readiness,'NOT_PREPARED');
 assert(report.safety.gates.every(v=>v==='BLOCKED'));
 assert.deepEqual(report.safety.BuildPlan.operations,[]);
 assert.equal(report.modelCalls,0);
 const a=analyzeR64UnclaimedFloorConnectivity(args);
 const b=assessR66OverheadSpace(args);
 assert.equal(m.supportedTwoHighStandingPositions,
  a.metrics.supportedTwoHighStandingPositions);
 assert.equal(m.positionsWithAnyOverheadVoxel,
  b.metrics.positionsWithAnyOverheadSolid);
});
test('R68 sealed perimeter has interior air region, but does NOT prove accessible room',()=>{
 const {report}=inspect(scene([floor(),roof(),...walls()]));
 const m=report.metrics;
 assert.equal(m.positionsWithAnyOverheadVoxel,100);
 assert.equal(m.roofedStandingInLaterallySealedAirPockets,100);
 assert.equal(m.roofedStandingInLaterallyBoundaryConnectedAir,0);
 assert.equal(m.laterallySealedRoofedComponents,1);
 assert.equal(m.roofed2x2SupportedPads,81);
 assert(report.possibleConcerns.some(c=>
  c.kind==='LATERALLY_SEALED_AIR_POCKETS_NEED_ACCESS_REVIEW'));
 assert.equal(report.enclosedAirMayHaveNoValidEntrance,true);
 assert.equal(report.aDoorMayConnectIndoorRoomToBoundary,true);
 assert.equal(report.beautyOrOriginalityNotScored,true);
});
test('R68 single doorway changes a sealed hall to boundary connected air, not to FAIL',()=>{
 const openWall=[
  box('north-left',[0,1,0],[5,5,1]),
  box('north-right',[7,1,0],[5,5,1])
 ];
 const p=scene([floor(),roof(),
  box('west',[0,1,0],[1,5,12]),
  box('east',[11,1,0],[1,5,12]),
  box('south',[0,1,11],[12,5,1]),
  ...openWall]);
 const {report}=inspect(p);
 const m=report.metrics;
 assert.equal(m.positionsWithAnyOverheadVoxel,102);
 assert.equal(m.roofedStandingInLaterallySealedAirPockets,0);
 assert.equal(m.roofedStandingInLaterallyBoundaryConnectedAir,102);
 assert(report.possibleConcerns.some(c=>
  c.kind==='ROOFED_SPACES_WITH_LATERAL_OPENINGS_NEED_ROOM_REVIEW'));
 assert(report.possibleConcerns.every(c=>c.automaticReject===false));
});
test('R68 four isolated columns do not fabricate sealed room or block air-flow',()=>{
 const p=scene([floor(),roof(),
  box('pillar-west',[1,1,6],[1,5,1]),
  box('pillar-east',[10,1,6],[1,5,1]),
  box('pillar-north',[6,1,1],[1,5,1]),
  box('pillar-south',[6,1,10],[1,5,1])
 ]);
 const {report}=inspect(p);
 assert.equal(report.metrics.positionsWithAnyOverheadVoxel,140);
 assert.equal(report.metrics.roofedStandingInLaterallySealedAirPockets,0);
 assert.equal(report.metrics.roofedStandingInLaterallyBoundaryConnectedAir,140);
 assert.equal(report.modelDeclaredRoomsUsed,false);
});
test('R68 an unroofed courtyard and a solid monolith never manufacture covered air regions',()=>{
 const a=inspect(scene([floor(),...walls()])).report;
 assert.equal(a.metrics.positionsWithAnyOverheadVoxel,0);
 assert.equal(a.metrics.roofed2x2SupportedPads,0);
 const b=inspect(scene([box('solid',[0,0,0],[16,12,16])])).report;
 assert.equal(b.metrics.supportedTwoHighStandingPositions,0);
 assert.equal(b.metrics.positionsWithAnyOverheadVoxel,0);
 assert.deepEqual(b.possibleConcerns,[]);
});
test('R68 invariant under completely fake self-declared entrance, destinations, zones',()=>{
 const p=scene([floor(),roof(),...walls()]);
 const q=structuredClone(p);
 q.spatialPlan={entrance:[999,999,999],destinations:[],
  protectedVoids:[],functionalZones:[],headroom:0};
 const a=inspect(p).report,b=inspect(q).report;
 assert.deepEqual(a.metrics,b.metrics);
 assert.deepEqual(a.possibleConcerns,b.possibleConcerns);
 assert.equal(a.groupingRequiresSupportingFloor,false);
 assert.equal(a.verticalAirConnectivityNotAnalyzed,true);
});
test('R68 guards SHA chain and rejects B143-HOLD conceptual geometry',()=>{
 const p=scene([floor()]),r=inspect(p);
 assert.throws(()=>inspectR68AirContinuity({...r.args,
  expectedRawSha256:'f'.repeat(64)}),/ORIGINAL_AND_FINAL_GEOMETRY_SHA_REQUIRED/);
 assert.throws(()=>inspectR68AirContinuity({...r.args,
  expectedGeometrySha256:'f'.repeat(64)}),/FINAL_GEOMETRY_SHA_MISMATCH/);
 p.design.elements.push(box('bad',[0,12,0],[2,1,2]));
 const raw=JSON.stringify(p);
 assert.throws(()=>inspectR68AirContinuity({
  raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:r.args.expectedGeometrySha256}),
  /B143_FINAL_GEOMETRY_REQUIRED/);
});
test('R68 writes fresh review with no original edits or inference',()=>{
 const r=inspect(scene([floor(),roof(),...walls()]));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r68-topology-'));
 try{
  const res=writeR68AirContinuity({...r.args,destination:dir});
  assert.equal(res.modelCalls,0);
  const data=JSON.parse(fs.readFileSync(path.join(dir,'R68_HORIZONTAL_AIR_TOPOLOGY.json'),'utf8'));
  assert.equal(data.independentHumanReview,'NOT_REVIEWED');
  assert.equal(data.metrics.laterallySealedRoofedComponents,1);
  const html=fs.readFileSync(path.join(dir,'R68_HUMAN_AIR_CONTINUITY_REVIEW.html'),'utf8');
  assert(html.includes('最終概念ボクセル')&&html.includes('Minecraft'));
  assert.throws(()=>writeR68AirContinuity({...r.args,destination:dir}),
   /NO_OUTPUT_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

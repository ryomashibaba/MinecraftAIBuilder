import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {analyzeR64UnclaimedFloorConnectivity} from './b198zr64-unclaimed-floor-connectivity.mjs';
import {assessR66OverheadSpace} from './b198zr66-overhead-space-audit.mjs';
import {assessR67SpatialContainment,writeR67SpatialContainment}
 from './b198zr67-spatial-containment-audit.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const block=(id,origin,size,mode='add',material='stone')=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
function withElements(elements){
 const p=r32Courtyard();p.design.elements=elements;return p;
}
function pack(p){
 const raw=JSON.stringify(p),compiled=compileDesign(p.design);
 const opts={raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:compiled.geometrySha256};
 return {opts,report:assessR67SpatialContainment(opts)};
}
test('R67 roofed open deck is NOT mistaken for a walled indoor room',()=>{
 const p=withElements([block('floor',[0,0,0],[12,1,12]),
  block('roof',[0,6,0],[12,1,12])]);
 const {opts,report}=pack(p),m=report.metrics;
 assert.equal(m.positionsWithOverheadVoxel,144);
 assert.equal(m.roofedPositionsWith3PlusSideDirectionsWithin24,0);
 assert.equal(m.roofed3Direction2x2SupportedPads,0);
 assert(report.possibleConcerns.some(x=>
  x.kind==='ROOFED_FLOORS_WITHOUT_3_NEARBY_SIDE_DIRECTIONS'));
 assert(report.possibleConcerns.every(x=>x.automaticReject===false));
 assert.equal(report.fullyEnclosedRoomOrFunctionVerified,false);
 assert.equal(report.openAirAndMonumentalHallsNotRejected,true);
 assert.equal(report.independentHumanReview,'NOT_REVIEWED');
 const r66=assessR66OverheadSpace(opts);
 assert.equal(r66.metrics.positionsWithAnyOverheadSolid,
  m.positionsWithOverheadVoxel);
});
test('R67 roof plus perimeter surfaces shows bounded-air candidates without certifying rooms',()=>{
 const p=withElements([
  block('floor',[0,0,0],[12,1,12]),
  block('roof',[0,6,0],[12,1,12]),
  block('west',[0,1,0],[1,5,12]),
  block('east',[11,1,0],[1,5,12]),
  block('north',[0,1,0],[12,5,1]),
  block('south',[0,1,11],[12,5,1])
 ]);
 const {opts,report}=pack(p),m=report.metrics;
 assert.equal(m.positionsWithOverheadVoxel,100);
 assert.equal(m.roofedPositionsWith4SideDirectionsWithin24,100);
 assert(m.roofedPositionsWith3PlusSideDirectionsWithin8>0);
 assert(m.roofedPositionsWith3PlusSideDirectionsWithin8<100);
 assert.equal(m.roofed3Direction2x2SupportedPads,81);
 assert.equal(report.fullyEnclosedRoomOrFunctionVerified,false);
 const r64=analyzeR64UnclaimedFloorConnectivity(opts);
 assert.equal(m.supportedTwoHighStandingPositions,
  r64.metrics.supportedTwoHighStandingPositions);
});
test('R67 roomlike proxy remains only a proxy when surrounded by four isolated columns',()=>{
 const p=withElements([
  block('floor',[0,0,0],[12,1,12]),
  block('roof',[0,6,0],[12,1,12]),
  block('column-w',[1,1,6],[1,5,1]),
  block('column-e',[10,1,6],[1,5,1]),
  block('column-n',[6,1,1],[1,5,1]),
  block('column-s',[6,1,10],[1,5,1])
 ]);
 const {report}=pack(p);
 assert(report.metrics.roofedPositionsWith4SideDirectionsWithin24>0);
 assert.equal(report.sideSolidsMayBeFurnitureColumnsOrExterior,true);
 assert.equal(report.fullyEnclosedRoomOrFunctionVerified,false);
});
test('R67 ignores invented model spatialPlan and keeps independent numeric results',()=>{
 const p=r32Courtyard(),q=structuredClone(p);
 q.spatialPlan={entrance:[999,999,999],headroom:0,
  destinations:[],protectedVoids:[],functionalZones:[]};
 const a=pack(p).report,b=pack(q).report;
 assert.deepEqual(a.metrics,b.metrics);
 assert.deepEqual(a.possibleConcerns,b.possibleConcerns);
 assert.equal(a.sourceSpatialPlanIgnored,true);
 assert.equal(a.sourceModelClaimedRoomsIgnored,true);
 assert.equal(a.allConcernsAbsentDoesNotMeanPass,true);
 assert(a.safety.gates.every(v=>v==='BLOCKED'));
 assert.deepEqual(a.safety.BuildPlan.operations,[]);
 assert.equal(a.worldWrites,0);
});
test('R67 never fabricates enclosed rooms for open-air courtyard or solid mass',()=>{
 const courtyard=withElements([
  block('floor',[0,0,0],[12,1,12]),
  block('north',[0,1,0],[12,5,1]),
  block('south',[0,1,11],[12,5,1]),
  block('west',[0,1,0],[1,5,12]),
  block('east',[11,1,0],[1,5,12])
 ]);
 const out=pack(courtyard).report;
 assert.equal(out.metrics.positionsWithOverheadVoxel,0);
 assert.equal(out.metrics.roofedPositionsWith3PlusSideDirectionsWithin24,0);
 const solid=withElements([block('full-solid',[0,0,0],[16,12,16])]);
 const r=pack(solid).report;
 assert.equal(r.metrics.supportedTwoHighStandingPositions,0);
 assert.equal(r.metrics.roofed3Direction2x2SupportedPads,0);
 assert.equal(r.independentHumanReview,'NOT_REVIEWED');
});
test('R67 verifies original SHA and final compiler voxels, rejects uncompiled input',()=>{
 const p=r32Courtyard(),raw=JSON.stringify(p),c=compileDesign(p.design);
 assert.throws(()=>assessR67SpatialContainment({
  raw,expectedRawSha256:'f'.repeat(64),
  expectedGeometrySha256:c.geometrySha256}),/ORIGINAL_AND_COMPILER_SHA_REQUIRED/);
 assert.throws(()=>assessR67SpatialContainment({
  raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:'f'.repeat(64)}),/VERIFIED_GEOMETRY_SHA_MISMATCH/);
 const invalid=structuredClone(p);
 invalid.design.elements.push(block('out',[0,invalid.design.bounds.height,0],[2,1,2]));
 const bad=JSON.stringify(invalid);
 assert.throws(()=>assessR67SpatialContainment({
  raw:bad,expectedRawSha256:sha(bad),
  expectedGeometrySha256:c.geometrySha256}),/STRICT_B143_FINAL_GEOMETRY_REQUIRED/);
});
test('R67 writes human-review-only JSON/HTML; refuses overwrite',()=>{
 const {opts}=pack(r32Courtyard());
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'r67-shelter-'));
 try{
  const a=writeR67SpatialContainment({...opts,destination:folder});
  assert.equal(a.modelCalls,0);
  const report=JSON.parse(fs.readFileSync(path.join(folder,
   'R67_SURROUNDING_SPACE_EVIDENCE.json'),'utf8'));
  assert.equal(report.sourceSpatialPlanIgnored,true);
  assert.equal(report.fullyEnclosedRoomOrFunctionVerified,false);
  const html=fs.readFileSync(path.join(folder,
   'R67_SURROUNDING_SPACE_REVIEW.html'),'utf8');
  assert(html.includes('室内')&&html.includes('Minecraft'));
  assert.throws(()=>writeR67SpatialContainment({...opts,destination:folder}),
   /REVIEW_ALREADY_EXISTS/);
 }finally{fs.rmSync(folder,{recursive:true,force:true})}
});

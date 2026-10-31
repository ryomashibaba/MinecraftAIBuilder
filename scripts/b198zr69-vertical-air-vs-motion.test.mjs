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
import {analyzeR69VerticalAirAndMotion,writeR69VerticalAirAndMotion}
 from './b198zr69-vertical-air-vs-motion.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,origin,size,material='stone')=>({
 id,shape:'box',mode:'add',material,origin,size});
const cut=(id,origin,size)=>({id,shape:'box',mode:'cut',origin,size});
const make=elements=>{const p=r32Courtyard();p.design.elements=elements;return p;};
const audit=p=>{
 const raw=JSON.stringify(p),compiled=compileDesign(p.design);
 const args={raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:compiled.geometrySha256};
 return {result:analyzeR69VerticalAirAndMotion(args),
  r64:analyzeR64UnclaimedFloorConnectivity(args),args};
};
test('R69 detects two floors joined by open shaft but without any supported interlevel motion',()=>{
 const p=make([
  box('base',[0,0,0],[12,1,12]),
  box('upper',[0,5,0],[12,1,12]),
  cut('shaft',[5,5,5],[1,1,1])
 ]);
 const {result,r64}=audit(p),m=result.metrics;
 assert.equal(m.supportedTwoHighStandingPositions,
  r64.metrics.supportedTwoHighStandingPositions);
 assert.equal(m.abstractSupportedMotionComponentCount,2);
 assert.equal(m.abstractSupportedMotionInterlevelEdges,0);
 assert(m.largeAirConnectedButSupportedMotionSeparatedRegions>0);
 assert(result.possibleConcerns.some(x=>x.kind===
  'VERTICAL_AIR_CONNECTED_BUT_SUPPORTED_TRAVEL_DISCONNECTED'));
 assert.equal(result.floatThroughAirNotInterpretedAsWalking,true);
 assert.equal(result.independentHumanReview,'NOT_REVIEWED');
 assert(result.safety.gates.every(v=>v==='BLOCKED'));
 assert.deepEqual(result.safety.BuildPlan.operations,[]);
 assert.equal(result.worldWrites,0);
});
test('R69 recognizes abstract rising supported staircase, never Minecraft avatar navigation',()=>{
 const p=make([
  box('ground',[0,0,0],[12,1,12]),
  {id:'real-source-stairs',shape:'staircase',mode:'add',
   material:'wood',origin:[2,0,5],axis:'x',direction:1,
   width:2,steps:5,treadDepth:1},
  box('upper-deck',[6,4,0],[6,1,12])
 ]);
 const {result,r64}=audit(p),m=result.metrics;
 assert(m.abstractSupportedMotionInterlevelEdges>0);
 assert(m.supportedMotionComponentsSpanningMultipleHeights>0);
 assert.equal(m.abstractSupportedMotionComponentCount,
  r64.metrics.conceptualMotionComponents);
 assert.equal(result.noMinecraftAvatarPhysicsOrCollisionTesting,true);
 assert.equal(result.noFunctionalOrArtisticQualityPass,true);
});
test('R69 two completely separated floors do not manufacture a vertical air shaft',()=>{
 const p=make([
  box('base',[0,0,0],[16,1,16]),
  box('full-plate',[0,5,0],[16,1,16])
 ]);
 const {result}=audit(p),m=result.metrics;
 assert(m.threeDimensionalAirComponentCount>=2);
 assert.equal(m.largeAirConnectedButSupportedMotionSeparatedRegions,0);
 assert.equal(m.abstractSupportedMotionInterlevelEdges,0);
});
test('R69 no fabricated standing points in monolith and no inferred quality grade',()=>{
 const {result}=audit(make([box('full',[0,0,0],[16,12,16])]));
 assert.equal(result.metrics.supportedTwoHighStandingPositions,0);
 assert.equal(result.metrics.abstractSupportedMotionComponentCount,0);
 assert.equal(result.metrics.allTwoHighAirPositions,0);
 assert.deepEqual(result.possibleConcerns,[]);
});
test('R69 results unaffected by invented spatialPlan author claims',()=>{
 const p=r32Courtyard(),q=structuredClone(p);
 q.spatialPlan={entrance:[999,999,999],headroom:0,
  destinations:[],protectedVoids:[],functionalZones:[]};
 const a=audit(p).result,b=audit(q).result;
 assert.deepEqual(a.metrics,b.metrics);
 assert.deepEqual(a.possibleConcerns,b.possibleConcerns);
 assert.equal(a.modelSpatialPlanIgnored,true);
});
test('R69 SHA mismatch and noncompiled source fail closed',()=>{
 const p=r32Courtyard(),{args}=audit(p);
 assert.throws(()=>analyzeR69VerticalAirAndMotion({...args,
  expectedRawSha256:'f'.repeat(64)}),/IMMUTABLE_SOURCE_AND_GEOMETRY_REQUIRED/);
 assert.throws(()=>analyzeR69VerticalAirAndMotion({...args,
  expectedGeometrySha256:'f'.repeat(64)}),/STRICT_COMPILER_GEOMETRY_SHA_MISMATCH/);
 p.design.elements.push(box('invalid',[0,p.design.bounds.height,0],[2,1,2]));
 const bad=JSON.stringify(p);
 assert.throws(()=>analyzeR69VerticalAirAndMotion({raw:bad,
  expectedRawSha256:sha(bad),
  expectedGeometrySha256:args.expectedGeometrySha256}),
  /STRICT_B143_FINAL_VOXELS_REQUIRED/);
});
test('R69 generates only evidence and never overwrites original review',()=>{
 const {args}=audit(r32Courtyard()),dir=fs.mkdtempSync(
  path.join(os.tmpdir(),'r69-air-versus-motion-'));
 try{
  const r=writeR69VerticalAirAndMotion({...args,destination:dir});
  assert.equal(r.modelCalls,0);
  const data=JSON.parse(fs.readFileSync(path.join(dir,
   'R69_VERTICAL_AIR_VS_MOTION.json'),'utf8'));
  assert.equal(data.independentHumanReview,'NOT_REVIEWED');
  const html=fs.readFileSync(path.join(dir,
   'R69_VERTICAL_CIRCULATION_REVIEW.html'),'utf8');
  assert(html.includes('吹き抜け')&&html.includes('Minecraft'));
  assert.throws(()=>writeR69VerticalAirAndMotion({...args,destination:dir}),
   /NO_REVIEW_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

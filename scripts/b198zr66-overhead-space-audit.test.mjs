import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {assessR66OverheadSpace,writeR66OverheadSpace}
 from './b198zr66-overhead-space-audit.mjs';
import {analyzeR64UnclaimedFloorConnectivity}
 from './b198zr64-unclaimed-floor-connectivity.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const fixture=(elements)=>{
 const p=r32Courtyard();p.design.elements=elements;return p;
};
const box=(id,origin,size,material='stone')=>({
 id,shape:'box',mode:'add',material,origin,size});
function analyze(p){
 const raw=JSON.stringify(p),c=compileDesign(p.design);
 const args={raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:c.geometrySha256};
 return {report:assessR66OverheadSpace(args),r64:analyzeR64UnclaimedFloorConnectivity(args),args};
}
test('R66 sees wide unroofed supported deck but does not call it an indoor building',()=>{
 const p=fixture([box('flat-deck',[0,0,0],[10,1,10])]);
 const {report,r64}=analyze(p);
 const m=report.metrics;
 assert.equal(m.totalSupportedTwoHighPositions,100);
 assert.equal(m.positionsWithAnyOverheadSolid,0);
 assert.equal(m.positionsOpenToDesignTop,100);
 assert.equal(m.fullyCovered2x2StandingPads,0);
 assert.equal(m.fullyOpen2x2StandingPads,81);
 assert.equal(r64.metrics.supportedTwoHighStandingPositions,100);
 assert(report.possibleConcerns.some(x=>
  x.kind==='NO_STANDING_POSITION_HAS_ANY_OVERHEAD_SOLID'));
 assert.equal(report.coveredMeansEnclosedRoom,false);
 assert.equal(report.anyArchitecturalQualityPass,false);
 assert.equal(report.independentHumanReview,'NOT_REVIEWED');
 assert(report.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(report.safety.BuildPlan.operations,[]);
 assert.equal(report.modelCalls,0);assert.equal(report.worldWrites,0);
});
test('R66 distinguishes sheltered floor and roof-top terrace without declaring a usable room',()=>{
 const p=fixture([
  box('flat-floor',[0,0,0],[10,1,10]),
  box('wide-roof',[0,6,0],[10,1,10],'glass')
 ]);
 const {report}=analyze(p),m=report.metrics;
 assert.equal(m.totalSupportedTwoHighPositions,200);
 assert.equal(m.positionsWithAnyOverheadSolid,100);
 assert.equal(m.positionsOpenToDesignTop,100);
 assert.equal(m.fullyCovered2x2StandingPads,81);
 assert.equal(m.fullyOpen2x2StandingPads,81);
 assert.equal(m.overheadClearanceCellsMin,5);
 assert.equal(m.overheadClearanceCellsMax,5);
 assert.equal(m.coveredPositionsWithAtLeast5CellVerticalGap,100);
 assert.equal(report.overheadMeansInterior,false);
 assert.equal(report.roofEngineeringOrLeakProof,false);
});
test('R66 detects rooflike overhangs too narrow for any fully covered 2x2 pad',()=>{
 const p=fixture([
  box('wide-floor',[0,0,0],[10,1,10]),
  box('thin-roof',[0,6,4],[10,1,1],'glass')
 ]);
 const {report}=analyze(p);
 assert.equal(report.metrics.positionsWithAnyOverheadSolid,10);
 assert.equal(report.metrics.fullyCovered2x2StandingPads,0);
 assert(report.possibleConcerns.some(x=>x.kind==='NO_COVERED_2X2_STANDING_PAD'));
 assert(report.possibleConcerns.every(x=>x.automaticReject===false));
});
test('R66 output depends only on final voxel geometry, not model spatialPlan claims',()=>{
 const a=r32Courtyard(),b=structuredClone(a);
 b.spatialPlan={entrance:[-100,-100,-100],destinations:[],
  protectedVoids:[],functionalZones:[],headroom:0};
 const A=analyze(a),B=analyze(b);
 assert.deepEqual(A.report.metrics,B.report.metrics);
 assert.deepEqual(A.report.possibleConcerns,B.report.possibleConcerns);
 assert.equal(A.report.originalSpatialPlanRead,false);
 assert.equal(A.report.exactFinalConceptVoxelsUsed,true);
});
test('R66 zero standing positions reports zero without fake inside/outside certification',()=>{
 const p=fixture([box('solid-block',[0,0,0],[16,12,16])]);
 const {report}=analyze(p);
 assert.equal(report.metrics.totalSupportedTwoHighPositions,0);
 assert.equal(report.metrics.positionsWithAnyOverheadSolid,0);
 assert.equal(report.metrics.positionsOpenToDesignTop,0);
 assert.equal(report.metrics.overheadProxyShare,null);
 assert.deepEqual(report.possibleConcerns,[]);
});
test('R66 rejects stale SHA, wrong compiler geometry and uncompiled B143',()=>{
 const p=r32Courtyard(),raw=JSON.stringify(p),c=compileDesign(p.design);
 assert.throws(()=>assessR66OverheadSpace({
  raw,expectedRawSha256:'f'.repeat(64),
  expectedGeometrySha256:c.geometrySha256}),/SOURCE_AND_GEOMETRY_PROVENANCE_REQUIRED/);
 assert.throws(()=>assessR66OverheadSpace({
  raw,expectedRawSha256:sha(raw),expectedGeometrySha256:'f'.repeat(64)}),
  /GEOMETRY_DIGEST_MISMATCH/);
 const bad=structuredClone(p);
 bad.design.elements.push(box('outside',[0,12,0],[2,1,2]));
 const corrupted=JSON.stringify(bad);
 assert.throws(()=>assessR66OverheadSpace({
  raw:corrupted,expectedRawSha256:sha(corrupted),
  expectedGeometrySha256:c.geometrySha256}),/STRICT_B143_COMPILED_REQUIRED/);
});
test('R66 produces only offline HTML JSON in a fresh output slot',()=>{
 const p=fixture([box('flat-floor',[0,0,0],[10,1,10])]);
 const {args}=analyze(p);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r66-review-'));
 try{
  const v=writeR66OverheadSpace({...args,destination:dir});
  assert.equal(v.modelCalls,0);
  const out=JSON.parse(fs.readFileSync(path.join(dir,'R66_OVERHEAD_SPACE_EVIDENCE.json')));
  assert.equal(out.metrics.positionsWithAnyOverheadSolid,0);
  const html=fs.readFileSync(path.join(dir,'R66_OVERHEAD_SPACE_REVIEW.html'),'utf8');
  assert(html.includes('覆われた空間')||html.includes('頭上に構造物'));
  assert.throws(()=>writeR66OverheadSpace({...args,destination:dir}),/NO_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

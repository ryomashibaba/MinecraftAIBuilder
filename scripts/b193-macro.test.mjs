import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS} from '../source/ai/b143-building-dsl.mjs';
import {buildB192} from '../source/ai/b192-skybridge-architecture.mjs';
import {buildB193,inspectCityscapeAssembly,OFFSETS,verifyB193Report}
 from '../source/ai/b193-virtual-cityscape.mjs';
import {buildB193Preview} from './b193-build-preview.mjs';
test('genuine 3-architecture cityscape is a review, not an illicit 162816-cell monolith',()=>{
 const r=buildB193(),b=r.report;
 assert.equal(b.virtualIndependentBuildings,3);
 assert.equal(b.originalMainCells,142773);
 assert.equal(b.originalAnnexCells,19152);
 assert.equal(b.originalBridgeCells,891);
 assert.equal(b.virtualViewCells,162816);
 assert.equal(b.virtualViewCells,b.originalMainCells+b.originalAnnexCells+b.originalBridgeCells);
 assert.equal(b.unchangedSeparateMaxCells,MAX_CELLS);
 assert.equal(b.monolithicB143CompilePerformed,false);
 assert.equal(b.reviewSceneIndependentArchitecturalModel,false);
 assert.equal(b.sourceOnlyReview,true);
 assert.equal(b.preserveOriginalB143Documents,18);
 assert.equal(b.viewerScenesWithOneReview,7);
 assert(verifyB193Report(b));
});
test('all 162816 original cells are present exactly once with zero source model overlap',()=>{
 const a=buildB193(),old=buildB192();
 const s=a.readOnlyScene.primitives,k=new Set(s.map(p=>p.slice(0,3).join(',')));
 assert.equal(s.length,162816);assert.equal(k.size,s.length);
 assert.equal(a.report.originalSourceVoxelIntersectionCount,0);
 assert.equal(a.groups.length,3);
 assert.deepEqual(a.groups.map(g=>g.sourceCellCount),[142773,19152,891]);
 assert.deepEqual(a.groups.map(g=>g.xOffset),[0,132,100]);
 assert.deepEqual(a.groups.map(g=>g.sourceGeometrySha256),[
  old.parent.compiled.geometrySha256,old.annex.compiled.geometrySha256,
  old.bridge.compiled.geometrySha256]);
 assert.deepEqual(a.groups.map(g=>g.actualMinecraftWorldCoordinates),[null,null,null]);
 assert(a.groups.every(g=>g.worldWrites===0&&g.constructionApproved===false));
});
test('review positions/scale/candidate public path preserve the actual independent origins',()=>{
 const a=buildB193(),b=a.report;
 assert.equal(OFFSETS.coordinateSystem,'OFFLINE_REVIEW_COORDINATES');
 assert.equal(OFFSETS.isMinecraftWorldLocation,false);
 assert.deepEqual([OFFSETS.main.x,OFFSETS.annex.x,OFFSETS.skybridge.x],[0,132,100]);
 assert(a.models[0].bounds.maxX<a.models[1].bounds.minX);
 assert.equal(b.buildingEnvelopeEmptyXGap,
  a.models[1].bounds.minX-a.models[0].bounds.maxX-1);
 assert.equal(b.originalY69Route2WideStations,31);
 assert(a.readOnlyScene.stats.modelCount===3);
 assert(a.readOnlyScene.virtualReviewOnly===true);
 assert(a.readOnlyScene.notAnIndependentB143CompiledModel===true);
 assert.equal(b.realWorldTerrainChecked,false);
});
test('safety mutations never promote source reviewed model to world execution / certified walking',()=>{
 const b=buildB193().report;
 for(const mut of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,
  x=>x.worldCoordinates=[100,69,31],x=>x.constructionApproved=true,
  x=>x.readiness='PREPARED',x=>x.gates[0]='PASS',
  x=>x.BuildPlan.operations.push({cmd:'setblock'}),
  x=>x.monolithicB143CompilePerformed=true,
  x=>x.reviewSceneIndependentArchitecturalModel=true,
  x=>x.originalSourceVoxelIntersectionCount=1,
  x=>x.actualMinecraftWalkingCertified=true,
  x=>x.realWorldTerrainChecked=true]){
  const fake=structuredClone(b);mut(fake);
  assert.equal(verifyB193Report(fake),false);
 }
});
test('real seven-scene interactive offline viewer keeps 18 originals and togglable 3-piece visual review',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b193-'));
 try{
  const m=buildB193Preview({dir}),a=buildB193();
  assert.equal(m.viewerSceneCount,7);
  assert.equal(m.moduleCount,18);
  assert.equal(m.numberOfActualNew3dScenes,3);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,39);
  assert.equal(m.real3dCells,142773);
  assert.equal(m.annexReal3dCells,19152);
  assert.equal(m.bridgeReal3dCells,891);
  assert.equal(m.cityscapeReadOnly,true);
  assert.equal(m.cityscapeVoxelsAcrossModels,162816);
  assert.equal(m.cityscapeOverlaps,0);
  assert.equal(m.cityscapeGeometrySha256,a.report.cityscapeReviewSha256);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const data=JSON.parse(fs.readFileSync(path.join(dir,'B193_DESIGN_MODULES.json')));
  assert.equal(data.modules.length,18);
  assert.equal(data.modules.at(-1).id,'celestial-skybridge-b192');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const required of ['b193-cityscape-panel',
   'b193-cityscape-focus','b193-bridge-focus',
   'b193-show-nebula-ark-main','b193-show-horizon-dock-annex',
   'b193-show-celestial-skybridge','OFFLINE_REVIEW_COORDINATES',
   'id="b193-route-69"','id="b193-route-65"','162,816']){
   assert(html.includes(required),'missing real preview control '+required);
  }
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script);assert.doesNotThrow(()=>new vm.Script(script));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

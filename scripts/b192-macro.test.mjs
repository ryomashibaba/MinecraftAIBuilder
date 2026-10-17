import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildB191} from '../source/ai/b191-route-compare.mjs';
import {buildB192,createSkybridgeDesign,createSkybridgeParts,
 verifyB192Report} from '../source/ai/b192-skybridge-architecture.mjs';
import {buildB192Preview} from './b192-build-preview.mjs';
test('18th separately authored strict B143 architecture is a real, nonoverlapping source 3D model',()=>{
 const old=buildB191(),s=buildB192(),b=s.bridge;
 assert.equal(old.parent.compiled.primitives.length,142773);
 assert.equal(old.annex.compiled.primitives.length,19152);
 assert.equal(s.report.originalSourceAuthoringDocuments,17);
 assert.equal(s.report.totalStrictB143Documents,18);
 assert.equal(s.report.sourceArchitectureModels,3);
 assert.equal(s.report.viewableSourceScenes,6);
 assert(validateDesign(b.design));assert(verifyCompiled(b.design,b.compiled));
 assert(b.design.elements.length>=60&&b.design.elements.length<=160);
 assert(b.compiled.primitives.length>=200&&b.compiled.primitives.length<MAX_CELLS);
 assert.equal(s.report.sourceCompiledBridgeVoxels,b.compiled.primitives.length);
 assert.equal(s.report.originalModelsBridgeOccupiedVoxelIntersections,0);
 assert.equal(s.report.actualMinecraftBridgeConnected,false);
 assert(verifyB192Report(s.report));
});
test('source bridge inherited exact 38 candidate floor cells, all 31 real two-wide supported stations unobstructed',()=>{
 const s=buildB192(),c=s.chosen,bridge=s.bridge;
 assert.equal(c.standingY,69);assert.equal(c.newFloorCells,38);
 assert.equal(c.path.length,31);
 assert.equal(bridge.floorCells.length,38);
 assert.equal(s.report['2wideTravellerRouteStations'],31);
 assert.equal(bridge.proof.unsupportedFootCells,0);
 assert.equal(bridge.proof.blockedTravellerCells,0);
 assert.equal(bridge.proof.parentOrAnnexOverlapCells,0);
 assert.equal(bridge.proof.originalBothModelsUntouched,true);
 const src=new Set(bridge.compiled.primitives.map(p=>p.slice(0,3).join(',')));
 for(const [x,y,z] of bridge.floorCells)assert(src.has([x,y,z].join(',')));
 for(const [x,z] of c.path)for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
  assert(!src.has([x+dx-100,69,z+dz].join(',')));
  assert(!src.has([x+dx-100,70,z+dz].join(',')));
 }
});
test('new bridge occupies only independent review geometry, with real rails, crowns, rings and supports',()=>{
 const s=buildB192(),parts=s.bridge.design.elements;
 const ids=parts.map(p=>p.id);
 for(const tag of ['b192-west-railing','b192-east-railing',
  'b192-travel-orbit-one','b192-travel-orbit-two',
  'b192-roof-glass-pane','b192-underslung-keel']){
  assert(ids.includes(tag),'not built: '+tag);
 }
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(s.bridge.design.bounds,{width:48,height:78,depth:50});
 assert.equal(s.report.bridgeIndependent160kMaxCells,MAX_CELLS);
 assert.equal(s.report.monolithicOverLimitMerged,false);
});
test('forbid any fabricated world placement, physical walking, approval, gate or model corruption',()=>{
 const r=buildB192().report;
 for(const mutate of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.worldCoordinates=[3,3,3],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'fill'}),
  x=>x.actualMinecraftBridgeConnected=true,x=>x.actualMinecraftWalkingCertified=true,
  x=>x.monolithicOverLimitMerged=true,
  x=>x.originalModelsBridgeOccupiedVoxelIntersections=1]){
  const changed=structuredClone(r);mutate(changed);
  assert.equal(verifyB192Report(changed),false);
 }
 const b=buildB191();
 const d=createSkybridgeDesign(b,b.chosen).design;
 d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
});
test('6 real 3D scenes, 18 original DSL modules, Y69/Y65 panel, 2D source camera scripts',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b192-'));
 try{
  const p=buildB192Preview({dir}),r=buildB192();
  assert.equal(p.real3dCells,142773);
  assert.equal(p.annexReal3dCells,19152);
  assert.equal(p.bridgeReal3dCells,r.bridge.compiled.primitives.length);
  assert.equal(p.viewerSceneCount,6);
  assert.equal(p.moduleCount,18);
  assert.equal(p.numberOfActualNew3dScenes,3);
  assert.equal(p.newConceptModelTotalOutsideHistoric36,39);
  assert.equal(p.sourceReviewOnly,true);
  assert.equal(p.worldWrites,0);assert.equal(p.constructionApproved,false);
  assert.equal(p.readiness,'NOT_PREPARED');
  assert.deepEqual(p.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(p.BuildPlan.operations,[]);
  const docs=JSON.parse(fs.readFileSync(path.join(dir,'B192_DESIGN_MODULES.json')));
  assert.equal(docs.modules.length,18);
  assert.equal(docs.modules.at(-1).id,'celestial-skybridge-b192');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const name of ['CELESTIAL SKYBRIDGE','HORIZON DOCK',
   'id="b192-level-69"','id="b192-level-65"','OFFLINE_REVIEW_COORDINATES'])
   assert(html.includes(name));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

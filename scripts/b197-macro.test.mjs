import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildB197,verifyB197Report,STANDING_LEVELS} from '../source/ai/b197-grand-hollow-atria.mjs';
import {buildB197Preview} from './b197-build-preview.mjs';
test('B197 grows the ORIGINAL NEBULA ARK main via 17th strict B143 module, no independent 6th',()=>{
 const {original,compiled,design,addon,report}=buildB197();
 assert.equal(original.compiled.primitives.length,142773);
 assert.equal(report.originalB188MainVoxels,142773);
 assert.equal(report.newIndependentOriginalBuildings,0);
 assert.equal(report.mainStrictModuleCount,17);
 assert(design.elements.length>=110&&design.elements.length<=160);
 assert(validateDesign(design));assert(verifyCompiled(design,addon));
 assert(compiled.primitives.length>142773&&compiled.primitives.length<=MAX_CELLS);
 assert.equal(report.remainingMain160kCells,MAX_CELLS-compiled.primitives.length);
 assert(verifyB197Report(report));
});
test('100% original source retained, old 21 physical-source floor waypoints and 30 backed edges / 12 X-boundary seams',()=>{
 const {original,compiled,net,city,report}=buildB197();
 const old=new Map(original.compiled.primitives.map(p=>[p.slice(0,3).join(','),p[3]]));
 const now=new Map(compiled.primitives.map(p=>[p.slice(0,3).join(','),p[3]]));
 for(const [pos,mat] of old)assert.equal(now.get(pos),mat,'lost or changed old original cell '+pos);
 assert.equal(now.size,old.size+report.newActualSourceOccupiedCells);
 assert.equal(net.joinedVertices,21);assert.equal(net.verifiedEdges,30);
 assert.equal(city.checkedCrossDistrict2WideSeams,12);
 assert.equal(city.verifiedExactReassembly,true);
 assert.equal(city.totalPartitionCells,compiled.primitives.length);
 assert.equal(report.originalSourceUnchanged,true);
 assert.equal(report.existingOldCellsOverwritten,0);
 assert.equal(report.oldB172ThroughB196FilesUnchanged,true);
});
test('all three actual big hollow civic halls have four actual supported U-gallery floors',()=>{
 const {atria,report,compiled}=buildB197();
 assert.deepEqual(STANDING_LEVELS,[33,41,49,57]);
 assert.equal(atria.gallerySourceLevels.length,12);
 assert.equal(atria.geometryOnlyFourLevelHalls,12);
 assert.equal(atria.horizontalSourceVerifiedEdges,132);
 const byHall=new Set(atria.gallerySourceLevels.map(x=>x.hall));
 assert.deepEqual([...byHall].sort(),['central','north','south']);
 for(const g of atria.gallerySourceLevels){
  assert.equal(g.supportedSourceOnlyFootprints,12);
  assert.equal(g.continuousHorizontalEdges,11);
  assert.equal(g.bodyAndHeadUnobstructed,true);
  assert.equal(g.physicalAccessNotCertified,true);
 }
 assert.equal(atria.realVerticalConnectionsCertified,false);
 assert(compiled.primitives.length<160000);
 assert.equal(report.actualMinecraftWalkingCertified,false);
});
test('source report and actual Minecraft execution remain fail-closed against fabricated success',()=>{
 const {report}=buildB197();
 for(const mutation of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.worldCoordinates=[1,2,3],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'setblock'}),
  x=>x.actualMinecraftWalkingCertified=true,
  x=>x.newIndependentOriginalBuildings=1,
  x=>x.originalSourceProtectedNetworkEdges=29,
  x=>x.existingOldCellsOverwritten=1,
  x=>x.remainingMain160kCells=-1]){
  const changed=structuredClone(report);mutation(changed);
  assert.equal(verifyB197Report(changed),false);
 }
});
test('21 original design docs and 13 working source-pinned scenes with updated five-model review',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b197-'));
 try{
  const viewer=buildB197Preview({dir}),s=buildB197();
  assert.equal(viewer.viewerSceneCount,13);
  assert.equal(viewer.moduleCount,21);
  assert.equal(viewer.mainArchitecturalModules,17);
  assert.equal(viewer.originalIndependentBuildings,5);
  assert.equal(viewer.original11ScenesPreserved,true);
  assert.equal(viewer.b197OriginalNewBuildings,0);
  assert.equal(viewer.mainOnlyB197Expansion,true);
  assert.equal(viewer.upgradedMainCells,s.compiled.primitives.length);
  assert.equal(viewer.newActualMainVoxels,s.report.newActualSourceOccupiedCells);
  assert.equal(viewer.upgradedFiveCityCells,247457+s.report.newActualSourceOccupiedCells);
  assert.equal(viewer.worldWrites,0);
  assert.equal(viewer.constructionApproved,false);
  assert.equal(viewer.readiness,'NOT_PREPARED');
  assert.deepEqual(viewer.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(viewer.BuildPlan.operations,[]);
  const json=JSON.parse(fs.readFileSync(path.join(dir,'B197_DESIGN_MODULES.json')));
  assert.equal(json.modules.length,21);
  assert.equal(json.modules.at(-1).id,'nebula-ark-b197-grand-hollow-atrium');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const text of ['b197-grand-hollow-panel','b197-open-main','b197-open-updated-city',
   'NEBULA ARK','NOT_PREPARED','元の11シーン','本館'])
   assert(html.includes(text),'missing authentic B197 reviewer '+text);
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script);assert.doesNotThrow(()=>new vm.Script(script));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

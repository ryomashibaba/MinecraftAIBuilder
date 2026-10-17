import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {SCHEMA as DSL,MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildB194} from '../source/ai/b194-junction-inspector.mjs';
import {buildB195,verifyB195Report,createTransitDesign,verifyFiveSkyways}
 from '../source/ai/b195-metropolis-transit.mjs';
import {buildB195Preview} from './b195-build-preview.mjs';
test('new truly original giant train terminal is a 19th strictly B143 authored source design and a fourth model',()=>{
 const a=buildB195(),d=a.design,c=a.compiled,r=a.report;
 assert.equal(d.schema,DSL);assert.equal(d.designOnly,true);
 assert.deepEqual(d.bounds,{width:80,height:78,depth:50});
 assert.equal(d.elements.length,r.newTransitSourceElements);
 assert(d.elements.length>=110&&d.elements.length<=160);
 assert(validateDesign(d));assert(verifyCompiled(d,c));
 assert(c.primitives.length>=12000&&c.primitives.length<MAX_CELLS);
 assert.equal(c.primitives.length,r.newTerminalOccupiedCells);
 assert.equal(r.independentStrictB143ModelCount,4);
 assert.equal(r.authoredB143Modules,19);
 assert.equal(r.totalViewerScenes,9);
 assert(verifyB195Report(r));
});
test('five genuinely distinct 72-position 2wide public floors with empty vertical bodies in all three halls',()=>{
 const a=buildB195(),levels=verifyFiveSkyways(a.compiled);
 assert.deepEqual(levels.levels.map(l=>l.standingY),[57,61,65,69,73]);
 assert.equal(levels.source2WideMoveEdges,355);
 assert.equal(levels.levels.length,5);
 for(const l of levels.levels){
  assert.equal(l.sourceTwoWideStandingSquares,72);
  assert.equal(l.continuousHorizontalMoves,71);
  assert.equal(l.joinedHallX.join(','),'17,40,63');
  assert.equal(l.footFourSupported,true);
  assert.equal(l.bodyAndHeadBothEmpty,true);
 }
 assert.equal(levels.actualMinecraftPlayerRouteCertified,false);
});
test('4 models are truly disjoint in virtual display and 3 historic source geometry hashes preserved',()=>{
 const a=buildB195(),old=buildB194();
 assert.equal(a.historical.report.cityscapeReviewSha256,old.report.cityscapeReviewSha256);
 assert.deepEqual(a.historical.groups.map(s=>s.sourceGeometrySha256),
  old.groups.map(s=>s.sourceGeometrySha256));
 assert.equal(a.report.originalModelOverlapCells,0);
 assert.equal(a.readOnlyScene.primitives.length,162816+a.compiled.primitives.length);
 const s=new Set(a.readOnlyScene.primitives.map(p=>p.slice(0,3).join(',')));
 assert.equal(s.size,a.readOnlyScene.primitives.length);
 assert.equal(a.readOnlyScene.virtualReviewOnly,true);
 assert.equal(a.readOnlyScene.notAnIndependentB143CompiledModel,true);
 assert.equal(a.report.noCombinedB143Compilation,true);
 assert.equal(a.report.originalSingleB143Cap,MAX_CELLS);
});
test('source-only city cannot falsify approval, safety, location or single-model cap',()=>{
 const r=buildB195().report;
 for(const mutate of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,
  x=>x.worldCoordinates=[0,60,0],x=>x.constructionApproved=true,
  x=>x.readiness='PREPARED',x=>x.gates[0]='PASS',
  x=>x.BuildPlan.operations.push({cmd:'fill'}),
  x=>x.actualMinecraftBuildingPlacementCertified=true,
  x=>x.actualPhysicalLinkToExistingCityCertified=true,
  x=>x.actualMinecraftWalkingCertified=true,
  x=>x.noCombinedB143Compilation=false,
  x=>x.originalModelOverlapCells=1
 ]){
  const copy=structuredClone(r);mutate(copy);
  assert.equal(verifyB195Report(copy),false);
 }
 const d=createTransitDesign();
 d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
});
test('standalone 9-view 3D studio includes 19 strict source docs and new authentic terminal',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b195-'));
 try{
  const m=buildB195Preview({dir}),a=buildB195();
  assert.equal(m.viewerSceneCount,9);
  assert.equal(m.moduleCount,19);
  assert.equal(m.transitReal3dCells,a.compiled.primitives.length);
  assert.equal(m.transitDesignParts,a.design.elements.length);
  assert.equal(m.numberOfActualNew3dScenes,4);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,40);
  assert.equal(m.expandedCityscapeCells,a.report.totalIndependentModelCells);
  assert.equal(m.transitFivePublicMoveEdges,355);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const docs=JSON.parse(fs.readFileSync(path.join(dir,'B195_DESIGN_MODULES.json')));
  assert.equal(docs.modules.length,19);
  assert.equal(docs.modules.at(-1).id,'metropolis-transit-exchange');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const v of ['METROPOLIS TRANSIT','b195-metropolis-panel',
   'b195-open-terminal','b195-open-4city','b194-show-metropolis-transit-exchange',
   'OFFLINE_REVIEW_COORDINATES'])assert(html.includes(v));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

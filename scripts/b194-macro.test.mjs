import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {buildB193} from '../source/ai/b193-virtual-cityscape.mjs';
import {buildB194,auditReviewTerminals,verifyB194Proof} from '../source/ai/b194-junction-inspector.mjs';
import {buildB194Preview} from './b194-build-preview.mjs';
test('all THREE original strict-B143 models stay unchanged; no model re-compilation or world writes',()=>{
 const v=buildB194(),prior=buildB193(),j=v.junctions;
 assert.equal(j.mainOccupiedCells,142773);
 assert.equal(j.annexOccupiedCells,19152);
 assert.equal(j.bridgeOccupiedCells,891);
 assert.equal(j.totalSourceVisualCells,162816);
 assert.equal(j.real3dSourceModels,3);
 assert.equal(j.authoredB143Documents,18);
 assert.equal(j.originalSourceCellOverlaps,0);
 assert.equal(j.originalSourceAuthoringUnchanged,true);
 assert.equal(j.offlineReviewFrame,'OFFLINE_REVIEW_COORDINATES');
 assert.deepEqual(v.groups.map(g=>g.sourceGeometrySha256),
  prior.groups.map(g=>g.sourceGeometrySha256));
 assert(verifyB194Proof(j));
});
test('original two endpoint floor squares have exact independent 2x2 support and free 2-block head',()=>{
 const j=buildB194().junctions;
 assert.equal(j.sourceRouteStations,31);
 assert.deepEqual(j.sourceMainEndpoint,[108,69,29]);
 assert.deepEqual(j.sourceAnnexEndpoint,[136,69,31]);
 assert.equal(j.terminalSourceOwnerSupportPassed,true);
 assert.equal(j.terminalRegions.length,3);
 for(const id of ['main-junction','annex-junction']){
  const r=j.terminalRegions.find(x=>x.id===id);
  assert(r);assert.equal(r.complete2WideFootprint.floor,4);
  assert.equal(r.complete2WideFootprint.body,0);
  assert.equal(r.complete2WideFootprint.head,0);
  assert.equal(r.complete2WideFootprint.passing,true);
 }
 assert(j.terminalRegions.every(x=>
  x.sourceVoxelCountsByModel.length===3&&
  x.sourceVoxelCountsByModel.some(n=>n>0)));
 assert.match(j.terminalProofSha256,/^[a-f0-9]{64}$/);
});
test('source-only junction markers do not add voxel cells or lie about intermediate bridge body clearances',()=>{
 const b=buildB194(),a=auditReviewTerminals(b);
 assert.equal(a.sourceRouteStations,31);
 assert.equal(b.readOnlyScene.primitives.length,162816);
 assert.equal(b.readOnlyScene.virtualReviewOnly,true);
 assert.equal(b.readOnlyScene.notAnIndependentB143CompiledModel,true);
 assert.equal(a.displayOnlyTerminalMarkers,true);
 assert.equal(a.displayOnlyColorization,true);
 assert.equal(a.sourceReviewSingleMonolith,false);
 assert.equal(a.actualWalkingCertified,false);
 assert.equal(a.actualFallSafetyCertified,false);
});
test('metadata tampering fails closed (no fabricated construction/walking/cap bypass)',()=>{
 const j=buildB194().junctions;
 for(const fn of [
  x=>x.minecraftWorldWrites=1,x=>x.minecraftWorldCoordinates=[1,2,3],
  x=>x.minecraftConstructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'setblock'}),
  x=>x.actualWalkingCertified=true,x=>x.actualFallSafetyCertified=true,
  x=>x.originalSourceCellOverlaps=1,x=>x.sourceReviewSingleMonolith=true,
  x=>x.totalSourceVisualCells=1,x=>x.sourceRouteStations=30]){
  const fake=structuredClone(j);fn(fake);
  assert.equal(verifyB194Proof(fake),false);
 }
});
test('offline 7-scene studio provides colored model UI and truthfully sourced junction camera markers',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b194-'));
 try{
  const m=buildB194Preview({dir}),v=buildB194();
  assert.equal(m.viewerSceneCount,7);
  assert.equal(m.moduleCount,18);
  assert.equal(m.cityscapeVoxelsAcrossModels,162816);
  assert.equal(m.cityscapeReadOnly,true);
  assert.equal(m.sourceOnlyColorReview,true);
  assert.equal(m.terminalFocusCount,3);
  assert.equal(m.sourceOnlyTerminalLabels,true);
  assert.equal(m.terminalInspectorStations,31);
  assert.equal(m.terminalInspectorSourceDigest,v.junctions.terminalProofSha256);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const docs=JSON.parse(fs.readFileSync(path.join(dir,'B194_DESIGN_MODULES.json')));
  assert.equal(docs.modules.length,18);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const s of ['b194-junction-inspector','b194-color-by-model',
   'b194-show-terminals','b194-focus-main','b194-focus-annex','b194-focus-whole',
   'b194-cityscape-panel','b194-show-nebula-ark-main','b194-show-horizon-dock-annex',
   'b194-show-celestial-skybridge','OFFLINE_REVIEW_COORDINATES','162,816']){
   assert(html.includes(s),'missing source-backed visual control '+s);
  }
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

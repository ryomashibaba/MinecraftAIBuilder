import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildB195} from '../source/ai/b195-metropolis-transit.mjs';
import {buildB196,createOrbitalDesign,auditOrbitalSkyways,verifyB196Report}
 from '../source/ai/b196-orbital-skyrail.mjs';
import {buildB196Preview} from './b196-build-preview.mjs';
test('strict fifth independent original B143 source-compiled giant orbital megastructure',()=>{
 const s=buildB196(),r=s.report;
 assert(validateDesign(s.design));assert(verifyCompiled(s.design,s.compiled));
 assert.deepEqual(s.design.bounds,{width:80,height:78,depth:50});
 assert(s.design.elements.length>=120&&s.design.elements.length<=160);
 assert(s.compiled.primitives.length>=18000&&s.compiled.primitives.length<MAX_CELLS);
 assert.equal(s.compiled.primitives.length,r.newSourceVoxels);
 assert.equal(s.design.elements.length,r.newSourceElements);
 assert.equal(r.totalIndependentB143Models,5);
 assert.equal(r.totalOriginalAuthoredB143Docs,20);
 assert.equal(r.viewerSceneCount,11);
 assert(verifyB196Report(r));
});
test('genuine 5 public levels support all four 2x2 foot voxels, no upper-body or head obstacles',()=>{
 const s=buildB196(),w=auditOrbitalSkyways(s.compiled);
 assert.deepEqual(w.layers.map(l=>l.standingY),[57,61,65,69,73]);
 assert.equal(w.sourceWalkMoves,355);
 const vox=new Set(s.compiled.primitives.map(p=>p.slice(0,3).join(',')));
 for(const a of w.layers){
  assert.equal(a.sourceSupported2WideStations,72);
  assert.equal(a.consecutiveSourceMoveEdges,71);
  assert.deepEqual(a.matchedThreeHalls,[17,40,63]);
  for(let x=4;x<=75;x++)for(let i=0;i<2;i++)for(let j=0;j<2;j++){
   const z=31+j;
   assert(vox.has([x+i,a.standingY-1,z].join(',')));
   assert(!vox.has([x+i,a.standingY,z].join(',')));
   assert(!vox.has([x+i,a.standingY+1,z].join(',')));
  }
 }
 assert.equal(w.actualInGameMovementCertified,false);
});
test('original 4 real architectural models are unchanged with 0 overlaps in 5-design reviewer',()=>{
 const s=buildB196(),b=buildB195(),r=s.report;
 assert.equal(s.previous.report.viewOnlyCityscapeSha256,b.report.viewOnlyCityscapeSha256);
 assert.equal(r.totalSourceReviewVoxels,203711+s.compiled.primitives.length);
 assert.deepEqual(r.previouslyVerifiedFourModels,[142773,19152,891,40895]);
 assert.equal(r.inheritedFourBuildingsOverlapCells,0);
 assert.equal(r.combinedB143MonolithCompiled,false);
 assert.equal(r.independentModelCapUnchanged,MAX_CELLS);
 assert.equal(s.readOnlyScene.notAnIndependentB143CompiledModel,true);
 assert.equal(s.readOnlyScene.virtualReviewOnly,true);
 const coords=new Set(s.readOnlyScene.primitives.map(p=>p.slice(0,3).join(',')));
 assert.equal(coords.size,s.readOnlyScene.primitives.length);
 assert.deepEqual(s.modelViews.map(m=>m.offset.x),[0,132,100,194,282]);
});
test('cannot forge Minecraft building permission, world writes, physical connection or single source-cap bypass',()=>{
 const r=buildB196().report;
 for(const fn of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.worldCoordinates=[3,6,9],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'fill'}),
  x=>x.actualMinecraftPlacementApproved=true,
  x=>x.physicalInterBuildingLinkCertified=true,
  x=>x.minecraftPlayerWalkingCertified=true,
  x=>x.combinedB143MonolithCompiled=true,
  x=>x.inheritedFourBuildingsOverlapCells=1]){
  const v=structuredClone(r);fn(v);
  assert.equal(verifyB196Report(v),false);
 }
 const d=createOrbitalDesign();d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
});
test('11 native offline source scenes, 20 real design documents and genuinely model-colored fifth city',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b196-'));
 try{
  const v=buildB196Preview({dir}),s=buildB196();
  assert.equal(v.viewerSceneCount,11);assert.equal(v.moduleCount,20);
  assert.equal(v.orbital3dCells,s.compiled.primitives.length);
  assert.equal(v.orbitalAuthoredParts,s.design.elements.length);
  assert.equal(v.newConceptModelTotalOutsideHistoric36,41);
  assert.equal(v.numberOfActualNew3dScenes,5);
  assert.equal(v.fiveCitySourceCells,s.report.totalSourceReviewVoxels);
  assert.equal(v.newSkyrailSkywayMoves,undefined); // separate actual field below
  assert.equal(v.orbitalSourceMoves,355);
  assert.equal(v.worldWrites,0);assert.equal(v.constructionApproved,false);
  assert.equal(v.readiness,'NOT_PREPARED');
  assert.deepEqual(v.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(v.BuildPlan.operations,[]);
  const source=JSON.parse(fs.readFileSync(path.join(dir,'B196_DESIGN_MODULES.json')));
  assert.equal(source.modules.length,20);
  assert.equal(source.modules.at(-1).id,'orbital-skyrail-interchange');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const term of ['ORBITAL SKYRAIL','b196-orbital-panel',
   'b196-open-orbital','b196-open-five','b194-show-orbital-skyrail-interchange',
   'OFFLINE_REVIEW_COORDINATES'])assert(html.includes(term));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

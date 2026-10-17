import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildStarRiver} from '../source/ai/b175-star-river.mjs';
import {buildAuroraCathedral,analyzeAuroraTransit,auroraParts,
 createAuroraModule,FLIGHT,verifyAuroraReport} from '../source/ai/b176-aurora-cathedral.mjs';
import {buildB176Preview} from './b176-build-preview.mjs';
test('strict 4th real architectural module, not a changed global cap',()=>{
 const old=buildStarRiver(),r=buildAuroraCathedral(),p=r.report;
 assert.equal(old.compiled.primitives.length,68914);
 assert.equal(old.report.totalAuthoredElements,280);
 assert(validateDesign(r.design));assert(verifyCompiled(r.design,r.addon));
 assert.equal(r.design.elements.length,auroraParts().length);
 assert(r.design.elements.length>=75&&r.design.elements.length<=160);
 assert.equal(p.moduleCount,4);assert.equal(p.inheritedElements,280);
 assert(p.newUnique3dCells>=2000);
 assert(p.final3dCells,68914+p.newUnique3dCells);
 assert(p.final3dCells<=MAX_CELLS);
 assert.notEqual(p.geometrySha256,p.parentGeometrySha256);
 assert(verifyAuroraReport(p));
});
test('18 extra real rising treads, 17 mixed-height seams, original Skycanyon junction',()=>{
 const r=buildAuroraCathedral(),t=analyzeAuroraTransit(r.compiled);
 assert.equal(FLIGHT.length,18);
 assert.equal(t.newOneRiseStairs,18);
 assert.equal(t.newAdjacentMixedHeightSeams,17);
 assert.equal(t.horizontalOldToNewJoinStations,3);
 assert(t.evidenceSha256.match(/^[0-9a-f]{64}$/));
 assert.equal(t.continuousMinecraftWalkingCertified,false);
 assert.equal(t.physicalStairCollisionCertified,false);
 assert.equal(r.report.minecraftInterfloorTraversalCertified,false);
});
test('2-wide support + clear 2-cell headspace survives all four flat routes',()=>{
 const r=buildAuroraCathedral();
 const cells=new Set(r.compiled.primitives.map(a=>a.slice(0,3).join(',')));
 for(const [y,z,a,b] of [[14,7,10,112],[26,20,12,110],
                          [60,3,12,112],[57,45,12,118]]){
  for(let x=a;x<=b+1;x++)for(let dz=0;dz<2;dz++){
   assert(cells.has([x,y-1,z+dz].join(',')));
   assert(!cells.has([x,y,z+dz].join(',')));
   assert(!cells.has([x,y+1,z+dz].join(',')));
  }
 }
 assert.deepEqual(r.report.oldFlat2WideMoves,[102,98,100]);
 assert(r.report.newRearFlat2WideMoves>=100);
});
test('fabricated live construction credentials, extra limits and invalid material rejected',()=>{
 const invalid=createAuroraModule();
 invalid.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(invalid),/B143_MATERIAL/);
 invalid.elements[0].material='accent';invalid.bounds.height=97;
 assert.throws(()=>validateDesign(invalid),/B143_BOUNDS/);
 const r=buildAuroraCathedral().report;
 for(const mutate of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,
  x=>x.worldCoordinates=[0,0,0],x=>x.constructionApproved=true,
  x=>x.readiness='PREPARED',x=>x.gates[0]='PASS',
  x=>x.BuildPlan.operations.push({cmd:'fill'}),
  x=>x.minecraftInterfloorTraversalCertified=true,
  x=>x.realMinecraftCollisionsCertified=true]){
  const bad=structuredClone(r);mutate(bad);
  assert.equal(verifyAuroraReport(bad),false);
 }
});
test('standalone offline 3D preview contains all four original design source modules',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b176-'));
 try{
  const m=buildB176Preview({dir}),r=buildAuroraCathedral();
  assert.equal(m.real3dCells,r.report.final3dCells);
  assert.equal(m.moduleCount,4);
  assert.equal(m.newUnique3dCells,r.report.newUnique3dCells);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);
  assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const d=JSON.parse(fs.readFileSync(path.join(dir,'B176_DESIGN_MODULES.json')));
  assert.equal(d.modules.length,4);
  assert.deepEqual(d.modules.map(x=>x.elements.length).slice(0,3),[151,74,55]);
  assert(d.modules[3].elements.length>=75);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const s of ['overview','low','upper','ring'])
   assert(html.includes('id="b176-'+s+'"'));
  assert(!html.includes('__B143_GALLERY_JSON__')&&!html.includes('fetch('));
  assert(!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{force:true,recursive:true})}
});

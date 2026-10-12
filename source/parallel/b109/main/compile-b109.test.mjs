import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {mergePlanarCells,buildB109Scene,validateB109Scene} from './b109-surface-model.mjs';
import {compileB109,validateB109Report,writeB109} from './compile-b109.mjs';
const copy=x=>structuredClone(x);
let cache;
const all=()=>cache??(cache=compileB109());
test('01 B109 whole-building report validates',()=>assert(validateB109Report(all().report)));
test('02 fifteen alternatives across five architecture uses',()=>{const t=all().report.totals;assert.equal(t.variants,15);assert.equal(t.typologies,5);});
test('03 existing 66 floors and 279 conceptual rooms are unchanged',()=>{const t=all().report.totals;assert.equal(t.conceptFloors,66);assert.equal(t.rooms,279);});
test('04 B105 roof source remains exactly 9203 cells',()=>assert.equal(all().report.totals.originalRoofCells,9203));
test('05 B105 glazing source remains exactly 3134 cells',()=>assert.equal(all().report.totals.originalGlazingCells,3134));
test('06 all 15 visual models preserve exact source-cell coverage',()=>{
 const r=all();for(let i=0;i<15;i++)assert(validateB109Scene(r.surfaces[i],
 r.parent.bundle.baseScenes[i],r.parent.bundle.polishScenes[i],r.parent.refined[i]));
});
test('07 geometric source volume is never edited',()=>{
 const r=all(),b=r.parent.bundle.baseScenes[0],p=r.parent.bundle.polishScenes[0],
 f=r.parent.refined[0],initial=JSON.stringify([b,p,f]);
 buildB109Scene(b,p,f);assert.equal(JSON.stringify([b,p,f]),initial);
});
test('08 roof consolidation produces fewer visual primitives than per-cell design',()=>{
 const t=all().report.totals;assert(t.mergedRoofSurfaces<t.originalRoofCells);
});
test('09 external facade consolidation produces fewer primitives',()=>{
 const t=all().report.totals;assert(t.mergedFacadePanels<t.originalFacadeCells);
});
test('10 combined roof facade and glazing reduces primary drawing count',()=>{
 assert(all().report.totals.savedPrimaryDrawingPrimitives>0);
});
test('11 one-to-one coverage of carved window cells',()=>{
 const m=all().report.totals;assert(m.mergedGlazingPanels>0);assert(m.mergedGlazingPanels<=m.originalGlazingCells);
});
test('12 all materials are typology-specific and safe',()=>{
 const b=all().surfaces;assert.equal(new Set(b.map(x=>x.groups.walls[0].material)).size,5);
});
test('13 test planar merger forms a single contiguous cuboid',()=>{
 const xs=[];for(let z=0;z<3;z++)for(let x=0;x<7;x++)xs.push({x,y:10,z,level:2});
 const m=mergePlanarCells(xs,'COHESIVE_ROOF',()=> 'roofSlate');
 assert.equal(m.length,1);assert.equal(m[0].w,7);assert.equal(m[0].d,3);
});
test('14 holes in merge input are not filled by invented roof geometry',()=>{
 const m=mergePlanarCells([{x:0,y:5,z:0,level:0},{x:2,y:5,z:0,level:0}],
 'COHESIVE_ROOF',()=> 'roofSlate');
 assert.equal(m.length,2);assert(m.every(x=>x.w===1));
});
test('15 duplicate source positions are fail closed',()=>{
 assert.throws(()=>mergePlanarCells([{x:0,y:5,z:0,level:0},{x:0,y:5,z:0,level:0}],
 'COHESIVE_ROOF',()=> 'roofSlate'),/DUPLICATE/);
});
test('16 visual digest detects corrupt windows',()=>{
 const a=all(),s=copy(a.surfaces[0]);s.groups.glazing[0].w+=1;
 assert(!validateB109Scene(s,a.parent.bundle.baseScenes[0],a.parent.bundle.polishScenes[0],a.parent.refined[0]));
});
test('17 source-linked report cannot claim construction approval',()=>{
 const r=copy(all().report);r.constructionApproved=true;assert(!validateB109Report(r));
});
test('18 strict nine blocked approval gates preserved',()=>{
 const r=all().report;assert.equal(r.gates.length,9);assert(r.gates.every(x=>x.status==='BLOCKED'));
});
test('19 all 296 historical unapproved and 18 held stay unapproved',()=>{
 const t=all().report.totals;assert.equal(t.legacyUnapproved,296);assert.equal(t.legacyHeld,18);
});
test('20 0 construction commands, physical rooms and Education BlockStates',()=>{
 const t=all().report.totals;assert.equal(t.approvedPhysicalRooms,0);
 assert.equal(t.verifiedEducationBlockStates,0);assert.deepEqual(all().report.BuildPlan.operations,[]);
});
test('21 HTML renders all 15 continuous facades and panel modes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b109-test-'));
 try{
  const o=writeB109(all(),dir),h=fs.readFileSync(o.htmlPath,'utf8');
  assert.equal(o.buildings,15);
  assert(h.includes('COHESIVE_ROOF'));assert(h.includes('LARGE_GLAZING'));
  assert(h.includes('window.__B109_QA='));
  assert(h.includes(all().surfaces[14].candidateId));
  assert(!h.includes('__B106_SCENE_PAYLOAD__'));assert(!h.includes('fetch('));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('22 generated browser JS parses cleanly',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b109-parser-'));
 try{
  const html=fs.readFileSync(writeB109(all(),dir).htmlPath,'utf8');
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];assert(script);
  assert.doesNotThrow(()=>new vm.Script(script));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('23 zero real world contacts on all visual models',()=>{
 for(const r of all().surfaces){assert.equal(r.worldContacts,0);assert.equal(r.worldCoordinates,null);
 assert.equal(r.constructionApproved,false);assert.deepEqual(r.BuildPlan.operations,[]);}
});
test('24 physical door window roof claims remain unverified',()=>{
 const r=all().report;assert.equal(r.roofWeatherproofCertified,false);
 assert.equal(r.realWindowOperationCertified,false);assert.equal(r.humanAestheticsApproved,false);
});

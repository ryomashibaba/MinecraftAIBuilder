import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildQuadTier,TIERS,CROSSINGS} from '../source/ai/b179-quad-tier.mjs';
import {buildAtriumArrivals,createAtriumArrivalModule,atriumArrivalParts,
 inspectFourTierArrivalPaths,verifyAtriumArrivalReport,HALLS,ARRIVAL}
 from '../source/ai/b180-atrium-arrivals.mjs';
import {buildB180Preview} from './b180-build-preview.mjs';
test('actual eighth strict source module expands 3D city and retains budgets',()=>{
 const old=buildQuadTier(),now=buildAtriumArrivals(),r=now.report;
 assert.equal(old.compiled.primitives.length,90643);
 assert.equal(old.report.authoredElements,590);
 assert(validateDesign(now.design));assert(verifyCompiled(now.design,now.addon));
 assert.equal(now.design.elements.length,atriumArrivalParts().length);
 assert(now.design.elements.length>=85&&now.design.elements.length<=160);
 assert(r.uniqueNewCells>=2000);
 assert(r.conceptualAirCells>=10&&r.conceptualAirCells<=600);
 assert.equal(r.finalCells,90643+r.uniqueNewCells-r.conceptualAirCells);
 assert(r.finalCells<=MAX_CELLS);
 assert(verifyAtriumArrivalReport(r));
});
test('four entire two-wide connected floor routes reach each hall and both bridge pairs',()=>{
 const r=buildAtriumArrivals(),proof=inspectFourTierArrivalPaths(r.compiled);
 assert.equal(proof.tiers.length,4);
 assert.equal(proof.checkedHallToBridgeConnections,24);
 assert(proof.tiers.every(t=>t.floorSourceSupportViolations===0&&t.bodyClearanceViolations===0));
 assert(proof.tiers.every(t=>t.connectedHalls.length===3&&t.connectedBridges.length===2));
 assert(proof.tiers.every(t=>t.connectedNodeCount>=80));
 assert.equal(proof.minecraftCollisionCertified,false);
 assert.equal(r.report.preserved8BridgePaths,8);
});
test('complete 2x2 floor and two-high headroom at every column of all four 90-move arrival spans',()=>{
 const v=buildAtriumArrivals(),occ=new Set(v.compiled.primitives.map(p=>p.slice(0,3).join(',')));
 for(const deck of TIERS)for(let x=ARRIVAL.x0;x<=ARRIVAL.xLast;x++)
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   assert(occ.has([x+dx,deck,ARRIVAL.walkZ+dz].join(',')));
   assert(!occ.has([x+dx,deck+1,ARRIVAL.walkZ+dz].join(',')));
   assert(!occ.has([x+dx,deck+2,ARRIVAL.walkZ+dz].join(',')));
  }
 assert.deepEqual(HALLS.map(h=>h.centerX),[24,62,101]);
 assert.equal(CROSSINGS.length,2);
});
test('tampering with world gates or claiming game movement is immediately rejected',()=>{
 const d=createAtriumArrivalModule();
 d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
 d.elements[0].material='concrete';d.bounds.height=97;
 assert.throws(()=>validateDesign(d),/B143_BOUNDS/);
 const r=buildAtriumArrivals().report;
 for(const tweak of [
  x=>x.worldContacts=1,x=>x.worldWrites=1,x=>x.worldCoordinates=[0,0,0],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',x=>x.gates[0]='PASS',
  x=>x.BuildPlan.operations.push({cmd:'fill'}),x=>x.minecraftWalkingCertified=true,
  x=>x.interfloorTransferCertified=true,x=>x.realCollisionCertified=true]){
  const bad=structuredClone(r);tweak(bad);
  assert.equal(verifyAtriumArrivalReport(bad),false);
 }
});
test('offline 3D viewer includes exact 8 independent source design documents and safety',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b180-'));
 try{
  const m=buildB180Preview({dir}),r=buildAtriumArrivals();
  assert.equal(m.real3dCells,r.report.finalCells);
  assert.equal(m.moduleCount,8);
  assert.equal(m.uniqueNewCells,r.report.uniqueNewCells);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const j=JSON.parse(fs.readFileSync(path.join(dir,'B180_DESIGN_MODULES.json')));
  assert.equal(j.modules.length,8);
  assert.deepEqual(j.modules.slice(0,7).map(x=>x.elements.length),
   [151,74,55,77,94,69,70]);
  assert(j.modules[7].elements.length>=85);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const n of ['overview','low','upper','ring'])
   assert(html.includes('id="b180-'+n+'"'));
  assert(!html.includes('undefined個'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

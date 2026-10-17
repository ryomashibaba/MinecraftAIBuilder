import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildVerticalUrban} from '../source/ai/b183-vertical-urban.mjs';
import {buildPanoramaCrown,createPanoramaCrownModule,panoramaCrownElements,
 inspectPanoramaParkConnections,ROOF_Y,ROOF_SPINE,ROOF_PARKS,verifyPanoramaReport}
 from '../source/ai/b184-panorama-crown.mjs';
import {buildB184Preview} from './b184-build-preview.mjs';
test('12th real strict B143 module builds monumental rooftop park skyline',()=>{
 const parent=buildVerticalUrban(),s=buildPanoramaCrown(),r=s.report;
 assert.equal(parent.compiled.primitives.length,110160);
 assert.equal(parent.report.totalAuthoredParts,1056);
 assert(validateDesign(s.design));assert(verifyCompiled(s.design,s.addon));
 assert.equal(s.design.elements.length,panoramaCrownElements().length);
 assert(s.design.elements.length>=105&&s.design.elements.length<=160);
 assert(r.addedUniqueCells>=3000);
 assert.equal(r.finalOccupiedCells,110160+r.addedUniqueCells-r.skywaySourceAirCells);
 assert(r.finalOccupiedCells<=MAX_CELLS);
 assert.notEqual(r.geometrySha256,r.parentGeometrySha256);
 assert(verifyPanoramaReport(r));
});
test('all three roof skyparks share a genuinely connected 2wide roof public graph',()=>{
 const s=buildPanoramaCrown(),p=inspectPanoramaParkConnections(s.compiled);
 assert.equal(p.sourceConnectedSkyparks,3);
 assert.equal(p.newSkyway2wideMoves,99);
 assert(p.reachable2wideNodes>=100);
 assert.deepEqual(p.parks.map(x=>x.hall),['north','core','south']);
 assert(p.parks.every(x=>x.sourceConnected&&x.branch2wideMoves===9));
 assert.equal(p.actualMinecraftWalkingCertified,false);
 assert.equal(s.report.minecraftWalkingCertified,false);
});
test('every new public skyway and hall-facing branch has actual floor + 2-high void',()=>{
 const cells=new Set(buildPanoramaCrown().compiled.primitives.map(v=>v.slice(0,3).join(',')));
 const valid=(x,y,z)=>[0,1].every(dx=>[0,1].every(dz=>
  cells.has([x+dx,y-1,z+dz].join(','))&&
  !cells.has([x+dx,y,z+dz].join(','))&&
  !cells.has([x+dx,y+1,z+dz].join(','))));
 for(let x=ROOF_SPINE.x0;x<=ROOF_SPINE.x1;x++)
  assert(valid(x,ROOF_Y,ROOF_SPINE.z),'continuous sky panorama spine '+x);
 for(const h of ROOF_PARKS)
  for(let z=h.entryZ;z<=h.innerZ;z++)
   assert(valid(h.cx,ROOF_Y,z),h.id+' Z'+z);
});
test('Minecraft writes, false player motion, fake gates and banned materials fail closed',()=>{
 const design=createPanoramaCrownModule();
 design.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(design),/B143_MATERIAL/);
 design.elements[0].material='concrete';design.bounds.height=97;
 assert.throws(()=>validateDesign(design),/B143_BOUNDS/);
 const original=buildPanoramaCrown().report;
 for(const action of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,
  x=>x.worldCoordinates=[0,0,0],x=>x.constructionApproved=true,
  x=>x.readiness='PREPARED',x=>x.gates[0]='PASS',
  x=>x.BuildPlan.operations.push({cmd:'setblock'}),
  x=>x.minecraftWalkingCertified=true,
  x=>x.verticalPhysicalTraversalCertified=true]){
  const fake=structuredClone(original);action(fake);
  assert.equal(verifyPanoramaReport(fake),false);
 }
});
test('source-pinned offline viewer ships all 12 real authoring documents + safety',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b184-'));
 try{
  const m=buildB184Preview({dir}),p=buildPanoramaCrown();
  assert.equal(m.real3dCells,p.report.finalOccupiedCells);
  assert.equal(m.moduleCount,12);assert.equal(m.addedUniqueCells,p.report.addedUniqueCells);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const d=JSON.parse(fs.readFileSync(path.join(dir,'B184_DESIGN_MODULES.json')));
  assert.equal(d.modules.length,12);
  assert.deepEqual(d.modules.slice(0,11).map(x=>x.elements.length),
   [151,74,55,77,94,69,70,109,127,133,97]);
  assert(d.modules[11].elements.length>=105);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const preset of ['overview','low','upper','ring'])
   assert(html.includes('id="b184-'+preset+'"'));
  assert(html.includes(p.report.totalAuthoredParts+'個'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script);assert.doesNotThrow(()=>new vm.Script(script));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

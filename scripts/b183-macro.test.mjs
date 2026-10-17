import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildAerialSwitchback,FLIGHTS} from '../source/ai/b182-switchback.mjs';
import {buildVerticalUrban,createVerticalUrbanModule,urbanGalleryElements,
 inspectCompleteVerticalLinks,verifyVerticalUrbanReport} from '../source/ai/b183-vertical-urban.mjs';
import {buildB183Preview} from './b183-build-preview.mjs';
test('11th independent strict B143 architecture genuinely extends parent voxels',()=>{
 const p=buildAerialSwitchback(),v=buildVerticalUrban(),r=v.report;
 assert.equal(p.compiled.primitives.length,102668);
 assert.equal(p.report.totalAuthoredParts,959);
 assert(validateDesign(v.design));assert(verifyCompiled(v.design,v.addon));
 assert.equal(v.design.elements.length,urbanGalleryElements().length);
 assert(v.design.elements.length>=90&&v.design.elements.length<=160);
 assert(r.addedUniqueCells>=1500);
 assert.equal(r.totalOccupiedCells,102668+r.addedUniqueCells);
 assert(r.totalOccupiedCells<=MAX_CELLS);
 assert.notEqual(r.geometrySha256,r.parentGeometrySha256);
 assert.equal(verifyVerticalUrbanReport(r),true);
});
test('all 9 full down-to-up transit candidates include source approach, four risers and return',()=>{
 const o=buildVerticalUrban(),r=inspectCompleteVerticalLinks(o.compiled);
 assert.equal(r.flights.length,9);
 assert.equal(r.sourceCompleteConnections,9);
 assert.equal(r.verifiedCrossHeightRiserEdges,36);
 assert.equal(r.verifiedLowerSourceJoins,9);
 assert.equal(r.verifiedUpperSourceJoins,9);
 for(const f of r.flights){
  assert.equal(f.verifiedRiserEdges,4);
  assert.equal(f.inspectedRiserEdges,4);
  assert(f.riserProof.every(p=>p.edgeAndHeadroom));
  assert(f.sourceLowerJoined&&f.sourceUpperJoined);
  assert(f.geometryConnectionPassed);
  assert(f.topSameLevelEdgeVerified);
  assert.equal(f.verifiedUpperReturnStations,14);
  assert.match(f.lowerPathSha256,/^[a-f0-9]{64}$/);
  assert.match(f.upperPathSha256,/^[a-f0-9]{64}$/);
 }
 assert.equal(r.actualMinecraftPlayerTraversalCertified,false);
 assert.equal(r.physicalCollisionCertified,false);
});
test('non-trivial lower/upper hall staging graph and 2wide riser surfaces remain real',()=>{
 const c=new Set(buildVerticalUrban().compiled.primitives.map(p=>p.slice(0,3).join(',')));
 const flat=(x,y,z)=>[0,1].every(dx=>[0,1].every(dz=>
  c.has([x+dx,y-1,z+dz].join(','))&&
  !c.has([x+dx,y,z+dz].join(','))&&
  !c.has([x+dx,y+1,z+dz].join(','))));
 for(const f of FLIGHTS){
  const y=f.deck+1;
  assert(flat(f.cx,y,29));
  assert(flat(f.x,y,31));
  assert(flat(f.x+3,y+4,29));
  assert(flat(f.cx,y+4,29));
  for(let s=0;s<4;s++){
   assert(flat(f.x,y+s+1,33+3*s));
   assert(flat(f.x,y+s+1,34+3*s));
  }
 }
});
test('no false live construction, modified gate or fabricated physical traversal allowed',()=>{
 const design=createVerticalUrbanModule();
 design.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(design),/B143_MATERIAL/);
 design.elements[0].material='concrete';design.bounds.height=97;
 assert.throws(()=>validateDesign(design),/B143_BOUNDS/);
 const r=buildVerticalUrban().report;
 for(const modify of [
  x=>x.worldContacts=1,x=>x.worldWrites=1,x=>x.worldCoordinates=[1,2,3],
  x=>x.readiness='PREPARED',x=>x.constructionApproved=true,
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'fill'}),
  x=>x.realMinecraftWalkingCertified=true,
  x=>x.interfloorPhysicalTraversalCertified=true]){
  const bad=structuredClone(r);modify(bad);
  assert.equal(verifyVerticalUrbanReport(bad),false);
 }
});
test('standalone offline 3D model contains 11 independent source documents and safety',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b183-'));
 try{
  const m=buildB183Preview({dir}),s=buildVerticalUrban();
  assert.equal(m.real3dCells,s.report.totalOccupiedCells);
  assert.equal(m.moduleCount,11);
  assert.equal(m.addedUniqueCells,s.report.addedUniqueCells);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const d=JSON.parse(fs.readFileSync(path.join(dir,'B183_DESIGN_MODULES.json')));
  assert.equal(d.modules.length,11);
  assert.deepEqual(d.modules.slice(0,10).map(x=>x.elements.length),
   [151,74,55,77,94,69,70,109,127,133]);
  assert(d.modules[10].elements.length>=90);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const preset of ['overview','low','upper','ring'])
   assert(html.includes('id="b183-'+preset+'"'));
  assert(html.includes(s.report.totalAuthoredParts+'個'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script);assert.doesNotThrow(()=>new vm.Script(script));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

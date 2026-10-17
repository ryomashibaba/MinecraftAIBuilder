import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildPanoramaCrown} from '../source/ai/b184-panorama-crown.mjs';
import {buildCelestialPortico,createPorticoModule,porticoElements,GATES,
 auditRoofGates,verifyCelestialPorticoReport} from '../source/ai/b185-celestial-portico.mjs';
import {buildB185Preview} from './b185-build-preview.mjs';
test('13th strict B143 source module increases real volumetric architecture',()=>{
 const old=buildPanoramaCrown(),now=buildCelestialPortico(),r=now.report;
 assert.equal(old.compiled.primitives.length,114983);
 assert.equal(old.report.totalAuthoredParts,1163);
 assert(validateDesign(now.design));assert(verifyCompiled(now.design,now.addon));
 assert.equal(now.design.elements.length,porticoElements().length);
 assert(now.design.elements.length>=95&&now.design.elements.length<=160);
 assert(r.addedNewVoxels>=2500);assert(r.sourceOnlyAirCuts>=6&&r.sourceOnlyAirCuts<=36);
 assert.equal(r.totalVoxels,114983+r.addedNewVoxels-r.sourceOnlyAirCuts);
 assert(r.totalVoxels<=MAX_CELLS);
 assert.notEqual(r.geometrySha256,r.parentGeometrySha256);
 assert(verifyCelestialPorticoReport(r));
});
test('three hall-to-roof transitions have real 2wide supported stages and end-to-end flat joins',()=>{
 const x=buildCelestialPortico(),a=auditRoofGates(x.compiled);
 assert.equal(a.joined,3);assert.equal(a.risers,6);assert.equal(a.stages,9);
 for(const gate of a.gates){
  assert(gate.geometryConnected&&gate.sourceLowerJoined&&gate.sourceUpperJoined);
  assert.match(gate.lowerPathSha256,/^[a-f0-9]{64}$/);
  assert.match(gate.upperPathSha256,/^[a-f0-9]{64}$/);
 }
 assert.equal(a.minecraftPlayerWalkingCertified,false);
});
test('roof air clearance mask is exactly limited, and upper roof support retained',()=>{
 const original=new Set(buildPanoramaCrown().compiled.primitives.map(p=>p.slice(0,3).join(',')));
 const now=buildCelestialPortico();
 const fresh=new Set(now.compiled.primitives.map(p=>p.slice(0,3).join(',')));
 for(const g of GATES)for(let x=g.x;x<=g.x+2;x++)for(let z=27;z<=28;z++){
  assert(original.has([x,74,z].join(',')));
  assert(!fresh.has([x,74,z].join(',')));
  assert(!fresh.has([x,75,z].join(',')));
  assert(fresh.has([x,73,z].join(',')));
  assert(fresh.has([x,74,25].join(',')));
  assert(fresh.has([x,74,26].join(',')));
 }
 assert.equal(now.report.oldParks,3);assert.equal(now.report.oldRoofMoves,99);
 assert.equal(now.report.oldVerticalFlights,9);
});
test('reject world writes, faked player certification, invalid strict materials and bounds',()=>{
 const d=createPorticoModule();d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
 d.elements[0].material='concrete';d.bounds.height=97;
 assert.throws(()=>validateDesign(d),/B143_BOUNDS/);
 const r=buildCelestialPortico().report;
 for(const change of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.worldCoordinates=[0,0,0],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'setblock'}),
  x=>x.actualEducationSteppingCertified=true,x=>x.actualEducationWalkingCertified=true]){
  const fake=structuredClone(r);change(fake);
  assert.equal(verifyCelestialPorticoReport(fake),false);
 }
});
test('offline 3D viewer has exact 13 separately authored documents, no external world contact',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b185-'));
 try{
  const v=buildB185Preview({dir}),r=buildCelestialPortico();
  assert.equal(v.real3dCells,r.report.totalVoxels);
  assert.equal(v.moduleCount,13);assert.equal(v.addedNewVoxels,r.report.addedNewVoxels);
  assert.equal(v.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(v.worldWrites,0);assert.equal(v.constructionApproved,false);
  assert.equal(v.readiness,'NOT_PREPARED');
  assert.deepEqual(v.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(v.BuildPlan.operations,[]);
  const d=JSON.parse(fs.readFileSync(path.join(dir,'B185_DESIGN_MODULES.json')));
  assert.equal(d.modules.length,13);
  assert.deepEqual(d.modules.slice(0,12).map(x=>x.elements.length),
   [151,74,55,77,94,69,70,109,127,133,97,107]);
  assert(d.modules[12].elements.length>=95);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const mode of ['overview','low','upper','ring'])
   assert(html.includes('id="b185-'+mode+'"'));
  assert(html.includes(r.report.totalElements+'個'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script);assert.doesNotThrow(()=>new vm.Script(script));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildOculusAtrium} from '../source/ai/b181-oculus-atrium.mjs';
import {buildAerialSwitchback,createSwitchbackModule,aerialSwitchbackParts,
 inspectAerialFlights,FLIGHTS,verifyAerialReport} from '../source/ai/b182-switchback.mjs';
import {buildB182Preview} from './b182-build-preview.mjs';
test('10th independent strict B143 module makes real giant new voxel architecture',()=>{
 const parent=buildOculusAtrium(),s=buildAerialSwitchback(),r=s.report;
 assert.equal(parent.compiled.primitives.length,98495);
 assert.equal(parent.report.totalElements,826);
 assert(validateDesign(s.design));assert(verifyCompiled(s.design,s.addon));
 assert.equal(s.design.elements.length,aerialSwitchbackParts().length);
 assert(s.design.elements.length>=110&&s.design.elements.length<=160);
 assert(r.newlyOccupied3dCells>=2500);
 assert.equal(r.total3dCells,98495+r.newlyOccupied3dCells-r.sourceAirCellsReserved);
 assert(r.total3dCells<=MAX_CELLS);
 assert.notEqual(r.geometrySha256,r.parentGeometrySha256);
 assert(verifyAerialReport(r));
});
test('9 flights x four true 1-high supported 3x3 stairs; clear 2x2 geometry',()=>{
 const {compiled,report}=buildAerialSwitchback();
 const evidence=inspectAerialFlights(compiled);
 assert.equal(evidence.flightCount,9);assert.equal(evidence.treadCount,36);
 assert.equal(FLIGHTS.length,9);
 assert.equal(evidence.joinedTierPairs,3);
 assert(evidence.flights.every(x=>x.stairTreads===4));
 assert(evidence.flights.every(x=>x.verified2x2Treads&&x.verified2x2Headroom));
 assert.equal(evidence.playerStepPhysicsCertified,false);
 assert.equal(report.realMinecraftSteppingCertified,false);
});
test('independent verification of lower entry, each four-step 2wide tread and upper return',()=>{
 const {compiled}=buildAerialSwitchback(),occ=new Set(compiled.primitives.map(p=>p.slice(0,3).join(',')));
 const walk=(x,y,z)=>[0,1].every(dx=>[0,1].every(dz=>
  occ.has([x+dx,y-1,z+dz].join(','))&&
  !occ.has([x+dx,y,z+dz].join(','))&&
  !occ.has([x+dx,y+1,z+dz].join(','))));
 for(const f of FLIGHTS){
  for(let z=29;z<=31;z++)assert(walk(f.x,f.deck+1,z));
  for(let s=0;s<4;s++)
   for(let z=33+3*s;z<=34+3*s;z++)
    assert(walk(f.x,f.deck+s+2,z));
  assert(walk(f.x+2,f.deck+5,42));
  for(let z=29;z<=42;z++)assert(walk(f.x+3,f.deck+5,z));
 }
});
test('no fabricated game-world permissions, unsafe DSL or false step physics',()=>{
 const d=createSwitchbackModule();d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
 d.elements[0].material='concrete';d.bounds.height=97;
 assert.throws(()=>validateDesign(d),/B143_BOUNDS/);
 const original=buildAerialSwitchback().report;
 for(const mutate of [
  v=>v.worldWrites=1,v=>v.worldContacts=1,
  v=>v.worldCoordinates=[0,0,0],v=>v.readiness='PREPARED',
  v=>v.constructionApproved=true,v=>v.gates[0]='PASS',
  v=>v.BuildPlan.operations.push({cmd:'setblock'}),
  v=>v.realMinecraftSteppingCertified=true,
  v=>v.continuousPhysicalVerticalTraversalCertified=true]){
  const bad=structuredClone(original);mutate(bad);
  assert.equal(verifyAerialReport(bad),false);
 }
});
test('offline preview carries 10 authentic independent source designs + safety',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b182-'));
 try{
  const out=buildB182Preview({dir}),s=buildAerialSwitchback();
  assert.equal(out.real3dCells,s.report.total3dCells);
  assert.equal(out.moduleCount,10);assert.equal(out.newlyOccupied3dCells,s.report.newlyOccupied3dCells);
  assert.equal(out.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(out.worldWrites,0);assert.equal(out.constructionApproved,false);
  assert.equal(out.readiness,'NOT_PREPARED');assert.deepEqual(out.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(out.BuildPlan.operations,[]);
  const d=JSON.parse(fs.readFileSync(path.join(dir,'B182_DESIGN_MODULES.json')));
  assert.equal(d.modules.length,10);
  assert.deepEqual(d.modules.slice(0,9).map(x=>x.elements.length),
   [151,74,55,77,94,69,70,109,127]);
  assert(d.modules[9].elements.length>=110);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const preset of ['overview','low','upper','ring'])assert(html.includes('id="b182-'+preset+'"'));
  assert(html.includes(s.report.totalAuthoredParts+'個'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script);assert.doesNotThrow(()=>new vm.Script(script));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

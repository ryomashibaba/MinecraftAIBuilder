import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildCelestialPortico} from '../source/ai/b185-celestial-portico.mjs';
import {buildCrownObservatory,createCrownModule,crownObservatoryElements,
 auditRaisedCrown,OVERLOOKS,RAISED_Y,RAISED_LONG_WAY,verifyCrownReport}
 from '../source/ai/b186-crown-observatory.mjs';
import {buildB186Preview} from './b186-build-preview.mjs';
test('14 independent strictly limited B143 modules add new real volumetric skyline and free cell budget',()=>{
 const p=buildCelestialPortico(),s=buildCrownObservatory(),r=s.report;
 assert.equal(p.compiled.primitives.length,123583);
 assert.equal(p.report.totalElements,1264);
 assert(validateDesign(s.design));assert(verifyCompiled(s.design,s.addon));
 assert.equal(s.design.elements.length,crownObservatoryElements().length);
 assert(s.design.elements.length>=90&&s.design.elements.length<=160);
 assert(r.added3dCells>=3000);
 assert(r.upperBodyAirRemoved>=100&&r.upperBodyAirRemoved<=3200);
 assert.equal(r.total3dCells,123583+r.added3dCells-r.upperBodyAirRemoved);
 assert(r.total3dCells<=MAX_CELLS);
 assert.equal(r.remaining3dCellBudget,MAX_CELLS-r.total3dCells);
 assert.notEqual(r.geometrySha256,r.parentGeometrySha256);
 assert.equal(verifyCrownReport(r),true);
});
test('three independent 1-rise Y75-to-Y76 public rooftop skyparks all share real 2wide skyway',()=>{
 const v=buildCrownObservatory(),proof=auditRaisedCrown(v.compiled);
 assert.equal(proof.sourceConnectedRaisedParks,3);
 assert.equal(proof.sourceRiseContacts,3);
 assert.equal(proof.publicCrownWalkMoves,99);
 assert(proof.routeGraphNodes>=100);
 assert.deepEqual(proof.routes.map(x=>x.hall),['north','core','south']);
 assert(proof.routes.every(x=>x.sourceOneBlockRiseEdge&&x.sourceRaisedDeckConnected));
 assert.equal(proof.actualInGameVerticalTravelCertified,false);
});
test('actual source 2x2 head and support floors, protected all older vertical routes',()=>{
 const v=buildCrownObservatory(),set=new Set(v.compiled.primitives.map(p=>p.slice(0,3).join(',')));
 const valid=(x,y,z)=>[0,1].every(dx=>[0,1].every(dz=>
  set.has([x+dx,y-1,z+dz].join(','))&&
  !set.has([x+dx,y,z+dz].join(','))&&
  !set.has([x+dx,y+1,z+dz].join(','))));
 for(let x=RAISED_LONG_WAY.startX;x<=RAISED_LONG_WAY.endX;x++)
  assert(valid(x,RAISED_Y,RAISED_LONG_WAY.z));
 for(const h of OVERLOOKS){
  assert(valid(h.x,75,h.lowerNodeZ));
  assert(valid(h.x,RAISED_Y,h.raisedNodeZ));
  for(let z=29;z<=40;z++)assert(valid(h.x,RAISED_Y,z));
 }
 assert.equal(v.report.protectedNineStairways,9);
 assert.equal(v.report.protectedRoofGates,3);
 assert.equal(v.report.protectedEightSkybridges,8);
});
test('integrated 18-node 27-edge verified-source topo chain never claims real walking',()=>{
 const v=buildCrownObservatory(),proof=v.paths;
 assert.equal(proof.integratedSourceVertices,18);
 assert.equal(proof.integratedConceptualEdges,27);
 assert.equal(proof.allHallLevelsConnectedInVerifiedSourceTopology,true);
 assert.equal(v.report.inGameWalkingCertified,false);
 assert.equal(v.report.inGameRisersCertified,false);
 const d=createCrownModule();d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
 d.elements[0].material='concrete';d.bounds.height=97;
 assert.throws(()=>validateDesign(d),/B143_BOUNDS/);
 const r=v.report;
 for(const cb of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.worldCoordinates=[1,2,3],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({command:'fill'}),
  x=>x.inGameWalkingCertified=true,x=>x.inGameRisersCertified=true]){
  const changed=structuredClone(r);cb(changed);
  assert.equal(verifyCrownReport(changed),false);
 }
});
test('real offline source viewer exports all 14 DSL modules, geometry and safety',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b186-'));
 try{
  const m=buildB186Preview({dir}),s=buildCrownObservatory();
  assert.equal(m.real3dCells,s.report.total3dCells);
  assert.equal(m.moduleCount,14);
  assert.equal(m.added3dCells,s.report.added3dCells);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const d=JSON.parse(fs.readFileSync(path.join(dir,'B186_DESIGN_MODULES.json')));
  assert.equal(d.modules.length,14);
  assert.deepEqual(d.modules.slice(0,13).map(x=>x.elements.length),
   [151,74,55,77,94,69,70,109,127,133,97,107,101]);
  assert(d.modules[13].elements.length>=90);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const p of ['overview','low','upper','ring'])assert(html.includes('id="b186-'+p+'"'));
  assert(html.includes(s.report.totalElements+'個'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

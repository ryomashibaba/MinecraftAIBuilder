import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildLegibleCivic} from '../source/ai/b187-legible-civic.mjs';
import {buildCivicGates,createCivicGatesModule,civicGateElements,
 auditCivicDistrictSegmentation,DISTRICTS,PUBLIC_SEAM_LEVELS,
 verifyCivicGatesReport} from '../source/ai/b188-civic-gates.mjs';
import {buildB188Preview} from './b188-build-preview.mjs';
test('16th strict B143 module adds real distinct civic entrance source geometry within cap',()=>{
 const old=buildLegibleCivic(),s=buildCivicGates(),r=s.report;
 assert.equal(old.compiled.primitives.length,136012);
 assert.equal(old.report.totalAuthoredElements,1450);
 assert(validateDesign(s.design));assert(verifyCompiled(s.design,s.addon));
 assert.equal(s.design.elements.length,civicGateElements().length);
 assert(s.design.elements.length>=80&&s.design.elements.length<=160);
 assert(r.newActualOccupiedCells>=1700);
 assert.equal(r.compositeOccupiedCells,136012+r.newActualOccupiedCells);
 assert(r.compositeOccupiedCells<=MAX_CELLS);
 assert.equal(r.actualCellsRemaining,MAX_CELLS-r.compositeOccupiedCells);
 assert(r.geometrySha256!==r.parentGeometrySha256);
 assert(verifyCivicGatesReport(r));
});
test('three losslessly segregated source voxel districts are non-overlapping, non-mutating',()=>{
 const s=buildCivicGates(),g=auditCivicDistrictSegmentation(s.compiled);
 assert.equal(g.districts.length,3);
 assert.deepEqual(g.districts.map(d=>[d.x0,d.x1]),[[0,42],[43,82],[83,123]]);
 assert.deepEqual(g.districts.map(d=>d.containedOriginalHallCenter),[24,62,101]);
 assert.equal(g.totalPartitionCells,s.compiled.primitives.length);
 assert(g.districts.every(x=>x.realCells>8000));
 assert(g.districts.every(x=>x.geometryCellsSha256.length===64));
 assert.equal(g.partitionOverlapCells,0);
 assert.equal(g.verifiedExactReassembly,true);
 assert.equal(g.futureShardPlanOnly,true);
 assert(g.districts.every(x=>
  x.worldWrites===0&&x.worldCoordinates===null&&
  x.constructionApproved===false&&x.executionOperations.length===0));
});
test('12 real source-supported 2-wide across-district seams survive on six civic levels',()=>{
 const s=buildCivicGates(),g=auditCivicDistrictSegmentation(s.compiled);
 assert.equal(g.checkedCrossDistrict2WideSeams,12);
 assert.equal(PUBLIC_SEAM_LEVELS.length,6);
 assert.equal(g.crossDistrictFloorSeams.length,12);
 assert.deepEqual([...new Set(g.crossDistrictFloorSeams.map(x=>x.crossX))],[42,82]);
 assert(g.crossDistrictFloorSeams.every(x=>
   x.twoWideFloorAndHeadroomProof===true&&[42,82].includes(x.crossX)));
 assert.equal(s.report.sourceVerifiedWaypoints,21);
 assert.equal(s.report.sourceVerifiedNetworkEdges,30);
 assert.equal(s.report.originalNineFloorToFloorFlights,9);
});
test('original 136012 cells retained exactly and Minecraft world execution still blocked',()=>{
 const p=buildLegibleCivic(),s=buildCivicGates(),q=s.report;
 const parentSet=new Set(p.compiled.primitives.map(v=>v.slice(0,3).join(',')));
 const newSet=new Set(s.compiled.primitives.map(v=>v.slice(0,3).join(',')));
 for(const key of parentSet)assert(newSet.has(key),'protected parent cell removed: '+key);
 assert.equal(newSet.size,s.compiled.primitives.length);
 const fake=structuredClone(q);
 for(const mutate of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.worldCoordinates=[0,0,0],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'fill'}),
  x=>x.physicalMinecraftWalkingCertified=true,
  x=>x.districtConstructionAuthorized=true]){
  const m=structuredClone(fake);mutate(m);
  assert.equal(verifyCivicGatesReport(m),false);
 }
 const d=createCivicGatesModule();
 d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
 d.elements[0].material='metal';d.bounds.height=97;
 assert.throws(()=>validateDesign(d),/B143_BOUNDS/);
});
test('standalone 3D viewer embeds all sixteen B143 source originals with safe real geometry',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b188-'));
 try{
  const p=buildB188Preview({dir}),s=buildCivicGates();
  assert.equal(p.real3dCells,s.report.compositeOccupiedCells);
  assert.equal(p.moduleCount,16);
  assert.equal(p.newActualOccupiedCells,s.report.newActualOccupiedCells);
  assert.equal(p.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(p.worldWrites,0);assert.equal(p.constructionApproved,false);
  assert.equal(p.readiness,'NOT_PREPARED');
  assert.deepEqual(p.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(p.BuildPlan.operations,[]);
  const docs=JSON.parse(fs.readFileSync(path.join(dir,'B188_DESIGN_MODULES.json')));
  assert.equal(docs.modules.length,16);
  assert.deepEqual(docs.modules.slice(0,15).map(m=>m.elements.length),
   [151,74,55,77,94,69,70,109,127,133,97,107,101,91,95]);
  assert(docs.modules[15].elements.length>=80);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const mode of ['overview','low','upper','ring'])
   assert(html.includes('id="b188-'+mode+'"'));
  assert(html.includes(s.report.totalAuthoredElements+'個'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script);assert.doesNotThrow(()=>new vm.Script(script));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

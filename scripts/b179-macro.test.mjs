import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildConnectedSky} from '../source/ai/b178-connected-sky.mjs';
import {buildQuadTier,verifyQuadTierReport,inspectQuadTierAccess,
 createQuadTierModule,quadTierParts,TIERS,CROSSINGS} from '../source/ai/b179-quad-tier.mjs';
import {buildB179Preview} from './b179-build-preview.mjs';
test('7 independently source-valid modules: massive actual architectural expansion',()=>{
 const parent=buildConnectedSky(),v=buildQuadTier(),r=v.report;
 assert.equal(parent.compiled.primitives.length,87878);
 assert.equal(parent.report.totalElements,520);
 assert(validateDesign(v.design));assert(verifyCompiled(v.design,v.addon));
 assert.equal(v.design.elements.length,quadTierParts().length);
 assert(v.design.elements.length>=65&&v.design.elements.length<=160);
 assert(r.addedUniqueVoxels>=1400);
 assert(r.sourceOnlyAirCellsReserved>=50&&r.sourceOnlyAirCellsReserved<=180);
 assert.equal(r.voxels,87878+r.addedUniqueVoxels-r.sourceOnlyAirCellsReserved);
 assert(r.voxels<=MAX_CELLS);
 assert.notEqual(r.geometrySha256,r.previousGeometrySha256);
 assert.equal(verifyQuadTierReport(r),true);
});
test('all eight real 2x2 source-backed cross-corridors pass floor and head clearance',()=>{
 const s=buildQuadTier(),c=inspectQuadTierAccess(s.compiled);
 assert.equal(c.bridges.length,TIERS.length*CROSSINGS.length);
 assert.equal(c.passed,8);
 const cSet=new Set(s.compiled.primitives.map(p=>p.slice(0,3).join(',')));
 // Every 2x2 route footprint including the last X column, not merely
 // isolated centreline voxels, must carry support and clean headroom.
 for(const x of c.bridges)for(let n=x.x0;n<=x.xLast;n++)
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   assert(cSet.has([n+dx,x.deckY,29+dz].join(',')));
   assert(!cSet.has([n+dx,x.standingY,29+dz].join(',')));
   assert(!cSet.has([n+dx,x.standingY+1,29+dz].join(',')));
  }
 assert(c.bridges.every(x=>x.supported2x2&&x.violationsTotal===0));
 assert(c.bridges.every(x=>x.spanMoves>=15));
 assert.equal(c.isTrueMinecraftWalkingCertified,false);
 assert.equal(s.report.physicalMinecraftWalkingVerified,false);
});
test('frozen B178 public graph and geometric stair interfaces survive new design',()=>{
 const r=buildQuadTier();
 assert.equal(r.report.preexistingRoofPortals,3);
 assert.equal(r.report.inheritedStairInterfaces,17);
 const keys=new Set(r.compiled.primitives.map(x=>x.slice(0,3).join(',')));
 for(const [y,z,x0,x1] of [[14,7,10,112],[26,20,12,110],
 [60,3,12,112],[57,45,12,118],[75,2,12,112]])
  for(let x=x0;x<=x1+1;x++)for(let dz=0;dz<2;dz++){
   assert(keys.has([x,y-1,z+dz].join(',')));
   assert(!keys.has([x,y,z+dz].join(',')));
   assert(!keys.has([x,y+1,z+dz].join(',')));
  }
});
test('unapproved Minecraft writes and modified safety gates are rejected',()=>{
 const d=createQuadTierModule();d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
 d.elements[0].material='concrete';d.bounds.height=97;
 assert.throws(()=>validateDesign(d),/B143_BOUNDS/);
 const report=buildQuadTier().report;
 for(const m of [
  x=>x.worldContacts=1,x=>x.worldWrites=1,x=>x.worldCoordinates=[0,0,0],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[5]='PASS',x=>x.BuildPlan.operations.push({type:'setblock'}),
  x=>x.physicalMinecraftWalkingVerified=true]){
  const next=structuredClone(report);m(next);
  assert.equal(verifyQuadTierReport(next),false);
 }
});
test('standalone 3D viewer packages exactly seven independently authored modules',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b179-'));
 try{
  const m=buildB179Preview({dir}),v=buildQuadTier();
  assert.equal(m.real3dCells,v.report.voxels);
  assert.equal(m.moduleCount,7);
  assert.equal(m.addedUniqueVoxels,v.report.addedUniqueVoxels);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const mds=JSON.parse(fs.readFileSync(path.join(dir,'B179_DESIGN_MODULES.json')));
  assert.equal(mds.modules.length,7);
  assert.deepEqual(mds.modules.slice(0,6).map(x=>x.elements.length),[151,74,55,77,94,69]);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const name of ['overview','low','upper','ring'])
   assert(html.includes('id="b179-'+name+'"'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{force:true,recursive:true})}
});

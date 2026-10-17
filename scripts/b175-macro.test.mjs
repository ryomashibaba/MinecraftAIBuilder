import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildSkycanyon} from '../source/ai/b174-skycanyon.mjs';
import {buildStarRiver,verifyStarRiver,analyzeSteppedInterfaces,
 createStarRiverModule,starRiverParts} from '../source/ai/b175-star-river.mjs';
import {buildB175Preview} from './b175-build-preview.mjs';
test('third valid strict-B143 module adds materially new actual 3D spaces',()=>{
 const original=buildSkycanyon(),r=buildStarRiver(),p=r.report;
 assert.equal(original.compiled.primitives.length,60185);
 assert.equal(original.report.totalAuthoredElements,225);
 assert(validateDesign(r.design));assert(verifyCompiled(r.design,r.addon));
 assert.equal(r.design.elements.length,starRiverParts().length);
 assert(r.design.elements.length>=50&&r.design.elements.length<=160);
 assert.equal(p.inheritedAuthoredElements,225);
 const prev=new Set(original.compiled.primitives.map(a=>a.slice(0,3).join(',')));
 const now=new Set(r.compiled.primitives.map(a=>a.slice(0,3).join(',')));
 for(let z=46;z<=48;z++){
  assert(prev.has([72,39,z].join(',')),'old parent must contain obstructing voxel');
  assert(!now.has([72,39,z].join(',')),'new merged corridor must clear voxel');
 }
 for(let z=46;z<=47;z++)assert(now.has([73,39,z].join(',')));
 assert(p.addedUnique3dCells>=2000);
 assert.equal(p.removedDesignCells,3);
 assert.equal(p.real3dCells,p.parentVoxelCount+p.addedUnique3dCells-3);
 assert(p.real3dCells<=MAX_CELLS);
 assert.notEqual(p.geometrySha256,p.parentGeometrySha256);
 assert(verifyStarRiver(p));
});
test('14 adjacent 2x2 mixed-height step interfaces verified without physics certification',()=>{
 const r=buildStarRiver(),step=analyzeSteppedInterfaces(r.compiled);
 assert.equal(step.sourceStationCount,15);
 assert.equal(step.verifiedGeometricInterfaces,14);
 assert.equal(step.mixedHeightStepInterfaceCount,14);
 assert(step.edgesSha256.match(/^[0-9a-f]{64}$/));
 assert.equal(step.continuousMinecraftWalkingCertified,false);
 for(const edge of [0,7,13])assert.equal(step.verifiedGeometricInterfaces>edge,true);
 assert.equal(r.report.continuousMinecraftWalkingCertified,false);
 assert.equal(r.report.realStepCollisionCertified,false);
});
test('new long sky gallery has exact support/headroom and old lower+upper 2x2 proof survives',()=>{
 const {compiled,report}=buildStarRiver();
 const occupied=new Set(compiled.primitives.map(p=>p.slice(0,3).join(',')));
 for(const [y,z,start,end] of [[60,11,12,112],[14,7,10,112],[26,20,12,110]])
  for(let x=start;x<=end+1;x++)for(let dz=0;dz<2;dz++){
   assert(occupied.has([x,y-1,z+dz].join(',')));
   assert(!occupied.has([x,y,z+dz].join(',')));
   assert(!occupied.has([x,y+1,z+dz].join(',')));
  }
 assert.equal(report.horizontalSkyPromenadeSupported2x2Moves,100);
 assert.equal(report.inheritedLowerMoves,102);
 assert.equal(report.inheritedUpperMoves,98);
});
test('unsafe world claims, invalid local materials and excessive bounds fail closed',()=>{
 const badSource=createStarRiverModule();
 badSource.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(badSource),/B143_MATERIAL/);
 badSource.elements[0].material='concrete';badSource.bounds.width=129;
 assert.throws(()=>validateDesign(badSource),/B143_BOUNDS/);
 const original=buildStarRiver().report;
 for(const mutate of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.worldCoordinates=[1,2,3],
  x=>x.readiness='PREPARED',x=>x.gates[4]='PASS',
  x=>x.constructionApproved=true,x=>x.BuildPlan.operations.push({type:'fill'}),
  x=>x.continuousMinecraftWalkingCertified=true,
  x=>x.realStepCollisionCertified=true,x=>x.realFallSafetyCertified=true]){
  const bad=structuredClone(original);mutate(bad);
  assert.equal(verifyStarRiver(bad),false);
 }
});
test('source-pinned offline 3D HTML holds all 3 original authoring documents',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b175-'));
 try{
  const m=buildB175Preview({dir}),p=buildStarRiver().report;
  assert.equal(m.real3dCells,p.real3dCells);
  assert.equal(m.moduleCount,3);
  assert.equal(m.addedUnique3dCells,p.addedUnique3dCells);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const modules=JSON.parse(fs.readFileSync(path.join(dir,'B175_DESIGN_MODULES.json')));
  assert.equal(modules.modules.length,3);
  assert.equal(modules.modules[0].elements.length,151);
  assert.equal(modules.modules[1].elements.length,74);
  assert(modules.modules[2].elements.length>=50);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const suffix of ['overview','upper','low','ring'])
   assert(html.includes('id="b175-'+suffix+'"'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  assert(!html.includes('__B143_GALLERY_JSON__'));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

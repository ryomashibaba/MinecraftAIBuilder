import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {validateDesign,verifyCompiled,MAX_CELLS} from '../source/ai/b143-building-dsl.mjs';
import {buildNebulaArkB173} from '../source/ai/b173-nebula-ark.mjs';
import {createSkycanyonModule,skycanyonParts,ASCENT_STATIONS,buildSkycanyon,
 verifySkycanyon} from '../source/ai/b174-skycanyon.mjs';
import {buildB174Preview} from './b174-build-preview.mjs';
test('independent B143 module creates material new voxel architecture without old source changes',()=>{
 const old=buildNebulaArkB173(),r=buildSkycanyon(),p=r.report;
 assert.equal(old.compiled.primitives.length,50531);
 assert(validateDesign(r.design));assert(verifyCompiled(r.design,r.moduleCompiled));
 assert.equal(r.design.elements.length,skycanyonParts().length);
 assert(r.design.elements.length>=60&&r.design.elements.length<=160);
 assert.equal(p.originalElements,151);
 assert(p.addedUnique3dVoxels>=1000);
 assert(p.final3dVoxels>old.compiled.primitives.length);
 assert(p.final3dVoxels<=MAX_CELLS);
 assert.equal(p.moduleCount,2);
 assert.notEqual(p.combinedGeometrySha256,p.parentGeometrySha256);
 assert(verifySkycanyon(p));
});
test('15 distinct 2x2 supported rise stations and legacy flat corridors remain real voxel-free above floor',()=>{
 const r=buildSkycanyon(),p=r.report;
 const cells=new Set(r.compiled.primitives.map(a=>a.slice(0,3).join(',')));
 for(const {standing:[x,y,z]} of ASCENT_STATIONS)
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   assert(cells.has([x+dx,y-1,z+dz].join(',')));
   assert(!cells.has([x+dx,y,z+dz].join(',')));
   assert(!cells.has([x+dx,y+1,z+dz].join(',')));
  }
 assert.equal(p.ascentSupported2x2Stations,15);
 assert.equal(p.oldLowerFlat2x2Moves,102);
 assert.equal(p.oldUpperFlat2x2Moves,98);
 assert.equal(p.continuous2x2VerticalRouteCertified,false);
 assert.equal(p.finalPlayerWalkingCertified,false);
 assert.equal(p.stairCollisionCertified,false);
});
test('authoring budget, invalid materials and fabrication of real-world success fail closed',()=>{
 const d=createSkycanyonModule();
 const mutated=structuredClone(d);
 mutated.elements[0].material='minecraft:structure_block';
 assert.throws(()=>validateDesign(mutated),/B143_MATERIAL/);
 mutated.elements[0].material='metal';mutated.bounds.width=129;
 assert.throws(()=>validateDesign(mutated),/B143_BOUNDS/);
 const p=buildSkycanyon().report;
 for(const change of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({type:'fill'}),
  x=>x.continuous2x2VerticalRouteCertified=true,
  x=>x.finalPlayerWalkingCertified=true,x=>x.ascentSupported2x2Stations=0]){
  const bad=structuredClone(p);change(bad);
  assert.equal(verifySkycanyon(bad),false);
 }
});
test('independent city-volume viewer includes actual combined geometry and valid embedded JS',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b174-'));
 try{
  const m=buildB174Preview({dir}),r=buildSkycanyon();
  assert.equal(m.real3dCells,r.report.final3dVoxels);
  assert.equal(m.addedUnique3dVoxels,r.report.addedUnique3dVoxels);
  assert.equal(m.moduleCount,2);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const d=JSON.parse(fs.readFileSync(path.join(dir,'B174_DESIGN_MODULES.json')));
  assert.equal(d.modules.length,2);
  assert.equal(d.modules[0].elements.length,151);
  assert.equal(d.modules[1].elements.length,r.design.elements.length);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const s of ['overview','low','upper','ring'])
   assert(html.includes('id="b174-'+s+'"'));
  assert(!html.includes('__B143_GALLERY_JSON__'));
  assert(!html.includes('fetch('));
  assert(!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

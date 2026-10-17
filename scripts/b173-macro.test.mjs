import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {createNebulaArkDesign,buildNebulaArk} from '../source/ai/b172-nebula-ark.mjs';
import {createNebulaArkB173Design,atriumCascadeElements,buildNebulaArkB173,
 verifyNebulaArkB173} from '../source/ai/b173-nebula-ark.mjs';
import {buildB173Preview} from './b173-build-preview.mjs';

test('54 new genuine volumetric features and 3D carving preserve B172 original',()=>{
 const old=buildNebulaArk(),next=buildNebulaArkB173(),r=next.report;
 assert.equal(old.report.totalVoxels,47854);
 assert.equal(createNebulaArkDesign().elements.length,97);
 assert.equal(atriumCascadeElements().length,54);
 assert.equal(next.design.elements.length,151);
 assert.equal(new Set(next.design.elements.map(e=>e.id)).size,151);
 assert(validateDesign(next.design));
 assert(verifyCompiled(next.design,next.compiled));
 assert(r.addedCellCoordinates>=150);
 assert(r.removedCellCoordinates>=50);
 assert(r.final3dVoxels>0);
 assert.notEqual(r.geometrySha256,old.report.geometrySha256);
 assert.equal(r.final3dVoxels-r.original3dVoxels,r.netVoxelDifference);
 assert.equal(verifyNebulaArkB173(r),true);
});
test('2x2 old routes survive, but stepped shapes explicitly not Minecraft-certifiable',()=>{
 const {compiled,report}=buildNebulaArkB173();
 const cells=new Set(compiled.primitives.map(p=>p.slice(0,3).join(',')));
 for(const [y,z,a,b] of [[14,7,10,112],[26,20,12,110]]){
  for(let x=a;x<=b+1;x++)for(let dz=0;dz<2;dz++){
   assert(cells.has([x,y-1,z+dz].join(',')));
   assert(!cells.has([x,y,z+dz].join(',')));
   assert(!cells.has([x,y+1,z+dz].join(',')));
  }
 }
 assert.equal(report.conceptualSteppedAscentTreads,24);
 assert.equal(report.actualStairMovementCertified,false);
 assert.equal(report.actualInterfloorRouteCertified,false);
 assert.equal(report.realMinecraftWalkingCertified,false);
 assert.equal(report.worldContacts,0);
 assert.equal(report.worldWrites,0);
 assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(report.BuildPlan.operations,[]);
});
test('unsafe construction reports and over-budget modifications fail closed',()=>{
 const design=createNebulaArkB173Design();
 design.elements.push({...design.elements[0],id:'illegal-shape',material:'command_block'});
 assert.throws(()=>validateDesign(design),/B143_MATERIAL/);
 const x=buildNebulaArkB173().report;
 for(const edit of [
  x=>x.worldWrites=1,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations=[{cmd:'fill'}],
  x=>x.actualInterfloorRouteCertified=true]){
  const bad=structuredClone(x);edit(bad);
  assert.equal(verifyNebulaArkB173(bad),false);
 }
});
test('standalone 3D viewer embeds true design and valid interactive JavaScript',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nebula-b173-'));
 try{
  const m=buildB173Preview({dir}), r=buildNebulaArkB173();
  assert.equal(m.real3dCells,r.report.final3dVoxels);
  assert.equal(m.authoredElements,151);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.BuildPlan.operations,[]);
  const d=JSON.parse(fs.readFileSync(path.join(dir,'B173_DESIGN_SOURCE.json')));
  assert.equal(d.elements.length,151);
  assert.equal(d.id,'nebula-ark-atrium-cascade');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const suffix of ['overview','low','upper','ring'])
   assert(html.includes('id="b173-'+suffix+'"'));
  assert(!html.includes('__B143_GALLERY_JSON__'));
  assert(!html.includes('fetch('));
  assert(!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);
  assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

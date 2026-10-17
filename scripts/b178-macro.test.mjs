import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildTripleAtrium} from '../source/ai/b177-triple-atrium.mjs';
import {buildConnectedSky,verifyConnectedSkyReport,createConnectedSkyModule,
 connectedSkyElements,inspectPublicConcourse} from '../source/ai/b178-connected-sky.mjs';
import {buildB178Preview} from './b178-build-preview.mjs';
test('independent sixth strict B143 module adds substantial real volumetric architecture',()=>{
 const base=buildTripleAtrium(),r=buildConnectedSky(),p=r.report;
 assert.equal(base.compiled.primitives.length,83531);
 assert.equal(base.report.totalElements,451);
 assert(validateDesign(r.design));assert(verifyCompiled(r.design,r.addon));
 assert.equal(connectedSkyElements().length,r.design.elements.length);
 assert(r.design.elements.length>=65&&r.design.elements.length<=160);
 assert(p.newlyOccupiedVoxels>=1500);
 assert.equal(p.sourceOnlyGatewayCarvedCells,6);
 assert.equal(p.total3dVoxels,83531+p.newlyOccupiedVoxels-6);
 assert(p.total3dVoxels<=MAX_CELLS);
 assert.notEqual(p.geometrySha256,p.parentGeometrySha256);
 assert(verifyConnectedSkyReport(p));
});
test('all 3 landmark entrances connected through same-floor real supported 2x2 graph',()=>{
 const r=buildConnectedSky(),a=inspectPublicConcourse(r.compiled);
 assert.equal(a.connectedSkyPortals,3);
 assert.equal(a.transverseMoves,100);
 const old=new Set(buildTripleAtrium().compiled.primitives.map(p=>p.slice(0,3).join(',')));
 const now=new Set(r.compiled.primitives.map(p=>p.slice(0,3).join(',')));
 for(let x=12;x<=14;x++)for(let y=75;y<=76;y++){
  const v=[x,y,7].join(',');
  assert(old.has(v),'original glass rail must be retained in frozen parent');
  assert(!now.has(v),'gateway portal must be actually open in new model');
 }
 assert(a.reachable2WideNodes>=150);
 assert.deepEqual(a.portalIds,['north','core','south']);
 assert.equal(a.physicalWalkingCertified,false);
 assert.equal(r.report.realPlayerMovementCertified,false);
});
test('five inherited public routes and new transverse route have actual floor support+2-headroom',()=>{
 const {compiled,report}=buildConnectedSky();
 const cells=new Set(compiled.primitives.map(x=>x.slice(0,3).join(',')));
 for(const [y,z,a,b] of [[14,7,10,112],[26,20,12,110],
 [60,3,12,112],[57,45,12,118],[75,2,12,112],[75,9,12,112]]){
  for(let x=a;x<=b+1;x++)for(let dz=0;dz<2;dz++){
   assert(cells.has([x,y-1,z+dz].join(',')));
   assert(!cells.has([x,y,z+dz].join(',')));
   assert(!cells.has([x,y+1,z+dz].join(',')));
  }
 }
 assert.deepEqual(report.old2WideMoves,[102,98,100,106,100]);
 assert.equal(report.inheritedAtriumVoids,true);
});
test('rejects fabricated live-world approval, invalid material, excessive bounds',()=>{
 const bad=createConnectedSkyModule();
 bad.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(bad),/B143_MATERIAL/);
 bad.elements[0].material='concrete';bad.bounds.height=97;
 assert.throws(()=>validateDesign(bad),/B143_BOUNDS/);
 const p=buildConnectedSky().report;
 for(const m of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.worldCoordinates=[0,0,0],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'fill'}),
  x=>x.realPlayerMovementCertified=true,x=>x.actualCollisionCertified=true]){
  const q=structuredClone(p);m(q);
  assert.equal(verifyConnectedSkyReport(q),false);
 }
});
test('real offline 3D preview includes six exact B143 authored source documents',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b178-'));
 try{
  const m=buildB178Preview({dir}),r=buildConnectedSky();
  assert.equal(m.real3dCells,r.report.total3dVoxels);
  assert.equal(m.moduleCount,6);
  assert.equal(m.newlyOccupiedVoxels,r.report.newlyOccupiedVoxels);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const d=JSON.parse(fs.readFileSync(path.join(dir,'B178_DESIGN_MODULES.json')));
  assert.equal(d.modules.length,6);
  assert.deepEqual(d.modules.slice(0,5).map(x=>x.elements.length),[151,74,55,77,94]);
  assert(d.modules[5].elements.length>=65);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const p of ['overview','low','upper','ring'])
   assert(html.includes('id="b178-'+p+'"'));
  assert(!html.includes('__B143_GALLERY_JSON__'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

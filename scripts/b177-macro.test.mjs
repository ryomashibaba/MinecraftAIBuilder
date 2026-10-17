import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
import {buildAuroraCathedral} from '../source/ai/b176-aurora-cathedral.mjs';
import {buildTripleAtrium,verifyTripleAtriumReport,
 createTripleAtriumModule,atriumSpineElements,auditTripleAtrium}
 from '../source/ai/b177-triple-atrium.mjs';
import {buildB177Preview} from './b177-build-preview.mjs';

test('real fifth independently validated B143 3D architectural module adds significant genuine voxel volume',()=>{
 const old=buildAuroraCathedral(),r=buildTripleAtrium(),p=r.report;
 assert.equal(old.compiled.primitives.length,77677);
 assert.equal(old.report.totalElements,357);
 assert(validateDesign(r.design));assert(verifyCompiled(r.design,r.addon));
 assert.equal(r.design.elements.length,atriumSpineElements().length);
 assert(r.design.elements.length>=75&&r.design.elements.length<=160);
 assert.equal(p.independentlyValidatedModules,5);
 assert(p.newlyOccupied3dVoxels>=2000);
 assert.equal(p.final3dVoxels,77677+p.newlyOccupied3dVoxels);
 assert(p.final3dVoxels<=MAX_CELLS);
 assert.notEqual(p.geometrySha256,p.parentGeometrySha256);
 assert(verifyTripleAtriumReport(p));
});
test('protected 4 inherited corridors and new 100 move full 2x2 roof gallery truly clear',()=>{
 const {compiled,report}=buildTripleAtrium();
 const occ=new Set(compiled.primitives.map(a=>a.slice(0,3).join(',')));
 const corridors=[[14,7,10,112],[26,20,12,110],
 [60,3,12,112],[57,45,12,118],[75,2,12,112]];
 for(const [y,z,a,b] of corridors)
  for(let x=a;x<=b+1;x++)for(let dz=0;dz<2;dz++){
   assert(occ.has([x,y-1,z+dz].join(',')));
   for(let dy=0;dy<2;dy++)
    assert(!occ.has([x,y+dy,z+dz].join(',')));
  }
 assert.deepEqual(report.original2WideMoves,[102,98,100,106]);
 assert.equal(report.newUpper2WideMoves,100);
});
test('3 giant multi-storey atriums keep measurable hollow internal public-air volumes',()=>{
 const r=buildTripleAtrium(),a=auditTripleAtrium(r.compiled);
 assert.deepEqual(a.galleryLevels,[60,64,68,72]);
 assert.equal(a.atriumHollowMetrics.length,3);
 assert(a.atriumHollowMetrics.every(x=>x.airCells>=100));
 assert.equal(a.realMinecraftCollisionCertified,false);
 assert.equal(a.actualPlayerWalkingCertified,false);
 assert.equal(r.report.inheritedNewStairSeams,17);
});
test('invalid source and invented live-world credentials fail safely',()=>{
 const bad=createTripleAtriumModule();
 bad.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(bad),/B143_MATERIAL/);
 bad.elements[0].material='concrete';bad.bounds.height=97;
 assert.throws(()=>validateDesign(bad),/B143_BOUNDS/);
 const p=buildTripleAtrium().report;
 for(const action of [
  q=>q.worldWrites=1,q=>q.worldContacts=1,q=>q.worldCoordinates=[0,0,0],
  q=>q.readiness='PREPARED',q=>q.constructionApproved=true,
  q=>q.gates[0]='PASS',q=>q.BuildPlan.operations.push({cmd:'setblock'}),
  q=>q.realPlayerWalkingCertified=true,
  q=>q.realInterfloorTraversalCertified=true,
  q=>q.realMinecraftCollisionCertified=true]){
  const v=structuredClone(p);action(v);
  assert.equal(verifyTripleAtriumReport(v),false);
 }
});
test('standalone 3D HTML ships actual five independent authoring documents, safe source hashes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b177-'));
 try{
  const m=buildB177Preview({dir}),r=buildTripleAtrium();
  assert.equal(m.real3dCells,r.report.final3dVoxels);
  assert.equal(m.moduleCount,5);
  assert.equal(m.newlyOccupied3dVoxels,r.report.newlyOccupied3dVoxels);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const data=JSON.parse(fs.readFileSync(path.join(dir,'B177_DESIGN_MODULES.json')));
  assert.equal(data.modules.length,5);
  assert.deepEqual(data.modules.map(x=>x.elements.length).slice(0,4),[151,74,55,77]);
  assert(data.modules[4].elements.length>=75);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const preset of ['overview','low','upper','ring'])
   assert(html.includes('id="b177-'+preset+'"'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  assert(!html.includes('__B143_GALLERY_JSON__'));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

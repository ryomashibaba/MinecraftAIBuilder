import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildCivicGates} from '../source/ai/b188-civic-gates.mjs';
import {createAnnexDesign,buildAnnex,buildB189,auditAnnexFloors,
 auditMultimodelManifest,verifyB189Report,ANNEX_PUBLIC_LEVELS} from '../source/ai/b189-skyport-annex.mjs';
import {buildB189Preview} from './b189-build-preview.mjs';
test('actual NEW independent 48x78x50 skyport design is strict B143, not a copied original district',()=>{
 const a=buildAnnex(),b=createAnnexDesign();
 assert(validateDesign(a.design));assert(verifyCompiled(a.design,a.compiled));
 assert.equal(a.design.elements.length,b.elements.length);
 assert(a.design.elements.length>=90&&a.design.elements.length<=160);
 assert(a.compiled.primitives.length>=7000&&a.compiled.primitives.length<MAX_CELLS);
 assert.deepEqual(a.design.bounds,{width:48,height:78,depth:50});
 assert(a.compiled.primitives.every(x=>x[0]>=0&&x[0]<48&&x[1]>=0&&x[1]<78&&x[2]>=0&&x[2]<50));
 assert.equal(a.compiled.worldContacts,0);
 assert.equal(a.compiled.BuildPlan.operations.length,0);
});
test('source-defined five elevated independent ANNEX skyway routes have 2wide floor and 2 block head',()=>{
 const a=buildAnnex(),r=auditAnnexFloors(a.compiled);
 assert.equal(r.verifiedFloors.length,5);
 assert.deepEqual(ANNEX_PUBLIC_LEVELS,[57,61,65,69,73]);
 assert.equal(r.source2WideRouteMoves,190);
 assert(r.verifiedFloors.every(x=>x.connectedThreeHalls===3&&x.sourceHeadroomClear));
 const cells=new Set(a.compiled.primitives.map(p=>p.slice(0,3).join(',')));
 for(const y of ANNEX_PUBLIC_LEVELS)
  for(let x=4;x<=42;x++)for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   const z=31+dz;assert(cells.has([x+dx,y-1,z].join(',')));
   assert(!cells.has([x+dx,y,z].join(',')));
   assert(!cells.has([x+dx,y+1,z].join(',')));
  }
 assert.equal(r.interFloorPhysicalMotionCertified,false);
});
test('parent untouched, independent two-model source provenance plus 3 exact separate district viewport scenes',()=>{
 const r=buildB189(),original=buildCivicGates();
 assert.equal(r.parent.compiled.geometrySha256,original.compiled.geometrySha256);
 assert.equal(r.parent.compiled.primitives.length,142773);
 assert.equal(r.segmentation.districts.reduce((n,v)=>n+v.realCells,0),142773);
 assert.equal(r.manifest.sourceModelCount,2);
 assert.equal(r.manifest.viewerSceneCount,5);
 assert.equal(r.manifest.scenes.length,5);
 assert.equal(r.manifest.parentDistrictCount,3);
 assert.deepEqual(r.manifest.scenes.map(x=>x.id),['main','north','central','south','annex']);
 assert.equal(r.manifest.mainModelCells,142773);
 assert.equal(r.manifest.annexModelCells,r.annex.compiled.primitives.length);
 assert.equal(r.manifest.sourceMainsExactReassembly,true);
 assert.equal(r.manifest.preservedDistrictBoundaryPaths,12);
 assert.equal(r.report.preservedMainWaypoints,21);
 assert.equal(r.report.preservedMainTopologyEdges,30);
 assert.equal(r.report.monolithicCellLimitPerModel,MAX_CELLS);
 assert.equal(r.report.combinedMonolithicLimitNotRaised,true);
 assert.equal(r.report.noCrossModelConnectivityAssertion,true);
 assert(verifyB189Report(r.report));
});
test('no unauthorized real Minecraft construction, inter-model link assertion or strict invalid DSL',()=>{
 const d=createAnnexDesign();d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
 d.elements[0].material='stone';d.bounds.width=140;
 assert.throws(()=>validateDesign(d),/B143_BOUNDS/);
 const r=buildB189().report;
 for(const change of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,
  x=>x.worldCoordinates=[0,0,0],x=>x.constructionApproved=true,
  x=>x.readiness='PREPARED',x=>x.gates[0]='PASS',
  x=>x.BuildPlan.operations.push({cmd:'setblock'}),
  x=>x.actualMinecraftAnnexPlacementCertified=true,
  x=>x.actualMinecraftWalkingCertified=true,
  x=>x.noCrossModelConnectivityAssertion=false]){
  const fake=structuredClone(r);change(fake);
  assert.equal(verifyB189Report(fake),false);
 }
});
test('offline five-scene renderer exports all 17 distinct DSL documents and two real authored models',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b189-'));
 try{
  const v=buildB189Preview({dir}),r=buildB189();
  assert.equal(v.real3dCells,142773);
  assert.equal(v.annexReal3dCells,r.annex.compiled.primitives.length);
  assert.equal(v.viewerSceneCount,5);
  assert.equal(v.numberOfActualNew3dScenes,2);
  assert.equal(v.newConceptModelTotalOutsideHistoric36,38);
  assert.equal(v.moduleCount,17);
  assert.equal(v.mainModelCapUnchanged,MAX_CELLS);
  assert.equal(v.annexConnectedToMain,false);
  assert.equal(v.worldWrites,0);assert.equal(v.constructionApproved,false);
  assert.equal(v.readiness,'NOT_PREPARED');
  assert.deepEqual(v.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(v.BuildPlan.operations,[]);
  const docs=JSON.parse(fs.readFileSync(path.join(dir,'B189_DESIGN_MODULES.json')));
  assert.equal(docs.modules.length,17);
  assert.deepEqual(docs.modules.slice(0,16).map(d=>d.elements.length),
   [151,74,55,77,94,69,70,109,127,133,97,107,101,91,95,93]);
  assert.equal(docs.modules[16].id,'horizon-dock-annex');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const mode of ['overview','low','upper','ring'])
   assert(html.includes('id="b189-'+mode+'"'));
  assert(html.includes('HORIZON DOCK'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script);assert.doesNotThrow(()=>new vm.Script(script));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

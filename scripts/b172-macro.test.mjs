import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {validateDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
import {
 createNebulaArkDesign,nebulaArkElements,buildNebulaArk,verifyNebulaArk
} from '../source/ai/b172-nebula-ark.mjs';
import {buildB172Preview} from './b172-build-preview.mjs';

const has=(cells,x,y,z)=>cells.has(x+','+y+','+z);
test('real authored triple-vault macro-city: strict DSL, 97 elements and NEW voxels',()=>{
 const d=createNebulaArkDesign();
 const frozen=JSON.stringify(d),r=buildNebulaArk(),p=r.report;
 assert.equal(JSON.stringify(d),frozen);
 assert(validateDesign(d));
 assert(verifyCompiled(d,r.compiled));
 assert.equal(d.id,'nebula-ark-grand-terminal');
 assert.equal(d.elements.length,97);
 assert.equal(nebulaArkElements().length,97);
 assert.equal(new Set(d.elements.map(e=>e.id)).size,97);
 assert.equal(p.totalVoxels,47854);
 assert.equal(r.compiled.bounds.maxY,75);
 assert(r.compiled.bounds.maxX>=115);
 assert(p.materials.glass>1000);
 assert(p.materials.metal>1000);
 assert.equal(p.majorArchitecture.monumentalDomeCount,3);
 assert.equal(p.majorArchitecture.orbitalRings,2);
 assert.equal(p.majorArchitecture.verticalMainTower,1);
 assert.equal(p.geometrySha256,r.compiled.geometrySha256);
 // New model must not be a rebranded copy of B166.
 assert.notEqual(p.geometrySha256,
  '024048b90cac904299cfad474359da0ab2cefda0744723bc73d3f4a0bc3aad22');
 assert(verifyNebulaArk(p));
});

test('actual one-block-supported 2x2 full-body flat routes at lower and upper level',()=>{
 const r=buildNebulaArk(),p=r.report,
  occupied=new Set(r.compiled.primitives.map(x=>x.slice(0,3).join(',')));
 const paths=[
  {from:[10,14,7],to:[112,14,7],steps:102},
  {from:[12,26,20],to:[110,26,20],steps:98}
 ];
 for(const {from,to,steps} of paths){
  for(let x=from[0];x<=to[0];x++)for(let dx=0;dx<2;dx++)
   for(let dz=0;dz<2;dz++){
    assert(has(occupied,x+dx,from[1]-1,from[2]+dz),
     'missing physical support floor at x='+x+' y='+from[1]);
    assert(!has(occupied,x+dx,from[1],from[2]+dz));
    assert(!has(occupied,x+dx,from[1]+1,from[2]+dz));
   }
  assert.equal(to[0]-from[0],steps);
 }
 assert.equal(p.routeLower.flatMoves,102);
 assert.equal(p.routeUpper.flatMoves,98);
 assert.equal(p.routeUpper.body.join('x'),'2x2');
 assert.equal(p.routeLower.headroom,2);
 assert.match(p.independentlyConfirmedUpperSha256,/^[0-9a-f]{64}$/);
 assert.equal(p.lowerToUpperStairsCertified,false);
 assert.equal(p.physicalMinecraftMovementCertified,false);
 assert.equal(p.structuralLoadCertified,false);
 assert.equal(p.constructionApproved,false);
 assert.equal(p.worldContacts,0);
 assert.deepEqual(p.BuildPlan.operations,[]);
 assert(p.gates.length===9&&p.gates.every(x=>x==='BLOCKED'));
});

test('source edits, added illegal materials and future construction instructions fail closed',()=>{
 const d=createNebulaArkDesign();
 const invalid=structuredClone(d);
 invalid.elements[0].material='minecraft:diamond_block';
 assert.throws(()=>validateDesign(invalid),/B143_MATERIAL/);
 const overflow=structuredClone(d);
 overflow.bounds={width:128,height:90,depth:60};
 assert.throws(()=>validateDesign(overflow),/B143_BOUNDS/);
 const r=buildNebulaArk().report;
 const forged=structuredClone(r);
 forged.worldWrites=1;
 assert.equal(verifyNebulaArk(forged),false);
 forged.worldWrites=0;
 forged.BuildPlan.operations.push({type:'setblock'});
 assert.equal(verifyNebulaArk(forged),false);
 forged.BuildPlan.operations=[];
 forged.physicalMinecraftMovementCertified=true;
 assert.equal(verifyNebulaArk(forged),false);
});

test('offline 3D renderer contains true new city cells, camera presets, and parseable static JavaScript',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nebula-b172-'));
 try{
  const m=buildB172Preview({dir});
  assert.equal(m.real3dCells,47854);
  assert(m.surfaceCells>10000);
  assert.equal(m.authoredElements,97);
  assert.equal(m.numberOfActualNew3dScenes,1);
  assert.equal(m.worldWrites,0);
  assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert(m.gates.every(x=>x==='BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const src=JSON.parse(fs.readFileSync(path.join(dir,'B172_DESIGN_SOURCE.json')));
  assert.equal(src.id,'nebula-ark-grand-terminal');
  assert.equal(src.elements.length,97);
  assert.equal(src.designOnly,true);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  assert(html.includes('NEBULA ARK'));
  assert(html.includes('id="b172-overview"'));
  assert(html.includes('id="b172-low"'));
  assert(html.includes('id="b172-upper"'));
  assert(html.includes('id="b172-ring"'));
  assert(html.includes('minecraftaibuilder-b143-gallery-v1'));
  assert(!html.includes('__B143_GALLERY_JSON__'));
  assert(!html.includes('fetch('));
  assert(!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js,'Embedded standalone 3D script is missing');
  assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

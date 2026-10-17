import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildAtriumArrivals} from '../source/ai/b180-atrium-arrivals.mjs';
import {TIERS} from '../source/ai/b179-quad-tier.mjs';
import {buildOculusAtrium,createOculusModule,oculusElements,
 auditOculusConnections,TURNOUT,verifyOculusReport} from '../source/ai/b181-oculus-atrium.mjs';
import {buildB181Preview} from './b181-build-preview.mjs';
test('9-source architecture: new genuine authored 3D expansion without changed limits',()=>{
 const old=buildAtriumArrivals(),r=buildOculusAtrium(),p=r.report;
 assert.equal(old.compiled.primitives.length,94083);
 assert.equal(old.report.totalParts,699);
 assert(validateDesign(r.design));
 assert(verifyCompiled(r.design,r.addon));
 assert.equal(r.design.elements.length,oculusElements().length);
 assert(r.design.elements.length>=120&&r.design.elements.length<=160);
 assert(p.newlyOccupiedCells>=2000);
 assert.equal(p.final3dCells,94083+p.newlyOccupiedCells-p.offlineClearanceCells);
 assert(p.final3dCells<=MAX_CELLS);
 assert.notEqual(p.geometrySha256,p.parentGeometrySha256);
 assert(verifyOculusReport(p));
});
test('12 2-wide independent hall entrance turns, 24 lateral side viewing arms',()=>{
 const r=buildOculusAtrium(),o=auditOculusConnections(r.compiled);
 assert.equal(o.verifiedSourceTurnouts,12);
 assert.equal(o.verifiedLateralViewpointArms,24);
 assert(o.levels.every(x=>x.halls.length===3));
 assert(o.levels.flatMap(x=>x.halls).every(x=>x.reachableNodes>=14));
 assert(o.hallOpenVolumeSamples.every(x=>x.air>=60));
 assert.equal(o.realMinecraftWalkingCertified,false);
});
test('all actual floor cells and two-high body clearance for every inner turn and wing',()=>{
 const r=buildOculusAtrium(),occ=new Set(r.compiled.primitives.map(p=>p.slice(0,3).join(',')));
 for(const deck of TIERS)for(const cx of [24,62,101]){
  for(let z=29;z<=TURNOUT.endZ;z++)for(let dx=0;dx<2;dx++)
   for(let dz=0;dz<2;dz++){
    const x=cx+dx,zz=z+dz;
    assert(occ.has([x,deck,zz].join(',')));
    assert(!occ.has([x,deck+1,zz].join(',')));
    assert(!occ.has([x,deck+2,zz].join(',')));
   }
  for(let x=cx-4;x<=cx+3;x++)for(let dx=0;dx<2;dx++)
   for(let dz=0;dz<2;dz++){
    assert(occ.has([x+dx,deck,TURNOUT.overlookZ+dz].join(',')));
    assert(!occ.has([x+dx,deck+1,TURNOUT.overlookZ+dz].join(',')));
    assert(!occ.has([x+dx,deck+2,TURNOUT.overlookZ+dz].join(',')));
   }
 }
 assert.equal(r.report.inheritedEightBridges,8);
 assert.equal(r.report.inheritedFourLongHallFloors,4);
 assert.equal(r.report.inheritedThreeSkyPortals,3);
});
test('reject unsafe world permissions, fake live physical certification, bad DSL',()=>{
 const d=createOculusModule();
 d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
 d.elements[0].material='concrete';d.bounds.height=97;
 assert.throws(()=>validateDesign(d),/B143_BOUNDS/);
 const r=buildOculusAtrium().report;
 for(const action of [
  x=>x.worldContacts=1,x=>x.worldWrites=1,x=>x.worldCoordinates=[1,2,3],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'setblock'}),
  x=>x.minecraftPlayerWalkingCertified=true,
  x=>x.realInterfloorTravelCertified=true]){
  const fake=structuredClone(r);action(fake);
  assert.equal(verifyOculusReport(fake),false);
 }
});
test('safe deterministic offline 3D evidence exports all exact nine source modules',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b181-'));
 try{
  const m=buildB181Preview({dir}),r=buildOculusAtrium();
  assert.equal(m.real3dCells,r.report.final3dCells);
  assert.equal(m.moduleCount,9);
  assert.equal(m.newlyOccupiedCells,r.report.newlyOccupiedCells);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const js=JSON.parse(fs.readFileSync(path.join(dir,'B181_DESIGN_MODULES.json')));
  assert.equal(js.modules.length,9);
  assert.deepEqual(js.modules.slice(0,8).map(x=>x.elements.length),
   [151,74,55,77,94,69,70,109]);
  assert(js.modules[8].elements.length>=120);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const id of ['overview','low','upper','ring'])
   assert(html.includes('id="b181-'+id+'"'));
  assert(html.includes(r.report.totalElements+'個'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script);assert.doesNotThrow(()=>new vm.Script(script));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

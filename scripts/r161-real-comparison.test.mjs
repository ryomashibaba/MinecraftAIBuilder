import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR161,saveR161,PLAN,EQUIPMENT} from './r161-real-comparison.mjs';
test('R161 independently compiles 3 actual B143 options and truthfully calls their upper mass identical',()=>{
 const {report:e,results}=buildR161();
 assert.equal(e.status,'SOURCE_VARIANTS_VALID_ART_HOLD');
 assert.equal(e.newLLMCalls,0);
 assert.equal(e.realGeometryDistinct,3);
 assert.equal(e.upperMassIdentical,true);
 assert.equal(e.finding,'FLOORPLAN_CHANGED_EXTERIOR_HIGH_MASS_UNCHANGED');
 assert.equal(e.automaticArtWinner,'NONE');
 assert.equal(e.humanArtReview,'ART_HOLD');
 assert.equal(e.readiness,'NOT_PREPARED');
 assert.deepEqual(e.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(e.BuildPlan.operations,[]);
 assert.equal(e.worldWrites,0);
 assert.deepEqual(e.candidates.map(x=>x.id),['central','west','east']);
 for(const r of results){
  assert.equal(r.evidence.rooms.length,3);
  assert.ok(r.evidence.rooms.every(x=>x.clearSupportedTwoWide>0&&x.reachableTwoWide>0));
  assert.ok(r.evidence.service.every(x=>x.reachable));
  assert.equal(r.evidence.equipmentCount,3);
  assert.equal(r.evidence.sourceRouteStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(r.evidence.blocked,true);
  assert.deepEqual(r.featured.placements.map(p=>p.role),EQUIPMENT.map(x=>x.role));
  assert.deepEqual(r.graph.plan.footprint,PLAN.footprint);
 }
});
test('R161 produces six real interactive B143 viewers and exact voxel-slice SVG for human review',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r161-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const dir=path.join(temp,'evidence');
 const {report,files}=saveR161(dir);
 assert.equal(files.length,17);
 for(const id of ['central','west','east']){
  for(const ext of ['-furnished.html','-empty.html','-section.svg','-B143.json','-VOXELS.json'])
   assert.ok(files.includes(id+ext));
  assert.match(fs.readFileSync(path.join(dir,id+'-section.svg'),'utf8'),/Actual B143 horizontal voxel slice/);
  assert.ok(JSON.parse(fs.readFileSync(path.join(dir,id+'-VOXELS.json'))).primitives.length>1000);
 }
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 assert.match(html,/ART HOLD/);
 assert.match(html,/外観の改善は証明されない/);
 assert.match(html,/central-furnished.html/);
 assert.match(html,/west-furnished.html/);
 assert.match(html,/east-furnished.html/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'R161_AUDIT.json'))).status,report.status);
 assert.throws(()=>saveR161(dir),/R161_NO_OVERWRITE/);
});

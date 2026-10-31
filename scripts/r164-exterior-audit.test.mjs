import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {buildR163Review} from './r163-daylight-comparison.mjs';
import {auditR164EnclosedHighRooms} from '../source/ai/r164-envelope-continuity.mjs';
import {buildR164Review,saveR164Review,renderR164Elevation}
 from './r164-exterior-audit.mjs';
const broken=(src,origin,size)=>{
 const out=structuredClone(src);
 out.design.elements.push({id:'r164-adversarial-cut',shape:'box',
  mode:'cut',origin,size});
 out.compiled=compileDesign(out.design);
 out.sourceSha256=out.compiled.sourceSha256;
 out.geometrySha256=out.compiled.geometrySha256;
 return out;
};
test('R164 independently verifies 3 complete upper room shells and no high-air outdoor leaks in each actual R163 topology',()=>{
 const {report,cases}=buildR164Review();
 assert.equal(report.status,'REAL_B143_UPPER_ROOM_ENVELOPE_AUDIT_ART_HOLD');
 assert.deepEqual(cases.map(x=>x.id),['central','west','east']);
 assert.equal(report.newModelCalls,0);
 assert.equal(report.readiness,'NOT_PREPARED');
 assert.equal(report.constructionApproved,false);
 assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(report.BuildPlan.operations,[]);
 assert.equal(report.worldWrites,0);
 assert.equal(report.humanArtReview,'ART_HOLD');
 for(const scene of cases){
  const p=scene.proof;
  assert.equal(p.allThreeRoomUpperEnvelopesSourceClosed,true);
  assert.equal(p.independentlyEnumeratedAllPerimeterCells,true);
  assert.equal(p.independentlyFloodedHighInteriorAir,true);
  assert.equal(p.realHighRooms.length,3);
  assert.ok(p.checkedRoofVoxelCells>100);
  assert.ok(p.checkedWallVoxelCells>25);
  assert.equal(p.checkedGlassVoxelCells,15);
  assert.ok(p.realHighRooms.every(x=>
   x.checkedFullRoofCells>35&&x.clearHighInteriorVoxels>35&&
   x.connectedAirCellsVisited>30&&!x.reachedExteriorThroughUpperEnvelope));
  assert.equal(p.worldContacts,0);
  assert.equal(p.worldWrites,0);
  assert.equal(p.realWeatherTightness,'NOT_TESTED');
 }
});
test('R164 fails closed when an adversarial valid B143 CUT makes an upper wall or roof leak',()=>{
 const base=buildR163Review().candidates[0].after;
 const one=base.r162RoomSectionEvidence.upperRoomSections[0];
 const [x0,x1]=one.sourceRange.x,[z0,z1]=one.sourceRange.z;
 const wall=broken(base,[x0-1,6,Math.floor((z0+z1)/2)],[1,1,1]);
 assert.throws(()=>auditR164EnclosedHighRooms(wall),
  /R164_ENVELOPE_UPPER_PERIMETER_HOLE/);
 const roof=broken(base,[Math.floor((x0+x1)/2),one.roofY,Math.floor((z0+z1)/2)],[1,1,1]);
 assert.throws(()=>auditR164EnclosedHighRooms(roof),
  /R164_ENVELOPE_FULL_ROOF_PERIMETER_COVER_NOT_REAL/);
});
test('R164 produces real four elevations and roof projection per variant, and immutable HTML evidence',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r164-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const out=path.join(temp,'review');
 const {report,files}=saveR164Review(out);
 assert.equal(files.length,26);
 for(const id of ['central','west','east']){
  for(const suffix of ['-real-3d.html','-B143.json','-VOXELS.json',
   '-front.svg','-rear.svg','-west.svg','-east.svg','-roof.svg'])
   assert.ok(files.includes(id+suffix),id+suffix);
  for(const side of ['front','rear','west','east','roof']){
   const svg=fs.readFileSync(path.join(out,id+'-'+side+'.svg'),'utf8');
   assert.match(svg,/<svg/);
   assert.match(svg,/B143 actual/);
   assert.match(svg,/<rect/);
  }
  assert.ok(JSON.parse(fs.readFileSync(path.join(out,id+'-VOXELS.json'))).primitives.length>1000);
 }
 const scene=buildR163Review().candidates[0].after;
 assert.notEqual(renderR164Elevation(scene.compiled,scene.design,'front'),
  renderR164Elevation(scene.compiled,scene.design,'west'));
 assert.throws(()=>renderR164Elevation(scene.compiled,scene.design,'unknown'),
  /R164_REPORT_INVALID_ELEVATION_DIRECTION/);
 const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
 assert.match(html,/ART HOLD/);
 assert.match(html,/central-roof.svg/);
 assert.match(html,/west-front.svg/);
 assert.match(html,/east-rear.svg/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(out,'R164_AUDIT.json'))).status,report.status);
 assert.throws(()=>saveR164Review(out),/R164_REPORT_OUTPUT_EXISTS_OR_INVALID/);
});

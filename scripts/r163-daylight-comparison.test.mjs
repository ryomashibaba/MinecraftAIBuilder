import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR162Review} from './r162-room-section-comparison.mjs';
import {deriveR163DaylitSections}
 from '../source/ai/r163-daylit-sections.mjs';
import {buildR163Review,saveR163Review}
 from './r163-daylight-comparison.mjs';

test('R163 three topology variants get actual outside-facing glass with genuine roof above usable rooms',()=>{
 const {report,candidates}=buildR163Review();
 assert.equal(report.status,'PHYSICAL_HIGH_GLAZING_AND_ROOM_ROOFS_VERIFIED_ART_HOLD');
 assert.equal(report.newModelCalls,0);
 assert.equal(report.cases.length,3);
 assert.deepEqual(report.cases.map(c=>c.id),['central','west','east']);
 assert.equal(report.independentHumanArtReview,'ART_HOLD');
 assert.equal(report.exteriorWeatherSealing,'NOT_TESTED');
 assert.equal(report.readiness,'NOT_PREPARED');
 assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(report.BuildPlan.operations,[]);
 assert.equal(report.worldWrites,0);
 for(const c of candidates){
  assert.equal(c.metrics.daylight.windowCount,3);
  assert.ok(c.metrics.daylight.realGlassPaneCount>=9);
  assert.equal(c.metrics.daylight.realRoomRoofCoverage.length,3);
  assert.ok(c.metrics.daylight.realRoomRoofCoverage.every(
   r=>r.fullRoomFootprintCoveredBySolidRoof&&r.noObstructionY6ToRoof));
  assert.ok(c.metrics.daylight.realClerestoryWindows.every(
   w=>w.realExteriorDaylightWitnesses.length===w.paneVoxelCount));
  assert.equal(c.metrics.daylight.lowerVoxelsY6AndBelowUnchanged,true);
  assert.equal(c.metrics.daylight.allModelSelectedEquipmentReachable,true);
  assert.equal(c.metrics.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(c.metrics.reachedFeatures,3);
  assert.equal(c.before.placements.length,c.after.placements.length);
  assert.notEqual(c.before.geometrySha256,c.after.geometrySha256);
  assert.equal(c.after.worldWrites,0);
  assert.equal(c.after.constructionApproved,false);
  assert.deepEqual(c.after.gates,Array(9).fill('BLOCKED'));
 }
});
test('R163 double application, no section and false exterior facade must HOLD',()=>{
 const base=buildR162Review().rows[0].after;
 assert.throws(()=>deriveR163DaylitSections({
  ...base,r162RoomSectionEvidence:undefined
 }),/R163_CLERESTORY_VERIFIED_R162_SOURCE_REQUIRED/);
 const actual=deriveR163DaylitSections(base);
 assert.throws(()=>deriveR163DaylitSections(actual),
 /R163_CLERESTORY_ALREADY_APPLIED/);
 const forged=structuredClone(base);
 forged.r162RoomSectionEvidence.upperRoomSections[0].perimeter.x=[4,12];
 forged.r162RoomSectionEvidence.upperRoomSections[0].perimeter.z=[4,14];
 assert.throws(()=>deriveR163DaylitSections(forged),
 /R163_CLERESTORY_NO_TRUE_EXTERIOR_FACE/);
});
test('R163 six genuine B143 before-after viewers and saved audit are write-once',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r163-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const dir=path.join(temp,'review');
 const {report,files}=saveR163Review(dir);
 assert.equal(files.length,14);
 for(const id of ['central','west','east']){
  for(const suffix of ['-before.html','-after.html','-B143.json','-VOXELS.json']){
   assert.ok(files.includes(id+suffix));
  }
  assert.match(fs.readFileSync(path.join(dir,id+'-after.html'),'utf8'),
   /<html|<!doctype/i);
  assert.ok(JSON.parse(fs.readFileSync(path.join(dir,id+'-VOXELS.json'),'utf8')).primitives.length>1000);
 }
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 assert.match(html,/ART HOLD/);
 assert.match(html,/west-after.html/);
 assert.match(html,/east-after.html/);
 assert.match(html,/central-after.html/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'R163_AUDIT.json'),'utf8')).status,report.status);
 assert.throws(()=>saveR163Review(dir),/R163_AUDIT_NO_OVERWRITE/);
});

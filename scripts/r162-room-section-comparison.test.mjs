import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR161} from './r161-real-comparison.mjs';
import {deriveR149EnvelopeExpression}
 from '../source/ai/r149-architectural-expression.mjs';
import {deriveR162RoomSectionMassing}
 from '../source/ai/r162-room-section-massing.mjs';
import {buildR162Review,saveR162Review}
 from './r162-room-section-comparison.mjs';

const envelope=variant=>deriveR149EnvelopeExpression(variant.featured,{
 plan:variant.graph.plan,expressionIntent:{
  schema:'minecraftaibuilder-r151-envelope-intent-v1',
  entryHierarchy:'quiet',daylightStrategy:'even',roofEdge:'fine'
 }});
test('R162 produces genuine independently usable high rooms and real three-way roof divergence',()=>{
 const {report,rows}=buildR162Review();
 assert.equal(report.status,'SOURCE_UPPER_VOLUME_DISTINCT_ART_HOLD');
 assert.equal(report.newModelCalls,0);
 assert.equal(report.r162UpperVolumeDistinctCount,3);
 assert.equal(report.actuallyOpenedHighRooms,9);
 assert.equal(report.humanArtReview,'ART_HOLD');
 assert.equal(report.realMinecraftWalking,'NOT_TESTED');
 assert.equal(report.constructionApproved,false);
 assert.equal(report.readiness,'NOT_PREPARED');
 assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(report.BuildPlan.operations,[]);
 assert.equal(report.worldWrites,0);
 assert.deepEqual(rows.map(x=>x.id),['central','west','east']);
 for(const row of rows){
  assert.equal(row.sections.length,3);
  assert.deepEqual(row.sections.map(x=>x.roofY).sort(),[8,9,10]);
  assert.ok(row.sections.every(x=>x.clearHighInteriorArea>=35));
  assert.ok(row.allRoomRoutesReachable);
  assert.ok(row.allEquipmentServiceReachable);
  assert.equal(row.reachableFeatures,3);
  assert.equal(row.fullR162Evidence.unmodifiedAllCellsY5AndBelow,true);
  assert.notEqual(row.baselineUpperSha256,row.afterUpperSha256);
  assert.ok(row.afterVoxelCount>row.baselineVoxelCount);
 }
});
test('R162 invalid, wrong-topology and duplicate transformation fail closed',()=>{
 const base=buildR161().results;
 const west=envelope(base[1]);
 assert.throws(()=>deriveR162RoomSectionMassing(west,{
  topologyIntent:'central-spine'}),/R162_SECTION_PHYSICAL_TOPOLOGY_NOT_MATCHING_MODEL_INTENT/);
 assert.throws(()=>deriveR162RoomSectionMassing(west,{
  topologyIntent:'invalid'}),/R162_SECTION_TOPOLOGY_INTENT_REQUIRED/);
 const correct=deriveR162RoomSectionMassing(west,{topologyIntent:'west-gallery'});
 assert.throws(()=>deriveR162RoomSectionMassing(correct,{topologyIntent:'west-gallery'}),
 /R162_SECTION_CANNOT_APPLY_TWICE/);
});
test('R162 six real interactive viewers, audit source and safe non-overwrite',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r162-'));
 t.after(()=>fs.rmSync(tmp,{force:true,recursive:true}));
 const out=path.join(tmp,'evidence');
 const {report,files}=saveR162Review(out);
 assert.equal(files.length,14);
 for(const id of ['central','west','east']){
  for(const name of [id+'-before.html',id+'-after.html',
   id+'-BEFORE-B143.json',id+'-AFTER-B143.json']){
   assert.ok(files.includes(name),name);
  }
  assert.match(fs.readFileSync(path.join(out,id+'-after.html'),'utf8'),
   /<html|<!doctype/i);
 }
 const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
 assert.match(html,/ART HOLD/);
 assert.match(html,/central-after.html/);
 assert.match(html,/west-after.html/);
 assert.match(html,/east-after.html/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(out,'R162_INDEPENDENT_SOURCE_AUDIT.json'),'utf8')).status,report.status);
 assert.throws(()=>saveR162Review(out),/R162_REVIEW_NO_OVERWRITE/);
});

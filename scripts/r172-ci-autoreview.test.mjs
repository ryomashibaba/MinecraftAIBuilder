import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR172Autoreview,saveR172Autoreview}
 from './r172-ci-autoreview.mjs';
import {deriveR176GroundFootprint}
 from '../source/ai/r176-ground-footprint.mjs';

test('R172 unattended 3-use synthetic designs actually compile and preserve blocked world gates',()=>{
 const result=buildR172Autoreview();
 assert.equal(result.status,'SYNTHETIC_B143_SOURCE_QA_PASS_ART_HOLD');
 assert.equal(result.NOT_REAL_MODEL_EVIDENCE,true);
 assert.equal(result.cases.length,3);
 assert.equal(result.realModelCalls,0);
 assert.equal(result.worldWrites,0);
 for(const c of result.cases){
  assert.equal(c.source.r170FourRoomVolumeEvidence.roomSections.length,4);
  assert.equal(c.audit.sourceRouteStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(c.audit.rooms,4);
  assert.equal(c.audit.realLocalInference,false);
  assert.ok(c.audit.actualSculptedHighestOccupiedY>
   c.audit.actualBaselineHighestOccupiedY+1);
  assert.ok(c.audit.realSculptedClerestoryWindows>=4);
  assert.ok(c.massed&&c.massed.r170FourRoomVolumeEvidence);
  assert.equal(c.audit.realUpperSetbackDecks.length,2);
  assert.ok(c.outlined?.r176GroundFootprintEvidence);
  assert.ok(c.grounded?.r176GroundFootprintEvidence);
  assert.equal(c.grounded.r176GroundFootprintEvidence.exactCallerRequestRealized,true);
  assert.equal(c.grounded.r176GroundFootprintEvidence.HOST_DESIGNED_NOT_MODEL_SELECTED,false);
  assert.equal(c.audit.r177IntentAuthorship,'STATIC_SYNTHETIC_FIXTURE_NOT_GENUINE_MODEL_REPLY');
  assert.deepEqual(c.grounded.r176GroundFootprintEvidence.requestedGroundShape,
   c.audit.r177RequestedGroundShape);
  assert.equal(c.audit.r177RequestHonoredWithoutHostSubstitution,true);
  assert.ok(c.audit.r177B143ElementCount<=160);
  assert.ok(c.audit.r177ActualFloorCellsCut>=9);
  assert.equal(c.grounded.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.deepEqual(c.grounded.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(c.grounded.BuildPlan.operations,[]);
  assert.equal(c.audit.footprintHostAuthorship,'HOST_DESIGNED_NOT_MODEL_SELECTED');
  assert.ok(c.audit.actualY1FloorCellsRemoved>=9);
  assert.ok(c.audit.outlinedElementCount<=160);
  assert.notEqual(c.audit.outlinedGeometrySha256,c.audit.massedGeometrySha256);
  assert.equal(c.outlined.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.ok(c.outlined.sourceRouteAudit.featureAccess.every(f=>f.reachableFromEntrance));
  assert.deepEqual(c.outlined.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(c.outlined.BuildPlan.operations,[]);
  assert.equal(c.outlined.worldWrites,0);
  assert.equal(c.outlined.r176GroundFootprintEvidence.unchangedFurnishingVoxelCells,true);
  assert.throws(()=>deriveR176GroundFootprint(c.sculpted),
   /R176_GROUND_FOOTPRINT_VERIFIED_R175_SOURCE_AND_BLOCKED_CONSTRUCTION_REQUIRED/);
  assert.throws(()=>deriveR176GroundFootprint({...c.massed,readiness:'PREPARED'}),
   /R176_GROUND_FOOTPRINT_VERIFIED_R175_SOURCE_AND_BLOCKED_CONSTRUCTION_REQUIRED/);
  assert.equal(c.audit.originalGroundFootprintChanged,false);
  assert.notEqual(c.massed.geometrySha256,c.sculpted.geometrySha256);
  assert.ok(c.audit.massedElementCount<=160);
  assert.ok(c.audit.massedWindowsPerRoom.every(n=>n>=1));
  assert.deepEqual(c.massed.BuildPlan.operations,[]);
  assert.deepEqual(c.massed.gates,Array(9).fill('BLOCKED'));
  assert.equal(c.massed.worldWrites,0);
  assert.equal(c.massed.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.ok(c.source.design.elements.length<=160);
  assert.ok(c.sculpted.design.elements.length<=160);
  assert.equal(c.sculpted.r170FourRoomVolumeEvidence.b143SourceElementCount,
   c.sculpted.design.elements.length);
  assert.equal(c.sculpted.r170FourRoomVolumeEvidence.realExteriorClerestoryWindowsPerRoom.length,4);
  assert.ok(c.sculpted.r170FourRoomVolumeEvidence.realExteriorClerestoryWindowsPerRoom.every(n=>n>=1));
  assert.ok(c.audit.realSculptedClerestoryGlazingCells>=12);
  assert.ok(c.sculpted.r170FourRoomVolumeEvidence.originalLowerFiveLevelsUnchanged);
  assert.equal(c.sculpted.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.deepEqual(c.sculpted.BuildPlan.operations,[]);
  assert.equal(c.audit.humanArtReview,'ART_HOLD');
  assert.equal(c.audit.worldWrites,0);
  assert.deepEqual(c.source.BuildPlan.operations,[]);
  assert.deepEqual(c.source.gates,Array(9).fill('BLOCKED'));
  assert.equal(c.source.constructionApproved,false);
 }
});

test('R172 single CI operation produces five interactive previews per use + true voxel SVGs and never overwrites',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r172-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const out=path.join(root,'new');
 const result=saveR172Autoreview(out);
 assert.equal(result.cases.length,3);
 assert.equal(JSON.parse(fs.readFileSync(path.join(out,'R172_CI_QA.json'))).NOT_REAL_MODEL_EVIDENCE,true);
 assert.ok(fs.readFileSync(path.join(out,'index.html'),'utf8').includes('静的な合成入力のみ'));
 for(const id of ['home','shop','laboratory']){
  assert.ok(fs.existsSync(path.join(out,id+'.html')));
  assert.ok(fs.existsSync(path.join(out,id+'-sculpted.html')));
  assert.ok(fs.existsSync(path.join(out,id+'-massed.html')));
  assert.ok(fs.existsSync(path.join(out,id+'-outlined.html')));
  assert.ok(fs.existsSync(path.join(out,id+'-grounded.html')));
  for(const view of ['front','rear','west','east','roof']){
   const svg=fs.readFileSync(path.join(out,id+'-'+view+'.svg'),'utf8');
   assert.ok(svg.startsWith('<svg'),id+' '+view);
   const sculptedSvg=fs.readFileSync(path.join(out,
    id+'-sculpted-'+view+'.svg'),'utf8');
   assert.ok(sculptedSvg.startsWith('<svg'),id+' sculpted '+view);
   const massedSvg=fs.readFileSync(path.join(out,
    id+'-massed-'+view+'.svg'),'utf8');
   assert.ok(massedSvg.startsWith('<svg'),id+' massed '+view);
   const outlinedSvg=fs.readFileSync(path.join(out,
    id+'-outlined-'+view+'.svg'),'utf8');
   assert.ok(outlinedSvg.startsWith('<svg'),id+' outlined '+view);
   const groundedSvg=fs.readFileSync(path.join(out,
    id+'-grounded-'+view+'.svg'),'utf8');
   assert.ok(groundedSvg.startsWith('<svg'),id+' grounded '+view);
  }
 }
 assert.throws(()=>saveR172Autoreview(out),/R172_AUTOMATED_QA_NEW_OUTPUT_DIR_REQUIRED/);
});

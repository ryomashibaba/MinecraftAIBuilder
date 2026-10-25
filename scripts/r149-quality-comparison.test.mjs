import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR149PairedComparison,saveR149PairedComparison}
 from './r149-quality-comparison.mjs';
import {deriveR149EnvelopeExpression}
 from '../source/ai/r149-architectural-expression.mjs';
test('real R146 pinned Qwen source -> two actual B143 3D scenes with proven unchanged interior, rooms, equipment and safe hold',()=>{
 const bundle=buildR149PairedComparison(),e=bundle.evidence;
 assert.equal(e.originalIndependentAudit,'SOURCE_ROOM_GRAPH_VERIFIED');
 assert.equal(e.originalVoxels,2986);
 assert.equal(e.roomCount,4);
 assert.equal(e.equipmentCount,8);
 assert.equal(e.directDoorCount,1);
 assert.equal(e.reachableEquipmentAfter,8);
 assert.equal(e.expression.unchangedInteriorVoxels,true);
 assert.equal(e.expression.modelIntentChanged,false);
 assert.ok(e.expression.windowBays.front>=1);
 assert.ok(e.expression.windowBays.eachSide>=2);
 assert.notEqual(e.originalGeometrySha256,e.enhancedGeometrySha256);
 assert.equal(e.sourceRoutesAfter,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(e.status,'SOURCE_NONREGRESSION_PASSED_ART_HOLD');
 assert.equal(e.humanArtReview,'NOT_REVIEWED');
 assert.equal(e.minecraftWalking,'NOT_TESTED');
 assert.equal(e.modelCalls,0);assert.equal(e.worldWrites,0);
 assert.equal(e.readiness,'NOT_PREPARED');
 assert.deepEqual(e.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(e.BuildPlan.operations,[]);
 assert.ok(bundle.pages.some(p=>p.file==='before-r146.html'));
 assert.ok(bundle.pages.some(p=>p.file==='after-r149.html'));
 assert.ok(bundle.pages.some(p=>p.file==='after-r150.html'));
 assert.equal(e.r150EquipmentEvidence.preservedModelEquipmentChoices,true);
 assert.equal(e.r150EquipmentEvidence.originalEquipmentCount,8);
 assert.ok(e.r150EquipmentEvidence.appendedSmallComponentCount>=8);
 assert.ok(e.r150EquipmentEvidence.changedMaterialCellsInsideEquipment+
  e.r150EquipmentEvidence.newlyOccupiedCellsInsideEquipment>0);
 assert.equal(e.r150EquipmentEvidence.noExteriorWallFloorRoofCorridorChanged,true);
 assert.equal(e.r150SourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.notEqual(e.enhancedGeometrySha256,e.r150GeometrySha256);
 assert.equal(e.r150EquipmentEvidence.humanArtReview,'NOT_REVIEWED');
 assert.ok(bundle.pages.some(p=>p.file==='index.html'));
});
test('no overwrite and real viewer/evidence source output, not a screenshot simulation',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r149-source-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const dest=path.join(dir,'paired');
 const r=saveR149PairedComparison(dest);
 assert.ok(fs.readFileSync(path.join(dest,'before-r146.html'),'utf8').includes('<'));
 assert.ok(fs.readFileSync(path.join(dest,'after-r149.html'),'utf8').includes('<'));
 assert.ok(fs.readFileSync(path.join(dest,'after-r150.html'),'utf8').includes('<'));
 assert.ok(fs.readFileSync(path.join(dest,'R150_DERIVED_SOURCE.json'),'utf8').includes('r150-'));
 assert.equal(JSON.parse(fs.readFileSync(path.join(dest,'R149_EVIDENCE.json'))).enhancedSourceSha256,r.enhancedSourceSha256);
 assert.throws(()=>saveR149PairedComparison(dest),/NO_OVERWRITE/);
});
test('reject missing verified input rather than fabricating a visually improved result',()=>{
 assert.throws(()=>deriveR149EnvelopeExpression({}),/VERIFIED_FURNISHED_BASE_REQUIRED/);
});

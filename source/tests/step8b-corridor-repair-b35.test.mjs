import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateCorridorLayoutB35,verifyB34FrozenB35,buildCorridorReviewB35,validateCorridorReviewB35} from '../runner/step8b-corridor-repair-b35.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const report=buildCorridorReviewB35(root);
const fails=fn=>assert.throws(fn,/B35_/);
const basic={width:6,depth:4,floorMaskRows:['######','######','######','######'],
 corridorCells:[{x:0,z:1},{x:1,z:1},{x:2,z:1}],shaftCells:[{x:3,z:1}],
 doorPorts:[{id:'room1',hallCell:{x:0,z:1},doorCell:{x:0,z:0}}]};
const copy=x=>structuredClone(x);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const resign=x=>{const {reportSha256,...p}=x;x.reportSha256=hash(p);return x;};
test('B35 B34 frozen manifest and files preserved',()=>assert.equal(verifyB34FrozenB35(root),590));
test('B35 exactly 5 layers with A/B each',()=>assert.deepEqual([report.totals.levelsReviewed,report.levels.every(x=>x.options.length===2)],[5,true]));
test('B35 all 5 shaft conflicts confirmed',()=>assert.equal(report.totals.originalCorridorConflicts,5));
test('B35 A changes only one corridor per floor',()=>assert.equal(report.totals.optionARemovedCells,5));
test('B35 B removes exactly one extra unused terminal per floor',()=>assert.deepEqual([report.totals.optionBRemovedCells,report.totals.optionBExtraTerminalPrunes],[10,5]));
test('B35 exact coordinate evidence for A/B',()=>{
 for(const x of report.levels){assert.deepEqual(x.options[0].removedKeys,['12,20']);assert.deepEqual(x.options[1].removedKeys,['12,20','12,21']);}
});
test('B35 baseline A has one isolated corridor end per layer',()=>assert.ok(report.levels.every(x=>JSON.stringify(x.options[0].isolatedCells)==='["12,21"]')));
test('B35 B avoids isolated corridor ends',()=>assert.ok(report.levels.every(x=>x.options[1].isolatedCells.length===0)));
test('B35 B reduces corridor graph by one component',()=>assert.ok(report.levels.every(x=>x.options[0].components===3&&x.options[1].components===2)));
test('B35 room-door paths preserved in both alternatives',()=>assert.deepEqual([report.totals.originalRoomDoorPorts,report.totals.optionAUnservedDoors,report.totals.optionBUnservedDoors],[65,0,0]));
test('B35 no new potential room-volume interference created',()=>assert.deepEqual([report.totals.optionAAddedCells,report.totals.optionBAddedCells],[0,0]));
test('B35 no floor geometry, materials, operations or anchor emitted',()=>assert.deepEqual([report.BuildPlan.operations.length,report.BuildPlan.materialIds.length,report.BuildPlan.worldCoordinates],[0,0,null]));
test('B35 no gate opened and no option approved',()=>assert.equal(report.blockers.every(x=>x.status==='BLOCKED')&&report.totals.approvedOptions===0&&report.deployment==='BLOCKED',true));
test('B35 explicit physical uncertainties persist',()=>assert.ok(report.levels.every(x=>!x.roomVolumeVerified&&!x.structuralWallAndSupportVerified&&!x.physicalDoorStatesVerified)));
test('B35 synthetic valid corridor has all door paths',()=>{let x=evaluateCorridorLayoutB35(basic);assert.deepEqual([x.doorPathsPreserved,x.components,x.unverifiedRoomVolumeAddedCells],[true,1,0]);});
test('B35 synthetic distant shaft loses nominal door path',()=>{let x=evaluateCorridorLayoutB35({...basic,shaftCells:[{x:5,z:3}]});assert.equal(x.unservedDoorIds.length,1);});
test('B35 reject omitted removal of corridor-shaft collision',()=>fails(()=>evaluateCorridorLayoutB35({...basic,shaftCells:[{x:2,z:1}]})));
test('B35 reject deleting door hall port',()=>fails(()=>evaluateCorridorLayoutB35({...basic,removedCells:[{x:0,z:1}]})));
test('B35 reject adding on shifted shaft',()=>fails(()=>evaluateCorridorLayoutB35({...basic,addedCells:[{x:3,z:1}]})));
test('B35 reject adding outside floor',()=>fails(()=>evaluateCorridorLayoutB35({...basic,addedCells:[{x:4,z:0}],floorMaskRows:['####.#','######','######','######']})));
test('B35 additional hallway with unverified room volumes stays UNKNOWN',()=>{let x=evaluateCorridorLayoutB35({...basic,addedCells:[{x:3,z:0}]});assert.equal(x.roomVolumeClearanceStatus,'UNKNOWN_NO_VALIDATED_ROOM_VOLUME_MASK');});
test('B35 reject malformed or duplicated corridor input',()=>fails(()=>evaluateCorridorLayoutB35({...basic,corridorCells:[...basic.corridorCells,basic.corridorCells[0]]})));
test('B35 reject duplicate door id',()=>fails(()=>evaluateCorridorLayoutB35({...basic,doorPorts:[basic.doorPorts[0],basic.doorPorts[0]]})));
test('B35 reject out-of-grid cell',()=>fails(()=>evaluateCorridorLayoutB35({...basic,shaftCells:[{x:-1,z:2}]})));
test('B35 saved report matches pinned rebuild',()=>assert.equal(validateCorridorReviewB35(JSON.parse(fs.readFileSync(path.join(root,'reports/B35_CORRIDOR_REDESIGN_REPORT.json'))),root),true));
test('B35 reject rehashed fake approval',()=>{let x=copy(report);x.approval.adopted=true;resign(x);fails(()=>validateCorridorReviewB35(x,root));});
test('B35 reject rehashed fake preserved connectivity',()=>{let x=copy(report);x.levels[0].options[0].unservedDoorIds.push('fake');resign(x);fails(()=>validateCorridorReviewB35(x,root));});
test('B35 reject rehashed fictional extra corridor clearance',()=>{let x=copy(report);x.levels[0].options[1].addedKeys.push('11,20');resign(x);fails(()=>validateCorridorReviewB35(x,root));});
test('B35 refuses overwrite of existing JSON report',()=>{
 let p=spawnSync(process.execPath,['tools/RUN_B35_OFFLINE.mjs'],{cwd:root,encoding:'utf8'});
 assert.notEqual(p.status,0);assert.match(p.stderr,/B35_REFUSE_OVERWRITE/);
});
test('B35 verifies source has no operational or network imports',()=>{
 const s=fs.readFileSync(path.join(root,'runner/step8b-corridor-repair-b35.mjs'),'utf8');
 assert.doesNotMatch(s,/from\s+['"](?:.*server-step|.*general-building-planner|node:net|node:http|node:child_process)/);
});

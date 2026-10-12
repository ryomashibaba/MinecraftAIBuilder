import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB42,validateB42,compileMacroFloorB42,inspectUpperConnectorB42}
 from '../runner/step8b-macro-module-b42.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const b42=buildB42(root);
const clone=x=>structuredClone(x);
const fail=f=>assert.throws(f,/B42_/);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const resign=o=>{const {reportSha256,...body}=o;o.reportSha256=hash(body);return o;};
const b31=JSON.parse(fs.readFileSync(path.join(root,'reports/B31_FLOOR_DOOR_OVERLAY.json'),'utf8'));
const b17=JSON.parse(fs.readFileSync(path.join(root,'reports/B17_INTERIOR_INTEGRATION_IR.json'),'utf8'));
const b21=JSON.parse(fs.readFileSync(path.join(root,'reports/B21_BLOCKSCALE_REVIEW.json'),'utf8'));
const pick=o=>o.buildings.find(b=>b.id==='apartment/candidate-01');
const floor=pick(b31).floors[1];
const pinnedSourceFiles=['B41_FILE_SHA256.json','reports/B41_STAIR_REDESIGN_AUDIT.json',
 'reports/B17_INTERIOR_INTEGRATION_IR.json','reports/B21_BLOCKSCALE_REVIEW.json',
 'reports/B31_FLOOR_DOOR_OVERLAY.json','B40_FILE_SHA256.json',
 'reports/B40_CROSSLEVEL_STAIR_AUDIT.json','dev/general-building-planner.B32_GUARDED_DEV_COPY.txt'];
test('B42 saved pinned report regenerates and verifies',()=>assert.equal(validateB42(JSON.parse(fs.readFileSync(path.join(root,'reports/B42_MACRO_STAIR_MODULE.json'),'utf8')),root),true));
test('B42 builds five adjacent 4-block-high transitions',()=>assert.deepEqual(b42.transitions.map(t=>t.localYTo-t.localYFrom),[4,4,4,4,4]));
test('B42 creates symbolic risers for all transitions',()=>assert.equal(b42.totals.symbolicRisers,20));
test('B42 floor source remains 398 cells per upper level',()=>assert.ok(b42.transitions.every(t=>t.floorMask.sourceOccupiedCells===398)));
test('B42 floor patch conserves cells and exact rectangular coverage',()=>assert.ok(b42.transitions.every(t=>t.floorMask.exactRectangleCoverage&&t.floorMask.candidateOccupiedCells===398)));
test('B42 rectangle changes 6 to 7 per floor',()=>assert.ok(b42.transitions.every(t=>t.floorMask.beforeRectangles===6&&t.floorMask.candidateRectangles===7)));
test('B42 5 source-cell restorations and 5 candidate holes',()=>assert.deepEqual(b42.totals.reviewFloorRestorations,5)&&assert.equal(b42.totals.reviewFloorOpenings,5));
test('B42 original lower door access 12/13 remains 12/13',()=>assert.ok(b42.transitions.every(t=>t.corridor.baselineReachableDoors===12&&t.corridor.reviewReachableDoors===12)));
test('B42 does not falsely claim full access from the upper landing',()=>assert.ok(b42.transitions.every(t=>t.corridor.upperLandingReachableDoors===1&&t.corridor.upperLandingUnreachedDoorIDs.length===12)));
test('B42 identifies explicit same-level connector proposals',()=>assert.ok(b42.transitions.every(t=>t.corridor.potentialUpperCorridorConnector.exists)));
test('B42 geometric corridor connectors require seven new candidate cells',()=>assert.ok(b42.transitions.every(t=>t.corridor.potentialUpperCorridorConnector.newCorridorCandidateCells.length===7)));
test('B42 upper corridor review finds four wall conflicts per level',()=>assert.ok(b42.transitions.every(t=>t.corridor.potentialUpperCorridorConnector.conceptualWallOverlayCells.length===4)));
test('B42 connector candidates remain unverified and unadopted',()=>assert.ok(b42.transitions.every(t=>{const c=t.corridor.potentialUpperCorridorConnector;return !c.adopted&&!c.roomReservationClearanceVerified&&!c.physicalWallPassageVerified;})));
test('B42 symbolic stair support remains unverified',()=>assert.ok(b42.transitions.every(t=>!t.stair.supportExistenceVerified&&t.stair.symbolicSupportCells.length===4)));
test('B42 candidate stair block states must stay null',()=>assert.ok(b42.transitions.every(t=>t.stair.actualStairBlockState===null&&t.stair.actualFacingState===null&&t.stair.actualHalfState===null)));
test('B42 refuses any engine-compatible status',()=>assert.equal(b42.interface.outputCompatibleWithRuntimePlanner,false));
test('B42 retains all nine blocking gates',()=>assert.deepEqual(b42.blockers.map(g=>g.status),Array(9).fill('BLOCKED')));
test('B42 emits no runtime operations or materials or world coords',()=>{assert.deepEqual(b42.BuildPlan.operations,[]);assert.deepEqual(b42.BuildPlan.materialIds,[]);assert.equal(b42.BuildPlan.worldCoordinates,null);});
test('B42 refuses floor mask patch on occupied restoration',()=>fail(()=>compileMacroFloorB42(floor.overlayRows,[{x:0,z:0}],[{x:13,z:18}])));
test('B42 refuses same location as restored and cutout',()=>fail(()=>compileMacroFloorB42(floor.overlayRows,[{x:14,z:17}],[{x:14,z:17}])));
test('B42 refuses invalid mask width',()=>fail(()=>compileMacroFloorB42(['#','##'],[{x:0,z:0}],[{x:0,z:1}])));
test('B42 refuses duplicate patch cells',()=>fail(()=>compileMacroFloorB42(floor.overlayRows,[{x:14,z:17}],[{x:13,z:18},{x:13,z:18}])));
test('B42 refuses staircase reserves or elevator as connector endpoints',()=>fail(()=>inspectUpperConnectorB42(pick(b17).floors[1],pick(b21).floors[1],floor.overlayRows,{x:13,z:18},{x:10,z:18})));
test('B42 rejects forged approval with recomputed hash',()=>{const r=clone(b42);r.approvedVariant='chosen';fail(()=>validateB42(resign(r),root));});
test('B42 rejects world coordinates with recomputed hash',()=>{const r=clone(b42);r.BuildPlan.worldCoordinates={x:0,y:0,z:0};fail(()=>validateB42(resign(r),root));});
test('B42 rejects generated build operations with recomputed hash',()=>{const r=clone(b42);r.BuildPlan.operations=[{op:'setblock'}];fail(()=>validateB42(resign(r),root));});
test('B42 rejects fake certified stair state with recomputed hash',()=>{const r=clone(b42);r.transitions[0].stair.actualStairBlockState='certified';fail(()=>validateB42(resign(r),root));});
test('B42 rejects forged upper access with recomputed hash',()=>{const r=clone(b42);r.transitions[0].corridor.upperLandingReachableDoors=13;fail(()=>validateB42(resign(r),root));});
test('B42 rejects forged physical support with recomputed hash',()=>{const r=clone(b42);r.transitions[0].stair.supportExistenceVerified=true;fail(()=>validateB42(resign(r),root));});
test('B42 refuses tampered inherited source without touching original',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'minecraft-b42-'));
 try{
  for(const rel of pinnedSourceFiles){fs.mkdirSync(path.dirname(path.join(tmp,rel)),{recursive:true});fs.copyFileSync(path.join(root,rel),path.join(tmp,rel));}
  fs.appendFileSync(path.join(tmp,'reports/B41_STAIR_REDESIGN_AUDIT.json'),'\n');fail(()=>buildB42(tmp));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('B42 refuses unguarded dev planner copy',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'minecraft-b42-'));
 try{
  for(const rel of pinnedSourceFiles){fs.mkdirSync(path.dirname(path.join(tmp,rel)),{recursive:true});fs.copyFileSync(path.join(root,rel),path.join(tmp,rel));}
  fs.writeFileSync(path.join(tmp,'dev/general-building-planner.B32_GUARDED_DEV_COPY.txt'),'export const unsafe=true;');fail(()=>buildB42(tmp));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('B42 module has no engine imports, CLI, network or process launch',()=>{
 const src=fs.readFileSync(path.join(root,'runner/step8b-macro-module-b42.mjs'),'utf8');
 assert.doesNotMatch(src,/from\s+['"][^'"]*(?:general-building-planner|bridge\/src|node:child_process|node:http|node:net)/);
 assert.doesNotMatch(src,/\b(?:spawn|execFile|fetch)\s*\(/);
});

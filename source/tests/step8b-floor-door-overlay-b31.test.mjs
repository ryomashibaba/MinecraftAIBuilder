import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildEngineBoundaryB30} from '../runner/step8b-engine-boundary-b30.mjs';
import {compileFloorDoorOverlayB31,buildFloorDoorOverlayB31,validateFloorDoorOverlayB31,summarizeFloorDoorOverlayB31} from '../runner/step8b-floor-door-overlay-b31.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const a=JSON.parse(fs.readFileSync(path.join(root,'reports/B29_M3_M4_ASSEMBLY_IR.json')));
const b7=JSON.parse(fs.readFileSync(path.join(root,'reports/B7_RECONCILED_REVIEW.json')));
const b30=buildEngineBoundaryB30(root);
const rep=compileFloorDoorOverlayB31(a,b7,b30);
const cp=structuredClone;
const shouldFail=(f)=>assert.throws(f,/B31_/);
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const cases=[
 ['30 independent floors',()=>assert.equal(rep.buildings.flatMap(b=>b.floors).length,30)],
 ['B29/B30 fingerprints linked',()=>assert.equal(rep.sourceEvidence.b30ReportSha256,b30.reportSha256)],
 ['total source footprint',()=>assert.equal(rep.totals.originalFloorCells,12778)],
 ['retained overlay footprint',()=>assert.equal(rep.totals.proposedRetainedFloorCells,12728)],
 ['50 only proposed void cells',()=>assert.equal(rep.totals.proposedCutoutCells,50)],
 ['floor 1 never cut',()=>assert.ok(rep.buildings.every(b=>b.floors[0].proposedCutoutCellCount===0))],
 ['upper floors have two holes',()=>assert.ok(rep.buildings.every(b=>b.floors.slice(1).every(f=>f.proposedCutoutCellCount===2)))],
 ['stair cells are within source footprint',()=>assert.ok(rep.buildings.every(b=>b.floors.every(f=>f.overlayRows.join('').split('o').length-1===f.proposedCutoutCellCount)))],
 ['floor mask cell conservation',()=>assert.ok(rep.buildings.every(b=>b.floors.every(f=>f.originalFloorMaskCellCount===f.retainedFloorMaskCellCount+f.proposedCutoutCellCount)))],
 ['door count 314',()=>assert.equal(rep.totals.doorPorts,314)],
 ['upper door block exactly above lower',()=>assert.ok(rep.buildings.every(b=>b.floors.every(f=>f.doors.every(d=>d.localUpper.y===d.localLower.y+1))))],
 ['no physical direction assigned',()=>assert.equal(rep.totals.doorsWithResolvedFacing,0)],
 ['door possible facings only',()=>assert.ok(rep.buildings.every(b=>b.floors.every(f=>f.doors.every(d=>d.possibleLocalFacing.length===2&&d.actualFacing===null))))],
 ['no state mapping',()=>assert.ok(rep.buildings.every(b=>b.floors.every(f=>f.doors.every(d=>d.lowerBlockStates===null&&d.upperBlockStates===null&&d.blockId===null))))],
 ['no engine call',()=>assert.equal(rep.totals.engineCalls,0)],
 ['no placement output',()=>assert.deepEqual(rep.BuildPlan.operations,[])],
 ['world coordinates absent',()=>assert.equal(rep.BuildPlan.worldCoordinates,null)],
 ['office02 unresolved',()=>assert.deepEqual([rep.office02.outlineMismatchCells,rep.office02.corridorOutsideCells],[123,18])],
 ['nine gates blocked',()=>assert.equal(rep.blockers.length,9)],
 ['deterministic direct compilation',()=>assert.equal(JSON.stringify(rep),JSON.stringify(compileFloorDoorOverlayB31(a,b7,b30)))],
 ['deterministic source pinned replay',()=>assert.equal(JSON.stringify(rep),JSON.stringify(buildFloorDoorOverlayB31(root)))],
 ['saved revalidation',()=>assert.equal(validateFloorDoorOverlayB31(rep,root),true)],
 ['summary excludes all floor maps',()=>assert.equal(Object.hasOwn(summarizeFloorDoorOverlayB31(rep),'buildings'),false)],
 ['reject deployment authorization',()=>{const x=cp(a);x.safety.constructionApproved=true;shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject build operations',()=>{const x=cp(a);x.BuildPlan.operations=[{type:'fill'}];shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject staircase coordinate outside footprint',()=>{const x=cp(a);x.buildings[0].stairs[0].cutoutCandidateCells[0].x=999;shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject cutout duplication',()=>{const x=cp(a);x.buildings[0].stairs[0].cutoutCandidateCells[1]=x.buildings[0].stairs[0].cutoutCandidateCells[0];shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject unsafe stair commit',()=>{const x=cp(a);x.buildings[0].stairs[0].engineFloorOperationOverride=true;shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject floor already executed',()=>{const x=cp(a);x.buildings[0].floors[0].applied=true;shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject forged blockId',()=>{const x=cp(a);x.buildings[0].floors[0].doorPorts[0].blockId='minecraft:oak_door';shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject actual door state',()=>{const x=cp(a);x.buildings[0].floors[0].doorPorts[0].lower.state={direction:0};shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject guessed physical facing',()=>{const x=cp(a);x.buildings[0].floors[0].doorPorts[0].physicalFacing='east';shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject inconsistent upper half',()=>{const x=cp(a);x.buildings[0].floors[0].doorPorts[0].upper.cell.y=55;shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject bogus wall axis',()=>{const x=cp(a);x.buildings[0].floors[0].doorPorts[0].axisHint='Q';shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject altered mass footprint',()=>{const x=cp(b7);x.candidates[0].sourcePredictedRectangles[0].width=500;shouldFail(()=>compileFloorDoorOverlayB31(a,x,b30))}],
 ['reject missing building',()=>{const x=cp(a);x.buildings.pop();shouldFail(()=>compileFloorDoorOverlayB31(x,b7,b30))}],
 ['reject tampered masked row even with new self hash',()=>{const x=cp(rep);x.buildings[0].floors[1].overlayRows[0]='x'+x.buildings[0].floors[1].overlayRows[0].slice(1);const {reportSha256,...data}=x;x.reportSha256=sha(data);shouldFail(()=>validateFloorDoorOverlayB31(x,root))}],
 ['reject forged physical block state even with new self hash',()=>{const x=cp(rep);x.buildings[0].floors[0].doors[0].lowerBlockStates={upper_block_bit:false};const {reportSha256,...data}=x;x.reportSha256=sha(data);shouldFail(()=>validateFloorDoorOverlayB31(x,root))}],
 ['reject fake construction approval',()=>{const x=cp(rep);x.safety.constructionApproved=true;shouldFail(()=>validateFloorDoorOverlayB31(x,root))}],
 ['reject planned operations',()=>{const x=cp(rep);x.BuildPlan.operations.push({type:'fill'});shouldFail(()=>validateFloorDoorOverlayB31(x,root))}],
 ['reject modified B30 pinned manifest',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b31-pin-'));
  try{fs.copyFileSync(path.join(root,'B30_FILE_SHA256.json'),path.join(tmp,'B30_FILE_SHA256.json'));fs.appendFileSync(path.join(tmp,'B30_FILE_SHA256.json'),' ');shouldFail(()=>buildFloorDoorOverlayB31(tmp));}
  finally{fs.rmSync(tmp,{recursive:true,force:true})}
 }]
];
for(const [name,fn] of cases)test(`B31 ${name}`,fn);

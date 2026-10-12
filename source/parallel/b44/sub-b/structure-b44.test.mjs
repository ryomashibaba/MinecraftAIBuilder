import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {maskFromOverlay,rasterizeRectangles,decomposeMask,boundaryGeometry,
  compileStructureB44,validateStructureB44} from './structure-b44.mjs';
import {buildB44FromBaseline,readPinnedB43Reports} from './generate-b44.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=process.env.B43_ROOT??path.resolve(here,'../../../');
const source=readPinnedB43Reports(root);
const report=buildB44FromBaseline(root);
const clone=obj=>structuredClone(obj);
const rowCount=(o)=>o.map(row=>row.filter(Boolean).length).reduce((a,b)=>a+b,0);
const checkFails=(obj,rx)=>assert.throws(()=>compileStructureB44(obj),rx);
test('geometry: source o cutout is still source footprint and candidate only subtracts cutout',()=>{
 const x=maskFromOverlay(['##o','#..'],3,2);
 assert.deepEqual(x.original,[[true,true,true],[true,false,false]]);
 assert.deepEqual(x.candidates,[[true,true,false],[true,false,false]]);
 assert.deepEqual(x.holes,[{x:2,z:0}]);
});
test('geometry: exact nonoverlapping rectangle reconstruction including concavity',()=>{
 const m=[[true,true,false,true],[true,false,false,true],[true,true,true,true]];
 const r=decomposeMask(m),v=rasterizeRectangles(r,4,3);
 assert.deepEqual(v.mask,m);assert.equal(v.overlaps,0);assert.equal(rowCount(m),9);
});
test('geometry: edge count 12, closed center courtyard 4 and fully exterior-connected zero enclosed',()=>{
 const court=[[true,true,true],[true,false,true],[true,true,true]];
 const a=boundaryGeometry(court);
 assert.equal(a.enclosedVoidUnitEdges,4);assert.equal(a.outerUnitEdges,12);
 assert.equal(a.enclosedVoidCellCount,1);
 assert.equal(a.segments.reduce((x,e)=>x+e.length,0),16);
 const open=[[true,false,true],[true,false,true],[true,true,true]];
 const b=boundaryGeometry(open);
 assert.equal(b.enclosedVoidCellCount,0);assert.equal(b.enclosedVoidUnitEdges,0);
});
test('geometry: disconnected source and exterior classifications',()=>{
 const g=boundaryGeometry([[true,false,true]]);
 assert.equal(g.outerUnitEdges,8);assert.equal(g.enclosedVoidUnitEdges,0);
});
test('geometry: rejects malformed masks and out of bound rectangles',()=>{
 assert.throws(()=>maskFromOverlay(['#x'],2,1),/BAD_OVERLAY/);
 assert.throws(()=>boundaryGeometry([[1]]),/BAD_MASK/);
 assert.throws(()=>rasterizeRectangles([{x:0,z:0,width:4,depth:1}],3,3),/BAD_RECT/);
 assert.equal(rasterizeRectangles([{x:0,z:0,width:2,depth:2},{x:1,z:1,width:2,depth:2}],3,3).overlaps,1);
});
test('integration: 5 buildings 30 levels and original/candidate counts',()=>{
 assert.equal(report.buildings.length,5);
 assert.deepEqual(report.buildings.map(b=>b.floors.length),[6,6,6,6,6]);
 const t=report.totals;
 assert.equal(t.originalFloorCells,12778);assert.equal(t.candidateFloorCells,12728);
 assert.equal(t.stairCutoutCandidateCells,50);assert.equal(t.originalFloorRectangles,58);
 assert.equal(t.candidateFloorRectangles,128);assert.equal(t.nominalPartitionPanels,5704);
 assert.equal(t.nominalDoorPorts,314);assert.equal(t.nominalStairLinks,25);
});
test('integration: partition adjacency/door source provenance fully accounted',()=>{
 const floors=report.buildings.flatMap(b=>b.floors);
 assert.equal(floors.reduce((n,f)=>n+f.interior.partitionAdjacencies.length,0),5704);
 assert.equal(floors.reduce((n,f)=>n+f.openings.doorInterfaces.length,0),314);
 assert.equal(floors.flatMap(f=>f.openings.doorInterfaces).filter(d=>d.olderB17DoorHintDiverges).length,118);
 for(const f of floors){
  assert.equal(f.footprint.sourceEnvelope.unitEdgeCount,f.footprint.sourceEnvelope.segments.reduce((n,s)=>n+s.length,0));
  assert.equal(f.footprint.rectangleCoverageMissing,0);
  assert.equal(f.footprint.rectangleOverlap,0);
  assert.equal(f.footprint.candidateMinusOriginalCells,0);
  assert.equal(f.footprint.candidateMissingFromOriginalCells,f.footprint.cutoutCandidates.length);
  assert.equal(f.roof.sourceExposedCells,f.roof.sourceExposedRectangles.reduce((n,r)=>n+r.width*r.depth,0));
 }
});
test('integration: no unverified appearance is falsely assigned',()=>{
 const t=report.totals;
 assert.equal(t.materialAssignments,0);assert.equal(t.physicalStructureVerified,0);
 assert.equal(t.buildOperations,0);assert.equal(t.engineCalls,0);
 for(const f of report.buildings.flatMap(b=>b.floors)){
  assert.equal(f.approved,false);assert.deepEqual(f.blockOperations,[]);
  assert.equal(f.worldCoordinates,null);assert.deepEqual(f.materialsAssigned,[]);
  assert.equal(f.exterior.facadeMaterialId,null);
  assert.equal(f.roof.roofMaterialId,null);assert.equal(f.roof.roofStyle,'UNKNOWN');
  assert.equal(f.openings.actualDoorOpeningsApplied,0);
  for(const d of f.openings.doorInterfaces){assert.equal(d.blockId,null);assert.equal(d.openingApplied,false);}
 }
 assert.equal(report.futurePlannerIntegration.buildPlanConversionAllowed,false);
 assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.deployment,'BLOCKED');
 assert.equal(report.constructionApproved,false);assert.equal(report.executionAllowed,false);
 assert.deepEqual(report.BuildPlan.operations,[]);
 assert.equal(report.comparativeFindings.b43NominalConnectedDoors,'77/78_CONDITIONAL_ON_UNAPPROVED_WALL_REPLAN_NOT_PHYSICAL');
});
test('integration: adjacent floor differences and roof coverage accounted exactly',()=>{
 const every=report.buildings.flatMap(b=>b.floors);
 assert.equal(every.filter(f=>f.footprint.upperFloorSetbackCells>0).length,2);
 assert.equal(every.filter(f=>f.footprint.upperFloorOverhangCells>0).length,0);
 assert.equal(every.filter(f=>f.footprint.sourceEnvelope.enclosedVoidUnitEdges>0).length,6);
 assert.equal(every.reduce((n,f)=>n+f.roof.sourceExposedCells,0),report.totals.sourceRoofExposedCells);
});
test('output digest is stable and validator rejects tampering',()=>{
 assert.deepEqual(buildB44FromBaseline(root),report);
 assert.equal(validateStructureB44(report),true);
 const copy=clone(report);copy.BuildPlan.operations.push({command:'bad'});
 assert.throws(()=>validateStructureB44(copy),/OUTPUT_UNSAFE/);
 const copy2=clone(report);copy2.totals.originalFloorCells++;
 assert.throws(()=>validateStructureB44(copy2),/REPORT_SHA/);
});
test('input fail closed: unauthorized assembly and material claim',()=>{
 const inp=clone(source);inp.b29.BuildPlan.operations.push('place');checkFails(inp,/UNSAFE_B29/);
 const inp2=clone(source);inp2.b29.safety.constructionApproved=true;checkFails(inp2,/UNSAFE_B29/);
});
test('input fail closed: bogus roof floor rectangle and missing source floor',()=>{
 const inp=clone(source);inp.b33.buildings[0].floors[0].sourceRectangles[0].width+=1;
 checkFails(inp,/BAD_RECT|RECTANGLE_ORIGINAL/);
 const inp2=clone(source);inp2.b31.buildings[0].floors.pop();checkFails(inp2,/MISSING_FLOORS/);
});
test('input fail closed: actual door state or altered door pairing',()=>{
 const inp=clone(source);inp.b31.buildings[0].floors[0].doors[0].actualFacing='north';checkFails(inp,/DOOR_PAIRING/);
 const inp2=clone(source);inp2.b31.buildings[0].floors[0].doors[0].localLower.x+=1;
 checkFails(inp2,/DOOR_PAIRING/);
});
test('input fail closed: B43 conceptual readiness or fake approval',()=>{
 const inp=clone(source);inp.b43.totals.approvedWallReplans=20;checkFails(inp,/BASELINE_TOTALS/);
 const inp2=clone(source);inp2.b43.readiness='PREPARED';checkFails(inp2,/UNSAFE_B43/);
});
test('pinned source input: changed report bytes rejected before compilation',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b44-subb-test-'));
 try{
  fs.copyFileSync(path.join(root,'B43_FILE_SHA256.json'),path.join(tmp,'B43_FILE_SHA256.json'));
  for(const rel of ['B17_INTERIOR_INTEGRATION_IR','B29_M3_M4_ASSEMBLY_IR',
  'B31_FLOOR_DOOR_OVERLAY','B32_FLOOR_SEAM_LEDGER','B33_RECTANGLE_EMITTER_LEDGER',
  'B43_VERTICAL_CIRCULATION']){
   fs.mkdirSync(path.join(tmp,'reports'),{recursive:true});
   fs.copyFileSync(path.join(root,'reports',rel+'.json'),path.join(tmp,'reports',rel+'.json'));
  }
  assert.equal(readPinnedB43Reports(tmp).b33.schema,source.b33.schema);
  fs.appendFileSync(path.join(tmp,'reports/B33_RECTANGLE_EMITTER_LEDGER.json'),'\n');
  assert.throws(()=>readPinnedB43Reports(tmp),/PINNED_INPUT_CHANGED_b33/);
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});

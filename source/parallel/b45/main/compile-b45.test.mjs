import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileB45,verifyB45,objForBuilding} from './compile-b45.mjs';
import {inputsFromSource,buildFromSource} from '../../b44/main/run-b44-main.mjs';
import {buildB45FromSource} from './run-b45.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const i=inputsFromSource(),b=i.b,main=buildFromSource();
const result=compileB45(b,main);
const clone=x=>structuredClone(x);
const sha=x=>x.reportSha256;
const testTotals={buildings:5,levels:30,stages:175,originalFloorCells:12778,roofExposedCells:2228,
 outerFacadeEdges:2662,courtyardFacadeEdges:360,partitionPanels:5704,doorPorts:314,
 divergentDoorHints:118,hypotheticalCutouts:50,hypotheticalWindowSlots:1134,stairLinks:25};
test('source replay and deterministic full compilation',()=>{
 assert.deepEqual(buildB45FromSource(),result);assert.equal(verifyB45(result,b,main),true);
 assert.equal(sha(buildB45FromSource()),sha(result));
});
test('5 x 6 levels compile to 175 topological conceptual stages',()=>{
 assert.deepEqual(result.totals,testTotals);
 assert.deepEqual(result.buildings.map(x=>x.levels.length),[6,6,6,6,6]);
 assert.equal(result.tasks.filter(x=>x.kind==='FLOOR_MASS').length,30);
 assert.equal(result.tasks.filter(x=>x.kind==='FACADE_SHELL').length,30);
 assert.equal(result.tasks.filter(x=>x.kind==='ROOF_PROJECTION').length,30);
 assert.equal(result.tasks.filter(x=>x.kind==='PARTITION_HINTS').length,30);
 assert.equal(result.tasks.filter(x=>x.kind==='OPENING_REVIEW').length,30);
 assert.equal(result.tasks.filter(x=>x.kind==='STAIR_LINK_REVIEW').length,25);
});
test('task graph is topological, unique, and no tasks are approved',()=>{
 const done=new Set();for(const t of result.tasks){assert(!done.has(t.id));assert.equal(t.approved,false);
  for(const d of t.dependsOn)assert(done.has(d),`missing predecessor ${d}`);done.add(t.id);}
});
test('unmodified 12,778 floor cells, never applied 50 opening candidates',()=>{
 assert.equal(result.totals.originalFloorCells,12778);
 assert.equal(result.totals.hypotheticalCutouts,50);
 assert.equal(result.buildings.flatMap(x=>x.levels).filter(x=>x.geometry.uncutStairOpeningCandidates.length===2).length,25);
 assert.equal(result.buildings.flatMap(x=>x.levels).filter(x=>x.geometry.uncutStairOpeningCandidates.length===0).length,5);
});
test('all 5 buildings have distinct non-approved large-scale appearance options',()=>{
 const names=result.buildings.map(x=>x.styleCandidate.family);assert.equal(new Set(names).size,5);
 assert(result.buildings.every(x=>x.styleCandidate.adopted===false&&x.styleCandidate.physicalFacadeValidated===false));
});
test('facade/courtyard geometry + all roof exposure accounted',()=>{
 assert.equal(result.totals.outerFacadeEdges,2662);
 assert.equal(result.totals.courtyardFacadeEdges,360);
 assert.equal(result.totals.roofExposedCells,2228);
 assert(result.buildings.some(x=>x.summary.courtyardFacadeEdges>0));
});
test('30 floors retain explicit Y intervals, including office setbacks',()=>{
 for(const building of result.buildings){let prev=0;for(const l of building.levels){
  assert.equal(l.y0,prev);assert(l.y1>l.y0);prev=l.y1;}}
 const a=result.buildings.find(x=>x.id==='office/candidate-01');
 assert(a.levels[1].roofExposedCells>0);
 const other=result.buildings.find(x=>x.id==='office/candidate-02');
 assert(other.levels[4].roofExposedCells>0);
});
test('118 old/new door hints unresolved; 314 door states unknown',()=>{
 assert.equal(result.totals.divergentDoorHints,118);
 const all=result.buildings.flatMap(x=>x.levels).flatMap(l=>l.blockedDetails.doorPorts);
 assert.equal(all.length,314);assert(all.every(d=>d.actualDoorStates===null));
});
test('5704 walls are only nominal review hints',()=>{
 const all=result.buildings.flatMap(x=>x.levels).flatMap(l=>l.blockedDetails.partitions);
 assert.equal(all.length,5704);assert(all.every(p=>p.physicalWall===false));
});
test('all construction gates blocked, actual generated/placed blocks exactly zero',()=>{
 assert.equal(result.integrationScope.structurallyBuildableBuildings,0);
 assert.equal(result.integrationScope.actualMassingBlocksPlaced,0);
 assert.equal(result.integrationScope.windowsActuallyOpened,0);
 assert.equal(result.integrationScope.doorsActuallyPlaced,0);
 assert.equal(result.integrationScope.stairsActuallyPlaced,0);
 assert(result.blockers.M4Gates.every(x=>x.status==='BLOCKED'));
 assert.equal(result.readiness,'NOT_PREPARED');assert.equal(result.deployment,'BLOCKED');
 assert.equal(result.constructionApproved,false);assert.equal(result.executionAllowed,false);
 assert.equal(result.engineCalls,0);assert.equal(result.buildOperations,0);
 assert.deepEqual(result.BuildPlan.operations,[]);assert.equal(result.worldCoordinates,null);
 assert.deepEqual(result.materialIds,[]);
});
test('L1 concept floor proxy not upgraded to proven circulation across other buildings',()=>{
 assert.equal(result.blockers.apartmentFullVerticalCirculation,'CONDITIONAL_VIRTUAL_GRAPH_ONLY');
 assert.equal(result.blockers.otherBuildingCirculation,'NOT_VALIDATED');
});
test('OBJ previews for each building have valid local vertex indices',()=>{
 for(const building of result.buildings){
  const s=objForBuilding(building);
  assert(s.startsWith('# B45 PREVIEW ONLY'));
  const verts=s.split('\n').filter(l=>l.startsWith('v '));
  const faces=s.split('\n').filter(l=>l.startsWith('f '));
  assert(verts.length>0&&faces.length>0);
  assert.equal(verts.length,4*faces.length);
  for(let k=0;k<faces.length;k++)assert.equal(faces[k],`f ${4*k+1} ${4*k+2} ${4*k+3} ${4*k+4}`);
  assert.match(s,/g roof_projection/);
  assert.match(s,/g hypothetical_window_marker_NOT_CUT/);
  assert.match(s,/^mtllib B45_VISUAL_ONLY\.mtl$/m);assert.match(s,/^usemtl outer_shell$/m);
 }
});
test('apartment preview contains inner courtyard wall mesh',()=>{
 const a=result.buildings.find(x=>x.id==='apartment/candidate-01');
 assert.match(objForBuilding(a),/g courtyard_shell/);
});
test('other buildings with no courtyard style do not render courtyard windows',()=>{
 for(const x of result.buildings.filter(x=>x.styleCandidate.courtyardSlots===false)){
  assert(x.levels.flatMap(l=>l.geometry.windowVisualSlots).every(s=>s.classification==='OUTER_FOOTPRINT_EDGE'));
 }
});
test('reject altered original footprint source with bad SHA',()=>{
 const changed=clone(b);changed.buildings[0].floors[0].footprint.originalCells+=1;
 assert.throws(()=>compileB45(changed,main),/B44_SUB_B_/);
});
test('reject planted door block ID in symbolic source',()=>{
 const changed=clone(b);changed.buildings[0].floors[0].openings.doorInterfaces[0].blockId='minecraft:oak_door';
 assert.throws(()=>compileB45(changed,main),/B44_SUB_B_/);
});
test('reject forged upstream main safety approval',()=>{
 const changed=clone(main);changed.constructionApproved=true;
 assert.throws(()=>compileB45(b,changed),/B45_MAIN_SOURCE/);
});
test('reject upstream main package with changed hash',()=>{
 const changed=clone(main);changed.reportSha256='0'.repeat(64);
 assert.throws(()=>compileB45(b,changed),/B45_MAIN_SOURCE/);
});
test('reject wrong upstream aggregate even if changed hash remains',()=>{
 const changed=clone(main);changed.aggregate.floors=999;
 assert.throws(()=>compileB45(b,changed),/B45_MAIN_SOURCE/);
});
test('reject missing or untrusted input',()=>{
 assert.throws(()=>compileB45(null,main));
 assert.throws(()=>compileB45(b,null),/B45_MAIN_SOURCE/);
});
test('reject changed output after generation',()=>{
 const changed=clone(result);changed.totals.stages=1;
 assert.throws(()=>verifyB45(changed,b,main),/B45_HASH/);
});
test('reject illicit BuildPlan even when attacker does not update source',()=>{
 const changed=clone(result);changed.BuildPlan.operations.push({type:'setblock'});
 assert.throws(()=>verifyB45(changed,b,main),/B45_OUTPUT_EXECUTABLE/);
});
test('reject approval promoted on output',()=>{
 const changed=clone(result);changed.executionAllowed=true;
 assert.throws(()=>verifyB45(changed,b,main),/B45_OUTPUT_EXECUTABLE/);
});
test('reject altered window mesh content after hash break',()=>{
 const changed=clone(result);changed.buildings[0].levels[0].geometry.windowVisualSlots[0].along+=1;
 assert.throws(()=>verifyB45(changed,b,main),/B45_HASH/);
});
test('stable checked-in B45 compilation report matches regeneration',()=>{
 const saved=JSON.parse(fs.readFileSync(path.join(HERE,'B45_DESIGN_COMPILATION.json'),'utf8'));
 assert.deepEqual(saved,result);
});
test('stable checked-in B45 5 OBJ preview files match regeneration',()=>{
 for(const x of result.buildings){const s=fs.readFileSync(path.join(HERE,'B45_PREVIEW_'+x.id.replaceAll('/','_')+'.obj'),'utf8');
  assert.equal(s,objForBuilding(x));}
});

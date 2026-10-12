import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileB45} from '../../b45/main/compile-b45.mjs';
import {inputsFromSource,buildFromSource} from '../../b44/main/run-b44-main.mjs';
import {compileB46,verifyB46,objForB46} from './compile-b46.mjs';
import {buildB46FromSource} from './run-b46.mjs';
const HOME=path.dirname(fileURLToPath(import.meta.url));
const i=inputsFromSource(),main=buildFromSource(),old=compileB45(i.b,main),result=compileB46(old,i.b,main);
const copy=x=>structuredClone(x);
const byKind=k=>result.packets.filter(x=>x.kind===k);
const flatten=key=>result.packets.flatMap(p=>p.localGeometry[key]??[]);

test('B45/B44 report identities and safe source replay',()=>{
 assert.equal(result.provenance.b45ReportSha256,old.reportSha256);
 assert.equal(result.provenance.b44MainReportSha256,main.reportSha256);
 assert.equal(verifyB46(result,old,i.b,main),true);
 assert.deepEqual(buildB46FromSource().out,result);
});
test('5 buildings, 30 levels and all 175 design packets',()=>{
 assert.equal(result.buildings.length,5);assert.equal(result.packets.length,175);
 assert.equal(result.totals.localPayloadPackets,175);
 assert(result.buildings.every(b=>b.levelCount===6&&b.levels.length===6));
});
test('floor, facade, roof, partition and opening packets all 30',()=>{
 for(const kind of ['FLOOR_MASS','FACADE_SHELL','ROOF_PROJECTION','PARTITION_HINTS','OPENING_REVIEW'])
  assert.equal(byKind(kind).length,30);
 assert.equal(byKind('STAIR_LINK_REVIEW').length,25);
});
test('original floor plates retained without cutouts being applied',()=>{
 const floors=byKind('FLOOR_MASS');
 assert.equal(floors.reduce((a,p)=>a+p.localGeometry.cells,0),12778);
 assert.equal(floors.reduce((a,p)=>a+p.localGeometry.alternativeUnapprovedCutout.candidateCells.length,0),50);
 assert(floors.every(p=>p.localGeometry.alternativeUnapprovedCutout.applied===false));
});
test('hypothetical floor plate areas and baseline are unchanged',()=>{
 assert.equal(byKind('FLOOR_MASS').reduce((a,p)=>a+p.localGeometry.alternativeUnapprovedCutout.cells,0),12728);
 assert.equal(result.totals.originalFloorCells,old.totals.originalFloorCells);
});
test('all facade envelope segments preserve 2662 outer plus 360 courtyard edge units',()=>{
 const facade=byKind('FACADE_SHELL');
 assert.equal(facade.reduce((a,p)=>a+p.localGeometry.unitEdges,0),3022);
 assert.equal(result.totals.outerFacadeEdges,2662);
 assert.equal(result.totals.courtyardFacadeEdges,360);
});
test('every facade has explicit local Y range and material intentionally unspecified',()=>{
 assert(byKind('FACADE_SHELL').every(p=>p.localGeometry.fromY<p.localGeometry.toY && p.localGeometry.facadeMaterial===null));
});
test('roofs preserve exactly 2228 original exposed cells',()=>{
 assert.equal(byKind('ROOF_PROJECTION').reduce((a,p)=>a+p.localGeometry.cells,0),2228);
});
test('exterior graphic elements are separate from structural geometry',()=>{
 assert.equal(result.totals.graphicFacadeFins,326);
 assert.equal(result.totals.graphicFacadeBands,100);
 assert.equal(result.totals.graphicRoofRimRuns,32);
 assert(flatten('graphicStyle').every(x=>x.kind==='FIN_GRAPHIC_ONLY'));
 assert(flatten('graphicBands').every(x=>x.kind==='FACADE_BAND_GRAPHIC_ONLY'));
 assert(flatten('graphicRim').every(x=>x.kind==='ROOF_EDGE_GRAPHIC_ONLY'));
});
test('roof rim is never generated for lower storeys without exposed roof',()=>{
 for(const b of old.buildings)for(const l of b.levels){
  const p=result.packets.find(x=>x.id===`${b.id}/L${l.level}:ROOF_PROJECTION`);
  if(l.roofExposedCells===0)assert.equal(p.localGeometry.graphicRim.length,0);
 }
});
test('all five building styles distinct, unadopted, physically unverified',()=>{
 assert.equal(new Set(result.buildings.map(b=>b.look.name)).size,5);
 assert(result.buildings.every(b=>b.look.adopted===false&&b.look.roofSupportValidated===false));
});
test('partition hint counts 5704 and no physical wall instantiated',()=>{
 assert.equal(byKind('PARTITION_HINTS').reduce((a,p)=>a+p.localGeometry.count,0),5704);
 assert(byKind('PARTITION_HINTS').every(p=>p.localGeometry.physicalWallCreated===false));
});
test('314 door hints including 118 unresolved legacy divergences',()=>{
 assert.equal(byKind('OPENING_REVIEW').reduce((a,p)=>a+p.localGeometry.nominalDoors.length,0),314);
 assert.equal(old.totals.divergentDoorHints,118);
});
test('1134 window markers with zero cutouts',()=>{
 assert.equal(byKind('OPENING_REVIEW').reduce((a,p)=>a+p.localGeometry.graphicWindowMarkers.length,0),1134);
 assert(byKind('OPENING_REVIEW').every(p=>p.localGeometry.actualWindowCutouts===0&&p.localGeometry.actualDoorPlacement===0));
});
test('25 stair links with no real stair state or physical validation',()=>{
 assert(byKind('STAIR_LINK_REVIEW').every(p=>p.localGeometry.states===null&&p.localGeometry.physicalStairsValidated===false));
});
test('every stage in B45 DAG has exact matching dependencies and all approvals false',()=>{
 assert.deepEqual(result.packets.map(p=>[p.id,p.kind,p.dependsOn]),old.tasks.map(t=>[t.id,t.kind,t.dependsOn]));
 const visited=new Set();for(const p of result.packets){assert(p.dependsOn.every(x=>visited.has(x)));
  assert.equal(p.approved,false);assert.equal(p.emitAllowed,false);assert.equal(p.worldAnchor,null);visited.add(p.id);}
});
test('every packet local geometry checksum is present and correct',()=>{
 assert(result.packets.every(p=>typeof p.payloadSha256==='string'&&/^[0-9a-f]{64}$/.test(p.payloadSha256)));
});
test('no world/material coordinates nor executable operations',()=>{
 assert.equal(result.worldCoordinates,null);assert.deepEqual(result.materialIds,[]);
 assert.deepEqual(result.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});
 assert.equal(result.engineCalls,0);assert.equal(result.buildOperations,0);
});
test('all 9 construction gates remain blocked',()=>{
 assert.equal(result.blockers.M4Gates.length,9);
 assert(result.blockers.M4Gates.every(x=>x.status==='BLOCKED'));
 assert.equal(result.readiness,'NOT_PREPARED');assert.equal(result.deployment,'BLOCKED');
 assert.equal(result.constructionApproved,false);assert.equal(result.executionAllowed,false);
});
test('planner boundary explicitly refuses real runtime integration',()=>{
 assert.equal(result.plannerBoundary.engineAdapterEnabled,false);
 assert.equal(result.plannerBoundary.localToWorldTransform,null);
 assert.equal(result.plannerBoundary.structuralCompatibility,'UNPROVEN_REQUIRES_COMPOSITION_AND_MASSING_MATCH');
});
test('retain still-unknown external entrance, support and stairblock states',()=>{
 assert.equal(result.blockers.unresolvedExteriorAccess,true);
 assert.equal(result.blockers.stagePhysicalSupport,false);
 assert.equal(result.blockers.actualMinecraftStairBlockState,null);
});
test('full output report matches deterministic checked-in file',()=>{
 const saved=JSON.parse(fs.readFileSync(path.join(HOME,'B46_PLANNER_GEOMETRY_REVIEW.json'),'utf8'));
 assert.deepEqual(saved,result);
});
test('all five preview OBJ files deterministic and marked as graphics only',()=>{
 for(const b of old.buildings){
  const obj=objForB46(b,result),actual=fs.readFileSync(path.join(HOME,`B46_PREVIEW_${b.id.replaceAll('/','_')}.obj`),'utf8');
  assert.equal(actual,obj);assert(obj.includes('mtllib B46_VISUAL_ONLY.mtl'));
  assert(obj.includes('GRAPHICS ONLY'));assert(!obj.includes('minecraft:setblock'));
 }
});
test('mutated totals are rejected with hash mismatch',()=>{
 const modified=copy(result);modified.totals.originalFloorCells=0;
 assert.throws(()=>verifyB46(modified,old,i.b,main),/B46_OUTPUT_TAMPER/);
});
test('fake execution permission rejected before checksum check',()=>{
 const modified=copy(result);modified.executionAllowed=true;
 assert.throws(()=>verifyB46(modified,old,i.b,main),/B46_UNSAFE_OUTPUT/);
});
test('injected Minecraft commands in BuildPlan are rejected',()=>{
 const modified=copy(result);modified.BuildPlan.operations.push({type:'fill'});
 assert.throws(()=>verifyB46(modified,old,i.b,main),/B46_UNSAFE_OUTPUT/);
});
test('injected material IDs on report rejected',()=>{
 const modified=copy(result);modified.materialIds.push('minecraft:stone');
 assert.throws(()=>verifyB46(modified,old,i.b,main),/B46_UNSAFE_OUTPUT/);
});
test('injected world position or stage-level approval rejected',()=>{
 const changed=copy(result);changed.worldCoordinates={x:1,z:2};
 assert.throws(()=>verifyB46(changed,old,i.b,main),/B46_UNSAFE_OUTPUT/);
 const p=copy(result);p.packets[0].approved=true;
 assert.throws(()=>verifyB46(p,old,i.b,main),/B46_UNSAFE_OUTPUT/);
});
test('any change to graphic payload is rejected, never accepted as trusted',()=>{
 const changed=copy(result);changed.packets.find(p=>p.kind==='FACADE_SHELL'&&p.localGeometry.graphicStyle.length>0).localGeometry.graphicStyle[0].along++;
 assert.throws(()=>verifyB46(changed,old,i.b,main),/B46_OUTPUT_TAMPER/);
});
test('malformed source floor rectangle is rejected by upstream B45 source verification',()=>{
 const changed=copy(old);changed.buildings[0].levels[0].geometry.sourceFloorRectangles[0].x++;
 assert.throws(()=>compileB46(changed,i.b,main),/B45_HASH/);
});
test('unverified door block states cannot be smuggled through source report',()=>{
 const changed=copy(old);changed.buildings[0].levels[0].blockedDetails.doorPorts[0].actualDoorStates={facing:'north'};
 assert.throws(()=>compileB46(changed,i.b,main),/B45_HASH/);
});
test('forged construction gate status in B45 source is rejected',()=>{
 const changed=copy(old);changed.blockers.M4Gates[0].status='PASS';
 assert.throws(()=>compileB46(changed,i.b,main),/B45_HASH|B46_B45_UNSAFE/);
});
test('upstream false material approval is rejected',()=>{
 const changed=copy(old);changed.materialIds=['minecraft:stone'];
 assert.throws(()=>compileB46(changed,i.b,main),/B45_OUTPUT_EXECUTABLE|B46_B45_UNSAFE|B45_HASH/);
});

test('pinned engine source has the expected floor/roof/facade code anchors but is never imported',()=>{
 const source=fs.readFileSync(path.join(HOME,'../../../dev/reference-engine-general-building-planner.js'),'utf8');
 const anchors=['plate(mask, base, "floor", "floor")','plate(exposed, (f + 1) * fh, "roof", "roof")',
  'composeFacade(c, quality, e, f, base, top, line'];
 for(const anchor of anchors)assert.equal(source.split(anchor).length-1,1,`missing or ambiguous engine seam: ${anchor}`);
 assert.equal(result.plannerBoundary.reference,'PINNED_ENGINE_STATIC_SOURCE_NO_INVOCATION');
});

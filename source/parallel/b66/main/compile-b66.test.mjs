import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {buildB65FromSource} from '../../b65/main/run-b65.mjs';
import {buildB66FromSource} from './run-b66.mjs';
import {compileB66,verifyB66,NOMINAL_PROFILE} from './compile-b66.mjs';
import {renderB66} from './render-b66.mjs';
const inputs=buildB65FromSource();
const compiled=compileB66(inputs.report,inputs.b64);
const pristine=JSON.parse(fs.readFileSync(new URL('./B66_LOCAL_3D_ASSEMBLY.json',import.meta.url)));
const hashed=x=>({...x,reportSha256:createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k])=>k!=='reportSha256')))).digest('hex')});
const clone=x=>JSON.parse(JSON.stringify(x));
const failures=(fn,rx=/B66_/) => assert.throws(fn,rx);

test('B66 deterministic compilation and replay',()=>{assert.deepEqual(compiled,pristine);assert.equal(verifyB66(compiled,inputs.report,inputs.b64),true)});
test('B66 pinned B65 source replay',()=>assert.deepEqual(buildB66FromSource().report,pristine));
test('B66 output is not executable',()=>{
 assert.equal(compiled.executionAllowed,false);assert.equal(compiled.constructionApproved,false);assert.equal(compiled.readiness,'NOT_PREPARED');assert.equal(compiled.deployment,'BLOCKED');assert.equal(compiled.BuildPlan.operations.length,0);assert.equal(compiled.BuildPlan.commandCount,0);assert.equal(compiled.BuildPlan.worldCoordinates,null);assert.deepEqual(compiled.BuildPlan.materialIds,[]);assert.equal(compiled.engineCalls,0);assert.equal(compiled.scans,0);assert.equal(compiled.worldContacts,0);assert.equal(compiled.gates.length,9);assert(compiled.gates.every(g=>g.status==='BLOCKED'));
});
test('B66 global geometry totals',()=>assert.deepEqual(compiled.summary,{buildings:5,levels:30,conceptRooms:314,virtualWallPanels:5704,virtualLintels:314,virtualOpeningVoids:314,virtualSolidVolume:2050.6875,virtualVoidVolume:88.3125,nominalVerticalReservations:25,physicalBlocks:0,buildingOperations:0}));
test('B66 nominal profile is not an approval',()=>{
 assert.equal(NOMINAL_PROFILE.floorPitch,5);assert.equal(NOMINAL_PROFILE.wallHeight,3);assert.equal(NOMINAL_PROFILE.doorClearHeight,2.25);assert.equal(NOMINAL_PROFILE.wallThickness,.125);assert.equal(NOMINAL_PROFILE.doorClearWidth,1);assert.equal(NOMINAL_PROFILE.unit,'HYPOTHETICAL_LOCAL_UNIT');
 assert.equal(compiled.validity.geometryValidOnlyUnderHypotheticalProfile,true);assert.equal(compiled.validity.realBuildingQualityVerified,false);assert.equal(compiled.validity.realWalkabilityVerified,false);assert.equal(compiled.productionFacadeParity,'UNVERIFIED');
});
test('B66 geometric conservation for all walls, all voids',()=>{
 const m=new Map(inputs.report.sections.map(s=>[s.id,s]));let doorCount=0,solidCount=0;
 for(const s of compiled.sections){const baseline=m.get(s.id),wallIds=new Set(baseline.nominalWalls.map(w=>w.id)),panelIds=new Set(s.virtualWallPanels.map(w=>w.boundaryId)),openingIds=new Set(s.virtualDoorVoids.map(o=>o.boundaryId));
 assert.equal(wallIds.size,baseline.nominalWalls.length);assert.deepEqual(panelIds,wallIds);assert.equal(s.virtualWallPanels.length,s.metrics.nominalWallBoundaries);
 assert.equal(s.metrics.lintelPanels,s.virtualDoorVoids.length);assert.equal(s.metrics.nominalVoidVolume,s.metrics.doorVoidBoxes*.28125);
 assert.equal(s.metrics.nominalSolidVolume+s.metrics.nominalVoidVolume,s.metrics.totalUncutBoundaryVolume);
 for(const p of s.virtualWallPanels){const b=p.box;assert.equal(b.length,6);assert.equal(p.notBuildable,true);assert(b.every(Number.isFinite));assert(b[3]>b[0]&&b[4]>b[1]&&b[5]>b[2]);assert.equal(Math.min(b[3]-b[0],b[5]-b[2]),.125);
  const y=(s.level-1)*5;assert.equal(p.kind==='VIRTUAL_DOOR_LINTEL'?b[1]:b[1],p.kind==='VIRTUAL_DOOR_LINTEL'?y+2.25:y);assert.equal(b[4],y+3);
 }
 for(const o of s.virtualDoorVoids){const b=o.box;assert.equal(b[1],(s.level-1)*5);assert.equal(b[4],(s.level-1)*5+2.25);assert.equal(o.realDoorBlock,null);assert.equal(o.hinge,null);assert.equal(o.notBuildable,true);assert(openingIds.has(o.boundaryId));
  const match=s.virtualWallPanels.find(p=>p.boundaryId===o.boundaryId);assert.equal(match.kind,'VIRTUAL_DOOR_LINTEL');assert.deepEqual([b[0],b[2],b[3],b[5]],[match.box[0],match.box[2],match.box[3],match.box[5]]);assert.equal(b[4],match.box[1]);doorCount++;
 }
 solidCount+=s.virtualWallPanels.length-s.virtualDoorVoids.length;
 }
 assert.equal(doorCount,314);assert.equal(solidCount,5390);
});
for(const s of compiled.sections){test('B66 floor geometry '+s.id,()=>{
 const baseline=inputs.report.sections.find(x=>x.id===s.id);assert(baseline);assert.equal(s.level,baseline.level);assert.equal(s.virtualWallPanels.length,baseline.nominalWalls.length);assert.equal(s.virtualDoorVoids.length,baseline.openingPorts.length);
 assert.equal(s.conceptRooms.length,baseline.counts.rooms);assert.equal(s.floorMaskRows.length,baseline.dimensions.depth);assert(s.floorMaskRows.every(row=>row.length===baseline.dimensions.width));
 assert.equal(s.emitAllowed,false);assert.equal(s.physicalWalkability,'UNKNOWN');assert.equal(s.realMaterial,null);assert.equal(s.realWorldAnchor,null);assert.deepEqual(s.constructionInstructions,[]);assert.equal(s.realDoorBlocks,0);
 });}
test('B66 25 links never claim constructed stairs',()=>{assert.equal(compiled.virtualVerticalReservations.length,25);assert(compiled.virtualVerticalReservations.every(l=>l.physicalStairBuilt===false&&l.emitAllowed===false))});
test('B66 unapproved connector retains hold',()=>{assert.equal(compiled.unapprovedConnector.authorized,false);assert.equal(compiled.unapprovedConnector.emitAllowed,false);assert.equal(compiled.unapprovedConnector.localCorridorCandidates.length,5)});
test('B66 output report changed => fails hash',()=>{const c=clone(compiled);c.sections[0].virtualWallPanels[0].box[0]+=1;failures(()=>verifyB66(c,inputs.report,inputs.b64))});
test('B66 output report rehashed but changed => fails replay',()=>{const c=clone(compiled);c.sections[0].virtualDoorVoids[0].kind='REAL_DOOR';failures(()=>verifyB66(hashed(c),inputs.report,inputs.b64))});
test('B66 B65 source hash guard',()=>{const c=clone(inputs.report);c.sections[0].nominalWalls[0].insideCell.x=999;failures(()=>compileB66(c,inputs.b64))});
test('B66 B64 source hash guard',()=>{const c=clone(inputs.b64);c.buildings[0].floors[0].rooms[0].width+=1;failures(()=>compileB66(inputs.report,c))});
test('B66 B65 unsafe flag rejected even with hash',()=>{const c=clone(inputs.report);c.executionAllowed=true;failures(()=>compileB66(hashed(c),inputs.b64))});
test('B66 B65 injected construction operation rejected',()=>{const c=clone(inputs.report);c.BuildPlan.operations.push({kind:'setblock'});failures(()=>compileB66(hashed(c),inputs.b64))});
test('B66 B65 opened gate rejected',()=>{const c=clone(inputs.report);c.gates[0].status='PASS';failures(()=>compileB66(hashed(c),inputs.b64))});
test('B66 source changing wall normal rejected',()=>{const c=clone(inputs.report);c.sections[0].nominalWalls[0].insideCell.x+=4;failures(()=>compileB66(hashed(c),inputs.b64),/B66_WALL_DIRECTION/)});
test('B66 source changing port wall association rejected',()=>{const c=clone(inputs.report);c.sections[0].nominalWalls.find(w=>w.openingPortId).openingPortId='INVALID';failures(()=>compileB66(hashed(c),inputs.b64),/B66_OPENING_CONTRACT/)});
test('B66 source door becomes real door rejected',()=>{const c=clone(inputs.report);c.sections[0].openingPorts[0].realDoorBlock='oak_door';failures(()=>compileB66(hashed(c),inputs.b64),/B66_OPENING_CONTRACT/)});
test('B66 source one room geometry altered after rehash rejected',()=>{const c=clone(inputs.b64);c.buildings[0].floors[0].rooms.pop();failures(()=>compileB66(inputs.report,hashed(c)),/B66_B64_SOURCE|B66_SECTION_METADATA|B66_ROOM_MASK/)});
test('B66 source one floor omitted rejected',()=>{const c=clone(inputs.report);c.sections.pop();failures(()=>compileB66(hashed(c),inputs.b64),/B66_SOURCE_SCOPE/)});
test('B66 browser artifact is self-contained and readonly',()=>{const html=renderB66(compiled);const disk=fs.readFileSync(new URL('./B66_INTERIOR_3D_REVIEW.html',import.meta.url),'utf8');assert.equal(html,disk);assert(html.includes('NOT PREPARED · 9 GATES BLOCKED'));assert(html.includes('b66-data'));assert(!/<script\s+src=|<link\s+href=|fetch\s*\(|new\s+WebSocket\s*\(|XMLHttpRequest|navigator\.serviceWorker/.test(html));});
test('B66 renderer rejects unsafe JSON',()=>{const c=clone(compiled);c.executionAllowed=true;failures(()=>renderB66(c),/B66_RENDER_SAFETY/)});

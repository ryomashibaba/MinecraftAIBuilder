import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {compileB98,validateB98} from './compile-b98.mjs';
import {largestInteriorCourtyard,designAtriumFloor,designOfficeSouthWing,verifyIndependentB98Floor} from './b98-atrium-wing.mjs';
const disk=JSON.parse(fs.readFileSync(new URL('./B98_ATRIUM_WING_REPORT.json',import.meta.url),'utf8'));
const b97=JSON.parse(fs.readFileSync(new URL('../../b97/main/B97_CONNECTED_GALLERY_REPORT.json',import.meta.url),'utf8'));
const apt=disk.apartment.options,off=disk.office01.options[0];const baselineA=b97.buildings.find(b=>b.buildingId==='apartment/candidate-01').options[0];
const baselineO=b97.buildings.find(b=>b.buildingId==='office/candidate-01').options[0];
const all=[...apt,off].flatMap(x=>x.sections);
const at=x=>apt.find(o=>o.id===x);
const pt=p=>`${p.x},${p.z}`;
test('B98 report produced & validates',()=>assert.equal(validateB98(disk),true));
test('B98 deterministic replay matches persisted report hash',()=>assert.equal(compileB98().reportSha256,disk.reportSha256));
test('B97 parent hash pinned and unchanged',()=>assert.equal(disk.parentB97Hash,b97.reportSha256));
test('five original building references preserved',()=>assert.deepEqual(disk.references.map(x=>x.buildingId),b97.buildings.map(x=>x.buildingId)));
test('original nominal 314 rooms and 296 prior candidates remain unapproved',()=>assert.deepEqual([disk.totals.nominalRooms,disk.totals.protectedUnapprovedPriorRooms,disk.totals.approvedIndependentRooms],[314,296,0]));
test('30 independent virtual floors and not actual production slots',()=>assert.equal(all.length,30));
test('every virtual floor passes 2-wide graph and protected-site checks',()=>assert.equal(all.every(verifyIndependentB98Floor),true));
test('courtyard extracted from enclosed open area not hardcoded x/z',()=>{
 const c=largestInteriorCourtyard(baselineA.sections[0].floorMaskRows);assert.equal(c.area,216);assert.deepEqual(c.bounds,{minX:5,maxX:22,minZ:5,maxZ:16});
});
test('no interior courtyard detected on all-solid synthetic floor',()=>assert.equal(largestInteriorCourtyard(Array(8).fill('11111111')),null));
test('apartment increases conceptual two-wide bays from 6 to 72 conservatively',()=>{
 assert.equal(disk.totals.apartmentBaselineEntranceCount,6);assert.equal(at('RING_NORTH_WEST_SOUTH').summary.pairedEntranceRooms,72);
});
test('conservative ring retains all 78 rooms and at least 80 percent each',()=>{
 const s=at('RING_NORTH_WEST_SOUTH').summary;assert.equal(s.allocatedRooms,78);assert.ok(s.minimumRoomAreaRatio>=.8-1e-9);
});
test('courtyard sky exposure proxy keeps over half interior lightwell open',()=>{
 const s=at('RING_NORTH_WEST_SOUTH').summary;assert.ok(s.minimumCourtyardOpenRatio>.5);
});
test('all floors preserve a non-overlapping open courtyard interior after gallery',()=>{
 for(const f of at('RING_NORTH_WEST_SOUTH').sections)assert.ok(f.diagnostic.courtyardRetainedOpenCells>=112);
});
test('outboard east gallery creates all 78 paired entrance candidates',()=>assert.equal(at('RING_OUTBOARD_EAST').summary.pairedEntranceRooms,78));
test('outboard gallery reports 24 facade shadow risks and fails gate',()=>{
 const o=at('RING_OUTBOARD_EAST');assert.equal(o.summary.facadeShadingRiskRooms,24);assert.equal(o.quality.eligibleForDaylightConservativeReview,false);
});
test('conservative courtyard variant passes proxy gate without claiming real glazing',()=>{
 const o=at('RING_NORTH_WEST_SOUTH');assert.equal(o.quality.eligibleForDaylightConservativeReview,true);
 assert.equal(o.summary.windowsAndDaylightUnverified,true);
});
test('north and south variants keep room area >75 percent',()=>{
 for(const o of apt)for(const f of o.sections)for(const r of f.rooms)assert.ok(r.areaRetention>=.75);
});
test('apartment gallery retains named stair and elevator reservations',()=>{
 for(const f of apt.flatMap(a=>a.sections)){
  const reserved=new Set(f.reservedSites.map(pt));assert.ok(f.gallery.every(q=>!reserved.has(pt(q))));
 }
});
test('office01 recovers four unallocated rooms by exterior wing, not internal demolition',()=>{
 assert.equal(disk.totals.office01BaselineAllocatedRooms,62);assert.equal(off.summary.allocatedRooms,66);
 assert.equal(off.sections.filter(f=>f.diagnostic.relocatedToExternalWing.length===1).length,4);
});
test('south wing connects all 4 relocated rooms to 2-cell frontage',()=>{
 for(const f of off.sections.slice(2)){const rel=f.diagnostic.relocatedToExternalWing;assert.equal(rel.length,1);
  const room=f.rooms.find(r=>r.roomId===rel[0].id);assert.ok(room.entranceBay);assert.equal(room.areaRetention,1);
 }
});
test('south wing upper apartment rooms do not overlap reserved original cores',()=>{
 for(const f of off.sections){const core=new Set(Array.from({length:f.core.width*f.core.depth},(_,i)=>`${f.core.x+i%f.core.width},${f.core.z+Math.floor(i/f.core.width)}`));
  for(const room of f.rooms.filter(x=>x.room)){for(let z=room.room.z;z<room.room.z+room.room.depth;z++)for(let x=room.room.x;x<room.room.x+room.room.width;x++)assert.ok(!core.has(`${x},${z}`));}
 }
});
test('office wing stores structural-support warning without assuming construction',()=>{
 assert.ok(disk.office01.structuralNotes.includes('loads'));
 assert.ok(off.summary.addedFootprintCellsAcrossFloors>0);assert.equal(off.quality.actualWindowsDoorsStairsFloorAndFireEgressNotYetValidated,true);
});
test('all 9 protected gates remain BLOCKED',()=>assert.equal(disk.gates.length,9)&&assert.ok(disk.gates.every(g=>g.status==='BLOCKED')));
test('construction fields remain empty and NOT_PREPARED',()=>{
 assert.equal(disk.readiness,'NOT_PREPARED');assert.equal(disk.BuildPlan.operations.length,0);assert.equal(disk.BuildPlan.commandCount,0);
 assert.equal(disk.BuildPlan.worldCoordinates,null);assert.equal(disk.worldContacts,0);
});
test('mutating approval, gates or commands invalidates report',()=>{
 for(const mutate of [x=>x.gates[0].status='PASS',x=>x.BuildPlan.operations.push({type:'setBlock'}),
  x=>x.constructionApproved=true,x=>x.totals.productionEdits=1,x=>x.BuildPlan.worldCoordinates={x:0}]){
  const x=structuredClone(disk);mutate(x);assert.equal(validateB98(x),false);
 }
});
test('mutated gallery entering protected stair invalidates a floor',()=>{
 const f=structuredClone(at('RING').sections[0]);f.gallery[0]=f.reservedSites[0];assert.equal(verifyIndependentB98Floor(f),false);
});
test('mutated room overlapping gallery invalidates a floor',()=>{
 const f=structuredClone(at('RING').sections[0]);f.rooms[0].room={...f.core};assert.equal(verifyIndependentB98Floor(f),false);
});
test('all 5 concepts explicitly remain unapproved',()=>{
 for(const x of [...apt,off]){assert.equal(x.status,'UNAPPROVED_INDEPENDENT_NEW_BUILDING_OPTION');assert.equal(x.selectedForConstruction,false)}
});
test('B98 compiler uses original B97 6-floor data and replays an apartment plan',()=>{
 const rebuilt=designAtriumFloor(baselineA.sections[0],'RING_NORTH_WEST_SOUTH');assert.equal(rebuilt.stats.pairedEntranceRooms,at('RING_NORTH_WEST_SOUTH').sections[0].stats.pairedEntranceRooms);
 assert.equal(rebuilt.gallery.length,at('RING_NORTH_WEST_SOUTH').sections[0].gallery.length);
});
test('B98 compiler replays south-wing office footprint',()=>{
 const f=designOfficeSouthWing(baselineO.sections[2]);assert.equal(f.stats.allocatedRooms,off.sections[2].stats.allocatedRooms);
 assert.deepEqual(f.diagnostic.relocatedToExternalWing,off.sections[2].diagnostic.relocatedToExternalWing);
});

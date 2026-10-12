import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash,safe,key} from '../../b79/main/compile-b79.mjs';
import {immutableFootprint,checkWholeFloorCandidate} from './compile-b82.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const r=get('parallel/b82/main/B82_ROOM_CORRIDOR_REDESIGN.json');
const b81=get('parallel/b81/main/B81_TYPED_LOCAL_ASSEMBLY.json');
const b80=get('parallel/b80/main/B80_LOCAL_3D_FRAME_REPORT.json');
const b78=get('parallel/b78/main/B78_GLOBAL_GRID_REPORT.json');
const b65=get('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json');
const b66=get('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json');
const sections=n=>new Map(n.sections.map(s=>[s.id,s]));
const [a81,a80,a78,a65,a66]=[b81,b80,b78,b65,b66].map(sections);
const rows=r.sections.flatMap(s=>s.heldBoundaryRedesigns);
const good=rows.filter(x=>x.proposed),bad=rows.filter(x=>!x.proposed);
const vk=v=>`${v.x},${v.y},${v.z}`;
const site=x=>typeof x==='string'?x:key(x);
const yLevels=values=>new Set(values.map(x=>x.y));
test('B82 immutable report has valid digest and strictly disabled execution gates',()=>{
 const {reportSha256,...body}=r;assert.equal(hash(body),reportSha256);
 safe(r,'minecraftaibuilder-b82-readonly-speculative-wall-reroute-v1');
 assert.equal(r.kind,'NON_EXECUTABLE_CONCEPT_CORRIDOR_BOUNDARY_DELTA');
 assert.equal(r.approval,'PROPOSED_ONLY');assert.deepEqual(r.BuildPlan.operations,[]);
 assert.deepEqual(r.BuildPlan.materialIds,[]);assert.equal(r.BuildPlan.worldCoordinates,null);
 assert.equal(r.totals.worldCommands,0);assert.equal(r.totals.worldContacts,0);
});
test('B81 B80 B78 B65 B66 provenance anchored by original hashes',()=>{
 const refs={b81,b80,b78,b65,b66};
 for(const [k,v] of Object.entries(refs))assert.equal(r.provenance[k],v.reportSha256);
 safe(b81,'minecraftaibuilder-b81-typed-local-construction-intents-v1');
 safe(b80,'minecraftaibuilder-b80-readonly-local-3d-door-frame-mock-v1');
});
test('5 pinned production operations are identical to B80',()=>{
 assert.equal(r.productionReplays.length,5);
 const pinned=new Map(b80.productionReplays.map(x=>[x.building,x.operationsSha256]));
 for(const replay of r.productionReplays)assert.equal(replay.operationsSha256,pinned.get(replay.building));
});
test('B82 examines exactly 32 previously held named-border rooms',()=>{
 assert.equal(rows.length,32);assert.equal(new Set(rows.map(x=>x.portId)).size,32);
 const b81no=b81.sections.flatMap(s=>s.held.filter(h=>h.category==='NO_VALID_DOOR_BOUNDARY').map(h=>h.portId));
 assert.deepEqual(rows.map(x=>x.portId).sort(),b81no.sort());
 assert.equal(r.totals.heldOtherCategories,22);assert.equal(r.totals.originallyHeld,54);
});
test('8 new rooms are novel office02 candidates; no accepted room overwritten',()=>{
 assert.equal(good.length,8);assert.equal(bad.length,24);
 assert.ok(good.every(g=>g.portId.startsWith('office/candidate-02/')));
 assert.deepEqual(good.reduce((m,x)=>(m[x.portId.match(/\/L\d+/)?.[0]]=(m[x.portId.match(/\/L\d+/)?.[0]]??0)+1,m),{}),{'/L2':2,'/L3':2,'/L4':2,'/L5':2});
 assert.equal(r.totals.remainingHeldIfAlternativesAccepted,46);
 assert.equal(r.totals.existingB81DoorPairsPreserved,260);
});
test('new door openings, jambs and lintels are proper local integer voxel shapes',()=>{
 for(const row of good){const p=row.proposed;
  assert.equal(p.opening.length,2);assert.equal(p.local3DVoxels.length,9);
  assert.deepEqual([...yLevels(p.opening)].sort((a,b)=>a-b),[p.opening[0].y,p.opening[0].y+1]);
  assert.ok(p.local3DVoxels.every(v=>[v.x,v.y,v.z].every(Number.isSafeInteger)));
  assert.equal(new Set(p.local3DVoxels.map(vk)).size,9);
  assert.ok(p.frame.every(x=>x.role==='LINTEL'||x.yLevels.length===3));
  assert.equal(p.doorHinge,null);assert.equal(p.placementAllowed,false);
  assert.equal(p.doorStateCalibration,'UNVERIFIED');
  assert.equal(p.oldOpeningClosure,'NOT_PROPOSED_OR_APPROVED');
 }
});
test('all eight reused a real B65 named-corridor wall boundary without mutating it',()=>{
 for(const s of r.sections){const src=a65.get(s.id);
  for(const room of s.heldBoundaryRedesigns.filter(x=>x.proposed)){
   const port=src.openingPorts.find(p=>p.id===room.portId);
   const edge=src.nominalWalls.find(w=>w.id===room.proposed.sourceWallId);
   assert.ok(edge);assert.equal(edge.roomId,room.roomId);
   assert.equal(edge.neighborClass,'CONCEPT_CORRIDOR');
   assert.deepEqual(edge.insideCell,room.proposed.roomCell);
   assert.deepEqual(edge.adjacentCell,room.proposed.hallCell);
   assert.equal(room.proposed.requiresOldOpeningRedesign,false);
   assert.equal(room.proposed.doorReoriented,false);
   assert.deepEqual(port.roomCell,room.proposed.roomCell);
  }
 }
});
test('new candidate voxels do not occupy existing 260-door typed solids, doors, air or reserved room routes',()=>{
 for(const s of r.sections){const existing=immutableFootprint(a81.get(s.id),a80.get(s.id));
  const additions={solids:new Set(),reserved:new Set(),protectedSites:new Set()};
  for(const room of s.heldBoundaryRedesigns.filter(x=>x.proposed)){
   const p=room.proposed,candidate={local3DVoxels:p.local3DVoxels,localSwingAirReservation:p.localSwingAirReservation,
    protectedRoomCore:p.protectedRoomCore,protectedRoute:p.protectedRoute,opening:p.opening};
   assert.deepEqual(checkWholeFloorCandidate(candidate,existing,additions),[]);
   for(const v of p.local3DVoxels)(v.role==='DOOR_VOID'?additions.reserved:additions.solids).add(vk(v));
   for(const v of p.localSwingAirReservation)additions.reserved.add(vk(v));
   for(const q of [...p.protectedRoomCore,...p.protectedRoute])additions.protectedSites.add(site(q));
  }
 }
});
test('exactly 28 original B78 speculative cells are proposed for deferral, no frozen B81 solids deleted',()=>{
 assert.equal(r.totals.deferredB78SpeculativeWallCells,28);
 let total=0;
 for(const s of r.sections){const stage=a78.get(s.id),old=a81.get(s.id),oldSolids=new Set(old.solidVoxelIntents.map(v=>key(v)));
  for(const room of s.heldBoundaryRedesigns){for(const d of room.proposedDeferredB78WallCells){total++;
   const original=stage.stagedCells.find(x=>x.site===d.site&&x.owner===room.roomId);
   assert.ok(original);assert.equal(d.status,'PROPOSED_TO_DEFER__B78_ONLY_NOT_A_WORLD_CHANGE');
   assert.equal(oldSolids.has(d.site),false);
  }}
 }
 assert.equal(total,28);
});
test('24 unresolved still carry full blocker frequencies without automatic fixes',()=>{
 assert.equal(bad.length,24);
 for(const row of bad){assert.equal(row.reasonForHold,'NO_CANDIDATE_SATISFIES_PRODUCTION_AND_EXISTING_B81_IMMUTABILITY');
  assert.ok(Object.keys(row.rejectionFrequency).length);
  assert.equal(row.autoApply,false);assert.deepEqual(row.operations,[]);
 }
});
test('invalid candidate overlapping existing doors or protected room routes is rejected',()=>{
 const s=r.sections.find(x=>x.newlyReviewableFromHeld>0);
 const fixed=immutableFootprint(a81.get(s.id),a80.get(s.id));
 const p=s.heldBoundaryRedesigns.find(x=>x.proposed).proposed;
 const base={...p};const empty={solids:new Set(),reserved:new Set(),protectedSites:new Set()};
 assert.deepEqual(checkWholeFloorCandidate(base,fixed,empty),[]);
 const conflict=structuredClone(base);conflict.local3DVoxels[0]={...conflict.local3DVoxels[0],...a81.get(s.id).doorPairs[0].parts[0]};
 assert.ok(checkWholeFloorCandidate(conflict,fixed,empty).includes('COLLIDES_WITH_EXISTING_DOOR_OR_AIR'));
 const tampered={...base,protectedRoute:['0,0']};const forced={...empty,protectedSites:new Set(['0,0'])};
 assert.ok(checkWholeFloorCandidate(tampered,fixed,forced).includes('SHARED_CORE_OR_ROUTE_WITH_NEW_ROOM'));
});
test('all B82 local section reports are non executable and have no world coordinates',()=>{
 assert.equal(r.sections.length,30);
 for(const s of r.sections){assert.equal(s.existingTypedAssemblyUntouched,true);
  assert.equal(s.placementAuthorized,false);assert.equal(s.worldCoordinates,null);assert.deepEqual(s.operations,[]);
  for(const x of s.heldBoundaryRedesigns){assert.equal(x.autoApply,false);assert.equal(x.worldCoordinates,null);assert.deepEqual(x.operations,[]);}
 }
});
test('rest of B81 risks remain unresolved and safety remains blocked',()=>{
 assert.ok(r.remainingRisks.includes('EXISTING_DOOR_FACING_HINGE_STILL_UNCALIBRATED'));
 assert.ok(r.remainingRisks.includes('25_STAIRS_AND_240_SLAB_CUTS_UNVERIFIED'));
 assert.ok(r.remainingRisks.includes('HOTEL_FACADE_APPROVAL'));
 assert.ok(r.gates.every(x=>x.status==='BLOCKED'));
});
test('24 remaining rooms collapse to 8 recurring floor-plan templates, not 24 unique fixes',()=>{
 const patterns=get('parallel/b82/main/B82_HELD_TEMPLATE_GROUPS.json');
 assert.equal(patterns.sourceB82ReportSha256,r.reportSha256);
 assert.equal(patterns.templateCount,8);assert.equal(patterns.heldRooms,24);
 assert.equal(patterns.templates.length,8);
 assert.deepEqual(patterns.templates.flatMap(t=>t.portIds).sort(),bad.map(t=>t.portId).sort());
 for(const t of patterns.templates){assert.equal(t.noProductionEditsAllowed,true);
  assert.equal(t.worldCoordinates,null);assert.deepEqual(t.operations,[]);
  assert.equal(t.portIds.length,t.floors.length);assert.ok(Object.keys(t.topBlockers).length>0);
 }
});

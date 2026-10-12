import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash,safe} from '../../b79/main/compile-b79.mjs';
import {assessFrame,corridorComponents} from './compile-b80.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const get=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const report=get('parallel/b80/main/B80_LOCAL_3D_FRAME_REPORT.json');
const b79=get('parallel/b79/main/B79_DOOR_SLOT_REVIEW.json');
const b65=get('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json');
const b66=get('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json');
const k=v=>`${v.x},${v.y},${v.z}`;
const site=v=>`${v.x},${v.z}`;
function fixture(){
 const room={id:'R',x:1,z:1,width:5,depth:5};
 const port={id:'D',roomId:'R',normal:{dx:0,dz:1},roomCell:{x:3,z:5},hallCell:{x:3,z:6}};
 const proposal={roomCell:{x:3,z:5},hallCell:{x:3,z:6},normal:{dx:0,dz:1},sourceWallId:'W0',originalPortMoved:false,disqualifications:[],preservedNominalCore:['2,2','3,2','2,3','3,3'],preservedNominalRoute:['3,5','3,4','3,3']};
 const source={openingPorts:[port],nominalWalls:[
  {id:'WL',roomId:'R',neighborClass:'CONCEPT_CORRIDOR',insideCell:{x:4,z:5},adjacentCell:{x:4,z:6}},
  {id:'WR',roomId:'R',neighborClass:'CONCEPT_CORRIDOR',insideCell:{x:2,z:5},adjacentCell:{x:2,z:6}}]};
 const shape={level:1,floorMaskRows:Array.from({length:8},()=> '11111111'),conceptReservations:{corridors:[{x:3,z:6},{x:4,z:6}],stairs:[],elevators:[]}};
 const idx={final:new Map()};
 return {proposal,port,room,shape,source,idx,corridors:corridorComponents(shape,idx)};
}
test('B80 report hash and all nine construction gates remain BLOCKED',()=>{
 const {reportSha256,...body}=report;assert.equal(hash(body),reportSha256);
 safe(report,'minecraftaibuilder-b80-readonly-local-3d-door-frame-mock-v1');
 assert.deepEqual(report.BuildPlan.operations,[]);assert.equal(report.worldContacts,0);
});
test('immutable B65/B66/B79 provenance is preserved',()=>{
 for(const [name,r]of Object.entries({b65,b66,b79})){
  const {reportSha256,...body}=r;assert.equal(hash(body),reportSha256);assert.equal(report.provenance[name],reportSha256);
 }
});
test('all 5 production planner replays have unchanged operation SHA',()=>{
 assert.equal(report.productionReplays.length,5);
 for(const r of report.productionReplays)assert.equal(r.operationsSha256,b79.replay.find(x=>x.building===r.building)?.productionOperationsSha256);
});
test('all 314 original door IDs are preserved and 260 candidates are mock-only',()=>{
 const doors=report.sections.flatMap(s=>s.rooms);assert.equal(doors.length,314);
 assert.equal(report.totals.b80MockFrames,260);assert.equal(report.totals.b80Held,54);
 assert.equal(new Set(doors.map(d=>d.portId)).size,314);
 for(const door of doors){assert.equal(door.emitAllowed,false);if(door.selected){
  assert.equal(door.selected.emitAllowed,false);assert.equal(door.selected.hinge,'UNDECIDED');
  assert.equal(door.selected.material,null);assert.equal(door.selected.worldCoordinates,null);
  assert.deepEqual(door.selected.rejects,[]);
 }}
});
test('mock 3D frame occupies two jambs through y+3 and lintel y+3 while preserving 2-high opening',()=>{
 const r=assessFrame(fixture());assert.equal(r.status,'MOCK_FRAME_REVIEW_ONLY');
 assert.equal(r.frame.length,3);assert.deepEqual(r.frame.map(f=>f.yLevels),[[1,2,3],[1,2,3],[3]]);
 assert.deepEqual(r.opening.map(o=>o.y),[1,2]);assert.equal(r.local3DVoxels.length,9);
 assert.equal(r.chosenMockSwingSide,'left');assert.equal(r.emitAllowed,false);
});
test('solid production block at jamb forces HOLD',()=>{
 const x=fixture();x.idx.final.set('4,2,5',{occupied:true});
 const r=assessFrame({...x,corridors:corridorComponents(x.shape,x.idx)});
 assert.ok(r.rejects.includes('FRAME_COLLIDES_WITH_PRODUCTION'));
});
test('solid production block within either side of opening forces HOLD',()=>{
 const x=fixture();x.idx.final.set('3,1,6',{occupied:true});
 const r=assessFrame({...x,corridors:corridorComponents(x.shape,x.idx)});
 assert.ok(r.rejects.includes('OPENING_OVER_PRODUCTION'));
});
test('no 2-cell connected named corridor means HOLD, not certified egress',()=>{
 const x=fixture();x.shape.conceptReservations.corridors=[{x:3,z:6}];
 const r=assessFrame({...x,corridors:corridorComponents(x.shape,x.idx)});
 assert.ok(r.rejects.includes('HALL_CLEAR_COMPONENT_TOO_SMALL'));
});
test('unverified portal swing is never described as a verified Bedrock hinge',()=>{
 const x=fixture();x.idx.final.set('3,2,4',{occupied:true});
 const r=assessFrame({...x,corridors:corridorComponents(x.shape,x.idx)});
 assert.ok(r.rejects.includes('NO_ROOM_SIDE_SWING_CLEARANCE'));
 assert.equal(r.swingVerifiedInMinecraft,false);
});
test('each section has no 3D collisions between planned partition and frame/swing, with zero placement operations',()=>{
 for(const s of report.sections){
  const protected3d=new Set();
  for(const d of s.rooms.filter(d=>d.selected)){
   for(const v of [...d.selected.local3DVoxels,...d.selected.localSwingAirReservation]){
    const t=k(v);assert.ok(!protected3d.has(t) || d.selected.local3DVoxels.some(x=>k(x)===t),'unexpected double booking');protected3d.add(t);
   }
  }
  const sites=new Set();
  for(const w of s.partitionCells){assert.equal(w.emitAllowed,false);assert.ok(!sites.has(w.site));sites.add(w.site);
   for(const v of w.localBlockVoxels)assert.ok(!protected3d.has(k(v)),'wall would cross door frame or swing');
  }
  assert.equal(s.actualBlocksEmitted,0);assert.equal(s.worldCommands,0);
 }
});
test('all reoriented or moved doors require redesign of original opening',()=>{
 const accepted=report.sections.flatMap(s=>s.rooms).filter(x=>x.selected).map(x=>x.selected);
 assert.equal(accepted.filter(x=>x.doorReoriented).length,report.totals.proposedDoorReorientations);
 for(const d of accepted.filter(x=>x.doorReoriented||x.originalPortMoved)){
  assert.equal(d.oldOpeningClosure,'UNRESOLVED');assert.equal(d.requiresOldOpeningRedesign,true);
 }
});
test('B79 held and previously reviewable rooms are counted separately; no hidden auto-promotion',()=>{
 const rooms=report.sections.flatMap(s=>s.rooms);
 assert.equal(rooms.filter(r=>!r.previousB79Reviewable&&r.selected).length,report.totals.b79HeldWithNewFrame);
 assert.equal(rooms.filter(r=>r.previousB79Reviewable&&!r.selected).length,report.totals.b79ReviewableNowHeld);
 assert.equal(report.totals.b79HeldWithNewFrame,43);assert.equal(report.totals.b79ReviewableNowHeld,22);
});

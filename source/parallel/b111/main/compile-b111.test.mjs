import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectB111Room,modelB111Interiors,auditB111Model,drawB111RoomAscii}
 from './b111-interior-access.mjs';
import {assembleB111,validateB111Report,writeB111} from './compile-b111.mjs';
let cache;
const all=()=>cache??(cache=assembleB111());
const duplicate=x=>structuredClone(x);
function oneParent(){
 const a=all();
 return {d:a.sourceDesigns[0],b:a.parentB110Models[0]};
}
const sampleRoom=(r,door,fixtures)=>inspectB111Room(
 {id:'test',level:0,purpose:'寝室',x:0,z:0,width:r,depth:r},
 {roomId:'test',level:0,interiorCell:door},
 fixtures.map((p,i)=>({roomId:'test',level:0,role:p.role,sourceCellPreserved:true,
  physicalPlacementValidated:false,localAnchor:{x:p.x,z:p.z,y:1}}))
);
test('01 B111 result report validates',()=>assert(validateB111Report(all().report)));
test('02 5 typologies retained',()=>assert.equal(all().report.totals.typologies,5));
test('03 15 building designs retained',()=>assert.equal(all().models.length,15));
test('04 66 floors retained',()=>assert.equal(all().report.totals.floors,66));
test('05 279 source room layouts analyzed',()=>assert.equal(all().report.totals.rooms,279));
test('06 all 558 original fixture anchor cells tracked',()=>assert.equal(all().report.totals.originalFixtureAnchors,558));
test('07 15 models pass independent source geometry audit',()=>{
 const x=all();
 assert.equal(x.sourceDesigns.length,15);
 assert.equal(x.parentB110Models.length,15);
 for(let i=0;i<15;i++)assert(auditB111Model(
  x.models[i],x.sourceDesigns[i],x.parentB110Models[i]));
});
test('08 rooms accounted for pass or review',()=>{
 const t=all().report.totals;assert.equal(t.roomsWithConnectedSingleCellWalkways+t.roomsRequiringRevision,279);
});
test('09 all rooms retain exactly their source fixture anchor positions',()=>{
 const r=all();
 for(const m of r.models)for(const room of m.rooms){
  assert.equal(room.sourceFixtureAnchors.length,room.furniture.length);
  for(const f of room.furniture){
   const a=room.sourceFixtureAnchors[f.fixtureIndex];
   assert.deepEqual(f.anchor,{x:a.x,z:a.z});
  }
 }
});
test('10 each bed visual footprint is either one unresolved or two adjacent cells',()=>{
 for(const m of all().models)for(const r of m.rooms)
 for(const f of r.furniture.filter(x=>x.role==='bed')){
  assert(f.footprint.length===1||f.footprint.length===2);
  if(f.footprint.length===2)assert.equal(
   Math.abs(f.anchor.x-f.secondaryCell.x)+Math.abs(f.anchor.z-f.secondaryCell.z),1);
 }
});
test('11 no proposed furniture occupies the wall boundary',()=>{
 for(const m of all().models)for(const r of m.rooms)
 for(const f of r.furniture)for(const p of f.footprint){
  const a=r.roomRectangle;assert(p.x>a.x&&p.x<a.x+a.width-1);
  assert(p.z>a.z&&p.z<a.z+a.depth-1);
 }
});
test('12 every accepted room has a clear interior doorway',()=>{
 for(const m of all().models)for(const r of m.rooms)
 if(r.decision==='OFFLINE_ROOM_PATHS_CLEAR')assert.equal(r.stats.doorInteriorClear,true);
});
test('13 every accepted room has connected free interior',()=>{
 for(const m of all().models)for(const r of m.rooms)
 if(r.decision==='OFFLINE_ROOM_PATHS_CLEAR'){
  assert.equal(r.stats.reachableCells,r.stats.freeCells);
  assert.equal(r.stats.fixtureApproachFailures,0);
  assert.equal(r.stats.overlapCells,0);
 }
});
test('14 any unresolved second bed cell is prominently reported',()=>{
 for(const m of all().models)for(const r of m.rooms)
 if(r.stats.bedPairsUnresolved>0)assert(r.issues.includes('BED_SECOND_CELL_NOT_ASSIGNED'));
});
test('15 unverified 2-wide passage does not produce certification',()=>{
 assert.equal(all().report.twoWideCorridorCertification,false);
});
test('16 candidate search tests more than one possibility',()=>{
 assert(all().report.totals.combinationsEvaluated>=all().report.totals.rooms);
});
test('17 simple 6x6 one-bed interior finds accessible 2-cell bed',()=>{
 const r=sampleRoom(6,{x:1,z:1},[{x:4,z:4,role:'bed'}]);
 assert.equal(r.stats.bedPairsAssigned,1);assert.equal(r.decision,'OFFLINE_ROOM_PATHS_CLEAR');
});
test('18 a 4x4 room with one bed cannot fake accessible 2-cell placement',()=>{
 const r=sampleRoom(4,{x:1,z:1},[{x:2,z:2,role:'bed'},{x:1,z:2,role:'desk'}]);
 assert(r.stats.bedPairsUnresolved>0||r.decision==='ROOM_NEEDS_REDESIGN');
});
test('19 fixtures are never allowed to claim doorway interior',()=>{
 const r=sampleRoom(5,{x:1,z:1},[{x:1,z:1,role:'desk'}]);
 assert.equal(r.stats.doorInteriorClear,false);
 assert.equal(r.decision,'ROOM_NEEDS_REDESIGN');
});
test('20 multiple beds cannot overlap each other',()=>{
 const r=sampleRoom(6,{x:1,z:1},[{x:4,z:4,role:'bed'},{x:4,z:2,role:'bed'}]);
 if(r.decision==='OFFLINE_ROOM_PATHS_CLEAR')assert.equal(r.stats.overlapCells,0);
});
test('21 non-bedroom fixtures remain one-cell conceptual models',()=>{
 const r=sampleRoom(7,{x:1,z:1},[{x:5,z:5,role:'desk'},{x:4,z:4,role:'shelf'}]);
 assert(r.furniture.every(f=>f.footprint.length===1));
});
test('22 direct source duplicate fixture anchors are rejected',()=>{
 assert.throws(()=>sampleRoom(6,{x:1,z:1},[{x:4,z:4,role:'bed'},{x:4,z:4,role:'desk'}]),
 /DUPLICATE/);
});
test('23 fake wrong room ID and level fixture rejected',()=>{
 assert.throws(()=>inspectB111Room({id:'a',level:0,x:0,z:0,width:5,depth:5},
 {roomId:'a',level:0,interiorCell:{x:1,z:1}},[{roomId:'b',level:0,
 sourceCellPreserved:true,physicalPlacementValidated:false,localAnchor:{x:3,z:3}}]),
 /BAD_ROOM_SOURCE/);
});
test('24 readable map includes door and all walls',()=>{
 const r=sampleRoom(6,{x:1,z:1},[{x:4,z:4,role:'bed'}]);
 const ascii=drawB111RoomAscii(r);assert(ascii.includes('D'));assert(ascii.includes('#'));assert(ascii.includes('B'));
});
test('25 SHA integrity rejects tampered accessible-pass declarations',()=>{
 const x=duplicate(all().models[0]);x.rooms[0].decision=x.rooms[0].decision==='OFFLINE_ROOM_PATHS_CLEAR'?'ROOM_NEEDS_REDESIGN':'OFFLINE_ROOM_PATHS_CLEAR';
 const {d,b}=oneParent();assert.equal(auditB111Model(x,d,b),false);
});
test('26 all local room candidates explicitly uncertified for physical placement',()=>{
 for(const m of all().models)for(const r of m.rooms){
  assert.equal(r.physicalFurnitureInstalled,false);
  assert.equal(r.completedPhysicalRoom,false);
  assert.equal(r.fireSafetyApproved,false);
 }
});
test('27 report has 0 installed furniture and physically completed rooms',()=>{
 const t=all().report.totals;assert.equal(t.physicallyCompletedRooms,0);
 assert.equal(t.verifiedBlockStatesEducation26_3,0);assert.equal(t.worldContacts,0);
});
test('28 nine frozen construction gates always BLOCKED',()=>{
 const r=all().report;assert.equal(r.gates.length,9);
 assert(r.gates.every(x=>x.status==='BLOCKED'));
});
test('29 export writes JSON, Japanese findings and five area maps',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b111-'));
 try{const x=writeB111(all(),dir);
 assert.equal(x.buildings,15);assert.equal(x.rooms,279);
 assert.equal(JSON.parse(fs.readFileSync(x.modelsFile,'utf8')).length,15);
 assert(fs.readFileSync(x.examplesFile,'utf8').includes('HOUSE'));
 assert(fs.readFileSync(x.mdFile,'utf8').includes('NOT_PREPARED'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('30 invalid construction permission cannot be exported',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b111-reject-'));
 try{const r=duplicate(all());r.report.constructionApproved=true;
 assert.throws(()=>writeB111(r,dir),/UNSAFE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

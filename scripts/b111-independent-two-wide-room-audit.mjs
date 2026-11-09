/**
 * MAB B111 read-only, independent 2x2 room-to-fixture approach review.
 * IMPORTANT: This is stricter than B111's 1-cell 2D connectivity contract.
 * A 2D proxy is NOT a Minecraft path, headroom, door-width or collision proof.
 * No model, network, Minecraft, repository mutation, or world adapter access.
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const key=(x,z)=>x+','+z;
const steps=[[1,0],[-1,0],[0,1],[0,-1]];
const fail=(why)=>{throw Error('B111_2W_AUDIT_'+why)};
const int=(n)=>Number.isSafeInteger(n);
const cell=(p)=>p&&int(p.x)&&int(p.z);
function expandPad(x,z){return [[x,z],[x+1,z],[x,z+1],[x+1,z+1]];}
function connected(seed,allowed){
 const visited=new Set(seed),queue=[...seed];
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i].split(',').map(Number);
  for(const [dx,dz] of steps){const k=key(x+dx,z+dz);
   if(allowed.has(k)&&!visited.has(k)){visited.add(k);queue.push(k);}
  }
 }
 return visited;
}
export function auditRoomTwoWide(room){
 const r=room?.roomRectangle;
 if(!r||![r.x,r.z,r.width,r.depth].every(int)||r.width<4||r.depth<4||
  !cell(room.doorInterior)||!Array.isArray(room.furniture))fail('ROOM_CONTRACT');
 const all=new Set();
 for(let x=r.x+1;x<r.x+r.width-1;x++)
  for(let z=r.z+1;z<r.z+r.depth-1;z++)all.add(key(x,z));
 const blocked=new Set();
 for(const f of room.furniture){
  if(!Array.isArray(f.footprint)||!f.footprint.length||!int(f.fixtureIndex))
   fail('FIXTURE_CONTRACT');
  for(const p of f.footprint){
   if(!cell(p)||!all.has(key(p.x,p.z))||blocked.has(key(p.x,p.z)))
    fail('FIXTURE_OUT_OF_INTERIOR_OR_OVERLAP');
   blocked.add(key(p.x,p.z));
  }
 }
 const free=new Set([...all].filter(k=>!blocked.has(k)));
 const door=key(room.doorInterior.x,room.doorInterior.z);
 if(!free.has(door))fail('DOOR_NOT_FREE_INTERIOR');
 const oneWide=connected([door],free);
 const pads=new Set(),entryPads=[];
 for(let x=r.x+1;x<r.x+r.width-2;x++)
  for(let z=r.z+1;z<r.z+r.depth-2;z++){
   const cells=expandPad(x,z).map(([a,b])=>key(a,b));
   if(cells.every(k=>free.has(k))){const pad=key(x,z);pads.add(pad);
    if(cells.includes(door))entryPads.push(pad);
   }
  }
 const reachablePads=connected(entryPads,pads);
 const reachableTwoWideCells=new Set();
 for(const pad of reachablePads){const [x,z]=pad.split(',').map(Number);
  for(const [a,b] of expandPad(x,z))reachableTwoWideCells.add(key(a,b));
 }
 const failures=[];
 for(const f of room.furniture){
  let approach=false;
  for(const p of f.footprint)for(const [dx,dz] of steps){
   if(reachableTwoWideCells.has(key(p.x+dx,p.z+dz)))approach=true;
  }
  if(!approach)failures.push({fixtureIndex:f.fixtureIndex,role:f.role});
 }
 return {status:entryPads.length&&failures.length===0?'2W_PROXY_CLEAR':'HOLD_2W_FIXTURE_APPROACH',
  originalOneWideReachable:oneWide.size===free.size,
  all2x2Pads:pads.size,entry2x2Pads:entryPads.length,
  connected2x2Pads:reachablePads.size,
  freeCells:free.size,freeCellsOutsideConnected2x2:free.size-[...free].filter(k=>reachableTwoWideCells.has(k)).length,
  unsupportedFixtureApproaches:failures};
}
export function auditB111Layouts(buildings,bytes){
 if(!Array.isArray(buildings)||!buildings.length)fail('BUILDING_LIST');
 const rows=[];
 for(const building of buildings){
  if(typeof building?.id!=='string'||!Array.isArray(building.rooms))fail('BUILDING_CONTRACT');
  for(const room of building.rooms){
   if(!int(room.level)||typeof room.roomId!=='string')fail('ROOM_IDENTITY');
   rows.push({building:building.id,level:room.level,roomId:room.roomId,
    purpose:room.purpose,...auditRoomTwoWide(room)});
  }
 }
 const holding=rows.filter(r=>r.status!=='2W_PROXY_CLEAR');
 const summary={rooms:rows.length,originalOneWideClear:rows.filter(r=>r.originalOneWideReachable).length,
  twoWideProxyClear:rows.length-holding.length,twoWideProxyHold:holding.length,
  unsupportedFixtureApproaches:holding.reduce((n,r)=>n+r.unsupportedFixtureApproaches.length,0),
  roomsMissingEntry2x2:rows.filter(r=>r.entry2x2Pads===0).length};
 return {schema:'mab-b111-independent-two-wide-source-proxy-v1',
  sourceContentSha256:bytes?createHash('sha256').update(bytes).digest('hex'):null,
  methodology:'2D supported-free interior cell proxy; slide connected 2x2 squares rooted at door interior, then require a square cell adjacent to each fixture footprint',
  certification:'NOT_MINECRAFT_NOT_CONTINUOUS_3D_WALKING_NOT_DOOR_WIDTH_NOT_HEADROOM',
  provenance:'PUBLIC_ARCHIVED_B111_CONCEPTUAL_LAYOUTS_NOT_PRIVATE_MODEL_OR_WORLD',
  summary,byBuilding:[...new Set(rows.map(r=>r.building))].map(id=>({building:id,
   rooms:rows.filter(r=>r.building===id).length,hold:holding.filter(r=>r.building===id).length})),
  heldRooms:holding,worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,BuildPlan:{operations:[]},
  gates:Array(9).fill('BLOCKED')};
}
function selftest(){
 const clear={roomRectangle:{x:0,z:0,width:6,depth:6},doorInterior:{x:1,z:4},
  furniture:[{fixtureIndex:0,role:'chair',footprint:[{x:4,z:1}]}]};
 const c=auditRoomTwoWide(clear);
 assert.equal(c.originalOneWideReachable,true);
 assert.equal(c.status,'2W_PROXY_CLEAR');
 const hard={roomRectangle:{x:12,z:9,width:10,depth:4},
  doorInterior:{x:13,z:11},furniture:[
   {fixtureIndex:0,role:'seating',footprint:[{x:20,z:10}]},
   {fixtureIndex:1,role:'seating',footprint:[{x:19,z:10}]}]};
 const h=auditRoomTwoWide(hard);
 assert.equal(h.originalOneWideReachable,true);
 assert.equal(h.status,'HOLD_2W_FIXTURE_APPROACH');
 assert.deepEqual(h.unsupportedFixtureApproaches.map(x=>x.fixtureIndex),[0]);
 assert.throws(()=>auditRoomTwoWide({...hard,doorInterior:{x:20,z:10}}),/DOOR_NOT_FREE/);
 return {selftest:'PASS',worldWrites:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length===3&&process.argv[2]==='--selftest')
   console.log(JSON.stringify(selftest()));
  else if(process.argv.length===6&&process.argv[2]==='--input'&&process.argv[4]==='--out'){
   const bytes=fs.readFileSync(process.argv[3]);
   const report=auditB111Layouts(JSON.parse(bytes.toString('utf8')),bytes);
   fs.writeFileSync(process.argv[5],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify({status:report.summary.twoWideProxyHold?'HOLD_2W_PROXY':'2W_PROXY_CLEAR',
    summary:report.summary,worldWrites:0}));
  }else fail('USAGE_SELFTEST_OR_INPUT_OUT');
 }catch(e){console.error(String(e));process.exitCode=2;}
}

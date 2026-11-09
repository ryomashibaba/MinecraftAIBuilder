/**
 * B111 read-only research: bounded furniture orientation/one-cell relocation.
 * ORIGINAL B110 anchors, B111 room JSON and world remain immutable.
 * 2x2 square circulation is an OFFLINE 2D proxy, not Minecraft certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditB111Layouts,auditRoomTwoWide} from './b111-independent-two-wide-room-audit.mjs';
const PIN='eb55fdeccdc2751081ea1f9ab22ec5f6074012c8bd3bb26e04c9b659aaaf28f0';
const STEPS=[[1,0],[-1,0],[0,1],[0,-1]];
const k=p=>p.x+','+p.z;
const fail=why=>{throw Error('B111_UNADOPTED_WHATIF_'+why)};
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const cells=f=>f.footprint.map(k).sort().join('|');
const less=(a,b)=>{
 if(!b)return true;
 for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]<b[i];
 return false;
};
function options(room,f){
 const r=room.roomRectangle,d=room.doorInterior,out=[];
 for(let x=r.x+1;x<r.x+r.width-1;x++)for(let z=r.z+1;z<r.z+r.depth-1;z++){
  const anchor={x,z},shift=distance(anchor,f.anchor);
  if(shift>1||k(anchor)===k(d))continue;
  const others=f.role==='bed'?STEPS.map(([dx,dz])=>({x:x+dx,z:z+dz})):[null];
  for(const second of others){
   if(second&&(second.x<=r.x||second.x>=r.x+r.width-1||
     second.z<=r.z||second.z>=r.z+r.depth-1||k(second)===k(d)))continue;
   const furniture={...structuredClone(f),anchor,
    footprint:second?[anchor,second]:[anchor],secondaryCell:second,
    plannedBedPair:f.role==='bed'};
   out.push({furniture,shift,shapeChanged:Number(cells(furniture)!==cells(f))});
  }
 }
 return out;
}
export function proposeB111RoomTwoWide(room){
 if(room?.furniture?.length!==2||room.furniture.some(f=>
  !['bed','seating','shelf','desk'].includes(f.role)||
  f.footprint?.length!==(f.role==='bed'?2:1)))fail('UNSUPPORTED_FIXTURE_CONTRACT');
 if(auditRoomTwoWide(room).status==='2W_PROXY_CLEAR')
  return {status:'ALREADY_CLEAR',proposal:null};
 const [left,right]=room.furniture.map(f=>options(room,f));
 let best=null,bestScore=null;
 for(const a of left)for(const b of right){
  const pair=[a,b],footprints=[...a.furniture.footprint,...b.furniture.footprint];
  if(new Set(footprints.map(k)).size!==footprints.length)continue;
  const score=[a.shift+b.shift,Math.max(a.shift,b.shift),
   Number(a.shift>0)+Number(b.shift>0),a.shapeChanged+b.shapeChanged,
   a.furniture.anchor.x,a.furniture.anchor.z,b.furniture.anchor.x,b.furniture.anchor.z,
   cells(a.furniture),cells(b.furniture)];
  if(!less(score,bestScore))continue;
  const proposal=[a.furniture,b.furniture];
  const proof=auditRoomTwoWide({...room,furniture:proposal});
  if(proof.status!=='2W_PROXY_CLEAR'||!proof.originalOneWideReachable)continue;
  best=pair;bestScore=score;
 }
 if(!best)return {status:'HOLD_NO_BOUNDED_RESEARCH_PROPOSAL',proposal:null};
 const fixtureChanges=best.map((v,i)=>({fixtureIndex:room.furniture[i].fixtureIndex,
  role:room.furniture[i].role,originalAnchor:structuredClone(room.furniture[i].anchor),
  researchAnchor:structuredClone(v.furniture.anchor),shift:v.shift,
  originalFootprint:structuredClone(room.furniture[i].footprint),
  researchFootprint:structuredClone(v.furniture.footprint)}));
 return {status:bestScore[0]?'UNADOPTED_SOURCE_ANCHOR_SHIFT':'UNADOPTED_BED_ORIENTATION_ONLY',
  proof:'2D_CONNECTED_2X2_TO_ALL_FIXTURES_ONLY',
  sourceAnchorsChangedInRepository:false,
  totalAnchorShift:bestScore[0],maxAnchorShift:bestScore[1],fixtureChanges};
}
export function auditB111WhatIf(buildings,bytes){
 const digest=createHash('sha256').update(bytes).digest('hex');
 if(digest!==PIN)fail('ARCHIVED_PUBLIC_B111_SHA_MISMATCH');
 const base=auditB111Layouts(buildings,bytes);
 if(buildings.length!==15||base.summary.rooms!==279||
  base.summary.originalOneWideClear!==279||base.summary.twoWideProxyHold!==49||
  buildings.some(b=>b.reviewOnly!==true||b.worldContacts!==0||
   b.constructionApproved!==false||b.executionAllowed!==false||
   b.BuildPlan?.operations?.length!==0))fail('ORIGINAL_BASELINE_SAFETY_OR_COUNT');
 const rows=new Map(buildings.flatMap(b=>b.rooms.map(r=>[b.id+':'+r.level+':'+r.roomId,r])));
 const immutable=JSON.stringify(buildings),proposals=[];
 for(const held of base.heldRooms){
  const room=rows.get(held.building+':'+held.level+':'+held.roomId);
  if(!room)fail('SOURCE_ROOM_MISSING');
  const result=proposeB111RoomTwoWide(room);
  if(!['UNADOPTED_BED_ORIENTATION_ONLY','UNADOPTED_SOURCE_ANCHOR_SHIFT',
     'HOLD_NO_BOUNDED_RESEARCH_PROPOSAL'].includes(result.status))fail('INVALID_RESULT');
  proposals.push({building:held.building,level:held.level,roomId:held.roomId,
   roomRectangle:structuredClone(room.roomRectangle),...result});
 }
 if(JSON.stringify(buildings)!==immutable)fail('SOURCE_MUTATED');
 const orientation=proposals.filter(r=>r.status==='UNADOPTED_BED_ORIENTATION_ONLY').length;
 const shifted=proposals.filter(r=>r.status==='UNADOPTED_SOURCE_ANCHOR_SHIFT').length;
 const held=proposals.filter(r=>r.status==='HOLD_NO_BOUNDED_RESEARCH_PROPOSAL').length;
 return {schema:'b111-two-wide-unadopted-furniture-research-v1',sourceSha256:digest,
  sourceStatus:'ORIGINAL_15_BUILDINGS_IMMUTABLE',
  scope:'FIXTURE_ORIENTATION_OR_ONE_CELL_ANCHOR_SHIFT_NO_ROOM_OR_DOOR_EDITS',
  limitations:'2D square circulation only; B110 anchors and bed block shapes remain unverified; not an adopted design or Minecraft walking',
  summary:{totalRooms:279,original1WidePass:279,initial2WidePass:230,
   initial2WideHold:49,orientationOnly:orientation,sourceAnchorShiftRequired:shifted,
   unresolved:held,projected2WidePass:230+orientation+shifted,
   actualRoomsModified:0},
  safety:{worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
   constructionApproved:false,executionAllowed:false,
   gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}},
  unadopted:proposals};
}
function selftest(){
 const room={roomRectangle:{x:25,z:9,width:5,depth:6},doorInterior:{x:26,z:10},
  furniture:[{fixtureIndex:0,role:'bed',anchor:{x:28,z:13},footprint:[{x:28,z:13},{x:27,z:13}]},
   {fixtureIndex:1,role:'bed',anchor:{x:28,z:12},footprint:[{x:28,z:12},{x:27,z:12}]}]};
 const original=JSON.stringify(room),proposed=proposeB111RoomTwoWide(room);
 if(proposed.status!=='UNADOPTED_BED_ORIENTATION_ONLY'||JSON.stringify(room)!==original)
  fail('SELFTEST_ORIENTATION_OR_IMMUTABILITY');
 const furniture=room.furniture.map((f,i)=>({...f,
  anchor:proposed.fixtureChanges[i].researchAnchor,
  footprint:proposed.fixtureChanges[i].researchFootprint}));
 if(auditRoomTwoWide({...room,furniture}).status!=='2W_PROXY_CLEAR')fail('SELFTEST_SOURCE_PASS');
 return {status:'PASS',worldWrites:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length===3&&process.argv[2]==='--selftest')console.log(JSON.stringify(selftest()));
  else if(process.argv.length===7&&process.argv[2]==='--whatif'&&
   process.argv[3]==='--input'&&process.argv[5]==='--out'){
   const bytes=fs.readFileSync(process.argv[4]);
   const report=auditB111WhatIf(JSON.parse(bytes.toString('utf8')),bytes);
   const output=process.argv[6],root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
   if(!path.isAbsolute(output)||output===root||output.startsWith(root+path.sep))
    fail('OUTPUT_MUST_BE_ABSOLUTE_AND_OUTSIDE_REPO');
   fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify({status:'UNADOPTED_2D_WHATIF_ONLY',summary:report.summary}));
  }else fail('USAGE');
 }catch(e){console.error(String(e));process.exitCode=2;}
}

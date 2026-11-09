/**
 * B111 non-adopted research: bounded B105-AND-B111 furniture candidate.
 * B105 demands every remaining 1-cell floor position be accessible;
 * B111's stronger connected 2x2 approach alone does NOT imply this.
 * This changes no original stage, block-state, or Minecraft world.
 */
import {auditRoomTwoWide} from './b111-independent-two-wide-room-audit.mjs';
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const key=p=>p.x+','+p.z;
const clone=x=>structuredClone(x);
const die=x=>{throw Error('B111_B105_JOINT_'+x)};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const internal=(p,r)=>p.x>r.x&&p.x<r.x+r.width-1&&p.z>r.z&&p.z<r.z+r.depth-1;
const manhattan=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.z-q.z);
const normRoom=r=>r?.roomRectangle&&r?.doorInterior&&Array.isArray(r.furniture)&&r.furniture.length===2&&
 Array.isArray(r.sourceFixtureAnchors)&&r.sourceFixtureAnchors.length===2;
function connected(start,allowed){
 const begin=key(start);
 if(!allowed.has(begin))return new Set();
 const seen=new Set([begin]),q=[start];
 for(let i=0;i<q.length;i++)for(const [dx,dz] of dirs){
  const p={x:q[i].x+dx,z:q[i].z+dz},k=key(p);
  if(allowed.has(k)&&!seen.has(k)){seen.add(k);q.push(p);}
 }
 return seen;
}
function b105WholeRoomAccess(room,fixtures){
 const r=room.roomRectangle,blocked=new Set(fixtures.map(x=>key(x.anchor)));
 if(blocked.size!==fixtures.length||blocked.has(key(room.doorInterior)))return false;
 const allowed=new Set();
 for(let z=r.z+1;z<r.z+r.depth-1;z++)for(let x=r.x+1;x<r.x+r.width-1;x++){
  const k=x+','+z;if(!blocked.has(k))allowed.add(k);
 }
 return allowed.size>=3&&connected(room.doorInterior,allowed).size===allowed.size;
}
function fixtureOptions(room,f){
 const result=[],r=room.roomRectangle,door=room.doorInterior;
 if(!['bed','seating','shelf','desk','generic'].includes(f.role))die('ROLE_UNSUPPORTED');
 for(let z=r.z+1;z<r.z+r.depth-1;z++)for(let x=r.x+1;x<r.x+r.width-1;x++){
  const anchor={x,z},shift=manhattan(anchor,f.anchor);
  if(shift>1||key(anchor)===key(door))continue;
  const secondary=f.role==='bed'?dirs.map(([dx,dz])=>({x:x+dx,z:z+dz})):[null];
  for(const next of secondary){
   if(next&&(!internal(next,r)||key(next)===key(door)))continue;
   result.push({fixture:{...clone(f),anchor,footprint:next?[anchor,next]:[anchor],
    secondaryCell:next,plannedBedPair:f.role==='bed'},shift});
  }
 }
 return result;
}
const isBetter=(a,b)=>!b||a.some((x,i)=>{
 if(x===b[i])return false;
 return x<b[i]&&a.slice(0,i).every((v,j)=>v===b[j]);
});
/**
 * Find the lowest-movement original-B111-style option satisfying BOTH
 * B105 complete 1-wide walkability AND B111 connected 2x2 fixture access.
 */
export function selectB105AndB111JointCandidate(room){
 if(!normRoom(room)||!room.furniture.every((f,i)=>{
  const original=room.sourceFixtureAnchors[i];
  return Number.isSafeInteger(f.anchor?.x)&&Number.isSafeInteger(f.anchor?.z)&&
   f.anchor.x===original?.x&&f.anchor.z===original?.z&&
   (f.role==='bed'?f.footprint?.length===2:f.footprint?.length===1);
 }))die('SOURCE_CONTRACT');
 const before=JSON.stringify(room);
 const original=auditRoomTwoWide(room);
 if(!original.originalOneWideReachable)die('BASELINE_1W_ALREADY_INVALID');
 const options=room.furniture.map(f=>fixtureOptions(room,f));
 let best=null,rank=null,count=0,passes=0;
 for(const a of options[0])for(const b of options[1]){
  count++;
  const selected=[a.fixture,b.fixture];
  const cells=selected.flatMap(f=>f.footprint.map(key));
  if(new Set(cells).size!==cells.length||cells.includes(key(room.doorInterior)))continue;
  if(!b105WholeRoomAccess(room,selected))continue;
  const p=auditRoomTwoWide({...room,furniture:selected});
  if(p.status!=='2W_PROXY_CLEAR'||!p.originalOneWideReachable)continue;
  passes++;
  const rankNow=[a.shift+b.shift,Math.max(a.shift,b.shift),Number(a.shift>0)+Number(b.shift>0),
   Number(!eq(selected[0].footprint,room.furniture[0].footprint))+
   Number(!eq(selected[1].footprint,room.furniture[1].footprint)),
   selected[0].anchor.x,selected[0].anchor.z,selected[1].anchor.x,selected[1].anchor.z];
  if(isBetter(rankNow,rank)){best=selected;rank=rankNow;}
 }
 if(before!==JSON.stringify(room))die('ORIGINAL_INPUT_MUTATED');
 if(!best)return {status:'HOLD_NO_JOINT_SAFE_CANDIDATE',searched:count,passes,
  fixtureChanges:[],maxAnchorShift:null,totalAnchorShift:null};
 const changes=best.map((f,i)=>{
  const old=room.furniture[i],shift=manhattan(old.anchor,f.anchor);
  return {fixtureIndex:old.fixtureIndex,role:old.role,originalAnchor:clone(old.anchor),
   researchAnchor:clone(f.anchor),shift,originalFootprint:clone(old.footprint),
   researchFootprint:clone(f.footprint)};
 });
 return {status:'UNADOPTED_JOINT_B105_B111_SOURCE_ONLY',searched:count,passes,
  fixtureChanges:changes,totalAnchorShift:rank[0],maxAnchorShift:rank[1],
  originalPreserved:true,worldWrites:0};
}

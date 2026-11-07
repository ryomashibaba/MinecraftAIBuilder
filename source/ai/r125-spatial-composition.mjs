/**
 * Opt-in generic architectural composition: AI chooses functional rooms,
 * dimensions, roof heights and a relative adjacency tree. HOST computes only
 * safe exact coordinates and real B143 voxels. No typology-specific templates.
 * Minimum 6x6 allows a 4x4 usable clear interior before source route checks.\n * Every accepted original still must satisfy REAL 2-wide voxel circulation.\n * Never approves Minecraft construction.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
export const SCHEMA='minecraftaibuilder-r125-spatial-composition-v1';
const fail=s=>{throw Error('R125_SPATIAL_'+s)};
const int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const keys=(o,ks)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join(',')===ks.slice().sort().join(',');
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const prose=s=>typeof s==='string'&&s.length>=3&&s.length<=500&&!/[<>]/.test(s);
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const maxX=r=>r.x+r.width-1;
const maxZ=r=>r.z+r.depth-1;
const overlap=(a,b,axis)=>axis==='x'?
 [Math.max(a.x,b.x),Math.min(maxX(a),maxX(b))]:
 [Math.max(a.z,b.z),Math.min(maxZ(a),maxZ(b))];
const span=r=>r[1]-r[0]+1;
export function validateSpatialComposition(p){
 if(!keys(p,['schema','id','title','brief','materials','rooms'])||
  p.schema!==SCHEMA||!slug(p.id)||!prose(p.title)||!prose(p.brief)||
  !keys(p.materials,['floor','wall','roof'])||
  !['wood','stone','concrete'].includes(p.materials.floor)||
  !['concrete','stone','wood','metal'].includes(p.materials.wall)||
  !['stone','metal','wood','concrete'].includes(p.materials.roof))
   fail('PLAN_CONTRACT');
 if(!Array.isArray(p.rooms)||p.rooms.length<2||p.rooms.length>5)
  fail('ROOM_COUNT');
 const seen=new Set();
 for(const [i,r] of p.rooms.entries()){
  if(!keys(r,i===0?['id','purpose','width','depth','roofY']:
    ['id','purpose','width','depth','roofY','attach'])||
   !slug(r.id)||seen.has(r.id)||!prose(r.purpose)||
   !int(r.width,6,14)||!int(r.depth,6,14)||!int(r.roofY,6,10))
    fail('ROOM_CONTRACT');
  if(i>0&&(!keys(r.attach,['to','side','shift'])||
    !seen.has(r.attach.to)||
    !['east','west','north','south'].includes(r.attach.side)||
    !int(r.attach.shift,-3,3)))fail('ADJACENCY_CONTRACT');
  seen.add(r.id);
 }
 return true;
}
export function placeSpatialRooms(plan){
 validateSpatialComposition(plan);
 const rooms=[],byId=new Map(),doors=[];
 for(const [i,r] of plan.rooms.entries()){
  const p=i?byId.get(r.attach.to):null;
  let x=0,z=0;
  if(p){
   const {side,shift}=r.attach;
   if(side==='east'||side==='west'){
    x=side==='east'?maxX(p):p.x-r.width+1;
    z=p.z+Math.floor((p.depth-r.depth)/2)+shift;
   }else{
    z=side==='south'?maxZ(p):p.z-r.depth+1;
    x=p.x+Math.floor((p.width-r.width)/2)+shift;
   }
  }
  const placed={...r,x,z};
  for(const prior of rooms)
   if(span(overlap(prior,placed,'x'))>1&&
      span(overlap(prior,placed,'z'))>1)
    fail('VOLUMES_OVERLAP_'+r.id);
  if(p){
   const axis=['east','west'].includes(r.attach.side)?'z':'x';
   const common=overlap(p,placed,axis);
   const joint=overlap(p,placed,axis==='z'?'x':'z');
   if(span(common)<4||span(joint)!==1)fail('NO_TWO_WIDE_CONNECTION_'+r.id);
   doors.push({axis,wall:joint[0],along:common[0]+Math.floor((span(common)-2)/2)});
  }
  rooms.push(placed);byId.set(r.id,placed);
 }
 const root=rooms[0],entryX=root.x+Math.floor((root.width-2)/2);
 for(const other of rooms.slice(1))
  if(other.z<=root.z&&maxZ(other)>=root.z&&
     other.x<=entryX+1&&maxX(other)>=entryX)
   fail('PUBLIC_ENTRY_NOT_EXTERIOR');
 return {rooms,doors,entrance:{x:entryX,z:root.z}};
}
export function compileSpatialComposition(value){
 const plan=structuredClone(value),raw=placeSpatialRooms(plan);
 const sx=2-Math.min(...raw.rooms.map(r=>r.x));
 const sz=2-Math.min(...raw.rooms.map(r=>r.z));
 const rooms=raw.rooms.map(r=>({...r,x:r.x+sx,z:r.z+sz}));
 const doors=raw.doors.map(d=>({...d,
  wall:d.wall+(d.axis==='z'?sx:sz),
  along:d.along+(d.axis==='z'?sz:sx)}));
 const bounds={width:Math.max(...rooms.map(maxX))+3,
  height:Math.max(...rooms.map(r=>r.roofY))+3,
  depth:Math.max(...rooms.map(maxZ))+3};
 if(bounds.width>128||bounds.depth>128)fail('BOUNDS');
 const elements=[],mat=plan.materials;
 const box=(id,mode,material,origin,size)=>elements.push({
  id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size});
 for(const [i,r] of rooms.entries()){
  const tag='space-'+i;
  box(tag+'-floor','add',mat.floor,[r.x,1,r.z],[r.width,1,r.depth]);
  box(tag+'-west','add',mat.wall,[r.x,2,r.z],[1,r.roofY-2,r.depth]);
  box(tag+'-east','add',mat.wall,[maxX(r),2,r.z],[1,r.roofY-2,r.depth]);
  box(tag+'-front','add',mat.wall,[r.x+1,2,r.z],[r.width-2,r.roofY-2,1]);
  box(tag+'-rear','add',mat.wall,[r.x+1,2,maxZ(r)],[r.width-2,r.roofY-2,1]);
  box(tag+'-roof','add',mat.roof,[r.x,r.roofY,r.z],[r.width,1,r.depth]);
 }
 // CUT last, after every volume is created, to preserve real thresholds.
 const entrance=[raw.entrance.x+sx,2,raw.entrance.z+sz];
 box('exterior-entrance','cut',null,entrance,[2,3,1]);
 doors.forEach((d,i)=>box('joint-'+i,'cut',null,
  d.axis==='z'?[d.wall,2,d.along]:[d.along,2,d.wall],
  d.axis==='z'?[1,3,2]:[2,3,1]));
 // Only add glazing to an entirely exposed wall, never to a joint/door.
 let windows=0;
 for(const [i,r] of rooms.entries()){
  const cands=[
   {axis:'z',wall:maxZ(r),side:'rear',at:[r.x+2,3,maxZ(r)],size:[2,2,1]},
   {axis:'x',wall:maxX(r),side:'east',at:[maxX(r),3,r.z+2],size:[1,2,2]},
   {axis:'x',wall:r.x,side:'west',at:[r.x,3,r.z+2],size:[1,2,2]},
   {axis:'z',wall:r.z,side:'front',at:[r.x+2,3,r.z],size:[2,2,1]}
  ];
  for(const c of cands){
   if(i===0&&c.side==='front')continue;
   if(rooms.some(o=>o.id!==r.id&&
    (c.axis==='z'?o.z<=c.wall&&maxZ(o)>=c.wall&&span(overlap(r,o,'x'))>0:
      o.x<=c.wall&&maxX(o)>=c.wall&&span(overlap(r,o,'z'))>0)))continue;
   box('glaze-'+i+'-void','cut',null,c.at,c.size);
   box('glaze-'+i+'-glass','add','glass',c.at,c.size);
   windows++;break;
  }
 }
 if(windows===0)fail('NO_EXTERIOR_WINDOW');
 const design={schema:B143,id:plan.id,title:plan.title,brief:plan.brief,
  bounds,elements,designOnly:true};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('SOURCE_MISMATCH');
 const program=[{level:0,standingFloorY:2,zones:rooms.map(r=>({
  id:r.id,purpose:r.purpose,
  range:{x:[r.x+1,maxX(r)-1],z:[r.z+1,maxZ(r)-1]}
 }))}];
 const result={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  planSha256:digest(plan),plan,design,compiled,program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  modelAuthorship:'CALLER_PROVIDED_PLAN_UNVERIFIED',
  geometricRules:'MODEL_PROGRAM_TREE_HOST_GENERIC_VOXEL_COMPILER',
  architecturalQuality:'NOT_REVIEWED',inGameWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED')};
 const routes=auditR125SourceRoutes(result);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   routes.zones.length!==rooms.length||
   routes.zones.some(z=>!z.reachedFromEntrance))
  fail('REAL_VOXEL_CIRCULATION_HOLD');
 return {...result,sourceRoutes:routes,layout:{
  rooms:rooms.map(r=>({id:r.id,x:r.x,z:r.z,width:r.width,depth:r.depth,roofY:r.roofY})),
  connectedDoors:doors.length,exteriorWindows:windows
 }};
}

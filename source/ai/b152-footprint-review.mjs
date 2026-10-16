/**
 * B152: bounded 2-D footprint sweep across LOCAL floor voxels.
 *
 * A placement is valid only when EVERY tile beneath a rectangular footprint
 * supports the player and EVERY foot/head cell above it is empty. A route
 * moves the entire footprint one cardinal cell at a time on the SAME Y LEVEL.
 * That also prevents diagonal corner cutting. This is not a Minecraft player
 * collision or jumping/stair/slope certification.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-b152-footprint-v1';
const key=(x,y,z)=>x+','+y+','+z;
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const good=(condition,why)=>{if(!condition)throw Error('B152_'+why);};
const pt=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=128);
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
export function analyzeFootprint(scene,{start,destinations,width=2,depth=2,headroom=2,maxNodes=160000}={}){
 good(scene?.designOnly===true&&scene?.readiness==='NOT_PREPARED'&&
  scene?.worldContacts===0&&scene?.worldCoordinates===null&&
  scene?.BuildPlan?.operations?.length===0&&
  /^[a-f0-9]{64}$/.test(scene.geometrySha256||'')&&
  /^[a-f0-9]{64}$/.test(scene.sourceSha256||'')&&
  Array.isArray(scene.primitives)&&scene.primitives.length>0&&
  scene.primitives.length<=160000,'INVALID_SCENE');
 good(pt(start)&&Array.isArray(destinations)&&destinations.length>=1&&
  destinations.length<=12&&destinations.every(x=>x&&
   /^[a-z][a-z0-9-]{1,39}$/.test(x.id||'')&&pt(x.at))&&
  new Set(destinations.map(x=>x.id)).size===destinations.length,
  'WAYPOINTS');
 good([width,depth,headroom].every(n=>Number.isSafeInteger(n)&&n>=1&&n<=6)&&
  Number.isSafeInteger(maxNodes)&&maxNodes>=1&&maxNodes<=160000,'FOOTPRINT_SIZE_OR_BUDGET');
 const solids=new Set();
 for(const p of scene.primitives){
  good(Array.isArray(p)&&p.length===5&&p.slice(0,3).every(n=>Number.isSafeInteger(n)&&n>=0&&n<=128),
   'MALFORMED_VOXELS');
  const k=key(p[0],p[1],p[2]);good(!solids.has(k),'DUPLICATE_VOXELS');
  solids.add(k);
 }
 const floor=new Map();
 for(const p of scene.primitives){
  const [x,sy,z]=p,fy=sy+1,k=key(x,fy,z);
  if(fy+headroom>128)continue;
  let clear=true;
  for(let h=0;h<headroom;h++)if(solids.has(key(x,fy+h,z))){clear=false;break;}
  if(clear)floor.set(k,[x,fy,z]);
 }
 function fits(x,y,z){
  for(let dx=0;dx<width;dx++)for(let dz=0;dz<depth;dz++)
   if(!floor.has(key(x+dx,y,z+dz)))return false;
  return true;
 }
 const candidates=new Map();
 for(const [k,[x,y,z]] of floor)if(fits(x,y,z))candidates.set(k,[x,y,z]);
 const origin=key(...start),seen=new Set(),parent=new Map(),queue=[];
 if(candidates.has(origin)){seen.add(origin);queue.push(origin);}
 let limited=false;
 for(let i=0;i<queue.length;i++){
  if(i>=maxNodes){limited=true;break;}
  const [x,y,z]=candidates.get(queue[i]);
  for(const [dx,dz] of dirs){
   const k=key(x+dx,y,z+dz);
   if(candidates.has(k)&&!seen.has(k)){
    seen.add(k);parent.set(k,queue[i]);queue.push(k);
   }
  }
 }
 const targets=destinations.map(d=>{
  const destination=key(...d.at);
  let status=!candidates.has(origin)?'INVALID_START_FOOTPRINT':
   !candidates.has(destination)?'INVALID_GOAL_FOOTPRINT':
   seen.has(destination)?'PASS_FLAT_FOOTPRINT_GEOMETRY':
   limited?'UNKNOWN_SEARCH_LIMIT':'FOOTPRINT_UNREACHABLE';
  let path=[];
  if(status==='PASS_FLAT_FOOTPRINT_GEOMETRY'){
   let current=destination;
   for(let i=0;i<=seen.size;i++){
    path.push(candidates.get(current));
    if(current===origin)break;
    current=parent.get(current);
    good(current,'BROKEN_PATH');
   }
   path.reverse();
   good(JSON.stringify(path[0])===JSON.stringify(start)&&
    JSON.stringify(path.at(-1))===JSON.stringify(d.at),'PATH_INTEGRITY');
  }
  return {id:d.id,at:d.at,status,steps:path.length?path.length-1:null,
   path,geometryOnly:true,stairsCertified:false,playerCollisionCertified:false};
 });
 const report={
  schema:SCHEMA,sourceSha256:scene.sourceSha256,geometrySha256:scene.geometrySha256,
  start,width,depth,headroom,supportedStandingCells:floor.size,
  fittingFootprintAnchors:candidates.size,reachableFootprintAnchors:seen.size,
  searchLimited:limited,targets,
  interpretation:'Rectangular floor footprint and headroom in exact local voxels, axis-aligned cardinal flat moves only. No diagonal corner cutting, vertical steps, entity hitbox, turning dynamics or Minecraft Education runtime certification.',
  geometryOnly:true,stairsCertified:false,playerCollisionCertified:false,
  constructionApproved:false,readiness:'NOT_PREPARED',worldContacts:0,
  worldCoordinates:null,BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')
 };
 return {...report,sha256:digest(report)};
}
export function verifyFootprint(scene,params,report){
 try{
  return JSON.stringify(analyzeFootprint(scene,params))===JSON.stringify(report)&&
   report.constructionApproved===false&&report.gates?.length===9&&
   report.gates.every(x=>x==='BLOCKED')&&report.BuildPlan.operations.length===0;
 }catch{return false;}
}

/**
 * B149 local-voxel traversal audit. Conceptual flat walking only.
 * Treat every DSL material as an occupied 1m cell; no staircase/door/ladder
 * semantics or Minecraft Education world writes are implied.
 */
import {createHash} from 'node:crypto';
export const TRAVERSAL_SCHEMA='minecraftaibuilder-b149-traversability-v1';
const key=(x,y,z)=>x+','+y+','+z;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const ok=(b,m)=>{if(!b)throw Error('B149_'+m);};
const point=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=128);
const deltas=[[1,0],[-1,0],[0,1],[0,-1]];

/**
 * A standing position is the EMPTY cell directly above a SOLID floor cell,
 * with another EMPTY cell for the head. This rejects solid 'air-looking' glass
 * and one-cell-high tunnels. Standing on a one-voxel rise is only a *candidate*
 * until actual stair/slab/step semantics are known. It is never included in BFS.
 */
export function analyzeTraversability(scene,{entrance,destinations,maxNodes=160000}={}){
 ok(scene?.designOnly===true&&scene?.readiness==='NOT_PREPARED'&&
  scene?.BuildPlan?.operations?.length===0&&scene?.worldContacts===0&&
  scene?.worldCoordinates===null&&
  /^[a-f0-9]{64}$/.test(scene.geometrySha256||'')&&
  Array.isArray(scene.primitives)&&scene.primitives.length>0&&scene.primitives.length<=160000,
  'UNSAFE_OR_INVALID_SCENE');
 ok(point(entrance)&&Array.isArray(destinations)&&destinations.length>=1&&
  destinations.length<=12&&destinations.every(d=>d&&typeof d.id==='string'&&
   /^[a-z0-9-]{2,40}$/.test(d.id)&&point(d.at))&&
  new Set(destinations.map(d=>d.id)).size===destinations.length,
  'INVALID_WAYPOINTS');
 ok(Number.isSafeInteger(maxNodes)&&maxNodes>=1&&maxNodes<=160000,'INVALID_BUDGET');
 const occupied=new Set();
 for(const p of scene.primitives){
  ok(Array.isArray(p)&&p.length===5&&p.slice(0,3).every(x=>Number.isSafeInteger(x)&&x>=0&&x<=128),
   'INVALID_PRIMITIVES');
  const k=key(p[0],p[1],p[2]);ok(!occupied.has(k),'DUPLICATE_VOXEL');occupied.add(k);
 }
 const standing=new Map();
 let roofed=0;
 for(const p of scene.primitives){
  const [x,y,z]=p,fy=y+1,k=key(x,fy,z);
  if(fy>=128||occupied.has(k)||occupied.has(key(x,fy+1,z)))continue;
  const underRoof=Array.from({length:8},(_,i)=>fy+2+i).some(h=>occupied.has(key(x,h,z)));
  standing.set(k,{at:[x,fy,z],underRoof});
  if(underRoof)roofed++;
 }
 const origin=key(...entrance);
 let visited=new Set(),parent=new Map(),candidateVerticalEdges=0,limitHit=false;
 if(standing.has(origin)){
  const queue=[origin];visited.add(origin);
  for(let i=0;i<queue.length;i++){
   if(i>=maxNodes){limitHit=true;break;}
   const [x,y,z]=standing.get(queue[i]).at;
   for(const [dx,dz] of deltas){
    const next=key(x+dx,y,z+dz);
    if(standing.has(next)&&!visited.has(next)){
     visited.add(next);parent.set(next,queue[i]);queue.push(next);
    }
   }
  }
 }
 // Count only possible 1-cell elevation changes adjacent to the accessible
 // component; NEVER route over these without supported stair/step semantics.
 for(const k of visited){
  const [x,y,z]=standing.get(k).at;
  for(const [dx,dz] of deltas)
   for(const dy of [-1,1])
    if(standing.has(key(x+dx,y+dy,z+dz)))candidateVerticalEdges++;
 }
 const routes=destinations.map(d=>{
  const k=key(...d.at),walkable=standing.has(k);
  let status=!standing.has(origin)?'INVALID_ENTRANCE':
   !walkable?'INVALID_DESTINATION':visited.has(k)?'PASS_FLAT_GEOMETRY':
   limitHit?'UNKNOWN_BUDGET':'UNREACHABLE';
  let path=[];
  if(status==='PASS_FLAT_GEOMETRY'){
   for(let cur=k;cur!==undefined;cur=parent.get(cur)){
    path.push(standing.get(cur).at);
    if(cur===origin)break;
   }
   path.reverse();
   ok(path.length>=1&&JSON.stringify(path[0])===JSON.stringify(entrance),'BAD_RECONSTRUCTION');
  }
  return {id:d.id,at:d.at,status,walkable,flatSteps:path.length?path.length-1:null,
   path, physicallyCertified:false,stairsCertified:false};
 });
 const payload={
  schema:TRAVERSAL_SCHEMA,geometrySha256:scene.geometrySha256,
  sourceSha256:scene.sourceSha256,entrance,
  standingCells:standing.size,roofedStandingCells:roofed,
  connectedFlatStandingCells:visited.size,possibleOneBlockTransitions:candidateVerticalEdges,
  destinationCount:routes.length,routes,
  interpretation:'Flat face-adjacent empty-foot-and-head cells over occupied floors only; not a physics, stairs, enclosure, or Minecraft runtime certification.',
  geometryOnly:true,stairsCertified:false,physicalStructuralProof:false,
  constructionApproved:false,readiness:'NOT_PREPARED',worldContacts:0,worldCoordinates:null,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 return {...payload,sha256:hash(payload)};
}
export function verifyTraversability(scene,params,report){
 try{
  const expected=analyzeTraversability(scene,params);
  return JSON.stringify(expected)===JSON.stringify(report)&&
   report.gates.length===9&&report.gates.every(s=>s==='BLOCKED')&&
   report.BuildPlan.operations.length===0;
 }catch{return false;}
}

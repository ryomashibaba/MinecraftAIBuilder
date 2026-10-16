/**
 * B153 — discrete local-voxel transition-envelope proposals.
 *
 * Conservative rectangular full-cell footprint (not a Minecraft hitbox).
 * For a +/-1 rise with one cardinal cell of motion, support solids must NOT
 * occupy any old/new overlapping foot/head volume. This rejects plausible-
 * looking but intersecting large-body "step" transitions.
 *
 * It does NOT certify jumps, slabs, stairs, entity acceleration, swept
 * time-continuous collision, fall damage, or actual Education behavior.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-b153-transition-envelope-v1';
const K=(x,y,z)=>x+','+y+','+z;
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const guard=(c,s)=>{if(!c)throw Error('B153_'+s);};
const pt=x=>Array.isArray(x)&&x.length===3&&x.every(v=>Number.isSafeInteger(v)&&v>=0&&v<=128);
const dirs=[[0,1],[1,0],[0,-1],[-1,0]];
class Queue {
 constructor(){this.a=[];}
 push(v){const a=this.a;let i=a.length;a.push(v);while(i){const j=(i-1)>>1;if(a[j][0]<=v[0])break;a[i]=a[j];i=j;}a[i]=v;}
 pop(){const a=this.a,root=a[0],v=a.pop();if(a.length){let i=0;while(2*i+1<a.length){let j=2*i+1;if(j+1<a.length&&a[j+1][0]<a[j][0])j++;if(a[j][0]>=v[0])break;a[i]=a[j];i=j;}a[i]=v;}return root;}
 get size(){return this.a.length;}
}
export function analyzeTransitionEnvelopes(scene,{start,destinations,width=1,depth=1,headroom=2,maxNodes=160000}={}){
 guard(scene?.designOnly===true&&scene?.readiness==='NOT_PREPARED'&&
  scene?.worldContacts===0&&scene?.worldCoordinates===null&&
  scene?.BuildPlan?.operations?.length===0&&
  /^[a-f0-9]{64}$/.test(scene.sourceSha256||'')&&
  /^[a-f0-9]{64}$/.test(scene.geometrySha256||'')&&
  Array.isArray(scene.primitives)&&scene.primitives.length>0&&scene.primitives.length<=160000,
  'UNSAFE_SCENE');
 guard(pt(start)&&Array.isArray(destinations)&&destinations.length>=1&&
  destinations.length<=12&&destinations.every(d=>d&&pt(d.at)&&
   /^[a-z][a-z0-9-]{1,39}$/.test(d.id||''))&&
  new Set(destinations.map(d=>d.id)).size===destinations.length,'WAYPOINTS');
 guard([width,depth,headroom].every(x=>Number.isSafeInteger(x)&&x>=1&&x<=6)&&
  Number.isSafeInteger(maxNodes)&&maxNodes>=1&&maxNodes<=160000,'LIMITS');
 const solids=new Set();
 for(const p of scene.primitives){
  guard(Array.isArray(p)&&p.length===5&&p.slice(0,3).every(v=>Number.isSafeInteger(v)&&v>=0&&v<=128),'MALFORMED');
  const k=K(p[0],p[1],p[2]);guard(!solids.has(k),'DUPLICATE');solids.add(k);
 }
 const standing=new Map();
 for(const p of scene.primitives){
  const [x,sy,z]=p,y=sy+1;
  if(y+headroom>128)continue;
  let clear=true;
  for(let dy=0;dy<headroom;dy++)if(solids.has(K(x,y+dy,z))){clear=false;break;}
  if(clear)standing.set(K(x,y,z),[x,y,z]);
 }
 function fits(x,y,z){
  for(let dx=0;dx<width;dx++)for(let dz=0;dz<depth;dz++)
   if(!standing.has(K(x+dx,y,z+dz)))return false;
  return true;
 }
 const anchors=new Map();
 for(const [k,[x,y,z]] of standing)if(fits(x,y,z))anchors.set(k,[x,y,z]);
 // For a height change, check whether the *new support* intersects the
 // departure occupied footprint, and vice versa. Both are full-cell local
 // approximations, deliberately stricter than a real .6-wide player hitbox.
 function sweptOverlapBlocked(a,b){
  const [x,ay,z]=a,[nx,by,nz]=b;
  for(let dx=0;dx<width;dx++)for(let dz=0;dz<depth;dz++){
   const bx=nx+dx,bz=nz+dz;
   if(bx>=x&&bx<x+width&&bz>=z&&bz<z+depth){
    if(by>ay&&solids.has(K(bx,by-1,bz)))return true;
    if(by<ay&&solids.has(K(bx,ay-1,bz)))return true;
   }
  }
  return false;
 }
 const origin=K(...start),dist=new Map(),prev=new Map(),heap=new Queue();
 if(anchors.has(origin)){dist.set(origin,0);heap.push([0,origin]);}
 let examined=0,blockedCandidates=0,verticalCandidateEdges=0,limited=false;
 while(heap.size){
  const [cost,current]=heap.pop();if(dist.get(current)!==cost)continue;
  if(examined>=maxNodes){limited=true;break;}
  examined++;
  const [x,y,z]=anchors.get(current);
  for(const [dx,dz] of dirs)for(const dy of [0,1,-1]){
   const k=K(x+dx,y+dy,z+dz),p=anchors.get(k);
   if(!p)continue;
   if(dy!==0){
    if(sweptOverlapBlocked([x,y,z],p)){blockedCandidates++;continue;}
    verticalCandidateEdges++;
   }
   const nextCost=cost+(dy===0?1:200001);
   if(!dist.has(k)||nextCost<dist.get(k)){
    dist.set(k,nextCost);prev.set(k,{parent:current,dy});
    heap.push([nextCost,k]);
   }
  }
 }
 const routes=destinations.map(d=>{
  const dest=K(...d.at);
  let status=!anchors.has(origin)?'INVALID_START_ENVELOPE':
   !anchors.has(dest)?'INVALID_DESTINATION_ENVELOPE':
   !dist.has(dest)?limited?'UNKNOWN_BUDGET':'NO_PROVEN_GEOMETRIC_CONNECTION':'';
  const path=[],transitions=[];
  if(!status){
   let current=dest;
   for(let n=0;n<=anchors.size;n++){
    path.push(anchors.get(current));
    if(current===origin)break;
    const link=prev.get(current);guard(link,'BROKEN_CHAIN');
    if(link.dy!==0)transitions.push({from:anchors.get(link.parent),to:anchors.get(current),
     rise:link.dy,verifiedMinecraftMotion:false});
    current=link.parent;
   }
   path.reverse();transitions.reverse();
   guard(JSON.stringify(path[0])===JSON.stringify(start),'BAD_PATH_ORIGIN');
   status=transitions.length?'VERTICAL_CANDIDATE_UNCERTIFIED':'PASS_FLAT_ENVELOPE_GEOMETRY';
  }
  return {id:d.id,at:d.at,status,path,
   moveCount:path.length?path.length-1:null,stepCandidateCount:transitions.length,
   transitions,playerCollisionCertified:false,stairsCertified:false,
   jumpCertified:false};
 });
 const data={schema:SCHEMA,sourceSha256:scene.sourceSha256,
  geometrySha256:scene.geometrySha256,start,width,depth,headroom,
  standingCells:standing.size,fittingAnchors:anchors.size,examinedNodes:examined,
  blockedOverlappingTransitionEdges:blockedCandidates,
  acceptedUncertifiedTransitionEdges:verticalCandidateEdges,searchLimited:limited,
  routes,
  interpretation:'Discretized whole-cell footprint and two-block headroom. A cardinal 1-cell horizontal step with +/-1 vertical change is only a candidate if supporting blocks do not intersect the departure envelope. All resulting motion remains unverified in Minecraft Education.',
  geometryOnly:true,playerCollisionCertified:false,stairsCertified:false,
  jumpCertified:false,constructionApproved:false,readiness:'NOT_PREPARED',
  worldContacts:0,worldCoordinates:null,BuildPlan:{operations:[]},
  gates:Array(9).fill('BLOCKED')};
 return {...data,sha256:sha(data)};
}
export function verifyTransitionEnvelopes(scene,params,report){
 try{
  return JSON.stringify(analyzeTransitionEnvelopes(scene,params))===JSON.stringify(report)&&
   report.constructionApproved===false&&report.jumpCertified===false&&
   report.gates.length===9&&report.gates.every(g=>g==='BLOCKED')&&
   report.BuildPlan.operations.length===0;
 }catch{return false;}
}

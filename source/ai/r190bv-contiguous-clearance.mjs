/** R190-BV: independent conservative 2x2 supported-footprint clearance.
 * Actual final B143 voxels only. No Minecraft avatar physics, architectural repair or world I/O.
 */
export const R190BV_SCHEMA='minecraftaibuilder-r190bv-square-footprint-clearance-v1';
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
 modelCalls:0,art:'ART_HOLD',officialArtAdoptions:0});
export function auditR190BV({compiled,bounds,entrance,destinations,spaces,levels,headroom=3}={}){
 if(!compiled?.designOnly||!Array.isArray(compiled.primitives)||!bounds||
  !Array.isArray(entrance)||entrance.length!==3||
  !Array.isArray(destinations)||!Array.isArray(spaces)||!Array.isArray(levels)||
  !integer(headroom,2,3))throw Error('R190BV_INPUT');
 const w=bounds.width,h=bounds.height,d=bounds.depth;
 if(![w,h,d].every(n=>integer(n,4,128))||w*h*d>500000)
  throw Error('R190BV_BOUNDS');
 const index=(x,y,z)=>(y*d+z)*w+x,size=w*h*d;
 const occupied=new Uint8Array(size);
 for(const v of compiled.primitives){
  if(!Array.isArray(v)||v.length<4||v.slice(0,3).some((q,i)=>
   !integer(q,0,[w-1,h-1,d-1][i])))throw Error('R190BV_FINAL_VOXEL_INVALID');
  occupied[index(v[0],v[1],v[2])]=1;
 }
 const isSolid=(x,y,z)=>occupied[index(x,y,z)]!==0;
 const cache=new Uint8Array(size),width=2;
 const stand=(x,y,z)=>{
  if(x<0||z<0||y<1||x+width>w||z+width>d||y+headroom>h)return false;
  const i=index(x,y,z),c=cache[i];
  if(c!==0)return c===1;
  for(let dx=0;dx<width;dx++)for(let dz=0;dz<width;dz++){
   if(!isSolid(x+dx,y-1,z+dz)){cache[i]=2;return false;}
   for(let dy=0;dy<headroom;dy++)if(isSolid(x+dx,y+dy,z+dz)){
    cache[i]=2;return false;
   }
  }
  cache[i]=1;return true;
 };
 const rootStandable=entrance.every((n,i)=>integer(n,0,[w-1,h-1,d-1][i]))&&
  stand(...entrance);
 const distance=new Int32Array(size).fill(-1);
 const queue=new Int32Array(size);
 let front=0,back=0;
 if(rootStandable){
  const v=index(...entrance);queue[back++]=v;distance[v]=0;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  while(front<back){
   const i=queue[front++],x=i%w,z=Math.floor(i/w)%d,y=Math.floor(i/(w*d));
   for(const [dx,dz] of dirs)for(const dy of [0,1,-1]){
    const nx=x+dx,ny=y+dy,nz=z+dz;
    if(!stand(nx,ny,nz))continue;
    // Require conservative extra head clearance over all four old footprint
    // cells while ascending. This over-constrains some real walkable stairs.
    if(dy===1){
     if(y+headroom>=h)continue;
     let blocked=false;
     for(let a=0;a<2;a++)for(let b=0;b<2;b++)
      if(isSolid(x+a,y+headroom,z+b))blocked=true;
     if(blocked)continue;
    }
    const nxt=index(nx,ny,nz);
    if(distance[nxt]>=0)continue;
    distance[nxt]=distance[i]+1;queue[back++]=nxt;
   }
  }
 }
 const lev=new Map(levels.map(v=>[v.id,v.standingY]));
 const destinationsAudit=destinations.map(v=>{
  const point=v.point;
  if(!Array.isArray(point)||point.length!==3||point.some((n,i)=>
   !integer(n,0,[w-1,h-1,d-1][i])))throw Error('R190BV_DESTINATION');
  const [x,y,z]=point,wideStandable=stand(x,y,z);
  const steps=wideStandable?distance[index(x,y,z)]:-1;
  return {id:v.id,point,wideStandable,reachable:steps>=0,shortestPathSteps:steps,
   maximumPathSteps:v.maximumPathSteps,passed:steps>=0&&steps<=v.maximumPathSteps};
 });
 const spacesAudit=spaces.map(v=>{
  const y=lev.get(v.levelId);
  if(!integer(y,1,h-1)||!Array.isArray(v.origin)||!Array.isArray(v.size)||
   v.origin.length!==2||v.size.length!==2)throw Error('R190BV_SPACE');
  const [ox,oz]=v.origin,[sx,sz]=v.size;
  if(!integer(ox,0,w-1)||!integer(oz,0,d-1)||
   !integer(sx,2,w-ox)||!integer(sz,2,d-oz))throw Error('R190BV_SPACE_RANGE');
  let wideStandable=0,reachable=0;
  for(let x=ox;x<ox+sx-1;x++)for(let z=oz;z<oz+sz-1;z++){
   if(stand(x,y,z))wideStandable++;
   if(distance[index(x,y,z)]>=0)reachable++;
  }
  const area=sx*sz,percent=Math.floor(100*reachable/area);
  return {id:v.id,levelId:v.levelId,standingY:y,area,
   wideStandable,reachable,percent,
   requiredPositions:v.minimumReachablePositions,
   requiredPercent:v.minimumReachablePercent,
   passed:reachable>=v.minimumReachablePositions&&percent>=v.minimumReachablePercent};
 });
 const allPassed=rootStandable&&destinationsAudit.every(v=>v.passed)&&
  spacesAudit.every(v=>v.passed);
 return {schema:R190BV_SCHEMA,source:'INDEPENDENT_REAL_FINAL_B143_VOXELS',
  geometrySha256:compiled.geometrySha256,sourceSha256:compiled.sourceSha256,
  width:2,depth:2,headroom,footprintPolicy:'ALL_FOUR_FEET_SOLID_AND_ALL_HEADROOM_CLEAR',
  movementPolicy:'FOUR_HORIZONTAL_NEIGHBORS_WITH_Y_DELTA_0_OR_PLUS_MINUS_ONE',
  entry:{point:entrance,wideStandable:rootStandable},
  destinations:destinationsAudit,spaces:spacesAudit,reachableWideAnchors:back,
  status:allPassed?'SOURCE_CONSERVATIVE_2X2_ROUTE_PASS':'HOLD_CONSERVATIVE_2X2_ROUTE',
  limitation:'2x2 square all-supported is deliberately stricter than a Minecraft avatar. A HOLD is not proof that real walking is impossible; PASS is not real Minecraft walking or structural safety.',
  independentRequestFidelity:'NOT_CERTIFIED',minecraftWalking:'NOT_TESTED',
  ...safe()};
}

/** R190-BV directed width-two strip route proxy.
 * Exact final B143 voxels. Unlike 2x2 square ALL-foot-support, a sideways
 * two-cell strip can step up on an actual supported stair tread.
 * Still not Minecraft avatar collision/turning, world walking or safe stairs.
 */
export const R190BV_STRIP_SCHEMA='minecraftaibuilder-r190bv-width-two-directed-strip-v1';
const int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export function auditR190BVStrip({compiled,bounds,entrance,destinations,spaces,levels,headroom=3}={}){
 if(!compiled?.designOnly||!Array.isArray(compiled.primitives)||!bounds||
  !Array.isArray(entrance)||entrance.length!==3||!Array.isArray(destinations)||
  !Array.isArray(spaces)||!Array.isArray(levels)||!int(headroom,2,3))
  throw Error('R190BV_STRIP_INPUT');
 const w=bounds.width,h=bounds.height,d=bounds.depth;
 if(![w,h,d].every(n=>int(n,4,128))||w*h*d>500000)
  throw Error('R190BV_STRIP_BOUNDS');
 const key=(x,y,z)=>(y*d+z)*w+x,N=w*h*d,solid=new Uint8Array(N);
 for(const v of compiled.primitives){
  if(!Array.isArray(v)||v.length<4||v.slice(0,3).some((n,i)=>
   !int(n,0,[w-1,h-1,d-1][i])))throw Error('R190BV_STRIP_VOXEL');
  solid[key(v[0],v[1],v[2])]=1;
 }
 const isSolid=(x,y,z)=>solid[key(x,y,z)]!==0;
 const cache=new Uint8Array(N);
 const stand=(x,y,z)=>{
  if(x<0||x>=w||y<1||y+headroom>h||z<0||z>=d)return false;
  const i=key(x,y,z);
  if(cache[i])return cache[i]===1;
  if(!isSolid(x,y-1,z)){cache[i]=2;return false;}
  for(let t=0;t<headroom;t++)if(isSolid(x,y+t,z)){cache[i]=2;return false;}
  cache[i]=1;return true;
 };
 const distance=new Int32Array(N).fill(-1),queue=new Int32Array(N);
 const entered=entrance.every((n,i)=>int(n,0,[w-1,h-1,d-1][i]))&&stand(...entrance);
 let q=0,tail=0,edges=0,ascendingEdges=0;
 if(entered){const start=key(...entrance);queue[tail++]=start;distance[start]=0;}
 const directions=[[1,0],[-1,0],[0,1],[0,-1]];
 while(q<tail){
  const here=queue[q++],x=here%w,z=Math.floor(here/w)%d,y=Math.floor(here/(w*d));
  for(const [dx,dz] of directions){
   for(const dy of [0,1,-1]){
    const nx=x+dx,ny=y+dy,nz=z+dz;
    if(!stand(nx,ny,nz))continue;
    const to=key(nx,ny,nz);if(distance[to]>=0)continue;
    // The second parallel lane is perpendicular to the movement direction.
    // Require BOTH old and new 2-wide strips to stand, including on stair treads.
    // Either side can be used. This graph does NOT certify turning radius.
    let wide=false;
    for(const sign of [-1,1]){
     const sx=sign*(-dz),sz=sign*dx;
     if(!stand(x+sx,y,z+sz)||!stand(nx+sx,ny,nz+sz))continue;
     // Require enough overhead to step safely up in both old lanes.
     if(dy===1){
      if(y+headroom>=h||isSolid(x,y+headroom,z)||
       isSolid(x+sx,y+headroom,z+sz))continue;
     }
     wide=true;break;
    }
    if(!wide)continue;
    distance[to]=distance[here]+1;queue[tail++]=to;edges++;
    if(dy!==0)ascendingEdges++;
   }
  }
 }
 const levelsY=new Map(levels.map(l=>[l.id,l.standingY]));
 const goals=destinations.map(v=>{
  const pos=v.point;
  if(!Array.isArray(pos)||pos.length!==3||pos.some((n,i)=>!int(n,0,[w-1,h-1,d-1][i])))
   throw Error('R190BV_STRIP_GOAL');
  const p=key(...pos),steps=distance[p];
  return {id:v.id,point:pos,standable:stand(...pos),reachable:steps>=0,
   shortestPathSteps:steps,passed:steps>=0&&steps<=v.maximumPathSteps};
 });
 const zones=spaces.map(v=>{
  const y=levelsY.get(v.levelId),[ox,oz]=v.origin,[sx,sz]=v.size;
  if(!int(y,1,h-1)||!int(ox,0,w-1)||!int(oz,0,d-1)||
   !int(sx,2,w-ox)||!int(sz,2,d-oz))throw Error('R190BV_STRIP_ZONE');
  let reachable=0,standable=0;
  for(let x=ox;x<ox+sx;x++)for(let z=oz;z<oz+sz;z++){
   if(stand(x,y,z))standable++;
   if(distance[key(x,y,z)]>=0)reachable++;
  }
  const area=sx*sz,percent=Math.floor(100*reachable/area);
  return {id:v.id,area,standingY:y,standable,reachable,percent,
   minimumPositions:v.minimumReachablePositions,
   minimumPercent:v.minimumReachablePercent,
   passed:reachable>=v.minimumReachablePositions&&percent>=v.minimumReachablePercent};
 });
 const passed=entered&&goals.every(x=>x.passed)&&zones.every(x=>x.passed);
 return {schema:R190BV_STRIP_SCHEMA,source:'INDEPENDENT_RECOMPILED_FINAL_B143',
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  width:2,headroom,entry:{point:entrance,standable:entered},
  movement:'FOUR_WAY_CARDINAL_0_PLUS_MINUS_ONE_Y_WITH_BOTH_PARALLEL_STANDING_LANES',
  reachableStripAnchors:tail,acceptedEdges:edges,nonzeroHeightEdges:ascendingEdges,
  destinations:goals,spaces:zones,
  status:passed?'SOURCE_DIRECTED_TWO_WIDE_STRIP_PROXY_PASS':'HOLD_DIRECTED_TWO_WIDE_STRIP_PROXY',
  limitations:'A passing width-two cross-section proxy does not ensure 2x2 avatar turning, true collision, structural safety or actual Minecraft walking. Unlike square-footprint policy it allows adjacent supported stair treads.',
  minecraftWalking:'NOT_TESTED',independentRequestFidelity:'NOT_CERTIFIED',
  readiness:'NOT_PREPARED',BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0,modelCalls:0,art:'ART_HOLD'};
}

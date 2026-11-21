/**
 * B198Z-R1: category-neutral final-voxel spatial claims.
 * Takes already compiled conceptual B143 voxels and local-space claims only.
 * NOT an LLM, physical stairs verifier, Minecraft connector, or safety release.
 */
const invalid=(why)=>{throw Error('B198ZR1_SPATIAL_'+why)};
const requireThat=(ok,why)=>{if(!ok)invalid(why)};
const inRange=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const validVec=(p,b,min=0)=>Array.isArray(p)&&p.length===3&&
 p.every((n,i)=>inRange(n,min,b[i]-1));
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).every(k=>keys.includes(k));
const posId=(x,y,z,w,d)=>(y*d+z)*w+x;
const localKey=p=>p.join(',');
export function evaluateSpatialClaims({design,compiled,protectedVoids=[],walkRoutes=[]}={}){
 requireThat(design?.designOnly===true&&compiled?.designOnly===true,'SOURCE_ONLY_REQUIRED');
 requireThat(exact(design.bounds,['width','height','depth']),'BOUNDS');
 const {width:w,height:h,depth:d}=design.bounds;
 requireThat(inRange(w,8,128)&&inRange(h,8,96)&&inRange(d,8,128)&&w*h*d<=500000,'GRID');
 requireThat(compiled?.sourceSha256?.length===64&&Array.isArray(compiled.primitives),'NOT_COMPILED');
 requireThat(Array.isArray(protectedVoids)&&protectedVoids.length<=16,'VOID_CLAIMS');
 requireThat(Array.isArray(walkRoutes)&&walkRoutes.length<=8,'ROUTE_CLAIMS');
 const grid=new Uint8Array(w*h*d);
 const has=(x,y,z)=>grid[posId(x,y,z,w,d)]!==0;
 for(const [x,y,z,m] of compiled.primitives){
  requireThat(inRange(x,0,w-1)&&inRange(y,0,h-1)&&inRange(z,0,d-1)&&inRange(m,0,6),'PRIMITIVE');
  grid[posId(x,y,z,w,d)]=m+1;
 }
 const voids=[];
 for(const v of protectedVoids){
  requireThat(exact(v,['id','origin','size','maximumOccupied'])&&
   typeof v.id==='string'&&v.id.length>0&&v.id.length<=64,'VOID_FIELDS');
  requireThat(validVec(v.origin,[w,h,d]),'VOID_ORIGIN');
  requireThat(Array.isArray(v.size)&&v.size.length===3&&v.size.every((n,i)=>
   inRange(n,1,[w,h,d][i]-v.origin[i])),'VOID_SIZE');
  requireThat(inRange(v.maximumOccupied,0,v.size[0]*v.size[1]*v.size[2]),'VOID_THRESHOLD');
  let filled=0;
  for(let y=v.origin[1];y<v.origin[1]+v.size[1];y++)
   for(let z=v.origin[2];z<v.origin[2]+v.size[2];z++)
    for(let x=v.origin[0];x<v.origin[0]+v.size[0];x++)if(has(x,y,z))filled++;
  voids.push({id:v.id,volume:v.size[0]*v.size[1]*v.size[2],occupied:filled,
   passed:filled<=v.maximumOccupied});
 }
 const routes=[];
 for(const r of walkRoutes){
  requireThat(exact(r,['id','start','anchors','headroom','maximumRise','maximumDrop'])&&
   typeof r.id==='string'&&r.id.length<=64&&
   validVec(r.start,[w,h,d]),'ROUTE_FIELDS');
  requireThat(Array.isArray(r.anchors)&&r.anchors.length>0&&r.anchors.length<=64&&
   r.anchors.every(p=>validVec(p,[w,h,d])),'ANCHORS');
  requireThat(inRange(r.headroom,2,3)&&r.maximumRise===1&&r.maximumDrop===1,'ROUTE_RULES');
  const stand=(x,y,z)=>{
   if(x<0||x>=w||z<0||z>=d||y<=0||y+r.headroom-1>=h)return false;
   if(!has(x,y-1,z))return false;
   for(let n=0;n<r.headroom;n++)if(has(x,y+n,z))return false;
   return true;
  };
  requireThat(stand(...r.start),'START_NOT_WALKABLE');
  const visited=new Uint8Array(grid.length), queue=new Int32Array(grid.length);
  const initial=posId(r.start[0],r.start[1],r.start[2],w,d);
  let front=0,back=0;queue[back++]=initial;visited[initial]=1;
  while(front<back){
   const id=queue[front++],x=id%w,z=Math.floor(id/w)%d,y=Math.floor(id/(w*d));
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])for(const dy of [0,1,-1]){
    const nx=x+dx,ny=y+dy,nz=z+dz;
    if(!stand(nx,ny,nz))continue;
    if(dy===1&&y+r.headroom<h&&has(x,y+r.headroom,z))continue;
    const next=posId(nx,ny,nz,w,d);if(visited[next])continue;
    visited[next]=1;queue[back++]=next;
   }
  }
  const reached=r.anchors.filter(p=>visited[posId(...p,w,d)]===1).length;
  routes.push({id:r.id,reached,anchors:r.anchors.length,visited:back,passed:reached===r.anchors.length});
 }
 return {schema:'minecraftaibuilder-b198zr1-spatial-claims-v1',
  sourceOnly:true,semanticQualityCertified:false,realMinecraftWalkingTested:false,
  passed:voids.every(v=>v.passed)&&routes.every(r=>r.passed),voids,routes};
}

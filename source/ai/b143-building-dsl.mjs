/**
 * B143 building DSL v1 — deterministic, category-neutral 3D design geometry.
 * Inputs are ChatGPT-authored review documents, NOT Minecraft commands.
 * No network, world coordinates, executable materials, or SocketBE adapters.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-b143-building-dsl-v1';
export const MATERIALS=Object.freeze(['stone','concrete','metal','glass','wood','glow','accent']);
export const MAX_CELLS=160000, MAX_WORK=1750000;
const K=(x,y,z)=>x+','+y+','+z;
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const only=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).every(k=>keys.includes(k));
function fail(reason){throw Error('B143_'+reason);}
function yes(ok,reason){if(!ok)fail(reason);}
const trip=(a,low,high)=>Array.isArray(a)&&a.length===3&&a.every(n=>int(n,low,high));
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const strictName=(x,maxLength=100)=>typeof x==='string'&&
 x.length>=1&&x.length<=maxLength&&
 !/[\u0000-\u001f<>]/.test(x);
export function validateDesign(d){
 yes(only(d,['schema','id','title','brief','bounds','elements','designOnly']),'TOP_LEVEL_UNKNOWN');
 yes(d.schema===SCHEMA&&d.designOnly===true,'SCHEMA_OR_MODE');
 yes(typeof d.id==='string'&&/^[a-z][a-z0-9-]{2,47}$/.test(d.id),'ID');
 yes(strictName(d.title,100)&&strictName(d.brief,500),'TITLE_OR_BRIEF');
 yes(only(d.bounds,['width','height','depth']),'BOUNDS_FIELDS');
 const {width:w,height:h,depth:z}=d.bounds;
 yes(int(w,8,128)&&int(h,8,96)&&int(z,8,128)&&w*h*z<=500000,'BOUNDS');
 yes(Array.isArray(d.elements)&&d.elements.length>=1&&d.elements.length<=160,'ELEMENT_COUNT');
 const ids=new Set();let work=0,hasAdd=false;
 for(const e of d.elements){
  yes(only(e,['id','shape','mode','material','origin','size','center','radii','axis','radius','length','shell','majorRadius','tubeRadius','start','end','thickness','direction','width','steps','treadDepth']),'ELEMENT_FIELDS');
  yes(typeof e.id==='string'&&/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(e.id)&&!ids.has(e.id),'ELEMENT_ID');
  ids.add(e.id);
  yes(['box','ellipsoid','cylinder','torus','beam','staircase'].includes(e.shape)&&['add','cut'].includes(e.mode),'SHAPE_MODE');
  yes(e.mode==='cut'?e.material===undefined:MATERIALS.includes(e.material),'MATERIAL');
  const shell=e.shell??0;
  yes(int(shell,0,4)&&!(e.mode==='cut'&&shell),'SHELL');
  let a,b;
  if(e.shape==='staircase'){
   // Compact, generic straight flight. One source element is an exact ordered
   // solid voxel wedge: tread 0 at origin.y, tread i at origin.y+i.
   // "staircase" is conceptual source geometry, NOT Minecraft stair blocks.
   yes(e.mode==='add'&&!shell&&trip(e.origin,0,128)&&
    ['x','z'].includes(e.axis)&&[1,-1].includes(e.direction)&&
    int(e.width,2,12)&&int(e.steps,2,32)&&int(e.treadDepth,1,3),
    'STAIRCASE_FIELDS');
   yes(e.size===undefined&&e.center===undefined&&e.radii===undefined&&
    e.radius===undefined&&e.length===undefined&&
    e.majorRadius===undefined&&e.tubeRadius===undefined&&
    e.start===undefined&&e.end===undefined&&e.thickness===undefined,
    'STAIRCASE_EXTRA');
   const v=e.steps*e.treadDepth,along=e.axis==='x'?0:2,
    across=along===0?2:0;
   a=e.origin.slice();b=e.origin.slice();
   a[along]=Math.min(e.origin[along],e.origin[along]+e.direction*(v-1));
   b[along]=Math.max(e.origin[along],e.origin[along]+e.direction*(v-1));
   b[1]=e.origin[1]+e.steps-1;
   b[across]=e.origin[across]+e.width-1;
  }else if(e.shape==='box'){
   yes(trip(e.origin,0,128)&&trip(e.size,1,128),'BOX_COORD');
   a=e.origin;b=e.origin.map((v,i)=>v+e.size[i]-1);
   if(shell)yes(e.size.every(n=>n>shell*2),'SHELL_TOO_THICK');
   yes(e.center===undefined&&e.radii===undefined&&e.axis===undefined&&e.radius===undefined&&e.length===undefined&&e.majorRadius===undefined&&e.tubeRadius===undefined&&e.start===undefined&&e.end===undefined&&e.thickness===undefined,'BOX_EXTRA');
  }else if(e.shape==='ellipsoid'){
   yes(trip(e.center,0,128)&&trip(e.radii,1,64),'ELLIPSOID_COORD');
   a=e.center.map((v,i)=>v-e.radii[i]);
   b=e.center.map((v,i)=>v+e.radii[i]);
   if(shell)yes(e.radii.every(r=>r>shell),'SHELL_TOO_THICK');
   yes(e.origin===undefined&&e.size===undefined&&e.axis===undefined&&e.radius===undefined&&e.length===undefined&&e.majorRadius===undefined&&e.tubeRadius===undefined&&e.start===undefined&&e.end===undefined&&e.thickness===undefined,'ELLIPSOID_EXTRA');
  }else if(e.shape==='beam'){
   yes(trip(e.start,0,128)&&trip(e.end,0,128)&&
     e.start.some((v,i)=>v!==e.end[i])&&int(e.thickness,1,3),'BEAM_COORD');
   yes(!shell&&e.origin===undefined&&e.size===undefined&&
     e.center===undefined&&e.radii===undefined&&e.axis===undefined&&
     e.radius===undefined&&e.length===undefined&&e.majorRadius===undefined&&
     e.tubeRadius===undefined,'BEAM_EXTRA');
   a=e.start.map((v,i)=>Math.min(v,e.end[i])-e.thickness);
   b=e.start.map((v,i)=>Math.max(v,e.end[i])+e.thickness);
  }else if(e.shape==='torus'){
   yes(trip(e.center,0,128)&&['x','y','z'].includes(e.axis)&&
     int(e.majorRadius,3,45)&&int(e.tubeRadius,1,9)&&
     e.majorRadius>e.tubeRadius+1,'TORUS_COORD');
   const i={x:0,y:1,z:2}[e.axis],span=e.majorRadius+e.tubeRadius;
   a=e.center.map((v,j)=>v-(j===i?e.tubeRadius:span));
   b=e.center.map((v,j)=>v+(j===i?e.tubeRadius:span));
   if(shell)yes(e.tubeRadius>shell,'SHELL_TOO_THICK');
   yes(e.origin===undefined&&e.size===undefined&&e.radii===undefined&&
     e.radius===undefined&&e.length===undefined&&e.start===undefined&&e.end===undefined&&e.thickness===undefined,'TORUS_EXTRA');
  }else{
   yes(trip(e.origin,0,128)&&['x','y','z'].includes(e.axis)&&
     int(e.radius,1,64)&&int(e.length,1,128),'CYLINDER_COORD');
   const i={x:0,y:1,z:2}[e.axis];
   a=e.origin.map((v,j)=>v-(j===i?0:e.radius));
   b=e.origin.map((v,j)=>v+(j===i?e.length-1:e.radius));
   if(shell)yes(e.radius>shell,'SHELL_TOO_THICK');
   yes(e.center===undefined&&e.radii===undefined&&e.size===undefined&&e.majorRadius===undefined&&e.tubeRadius===undefined&&e.start===undefined&&e.end===undefined&&e.thickness===undefined,'CYLINDER_EXTRA');
  }
  yes(a.every((v,i)=>v>=0)&&b.every((v,i)=>v<[w,h,z][i]),'OUTSIDE_LOCAL_BOUNDS');
  const volume=b.reduce((n,v,i)=>n*(v-a[i]+1),1);
  work+=volume;yes(work<=MAX_WORK,'WORK_BUDGET');
  hasAdd||=e.mode==='add';
 }
 yes(hasAdd,'NO_ADD_ELEMENTS');
 return true;
}
function inside(e,x,y,z){
 if(e.shape==='staircase'){
  const along=e.axis==='x'?0:2,across=along===0?2:0,
   p=[x,y,z],
   forward=(p[along]-e.origin[along])*e.direction,
   lateral=p[across]-e.origin[across];
  return forward>=0&&forward<e.steps*e.treadDepth&&
   lateral>=0&&lateral<e.width&&y>=e.origin[1]&&
   y<=e.origin[1]+Math.floor(forward/e.treadDepth);
 }
 if(e.shape==='box'){
  const [ax,ay,az]=e.origin,[sx,sy,sz]=e.size;
  if(x<ax||y<ay||z<az||x>=ax+sx||y>=ay+sy||z>=az+sz)return false;
  if(!e.shell)return true;
  return x<ax+e.shell||x>=ax+sx-e.shell||
   y<ay+e.shell||y>=ay+sy-e.shell||z<az+e.shell||z>=az+sz-e.shell;
 }
 if(e.shape==='ellipsoid'){
  const [cx,cy,cz]=e.center,[rx,ry,rz]=e.radii;
  const q=((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2;
  if(q>1)return false;
  if(!e.shell)return true;
  return ((x-cx)/(rx-e.shell))**2+
   ((y-cy)/(ry-e.shell))**2+((z-cz)/(rz-e.shell))**2>=1;
 }
 if(e.shape==='beam'){
  const p=[x,y,z],v=e.end.map((v,i)=>v-e.start[i]),
   len2=v.reduce((sum,q)=>sum+q*q,0);
  const dot=v.reduce((sum,q,i)=>sum+q*(p[i]-e.start[i]),0);
  const t=Math.min(1,Math.max(0,dot/len2));
  const d2=p.reduce((sum,q,i)=>sum+(q-(e.start[i]+t*v[i]))**2,0);
  return d2<=(e.thickness-.10)**2;
 }
 if(e.shape==='torus'){
  const i={x:0,y:1,z:2}[e.axis],p=[x,y,z],j=(i+1)%3,k=(i+2)%3;
  const sweep=Math.hypot(p[j]-e.center[j],p[k]-e.center[k])-e.majorRadius;
  const q=sweep*sweep+(p[i]-e.center[i])**2;
  return q<=e.tubeRadius**2&&(!e.shell||q>=(e.tubeRadius-e.shell)**2);
 }
 const i={x:0,y:1,z:2}[e.axis],p=[x,y,z];
 if(p[i]<e.origin[i]||p[i]>=e.origin[i]+e.length)return false;
 const j=(i+1)%3,k=(i+2)%3;
 const r2=(p[j]-e.origin[j])**2+(p[k]-e.origin[k])**2;
 return r2<=e.radius**2&&(!e.shell||r2>=(e.radius-e.shell)**2);
}
function domain(e){
 if(e.shape==='staircase'){
  const along=e.axis==='x'?0:2,across=along===0?2:0,
   end=e.origin[along]+e.direction*(e.steps*e.treadDepth-1),
   a=e.origin.slice(),b=e.origin.slice();
  a[along]=Math.min(e.origin[along],end);
  b[along]=Math.max(e.origin[along],end);
  b[1]=e.origin[1]+e.steps-1;
  b[across]=e.origin[across]+e.width-1;
  return [a,b];
 }
 if(e.shape==='box')return [e.origin,e.origin.map((v,i)=>v+e.size[i]-1)];
 if(e.shape==='ellipsoid')return [e.center.map((v,i)=>v-e.radii[i]),e.center.map((v,i)=>v+e.radii[i])];
 if(e.shape==='beam')
  return [e.start.map((v,i)=>Math.min(v,e.end[i])-e.thickness),
   e.start.map((v,i)=>Math.max(v,e.end[i])+e.thickness)];
 if(e.shape==='torus'){
  const i={x:0,y:1,z:2}[e.axis],span=e.majorRadius+e.tubeRadius;
  return [e.center.map((v,j)=>v-(j===i?e.tubeRadius:span)),
   e.center.map((v,j)=>v+(j===i?e.tubeRadius:span))];
 }
 const i={x:0,y:1,z:2}[e.axis];
 return [e.origin.map((v,j)=>v-(j===i?0:e.radius)),
  e.origin.map((v,j)=>v+(j===i?e.length-1:e.radius))];
}
/** A cut removes local conceptual cells only, never Minecraft blocks. */
export function compileDesign(d){
 validateDesign(d);
 const cells=new Map(),operations=[];
 for(const e of d.elements){
  let added=0,removed=0;
  const [a,b]=domain(e);
  for(let y=a[1];y<=b[1];y++)
   for(let z=a[2];z<=b[2];z++)
    for(let x=a[0];x<=b[0];x++){
     if(!inside(e,x,y,z))continue;
     const key=K(x,y,z);
     if(e.mode==='cut'){
      if(cells.delete(key))removed++;
     }else{
      if(!cells.has(key))added++;
      cells.set(key,{x,y,z,material:e.material});
      yes(cells.size<=MAX_CELLS,'VOXEL_BUDGET');
     }
    }
  operations.push({element:e.id,mode:e.mode,added,removed}); // design transformations, not build ops
 }
 yes(cells.size>0,'EMPTY_GEOMETRY');
 const names=MATERIALS.map(m=>'B143_'+m.toUpperCase());
 const min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
 const pts=[...cells.values()].sort((a,b)=>a.y-b.y||a.z-b.z||a.x-b.x);
 const primitives=pts.map(c=>{
  for(const q of ['x','y','z']){min[q]=Math.min(min[q],c[q]);max[q]=Math.max(max[q],c[q]);}
  return [c.x,c.y,c.z,MATERIALS.indexOf(c.material),Math.floor(c.y/5)];
 });
 const bytes=sha({design:d,primitives});
 const layerCounts=Object.fromEntries(MATERIALS.map((m,i)=>[m,primitives.filter(p=>p[3]===i).length]));
 const levels=Math.floor(max.y/5)+1;
 const scene={
  id:d.id,title:d.title,brief:d.brief,typology:'ai-design',
  levels,layerNames:names,primitives,
  bounds:{minX:min.x,maxX:max.x,minY:min.y,maxY:max.y,minZ:min.z,maxZ:max.z},
  stats:{voxels:primitives.length,conceptRooms:0,roofCaps:0,WINDOW_GLAZING_PROXY:0,
   layerCounts,designOperations:operations,physicalCompletion:'UNVERIFIED',
   humanReview:'REQUIRED',constructionApproved:false},
  sourceSha256:sha(d),geometrySha256:bytes,
  targetEdition:'MINECRAFT_EDUCATION',designOnly:true,
  readiness:'NOT_PREPARED',worldContacts:0,worldCoordinates:null,
  BuildPlan:{status:'NOT_PREPARED',operations:[]}
 };
 return scene;
}
export function verifyCompiled(d,scene){
 try{
  const actual=compileDesign(d);
  return scene?.sourceSha256===actual.sourceSha256&&
   scene?.geometrySha256===actual.geometrySha256&&
   scene?.readiness==='NOT_PREPARED'&&scene?.designOnly===true&&
   scene?.worldContacts===0&&scene?.worldCoordinates===null&&
   scene?.BuildPlan?.operations?.length===0&&
   actual.primitives.length===scene.primitives?.length;
 }catch{return false;}
}

/** R190-CA authored volumetric architecture, not a template or a Qwen/Gemma output.
 * Segmented contour solids, authored floor strata, 3D ellipsoid voids and bridges.
 * Independent SOURCE compiler; does not modify B143/BY/BZ or permit world writes.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-r190ca-authored-space-mass-v1';
export const MATERIALS=Object.freeze(['stone','concrete','metal','glass','wood','glow','accent']);
const H=x=>createHash('sha256').update(x).digest('hex');
const E=(v,code)=>{if(!v)throw Error('R190CA_'+code)};
const I=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const field=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,50}$/.test(x);
const shoelace=p=>p.reduce((s,q,i)=>{const v=p[(i+1)%p.length];return s+q[0]*v[1]-v[0]*q[1]},0);
const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function collide(a,b,c,d){
 const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
 return o1*o2<=0&&o3*o4<=0;
}
function polygon(p,w,d){
 E(Array.isArray(p)&&p.length>=6&&p.length<=16,'POLYGON_VERTEX_COUNT');
 E(p.every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)&&
  v[0]>=2&&v[0]<=w-3&&v[1]>=2&&v[1]<=d-3),'POLYGON_BOUNDS');
 E(new Set(p.map(v=>v.join(','))).size===p.length,'POLYGON_DUPLICATE');
 const area=shoelace(p);
 E(Math.abs(area)>50,'POLYGON_DEGENERATE');
 for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
  if(j===i+1||(i===0&&j===p.length-1))continue;
  E(!collide(p[i],p[(i+1)%p.length],p[j],p[(j+1)%p.length]),
   'POLYGON_SELF_INTERSECT');
 }
 return Math.sign(area);
}
const interp=(levels,y)=>{
 let i=0;while(i+1<levels.length&&y>levels[i+1].y)i++;
 const a=levels[i],b=levels[Math.min(i+1,levels.length-1)],t=a.y===b.y?0:(y-a.y)/(b.y-a.y);
 return a.points.map((v,j)=>v.map((q,k)=>q+(b.points[j][k]-q)*t));
};
const inside=(x,z,p)=>{
 let hit=false;
 for(let i=0,j=p.length-1;i<p.length;j=i++){
  const a=p[i],b=p[j];
  if((a[1]>z)!==(b[1]>z)){
   if(x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
 }return hit;
};
const dist=(x,z,a,b)=>{
 const ax=b[0]-a[0],az=b[1]-a[1],len=ax*ax+az*az,
 t=len?Math.min(1,Math.max(0,((x-a[0])*ax+(z-a[1])*az)/len)):0;
 return (x-a[0]-t*ax)**2+(z-a[1]-t*az)**2;
};
function validate(p){
 E(field(p,['schema','id','title','originalBriefSha256','bounds','intent','masses','bridges',
  'cuts','programs','protectedVoids','designOnly'])&&p.schema===SCHEMA&&p.designOnly===true,'FORMAT');
 E(id(p.id)&&typeof p.title==='string'&&p.title.length<=120&&
 /^[a-f0-9]{64}$/.test(p.originalBriefSha256),'IDENTITY');
 E(field(p.bounds,['width','height','depth']),'BOUNDS_FIELDS');
 const {width:w,height:h,depth:d}=p.bounds;
 E(I(w,48,128)&&I(h,48,128)&&I(d,32,96)&&w*h*d<=850000,'BOUNDS');
 E(field(p.intent,['architecturalIdea','publicExperience','nextReview'])&&
 Object.values(p.intent).every(s=>typeof s==='string'&&s.length>=20&&s.length<=480),'INTENT');
 E(Array.isArray(p.masses)&&p.masses.length>=2&&p.masses.length<=10,'MASSES');
 E(Array.isArray(p.bridges)&&p.bridges.length<=12,'BRIDGES');
 E(Array.isArray(p.cuts)&&p.cuts.length>=2&&p.cuts.length<=16,'CUTS');
 E(Array.isArray(p.programs)&&p.programs.length>=3&&p.programs.length<=16,'PROGRAMS');
 E(Array.isArray(p.protectedVoids)&&p.protectedVoids.length>=2&&p.protectedVoids.length<=10,'VOIDS');
 const ids=new Set(),uniq=v=>{E(id(v)&&!ids.has(v),'DUPLICATE_ID');ids.add(v)};
 for(const m of p.masses){
  E(field(m,['id','wallMaterial','floorMaterial','wall','profiles','floorYs']),'MASS_FIELDS');
  uniq(m.id);E(MATERIALS.includes(m.wallMaterial)&&MATERIALS.includes(m.floorMaterial)&&I(m.wall,1,4),'MASS_MATERIAL');
  E(Array.isArray(m.profiles)&&m.profiles.length>=3&&m.profiles.length<=12,'PROFILES');
  let prev=0,sign=0,count=0;
  for(const c of m.profiles){
   E(field(c,['y','points'])&&I(c.y,2,h-3)&&c.y>prev,'PROFILE_Y');
   prev=c.y;
   const a=polygon(c.points,w,d);
   E(!sign||a===sign,'WINDING');sign=a;
   E(!count||count===c.points.length,'CONTROL_VERTEX_COUNT');count=c.points.length;
  }
  for(let y=m.profiles[0].y;y<=prev;y++)polygon(interp(m.profiles,y),w,d);
  E(Array.isArray(m.floorYs)&&m.floorYs.length>=2&&m.floorYs.length<=30,'FLOORS');
  E(m.floorYs.every(y=>I(y,m.profiles[0].y+1,prev-2))&&
   new Set(m.floorYs).size===m.floorYs.length,'FLOOR_LEVELS');
 }
 for(const k of p.bridges){
  E(field(k,['id','material','y','thickness','polygon']),'BRIDGE_FIELDS');
  uniq(k.id);E(MATERIALS.includes(k.material)&&I(k.y,2,h-4)&&I(k.thickness,1,2),'BRIDGE_SIZE');
  polygon(k.polygon,w,d);
 }
 for(const c of p.cuts){
  E(field(c,['id','center','radii']),'CUT_FIELDS');uniq(c.id);
  E(Array.isArray(c.center)&&c.center.length===3&&c.center.every((v,i)=>I(v,0,[w,h,d][i]-1))&&
   Array.isArray(c.radii)&&c.radii.length===3&&c.radii.every(v=>I(v,2,52)),'CUT_PARAMS');
 }
 for(const q of p.programs){
  E(field(q,['id','purpose','floorY','polygon']),'PROGRAM_FIELDS');uniq(q.id);
  E(typeof q.purpose==='string'&&q.purpose.length>=4&&q.purpose.length<=100&&I(q.floorY,1,h-5),'PROGRAM_Y');
  polygon(q.polygon,w,d);
 }
 for(const v of p.protectedVoids){
  E(field(v,['id','origin','size']),'VOID_FIELDS');uniq(v.id);
  E(Array.isArray(v.origin)&&Array.isArray(v.size)&&v.origin.length===3&&v.size.length===3&&
   v.origin.every((n,i)=>I(n,0,[w,h,d][i]-1))&&
   v.size.every((n,i)=>I(n,2,[w,h,d][i]-v.origin[i])),'VOID_RANGE');
 }
 return true;
}
export {validate as validateR190CA};
export function compileR190CA(input){
 const raw=typeof input==='string'?new TextEncoder().encode(input):input;
 E(raw instanceof Uint8Array&&raw.length>250&&raw.length<200000,'RAW_BYTES');
 let p;try{p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))}
 catch{throw Error('R190CA_ORIGINAL_JSON')}
 validate(p);
 const {width:w,height:h,depth:d}=p.bounds,voxels=new Map();
 let work=0;
 const key=(x,y,z)=>(y*d+z)*w+x;
 const emit=(x,y,z,mat)=>{
  E(I(x,0,w-1)&&I(y,0,h-1)&&I(z,0,d-1),'OUT_OF_BOUNDS');
  voxels.set(key(x,y,z),MATERIALS.indexOf(mat));E(voxels.size<=250000,'VOXEL_BUDGET');
 };
 function fill(poly,y,material,wall=0){
  const minx=Math.max(0,Math.floor(Math.min(...poly.map(x=>x[0])))-1),
   maxx=Math.min(w-1,Math.ceil(Math.max(...poly.map(x=>x[0])))+1),
   minz=Math.max(0,Math.floor(Math.min(...poly.map(x=>x[1])))-1),
   maxz=Math.min(d-1,Math.ceil(Math.max(...poly.map(x=>x[1])))+1);
  for(let x=minx;x<=maxx;x++)for(let z=minz;z<=maxz;z++){
   work++;E(work<=16000000,'WORK_BUDGET');
   if(!inside(x+.5,z+.5,poly))continue;
   if(wall){
    let dt=Infinity;
    for(let j=0;j<poly.length;j++)dt=Math.min(dt,dist(x+.5,z+.5,poly[j],poly[(j+1)%poly.length]));
    if(dt>wall*wall)continue;
   }
   emit(x,y,z,material);
  }
 }
 for(const m of p.masses){
  const floors=new Set(m.floorYs);
  for(let y=m.profiles[0].y;y<=m.profiles.at(-1).y;y++){
   const poly=interp(m.profiles,y);
   fill(poly,y,m.wallMaterial,m.wall);
   if(floors.has(y))fill(poly,y,m.floorMaterial);
  }
 }
 for(const k of p.bridges)for(let y=k.y;y<k.y+k.thickness;y++)fill(k.polygon,y,k.material);
 const beforeCuts=voxels.size;
 for(const [i] of voxels){
  const x=i%w,z=Math.floor(i/w)%d,y=Math.floor(i/(w*d));
  if(p.cuts.some(c=>c.center.reduce((s,q,j)=>s+(([x,y,z][j]-q)/c.radii[j])**2,0)<=1))voxels.delete(i);
 }
 const primitives=[...voxels.entries()].sort(([a],[b])=>a-b).map(([i,m])=>{
  const x=i%w,z=Math.floor(i/w)%d,y=Math.floor(i/(w*d));
  return [x,y,z,m,Math.floor(y/5)];
 });
 const empty=p.protectedVoids.map(v=>{
  let occupied=0;
  for(let y=v.origin[1];y<v.origin[1]+v.size[1];y++)
  for(let z=v.origin[2];z<v.origin[2]+v.size[2];z++)
  for(let x=v.origin[0];x<v.origin[0]+v.size[0];x++)
   if(voxels.has(key(x,y,z)))occupied++;
  return {id:v.id,testedCells:v.size.reduce((a,b)=>a*b,1),occupiedCells:occupied,pass:occupied===0};
 });
 E(empty.every(v=>v.pass),'PROTECTED_VOID_OCCUPIED');
 const programs=p.programs.map(q=>{
  let requested=0,clear=0,unsupported=0,blocked=0;
  const ys=q.floorY;
  const minx=Math.max(0,Math.floor(Math.min(...q.polygon.map(v=>v[0])))),
    maxx=Math.min(w-1,Math.ceil(Math.max(...q.polygon.map(v=>v[0])))),
    minz=Math.max(0,Math.floor(Math.min(...q.polygon.map(v=>v[1])))),
    maxz=Math.min(d-1,Math.ceil(Math.max(...q.polygon.map(v=>v[1]))));
  for(let x=minx;x<=maxx;x++)for(let z=minz;z<=maxz;z++){
   if(!inside(x+.5,z+.5,q.polygon))continue;requested++;
   if(!voxels.has(key(x,ys,z))){unsupported++;continue;}
   if(voxels.has(key(x,ys+1,z))||voxels.has(key(x,ys+2,z))||voxels.has(key(x,ys+3,z))){blocked++;continue;}
   clear++;
  }
  return {id:q.id,purpose:q.purpose,floorY:ys,requestedCells:requested,
    supportedClearCells:clear,unsupportedCells:unsupported,blockedCells:blocked,
    supportedClearFraction:requested?Number((clear/requested).toFixed(4)):0,
    criterion:'SUPPORTED_FLOOR_AND_THREE_EMPTY_CELLS_ONLY_NOT_ACTUAL_WALKABILITY'};
 });
 return {schema:'minecraftaibuilder-r190ca-authored-occupied-mass-compiled-v1',
  originalRawSha256:H(raw),sourceSha256:H(JSON.stringify(p)),
  geometrySha256:H(JSON.stringify(primitives)),
  authorship:'CHAT_AUTHORED_IR_TO_REAL_VOXELS_NO_PROVIDER_NO_TEMPLATE',
  bounds:p.bounds,materialNames:MATERIALS,primitives,
  stats:{voxelCount:primitives.length,beforeCuts,removedByCuts:beforeCuts-voxels.size,
   work,protectedVoidResults:empty,programs},
  designOnly:true,readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  constructionApproved:false,executionAllowed:false,worldContacts:0,worldWrites:0,
  modelCalls:0,networkRequests:0,BuildPlan:{operations:[]},
  structuralGate:'NOT_TESTED',routesGate:'NOT_TESTED',
  artGate:'ART_HOLD',officialArtAdoptions:0};
}

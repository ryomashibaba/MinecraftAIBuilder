/** R190-BY: pure, author-controlled contour-loft source -> REAL conceptual voxels.
 * NEW source format. Does not relax B143, does not transform a model answer,
 * does not run Minecraft, does not call any model or select building templates.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-r190by-author-controlled-loft-v1';
export const MATERIALS=Object.freeze(['stone','concrete','metal','glass','wood','glow','accent']);
const MAX_WORK=1750000,MAX_VOXELS=160000;
const I=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const E=(x,msg)=>{if(!x)throw Error('R190BY_'+msg)};
const keys=(v,list)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===list.length&&list.every(k=>Object.hasOwn(v,k));
const id=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,40}$/.test(s);
const hash=x=>createHash('sha256').update(x).digest('hex');
const trip=(a,lim)=>Array.isArray(a)&&a.length===lim.length&&a.every((x,i)=>I(x,0,lim[i]-1));
const area=pts=>pts.reduce((s,p,i)=>{
 const q=pts[(i+1)%pts.length];return s+p[0]*q[1]-q[0]*p[1];
},0)/2;
const orientation=(a,b,c)=>Math.sign((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));
const overlap=(a,b,c,d)=>{
 const p=orientation(a,b,c),q=orientation(a,b,d),r=orientation(c,d,a),s=orientation(c,d,b);
 if(p===0||q===0||r===0||s===0)return true;
 return p!==q&&r!==s;
};
const polygonValid=(p,w,d,interpolated=false)=>{
 E(Array.isArray(p)&&p.length>=6&&p.length<=16,'VERTEX_COUNT');
 E(p.every(x=>Array.isArray(x)&&x.length===2&&x.every(Number.isFinite)&&
  x[0]>=1&&x[0]<=w-2&&x[1]>=1&&x[1]<=d-2&&
  (interpolated||(Number.isSafeInteger(x[0])&&Number.isSafeInteger(x[1])))),'VERTEX_BOUNDS');
 E(new Set(p.map(x=>x.join(','))).size===p.length,'DUPLICATE_POINT');
 E(Math.abs(area(p))>=24,'COLLAPSED_POLYGON');
 for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
  if(j===i+1||(i===0&&j===p.length-1))continue;
  if(overlap(p[i],p[(i+1)%p.length],p[j],p[(j+1)%p.length]))
   throw Error('R190BY_SELF_INTERSECTION');
 }
 return Math.sign(area(p));
};
const pointInPoly=(x,z,p)=>{
 let inside=false;
 for(let i=0,j=p.length-1;i<p.length;j=i++){
  const a=p[i],b=p[j];
  if(((a[1]>z)!==(b[1]>z))&&
   x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
};
function dist2(x,z,a,b){
 const vx=b[0]-a[0],vz=b[1]-a[1],l=vx*vx+vz*vz;
 const t=l?Math.min(1,Math.max(0,((x-a[0])*vx+(z-a[1])*vz)/l)):0;
 return (x-a[0]-t*vx)**2+(z-a[1]-t*vz)**2;
}
function distance3(px,py,pz,a,b){
 const v=b.map((q,i)=>q-a[i]),l=v.reduce((s,q)=>s+q*q,0);
 const t=l?Math.min(1,Math.max(0,((px-a[0])*v[0]+(py-a[1])*v[1]+(pz-a[2])*v[2])/l)):0;
 return (px-a[0]-t*v[0])**2+(py-a[1]-t*v[1])**2+(pz-a[2]-t*v[2])**2;
}
export function validateR190BY(p){
 E(keys(p,['schema','id','title','originalBriefSha256','bounds','intent','shells','decks','ribbons','protectedVoids','designOnly'])&&
  p.schema===SCHEMA&&p.designOnly===true,'SOURCE_FORMAT');
 E(id(p.id)&&typeof p.title==='string'&&p.title.length<=110&&
  /^[0-9a-f]{64}$/.test(p.originalBriefSha256),'IDENTITY');
 E(keys(p.bounds,['width','height','depth']),'BOUNDS_FIELDS');
 const {width:w,height:h,depth:d}=p.bounds;
 E(I(w,32,128)&&I(h,24,96)&&I(d,24,128)&&w*h*d<=500000,'BOUNDS');
 E(keys(p.intent,['architecturalIdea','publicExperience','nextReview'])&&
  Object.values(p.intent).every(v=>typeof v==='string'&&v.length>=10&&v.length<=350),'INTENT');
 E(Array.isArray(p.shells)&&p.shells.length>=1&&p.shells.length<=4,'SHELLS');
 E(Array.isArray(p.decks)&&p.decks.length<=16,'DECKS');
 E(Array.isArray(p.ribbons)&&p.ribbons.length<=16,'RIBBONS');
 E(Array.isArray(p.protectedVoids)&&p.protectedVoids.length>=2&&p.protectedVoids.length<=8,'VOIDS');
 const ids=new Set(),uniq=x=>{E(id(x)&&!ids.has(x),'ELEMENT_ID');ids.add(x);};
 for(const sh of p.shells){
  E(keys(sh,['id','material','thickness','contours']),'SHELL_FIELDS');
  uniq(sh.id);E(MATERIALS.includes(sh.material)&&I(sh.thickness,1,4),'SHELL_MATERIAL');
  E(Array.isArray(sh.contours)&&sh.contours.length>=3&&sh.contours.length<=12,'CONTOUR_LEVELS');
  let previous=-1,sign=0,n=0;
  for(const c of sh.contours){
   E(keys(c,['y','points'])&&I(c.y,1,h-2)&&c.y>previous,'CONTOUR_Y');
   previous=c.y;
   const winding=polygonValid(c.points,w,d);
   E(!sign||sign===winding,'WINDING_CHANGE');
   sign=winding;
   if(n)E(n===c.points.length,'MISMATCHED_CONTROL_VERTEX_COUNT');
   n=c.points.length;
  }
  for(let y=sh.contours[0].y;y<=previous;y++){
   const p=loftPolygon(sh.contours,y);
   polygonValid(p,w,d,true);
  }
 }
 for(const deck of p.decks){
  E(keys(deck,['id','material','y','thickness','polygon']),'DECK_FIELDS');
  uniq(deck.id);E(MATERIALS.includes(deck.material)&&I(deck.y,0,h-2)&&
   I(deck.thickness,1,3)&&deck.y+deck.thickness<=h,'DECK_RANGE');
  polygonValid(deck.polygon,w,d);
 }
 for(const ribbon of p.ribbons){
  E(keys(ribbon,['id','material','radius','path']),'RIBBON_FIELDS');
  uniq(ribbon.id);E(MATERIALS.includes(ribbon.material)&&I(ribbon.radius,1,3),'RIBBON_MATERIAL');
  E(Array.isArray(ribbon.path)&&ribbon.path.length>=2&&ribbon.path.length<=24&&
   ribbon.path.every(v=>trip(v,[w,h,d])),'RIBBON_PATH');
  E(ribbon.path.every(v=>v.every((c,i)=>c>=ribbon.radius&&c+ribbon.radius<[w,h,d][i])),
   'RIBBON_OUTSIDE_BOUNDS');
 }
 for(const v of p.protectedVoids){
  E(keys(v,['id','origin','size'])&&id(v.id),'VOID_FIELDS');
  E(Array.isArray(v.origin)&&Array.isArray(v.size)&&v.origin.length===3&&v.size.length===3&&
   v.origin.every((n,i)=>I(n,0,[w,h,d][i]-1))&&v.size.every((n,i)=>
    I(n,2,[w,h,d][i]-v.origin[i])),'VOID_RANGE');
 }
 return true;
}
function loftPolygon(contours,y){
 let i=0;while(i+1<contours.length&&y>contours[i+1].y)i++;
 const a=contours[i],b=contours[Math.min(contours.length-1,i+1)];
 const t=b.y===a.y?0:(y-a.y)/(b.y-a.y);
 return a.points.map((p,k)=>[p[0]+t*(b.points[k][0]-p[0]),
  p[1]+t*(b.points[k][1]-p[1])]);
}
export function compileR190BY(input){
 const raw=typeof input==='string'?new TextEncoder().encode(input):input;
 E(raw instanceof Uint8Array&&raw.length>100&&raw.length<120000,'RAW_BYTES');
 let p;try{p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))}
 catch{throw Error('R190BY_ORIGINAL_JSON')}
 validateR190BY(p);
 const {width:w,height:h,depth:d}=p.bounds;
 const cells=new Map();
 let work=0;
 const emit=(x,y,z,mat)=>{
  E(I(x,0,w-1)&&I(y,0,h-1)&&I(z,0,d-1),'OUT_OF_BOUNDS');
  cells.set((y*d+z)*w+x,MATERIALS.indexOf(mat));
  E(cells.size<=MAX_VOXELS,'VOXEL_BUDGET');
 };
 const polygonRegion=(poly,y,thick,mat,skin)=>{
  const minx=Math.max(0,Math.floor(Math.min(...poly.map(v=>v[0])))-1);
  const maxx=Math.min(w-1,Math.ceil(Math.max(...poly.map(v=>v[0])))+1);
  const minz=Math.max(0,Math.floor(Math.min(...poly.map(v=>v[1])))-1);
  const maxz=Math.min(d-1,Math.ceil(Math.max(...poly.map(v=>v[1])))+1);
  for(let x=minx;x<=maxx;x++)for(let z=minz;z<=maxz;z++){
   work++;E(work<=MAX_WORK,'WORK_BUDGET');
   if(!pointInPoly(x+.5,z+.5,poly))continue;
   if(skin){
    let edge=Infinity;
    for(let k=0;k<poly.length;k++)
     edge=Math.min(edge,dist2(x+.5,z+.5,poly[k],poly[(k+1)%poly.length]));
    if(edge>thick*thick)continue;
   }
   emit(x,y,z,mat);
  }
 };
 for(const shell of p.shells){
  const first=shell.contours[0].y,last=shell.contours.at(-1).y;
  for(let y=first;y<=last;y++)
   polygonRegion(loftPolygon(shell.contours,y),y,shell.thickness,shell.material,true);
 }
 for(const deck of p.decks)
  for(let y=deck.y;y<deck.y+deck.thickness;y++)
   polygonRegion(deck.polygon,y,deck.thickness,deck.material,false);
 for(const line of p.ribbons){
  const r=line.radius;
  for(let k=0;k<line.path.length-1;k++){
   const a=line.path[k],b=line.path[k+1];
   const lo=a.map((x,i)=>Math.max(0,Math.min(x,b[i])-r));
   const hi=a.map((x,i)=>Math.min([w,h,d][i]-1,Math.max(x,b[i])+r));
   for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)
   for(let x=lo[0];x<=hi[0];x++){
    work++;E(work<=MAX_WORK,'WORK_BUDGET');
    if(distance3(x,y,z,a,b)<=r*r)emit(x,y,z,line.material);
   }
  }
 }
 const primitives=[...cells.entries()].sort(([a],[b])=>a-b).map(([key,mat])=>{
  const x=key%w,z=Math.floor(key/w)%d,y=Math.floor(key/(w*d));
  return [x,y,z,mat,Math.floor(y/5)];
 });
 const occupancy=new Set(cells.keys());
 const voidResults=p.protectedVoids.map(v=>{
  let occupied=0;
  for(let y=v.origin[1];y<v.origin[1]+v.size[1];y++)
  for(let z=v.origin[2];z<v.origin[2]+v.size[2];z++)
  for(let x=v.origin[0];x<v.origin[0]+v.size[0];x++)
   if(occupancy.has((y*d+z)*w+x))occupied++;
  return {id:v.id,origin:v.origin,size:v.size,
   testedCells:v.size.reduce((a,b)=>a*b,1),occupiedCells:occupied,pass:occupied===0};
 });
 // Fail closed: the author MUST not place even one voxel in a declared protected void.
 E(voidResults.every(v=>v.pass),'PROTECTED_VOID_OCCUPIED');
 const layers=Object.fromEntries(MATERIALS.map((m,i)=>[m,primitives.filter(v=>v[3]===i).length]));
 const compiled={schema:'minecraftaibuilder-r190by-loft-compiled-v1',
  authorship:'AUTHOR_CONTROL_POINTS_TO_REAL_VOXELS_NOT_B143_COMPILATION',
  designOnly:true,originalRawSha256:hash(raw),sourceSha256:hash(JSON.stringify(p)),
  geometrySha256:hash(JSON.stringify(primitives)),bounds:p.bounds,materialNames:MATERIALS,
  primitives,stats:{voxels:primitives.length,layerCounts:layers,work,voidResults},
  readiness:'NOT_PREPARED',worldContacts:0,worldWrites:0,
  BuildPlan:{operations:[]},modelCalls:0,art:'ART_HOLD',officialArtAdoptions:0};
 return compiled;
}

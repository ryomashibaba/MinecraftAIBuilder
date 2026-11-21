/** R190-BZ: independent author-authored open 3D patch SOURCE.
 * Real deterministic voxels; NOT B143 native, NOT a complete building,
 * NOT a repaired LLM answer, and NEVER an executable Minecraft plan.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-r190bz-open-shell-v1';
export const MATERIALS=Object.freeze(['stone','concrete','metal','glass','wood','glow','accent']);
const assert=(v,e)=>{if(!v)throw Error('R190BZ_'+e)};
const fields=(v,k)=>v&&!Array.isArray(v)&&typeof v==='object'&&
 Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const label=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{2,48}$/.test(v);
const sha=v=>createHash('sha256').update(v).digest('hex');
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const len=v=>Math.hypot(...v);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const offsets=r=>{const a=[];for(let y=-r;y<=r;y++)for(let z=-r;z<=r;z++)for(let x=-r;x<=r;x++)
 if(x*x+y*y+z*z<=r*r)a.push([x,y,z]);return a;};
const disks={1:offsets(1),2:offsets(2)};
function triangles(p){return p.length===3?[[p[0],p[1],p[2]]]:
 [[p[0],p[1],p[2]],[p[0],p[2],p[3]]];}
export function validateR190BZ(p){
 assert(fields(p,['schema','id','title','originalBriefSha256','bounds','intent',
  'patches','spines','protectedVoids','designOnly'])&&p.schema===SCHEMA&&p.designOnly===true,'FORMAT');
 assert(label(p.id)&&typeof p.title==='string'&&p.title.length>=5&&p.title.length<=120&&
  /^[0-9a-f]{64}$/.test(p.originalBriefSha256),'IDENTITY');
 assert(fields(p.bounds,['width','height','depth']),'BOUNDS_FIELDS');
 const {width:w,height:h,depth:d}=p.bounds;
 assert(integer(w,32,128)&&integer(h,32,128)&&integer(d,24,128)&&w*h*d<=650000,'BOUNDS');
 assert(fields(p.intent,['architecturalIdea','publicExperience','nextReview'])&&
  Object.values(p.intent).every(v=>typeof v==='string'&&v.length>=15&&v.length<=450),'INTENT');
 assert(Array.isArray(p.patches)&&p.patches.length>=6&&p.patches.length<=72,'PATCH_COUNT');
 assert(Array.isArray(p.spines)&&p.spines.length<=24,'SPINE_COUNT');
 assert(Array.isArray(p.protectedVoids)&&p.protectedVoids.length>=2&&p.protectedVoids.length<=8,'VOID_COUNT');
 const ids=new Set();
 const unique=x=>{assert(label(x)&&!ids.has(x),'DUPLICATE_ID');ids.add(x)};
 const vertex=(v,r)=>Array.isArray(v)&&v.length===3&&v.every((n,i)=>
  integer(n,r+1,[w,h,d][i]-r-2));
 for(const patch of p.patches){
  assert(fields(patch,['id','material','thickness','vertices']),'PATCH_FIELDS');
  unique(patch.id);
  assert(MATERIALS.includes(patch.material)&&integer(patch.thickness,1,2),'PATCH_MATERIAL');
  assert(Array.isArray(patch.vertices)&&[3,4].includes(patch.vertices.length)&&
   patch.vertices.every(v=>vertex(v,patch.thickness)),'PATCH_VERTICES');
  for(const [a,b,c] of triangles(patch.vertices)){
   assert(len(cross(sub(b,a),sub(c,a)))>=12,'DEGENERATE_TRIANGLE');
  }
 }
 for(const spine of p.spines){
  assert(fields(spine,['id','material','radius','path']),'SPINE_FIELDS');
  unique(spine.id);
  assert(MATERIALS.includes(spine.material)&&integer(spine.radius,1,2)&&
   Array.isArray(spine.path)&&spine.path.length>=2&&spine.path.length<=18&&
   spine.path.every(v=>vertex(v,spine.radius)),'SPINE_GEOMETRY');
  assert(spine.path.some((v,i)=>i&&len(sub(v,spine.path[i-1]))>=1),'DEGENERATE_SPINE');
 }
 for(const v of p.protectedVoids){
  assert(fields(v,['id','origin','size']),'VOID_FIELDS');unique(v.id);
  assert(Array.isArray(v.origin)&&Array.isArray(v.size)&&v.origin.length===3&&
   v.size.length===3&&v.origin.every((n,i)=>integer(n,0,[w,h,d][i]-1))&&
   v.size.every((n,i)=>integer(n,2,[w,h,d][i]-v.origin[i])),'VOID_RANGE');
 }
 return true;
}
export function compileR190BZ(input){
 const raw=typeof input==='string'?new TextEncoder().encode(input):input;
 assert(raw instanceof Uint8Array&&raw.length>200&&raw.length<180000,'RAW_BYTES');
 let p;try{p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))}
 catch{throw Error('R190BZ_ORIGINAL_JSON')}
 validateR190BZ(p);
 const {width:w,height:h,depth:d}=p.bounds,cells=new Map();
 let work=0,sourceTriangles=0;
 const stamp=(v,r,mat)=>{
  for(const off of disks[r]){
   work++;assert(work<=24000000,'WORK_BUDGET');
   const [x,y,z]=v.map((q,i)=>q+off[i]);
   assert(x>=0&&x<w&&y>=0&&y<h&&z>=0&&z<d,'OUT_OF_BOUNDS');
   cells.set((y*d+z)*w+x,MATERIALS.indexOf(mat));
   assert(cells.size<=180000,'VOXEL_BUDGET');
  }
 };
 for(const patch of p.patches)for(const [a,b,c] of triangles(patch.vertices)){
  sourceTriangles++;
  const n=Math.ceil(Math.max(len(sub(a,b)),len(sub(a,c)),len(sub(b,c)))*1.8);
  assert(n<=350,'SAMPLE_BUDGET');
  for(let i=0;i<=n;i++)for(let j=0;j<=n-i;j++){
   const u=i/n,v=j/n,t=1-u-v;
   stamp(a.map((x,k)=>Math.round(t*x+u*b[k]+v*c[k])),patch.thickness,patch.material);
  }
 }
 for(const spine of p.spines)for(let k=0;k<spine.path.length-1;k++){
  const a=spine.path[k],b=spine.path[k+1],n=Math.max(1,Math.ceil(len(sub(b,a))*2));
  for(let i=0;i<=n;i++)
   stamp(a.map((x,j)=>Math.round(x+(b[j]-x)*i/n)),spine.radius,spine.material);
 }
 const primitives=[...cells.entries()].sort(([a],[b])=>a-b).map(([key,mat])=>
  [key%w,Math.floor(key/(w*d)),Math.floor(key/w)%d,mat,Math.floor(Math.floor(key/(w*d))/5)]);
 const voidResults=p.protectedVoids.map(v=>{
  let occupied=0;
  for(let y=v.origin[1];y<v.origin[1]+v.size[1];y++)
  for(let z=v.origin[2];z<v.origin[2]+v.size[2];z++)
  for(let x=v.origin[0];x<v.origin[0]+v.size[0];x++)
   if(cells.has((y*d+z)*w+x))occupied++;
  return {id:v.id,testedCells:v.size.reduce((a,b)=>a*b,1),occupiedCells:occupied,pass:occupied===0};
 });
 assert(voidResults.every(v=>v.pass),'PROTECTED_VOID_OCCUPIED');
 return {
  schema:'minecraftaibuilder-r190bz-real-open-shell-source-v1',
  authorship:'CHAT_AUTHORED_PATCH_VERTICES_NOT_PROVIDER_OR_TEMPLATE',
  originalRawSha256:sha(raw),sourceSha256:sha(JSON.stringify(p)),
  geometrySha256:sha(JSON.stringify(primitives)),bounds:p.bounds,
  materialNames:MATERIALS,primitives,
  stats:{voxels:primitives.length,triangles:sourceTriangles,patches:p.patches.length,
   work,voidResults,layerCounts:Object.fromEntries(MATERIALS.map((m,i)=>
    [m,primitives.filter(v=>v[3]===i).length]))},
  designOnly:true,readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0,modelCalls:0,networkRequests:0,
  BuildPlan:{operations:[]},constructionApproved:false,executionAllowed:false,
  functionGate:'NOT_TESTED',art:'ART_HOLD',officialArtAdoptions:0
 };
}

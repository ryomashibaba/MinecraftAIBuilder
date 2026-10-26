/**
 * R190 semantic-space -> B143 source experiment. No typology dispatch, no
 * inherited R189 coordinates, no Minecraft command or world contact.
 * Input describes functional spaces and a rooted direct-adjacency tree.
 * The bounded placer solves local coordinates rather than selecting a
 * named building silhouette. Unplaceable requirements fail closed.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';

export const R190_SCHEMA='minecraftaibuilder-r190-semantic-space-v1';
const fail=x=>{throw Error('R190_SEMANTIC_'+x);};
const ok=(p,x)=>{if(!p)fail(x);};
const exact=(v,ks)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===ks.length&&ks.every(k=>Object.hasOwn(v,k));
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const slug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(v);
const safeText=(v,n)=>typeof v==='string'&&v.length>=3&&v.length<=n&&
 !/[\u0000-\u001f<>]/.test(v);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const key=(x,y,z)=>[x,y,z].join(',');
const DIR=['north','south','east','west'];
const palette=['wood','stone','concrete','metal'];

export function validateR190SemanticPlan(p){
 ok(exact(p,['schema','id','title','brief','site','entrySpaceId','spaces','materials']),
  'FIELDS');
 ok(p.schema===R190_SCHEMA&&slug(p.id)&&safeText(p.title,100)&&
  safeText(p.brief,400),'IDENTITY');
 ok(exact(p.site,['width','depth','height'])&&
  int(p.site.width,24,80)&&int(p.site.depth,24,80)&&
  int(p.site.height,10,32)&&
  p.site.width*p.site.depth*p.site.height<=500000,'SITE');
 ok(exact(p.materials,['floor','wall','roof'])&&
  palette.includes(p.materials.floor)&&palette.includes(p.materials.wall)&&
  palette.includes(p.materials.roof),'MATERIALS');
 ok(Array.isArray(p.spaces)&&p.spaces.length>=2&&p.spaces.length<=6&&
  slug(p.entrySpaceId),'PROGRAM');
 const ids=new Set(),parents=new Map();
 for(const s of p.spaces){
  ok(exact(s,['id','purpose','width','depth','height','parentId','side','privacy'])&&
   slug(s.id)&&!ids.has(s.id)&&safeText(s.purpose,150)&&
   int(s.width,7,22)&&int(s.depth,7,22)&&
   int(s.height,7,p.site.height-2)&&
   ['public','shared','private'].includes(s.privacy),'SPACE');
  ids.add(s.id);
  ok(s.id===p.entrySpaceId?
   (s.parentId===null&&s.side===null):
   (slug(s.parentId)&&DIR.includes(s.side)),'RELATION');
  parents.set(s.id,s.parentId);
 }
 ok(ids.has(p.entrySpaceId),'MISSING_ENTRANCE_SPACE');
 for(const s of p.spaces){
  if(s.id===p.entrySpaceId)continue;
  ok(ids.has(s.parentId)&&s.parentId!==s.id,'PARENT_MISSING');
  // A south-side child of the entry room would block the declared approach.
  ok(!(s.parentId===p.entrySpaceId&&s.side==='south'),'ENTRY_COLLISION');
  const seen=new Set([s.id]);let at=s.parentId;
  while(at!==null){ok(!seen.has(at),'CYCLE');seen.add(at);at=parents.get(at);}
  ok(seen.has(p.entrySpaceId),'DISCONNECTED');
 }
 return true;
}
const overlap=(a,b)=>Math.min(a[1],b[1])-Math.max(a[0],b[0])+1;
const intersects=(a,b)=>overlap([a.x,a.x+a.w-1],[b.x,b.x+b.w-1])>0&&
 overlap([a.z,a.z+a.d-1],[b.z,b.z+b.d-1])>0;
const near=(parent,child,side,shift)=>{
 const xBase=parent.x+Math.floor((parent.w-child.width)/2);
 const zBase=parent.z+Math.floor((parent.d-child.depth)/2);
 const xy={north:{x:xBase+shift,z:parent.z+parent.d-1},
  south:{x:xBase+shift,z:parent.z-child.depth+1},
  east:{x:parent.x+parent.w-1,z:zBase+shift},
  west:{x:parent.x-child.width+1,z:zBase+shift}}[side];
 return {...xy,w:child.width,d:child.depth,h:child.height,id:child.id,
  parentId:child.parentId,side};
};
function sharedPortal(a,b,side){
 if(side==='east'||side==='west'){
  const lo=Math.max(a.z,b.z)+1,hi=Math.min(a.z+a.d-1,b.z+b.d-1)-1;
  if(hi-lo+1<2)return null;
  return {x:side==='east'?a.x+a.w-1:a.x,z:Math.floor((lo+hi-1)/2),axis:'x'};
 }
 const lo=Math.max(a.x,b.x)+1,hi=Math.min(a.x+a.w-1,b.x+b.w-1)-1;
 if(hi-lo+1<2)return null;
 return {x:Math.floor((lo+hi-1)/2),z:side==='north'?a.z+a.d-1:a.z,axis:'z'};
}
export function layoutR190SemanticPlan(p){
 validateR190SemanticPlan(p);
 const source=structuredClone(p),byId=new Map(source.spaces.map(s=>[s.id,s]));
 const root=byId.get(p.entrySpaceId);
 const placements=new Map([[root.id,{id:root.id,parentId:null,side:null,
  x:Math.floor((p.site.width-root.width)/2),
  z:Math.floor((p.site.depth-root.depth)/2),
  w:root.width,d:root.depth,h:root.height}]]);
 const portals=[],pending=new Set(source.spaces.filter(s=>s.id!==root.id).map(s=>s.id));
 // Stable bounded search; positions depend on relations and requirements,
 // not building-type names or a fixed prior building grid.
 function solve(){
  if(!pending.size)return true;
  const choices=[...pending].map(id=>byId.get(id))
   .filter(s=>placements.has(s.parentId)).sort((a,b)=>
    a.parentId.localeCompare(b.parentId)||a.id.localeCompare(b.id));
  for(const s of choices){
   const parent=placements.get(s.parentId);
   for(const shift of [0,-2,2,-4,4,-6,6,-8,8,-10,10,-12,12]){
    const candidate=near(parent,s,s.side,shift);
    if(candidate.x<2||candidate.z<3||
     candidate.x+candidate.w>p.site.width-2||
     candidate.z+candidate.d>p.site.depth-2)continue;
    const portal=sharedPortal(parent,candidate,s.side);
    if(!portal)continue;
    if([...placements.values()].some(existing=>existing.id!==parent.id&&
      intersects(existing,candidate)))continue;
    const common=overlap([parent.x,parent.x+parent.w-1],
      [candidate.x,candidate.x+candidate.w-1])*
      overlap([parent.z,parent.z+parent.d-1],
      [candidate.z,candidate.z+candidate.d-1]);
    if(common<3||common>Math.max(parent.w,parent.d,candidate.w,candidate.d))continue;
    placements.set(s.id,candidate);portals.push({...portal,a:parent.id,b:s.id});
    pending.delete(s.id);
    if(solve())return true;
    pending.add(s.id);portals.pop();placements.delete(s.id);
   }
  }
  return false;
 }
 ok(solve(),'NO_FEASIBLE_SPATIAL_LAYOUT');
 return {spaces:source.spaces.map(s=>placements.get(s.id)),portals,
  sourcePlanSha256:hash(source)};
}
function sourceDesign(p,l){
 const elements=[];
 const box=(id,mode,material,origin,size)=>elements.push({
  id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size});
 for(const s of l.spaces){
  const tag=s.id;
  box(tag+'-floor','add',p.materials.floor,[s.x,1,s.z],[s.w,1,s.d]);
  box(tag+'-west','add',p.materials.wall,[s.x,2,s.z],[1,s.h-2,s.d]);
  box(tag+'-east','add',p.materials.wall,[s.x+s.w-1,2,s.z],[1,s.h-2,s.d]);
  box(tag+'-south','add',p.materials.wall,[s.x+1,2,s.z],[s.w-2,s.h-2,1]);
  box(tag+'-north','add',p.materials.wall,[s.x+1,2,s.z+s.d-1],
   [s.w-2,s.h-2,1]);
  box(tag+'-roof','add',p.materials.roof,[s.x,s.h,s.z],[s.w,1,s.d]);
 }
 for(const [i,v] of l.portals.entries()){
  box('adjacency-'+i,'cut',undefined,[v.x,2,v.z],
   v.axis==='x'?[1,3,2]:[2,3,1]);
 }
 const entry=l.spaces.find(s=>s.id===p.entrySpaceId);
 const doorX=entry.x+Math.floor((entry.w-2)/2);
 box('entry-cut','cut',undefined,[doorX,2,entry.z],[2,3,1]);
 box('approach-floor','add',p.materials.floor,[doorX,1,entry.z-3],[2,1,3]);
 return {schema:B143,id:p.id,title:p.title,brief:p.brief,
  bounds:{width:p.site.width,height:p.site.height,depth:p.site.depth},
  designOnly:true,elements};
}
/** Actual compiled 2x2 walking pads: each column has floor and two air cells. */
export function auditR190SourceRoutes(plan,layout,design,compiled){
 ok(verifyCompiled(design,compiled),'STALE_B143');
 const c=new Set(compiled.primitives.map(p=>key(p[0],p[1],p[2])));
 const has=(x,y,z)=>c.has(key(x,y,z));
 const {width,depth}=plan.site;
 const stand=(x,z)=>x>=0&&z>=0&&x+1<width&&z+1<depth&&
  [x,x+1].every(a=>[z,z+1].every(b=>has(a,1,b)&&
   !has(a,2,b)&&!has(a,3,b)));
 const entry=layout.spaces.find(s=>s.id===plan.entrySpaceId);
 const x=entry.x+Math.floor((entry.w-2)/2),z=entry.z-2;
 ok(stand(x,z),'APPROACH_NOT_WALKABLE');
 const queue=[[x,z]],seen=new Set([x+','+z]);
 for(let i=0;i<queue.length;i++){
  const [a,b]=queue[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const u=a+dx,v=b+dz,k=u+','+v;
   if(!seen.has(k)&&stand(u,v)){seen.add(k);queue.push([u,v]);}
  }
 }
 const witnesses=[];
 for(const room of layout.spaces){
  let witness=null;
  for(let a=room.x+1;a<=room.x+room.w-3&&!witness;a++)
   for(let b=room.z+1;b<=room.z+room.d-3&&!witness;b++)
    if(seen.has(a+','+b))witness=[a,2,b];
  ok(witness!==null,'ROOM_UNREACHABLE_'+room.id);
  witnesses.push({id:room.id,reachableTwoWideSourceCell:witness});
 }
 for(const v of layout.portals){
  const portalAir=v.axis==='x'?[[v.x,v.z],[v.x,v.z+1]]:
   [[v.x,v.z],[v.x+1,v.z]];
  ok(portalAir.every(([a,b])=>!has(a,2,b)&&!has(a,3,b)),
   'PHYSICAL_DOOR_BLOCKED_'+v.a+'_'+v.b);
 }
 return {sourceWalkingPads:seen.size,
  entranceApproachTwoWide:true,allProgramSpacesReachable:true,witnesses,
  minecraftPlayerWalking:'NOT_TESTED',structuralEngineering:'NOT_TESTED'};
}
export function compileR190SemanticPlan(raw){
 const p=typeof raw==='string'?JSON.parse(raw):raw;
 validateR190SemanticPlan(p);
 const plan=structuredClone(p),layout=layoutR190SemanticPlan(plan);
 const design=sourceDesign(plan,layout),compiled=compileDesign(design);
 const audit=auditR190SourceRoutes(plan,layout,design,compiled);
 return {schema:'minecraftaibuilder-r190-source-research-v1',
  inputPlan:plan,inputSha256:hash(plan),layout,design,compiled,audit,
  modelAuthorship:'CALLER_PROVIDED_IR_UNVERIFIED',
  actualLocalModelCallsByCompiler:0,art:'ART_HOLD',
  minecraftPlayerWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  executionAllowed:false,constructionApproved:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldWrites:0,worldContacts:0};
}

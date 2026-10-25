/**
 * R134: compact program IR for 3–4 actual rooms, independent of genre.
 * Single-story expansion is a deliberate bounded step beyond R125's
 * two-room partition. The older R125 compiler and Qwen fixtures are frozen.
 *
 * Model/author chooses zones, front-to-back or west-to-east axis, relative
 * weights and exterior expression. Host owns all 3D B143 coordinates,
 * physical openings and shared route validation.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled,SCHEMA as B143}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
export const SCHEMA='minecraftaibuilder-r134-multi-zone-program-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const hold=x=>{throw Error('R134_MULTIZONE_'+x);};
const only=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const n=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const description=s=>typeof s==='string'&&s.length>=3&&s.length<=180&&
 !/[\u0000-\u001f<>]/.test(s);
/** Allocate real room clear lengths; no room may be only a one-cell label. */
function spans(axisLength,items){
 const partitions=items.length-1;
 const free=axisLength-4-partitions;
 if(free<4*items.length)hold('FOOTPRINT_TOO_SMALL_FOR_ROOM_COUNT');
 const leftover=free-4*items.length;
 const total=items.reduce((s,v)=>s+v.weight,0);
 const fair=items.map((v,i)=>({i,
  exact:leftover*v.weight/total}));
 const allocations=fair.map(v=>Math.floor(v.exact));
 let extra=leftover-allocations.reduce((s,v)=>s+v,0);
 fair.sort((a,b)=>(b.exact-Math.floor(b.exact))-
  (a.exact-Math.floor(a.exact))||a.i-b.i);
 for(let i=0;i<extra;i++)allocations[fair[i].i]++;
 const sizes=allocations.map(v=>v+4);
 let begin=2;
 return sizes.map((size,i)=>{
  const from=begin,to=from+size-1;
  begin=to+2;
  return {id:items[i].id,from,to,size};
 });
}
export function validateR134MultiZonePlan(plan){
 if(!only(plan,['schema','id','title','brief','footprint',
  'materials','layout','form'])||plan.schema!==SCHEMA||
  !slug(plan.id)||!description(plan.title)||!description(plan.brief)||
  !only(plan.footprint,['width','depth'])||
  !n(plan.footprint.width,18,32)||!n(plan.footprint.depth,18,32)||
  !only(plan.materials,['floor','wall','roof'])||
  !['wood','stone','concrete'].includes(plan.materials.floor)||
  !['wood','stone','concrete','metal'].includes(plan.materials.wall)||
  !['wood','stone','concrete','metal'].includes(plan.materials.roof)||
  !only(plan.layout,['axis','spaces'])||
  !['x','z'].includes(plan.layout.axis)||
  !Array.isArray(plan.layout.spaces)||
  !n(plan.layout.spaces.length,3,4)||
  !only(plan.form,['roofProfile','facadeLanguage'])||
  !['flat','ridge','sawtooth'].includes(plan.form.roofProfile)||
  !['plain','fins','screen'].includes(plan.form.facadeLanguage))
  hold('PLAN_CONTRACT');
 const ids=new Set();
 for(const s of plan.layout.spaces){
  if(!only(s,['id','purpose','weight'])||
   !slug(s.id)||ids.has(s.id)||!description(s.purpose)||
   !n(s.weight,1,4))hold('INVALID_ZONE');
  ids.add(s.id);
 }
 const length=plan.layout.axis==='z'?plan.footprint.depth:
  plan.footprint.width;
 spans(length,plan.layout.spaces);
 return true;
}
export function compileR134MultiZonePlan(input){
 validateR134MultiZonePlan(input);
 const plan=structuredClone(input),{width:w,depth:d}=plan.footprint;
 const axis=plan.layout.axis,items=plan.layout.spaces;
 const {floor,wall,roof}=plan.materials;
 const partitions=spans(axis==='x'?w:d,items);
 const elements=[];
 const box=(id,mode,material,origin,size)=>{
  elements.push({id,shape:'box',mode,
   ...(mode==='add'?{material}:{}),origin,size});
 };
 // Genuine support floor, outer wall shell, four-block-high clear interior.
 box('floor-0','add',floor,[1,1,1],[w-2,1,d-2]);
 box('shell-west','add',wall,[1,2,1],[1,4,d-2]);
 box('shell-east','add',wall,[w-2,2,1],[1,4,d-2]);
 box('shell-front','add',wall,[2,2,1],[w-4,4,1]);
 box('shell-rear','add',wall,[2,2,d-2],[w-4,4,1]);
 const centerX=Math.floor(w/2)-1,centerZ=Math.floor(d/2)-1;
 for(let i=0;i<partitions.length-1;i++){
  const partitionAt=partitions[i].to+1;
  if(axis==='z'){
   box('zone-divider-'+i,'add',wall,[2,2,partitionAt],[w-4,4,1]);
   box('zone-door-'+i,'cut',null,[centerX,2,partitionAt],[2,3,1]);
  }else{
   box('zone-divider-'+i,'add',wall,[partitionAt,2,2],[1,4,d-4]);
   box('zone-door-'+i,'cut',null,[partitionAt,2,centerZ],[1,3,2]);
  }
 }
 // Keep entry within one real room, even when a 3/4-zone x-partition
 // intersects the geometric center of the front facade.
 const options=axis==='x'?partitions.flatMap(z=>{
  const v=[];
  for(let x=z.from;x<=z.to-1;x++)
   v.push(x);
  return v;
 }):[centerX];
 options.sort((a,b)=>Math.abs(a-centerX)-Math.abs(b-centerX)||a-b);
 const entranceX=options[0];
 box('exterior-entrance','cut',null,[entranceX,2,1],[2,3,1]);
 // Real glazing, not wall-colored windows. Exterior spaces stay explicit.
 for(const [id,origin,size] of [
  ['front',[3,3,1],[2,2,1]],
  ['rear',[w-5,3,d-2],[2,2,1]],
  ['west',[1,3,d-5],[1,2,2]],
  ['east',[w-2,3,d-5],[1,2,2]]
 ]){
  box('window-'+id+'-cut','cut',null,origin,size);
  box('window-'+id+'-glass','add','glass',origin,size);
 }
 // Surface expression from IR rather than a house/shop template.
 if(plan.form.facadeLanguage==='fins')
  for(let x=2;x<=w-4;x+=4)
   box('fin-'+x,'add','accent',[x,3,0],[1,3,1]);
 if(plan.form.facadeLanguage==='screen')
  for(let z=2;z<=d-4;z+=4)
   box('screen-'+z,'add','metal',[0,3,z],[1,3,1]);
 box('roof-base','add',roof,[1,6,1],[w-2,1,d-2]);
 if(plan.form.roofProfile!=='flat'){
  for(let z=1;z<=d-2;z++){
   const distance=Math.min(z-1,d-2-z);
   const h=plan.form.roofProfile==='ridge'?
    Math.min(3,Math.floor(distance/2)):
    (z%6===1?0:Math.min(3,(z-1)%6));
   if(h>0)box('roof-profile-'+z,'add',roof,[1,7,z],[w-2,h,1]);
  }
 }
 const zoneRanges=partitions.map((z,i)=>({
  id:z.id,purpose:items[i].purpose,
  range:axis==='z'?{x:[2,w-3],z:[z.from,z.to]}:
   {x:[z.from,z.to],z:[2,d-3]},
  allocatedAxisCells:z.size,relativeWeight:items[i].weight
 }));
 const design={schema:B143,id:plan.id,title:plan.title,brief:plan.brief,
  bounds:{width:w,height:12,depth:d},elements,designOnly:true};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))hold('SOURCE_MISMATCH');
 const product={
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  spatialIRSchema:SCHEMA,planSha256:sha(plan),plan,design,compiled,
  program:[{
   level:0,splitAxis:axis,standingFloorY:2,
   zones:zoneRanges,
   partitionCount:partitions.length-1,
   partitionDoorModelled:true,doorAccessibleInMinecraft:'NOT_TESTED'
  }],
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  modelAuthorship:'CALLER_PROVIDED_PLAN_UNVERIFIED',
  geometricRules:'GENERIC_WEIGHTED_MULTI_ZONE_COMPILER_NOT_STYLE_CERTIFIED',
  architecturalQuality:'NOT_REVIEWED',inGameWalking:'NOT_TESTED',
  constructionApproved:false,worldContacts:0,worldWrites:0,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
 const routes=auditR125SourceRoutes(product);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')
  hold('DOORS_OR_ROOM_ROUTES_NOT_CONNECTED');
 return {...product,sourceRouteAudit:routes,
  sourceMultiZoneAccessibilityVerified:true,
  actualMinecraftPlayerAccessCertified:false};
}

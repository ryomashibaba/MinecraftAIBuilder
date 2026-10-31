/**
 * R125 generic semantic feature IR, separate from the original LLM plan.
 * A later small LLM can emit the same bounded intent independent of building
 * categories. We do not infer equipment from descriptive zone text.
 *
 * Adds real B143 solids but only if the base voxels are preserved, underlying
 * supports are occupied, new solids are collision-free, and every original
 * zone remains source-graph-reachable from the interior entrance.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
export const SCHEMA='minecraftaibuilder-r125-feature-intent-v1';
export const ASSEMBLED_SCHEMA='minecraftaibuilder-r130-feature-intent-v2';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const hold=x=>{throw Error('R125_FEATURE_'+x);};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(x=>Object.hasOwn(o,x));
const slug=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,31}$/.test(x);
const presets=Object.freeze({
 'work-surface':{size:[3,1,2],material:'wood'},
 'equipment-bank':{size:[3,2,1],material:'metal'},
 'display-stand':{size:[3,1,1],material:'glass'},
 'storage-rack':{size:[2,2,1],material:'stone'},
 'seating':{size:[2,1,1],material:'wood'}
});
// Physical assembly mode is a host-controlled compiler parameter, not
// a collection of templates indexed by "shop"/"home"/"research" names.
const assembled=Object.freeze({
 'work-surface':{size:[5,3,3],material:'wood'},
 'equipment-bank':{size:[5,3,2],material:'metal'},
 'display-stand':{size:[5,3,2],material:'glass'},
 'storage-rack':{size:[5,4,2],material:'metal'},
 'seating':{size:[4,2,3],material:'wood'}
});
const config=feature=>feature.detail==='assembled'?
 assembled[feature.role]:presets[feature.role];
const corners=['near-left','near-right','far-left','far-right'];
const k=(x,y,z)=>x+','+y+','+z;
function makeBlocks(feature,zone,y,corner){
 const cfg=config(feature),sx=cfg.size[0],sz=cfg.size[2];
 const xmin=zone.range.x[0]+1,xmax=zone.range.x[1]-1;
 const zmin=zone.range.z[0]+1,zmax=zone.range.z[1]-1;
 if(xmax-xmin+1<sx||zmax-zmin+1<sz)return null;
 const x=corner.endsWith('left')?xmin:xmax-sx+1;
 const z=corner.startsWith('near')?zmin:zmax-sz+1;
 return {x,y,z,sx,sz,cfg};
}
/**
 * Preserve original corner-priority outputs, then search progressively
 * along the room perimeter and nearby interior bands when corners are busy.
 * The requested corner remains intent, never a hardcoded genre layout.
 * Every candidate still faces the full source route + service access checks.
 */
function* candidatePositions(feature,zone,y){
 const cfg=config(feature),sx=cfg.size[0],sz=cfg.size[2];
 const xmin=zone.range.x[0]+1,xmax=zone.range.x[1]-sx;
 const zmin=zone.range.z[0]+1,zmax=zone.range.z[1]-sz;
 if(xmin>xmax||zmin>zmax)return;
 const emitted=new Set();
 const candidate=(x,z,corner,method)=>{
  if(x<xmin||x>xmax||z<zmin||z>zmax||emitted.has(x+','+z))
   return null;
  emitted.add(x+','+z);
  return {corner,method,pos:{x,y,z,sx,sz,cfg}};
 };
 for(const corner of [feature.corner,...corners.filter(c=>c!==feature.corner)]){
  const old=makeBlocks(feature,zone,y,corner);
  if(!old)continue;
  const p=candidate(old.x,old.z,corner,'corner');
  if(p)yield p;
 }
 // Search up to 3 bands of perimeter candidates. A source audit is
 // expensive; place near envelope first and cap possible evaluations.
 let checked=0;
 for(let ring=0;ring<=3;ring++){
  if(xmin+ring>xmax-ring||zmin+ring>zmax-ring)break;
  const places=[];
  for(let x=xmin+ring;x<=xmax-ring;x++){
   places.push([x,zmin+ring],[x,zmax-ring]);
  }
  for(let z=zmin+ring;z<=zmax-ring;z++){
   places.push([xmin+ring,z],[xmax-ring,z]);
  }
  const wishX=feature.corner.endsWith('left')?xmin:xmax;
  const wishZ=feature.corner.startsWith('near')?zmin:zmax;
  places.sort((a,b)=>
   (Math.abs(a[0]-wishX)+Math.abs(a[1]-wishZ))-
   (Math.abs(b[0]-wishX)+Math.abs(b[1]-wishZ)));
  for(const [x,z] of places){
   if(checked>=192)return;
   const p=candidate(x,z,feature.corner,'perimeter-and-inward-band');
   if(p){checked++;yield p;}
  }
 }
}
function asElements(feature,pos){
 // Preserve original legacy source IDs for short labels; deterministically
 // shorten long user/model equipment IDs to fit B143's 40-char element budget.
 // Semantic IDs remain unchanged in the intent, audit and placement records.
 const id='feature-'+(feature.id.length>19?sha(feature.id).slice(0,16):feature.id);
 if(feature.detail!=='assembled')return [{
  id,shape:'box',mode:'add',material:pos.cfg.material,
  origin:[pos.x,pos.y,pos.z],size:pos.cfg.size
 }];
 const box=(suffix,material,x,y,z,sx,sy,sz)=>({
  id:id+'-'+suffix,shape:'box',mode:'add',material,
  origin:[pos.x+x,pos.y+y,pos.z+z],size:[sx,sy,sz]
 });
 // A real multi-piece cross-category vocabulary: free space between worktop
 // supports, stocked shelves, display tiers and an upright console/backrest.
 // Components are actual separate B143 solids, not category-name labels.
 switch(feature.role){
  case 'work-surface':return [
   box('top','wood',0,2,0,5,1,3),
   box('leg-nw','metal',0,0,0,1,2,1),
   box('leg-ne','metal',4,0,0,1,2,1),
   box('leg-sw','metal',0,0,2,1,2,1),
   box('leg-se','metal',4,0,2,1,2,1)];
  case 'equipment-bank':return [
   box('foundation','metal',0,0,0,5,1,2),
   box('controls','metal',0,1,1,5,1,1),
   box('display','glass',0,2,1,5,1,1)];
  case 'display-stand':return [
   box('plinth','stone',0,0,0,5,1,2),
   box('clear-display','glass',0,1,0,5,1,2),
   box('header','glass',0,2,1,5,1,1)];
  case 'storage-rack':return [
   box('frame-left','metal',0,0,0,1,4,2),
   box('frame-right','metal',4,0,0,1,4,2),
   box('shelf-low','wood',1,1,0,3,1,2),
   box('shelf-high','wood',1,3,0,3,1,2)];
  case 'seating':return [
   box('platform','wood',0,0,0,4,1,3),
   box('backrest','wood',0,1,2,4,1,1)];
  default:throw Error('R125_FEATURE_UNSUPPORTED_ASSEMBLY');
 }
}
export function applyR125FeatureIntent({base,intent}={}){
 if(!base?.design||!base.compiled||
  base.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
  !verifyCompiled(base.design,base.compiled))hold('UNVERIFIED_BASE');
 const v2=intent?.schema===ASSEMBLED_SCHEMA;
 if(!exact(intent,['schema','basePlanSha256','objects'])||
  !(intent.schema===SCHEMA||v2)||
  intent.basePlanSha256!==base.planSha256||
  !Array.isArray(intent.objects)||intent.objects.length<1||
  intent.objects.length>8)hold('INTENT_CONTRACT');
 const zones=new Map();
 for(const level of base.program)for(const zone of level.zones)
  zones.set(zone.id,{zone,y:level.standingFloorY});
 const ids=new Set();
 for(const obj of intent.objects){
  if(!exact(obj,v2?['id','zoneId','role','corner','detail']:
   ['id','zoneId','role','corner'])||
   (v2&&obj.detail!=='assembled')||
   !slug(obj.id)||ids.has(obj.id)||!zones.has(obj.zoneId)||
   !Object.hasOwn(presets,obj.role)||!corners.includes(obj.corner))
   hold('INVALID_FEATURE_OBJECT');
  ids.add(obj.id);
 }
 const existing=auditR125SourceRoutes(base);
 if(existing.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')
  hold('BASE_ROUTES_NOT_ESTABLISHED');
 const keep=new Map(base.compiled.primitives.map(p=>[k(p[0],p[1],p[2]),p[3]]));
 const design=structuredClone(base.design),placements=[];
 for(const obj of intent.objects){
  const {zone,y}=zones.get(obj.zoneId);
  let chosen=null;
  for(const option of candidatePositions(obj,zone,y)){
   const {corner,pos,method}=option;
   let clear=true;
   for(let x=pos.x;x<pos.x+pos.sx;x++)
    for(let z=pos.z;z<pos.z+pos.sz;z++)
     for(let dy=0;dy<pos.cfg.size[1];dy++){
      const xx=k(x,y+dy,z);
      if(keep.has(xx)||!keep.has(k(x,y-1,z)))clear=false;
     }
   if(!clear)continue;
   const elements=asElements(obj,pos);
   const testDesign={...design,elements:[...design.elements,...elements]};
   let tested,route;
   try{
    tested=compileDesign(testDesign);
    const targets=[...placements,{id:obj.id,zoneId:obj.zoneId,
     origin:[pos.x,pos.y,pos.z],size:pos.cfg.size}];
    route=auditR125SourceRoutes({...base,design:testDesign,compiled:tested,
     sourceSha256:tested.sourceSha256,geometrySha256:tested.geometrySha256},
     {featureTargets:targets});
   }catch{continue;}
   if(route.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')continue;
   chosen={corner,pos,method,elements,testDesign,tested,route};break;
  }
  if(!chosen)hold('NO_SAFE_PLACEMENT_'+obj.id);
  design.elements=chosen.testDesign.elements;
  for(const p of chosen.tested.primitives)
   keep.set(k(p[0],p[1],p[2]),p[3]);
  placements.push({id:obj.id,zoneId:obj.zoneId,role:obj.role,
   requestedCorner:obj.corner,actualCorner:chosen.corner,
   placementMethod:chosen.method,
   ...(v2?{detail:'assembled',elementIds:chosen.elements.map(e=>e.id)}:{}),
   origin:[chosen.pos.x,chosen.pos.y,chosen.pos.z],
   size:chosen.pos.cfg.size,material:chosen.pos.cfg.material});
 }
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))hold('FINAL_SOURCE_INVALID');
 const baseSet=new Map(base.compiled.primitives.map(p=>[k(p[0],p[1],p[2]),p[3]]));
 const after=new Map(compiled.primitives.map(p=>[k(p[0],p[1],p[2]),p[3]]));
 for(const [coord,material] of baseSet){
  if(after.get(coord)!==material)hold('ORIGINAL_GEOMETRY_MODIFIED');
 }
 const routes=auditR125SourceRoutes({...base,design,compiled,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256},
  {featureTargets:placements});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')hold('ROUTE_REGRESSION');
 if(compiled.primitives.length<=base.compiled.primitives.length)
  hold('NO_NEW_GEOMETRY');
 return {
  schema:'minecraftaibuilder-r125-featured-source-v1',
  featureIntentSha256:sha(intent),originalPlanSha256:base.planSha256,
  originalSourceSha256:base.sourceSha256,
  originalGeometrySha256:base.geometrySha256,
  featurePlan:structuredClone(intent),placements,
  assemblyMode:v2?'MULTI_PART_ASSEMBLED':'LEGACY_COMPACT',
  design,compiled,program:structuredClone(base.program),
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  originalVoxelCount:base.compiled.primitives.length,
  addedVoxelCount:compiled.primitives.length-base.compiled.primitives.length,
  immutableBaseGeometryProven:true,
  sourceRouteAudit:routes,
  featureServiceAccessSourceOnly:routes.featureAccess,
  everyFeatureSourceAccessible:routes.featureAccess.every(x=>x.reachableFromEntrance),
  modelFeatureAuthorship:'CALLER_PROVIDED_NOT_ATTESTED_AS_LLM',
  semanticFunctionInGameCertified:false,
  aestheticReview:'NOT_REVIEWED',
  worldWrites:0,worldContacts:0,executionAllowed:false,
  constructionApproved:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
}

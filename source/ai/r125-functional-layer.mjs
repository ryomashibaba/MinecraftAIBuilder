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
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const hold=x=>{throw Error('R125_FEATURE_'+x);};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(x=>Object.hasOwn(o,x));
const slug=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,20}$/.test(x);
const presets=Object.freeze({
 'work-surface':{size:[3,1,2],material:'wood'},
 'equipment-bank':{size:[3,2,1],material:'metal'},
 'display-stand':{size:[3,1,1],material:'glass'},
 'storage-rack':{size:[2,2,1],material:'stone'},
 'seating':{size:[2,1,1],material:'wood'}
});
const corners=['near-left','near-right','far-left','far-right'];
const k=(x,y,z)=>x+','+y+','+z;
function makeBlocks(feature,zone,y,corner){
 const cfg=presets[feature.role],sx=cfg.size[0],sz=cfg.size[2];
 const xmin=zone.range.x[0]+1,xmax=zone.range.x[1]-1;
 const zmin=zone.range.z[0]+1,zmax=zone.range.z[1]-1;
 if(xmax-xmin+1<sx||zmax-zmin+1<sz)return null;
 const x=corner.endsWith('left')?xmin:xmax-sx+1;
 const z=corner.startsWith('near')?zmin:zmax-sz+1;
 return {x,y,z,sx,sz,cfg};
}
function asElement(feature,pos){
 return {id:'feature-'+feature.id,shape:'box',mode:'add',
  material:pos.cfg.material,origin:[pos.x,pos.y,pos.z],
  size:pos.cfg.size};
}
export function applyR125FeatureIntent({base,intent}={}){
 if(!base?.design||!base.compiled||
  base.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
  !verifyCompiled(base.design,base.compiled))hold('UNVERIFIED_BASE');
 if(!exact(intent,['schema','basePlanSha256','objects'])||
  intent.schema!==SCHEMA||intent.basePlanSha256!==base.planSha256||
  !Array.isArray(intent.objects)||intent.objects.length<1||
  intent.objects.length>8)hold('INTENT_CONTRACT');
 const zones=new Map();
 for(const level of base.program)for(const zone of level.zones)
  zones.set(zone.id,{zone,y:level.standingFloorY});
 const ids=new Set();
 for(const obj of intent.objects){
  if(!exact(obj,['id','zoneId','role','corner'])||
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
  for(const corner of [obj.corner,...corners.filter(x=>x!==obj.corner)]){
   const pos=makeBlocks(obj,zone,y,corner);
   if(!pos)continue;
   let clear=true;
   for(let x=pos.x;x<pos.x+pos.sx;x++)
    for(let z=pos.z;z<pos.z+pos.sz;z++)
     for(let dy=0;dy<pos.cfg.size[1];dy++){
      const xx=k(x,y+dy,z);
      if(keep.has(xx)||!keep.has(k(x,y-1,z)))clear=false;
     }
   if(!clear)continue;
   const testDesign={...design,elements:[...design.elements,asElement(obj,pos)]};
   let tested,route;
   try{
    tested=compileDesign(testDesign);
    route=auditR125SourceRoutes({...base,design:testDesign,compiled:tested,
     sourceSha256:tested.sourceSha256,geometrySha256:tested.geometrySha256});
   }catch{continue;}
   if(route.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')continue;
   chosen={corner,pos,testDesign,tested,route};break;
  }
  if(!chosen)hold('NO_SAFE_PLACEMENT_'+obj.id);
  design.elements=chosen.testDesign.elements;
  for(const p of chosen.tested.primitives)
   keep.set(k(p[0],p[1],p[2]),p[3]);
  placements.push({id:obj.id,zoneId:obj.zoneId,role:obj.role,
   requestedCorner:obj.corner,actualCorner:chosen.corner,
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
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')hold('ROUTE_REGRESSION');
 if(compiled.primitives.length<=base.compiled.primitives.length)
  hold('NO_NEW_GEOMETRY');
 return {
  schema:'minecraftaibuilder-r125-featured-source-v1',
  featureIntentSha256:sha(intent),originalPlanSha256:base.planSha256,
  originalSourceSha256:base.sourceSha256,
  originalGeometrySha256:base.geometrySha256,
  featurePlan:structuredClone(intent),placements,
  design,compiled,program:structuredClone(base.program),
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  originalVoxelCount:base.compiled.primitives.length,
  addedVoxelCount:compiled.primitives.length-base.compiled.primitives.length,
  immutableBaseGeometryProven:true,
  sourceRouteAudit:routes,
  modelFeatureAuthorship:'CALLER_PROVIDED_NOT_ATTESTED_AS_LLM',
  semanticFunctionInGameCertified:false,
  aestheticReview:'NOT_REVIEWED',
  worldWrites:0,worldContacts:0,executionAllowed:false,
  constructionApproved:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
}

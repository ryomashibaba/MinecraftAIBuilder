
/**
 * R129: model-INDEPENDENT functional requirements over actual B143 voxels.
 * An authored brief alone, a room label, and an added object count are NOT
 * evidence that a Minecraft building works. Every test remains source-only.
 */
import {verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
export const SCHEMA='minecraftaibuilder-r129-functional-acceptance-v1';
const fail=s=>{throw Error('R129_ACCEPTANCE_'+s);};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const coord=(x,y,z)=>x+','+y+','+z;

export function auditR129FunctionalAcceptance({base,featured,spec}={}){
 if(base?.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
  featured?.schema!=='minecraftaibuilder-r125-featured-source-v1'||
  !verifyCompiled(base.design,base.compiled)||
  !verifyCompiled(featured.design,featured.compiled))
  fail('SOURCE_NOT_VERIFIED');
 const originals=base.design.elements;
 if(featured.originalPlanSha256!==base.planSha256||
  featured.originalSourceSha256!==base.sourceSha256||
  featured.originalGeometrySha256!==base.geometrySha256||
  !same(featured.program,base.program)||
  !same(featured.design.elements.slice(0,originals.length),originals)||
  !same({...featured.design,elements:originals},base.design))
  fail('ORIGINAL_SOURCE_DRIFT');
 if(!exact(spec,['schema','basePlanSha256','needs','zoneOrders'])||
  spec.schema!==SCHEMA||spec.basePlanSha256!==base.planSha256||
  !Array.isArray(spec.needs)||!int(spec.needs.length,1,16)||
  !Array.isArray(spec.zoneOrders)||spec.zoneOrders.length>16)
  fail('SPEC_CONTRACT');
 const zones=new Map(base.program.flatMap(level=>level.zones.map(zone=>
  [zone.id,{...zone,level:level.level}])));
 const seenNeeds=new Set(),seenOrders=new Set();
 for(const need of spec.needs){
  if(!exact(need,['id','zoneId','role','minCount','minAddedVoxels','minReachablePads'])||
   !slug(need.id)||seenNeeds.has(need.id)||!zones.has(need.zoneId)||
   !slug(need.role)||!int(need.minCount,1,8)||
   !int(need.minAddedVoxels,1,5000)||
   !int(need.minReachablePads,1,5000))
   fail('NEED_FIELDS');
  seenNeeds.add(need.id);
 }
 for(const order of spec.zoneOrders){
  if(!exact(order,['id','nearZoneId','farZoneId','axis'])||
   !slug(order.id)||seenOrders.has(order.id)||
   !zones.has(order.nearZoneId)||!zones.has(order.farZoneId)||
   order.nearZoneId===order.farZoneId||!['x','z'].includes(order.axis))
   fail('ORDER_FIELDS');
  seenOrders.add(order.id);
 }
 const before=new Map(base.compiled.primitives.map(p=>[coord(...p.slice(0,3)),p[3]]));
 const after=new Map(featured.compiled.primitives.map(p=>[coord(...p.slice(0,3)),p[3]]));
 for(const [key,mat] of before)if(after.get(key)!==mat)fail('BASE_VOXEL_MUTATION');
 const placements=featured.placements;
 if(!Array.isArray(placements)||placements.length<1||placements.length>8||
  featured.design.elements.length!==originals.length+placements.length||
  featured.featurePlan?.basePlanSha256!==base.planSha256||
  !Array.isArray(featured.featurePlan?.objects))fail('FEATURE_COUNT');
 const placedIds=new Set(),newVoxelKeys=new Set(),evidence=[];
 for(let i=0;i<placements.length;i++){
  const p=placements[i],e=featured.design.elements[originals.length+i];
  if(!slug(p.id)||placedIds.has(p.id)||!zones.has(p.zoneId)||
   !slug(p.role)||!Array.isArray(p.origin)||p.origin.length!==3||
   !Array.isArray(p.size)||p.size.length!==3||
   !p.origin.every(x=>int(x,0,10000))||
   !p.size.every(x=>int(x,1,10000))||
   !e||e.id!=='feature-'+p.id||e.shape!=='box'||e.mode!=='add'||
   e.material!==p.material||!same(e.origin,p.origin)||!same(e.size,p.size)||
   !featured.featurePlan.objects.some(x=>x.id===p.id&&
    x.zoneId===p.zoneId&&x.role===p.role))
   fail('FEATURE_METADATA_NOT_SUPPORTED_BY_SOURCE');
  const zone=zones.get(p.zoneId),[x0,y0,z0]=p.origin;
  const [sx,sy,sz]=p.size;
  // B143 primitives encode materials as zero-based numeric MATERIALS IDs.
  const materialIndex=MATERIALS.indexOf(p.material);
  if(materialIndex<0)fail('FEATURE_MATERIAL_INVALID');
  const floor=base.program.find(l=>l.level===zone.level).standingFloorY;
  if(y0!==floor||x0<zone.range.x[0]||x0+sx-1>zone.range.x[1]||
   z0<zone.range.z[0]||z0+sz-1>zone.range.z[1])
   fail('FEATURE_OUTSIDE_ZONE');
  let count=0;
  for(let x=x0;x<x0+sx;x++)for(let y=y0;y<y0+sy;y++)
   for(let z=z0;z<z0+sz;z++){
    const key=coord(x,y,z);
    if(before.has(key)||newVoxelKeys.has(key)||after.get(key)!==materialIndex)
     fail('FEATURE_VOXEL_MISMATCH');
    newVoxelKeys.add(key);count++;
   }
  evidence.push({id:p.id,zoneId:p.zoneId,role:p.role,
   occupiedNewVoxels:count,origin:p.origin,size:p.size});
  placedIds.add(p.id);
 }
 const added=[...after.keys()].filter(k=>!before.has(k));
 if(added.length!==newVoxelKeys.size||
  added.some(k=>!newVoxelKeys.has(k))||
  featured.addedVoxelCount!==newVoxelKeys.size)
  fail('UNEXPECTED_EXTRA_GEOMETRY');
 const routes=auditR125SourceRoutes({
  ...base,design:featured.design,compiled:featured.compiled,
  sourceSha256:featured.sourceSha256,
  geometrySha256:featured.geometrySha256
 },{featureTargets:placements});
 const reachableFeatureIds=new Set(routes.featureAccess.filter(x=>
  x.reachableFromEntrance).map(x=>x.id));
 const reachByZone=new Map(routes.zones.map(x=>[x.id,x.reachedTwoWidePadCount]));
 const checks=spec.needs.map(n=>{
  const actual=evidence.filter(e=>e.zoneId===n.zoneId&&
   e.role===n.role&&reachableFeatureIds.has(e.id));
  const count=actual.length;
  const voxels=actual.reduce((s,e)=>s+e.occupiedNewVoxels,0);
  const pads=reachByZone.get(n.zoneId)??0;
  const problems=[];
  if(count<n.minCount)problems.push('ITEM_COUNT_DEFICIT');
  if(voxels<n.minAddedVoxels)problems.push('PHYSICAL_VOLUME_DEFICIT');
  if(pads<n.minReachablePads)problems.push('REACHABLE_CLEAR_FLOOR_DEFICIT');
  return {id:n.id,zoneId:n.zoneId,role:n.role,
   required:{count:n.minCount,addedVoxels:n.minAddedVoxels,
    reachablePads:n.minReachablePads},
   actual:{count,addedVoxels:voxels,reachablePads:pads},
   sourceFeatureIds:actual.map(x=>x.id),problems,
   status:problems.length?'HOLD':'SOURCE_EVIDENCE_PRESENT'};
 });
 const spatial=spec.zoneOrders.map(o=>{
  const near=zones.get(o.nearZoneId),far=zones.get(o.farZoneId);
  const ordered=near.level===far.level&&
   near.range[o.axis][1]<far.range[o.axis][0];
  return {id:o.id,axis:o.axis,nearZoneId:o.nearZoneId,
   farZoneId:o.farZoneId,nearRange:near.range[o.axis],
   farRange:far.range[o.axis],
   status:ordered?'SOURCE_EVIDENCE_PRESENT':'HOLD_SPATIAL_ORDER'};
 });
 const unmet=[
  ...checks.filter(x=>x.status==='HOLD').map(x=>x.id),
  ...spatial.filter(x=>x.status==='HOLD_SPATIAL_ORDER').map(x=>x.id)
 ];
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')
  unmet.push('SOURCE_ROUTE_OR_EQUIPMENT_ACCESS');
 return {
  schema:'r129-independent-functional-evidence-v1',
  status:unmet.length?'HOLD_INDEPENDENT_FUNCTIONAL_REQUIREMENTS':
   'SOURCE_ONLY_REQUIREMENTS_MET_REAL_FUNCTION_UNVERIFIED',
  specProvenance:'CALLER_INDEPENDENT_NOT_GENERATED_IN_MODEL_RESPONSE',
  originalPlanSha256:base.planSha256,originalSourceSha256:base.sourceSha256,
  derivativeSourceSha256:featured.sourceSha256,
  sourceRoutes:routes.status,featureEvidence:evidence,
  addedVoxelsVerified:newVoxelKeys.size,
  needChecks:checks,spatialChecks:spatial,unmetIds:unmet,
  limitedToExplicitRequirements:true,
  minecraftFunctionCertified:false,aestheticCertified:false,
  worldWrites:0,worldContacts:0,constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
}

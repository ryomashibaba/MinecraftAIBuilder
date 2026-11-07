/**
 * R132 independent spatial relation -> minimal semantic-IR derivative.
 * Never reinterprets room names. Independent caller supplies the desired
 * near/far pair and x/z coordinate axis explicitly. Original Qwen plan,
 * source SHA and physical voxels remain immutable.
 */
import {compileArchitecturePlan} from './r125-architecture-plan.mjs';
import {proposeR125ThresholdRepair} from './r125-entrance-repair.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
export const SCHEMA='minecraftaibuilder-r132-spatial-relations-v1';
const hold=s=>{throw Error('R132_SPATIAL_'+s);};
const exact=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===fields.length&&fields.every(k=>Object.hasOwn(v,k));
const slug=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(x);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function evidence(product,orders){
 const zones=new Map(product.program.flatMap(level=>level.zones.map(z=>
  [z.id,{...z,level:level.level}])));
 return orders.map(o=>{
  const a=zones.get(o.nearZoneId),b=zones.get(o.farZoneId);
  const satisfied=a.level===b.level&&a.range[o.axis][1]<b.range[o.axis][0];
  return {id:o.id,axis:o.axis,nearZoneId:o.nearZoneId,
   farZoneId:o.farZoneId,nearRange:[...a.range[o.axis]],
   farRange:[...b.range[o.axis]],sameLevel:a.level===b.level,
   satisfiedByActualCompiledZoneGeometry:satisfied};
 });
}
export function deriveR132SpatialPlan({original,requirements}={}){
 if(!exact(requirements,['schema','basePlanSha256','zoneOrders'])||
  requirements.schema!==SCHEMA||
  !Array.isArray(requirements.zoneOrders)||
  requirements.zoneOrders.length<1||requirements.zoneOrders.length>2)
  hold('INDEPENDENT_CONTRACT_REQUIRED');
 if(original?.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
  !original?.compiled||!original?.plan||!original?.design||
  requirements.basePlanSha256!==original.planSha256)
  hold('ORIGINAL_PLAN_PIN_MISMATCH');
 const historicalPlan=JSON.stringify(original.plan);
 const historicalSource=JSON.stringify(original.design);
 // Recompile the source to reject forged, stale or edited pinned evidence.
 const verified=compileArchitecturePlan(original.plan);
 if(verified.planSha256!==original.planSha256||
  verified.sourceSha256!==original.sourceSha256||
  verified.geometrySha256!==original.geometrySha256||
  !same(verified.design,original.design)||!same(verified.compiled,original.compiled))
  hold('UNVERIFIED_ORIGINAL');
 const levels=new Map();
 for(const l of original.program)for(const z of l.zones)
  levels.set(z.id,l.level);
 const seenIds=new Set(),specifiedLevels=new Set();
 for(const o of requirements.zoneOrders){
  if(!exact(o,['id','nearZoneId','farZoneId','axis'])||
   !slug(o.id)||seenIds.has(o.id)||
   !['x','z'].includes(o.axis)||
   !levels.has(o.nearZoneId)||!levels.has(o.farZoneId)||
   o.nearZoneId===o.farZoneId||
   levels.get(o.nearZoneId)!==levels.get(o.farZoneId)||
   specifiedLevels.has(levels.get(o.nearZoneId)))
   hold('RELATION_NOT_APPLICABLE_OR_CONFLICTING');
  const level=original.plan.levels[levels.get(o.nearZoneId)];
  if(level.spaces.length!==2||
   !level.spaces.some(z=>z.id===o.nearZoneId)||
   !level.spaces.some(z=>z.id===o.farZoneId))
   hold('RELATION_CANNOT_FIT_TWO_ZONE_IR');
  specifiedLevels.add(levels.get(o.nearZoneId));seenIds.add(o.id);
 }
 const before=evidence(original,requirements.zoneOrders);
 const plan=structuredClone(original.plan);
 const changedLevels=[];
 for(const order of requirements.zoneOrders){
  const l=levels.get(order.nearZoneId),target=plan.levels[l];
  const first=target.spaces.find(s=>s.id===order.nearZoneId);
  const second=target.spaces.find(s=>s.id===order.farZoneId);
  if(target.splitAxis!==order.axis||target.spaces[0].id!==first.id){
   changedLevels.push({level:l,oldAxis:target.splitAxis,newAxis:order.axis,
    oldZoneOrder:target.spaces.map(s=>s.id),
    newZoneOrder:[first.id,second.id]});
   target.splitAxis=order.axis;
   target.spaces=[first,second];
  }
 }
 // This is a new, hash-addressed derivative (not an original model answer).
 const recompiled=compileArchitecturePlan(plan);
 const repaired=proposeR125ThresholdRepair(recompiled);
 const candidate=repaired.candidate;
 const after=evidence(candidate,requirements.zoneOrders);
 const route=auditR125SourceRoutes(candidate);
 if(!after.every(x=>x.satisfiedByActualCompiledZoneGeometry)||
  route.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  JSON.stringify(original.plan)!==historicalPlan||
  JSON.stringify(original.design)!==historicalSource)
  hold('SPATIAL_OR_SOURCE_ROUTE_NOT_PROVEN');
 // All geometry edits must be traceable to split axis/order and optional
 // separately bounded entrance repair. No material, volume or style rewrite.
 for(const name of ['footprint','materials','expression','title','brief','id'])
  if(!same(original.plan[name],plan[name]))hold('NON_SPATIAL_REWRITE');
 return {schema:'r132-spatial-plan-candidate-v1',
  status:changedLevels.length?
   'SOURCE_SPATIAL_ORDER_DERIVED_REAL_WORLD_UNVERIFIED':
   'SOURCE_SPATIAL_ORDER_ALREADY_SATISFIED',
  evidenceProvenance:'CALLER_EXPLICIT_RELATIONS_NOT_INFERRED_FROM_ROOM_NAMES',
  originalPlanSha256:original.planSha256,
  originalSourceSha256:original.sourceSha256,
  originalGeometrySha256:original.geometrySha256,
  derivedPlanSha256:recompiled.planSha256,
  derivedSourceSha256:candidate.sourceSha256,
  derivedGeometrySha256:candidate.geometrySha256,
  changedLevels,entranceRepairSourceChanged:repaired.sourceChanged,
  before,after,sourceRouteAudit:route,
  candidatePlan:plan,candidateBase:candidate,
  originalPlanUnchanged:true,originalSourceUnchanged:true,
  modelCalls:0,realModelSpatialDecision:'NOT_TESTED',
  artReview:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  worldWrites:0,worldContacts:0,constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}};
}

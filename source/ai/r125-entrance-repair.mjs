/**
 * R125 source-only, evidence-bounded entrance relocation proposal.
 * The historic Qwen authored IR and source remain UNCHANGED. If the
 * original door sits across a wall divider, derive a separate B143 design
 * with a moved 2-wide cut. Inspect the real local voxel delta and require a
 * complete entrance-to-all-zones route graph, or HOLD. NO Minecraft writes.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const fail=x=>{throw Error('R125_THRESHOLD_'+x);};
const key=p=>p.slice(0,3).join(',');
export function proposeR125ThresholdRepair(base){
 if(base?.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
  !base.design||!base.compiled||
  !verifyCompiled(base.design,base.compiled))fail('UNVERIFIED_BASE');
 const before=auditR125SourceRoutes(base);
 if(before.status==='SOURCE_ROUTES_REACH_ALL_ZONES'){
  return {schema:'r125-entrance-repair-review-v1',
   status:'SOURCE_ENTRANCE_ALREADY_CONNECTED',
   candidate:base,sourceChanged:false,
   originalSourceSha256:base.sourceSha256,
   revisedSourceSha256:base.sourceSha256,
   changedVoxelCoordinates:0,routeAudit:before,
   worldWrites:0,executionAllowed:false};
 }
 if(!before.issues.includes('INTERIOR_ENTRANCE_THRESHOLD_NOT_CLEAR')||
  !before.issues.every(x=>
   x==='INTERIOR_ENTRANCE_THRESHOLD_NOT_CLEAR'||
   x.startsWith('UNREACHABLE_ZONE_')||
   x==='UPPER_PROGRAM_NOT_CONNECTED_TO_INTERIOR_THRESHOLD'))
  fail('UNSUPPORTED_REASON');
 const door=base.design.elements.find(x=>x.id==='exterior-entrance');
 if(!door||door.mode!=='cut'||door.shape!=='box'||door.size?.[0]!==2||
  door.size?.[1]!==3||door.size?.[2]!==1)
  fail('INVALID_ORIGINAL_DOOR');
 const baseMap=new Map(base.compiled.primitives.map(p=>[key(p),p[3]]));
 for(let dx=2;dx<=6;dx++){
  const x=door.origin[0]-dx;
  if(x<5)continue;
  const design=structuredClone(base.design);
  const active=design.elements.find(e=>e.id==='exterior-entrance');
  active.origin=[x,door.origin[1],door.origin[2]];
  let compiled;
  try{compiled=compileDesign(design);}catch{continue;}
  const candidate={...base,design,compiled,
   sourceSha256:compiled.sourceSha256,
   geometrySha256:compiled.geometrySha256,
   modelAuthorship:'HISTORIC_LLM_PLAN_DERIVED_ENTRANCE_REPAIR',
   originalQwenSourceSha256:base.sourceSha256};
  const after=auditR125SourceRoutes(candidate);
  if(after.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')continue;
  const nextMap=new Map(compiled.primitives.map(p=>[key(p),p[3]]));
  const changed=new Set();
  for(const [coord,val] of baseMap)
   if(nextMap.get(coord)!==val)changed.add(coord);
  for(const [coord,val] of nextMap)
   if(baseMap.get(coord)!==val)changed.add(coord);
  const allowed=new Set();
  for(const origin of [door.origin,active.origin])
   for(let xx=origin[0];xx<origin[0]+2;xx++)
    for(let yy=origin[1];yy<origin[1]+3;yy++)
     allowed.add([xx,yy,origin[2]].join(','));
  if(!changed.size||changed.size>12||
   [...changed].some(coord=>!allowed.has(coord)))
   fail('UNBOUNDED_SOURCE_EDIT');
  return {
   schema:'r125-entrance-repair-review-v1',
   status:'SOURCE_ENTRANCE_RELOCATED_ALL_ZONES_REACHABLE',
   candidate,sourceChanged:true,
   originalPlanSha256:base.planSha256,
   originalSourceSha256:base.sourceSha256,
   originalGeometrySha256:base.geometrySha256,
   revisedSourceSha256:compiled.sourceSha256,
   revisedGeometrySha256:compiled.geometrySha256,
   originalDoor:structuredClone(door.origin),
   revisedDoor:structuredClone(active.origin),
   changedVoxelCoordinates:changed.size,
   changeFootprintConfinedToTwoDoorCutRegions:true,
   routeAudit:after,
   originalQwenDesignMutated:false,
   physicalMinecraftWalkingCertified:false,
   constructionApproved:false,executionAllowed:false,
   worldWrites:0,gates:Array(9).fill('BLOCKED')
  };
 }
 fail('NO_BOUNDED_ROUTE_REPAIR');
}

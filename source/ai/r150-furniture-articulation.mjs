/**
 * R150 — type-neutral furniture role articulation.
 * Model-selected roles/rooms/corners and R130 actual placement are IMMUTABLE.
 * Host adds only small features strictly INSIDE each existing equipment volume.
 * Uses genuine B143 voxels, not extra labels or typology-specific furniture.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const fail=s=>{throw Error('R150_ROLE_'+s);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const loc=p=>p.slice(0,3).join(',');
const key=(x,y,z)=>[x,y,z].join(',');
const parts=Object.freeze({
 'work-surface':[
  ['undershelf','metal',[1,1,1],[3,1,1]]],
 'equipment-bank':[
  ['left-led','glow',[1,2,1],[1,1,1]],
  ['right-led','glow',[3,2,1],[1,1,1]]],
 'display-stand':[
  ['exhibit','accent',[2,1,0],[1,1,1]]],
 'storage-rack':[
  ['bin-left','stone',[1,2,0],[1,1,1]],
  ['bin-right','wood',[3,2,0],[1,1,1]]],
 'seating':[
  ['seat-cushion','accent',[0,1,0],[4,1,2]]]
});
function contains(p,feature){
 const [x,y,z]=p,[ox,oy,oz]=feature.origin,[sx,sy,sz]=feature.size;
 return x>=ox&&x<ox+sx&&y>=oy&&y<oy+sy&&z>=oz&&z<oz+sz;
}
export function deriveR150FurnitureArticulation(base,
 {allowDecorativeDeferral=false}={}){
 if(base?.schema!=='minecraftaibuilder-r125-featured-source-v1'||
  base.r149ExpressionEvidence?.unchangedInteriorVoxels!==true||
  !base?.design||!base?.compiled||!verifyCompiled(base.design,base.compiled)||
  base.sourceSha256!==base.compiled.sourceSha256||
  base.geometrySha256!==base.compiled.geometrySha256||
  !Array.isArray(base.placements)||base.placements.length<1||
  base.placements.length>8||!Array.isArray(base.program)||
  base.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  base.design.elements.some(x=>x.id.startsWith('r150-')))
  fail('VERIFIED_R149_FURNISHED_SOURCE_REQUIRED');
 const plan=structuredClone(base.design),originalElements=plan.elements.length;
 const seen=new Set();
 const roleCounts={},added=[];
 for(const feature of base.placements){
  if(typeof feature.id!=='string'||!Array.isArray(feature.origin)||
   !Array.isArray(feature.size)||seen.has(feature.id)||
   !Array.isArray(parts[feature.role]))fail('FEATURE_ROLE_OR_SOURCE_CONTRACT');
  seen.add(feature.id);
  roleCounts[feature.role]=(roleCounts[feature.role]??0)+1;
  for(const [tag,material,offset,size] of parts[feature.role]){
   const origin=feature.origin.map((v,i)=>v+offset[i]);
   const fullId='r150-'+feature.id+'-'+tag;
   const elementId=fullId.length<=40?fullId:
    'r150-'+createHash('sha256').update(feature.id).digest('hex').slice(0,16)+'-'+tag;
   const element={id:elementId,
    shape:'box',mode:'add',material,origin,size};
   if(element.id.length>40||!size.every((s,i)=>
    s>0&&offset[i]>=0&&offset[i]+s<=feature.size[i]))
    fail('PART_OUTSIDE_ORIGINAL_FURNITURE_BOUNDS');
   plan.elements.push(element);added.push({role:feature.role,
    featureId:feature.id,elementId:element.id,origin,size});
  }
 }
 // R169: the model's full assembled furnishings and source-reachable
 // service fronts are already safe. Decorative details are optional:
 // if adding all details blocks a genuine 2-wide service route, derive
 // the maximal safe prefix incrementally, without shifting/removing even one
 // original model-chosen equipment solid. Every omission is audit-visible.
 const targets=base.placements.map(p=>({
  id:p.id,zoneId:p.zoneId,origin:p.origin,size:p.size
 }));
 const inspect=(design,compiled)=>auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:base.program,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 },{featureTargets:targets});
 const routeSafe=a=>a.status==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
  a.featureAccess.length===base.placements.length&&
  a.featureAccess.every(x=>x.reachableFromEntrance);
 let compiled=compileDesign(plan);
 let audit=inspect(plan,compiled);
 const suppressedDetails=[];
 if(!routeSafe(audit)){
  const candidates=new Map(plan.elements.slice(originalElements).map(e=>[e.id,e]));
  const trial=structuredClone(base.design),safeDetails=[];
  let trialCompiled=base.compiled,trialAudit=base.sourceRouteAudit;
  for(const item of added){
   const shape=candidates.get(item.elementId);
   if(!shape)fail('DETAIL_SOURCE_LOST');
   const next={...trial,elements:[...trial.elements,shape]};
   let built,nextAudit;
   try{
    built=compileDesign(next);
    nextAudit=inspect(next,built);
   }catch(e){
    suppressedDetails.push({elementId:item.elementId,featureId:item.featureId,
     reason:'DETAIL_COMPILE_HOLD',errorCode:String(e?.message??e).slice(0,80)});
    continue;
   }
   if(routeSafe(nextAudit)){
    trial.elements=next.elements;
    trialCompiled=built;trialAudit=nextAudit;
    safeDetails.push(item);
   }else{
    suppressedDetails.push({elementId:item.elementId,featureId:item.featureId,
     reason:'DETAIL_BLOCKS_REAL_SERVICE_OR_ROOM_ROUTE',
     issues:nextAudit.issues.slice(0,12)});
   }
  }
  if(!safeDetails.length){
   // R169 opt-in research: R149 already contains real reachable furnishings.
   // Decoration never becomes a mandatory condition for preserving a valid
   // building. Explicitly defer ALL optional changes, do not fabricate art.
   if(!allowDecorativeDeferral)
    fail('ALL_DETAILS_BLOCK_REAL_SERVICE_ROUTES');
   if(base.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    !base.sourceRouteAudit.featureAccess?.every(x=>x.reachableFromEntrance))
    fail('UNSAFE_ORIGINAL_FURNISHED_SOURCE');
   return {...base,
    r150EquipmentEvidence:{
     source:'HOST_OPTIONAL_FURNITURE_DETAILS_DEFERRED_DUE_TO_ROUTE_SAFETY',
     originalEquipmentCount:base.placements.length,
     appendedSmallComponentCount:0,
     optionalDetailSuppressionOccurred:true,
     suppressedUnsafeComponentCount:suppressedDetails.length,
     suppressedUnsafeComponents:suppressedDetails,
     originalEquipmentUnmodified:true,
     preservedOriginalQwenRooms:true,
     preservedOriginalQwenRelations:true,
     preservedModelEquipmentChoices:true,
     noExteriorWallFloorRoofCorridorChanged:true,
     sourceRouteStatus:base.sourceRouteAudit.status,
     reachableEquipment:base.sourceRouteAudit.featureAccess.length,
     originalSourceSha256:base.sourceSha256,
     newSourceSha256:base.sourceSha256,
     actualMinecraftWalking:'NOT_TESTED',
     humanArtReview:'ART_HOLD',
     fixedStyleOrBuildingTypeTemplate:false,
     decorativePass:false
    },
    architecturalQuality:'ART_HOLD_DETAILS_DEFERRED',
    aestheticApproved:false,readiness:'NOT_PREPARED',
    constructionApproved:false,executionAllowed:false,
    gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
    worldContacts:0,worldWrites:0
   };
  }
  plan.elements=trial.elements;
  compiled=trialCompiled;audit=trialAudit;
  added.length=0;added.push(...safeDetails);
 }
 if(!verifyCompiled(plan,compiled)||
  !equal(plan.elements.slice(0,originalElements),base.design.elements))
  fail('ORIGINAL_SOURCE_PREFIX_CHANGED');
 const before=new Map(base.compiled.primitives.map(p=>[loc(p),p[3]]));
 const after=new Map(compiled.primitives.map(p=>[loc(p),p[3]]));
 let changedMaterialCells=0,newOccupiedCells=0;
 // No previously occupied voxel outside actual selected equipment may be
 // removed or re-materialized; no newly occupied cell may leave that volume.
 for(const [location,oldMat] of before){
  const newMat=after.get(location);
  const p=location.split(',').map(Number);
  if(newMat===undefined||newMat!==oldMat&&
   !base.placements.some(feature=>contains(p,feature)))
   fail('ORIGINAL_ARCHITECTURE_OR_ROUTE_REWRITTEN');
  if(newMat!==oldMat)changedMaterialCells++;
 }
 for(const [location] of after){
  if(before.has(location))continue;
  const p=location.split(',').map(Number);
  if(!base.placements.some(feature=>contains(p,feature)))
   fail('NEW_VOXEL_OUTSIDE_ORIGINAL_EQUIPMENT');
  newOccupiedCells++;
 }
 if(changedMaterialCells+newOccupiedCells===0)
  fail('NO_VISUAL_GEOMETRY_OR_MATERIAL_CHANGE');
 if(!routeSafe(audit))
  fail('ORIGINAL_EQUIPMENT_ACCESS_OR_ROOM_ROUTE_REGRESSION');
 return {...base,design:plan,compiled,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  sourceRouteAudit:audit,
  parentSourceSha256:base.sourceSha256,
  parentGeometrySha256:base.geometrySha256,
  aestheticApproved:false,
  architecturalQuality:'HUMAN_REVIEW_REQUIRED',
  worldWrites:0,worldContacts:0,executionAllowed:false,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  r150EquipmentEvidence:{
   source:'HOST_ROLE_GEOMETRY_FROM_MODEL_SELECTED_ROLES_NOT_LLM_NEW_DESIGN',
   preservedOriginalQwenRooms:true,
   preservedOriginalQwenRelations:true,
   preservedModelEquipmentChoices:true,
   preservedOriginalEquipmentPlacement:true,
   roles:roleCounts,
   originalEquipmentCount:base.placements.length,
   appendedSmallComponentCount:added.length,
   optionalDetailSuppressionOccurred:suppressedDetails.length>0,
   suppressedUnsafeComponentCount:suppressedDetails.length,
   suppressedUnsafeComponents:suppressedDetails,
   originalEquipmentUnmodified:true,
   changedMaterialCellsInsideEquipment:changedMaterialCells,
   newlyOccupiedCellsInsideEquipment:newOccupiedCells,
   noExteriorWallFloorRoofCorridorChanged:true,
   newSourceSha256:compiled.sourceSha256,
   originalSourceSha256:base.sourceSha256,
   sourceRouteStatus:audit.status,
   reachableEquipment:audit.featureAccess.length,
   actualMinecraftWalking:'NOT_TESTED',
   humanArtReview:'NOT_REVIEWED',
   fixedStyleOrBuildingTypeTemplate:false
  }};
}

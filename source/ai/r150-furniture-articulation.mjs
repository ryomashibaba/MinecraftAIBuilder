/**
 * R150 — type-neutral furniture role articulation.
 * Model-selected roles/rooms/corners and R130 actual placement are IMMUTABLE.
 * Host adds only small features strictly INSIDE each existing equipment volume.
 * Uses genuine B143 voxels, not extra labels or typology-specific furniture.
 */
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
export function deriveR150FurnitureArticulation(base){
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
   const element={id:'r150-'+feature.id+'-'+tag,
    shape:'box',mode:'add',material,origin,size};
   if(element.id.length>40||!size.every((s,i)=>
    s>0&&offset[i]>=0&&offset[i]+s<=feature.size[i]))
    fail('PART_OUTSIDE_ORIGINAL_FURNITURE_BOUNDS');
   plan.elements.push(element);added.push({role:feature.role,
    featureId:feature.id,elementId:element.id,origin,size});
  }
 }
 const compiled=compileDesign(plan);
 if(!verifyCompiled(plan,compiled)||
  !equal(plan.elements.slice(0,originalElements),base.design.elements))
  fail('ORIGINAL_SOURCE_PREFIX_CHANGED');
 const before=new Map(base.compiled.primitives.map(p=>[loc(p),p[3]]));
 const after=new Map(compiled.primitives.map(p=>[loc(p),p[3]]));
 let changedMaterialCells=0,newOccupiedCells=0;
 // A changed voxel is permissible only INSIDE a model-selected piece of
 // equipment. Every original exterior, roof, wall, door, floor and corridor
 // voxel must stay identical, including its material.
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
 const audit=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design:plan,compiled,program:base.program,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 },{featureTargets:base.placements.map(p=>({
  id:p.id,zoneId:p.zoneId,origin:p.origin,size:p.size
 }))});
 if(audit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  audit.featureAccess.length!==base.placements.length||
  !audit.featureAccess.every(x=>x.reachableFromEntrance))
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

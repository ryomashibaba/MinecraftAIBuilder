/** B90: geometry-grounded, non-executable program/door intervention frontier. */
import {key,maskHasFloor} from '../../b79/main/compile-b79.mjs';
import {chooseCoreAndPaths} from '../../b78/main/compile-b78.mjs';
import {interiorEdges} from '../../b86/main/compile-b86.mjs';
import {frameAt,walkable} from '../../b88/main/compile-b88.mjs';
const coord=p=>`${p.x},${p.y},${p.z}`;
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const directions=[{x:0,z:-1},{x:1,z:0},{x:0,z:1},{x:-1,z:0}];
const add=(a,b)=>({x:a.x+b.x,z:a.z+b.z});
const hard=new Set(['primaryWall','structural','foundation']);
export function interventionClass(v){
 if(!v?.occupied)return 'CLEAR';
 if(hard.has(v.role))return 'STRUCTURAL_HOLD';
 if(['glass','glazing','frame','window'].includes(v.role)||v.block?.includes('glass'))return 'GLAZING_HOLD';
 if(['secondaryWall','partition'].includes(v.role))return 'SECONDARY_WALL_APPROVAL_REQUIRED';
 return 'OTHER_PINNED_BLOCK_HOLD';
}
export function sampleStack(idx,p,level,heights=[1,2]){
 const base=(level-1)*5;
 return heights.map(dy=>({x:p.x,z:p.z,y:base+dy,...(idx.final.get(`${p.x},${base+dy},${p.z}`)??{occupied:false,role:'air',block:'air',phase:null})}));
}
export function contiguousInterior(room,cell,idx,level,fixed){
 const reserved2D=new Set([...fixed.solids,...fixed.reserved].map(v=>{const [x,,z]=v.split(',');return `${x},${z}`}));
 const forbidden=new Set();
 for(let z=room.z;z<room.z+room.depth;z++)for(let x=room.x;x<room.x+room.width;x++){
  const p={x,z};if(fixed.protectedSites.has(key(p))||reserved2D.has(key(p))||sampleStack(idx,p,level).some(s=>s.occupied))forbidden.add(key(p));
 }
 if(forbidden.has(key(cell)))return null;
 return chooseCoreAndPaths(room,[cell],forbidden);
}
/** Every candidate retains all original room cells and ALL prior production and proposed voxels.
 * A "frontier" is evidence for a future architectural change, NOT an approved doorway. */
export function programDoorFrontiers({room,port,shape,idx,fixed,network,otherRooms,maxFrontiers=5}){
 const vertical=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const unavailable3D=new Set([...fixed.solids,...fixed.reserved]);
 const originalCorridor=new Set(shape.conceptReservations.corridors.map(key));
 const scans=[],reasons={outsideOrOtherRoom:0,verticalOrFrozen:0,innerNotClear:0,noInteriorCore:0,unanchoredHall:0,structuralOrGlass:0,secondaryOrOther:0,clearDoorFrontier:0};
 for(const e of interiorEdges(room)){
  const {cell,hall,normal,left,right}=e;
  if(!maskHasFloor(shape.floorMaskRows,hall)||otherRooms.some(r=>inside(r,hall))){reasons.outsideOrOtherRoom++;continue;}
  if(vertical.has(key(hall))||vertical.has(key(cell))||fixed.protectedSites.has(key(cell))||fixed.protectedSites.has(key(hall))){reasons.verticalOrFrozen++;continue;}
  const sites=[cell,hall];
  if(sites.some(p=>sampleStack(idx,p,shape.level).some(s=>unavailable3D.has(coord(s))))){reasons.verticalOrFrozen++;continue;}
  // Inner approach and the full original room core must be genuinely empty.
  const inner=add(cell,{x:-normal.x,z:-normal.z});
  if(!inside(room,inner)||sampleStack(idx,inner,shape.level).some(s=>s.occupied||unavailable3D.has(coord(s)))||fixed.protectedSites.has(key(inner))){reasons.innerNotClear++;continue;}
  const core=contiguousInterior(room,cell,idx,shape.level,fixed);
  // Core may fail specifically because the door voxel is occupied; diagnose it separately.
  const knownInteriorCore=core??contiguousInterior(room,inner,idx,shape.level,fixed);
  if(!knownInteriorCore){reasons.noInteriorCore++;continue;}
  const componentId=network.bySite.get(key(hall));
  // A named corridor need not be physically open. This flag is only graph metadata.
  if(componentId===undefined){reasons.unanchoredHall++;continue;}
  const component=network.components.find(c=>c.id===componentId);
  const opening=[...sampleStack(idx,cell,shape.level),...sampleStack(idx,hall,shape.level)];
  const impacted=opening.filter(v=>v.occupied).map(v=>({x:v.x,y:v.y,z:v.z,role:v.role,block:v.block,phase:v.phase,operationIndex:v.operationIndex,category:interventionClass(v)}));
  const structural=impacted.filter(v=>v.category==='STRUCTURAL_HOLD').length;
  const glazing=impacted.filter(v=>v.category==='GLAZING_HOLD').length;
  const other=impacted.filter(v=>v.category==='OTHER_PINNED_BLOCK_HOLD').length;
  const secondary=impacted.filter(v=>v.category==='SECONDARY_WALL_APPROVAL_REQUIRED').length;
  if(structural||glazing)reasons.structuralOrGlass++;else if(secondary||other)reasons.secondaryOrOther++;else reasons.clearDoorFrontier++;
  // The flank columns and lintel are kept for the future 3D joint-design review.
  const jambs=[left,right].map(p=>sampleStack(idx,p,shape.level,[1,2,3]).map(s=>({x:s.x,z:s.z,y:s.y,role:s.role,block:s.block,occupied:s.occupied,category:interventionClass(s)})));
  scans.push({roomCell:cell,hallCell:hall,normal,atOriginalPort:key(cell)===key(port.roomCell),
   namedCorridor:true,componentCoreAdjacent:component.coreAdjacent,componentId,
   originalRoomArea:room.width*room.depth,retainedAreaRatio:1,openingProductionContacts:impacted,
   modificationBudget:{structural,glazing,other,secondary,total:impacted.length},
   jambConditions:jambs.map(col=>({existingWallCount:col.filter(s=>s.occupied).length,
    allExistingWallsOpaque:col.every(s=>!s.occupied||['primaryWall','secondaryWall'].includes(s.role)),
    mixedExistingRoles:new Set(col.filter(s=>s.occupied).map(s=>s.role)).size>1})),
   edgeFrameValidated:!!frameAt(e,shape,idx,fixed,otherRooms),
   hallPhysicallyClear:walkable(hall,shape.level,shape,idx,fixed,otherRooms),
   innerSwingAdjacentClear:[left,right].some(p=>inside(room,p)&&sampleStack(idx,p,shape.level).every(v=>!v.occupied&&!unavailable3D.has(coord(v)))&&!fixed.protectedSites.has(key(p))),
   innerCell:inner,roomCore:knownInteriorCore.core,nominalInteriorPath:knownInteriorCore.paths[0],
   architecturalAccess:'NOT_CERTIFIED',productionModificationApproved:false,
   status:impacted.length?'HOLD_CONDITIONAL_PRODUCTION_CHANGE':'HOLD_DOOR_FRAME_AND_GLOBAL_ACCESS_UNVERIFIED',
   executionAllowed:false,operations:[],worldCoordinates:null});
 }
 scans.sort((a,b)=>a.modificationBudget.structural-b.modificationBudget.structural||
  a.modificationBudget.glazing-b.modificationBudget.glazing||a.modificationBudget.other-b.modificationBudget.other||
  a.modificationBudget.secondary-b.modificationBudget.secondary||Number(b.componentCoreAdjacent)-Number(a.componentCoreAdjacent)||
  Number(b.atOriginalPort)-Number(a.atOriginalPort)||key(a.roomCell).localeCompare(key(b.roomCell)));
 return {scannedValidFrontiers:scans.length,frontiers:scans.slice(0,maxFrontiers),rejections:reasons,
  strictLocalGeometryOnly:scans.some(s=>s.modificationBudget.total===0&&s.edgeFrameValidated&&s.innerSwingAdjacentClear&&s.hallPhysicallyClear),
  partialAirSlotWithoutCompleteDoorGeometry:scans.filter(s=>s.modificationBudget.total===0).length,
  fullyFrameValidated:scans.filter(s=>s.edgeFrameValidated&&s.innerSwingAdjacentClear&&s.hallPhysicallyClear).length,
  noPrimaryOrGlazingChange:scans.some(s=>s.modificationBudget.structural===0&&s.modificationBudget.glazing===0)};
}
/** Strictly cannot turn one inaccessible room into a separately accessible unit via relabeling. */
export function programAlternatives({room,frontiers,sectionId}){
 const area=room.width*room.depth,coreConnected=frontiers.frontiers.some(x=>x.componentCoreAdjacent);
 return [
  {id:'PRESERVE_INDEPENDENT_ROOM',independentRoomsRetained:0,roomAreaReassigned:0,accessibleAreaClaimed:0,
   scope:'ORIGINAL_DESIGN_HELD',status:'HOLD_ACCESS_UNPROVEN',approval:'REVIEW_ONLY',executionAllowed:false,operations:[]},
  {id:'CONVERT_TO_NONOCCUPIABLE_LAYOUT_BUFFER',independentRoomsRetained:0,roomAreaReassigned:area,accessibleAreaClaimed:0,
   scope:'PROGRAM_ZONING_REVIEW_ONLY',status:'HOLD_PROGRAM_REDUCTION_AND_PHYSICAL_ACCESS',approval:'REVIEW_ONLY',executionAllowed:false,operations:[]},
  {id:'FULL_FLOOR_CORE_CIRCULATION_REDESIGN',independentRoomsRetained:0,roomAreaReassigned:0,accessibleAreaClaimed:0,
   scope:'WHOLE_FLOOR_ARCHITECTURAL_REDESIGN',status:'HOLD_FLOOR_GRAPH_AND_DOOR_GEOMETRY',coreConnected,sectionId,
   approval:'REVIEW_ONLY',executionAllowed:false,operations:[]}
 ];
}
export function patternConsensus(rows){
 const patterns=new Map();for(const x of rows){const a=patterns.get(x.pattern)??[];a.push(x);patterns.set(x.pattern,a);}
 return [...patterns].sort((a,b)=>a[0].localeCompare(b[0])).map(([pattern,group])=>{
  const count=group.length,withFrontier=group.filter(g=>g.doorFrontiers.scannedValidFrontiers>0).length,
    withLowImpact=group.filter(g=>g.doorFrontiers.noPrimaryOrGlazingChange).length;
  const budget=group.map(g=>g.doorFrontiers.frontiers[0]?.modificationBudget??null);
  // No one-floor sample extrapolated to the whole template. All floors must pass.
  return {pattern,count,localFrontierFloors:withFrontier,softCompatibleFloors:withLowImpact,
   commonZeroStructuralChange:withLowImpact===count&&count>0,
   perFloorMinimumKnownOpeningBudget:budget,
   allFloorsNeedArchitectureReview:true,approval:'REVIEW_ONLY',executionAllowed:false};
 });
}
export function validateB90Plan(p){
 if(p.readiness!=='NOT_PREPARED'||p.executionAllowed!==false||p.BuildPlan?.operations?.length!==0||p.BuildPlan?.commandCount!==0||p.gates?.length!==9||p.gates.some(x=>x.status!=='BLOCKED')||p.worldContacts!==0)return false;
 if(p.totals.previousUnapprovedCandidates!==296||p.totals.unresolvedIndependentRooms!==18||p.totals.newlyApprovedRooms!==0)return false;
 if(p.rooms?.length!==18||p.patterns?.length!==4)return false;
 if(p.rooms.some(r=>r.programOptions.some(o=>o.executionAllowed!==false||o.operations?.length!==0||o.accessibleAreaClaimed!==0)))return false;
 if(p.rooms.some(r=>r.doorFrontiers.frontiers.some(f=>f.executionAllowed!==false||f.operations?.length!==0)))return false;
 return true;
}

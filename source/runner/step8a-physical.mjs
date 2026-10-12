// Step8A.4 / OFFLINE ONLY. Conservative local-voxel design checks, NOT a world or code compliance test.
// Pure function. No Minecraft block IDs, no commands, no I/O, no build approval.
const k=(x,z)=>`${x},${z}`;
const vk=(x,z,y)=>`${x},${z},${y}`;
const stepCoords=(r)=>{const out=[];for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)out.push([x,z]);return out;};
const safety=()=>({constructionApproved:false,executionAllowed:false,notPrepared:true,noBridge:true,noScan:true,noPackGeneration:true,noWorldMutation:true});
const fail=(reason)=>{throw Object.assign(new Error(reason),{code:'UNSAFE_INPUT'});};
function mask(concept,f){const cells=new Set();for(const r of concept.Massing.rectangles){if(r.start>f||r.end<=f)continue;for(const [x,z] of stepCoords(r))cells.add(k(x,z));}return cells;}
function inside(x,z,w,d){return x>=0&&z>=0&&x<w&&z<d;}
function roomQuality(room,facadeByCell,floorH){
 const interiorWidth=Math.max(0,room.width-2),interiorDepth=Math.max(0,room.depth-2);
 const exposed=[];for(const [x,z] of stepCoords(room))for(const face of ['north','south','east','west']){
  const part=facadeByCell.get(`${room.level}/${x}/${z}/${face}`);
  if(part?.kind==='GLAZING_INTENT')exposed.push({x,z,face});
 }
 // 2x2 furnishing zone is only a dimensionless reservation for later furniture planning.
 // A room's door leaf and swept volume, daylight and actual fit are NOT tested.
 const furnitureIntent=interiorWidth>=2&&interiorDepth>=2 ? {zone:{x:room.x+1,z:room.z+1,width:Math.min(2,interiorWidth),depth:Math.min(2,interiorDepth)},kind:room.role==='workspace'?'WORKSPACE_DESK_ZONE':room.role==='guest_room_zone'?'BED_ZONE':'GENERIC_INTERIOR_ZONE',placed:false,doorSweepVerified:false} : null;
 return {roomId:room.id,level:room.level,nominalOuterArea:room.width*room.depth,assumedOneBlockPerimeter:true,
  usableInteriorCellsBeforeFurniture:interiorWidth*interiorDepth,interiorDimensions:{width:interiorWidth,depth:interiorDepth},
  reservedFurnitureZone:furnitureIntent,glazingAdjacentModules:exposed.length,facadeGlazingEvidence:'GEOMETRIC_INTENT_ONLY',
  daylightVerified:false,ventilationVerified:false,doorSwingVerified:false,accessibilityVerified:false,
  potentialLayoutIssue:interiorWidth<2||interiorDepth<2?'SMALL_INTERIOR_AFTER_WALLS':null};
}
export function assessPhysicalDesign(concept,architecture,detail){
 if(concept?.BuildPlan?.status!=='NOT_PREPARED'||architecture?.BuildPlan?.status!=='NOT_PREPARED'||detail?.BuildPlan?.status!=='NOT_PREPARED'||
  concept.safety?.executionAllowed!==false||architecture.safety?.executionAllowed!==false||detail.safety?.executionAllowed!==false||
  concept.safety?.constructionApproved!==false||detail.safety?.constructionApproved!==false)fail('All inputs must be strictly NOT_PREPARED and executionAllowed=false');
 const {width:w,depth:d}=concept.BuildingComposition.dimensions,h=concept.BuildingComposition.floorHeight,n=concept.BuildingComposition.floorCount;
 if(!Number.isInteger(h)||h<3||!Number.isInteger(n)||n<2||n>10||w<1||d<1)fail('Unsupported voxel envelope');
 if(detail.roomsAndCorridors?.floors?.length!==n)fail('Detail floors mismatch');
 const footprints=Array.from({length:n},(_,i)=>mask(concept,i));
 const stair=detail.stair,facade=detail.facade;
 const solids=new Map(),conflicts=[],conflictCount=new Map();
 const problem=(code,point,description)=>{conflictCount.set(code,(conflictCount.get(code)??0)+1);if(conflicts.length<70)conflicts.push({code,...point,description});};
 const add=(x,z,y,kind)=>{if(!Number.isInteger(x)||!Number.isInteger(z)||!Number.isInteger(y)||!inside(x,z,w,d)||y<0||y>n*h){problem('OUT_OF_BOUNDS',{x,z,y},kind);return;}
  const id=vk(x,z,y),old=solids.get(id);if(old&&old!==kind&&!(old==='PARTITION_WALL'&&kind==='FACADE_SOLID'))problem('SOLID_RESERVATION_OVERLAP',{x,z,y},`${old} vs ${kind}`);
  if(!old)solids.set(id,kind);
 };
 // Intermediate 1-block slabs immediately below each upper floor. Stair and elevator
 // shafts are left open unless a conceptual upper landing is explicitly registered.
 let deckCount=0;
 for(let f=1;f<n;f++){
  const fl=detail.roomsAndCorridors.floors[f],voids=new Set([...fl.coreStairCells,...fl.elevatorCells].map(p=>k(p.x,p.z)));
  for(const cell of footprints[f])if(!voids.has(cell)){const [x,z]=cell.split(',').map(Number);add(x,z,f*h-1,'FLOOR_SLAB');deckCount++;}
 }
 if(stair?.shaft){for(const land of stair.landingPaths){const floor=land.floor-1;
  if(floor<1||floor>=n){problem('INVALID_LANDING',{floor},'Landing floor out of range');continue;}
  for(const p of land.cells){if(!footprints[floor].has(k(p.x,p.z))){problem('LANDING_OUTSIDE_FLOOR',{...p},'Landing not on upper floor');continue;}
   add(p.x,p.z,floor*h-1,'LANDING_SUPPORT');deckCount++;
  }
 }}
 // Roof is a conceptual 1-block shell. No mechanical, drainage or structural claim.
 for(const cell of footprints[n-1]){const [x,z]=cell.split(',').map(Number);add(x,z,n*h-1,'ROOF_SHELL');}
 let interiorWallVoxels=0;
 for(const fl of detail.roomsAndCorridors.floors){const base=(fl.level-1)*h;
  for(const r of fl.rooms){for(const [x,z] of stepCoords(r)){
   if(x!==r.x&&x!==r.x+r.width-1&&z!==r.z&&z!==r.z+r.depth-1)continue;
   for(let y=base+1;y<=base+h-2;y++){
    // Reservation assumes one-cell walls and a TWO-block-tall opening at the door.
    if(x===r.door.x&&z===r.door.z&&y<=base+2)continue;
    add(x,z,y,'PARTITION_WALL');interiorWallVoxels++;
   }
  }}
 }
 let solidFacades=0,glazingFacades=0;
 const facadeByCell=new Map();
 for(const module of facade.modules){const {floor,x,z,face,kind}=module;facadeByCell.set(`${floor}/${x}/${z}/${face}`,module);
  const base=(floor-1)*h;
  if(!footprints[floor-1].has(k(x,z)))problem('FACADE_OUTSIDE_FOOTPRINT',{floor,x,z},'Facade module outside envelope');
  if(kind==='ENTRANCE_INTENT')continue;
  // Wall at the facade is on the footprint boundary; do not add an identical
  // interior solid on top of a partition wall; overlap is intentional and unverified.
  const isRoomCell=detail.roomsAndCorridors.floors[floor-1].rooms.some(r=>x>=r.x&&x<r.x+r.width&&z>=r.z&&z<r.z+r.depth);
  for(let y=base+1;y<=base+h-2;y++){
   if(kind==='GLAZING_INTENT'){glazingFacades++;continue;} // Glazing is NOT modelled as proven-solid Minecraft blocks.
   if(!isRoomCell)add(x,z,y,'FACADE_SOLID');solidFacades++;
  }
 }
 let sampledWalkable=0,sampledStair=0;
 for(const fl of detail.roomsAndCorridors.floors){const y=(fl.level-1)*h;
  for(const p of fl.corridorCells){sampledWalkable++;
   for(const dy of [1,2])if(solids.has(vk(p.x,p.z,y+dy)))problem('CORRIDOR_HEADROOM',{floor:fl.level,x:p.x,z:p.z,y:y+dy},solids.get(vk(p.x,p.z,y+dy)));
  }
  for(const r of fl.rooms){if(!footprints[fl.level-1].has(k(r.door.x,r.door.z))||!footprints[fl.level-1].has(k(r.door.hallX,r.door.hallZ)))problem('DOOR_OUTSIDE_FLOOR',{floor:fl.level,x:r.door.x,z:r.door.z},r.id);
   if(Math.abs(r.door.x-r.door.hallX)+Math.abs(r.door.z-r.door.hallZ)!==1)problem('DOOR_NOT_ADJACENT',{floor:fl.level,x:r.door.x,z:r.door.z},r.id);
   for(const dy of [1,2])for(const p of [{x:r.door.x,z:r.door.z},{x:r.door.hallX,z:r.door.hallZ}])if(solids.has(vk(p.x,p.z,y+dy)))problem('DOOR_HEADROOM',{floor:fl.level,x:p.x,z:p.z,y:y+dy},r.id);
  }
 }
 const surfaces=new Map();
 for(const flight of stair?.flights??[]){for(const point of flight.walkSurfacePath){sampledStair++;const index=vk(point.x,point.z,point.y);
  if(surfaces.has(index))problem('STAIR_SURFACE_OVERLAP',{...point},'Duplicate surface on a stair flight');
  surfaces.set(index,true);
  if(!footprints[flight.fromFloor-1].has(k(point.x,point.z))&&!footprints[Math.min(n-1,flight.toFloor-1)].has(k(point.x,point.z)))problem('STAIR_OUTSIDE_FOOTPRINT',{...point},'Stair outside level envelopes');
 }}
 for(const landing of stair?.landingPaths??[])for(const p of landing.cells){const index=vk(p.x,p.z,p.y);if(surfaces.has(index)&&!['upper_arrival','upper_deck_connector'].includes(p.element))problem('STAIR_LANDING_CONFLICT',{...p},'Duplicated landing');surfaces.set(index,true);}
 for(const index of surfaces.keys()){const [x,z,y]=index.split(',').map(Number);
  for(const dy of [1,2]){
   const above=vk(x,z,y+dy);
   if(solids.has(above))problem('STAIR_SOLID_HEADROOM',{x,z,y:y+dy},solids.get(above));
   if(surfaces.has(above))problem('STAIR_SURFACE_HEADROOM',{x,z,y:y+dy},'Other stair or landing walk surface');
  }
 }
 const roomInfo=detail.roomsAndCorridors.floors.map(fl=>({floor:fl.level,rooms:fl.rooms.map(r=>roomQuality(r,facadeByCell,h))}));
 const rooms=roomInfo.flatMap(f=>f.rooms),smallRooms=rooms.filter(r=>r.potentialLayoutIssue).length,
  darkCandidates=rooms.filter(r=>r.glazingAdjacentModules===0).length,furnitureFit=rooms.filter(r=>r.reservedFurnitureZone).length;
 const issueCounts=Object.fromEntries([...conflictCount.entries()].sort((a,b)=>a[0].localeCompare(b[0])));
 const blockingIssues=Object.entries(issueCounts).filter(([,count])=>count>0).map(([name,count])=>`${name}: ${count}件`);
 if(stair?.status!=='SCHEMATIC_VOXEL_PATH_CHECKED')blockingIssues.push('階段の既存模式検証が未成立');
 if(detail.roomsAndCorridors.floors.some(f=>!f.areaConserved||!f.partitionDisjoint))blockingIssues.push('2D床区画が未成立');
 const warnings=[];
 if(smallRooms)warnings.push(`壁厚1ブロックを仮置きすると内部が2×2未満となる部屋: ${smallRooms}室`);
 if(darkCandidates)warnings.push(`外壁窓の意図が隣接しない部屋: ${darkCandidates}室（採光判定ではない）`);
 if(!stair?.shaft)warnings.push('有効な階段空間がなく、3D階段検査は完了不能');
 warnings.push('窓・扉・壁厚は独立したモデル上の仮定。ガラス実ブロック/枠/外装の干渉は未検証');
 warnings.push('手すり、段差処理、可動扉、避難経路、EV機構、家具実寸、耐荷重、照明は検証対象外');
 return {schema:'minecraftaibuilder-step8a4-physical-reservation-v1',status:blockingIssues.length?'REVIEW_REQUIRED_NOT_BUILDABLE':'SCHEMATIC_RESERVATION_CHECKED_NOT_BUILDABLE',
  dimensions:{width:w,depth:d,floors:n,floorHeight:h,maxY:n*h-1},
  model:{localCoordinatesOnly:true,floorSlabY:'floorIndex*floorHeight-1',roofShellY:n*h-1,partitionNominalThickness:1,
   headroomSampleBlocks:2,validatedWalkabilityInMinecraft:false,windowAndDoorPhysicalBlocksModeled:false,loadBearingVerified:false},
  metrics:{reservedSolidVoxels:solids.size,slabAndLandingReservationAttempts:deckCount,partitionWallReservationAttempts:interiorWallVoxels,
   solidFacadeReservationAttempts:solidFacades,glazingVoxelIntents:glazingFacades,corridorCellsSampled:sampledWalkable,stairSurfaceCellsSampled:sampledStair,
   roomCount:rooms.length,smallInteriorRooms:smallRooms,roomsWithoutAdjacentWindowIntent:darkCandidates,roomsWith2x2FurnitureReservation:furnitureFit},
  collisions:{count:Object.values(issueCounts).reduce((a,b)=>a+b,0),byType:issueCounts,samples:conflicts,truncated:conflicts.length<Object.values(issueCounts).reduce((a,b)=>a+b,0)},
  roomQuality:roomInfo,materialIntent:{palette:concept.MaterialGrammar.conceptColors,facadeStrategy:concept.BuildingComposition.facadeStrategy,
   actualMinecraftBlockIds:[],educationCompatibility:'NOT_TESTED',styleDesignOnly:true},
  blockingIssues,warnings,
  validation:{twoBlockHeadroomReservationChecked:true,schematicWallThicknessModeled:true,localVoxelBoundsChecked:true,
   realWorldClearanceVerified:false,legallyCompliantStairs:false,accessibilityVerified:false,egressVerified:false,
   structuralStabilityVerified:false,doorOperationVerified:false,actualMaterialPaletteVerified:false,interiorsFurnished:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,buildCandidateGenerated:false},safety:safety()};
}

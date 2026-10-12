/** Independent new-building study only. No Minecraft commands, no frozen-source mutations. */
import {rect,twoWideReachable,k} from '../../b97/main/b97-gallery-network.mjs';
const xy=s=>{const [x,z]=s.split(',').map(Number);return {x,z}};
const area=r=>r.width*r.depth;
const box=(x,z,width,depth)=>({x,z,width,depth});
const cells=r=>rect(r).map(k);
const has=(r,s)=>cells(r).every(p=>s.has(p));
const maskOf=rows=>new Set(rows.flatMap((row,z)=>[...row].flatMap((c,x)=>c==='1'?[`${x},${z}`]:[])));
const inside=(p,room)=>p.x>=room.x&&p.x<room.x+room.width&&p.z>=room.z&&p.z<room.z+room.depth;
const dirs=[[0,1],[0,-1],[1,0],[-1,0]];
export function largestInteriorCourtyard(rows){
 const floor=maskOf(rows),height=rows.length,width=rows[0].length,seen=new Set();let best=null;
 for(let z=0;z<height;z++)for(let x=0;x<width;x++){
  const start=`${x},${z}`;if(floor.has(start)||seen.has(start))continue;
  const comp=[],Q=[start];let boundary=false;seen.add(start);
  for(let i=0;i<Q.length;i++){
   const q=xy(Q[i]);comp.push(q);if(q.x===0||q.z===0||q.x===width-1||q.z===height-1)boundary=true;
   for(const [dx,dz] of dirs){const xx=q.x+dx,zz=q.z+dz,n=`${xx},${zz}`;
    if(xx<0||zz<0||xx>=width||zz>=height||seen.has(n)||floor.has(n))continue;seen.add(n);Q.push(n);}
  }
  if(!boundary&&comp.length>=24&&(!best||comp.length>best.cells.length)){
   const xs=comp.map(q=>q.x),zs=comp.map(q=>q.z);best={cells:comp,area:comp.length,
    bounds:{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)}};
  }
 }
 return best;
}
function frontage(room,gallery){
 if(!room)return null;
 const sides=[['N',room.width,i=>({x:room.x+i,z:room.z-1})],['S',room.width,i=>({x:room.x+i,z:room.z+room.depth})],
 ['W',room.depth,i=>({x:room.x-1,z:room.z+i})],['E',room.depth,i=>({x:room.x+room.width,z:room.z+i})]];
 const found=[];
 for(const [side,len,fn] of sides)for(let i=0;i<len-1;i++){
  const a=fn(i),b=fn(i+1);if(gallery.has(k(a))&&gallery.has(k(b)))found.push({side,adjacentCorridorCells:[a,b],roomSideLength:len});
 }
 return found[0]??null;
}
function connectedGallery(gallery,baseline,legal){
 if([...gallery].some(p=>!legal.has(p)))return false;
 const {components}=twoWideReachable(gallery,legal);
 if(components.length!==1)return false;
 const anchors=new Set(components[0]);
 return [...baseline].some(p=>{const q=xy(p);return [[0,0],[-1,0],[0,-1],[-1,-1]].some(([dx,dz])=>anchors.has(`${q.x+dx},${q.z+dz}`));});
}
function pack(floorMask,sourceRooms,baseline,core,blocked,addedRects,roomOverrides=[],meta={}){
 const originalMask=maskOf(floorMask),footprint=new Set(originalMask),gallery=new Set(baseline);
 for(const r of addedRects){for(const p of cells(r)){footprint.add(p);gallery.add(p)}}
 const overlay=new Map(roomOverrides.map(({id,room})=>[id,room]));for(const {room} of roomOverrides)if(room)for(const p of cells(room))footprint.add(p);const occupancy=new Set();
 const rooms=sourceRooms.map(r=>{
  const room=overlay.has(r.roomId)?overlay.get(r.roomId):r.room;
  if(room){for(const p of cells(room)){
   if(occupancy.has(p))throw Error(`B98_ROOM_OVERLAP:${r.roomId}:${p}`);occupancy.add(p);
  }}
  return {roomId:r.roomId,original:r.original,room,areaRetention:room?area(room)/area(r.original):0};
 });
 const blockedAll=new Set([...blocked,...cells(core)]);
 const intrusion=[...gallery].filter(p=>occupancy.has(p)||blockedAll.has(p));
 const legal=new Set([...footprint].filter(p=>!blockedAll.has(p)));
 const hallConnected=intrusion.length===0&&connectedGallery(gallery,baseline,legal);
 const openings=rooms.map(r=>({...r,entranceBay:frontage(r.room,gallery)}));
 const stats={nominalRooms:rooms.length,allocatedRooms:rooms.filter(r=>r.room).length,
  pairedEntranceRooms:openings.filter(r=>r.entranceBay).length,
  missingRooms:rooms.filter(r=>!r.room).length,
  minimumAreaRatio:Math.min(...rooms.map(r=>r.areaRetention)),
  nominalRoomArea:rooms.reduce((n,r)=>n+area(r.original),0),
  allocatedRoomArea:rooms.reduce((n,r)=>n+(r.room?area(r.room):0),0),
  galleryCells:gallery.size,addedFootprintCells:[...footprint].filter(p=>!originalMask.has(p)).length,
  originalPerimeterCellsAffected:[...gallery].filter(p=>originalMask.has(p)&&!baseline.has(p)).length,
  galleryRoomCollisions:intrusion.filter(p=>occupancy.has(p)).length,
  protectedCoreCollisions:intrusion.filter(p=>blockedAll.has(p)).length,
  allTwoWideGalleryComponentsConnected:hallConnected,
  physicalDoorsCertified:false,realWindowsVerified:false,escapeRouteCertified:false,structuralLoadVerified:false,
  implementationApproved:false,constructionCommands:0};
 return {originalFloorMaskRows:floorMask,proposalFloorMask:{width:floorMask[0].length,height:floorMask.length,
   addedCells:[...footprint].filter(p=>!originalMask.has(p)).map(xy)},
  core,gallery:[...gallery].map(xy),referenceGallery:[...baseline].map(xy),
  reservedSites:[...blocked].map(xy),rooms:openings,stats,diagnostic:{...meta,intrusion},
  status:'UNAPPROVED_INDEPENDENT_BUILDING_CONCEPT'};
}
function courtyardBand(c,kind){const b=c.bounds;
 const proposed=[box(b.minX,b.minZ,2,b.maxZ-b.minZ+1),box(b.maxX-1,b.minZ,2,b.maxZ-b.minZ+1),
  box(b.maxX+1,b.minZ,2,b.maxZ-b.minZ+1),
  box(b.minX,b.minZ,b.maxX-b.minX+1,2),box(b.minX,b.maxZ-1,b.maxX-b.minX+1,2)];
 if(kind==='RING_NORTH'||kind==='RING_NORTH_WEST_SOUTH'||kind==='RING_OUTBOARD_EAST'){
  // Extend the gallery onto the north-facing room edges. The flanking rooms below get a 20%-height trim.
  proposed.push(box(1,b.minZ+1,b.minX-1,2),box(b.maxX+1,b.minZ+1,5,2));
 }
 if(kind==='RING_NORTH_WEST_SOUTH'||kind==='RING_OUTBOARD_EAST'){
  // Lower-left passage reaches the west-side ground-floor units without cutting stairs/lifts.
  proposed.push(box(1,b.maxZ+1,Math.max(1,b.minX+6-1),2));
 }
 if(kind==='RING_OUTBOARD_EAST'){
  // A separate higher-impact alternative: transparent-balustrade exterior gallery (daylight/facade not approved).
  proposed.push(box(b.maxX+6,b.minZ+1,2,b.maxZ-b.minZ+8));
  proposed.push(box(b.maxX+3,b.minZ+1,5,2));
 }
 return proposed;
}
export function designAtriumFloor(f,kind='RING_NORTH_WEST_SOUTH'){
 const court=largestInteriorCourtyard(f.floorMaskRows);if(!court)throw Error('B98_COURTYARD_NOT_FOUND');
 const b=court.bounds,mods=[],old=f.rooms;
 if(kind==='RING_NORTH'||kind==='RING_NORTH_WEST_SOUTH'||kind==='RING_OUTBOARD_EAST'){
  for(const r of old){const orig=r.original;
   if(orig.z===b.minZ+2&&(orig.x+orig.width===b.minX||orig.x>b.maxX)){
    mods.push({id:r.roomId,room:{...orig,z:orig.z+1,depth:orig.depth-1}});
   }
  }
 }
 if(kind==='RING_NORTH_WEST_SOUTH'||kind==='RING_OUTBOARD_EAST'){
  for(const r of old){const orig=r.original;
   if(orig.x+orig.width===b.minX&&orig.z+orig.depth-1===b.maxZ+1){
    mods.push({id:r.roomId,room:{...orig,depth:orig.depth-1}});
   }
  }
 }
 const blocked=new Set([...f.virtualReference.stairs,...f.virtualReference.elevators].map(k));
 const result=pack(f.floorMaskRows,old,new Set(f.gallerySites.map(k)),f.core,blocked,courtyardBand(court,kind),mods,
  {kind,courtyardBounds:b,courtyardOriginalVoidCells:court.area});
 const gallerySet=new Set(result.gallery.map(k));
 const retainedVoid=court.cells.filter(p=>!gallerySet.has(k(p))).length;
 result.diagnostic.courtyardRetainedOpenCells=retainedVoid;
 result.diagnostic.courtyardOpeningRetainedRatio=retainedVoid/court.area;
 result.diagnostic.removedNominalRooms=0;
 result.diagnostic.outboardExteriorGallery=kind==='RING_OUTBOARD_EAST';
 result.diagnostic.facadeGlazingRedistributionRequired=kind==='RING_OUTBOARD_EAST';
 result.diagnostic.eastFacadeShadingRiskRooms=kind==='RING_OUTBOARD_EAST'?result.rooms.filter(r=>r.room&&r.room.x+r.room.width>b.maxX+2).length:0;
 return result;
}
export function designOfficeSouthWing(f,profile='SOUTH_WING'){
 const baseRows=f.floorMaskRows;const w=baseRows[0].length,h=baseRows.length;
 const missing=f.rooms.filter(r=>!r.room);const newFootprint=[];const overrides=[];
 const original=baseRows.map((v,z)=>v); const baseGallery=new Set(f.gallerySites.map(k));
 const occupied=new Set(f.rooms.filter(r=>r.room).flatMap(r=>cells(r.room)));
 const blocked=new Set([...f.virtualReference.stairs,...f.virtualReference.elevators].map(k));
 let origins=[];
 for(const x of missing){const width=x.original.width,depth=x.original.depth;
  // Build a new architectural wing outside the south facade. No old room or stair is erased.
  const wing=box(Math.max(1,Math.min(w-width-1,x.original.x)),h+2,width,depth);
  if(cells(wing).some(c=>occupied.has(c)))throw Error('B98_WING_DUPLICATE');
  newFootprint.push(box(11,h-2,2,4),box(11,h,wing.x+wing.width-11,2));overrides.push({id:x.roomId,room:wing});origins.push({id:x.roomId,wing});
 }
 if(!missing.length){newFootprint.push(box(11,h-2,2,4),box(11,h,7,2),box(13,h+2,5,5));}
 const result=pack(baseRows,f.rooms,baseGallery,f.core,blocked,newFootprint,overrides,
   {kind:profile,relocatedToExternalWing:origins,wingFacadeChangeNeedsApproval:missing.length>0});
 return result;
}
export function verifyIndependentB98Floor(f){
 if(f.status!=='UNAPPROVED_INDEPENDENT_BUILDING_CONCEPT'||f.stats.constructionCommands!==0||f.stats.implementationApproved||f.stats.physicalDoorsCertified||f.stats.realWindowsVerified||f.stats.escapeRouteCertified)return false;
 const original=maskOf(f.originalFloorMaskRows);const mask=new Set([...original,...f.proposalFloorMask.addedCells.map(k)]);
 const b=new Set(f.reservedSites.map(k)),core=new Set(cells(f.core)),gallery=new Set(f.gallery.map(k)),base=new Set(f.referenceGallery.map(k));
 if([...gallery].some(p=>!mask.has(p)||b.has(p)||core.has(p))||!connectedGallery(gallery,base,new Set([...mask].filter(p=>!b.has(p)&&!core.has(p)))))return false;
 let mapped=0,front=0;const occupied=new Set();
 for(const r of f.rooms){if(!r.room)continue;mapped++;
  if(r.areaRetention<.75-1e-9||Math.abs(r.areaRetention-area(r.room)/area(r.original))>1e-8)return false;
  for(const p of cells(r.room)){if(!mask.has(p)||occupied.has(p)||gallery.has(p)||b.has(p)||core.has(p))return false;occupied.add(p)}
  if(JSON.stringify(frontage(r.room,gallery))!==JSON.stringify(r.entranceBay))return false;
  if(r.entranceBay)front++;
 }
 return mapped===f.stats.allocatedRooms&&front===f.stats.pairedEntranceRooms&&f.stats.nominalRooms===f.rooms.length&&
  f.stats.protectedCoreCollisions===0&&f.stats.galleryRoomCollisions===0&&
  f.stats.allTwoWideGalleryComponentsConnected===true;
}

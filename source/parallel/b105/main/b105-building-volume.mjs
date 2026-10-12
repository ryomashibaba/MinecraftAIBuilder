/** B105 — Whole-building architectural VoxelIR, Education-first, offline only.
 * This is not a BuildPlan, runnable block command, or verified Minecraft block palette.
 * Rooms and routes are inherited unchanged from approved concept-only B104.
 */
import {auditB103} from '../../b103/main/b103-circulation-3d.mjs';

const dirs=[{dx:0,dz:-1,side:'N'},{dx:1,dz:0,side:'E'},{dx:0,dz:1,side:'S'},{dx:-1,dz:0,side:'W'}];
const xy=(x,z)=>x+','+z;
const xyz=(x,y,z)=>x+','+y+','+z;
const within=(r,x,z)=>x>=r.x&&x<r.x+r.width&&z>=r.z&&z<r.z+r.depth;
const mask=(rows,x,z)=>rows[z]?.[x]==='1';
const sorted=(a,b)=>a.z-b.z||a.x-b.x;
const roomId=(level,id)=>level+':'+id;
const structureProfiles=Object.freeze({
 house:{facade:'TIMBER_RHYTHM',windowPeriod:4,roof:'SIMPLE_STEPPED'},
 hotel:{facade:'GLAZED_VERTICAL',windowPeriod:2,roof:'PARAPET_MASSING'},
 apartment:{facade:'BALCONY_BANDS',windowPeriod:3,roof:'TERRACE_SETBACK'},
 office:{facade:'CURTAIN_WALL_RHYTHM',windowPeriod:2,roof:'FLAT_LAYERED'},
 library:{facade:'STONE_AND_GLASS',windowPeriod:5,roof:'SKYLIGHT_READY'}
});
const safe=(d)=>d?.schema==='minecraftaibuilder-b104-co-design-v1'&&d.readonlyDesign===true&&
 d.constructionApproved===false&&d.worldContacts===0&&d.worldCoordinates===null&&
 Array.isArray(d.blockOperations)&&d.blockOperations.length===0&&
 d.BuildPlan?.status==='NOT_PREPARED'&&d.BuildPlan.operations?.length===0&&
 d.BuildPlan.commandCount===0&&d.BuildPlan.worldCoordinates===null&&
 d.layout?.constructionApproved===false&&d.plan?.constructionApproved===false&&
 d.plan.worldContacts===0&&d.layout.worldCoordinates===null&&d.plan.worldCoordinates===null;
function checkDesign(d){
 if(!safe(d)||d.layout.candidateId!==d.candidateId||d.plan.candidateId!==d.candidateId||
  !Array.isArray(d.plan.floors)||d.plan.floors.length!==d.layout.floors?.length||
  !structureProfiles[d.plan.typology]||!d.plan.cores?.length||d.result?.conceptualSafe!==true)
  throw Error('B105_UNSAFE_PARENT_DESIGN');
 const audit=auditB103(d.plan);
 if(audit.solidAirCollisions||audit.doorway2HighViolations||audit.spiralProxyClearanceViolations||
  d.plan.summary.connectedRooms!==d.layout.placed||d.layout.unmet.length)throw Error('B105_PARENT_SPATIAL_UNSAFE');
 for(let i=0;i<d.plan.floors.length;i++){
  const f=d.plan.floors[i];
  if(f.level!==i||!Array.isArray(f.footprintRows)||!f.coreRoutes?.length||
   f.coreRoutes.length!==d.plan.cores.length||
   !f.footprintRows.every(row=>typeof row==='string'&&/^[01]+$/.test(row)))
   throw Error('B105_INVALID_PARENT_FLOOR');
 }
}
/** Exposed shell cells lie OUTSIDE the current floor plate, never inside B104 room air.
 * Includes the interior faces of courtyards/atria, which are distinct from safe exterior exits.
 */
function shellOf(f){
 const cells=new Map(),rows=f.footprintRows;
 for(let z=0;z<rows.length;z++)for(let x=0;x<rows[z].length;x++)if(mask(rows,x,z)){
  for(const d of dirs){
   const sx=x+d.dx,sz=z+d.dz;
   if(mask(rows,sx,sz))continue;
   const id=xy(sx,sz),entry=cells.get(id)??{x:sx,z:sz,sides:[]};
   if(!entry.sides.includes(d.side))entry.sides.push(d.side);
   cells.set(id,entry);
  }
 }
 return [...cells.values()].sort(sorted);
}
function portalsOf(f){
 const portal=new Map(),g=new Set(f.gallery.map(p=>xy(p.x,p.z)));
 for(const e of f.exits){
  const d=dirs.find(d=>d.side===e.side);
  if(!d||e.edge?.length!==2||!e.edge.every(p=>g.has(xy(p.x,p.z))))throw Error('B105_BAD_EXIT');
  for(const p of e.edge){
   const x=p.x+d.dx,z=p.z+d.dz;
   if(mask(f.footprintRows,x,z))throw Error('B105_EXIT_BLOCKED_BY_PLATE');
   portal.set(xy(x,z),{x,z,side:d.side});
  }
 }
 return portal;
}
function roofCells(f,above){
 const out=[];
 for(let z=0;z<f.footprintRows.length;z++)for(let x=0;x<f.footprintRows[z].length;x++){
  if(mask(f.footprintRows,x,z)&&!(above&&mask(above.footprintRows,x,z)))
   out.push({x,y:(f.level+1)*5,z});
 }
 return out;
}
function interiorDoor(r){
 const d=r.conceptualDoorOpening;
 const side={N:[0,1],S:[0,-1],E:[-1,0],W:[1,0]}[d?.side];
 if(!side)throw Error('B105_INVALID_ROOM_ENTRY');
 const p={x:d.x+side[0],z:d.z+side[1]};
 if(!(p.x>r.x&&p.x<r.x+r.width-1&&p.z>r.z&&p.z<r.z+r.depth-1))
  throw Error('B105_BAD_INTERIOR_DOOR');
 return p;
}
function interiorCells(r){
 const out=[];
 for(let z=r.z+1;z<r.z+r.depth-1;z++)
  for(let x=r.x+1;x<r.x+r.width-1;x++)out.push({x,z});
 return out;
}
function isConnectedInterior(r,entry,furniture){
 const blocked=new Set(furniture.map(p=>xy(p.x,p.z))),cells=interiorCells(r);
 const allowed=new Set(cells.filter(p=>!blocked.has(xy(p.x,p.z))).map(p=>xy(p.x,p.z)));
 if(!allowed.has(xy(entry.x,entry.z)))return false;
 const q=[entry],visited=new Set([xy(entry.x,entry.z)]);
 for(let i=0;i<q.length;i++)for(const d of dirs){
  const p={x:q[i].x+d.dx,z:q[i].z+d.dz},id=xy(p.x,p.z);
  if(allowed.has(id)&&!visited.has(id)){visited.add(id);q.push(p);}
 }
 return visited.size===allowed.size&&visited.size>=3;
}
function furnitureKind(purpose){
 if(/書庫|閲覧|学習|図書/.test(purpose))return 'SHELF_OR_READING_PROXY';
 if(/寝室|客室|住戸/.test(purpose))return 'SLEEP_OR_STORAGE_PROXY';
 if(/会議室|執務|書斎/.test(purpose))return 'DESK_OR_MEETING_PROXY';
 if(/ロビー|ラウンジ|居間|共用/.test(purpose))return 'SEATING_PROXY';
 return 'GENERAL_ROOM_FIXTURE_PROXY';
}
function furnishRoom(r){
 const entry=interiorDoor(r),chosen=[],all=interiorCells(r);
 const ranked=all.filter(p=>xy(p.x,p.z)!==xy(entry.x,entry.z)).sort((a,b)=>{
  const da=Math.abs(a.x-entry.x)+Math.abs(a.z-entry.z),db=Math.abs(b.x-entry.x)+Math.abs(b.z-entry.z);
  return db-da||sorted(a,b);
 });
 const limit=all.length>=12?2:1;
 for(const p of ranked){
  if(chosen.length>=limit)break;
  if(isConnectedInterior(r,entry,[...chosen,p]))chosen.push(p);
 }
 return {entry,fixtures:chosen,accessible:isConnectedInterior(r,entry,chosen)};
}
function coreJunction(f,core,coreIndex){
 const route=f.coreRoutes.find(q=>q.index===coreIndex),g=new Set(f.gallery.map(p=>xy(p.x,p.z)));
 if(!route?.connected||!route.anchor)throw Error('B105_UNREACHABLE_CORE');
 const a=route.anchor;
 const anchorCells=[{x:a.x,z:a.z},{x:a.x+1,z:a.z},{x:a.x,z:a.z+1},{x:a.x+1,z:a.z+1}];
 for(const p of anchorCells.sort(sorted)){
  if(!g.has(xy(p.x,p.z)))continue;
  for(const d of dirs){
   const x=p.x+d.dx,z=p.z+d.dz;
   if(within(core,x,z))return {level:f.level,coreIndex,routeAnchor:a,
    corridor:{x:p.x,y:f.level*5,z:p.z},coreLanding:{x,y:f.level*5,z},
    notActualLanding:true};
  }
 }
 throw Error('B105_MISSING_CORE_INTERFACE');
}
/** Build a READ-ONLY conceptual voxel IR for the building envelope + interior layout.
 * No palette of Minecraft Bedrock block states is emitted.
 */
export function generateB105(design){
 checkDesign(design);
 const plan=design.plan,style=structureProfiles[plan.typology],voxels=new Map();
 const collisions=[],facadeFaces=[],roofPatches=[],interior=[],junctions=[],verticalLinks=[];
 const put=(x,y,z,kind,owner,level)=>{
  const id=xyz(x,y,z),previous=voxels.get(id);
  if(previous){collisions.push({id,previous,next:{kind,owner}});return;}
  voxels.set(id,{x,y,z,kind,owner,level});
 };
 for(const [i,f] of plan.floors.entries()){
  const shell=shellOf(f),exits=portalsOf(f),roof=roofCells(f,plan.floors[i+1]),base=f.level*5;
  const currentFaces=[];
  for(const s of shell){
   const opening=exits.has(xy(s.x,s.z));
   const variantOffset=Number(design.candidateId.match(/_V(\d+)$/)?.[1]??1);
   const glazed=!opening&&((Math.abs(s.x*7+s.z*11+f.level*3+variantOffset)%style.windowPeriod)===0);
   for(let dy=1;dy<=3;dy++){
    const kind=opening&&dy<=2?'EXTERIOR_PORTAL_VOID_PROXY':
     glazed&&dy===2?'WINDOW_GLAZING_PROXY':'FACADE_PANEL_PROXY';
    put(s.x,base+dy,s.z,kind,'ENVELOPE_L'+f.level,f.level);
   }
   currentFaces.push({x:s.x,z:s.z,sides:s.sides,opening,glazed});
  }
  facadeFaces.push({level:f.level,faces:currentFaces,exitPairs:f.exits.length});
  for(const p of roof)put(p.x,p.y,p.z,'ROOF_CAP_PROXY','ROOF_OVER_L'+f.level,f.level);
  roofPatches.push({level:f.level,capCells:roof.length,
   upperLevelPresent:!!plan.floors[i+1],profile:style.roof});
  for(const r of f.rooms){
   const furnishing=furnishRoom(r);
   if(!furnishing.accessible||!furnishing.fixtures.length)
    throw Error('B105_FURNISHING_CANNOT_PRESERVE_ENTRY');
   interior.push({level:f.level,roomId:r.id,purpose:r.purpose,
    usableArea:r.netInteriorArea,fixtureKind:furnitureKind(r.purpose),
    entry:furnishing.entry,fixtures:furnishing.fixtures,walkableInteriorCells:r.netInteriorArea-furnishing.fixtures.length,
    fullFurnitureAndFinishesCertified:false});
   for(const p of furnishing.fixtures)
    put(p.x,base+1,p.z,'FURNITURE_PLACEHOLDER',roomId(f.level,r.id),f.level);
  }
  for(let coreIndex=0;coreIndex<plan.cores.length;coreIndex++)
   junctions.push(coreJunction(f,plan.cores[coreIndex],coreIndex));
 }
 for(let ci=0;ci<plan.cores.length;ci++)for(let level=0;level<plan.floors.length-1;level++){
  const lower=junctions.find(j=>j.level===level&&j.coreIndex===ci);
  const upper=junctions.find(j=>j.level===level+1&&j.coreIndex===ci);
  if(!lower||!upper)throw Error('B105_MISSING_VERTICAL_LINK');
  verticalLinks.push({coreIndex:ci,from:level,to:level+1,
   lowerCoreCell:lower.coreLanding,upperCoreCell:upper.coreLanding,
   route:'B103_STAIR_TREAD_PROXY_ONLY',physicalTravelCertified:false});
 }
 const list=[...voxels.values()].sort((a,b)=>a.y-b.y||a.z-b.z||a.x-b.x);
 const kindCount=k=>list.filter(p=>p.kind===k).length;
 return {schema:'minecraftaibuilder-b105-building-volume-ir-v1',
  candidateId:design.candidateId,typology:plan.typology,levels:plan.floors.length,
  sourceStatus:'B104_CONCEPT_ONLY',facadeProfile:style.facade,roofProfile:style.roof,
  voxels:list,facadeFaces,roofPatches,interior,junctions,verticalLinks,
  summary:{conceptRooms:interior.length,conceptualFixtures:kindCount('FURNITURE_PLACEHOLDER'),
   facadePanels:kindCount('FACADE_PANEL_PROXY'),windowProxies:kindCount('WINDOW_GLAZING_PROXY'),
   exteriorPortalVoidCells:kindCount('EXTERIOR_PORTAL_VOID_PROXY'),
   roofCaps:kindCount('ROOF_CAP_PROXY'),exteriorPortalPairs:plan.summary.exteriorGroundPortalCandidates,
   roofedLevels:roofPatches.filter(p=>p.capCells>0).length,
   conceptualStairInterfaces:junctions.length,conceptualVerticalLinks:verticalLinks.length,
   attemptedVoxelConflicts:collisions.length,physicalFinishedRooms:0,
   certifiedBedrockBlockStates:0},
  collisions,parentRoomsConnected:plan.summary.connectedRooms===interior.length,
  noActualMinecraftDoors:true,realWindowsCertified:false,roofWeatherproofCertified:false,
  physicalStairsCertified:false,loadBearingCertified:false,interiorFinishCertified:false,
  visualAestheticsHumanApproved:false,readonlyArchitecturalIR:true,worldContacts:0,
  worldCoordinates:null,constructionApproved:false,executionAllowed:false,blockOperations:[],
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
}
export function auditB105(volume,plan){
 if(volume?.schema!=='minecraftaibuilder-b105-building-volume-ir-v1'||
 !volume.readonlyArchitecturalIR||volume.constructionApproved!==false||
 volume.worldContacts!==0||volume.worldCoordinates!==null||volume.blockOperations?.length!==0||
 volume.BuildPlan?.status!=='NOT_PREPARED'||volume.BuildPlan.operations?.length!==0||
 volume.BuildPlan.commandCount!==0||volume.BuildPlan.worldCoordinates!==null||
 plan?.candidateId!==volume.candidateId||plan.constructionApproved!==false)
 throw Error('B105_UNSAFE_VOLUME_AUDIT');
 const errors=[],seen=new Set(),addError=(message)=>{if(errors.length<50)errors.push(message);};
 const expectedRoof=new Set(),foundRoof=new Set(),shellByFloor=new Map(),fixtureByRoom=new Map();
 for(const [i,f] of plan.floors.entries()){
  for(const p of roofCells(f,plan.floors[i+1]))expectedRoof.add(xyz(p.x,p.y,p.z));
  shellByFloor.set(i,new Set(shellOf(f).map(p=>xy(p.x,p.z))));
 }
 for(const v of volume.voxels){
  const id=xyz(v.x,v.y,v.z);
  if(seen.has(id))addError('VOXEL_DUPLICATE:'+id);
  seen.add(id);
  const f=plan.floors[v.level];
  if(!f||![v.x,v.y,v.z,v.level].every(Number.isInteger)){addError('INVALID_LOCATION:'+id);continue;}
  const room=f.rooms.find(r=>roomId(v.level,r.id)===v.owner);
  if(v.kind==='ROOF_CAP_PROXY'){
   foundRoof.add(id);
   if(!expectedRoof.has(id))addError('ROOF_OUTSIDE_COVERAGE:'+id);
  }else if(['FACADE_PANEL_PROXY','WINDOW_GLAZING_PROXY','EXTERIOR_PORTAL_VOID_PROXY'].includes(v.kind)){
   if(v.y<v.level*5+1||v.y>v.level*5+3||!shellByFloor.get(v.level).has(xy(v.x,v.z)))
    addError('FACADE_INSIDE_OR_OUTSIDE_LEVEL:'+id);
   if(v.kind==='WINDOW_GLAZING_PROXY'&&v.y!==v.level*5+2)addError('WINDOW_HEIGHT:'+id);
  }else if(v.kind==='FURNITURE_PLACEHOLDER'){
   if(!room||v.y!==v.level*5+1||!(v.x>room.x&&v.x<room.x+room.width-1&&
    v.z>room.z&&v.z<room.z+room.depth-1))addError('FURNITURE_OUTSIDE_INTERIOR:'+id);
   const a=fixtureByRoom.get(v.owner)??[];
   a.push({x:v.x,z:v.z});fixtureByRoom.set(v.owner,a);
  }else addError('UNKNOWN_VOXEL_KIND:'+id);
 }
 for(const roof of expectedRoof)if(!foundRoof.has(roof))addError('ROOF_MISSING:'+roof);
 let furnishingBlocked=0;
 for(const f of plan.floors)for(const r of f.rooms){
  const fixtures=fixtureByRoom.get(roomId(f.level,r.id))??[];
  if(!fixtures.length||!isConnectedInterior(r,interiorDoor(r),fixtures)){
   furnishingBlocked++;addError('INACCESSIBLE_INTERIOR:'+roomId(f.level,r.id));
  }
 }
 let portalVoidsMissing=0;
 for(const f of plan.floors){
  const portals=portalsOf(f);
  for(const p of portals.values())for(const y of [1,2]){
   const id=xyz(p.x,f.level*5+y,p.z);
   if(!volume.voxels.some(v=>v.x===p.x&&v.z===p.z&&v.y===f.level*5+y&&
     v.kind==='EXTERIOR_PORTAL_VOID_PROXY'))portalVoidsMissing++;
  }
 }
 const coreInterfacesExpected=plan.floors.length*plan.cores.length;
 if(volume.junctions.length!==coreInterfacesExpected)addError('CORE_INTERFACE_MISSING');
 if(volume.verticalLinks.length!==(plan.floors.length-1)*plan.cores.length)addError('VERTICAL_LINK_MISSING');
 const t=volume.summary;
 if(t.roofCaps!==foundRoof.size||t.conceptualFixtures!==[...fixtureByRoom.values()].reduce((n,a)=>n+a.length,0)||
 t.conceptRooms!==plan.floors.reduce((n,f)=>n+f.rooms.length,0)||
 t.exteriorPortalVoidCells!==volume.voxels.filter(v=>v.kind==='EXTERIOR_PORTAL_VOID_PROXY').length||
 t.attemptedVoxelConflicts!==volume.collisions.length)addError('SUMMARY_TAMPERED');
 return {schema:'minecraftaibuilder-b105-offline-envelope-audit-v1',
  candidateId:volume.candidateId,voxelCount:volume.voxels.length,
  envelopeConflicts:volume.collisions.length,
  roofCoverageGaps:expectedRoof.size-foundRoof.size,
  portalVoidGaps:portalVoidsMissing,furniturePathViolations:furnishingBlocked,
  stairInterfaceGaps:Math.max(0,coreInterfacesExpected-volume.junctions.length),
  geometryIssues:errors,issueCount:errors.length+portalVoidsMissing,
  actualMinecraftWorldContacts:0,certifiedRealDoorsOrWindows:0,
  roofWeatherproofCertified:false,physicalEgressCertified:false,constructionApproved:false};
}
/** Compact exterior concept elevation: E=exit void, W=window, #=panel; NO render/certification. */
export function drawB105Elevation(volume,side='N'){
 if(volume?.constructionApproved!==false||volume.worldContacts!==0||
 !['N','S','E','W'].includes(side))throw Error('B105_UNSAFE_ELEVATION');
 const levels=volume.facadeFaces;
 return [...levels].reverse().map(f=>{
  const face=f.faces.filter(s=>s.sides.includes(side));
  if(!face.length)return 'L'+f.level+': (no facade)';
  const horizontal=(side==='N'||side==='S')?'x':'z';
  const lower=Math.min(...face.map(s=>s[horizontal])),upper=Math.max(...face.map(s=>s[horizontal]));
  let line='';for(let i=lower;i<=upper;i++){
   const p=face.find(s=>s[horizontal]===i);
   line+=!p?' ':p.opening?'E':p.glazed?'W':'#';
  }
  return 'L'+f.level+': '+line;
 }).join('\n');
}

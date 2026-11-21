/**
 * R164 — independent real-B143 upper-envelope continuity audit.
 * Tests all perimeter wall / roof voxels and 3D flood escape paths, rather
 * than trusting R162/R163 evidence flags or representative sample cells.
 * No Minecraft world IO and no LLM inference.
 */
import {verifyCompiled,MATERIALS,compileDesign} from './b143-building-dsl.mjs';
const fail=code=>{throw Error('R164_ENVELOPE_'+code);};
const key=(x,y,z)=>x+','+y+','+z;
const axes=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const directions=[['west',[-1,0]],['east',[1,0]],['north',[0,-1]],['south',[0,1]]];
export function auditR164EnclosedHighRooms(source){
 if(source?.schema!=='minecraftaibuilder-r125-featured-source-v1'||
  !source?.r163DaylightAndRoofEvidence||
  !source.r162RoomSectionEvidence?.upperRoomSections||
  !Array.isArray(source.program)||source.program.length!==1||
  !source.design||!source.compiled||
  !verifyCompiled(source.design,source.compiled)||
  source.sourceSha256!==source.compiled.sourceSha256||
  source.geometrySha256!==source.compiled.geometrySha256||
  source.worldContacts!==0||source.worldWrites!==0||
  source.constructionApproved!==false||
  source.executionAllowed!==false||
  source.gates?.length!==9||
  !source.gates.every(x=>x==='BLOCKED')||
  source.BuildPlan?.operations?.length!==0)
  fail('VERIFIED_BLOCKED_R163_SOURCE_REQUIRED');
 const sections=source.r162RoomSectionEvidence.upperRoomSections;
 if(sections.length!==3||
  source.r163DaylightAndRoofEvidence.realClerestoryWindows?.length!==3)
  fail('THREE_ACTUAL_ROOMS_WITH_EXTERNAL_GLAZING_REQUIRED');
 const {width:w,height:h,depth:d}=source.design.bounds;
 const occupied=new Map(source.compiled.primitives.map(p=>
  [key(p[0],p[1],p[2]),p[3]]));
 const has=(x,y,z)=>occupied.has(key(x,y,z));
 const glass=MATERIALS.indexOf('glass');
 const roofMat=MATERIALS.indexOf(
  source.design.elements.find(x=>x.id==='roof-base')?.material);
 const wallMat=MATERIALS.indexOf(
  source.design.elements.find(x=>x.id==='shell-west')?.material);
 if(glass<0||roofMat<0||wallMat<0)fail('SOURCE_MATERIALS');
 // At steps, a lower room's roof can overlap a neighboring taller room's
 // wall at exactly that lower roof elevation. Treat ONLY authenticated
 // adjoining roof footprints as weather-shell junctions, not arbitrary metal.
 const roofJunction=(current,x,y,z)=>sections.some(other=>
  other.zoneId!==current.zoneId&&y===other.roofY&&
  x>=other.perimeter.x[0]&&x<=other.perimeter.x[1]&&
  z>=other.perimeter.z[0]&&z<=other.perimeter.z[1]);
 let totalRoof=0,totalUpperWalls=0,totalPane=0,totalJunctions=0;
 const envelopeRooms=[];
 for(const s of sections){
  const q=s.sourceRange,range=s.perimeter,roofY=s.roofY;
  if(!q||!range||!Number.isSafeInteger(roofY)||
   roofY<8||roofY>=h||
   !same(range.x,[q.x[0]-1,q.x[1]+1])||
   !same(range.z,[q.z[0]-1,q.z[1]+1]))
   fail('ROOM_BOUNDS_NOT_PHYSICAL');
  const pane=source.r163DaylightAndRoofEvidence.realClerestoryWindows.filter(x=>x.zoneId===s.zoneId);
  if(pane.length!==1)fail('ONE_GLASS_OPENING_PER_REAL_ROOM');
  const expectedWindowCells=new Set(pane[0].realExteriorDaylightWitnesses.map(x=>key(...x.wall)));
  if(expectedWindowCells.size!==pane[0].paneVoxelCount)
   fail('PANES_DUPLICATE_OR_FORGED');
  let walls=0,glazing=0,roof=0,voidCells=0,junctions=0;
  const [minX,maxX]=q.x,[minZ,maxZ]=q.z;
  for(let y=6;y<roofY;y++){
   // Validate the complete horizontal perimeter, not sampled corners.
   for(let x=minX-1;x<=maxX+1;x++)
    for(const z of [minZ-1,maxZ+1]){
     const k=key(x,y,z),mat=occupied.get(k);
     if(mat!==wallMat&&mat!==glass&&
      !(mat===roofMat&&roofJunction(s,x,y,z)))
      fail('UPPER_PERIMETER_HOLE_'+s.zoneId+'_'+x+'_'+y+'_'+z+'_MAT'+String(mat));
     if(mat===roofMat)junctions++;
     if(mat===glass&&!expectedWindowCells.has(k))
      fail('UNAPPROVED_PERIMETER_GLAZING');
     if(mat===glass)glazing++;else walls++;
    }
   for(let z=minZ;z<=maxZ;z++)
    for(const x of [minX-1,maxX+1]){
     const k=key(x,y,z),mat=occupied.get(k);
     if(mat!==wallMat&&mat!==glass&&
      !(mat===roofMat&&roofJunction(s,x,y,z)))
      fail('UPPER_PERIMETER_HOLE_'+s.zoneId+'_'+x+'_'+y+'_'+z+'_MAT'+String(mat));
     if(mat===roofMat)junctions++;
     if(mat===glass&&!expectedWindowCells.has(k))
      fail('UNAPPROVED_PERIMETER_GLAZING');
     if(mat===glass)glazing++;else walls++;
    }
   for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){
    if(has(x,y,z))fail('HIGH_INTERIOR_FILLED');
    voidCells++;
   }
  }
  if(glazing!==expectedWindowCells.size)
   fail('WINDOW_DOES_NOT_PENETRATE_VALID_WALL');
  for(let x=minX-1;x<=maxX+1;x++)
   for(let z=minZ-1;z<=maxZ+1;z++){
    if(occupied.get(key(x,roofY,z))!==roofMat)
     fail('FULL_ROOF_PERIMETER_COVER_NOT_REAL');
    roof++;
   }
  // Independently flood the full connected upper-air component; actual
  // two-block lower circulation is handled by existing source QA.
  // A bounded region with a missing roof or wall must reach "outside".
  const seed=[Math.floor((minX+maxX)/2),6,Math.floor((minZ+maxZ)/2)];
  if(has(...seed))fail('ROOM_SEED_OCCUPIED');
  const queue=[seed],seen=new Set([key(...seed)]);
  let escape=false;
  for(let i=0;i<queue.length;i++){
   const [x,y,z]=queue[i];
   if(x<0||x>=w||z<0||z>=d||y>=h){escape=true;break;}
   for(const [dx,dy,dz] of axes){
    const nx=x+dx,ny=y+dy,nz=z+dz,k=key(nx,ny,nz);
    if(ny<6||nx< -1||nx>w||nz< -1||nz>d||ny>h||
     seen.has(k)||has(nx,ny,nz))continue;
    seen.add(k);queue.push([nx,ny,nz]);
   }
   if(queue.length>30000)fail('FLOOD_EXPANSION_BUDGET');
  }
  if(escape)fail('ROOM_UPPER_AIR_LEAKS_TO_OUTDOORS');
  totalRoof+=roof;totalUpperWalls+=walls;totalPane+=glazing;
  totalJunctions+=junctions;
  envelopeRooms.push({
   zoneId:s.zoneId,
   roofHeightY:roofY,
   checkedFullRoofCells:roof,
   checkedUpperWallCells:walls,
   checkedSharedRoofJunctionCells:junctions,
   checkedActualGlassCells:glazing,
   clearHighInteriorVoxels:voidCells,
   connectedAirCellsVisited:seen.size,
   reachedExteriorThroughUpperEnvelope:false,
   weatherResistanceInRealMinecraft:'NOT_TESTED'
  });
 }
 if(totalPane!==source.r163DaylightAndRoofEvidence.realGlassPaneCount)
  fail('GLASS_COUNT_SOURCE_DISAGREEMENT');
 if(source.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !source.sourceRouteAudit.featureAccess.every(x=>x.reachableFromEntrance))
  fail('SERVICE_ROUTE_NOT_VERIFIED');
 return {
  schema:'r164-independent-upper-envelope-continuity-v1',
  status:'SOURCE_ROOM_UPPER_SHELL_CONTINUOUS_ART_HOLD',
  sourceSha256:source.sourceSha256,
  geometrySha256:source.geometrySha256,
  independentlyEnumeratedAllPerimeterCells:true,
  independentlyFloodedHighInteriorAir:true,
  checkedRoofVoxelCells:totalRoof,
  checkedWallVoxelCells:totalUpperWalls,
  checkedRoofToHighWallJunctionCells:totalJunctions,
  checkedGlassVoxelCells:totalPane,
  allThreeRoomUpperEnvelopesSourceClosed:true,
  realHighRooms:envelopeRooms,
  scope:'ONLY_ROOM_UPPER_VOLUME_Y6_AND_ABOVE_NOT_FULL_BUILDING_ENVELOPE',
  realWeatherTightness:'NOT_TESTED',
  lowerInteriorAndEntryWeatherProof:'NOT_TESTED',
  realMinecraftWalking:'NOT_TESTED',
  humanVisualArtReview:'ART_HOLD',
  worldContacts:0,worldWrites:0,
  constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
}

/** B66 local, nominal 3D envelope for room partitions. NOT a Minecraft emitter. */
import {createHash} from 'node:crypto';
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fail=m=>{throw Error('B66_'+m)};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const NOMINAL_PROFILE=Object.freeze({id:'OFFLINE_VISUAL_PROFILE_ONLY',floorPitch:5,wallHeight:3,doorClearHeight:2.25,wallThickness:0.125,doorClearWidth:1,unit:'HYPOTHETICAL_LOCAL_UNIT'});
function safeSource(report,b64){
 if(!report||report.schema!=='minecraftaibuilder-b65-interior-assembly-intents-v1'||report.readiness!=='NOT_PREPARED'||report.executionAllowed!==false||report.constructionApproved!==false||report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||report.gates?.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||report.reportSha256!==hash(Object.fromEntries(Object.entries(report).filter(([k])=>k!=='reportSha256'))))fail('SOURCE_GUARD');
 if(!b64||b64.schema!=='minecraftaibuilder-b64-concept-room-footprints-v1'||b64.readiness!=='NOT_PREPARED'||b64.BuildPlan?.operations?.length!==0||b64.reportSha256!==report.provenance?.b64ReportSha256||b64.reportSha256!==hash(Object.fromEntries(Object.entries(b64).filter(([k])=>k!=='reportSha256')))||b64.gates?.some(g=>g.status!=='BLOCKED'))fail('B64_SOURCE');
 if(!Array.isArray(report.sections)||report.sections.length!==30||!Array.isArray(report.nominalVerticalLinks)||report.nominalVerticalLinks.length!==25||report.summary?.nominalWallEdges!==5704||report.summary?.openingPortCandidates!==314||report.summary?.rooms!==314||!Array.isArray(b64.buildings)||b64.buildings.length!==5)fail('SOURCE_SCOPE');
}
function box3(minX,minY,minZ,maxX,maxY,maxZ){
 const a=[minX,minY,minZ,maxX,maxY,maxZ];if(!a.every(Number.isFinite)||!(minX<maxX&&minY<maxY&&minZ<maxZ))fail('DEGENERATE_BOX');
 return a.map(v=>+v.toFixed(6));
}
function geom(w,baseY){
 const a=w.insideCell,b=w.adjacentCell;if(!a||!b||!Number.isSafeInteger(a.x)||!Number.isSafeInteger(a.z)||!Number.isSafeInteger(b.x)||!Number.isSafeInteger(b.z)||Math.abs(a.x-b.x)+Math.abs(a.z-b.z)!==1||w.axis!==(a.x!==b.x?'X':'Z'))fail('WALL_DIRECTION');
 const t=NOMINAL_PROFILE.wallThickness/2;
 if(w.axis==='X'){
  const x=(a.x+b.x+1)/2;return {axis:'X',footprint:box3(x-t,baseY,a.z,x+t,baseY+NOMINAL_PROFILE.wallHeight,a.z+1)};
 }
 const z=(a.z+b.z+1)/2;return {axis:'Z',footprint:box3(a.x,baseY,z-t,a.x+1,baseY+NOMINAL_PROFILE.wallHeight,z+t)};
}
function topSlice(full,baseY){const b=full.slice();b[1]=+(baseY+NOMINAL_PROFILE.doorClearHeight).toFixed(6);return b;}
function bottomSlice(full,baseY){const b=full.slice();b[4]=+(baseY+NOMINAL_PROFILE.doorClearHeight).toFixed(6);return b;}
function dimensions(box){return +( (box[3]-box[0])*(box[4]-box[1])*(box[5]-box[2]) ).toFixed(8);}
function sectionToVirtual(s,f){
 if(s.id!==`${f.id}`||s.level!==f.level||s.nominalCoordinateFrame!=='LOCAL_CONCEPT_XZ_ONLY'||s.physicalModuleEmitted!==false||s.wallThicknessKnown!==false||s.doorHingesKnown!==false||!equal(s.dimensions,{width:f.width,depth:f.depth}))fail('SECTION_METADATA');
 if(f.rooms?.length!==s.counts?.rooms||f.maskRows?.length!==s.dimensions.depth)fail('ROOM_MASK');
 const baseY=(s.level-1)*NOMINAL_PROFILE.floorPitch;
 const doors=new Map(s.openingPorts.map(d=>[d.id,d]));if(doors.size!==s.openingPorts.length)fail('DUPLICATE_PORT');
 const ids=new Set(),panels=[],openings=[];let solidUnits=0,voidUnits=0;
 for(const w of s.nominalWalls){
  if(typeof w.id!=='string'||ids.has(w.id)||w.emitAllowed!==false||w.realMaterial!==null||w.realWallWidth!==null||w.realOpeningDimensions!==null||w.partitionIntent!==(w.openingPortId?'NOMINAL_OPENING_CANDIDATE':'NOMINAL_ROOM_BOUNDARY'))fail('WALL_CONTRACT');
  ids.add(w.id);const g=geom(w,baseY),isOpening=w.openingPortId!==null;
  if(isOpening){const d=doors.get(w.openingPortId);if(!d||d.wallBoundaryId!==w.id||d.emitAllowed!==false||d.realWalkabilityVerified!==false||d.realDoorBlock!==null||!equal(d.roomCell,w.insideCell)||!equal(d.hallCell,w.adjacentCell)||w.neighborClass!=='CONCEPT_CORRIDOR')fail('OPENING_CONTRACT');
   const bbox=topSlice(g.footprint,baseY),voidBox=bottomSlice(g.footprint,baseY);
   panels.push({boundaryId:w.id,roomId:w.roomId,kind:'VIRTUAL_DOOR_LINTEL',box:bbox,notBuildable:true});
   openings.push({portId:d.id,boundaryId:w.id,roomId:w.roomId,kind:'VIRTUAL_DOOR_VOID',box:voidBox,normal:d.normal,hinge:null,realDoorBlock:null,notBuildable:true});
   solidUnits+=dimensions(bbox);voidUnits+=dimensions(voidBox);
  }else{panels.push({boundaryId:w.id,roomId:w.roomId,kind:'VIRTUAL_SOLID_WALL',box:g.footprint,notBuildable:true});solidUnits+=dimensions(g.footprint);}
 }
 if(panels.length!==s.counts.walls||openings.length!==s.counts.nominalOpenings||openings.length!==doors.size||ids.size!==panels.length)fail('COUNTS');
 const wallIds=new Set(panels.map(p=>p.boundaryId));if(openings.some(o=>!wallIds.has(o.boundaryId)))fail('UNREFERENCED_PORT');
 const expected=(panels.length*NOMINAL_PROFILE.wallHeight*NOMINAL_PROFILE.wallThickness);
 if(Math.abs(solidUnits+voidUnits-expected)>1e-5)fail('VOLUME_PARITY');
 return {id:s.id,level:s.level,localFrame:'NON_WORLD_X_Y_Z',floorMaskRows:f.maskRows,conceptRooms:f.rooms.map(r=>({id:r.id,x:r.x,z:r.z,width:r.width,depth:r.depth})),conceptReservations:{corridors:f.corridorCells,stairs:f.stairCells,elevators:f.elevatorCells},
  virtualWallPanels:panels,virtualDoorVoids:openings,metrics:{nominalWallBoundaries:panels.length,solidWallPanels:panels.length-openings.length,lintelPanels:openings.length,doorVoidBoxes:openings.length,nominalSolidVolume:+solidUnits.toFixed(8),nominalVoidVolume:+voidUnits.toFixed(8),totalUncutBoundaryVolume:+expected.toFixed(8)},
  physicalWalkability:'UNKNOWN',realMaterial:null,realWorldAnchor:null,realDoorBlocks:0,realStairBlocks:0,constructionInstructions:[],emitAllowed:false};
}
export function compileB66(b65,b64){
 safeSource(b65,b64);
 const floors=new Map(b64.buildings.flatMap(b=>b.floors.map(f=>[`${b.id}/L${f.level}`,{...f,id:`${b.id}/L${f.level}`}])));if(floors.size!==30)fail('B64_FLOORS');
 const sections=b65.sections.map(s=>{const f=floors.get(s.id);if(!f)fail('MISSING_FLOOR');return sectionToVirtual(s,f)});
 const totals={buildings:5,levels:sections.length,conceptRooms:sections.reduce((n,s)=>n+s.conceptRooms.length,0),
  virtualWallPanels:sections.reduce((n,s)=>n+s.virtualWallPanels.length,0),virtualLintels:sections.reduce((n,s)=>n+s.metrics.lintelPanels,0),
  virtualOpeningVoids:sections.reduce((n,s)=>n+s.virtualDoorVoids.length,0),virtualSolidVolume:+sections.reduce((n,s)=>n+s.metrics.nominalSolidVolume,0).toFixed(8),
  virtualVoidVolume:+sections.reduce((n,s)=>n+s.metrics.nominalVoidVolume,0).toFixed(8),nominalVerticalReservations:b65.nominalVerticalLinks.length,physicalBlocks:0,buildingOperations:0};
 if(totals.conceptRooms!==314||totals.virtualWallPanels!==5704||totals.virtualLintels!==314||totals.virtualOpeningVoids!==314||totals.nominalVerticalReservations!==25||totals.virtualSolidVolume!==2050.6875||totals.virtualVoidVolume!==88.3125)fail('GLOBAL_TOTALS');
 const contract={schema:'minecraftaibuilder-b66-local-3d-nominal-assembly-v1',kind:'OFFLINE_LOCAL_3D_VISUALIZATION_ONLY',provenance:{b65ReportSha256:b65.reportSha256,b64ReportSha256:b64.reportSha256},
  nominalProfile:{...NOMINAL_PROFILE},summary:totals,sections,virtualVerticalReservations:b65.nominalVerticalLinks.map(l=>({id:l.id,lowerSection:l.lowerSection,upperSection:l.upperSection,physicalStairBuilt:false,emitAllowed:false})),
  unapprovedConnector:{...b65.unapprovedConnector},unresolved:['NO_PRODUCTION_ENGINE_SOURCE','NO_REAL_WALL_THICKNESS','NO_REAL_DOOR_HINGES_OR_BLOCKS','NO_REAL_STAIR_SUPPORT_OR_HEADROOM','NO_WORLD_ANCHOR_OR_BUILD_OPERATIONS','B42_60_UPPER_DOORS_UNRESOLVED'],
  validity:{geometryValidOnlyUnderHypotheticalProfile:true,realBuildingQualityVerified:false,constructionApproval:false,realWalkabilityVerified:false,worldPlacementVerified:false},
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,engineCalls:0,worldContacts:0,scans:0,productionFacadeParity:'UNVERIFIED',gates:b65.gates.map(g=>({...g})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...contract,reportSha256:hash(contract)};
}
export function verifyB66(report,b65,b64){
 if(!report||report.reportSha256!==hash(Object.fromEntries(Object.entries(report).filter(([k])=>k!=='reportSha256')))||!equal(report,compileB66(b65,b64)))fail('REPLAY');
 if(report.sections.some(s=>s.constructionInstructions.length||s.emitAllowed!==false)||report.executionAllowed!==false||report.BuildPlan.operations.length!==0||report.gates.some(g=>g.status!=='BLOCKED'))fail('EXECUTION_GUARD');return true;
}

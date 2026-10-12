/** B65: non-executable interior assembly intent compiler. Never emits block operations. */
import {createHash} from 'node:crypto';
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=x=>{throw Error('B65_'+x)};
const loc=p=>`${p.x},${p.z}`;
function guard(x,id){
 if(!x||typeof x!=='object'||Array.isArray(x)||typeof x.reportSha256!=='string'||digest(Object.fromEntries(Object.entries(x).filter(([k])=>k!=='reportSha256')))!==x.reportSha256)fail(id+'_HASH');
 if(x.executionAllowed===true||x.constructionApproved===true||x.BuildPlan?.status!=='NOT_PREPARED'||!Array.isArray(x.BuildPlan?.operations)||x.BuildPlan.operations.length!==0||x.BuildPlan.commandCount!==0)fail(id+'_SAFETY');
}
function keyset(items,w,d,caption){
 const s=new Set();if(!Array.isArray(items))fail(caption+'_ARRAY');
 for(const p of items){if(!Number.isSafeInteger(p?.x)||!Number.isSafeInteger(p?.z)||p.x<0||p.z<0||p.x>=w||p.z>=d||s.has(loc(p)))fail(caption+'_CELL');s.add(loc(p));}return s;
}
function floorOwner(f){
 const map=new Map();for(const r of f.rooms){if(typeof r.id!=='string')fail('ROOM_ID');for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){const k=`${x},${z}`;if(map.has(k))fail('ROOM_OVERLAP');map.set(k,r.id);}}return map;
}
function canonical(w){return [loc(w.from),loc(w.to)].sort().join('|');}
const countBy=(xs,key)=>{const result={};for(const x of xs){const k=x[key];result[k]=(result[k]||0)+1;}return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));};
function compileFloor(f,ir,buildingId,nominalHeight){
 const {width:w,depth:d,level}=f,id=`${buildingId}/L${level}`;
 if(ir.id!==id||ir.level!==level||f.rooms.length!==f.conceptRoomCount||ir.physicalValidated!==false||ir.operations?.length!==0||ir.worldAnchor!==null||ir.materialIds?.length!==0)fail('FLOOR_METADATA_'+id);
 const rooms=floorOwner(f),halls=keyset(f.corridorCells,w,d,'CORRIDOR'),stairs=keyset(f.stairCells,w,d,'STAIR'),lifts=keyset(f.elevatorCells,w,d,'LIFT');
 if(!same(ir.corridorReservation,f.corridorCells)||!same(ir.stairReservation,f.stairCells)||!same(ir.elevatorReservation,f.elevatorCells))fail('RESERVATION_PARITY_'+id);
 const mask=new Set();if(!Array.isArray(f.maskRows)||f.maskRows.length!==d)fail('SOURCE_MASK');for(let z=0;z<d;z++){if(typeof f.maskRows[z]!=='string'||f.maskRows[z].length!==w||!/^[01]+$/.test(f.maskRows[z]))fail('SOURCE_MASK');for(let x=0;x<w;x++)if(f.maskRows[z][x]==='1')mask.add(`${x},${z}`);}
 for(const k of rooms.keys())if(!mask.has(k))fail('ROOM_NOT_ON_REFERENCE_FLOOR_'+id);
 const walls=new Map(),interfaces=new Set();for(const v of ir.wallBoundaries){
  if(typeof v.id!=='string'||walls.has(v.id)||!['NOMINAL_WALL_BOUNDARY','NOMINAL_DOOR_INTERFACE'].includes(v.kind)||v.nominal!==true||v.roomIds?.length!==1||v.localYBase!==(level-1)*nominalHeight)fail('WALL_SHAPE_'+id);
  const a=v.from,b=v.to; if(![a.x,a.z,b.x,b.z].every(Number.isSafeInteger)||Math.abs(a.x-b.x)+Math.abs(a.z-b.z)!==1||rooms.get(loc(a))!==v.roomIds[0]||rooms.has(loc(b)))fail('WALL_OWNER_'+v.id);
  const edge=canonical(v);if(interfaces.has(edge))fail('DOUBLE_INTERFACE_'+edge);interfaces.add(edge);
  let next='OUTSIDE_REFERENCE_FLOOR';if(halls.has(loc(b)))next='CONCEPT_CORRIDOR';else if(stairs.has(loc(b)))next='NOMINAL_STAIR_RESERVATION';else if(lifts.has(loc(b)))next='NOMINAL_ELEVATOR_RESERVATION';else if(mask.has(loc(b)))next='UNASSIGNED_REFERENCE_FLOOR';
  walls.set(v.id,{id:v.id,roomId:v.roomIds[0],insideCell:a,adjacentCell:b,neighborClass:next,sourceNominalEdgeKind:v.kind,axis:a.x!==b.x?'X':'Z',openingPortId:null,partitionIntent:'NOMINAL_ROOM_BOUNDARY',realMaterial:null,realWallWidth:null,realOpeningDimensions:null,emitAllowed:false});
 }
 const doors=[],roomPorts=new Set(),doorBoundary=new Set();for(const dport of ir.roomDoorInterfaces){
  if(typeof dport.id!=='string'||roomPorts.has(dport.id)||dport.nominal!==true||dport.openingPhysicalVerified!==false)fail('DOOR_SHAPE');roomPorts.add(dport.id);
  const wall=walls.get(dport.boundaryId);if(!wall||wall.roomId!==dport.roomId||!same(wall.insideCell,dport.doorCell)||!same(wall.adjacentCell,dport.hallCell)||wall.neighborClass!=='CONCEPT_CORRIDOR'||doorBoundary.has(wall.id))fail('DOOR_BOUNDARY_'+dport.id);
  if(wall.sourceNominalEdgeKind!=='NOMINAL_DOOR_INTERFACE')fail('DOOR_SOURCE_KIND');doorBoundary.add(wall.id);wall.openingPortId=dport.id;wall.partitionIntent='NOMINAL_OPENING_CANDIDATE';
  doors.push({id:dport.id,roomId:dport.roomId,wallBoundaryId:wall.id,roomCell:dport.doorCell,hallCell:dport.hallCell,normal:{dx:dport.hallCell.x-dport.doorCell.x,dz:dport.hallCell.z-dport.doorCell.z},
   conceptOpeningIntent:true,realDoorBlock:null,hinge:null,clearHeight:null,realWalkabilityVerified:false,emitAllowed:false});
 }
 if(doors.length!==f.rooms.length||[...walls.values()].filter(v=>v.sourceNominalEdgeKind==='NOMINAL_DOOR_INTERFACE').length!==doors.length)fail('ROOM_DOOR_COVERAGE_'+id);
 const wallIntents=[...walls.values()];return {id,level,nominalCoordinateFrame:'LOCAL_CONCEPT_XZ_ONLY',dimensions:{width:w,depth:d},nominalWalls:wallIntents,openingPorts:doors,
  counts:{rooms:f.rooms.length,walls:wallIntents.length,nominalOpenings:doors.length,solidWallIntents:wallIntents.length-doors.length,neighborClasses:countBy(wallIntents,'neighborClass')},
  interfacesFrozen:true,wallThicknessKnown:false,doorHingesKnown:false,realEgressVerified:false,physicalModuleEmitted:false,
  _private:{rooms,halls,stairs,lifts,mask,walls}};
}
export function compileB65(b64,b17){
 guard(b64,'B64');
 if(b64.schema!=='minecraftaibuilder-b64-concept-room-footprints-v1'||b64.readiness!=='NOT_PREPARED'||b64.productionFacadeParity!=='UNVERIFIED'||b64.gates?.length!==9||b64.gates.some(g=>g.status!=='BLOCKED')||b64.scope?.rooms!==314||b64.scope?.uniqueConceptRoomFootprintCells!==6462||b64.scope?.doorMappingsVerified!==314)fail('B64_CONTRACT');
 if(!b17||b17.schema!=='minecraftaibuilder-step8b-b17-interior-ir-v1'||b17.safety?.notPrepared!==true||b17.safety?.constructionApproved!==false||b17.safety?.executionAllowed!==false||b17.deploymentGate!=='BLOCKED'||b17.physicalValidated!==false||b17.BuildPlan?.operations?.length!==0||b17.counts?.wallEdges!==5704||b17.counts?.doorPorts!==314||b17.counts?.nominalVerticalLinks!==25)fail('B17_CONTRACT');
 guard(b17,'B17');
 const sources=new Map(b17.buildings.map(b=>[b.id,b]));if(sources.size!==5||b64.buildings.length!==5)fail('BUILDINGS');
 const sections=[],links=[];let walls=0,openings=0;const stats={};
 for(const model of b64.buildings){
  const original=sources.get(model.id);if(!original||model.floors.length!==6||original.floors.length!==6||original.verticalInterfaces.length!==5)fail('BUILDING_'+model.id);
  for(let i=0;i<6;i++){
   const section=compileFloor(model.floors[i],original.floors[i],model.id,original.floorHeightNominal);walls+=section.counts.walls;openings+=section.counts.nominalOpenings;
   for(const [k,v] of Object.entries(section.counts.neighborClasses))stats[k]=(stats[k]||0)+v;
   delete section._private;sections.push(section);
  }
  for(let i=0;i<5;i++){
   const v=original.verticalInterfaces[i];if(v.fromFloor!==`${model.id}/L${i+1}`||v.toFloor!==`${model.id}/L${i+2}`||v.stairXZAligned!==true||v.realStairConstructed!==false||v.actualPassageVerified!==false)fail('STAIR_'+model.id+'_L'+(i+1));
   links.push({id:v.id,lowerSection:v.fromFloor,upperSection:v.toFloor,nominalReservationAligned:true,realStairStaging:null,realHeadroomChecked:false,realPassageVerified:false,emitAllowed:false});
  }
 }
 if(walls!==5704||openings!==314||sections.length!==30||links.length!==25)fail('TOTALS');
 const selected=b64.alternatives.find(a=>a.addedCells===5);if(!selected||selected.perCell.length!==5||selected.cellClassification.UNASSIGNED_CONCEPT_FLOOR!==5||selected.conceptualRoomOverlapCells!==0||selected.nominalElevatorConflictAtWidth1!==0||selected.nominalStairConflictAtWidth1!==0)fail('PROPOSAL');
 const first=sections.find(s=>s.id==='apartment/candidate-01/L1');
 const near=selected.perCell.map(p=>{const wallIds=first.nominalWalls.filter(w=>[loc(w.insideCell),loc(w.adjacentCell)].includes(loc(p.cell))).map(w=>w.id);return {cell:p.cell,nominalWallBoundaryIds:wallIds,conceptRoomOverlap:false,nominalStairOverlap:false,nominalElevatorOverlap:false,reviewOnly:true};});
 const proposal={id:'B62_FIVE_CELL_UNAPPROVED',sectionId:first.id,localCorridorCandidates:near,nominalEquipmentOverlap:0,conceptRoomOverlap:0,physicallyWalkable:'UNVERIFIED',authorized:false,emitAllowed:false};
 const body={schema:'minecraftaibuilder-b65-interior-assembly-intents-v1',kind:'LOGICAL_ASSEMBLY_COMPILER_NON_EXECUTABLE',provenance:{b64ReportSha256:b64.reportSha256,b17ReportSha256:b17.reportSha256},
  summary:{buildings:5,floors:30,rooms:314,nominalWallEdges:walls,openingPortCandidates:openings,remainingSolidWallIntents:walls-openings,verticalReservations:25,wallNeighborClasses:Object.fromEntries(Object.entries(stats).sort(([a],[b])=>a.localeCompare(b))),physicalWallBlocks:0,physicalDoorBlocks:0,physicalStairBlocks:0},
  sections,nominalVerticalLinks:links,unapprovedConnector:proposal,
  missingProductionInputs:['PINNED_PRODUCTION_FACADE_SOURCE','REAL_ROOM_PARTITIONS_AND_WALL_THICKNESS','REAL_DOOR_BLOCK_STATES_AND_HINGES','STAIR_SUPPORT_HEADROOM_AND_PASSAGE','REAL_WORLD_ANCHORS_AND_MATERIAL_CATALOG'],
  claims:{doorBoundaryMappingExactForConceptModel:true,physicalDoorOpeningsValidated:false,interiorBlockGeometryValidated:false,stairsConstructed:false,realHallwayPassageVerified:false,productionImplementationAvailable:false},
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,worldContacts:0,engineCalls:0,scans:0,physicalQuality:'UNKNOWN',productionFacadeParity:'UNVERIFIED',gates:b64.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:digest(body)};
}
export function verifyB65(report,b64,b17){guard(report,'B65');if(!same(report,compileB65(b64,b17))||report.gates.some(g=>g.status!=='BLOCKED')||report.BuildPlan.operations.length||report.constructionApproved!==false||report.executionAllowed!==false)fail('REPLAY');return true;}

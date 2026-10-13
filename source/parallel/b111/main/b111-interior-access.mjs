/**
 * B111: READ-ONLY functional occupancy planner for all 15 B110 building designs.
 * Furniture proposals are made inside B104 room interiors. No block IDs/states
 * are assigned, no user/world coordinates, no game contact, no approval.
 */
import {createHash} from 'node:crypto';
import {auditB110Model} from '../../b110/main/b110-functional-interfaces.mjs';

const K=(x,z)=>x+','+z;
const CARDINAL=Object.freeze([[1,0],[-1,0],[0,1],[0,-1]]);
const checksum=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const inRoom=(r,x,z)=>x>r.x&&x<r.x+r.width-1&&z>r.z&&z<r.z+r.depth-1;
const adjacent=(p)=>CARDINAL.map(([dx,dz])=>({x:p.x+dx,z:p.z+dz}));
const isSafeParent=d=>d?.schema==='minecraftaibuilder-b104-co-design-v1'&&
 d.readonlyDesign===true&&d.constructionApproved===false&&d.worldContacts===0&&
 d.worldCoordinates===null&&d.BuildPlan?.status==='NOT_PREPARED'&&
 d.BuildPlan.operations?.length===0&&d.BuildPlan.commandCount===0&&
 d.BuildPlan.worldCoordinates===null&&d.result?.conceptualSafe===true;
const roomCells=r=>{
 const c=[];for(let z=r.z+1;z<r.z+r.depth-1;z++)for(let x=r.x+1;x<r.x+r.width-1;x++)c.push({x,z});
 return c;
};
const bfs=(seed,walkable)=>{
 const first=K(seed.x,seed.z);
 if(!walkable.has(first))return new Map();
 const dist=new Map([[first,0]]),queue=[seed];
 for(let i=0;i<queue.length;i++){
  const cell=queue[i],d=dist.get(K(cell.x,cell.z));
  for(const p of adjacent(cell)){
   const k=K(p.x,p.z);if(walkable.has(k)&&!dist.has(k)){
    dist.set(k,d+1);queue.push(p);
   }
  }
 }
 return dist;
};
function evaluateRoom(room,insideDoor,fixtures,assignment){
 const occupied=new Set(),descriptors=[],clashes=[];
 for(let i=0;i<fixtures.length;i++){
  const f=fixtures[i],anchor={x:f.localAnchor.x,z:f.localAnchor.z};
  const second=assignment[i];
  const cells=second?[anchor,second]:[anchor];
  for(const p of cells){
   const id=K(p.x,p.z);
   if(!inRoom(room,p.x,p.z)||occupied.has(id))clashes.push(id);
   occupied.add(id);
  }
  descriptors.push({fixtureIndex:i,role:f.role,anchor,
   footprint:cells,secondaryCell:second??null,
   plannedBedPair:f.role==='bed'&&!!second,
   physicalBlockShapeCertified:false});
 }
 const floor=roomCells(room),floorSet=new Set(floor.map(p=>K(p.x,p.z)));
 const free=new Set([...floorSet].filter(p=>!occupied.has(p)));
 const distances=bfs(insideDoor,free);
 const approaches=descriptors.map(d=>{
  const access=d.footprint.flatMap(adjacent).filter(p=>
   free.has(K(p.x,p.z))&&distances.has(K(p.x,p.z)))
   .sort((a,b)=>distances.get(K(a.x,a.z))-distances.get(K(b.x,b.z))||a.z-b.z||a.x-b.x);
  return {fixtureIndex:d.fixtureIndex,nearestWalkableApproach:access[0]??null,
   reachableApproaches:access.length,physicalInteractionCertified:false};
 });
 const disconnected=[...free].filter(x=>!distances.has(x)).length;
 const roomsWith2x2=[...distances.keys()].reduce((n,id)=>{
  const [x,z]=id.split(',').map(Number);
  return n+([[x,z],[x+1,z],[x,z+1],[x+1,z+1]]
   .every(([a,b])=>distances.has(K(a,b)))?1:0);
 },0);
 const paired=descriptors.filter(x=>x.role==='bed'&&x.plannedBedPair).length;
 const unpaired=descriptors.filter(x=>x.role==='bed'&&!x.plannedBedPair).length;
 const badApproaches=approaches.filter(x=>!x.nearestWalkableApproach).length;
 const doorClear=free.has(K(insideDoor.x,insideDoor.z));
 const usable=doorClear&&clashes.length===0&&disconnected===0&&badApproaches===0&&unpaired===0&&
  distances.size>=2;
 const issues=[
  ...(!doorClear?['ENTRY_INTERIOR_CELL_OCCUPIED']:[]),
  ...(clashes.length?['FURNITURE_FOOTPRINT_COLLISION']:[]),
  ...(distances.size<2?['INSUFFICIENT_UNOBSTRUCTED_INTERIOR_CELLS']:[]),
  ...(disconnected?['UNREACHABLE_INTERIOR_CELLS']:[]),
  ...(badApproaches?['FIXTURE_WITHOUT_REACHABLE_APPROACH']:[]),
  ...(unpaired?['BED_SECOND_CELL_NOT_ASSIGNED']:[])
 ];
 // Prioritize a truly usable room. Then complete beds; then maximize travel
 // accessibility/compactness. Never maximize furniture count at expense of entry.
 const score=(usable?1000000:0)+paired*10000-
  clashes.length*50000-badApproaches*30000-
  (doorClear?0:80000)-disconnected*3000-unpaired*20000+
  distances.size*10+roomsWith2x2;
 return {descriptors,approaches,usable,issues,
  stats:{sourceInteriorCells:floor.length,blockedCells:occupied.size,
   freeCells:free.size,reachableCells:distances.size,disconnectedCells:disconnected,
   doorInteriorClear:doorClear,fixtureApproachFailures:badApproaches,
   overlapCells:clashes.length,bedPairsAssigned:paired,bedPairsUnresolved:unpaired,
   free2x2SquareCandidates:roomsWith2x2,
   meanFixtureApproachSteps:approaches.length&&approaches.every(a=>a.nearestWalkableApproach)?
    approaches.reduce((n,a)=>n+distances.get(K(a.nearestWalkableApproach.x,a.nearestWalkableApproach.z)),0)/approaches.length:null},
  score};
}
export function inspectB111Room(room,door,fixtures){
 if(!room?.id||door?.roomId!==room.id||door.level!==room.level||
 !Array.isArray(fixtures)||!fixtures.length||
 fixtures.some(f=>f.roomId!==room.id||f.level!==room.level||
  f.sourceCellPreserved!==true||f.physicalPlacementValidated!==false||
  !Number.isInteger(f.localAnchor.x)||!Number.isInteger(f.localAnchor.z)))
 throw Error('B111_BAD_ROOM_SOURCE');
 const entrance={...door.interiorCell};
 const takenAnchors=new Set(fixtures.map(f=>K(f.localAnchor.x,f.localAnchor.z)));
 if(takenAnchors.size!==fixtures.length)throw Error('B111_DUPLICATE_PARENT_FIXTURE');
 const choices=fixtures.map(f=>{
  if(f.role!=='bed')return [null];
  // Keep original fixture anchors unchanged; bed second cells are proposals,
  // not actual B105 material cells and must remain disjoint from all anchors.
  const pos={x:f.localAnchor.x,z:f.localAnchor.z};
  const possibles=adjacent(pos).filter(p=>inRoom(room,p.x,p.z)&&
   K(p.x,p.z)!==K(entrance.x,entrance.z)&&!takenAnchors.has(K(p.x,p.z)));
  return [...possibles,null];
 });
 let best=null,count=0;
 const pick=(i,a)=>{
  if(i===fixtures.length){
   count++;const result=evaluateRoom(room,entrance,fixtures,a);
   if(!best||result.score>best.score)best=result;
   return;
  }
  for(const candidate of choices[i])pick(i+1,[...a,candidate]);
 };
 pick(0,[]);
 if(!best)throw Error('B111_NO_ROOM_CANDIDATE');
 const sourceFootprint={
  level:room.level,roomId:room.id,purpose:room.purpose,
  roomRectangle:{x:room.x,z:room.z,width:room.width,depth:room.depth},
  doorInterior:{...entrance},sourceFixtureAnchors:fixtures.map(f=>({...f.localAnchor})),
  candidateCombinationsEvaluated:count
 };
 return { ...sourceFootprint,
  furniture:best.descriptors,approaches:best.approaches,
  stats:best.stats,issues:best.issues,
  decision:best.usable?'OFFLINE_ROOM_PATHS_CLEAR':'ROOM_NEEDS_REDESIGN',
  versionPinnedBedrockCollisionTest:false,physicalFurnitureInstalled:false,
  fireSafetyApproved:false,completedPhysicalRoom:false};
}
export function modelB111Interiors(design,b110){
 if(!isSafeParent(design)||!auditB110Model(b110)||
 design.candidateId!==b110.id||design.plan?.typology!==b110.typology||
 design.plan.floors.length!==b110.levels)throw Error('B111_UNSAFE_PARENTS');
 const rooms=[];
 for(const f of design.plan.floors){
  for(const room of f.rooms){
   const door=b110.doors.find(d=>d.level===f.level&&d.roomId===room.id);
   const fixtures=b110.fixtures.filter(d=>d.level===f.level&&d.roomId===room.id);
   if(!door||fixtures.length<1)throw Error('B111_MISSING_B110_ROOM_INTERFACE');
   rooms.push(inspectB111Room({...room,level:f.level},door,fixtures));
  }
 }
 const aggregate=k=>rooms.reduce((s,r)=>s+r.stats[k],0);
 const metrics={conceptRooms:rooms.length,conceptualFurnitureSourceCells:b110.fixtures.length,
  bedsProposedAsTwoCells:aggregate('bedPairsAssigned'),
  bedPairsStillUnresolved:aggregate('bedPairsUnresolved'),
  roomPathPasses:rooms.filter(x=>x.decision==='OFFLINE_ROOM_PATHS_CLEAR').length,
  roomNeedsRedesign:rooms.filter(x=>x.decision==='ROOM_NEEDS_REDESIGN').length,
  roomDoorInteriorBlocked:rooms.filter(x=>!x.stats.doorInteriorClear).length,
  roomsWithNo2wideWalkableSquare:rooms.filter(x=>x.stats.free2x2SquareCandidates===0).length,
  disconnectedInteriorCells:aggregate('disconnectedCells'),
  fixtureApproachFailures:aggregate('fixtureApproachFailures'),
  furnitureOverlapCells:aggregate('overlapCells'),
  primaryPassageCells:aggregate('reachableCells'),
  fixtureCandidateOptionsEvaluated:rooms.reduce((s,r)=>s+r.candidateCombinationsEvaluated,0),
  actualBedsCertified:0,actualUsableFurnitureCertified:0,
  roomsCertifiedComplete:0,worldCommandsExecuted:0,verifiedEducationBlockStates:0};
 const model={schema:'minecraftaibuilder-b111-offline-room-occupancy-v1',
  id:b110.id,typology:b110.typology,levels:b110.levels,
  previousB110Digest:b110.digest,parent:'B104_B110_READ_ONLY',
  rooms,metrics,reviewOnly:true,worldContacts:0,worldCoordinates:null,
  constructionApproved:false,executionAllowed:false,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...model,digest:checksum(model)};
}
export function auditB111Model(model,design,b110){
 if(!isSafeParent(design)||!auditB110Model(b110)||
 model?.schema!=='minecraftaibuilder-b111-offline-room-occupancy-v1'||
 model.id!==b110.id||model.typology!==b110.typology||
 model.levels!==design.plan.floors.length||model.previousB110Digest!==b110.digest||
 model.reviewOnly!==true||model.worldContacts!==0||
 model.worldCoordinates!==null||model.constructionApproved!==false||
 model.executionAllowed!==false||model.BuildPlan?.status!=='NOT_PREPARED'||
 model.BuildPlan.operations?.length!==0||model.BuildPlan.commandCount!==0||
 model.BuildPlan.worldCoordinates!==null||!Array.isArray(model.rooms))return false;
 const {digest,...body}=model;
 if(digest!==checksum(body))return false;
 if(model.rooms.length!==design.plan.floors.reduce((n,f)=>n+f.rooms.length,0))return false;
 // Independently re-run the room occupancy geometry from frozen design and
 // B110 inputs. Matching the digest alone is not accepted as evidence.
 for(const actual of model.rooms){
  const room=design.plan.floors[actual.level]?.rooms.find(r=>r.id===actual.roomId);
  if(!room)return false;
  const door=b110.doors.find(d=>d.level===actual.level&&d.roomId===actual.roomId);
  const fixture=b110.fixtures.filter(d=>d.level===actual.level&&d.roomId===actual.roomId);
  if(!door||fixture.length<1)return false;
  const expected=inspectB111Room({...room,level:actual.level},door,fixture);
  if(JSON.stringify(expected)!==JSON.stringify(actual))return false;
 }
 const m=model.metrics,rs=model.rooms,sm=k=>rs.reduce((n,r)=>n+r.stats[k],0);
 return m.conceptRooms===rs.length&&m.conceptualFurnitureSourceCells===b110.fixtures.length&&
  m.bedsProposedAsTwoCells===sm('bedPairsAssigned')&&
  m.bedPairsStillUnresolved===sm('bedPairsUnresolved')&&
  m.roomPathPasses===rs.filter(r=>r.decision==='OFFLINE_ROOM_PATHS_CLEAR').length&&
  m.roomNeedsRedesign===rs.filter(r=>r.decision==='ROOM_NEEDS_REDESIGN').length&&
  m.roomDoorInteriorBlocked===rs.filter(r=>!r.stats.doorInteriorClear).length&&
  m.roomsWithNo2wideWalkableSquare===rs.filter(r=>r.stats.free2x2SquareCandidates===0).length&&
  m.disconnectedInteriorCells===sm('disconnectedCells')&&
  m.fixtureApproachFailures===sm('fixtureApproachFailures')&&
  m.furnitureOverlapCells===sm('overlapCells')&&
  m.primaryPassageCells===sm('reachableCells')&&
  m.fixtureCandidateOptionsEvaluated===rs.reduce((n,r)=>n+r.candidateCombinationsEvaluated,0)&&
  m.actualBedsCertified===0&&m.actualUsableFurnitureCertified===0&&
  m.roomsCertifiedComplete===0&&m.worldCommandsExecuted===0&&
  m.verifiedEducationBlockStates===0&&
  rs.every(r=>r.completedPhysicalRoom===false&&r.fireSafetyApproved===false&&
    r.versionPinnedBedrockCollisionTest===false&&r.physicalFurnitureInstalled===false);
}
export function drawB111RoomAscii(r){
 if(!r?.roomRectangle||!r?.stats)return '';
 const rect=r.roomRectangle,rows=Array.from({length:rect.depth},()=>Array(rect.width).fill('#'));
 for(let z=1;z<rect.depth-1;z++)for(let x=1;x<rect.width-1;x++)rows[z][x]='.';
 const place=(p,ch)=>{
  const x=p.x-rect.x,z=p.z-rect.z;
  if(rows[z]?.[x]!==undefined)rows[z][x]=ch;
 };
 for(const f of r.furniture)for(const c of f.footprint)place(c,f.role==='bed'?'B':f.role==='shelf'?'S':f.role==='desk'?'T':f.role==='seating'?'C':'F');
 for(const a of r.approaches)if(a.nearestWalkableApproach)place(a.nearestWalkableApproach,'a');
 place(r.doorInterior,'D');
 return rows.map(row=>row.join('')).join('\n');
}

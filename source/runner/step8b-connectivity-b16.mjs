/** B16: schematic-local graph only, never a construction or accessibility approval. */
import {createHash} from 'node:crypto';
import {buildB14Report,validateB14Report} from './step8b-interior-modules-b14.mjs';
import {buildB12Report,validateB12Report} from './step8b-spatial-contract-b12.mjs';
const fail=c=>{const e=new Error('B16_'+c);e.code='B16_'+c;throw e};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const key=p=>`${p.x},${p.z}`;
const neighbors=p=>[{x:p.x-1,z:p.z},{x:p.x+1,z:p.z},{x:p.x,z:p.z-1},{x:p.x,z:p.z+1}];
const ord=(a,b)=>a.localeCompare(b,undefined,{numeric:true});
const inside=(p,w,d)=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z)&&p.x>=0&&p.z>=0&&p.x<w&&p.z<d;
const sorted=a=>[...a].sort(ord);
function asSet(items,w,d,label){if(!Array.isArray(items)||items.length>w*d)fail(label+'_INVALID');const set=new Set();for(const p of items){if(!inside(p,w,d)||set.has(key(p)))fail(label+'_INVALID');set.add(key(p));}return set;}
function coords(k){const [x,z]=k.split(',').map(Number);return {x,z};}
/** Tests a fixed schematic floor in its original or review-only trimmed corridor state. */
export function inspectB16Floor(floor,ports,removed=[],mode='ORIGINAL'){
 const {width:w,depth:d}=floor?.dimensions||{};
 if(!['ORIGINAL','TRIM_REVIEW'].includes(mode)||!Number.isSafeInteger(w)||!Number.isSafeInteger(d)||w<8||w>48||d<8||d>40||
  floor.sourcePredictedMask?.length!==w*d||/[^01]/.test(floor.sourcePredictedMask)||floor.coordinateFrame!=='SCHEMATIC_LOCAL_XZ_AND_NOMINAL_Y'||
  floor.worldAnchor!==null||floor.materialIds?.length!==0||floor.application!=='REVIEW_ONLY_NOT_APPLIED'||floor.physicallyBuildable!=='UNKNOWN'||
  !Number.isSafeInteger(floor.level)||!Array.isArray(floor.localYRange)||!Array.isArray(ports)||ports.length>300)fail('UNSAFE_INPUT');
 const corridor=asSet(floor.localCorridorReservation,w,d,'CORRIDOR');
 const stair=asSet(floor.nominalStairReservation,w,d,'STAIR');
 const elevator=asSet(floor.nominalElevatorReservation,w,d,'ELEVATOR');
 const removal=asSet(removed,w,d,'TRIM');
 if([...removal].some(k=>!corridor.has(k)||floor.sourcePredictedMask[coords(k).z*w+coords(k).x]!=='0'))fail('TRIM_NOT_OUTSIDE_SOURCE');
 if(mode==='ORIGINAL'&&removal.size)fail('ORIGINAL_WITH_TRIM');
 const active=new Set([...corridor].filter(k=>mode==='ORIGINAL'||!removal.has(k)));
 const footprint=k=>{const p=coords(k);return floor.sourcePredictedMask[p.z*w+p.x]==='1'};
 const seen=new Set(),componentOf=new Map(),components=[];
 for(const start of sorted(active)){
  if(seen.has(start))continue;
  const q=[start],cells=[];seen.add(start);
  for(let h=0;h<q.length;h++){
   const at=q[h];cells.push(at);componentOf.set(at,components.length);
   for(const n of neighbors(coords(at))){const nk=key(n);if(active.has(nk)&&!seen.has(nk)){seen.add(nk);q.push(nk);}}
  }
  components.push({cells:cells.length,roomIds:[],hasStairInterface:false,hasElevatorInterface:false,hasOutsideSource:cells.some(k=>!footprint(k))});
 }
 const adjacentComponents=reservation=>{
  const attached=new Set();for(const k of reservation)for(const p of neighbors(coords(k))){const id=componentOf.get(key(p));if(id!==undefined)attached.add(id)}return [...attached].sort((a,b)=>a-b);
 };
 const stairComponents=adjacentComponents(stair),elevatorComponents=adjacentComponents(elevator);
 for(const i of stairComponents)components[i].hasStairInterface=true;
 for(const i of elevatorComponents)components[i].hasElevatorInterface=true;
 const ids=new Set(),rooms=[],usedDoorEdges=new Set();
 for(const port of ports){
  if(typeof port?.roomId!=='string'||!port.roomId||ids.has(port.roomId)||!inside(port.doorCell,w,d)||!inside(port.hallCell,w,d)||
    Math.abs(port.doorCell.x-port.hallCell.x)+Math.abs(port.doorCell.z-port.hallCell.z)!==1||
    port.nominalFloorY!==floor.localYRange[0]||port.doorY!==floor.localYRange[0]||
    port.doorOpeningConstructed!==false||port.wallThicknessEvidence!=='UNVERIFIED'||
    !port.schematicChecks||Object.values(port.schematicChecks).some(x=>x!==true))fail('DOOR_CONTRACT');
  ids.add(port.roomId);
  const edge=[key(port.doorCell),key(port.hallCell)].sort().join('|');if(usedDoorEdges.has(edge))fail('DUPLICATE_DOOR_EDGE');usedDoorEdges.add(edge);
  const hallKey=key(port.hallCell),doorKey=key(port.doorCell);
  if(!corridor.has(hallKey)||!footprint(doorKey))fail('DOOR_PROVENANCE');
  const cid=componentOf.get(hallKey);
  if(cid!==undefined)components[cid].roomIds.push(port.roomId);
  rooms.push({id:port.roomId,doorCell:port.doorCell,hallCell:port.hallCell,connectedToCorridor:cid!==undefined,
   connectedToNominalStair:cid!==undefined&&components[cid].hasStairInterface,componentId:cid??null});
 }
 // Corridor-only graph; degree-one cells are an indicator, not an evacuation finding.
 const deadEndCells=[];let zeroDegreeCells=0;
 for(const c of active){let degree=0;for(const p of neighbors(coords(c)))if(active.has(key(p)))degree++;
  if(degree===1)deadEndCells.push(coords(c));if(degree===0)zeroDegreeCells++;
 }
 const corridorOutsideSource=[...active].filter(k=>!footprint(k)).length;
 const graph={level:floor.level,mode,counts:{corridorCells:active.size,corridorComponents:components.length,
  isolatedCorridorCells:zeroDegreeCells,degreeOneCorridorCells:deadEndCells.length,roomNodes:rooms.length,
  roomDoorEdges:usedDoorEdges.size,roomsWithoutCorridor:rooms.filter(r=>!r.connectedToCorridor).length,
  roomsWithoutNominalStairPath:rooms.filter(r=>!r.connectedToNominalStair).length,
  stairInterfaceComponents:stairComponents.length,elevatorInterfaceComponents:elevatorComponents.length,
  corridorCellsOutsideSource:corridorOutsideSource,reviewRemovedCells:mode==='TRIM_REVIEW'?removal.size:0,
  unattendedCorridorComponents:components.filter(c=>!c.roomIds.length&&!c.hasStairInterface).length},
  components:components.map((c,i)=>({id:i,corridorCells:c.cells,roomCount:c.roomIds.length,stairAdjacent:c.hasStairInterface,elevatorAdjacent:c.hasElevatorInterface,containsOutsideSourceCells:c.hasOutsideSource})),
  rooms,deadEndCells:deadEndCells.slice(0,250),coordinateFrame:'LOCAL_CONCEPT_CELLS_ONLY',
  verdict:'SCHEMATIC_CONNECTIONS_ONLY',physicalPassabilityVerified:false,fireEgressVerified:false,stairAssemblyVerified:false,
  worldCoordinates:null,materialIds:[],actions:[],commandCount:0};
 return graph;
}
function inspectBuilding(b14,b12){
 if(b14.key!==b12.key||b14.levels.length!==6||b12.levels.length!==6||b14.vertical.nominalAlignment!==true)fail('BUILDING_PROVENANCE');
 const levels=b14.levels.map((l,i)=>{
  const old=b12.levels[i];if(old.level!==l.level||old.sourceMask!==l.sourcePredictedMask||old.originalCorridorCells.length!==l.localCorridorReservation.length||old.doorInterfaces!==l.summary.nominalDoorInterfaces)fail('FLOOR_PROVENANCE');
  const original=inspectB16Floor(l,old.nominalDoorPortEdges);
  const trimmed=inspectB16Floor(l,old.nominalDoorPortEdges,old.trimOnlyRemovedCells,'TRIM_REVIEW');
  if(original.counts.corridorCells-trimmed.counts.corridorCells!==old.trimOnlyRemovedCells.length)fail('REVIEW_INCONSISTENT');
  return {level:l.level,original,trimmed,reviewData:{dimensions:l.dimensions,sourceMask:l.sourcePredictedMask,
   corridor:l.localCorridorReservation,removed:old.trimOnlyRemovedCells,stair:l.nominalStairReservation,elevator:l.nominalElevatorReservation,
   roomPorts:old.nominalDoorPortEdges.map(p=>({roomId:p.roomId,door:p.doorCell,hall:p.hallCell}))}};
 });
 const verticalLinks=[];
 for(let i=0;i<levels.length-1;i++){
  const a=b14.levels[i],b=b14.levels[i+1];const setA=new Set(a.nominalStairReservation.map(key)),setB=new Set(b.nominalStairReservation.map(key));
  const aligned=setA.size>0&&setA.size===setB.size&&[...setA].every(k=>setB.has(k))&&a.localYRange[1]===b.localYRange[0];
  verticalLinks.push({fromLevel:a.level,toLevel:b.level,nominalStairXZAligned:aligned,
   originalCorridorAccessOnBothFloors:levels[i].original.counts.stairInterfaceComponents>0&&levels[i+1].original.counts.stairInterfaceComponents>0,
   trimmedCorridorAccessOnBothFloors:levels[i].trimmed.counts.stairInterfaceComponents>0&&levels[i+1].trimmed.counts.stairInterfaceComponents>0,
   actualStairConnectionVerified:false});
 }
 const total=(mode,k)=>levels.reduce((n,l)=>n+l[mode].counts[k],0);
 return {key:b14.key,levels,verticalLinks,summary:{roomInterfaces:total('original','roomNodes'),originalDisconnectedRooms:total('original','roomsWithoutCorridor'),
  trimmedDisconnectedRooms:total('trimmed','roomsWithoutCorridor'),originalWithoutStairPath:total('original','roomsWithoutNominalStairPath'),
  trimmedWithoutStairPath:total('trimmed','roomsWithoutNominalStairPath'),originalCorridorComponents:total('original','corridorComponents'),
  trimmedCorridorComponents:total('trimmed','corridorComponents'),originalOutsideSource:total('original','corridorCellsOutsideSource'),
  trimmedOutsideSource:total('trimmed','corridorCellsOutsideSource'),trimmedCellCount:total('trimmed','reviewRemovedCells'),
  nominalVerticalLinks:verticalLinks.filter(x=>x.nominalStairXZAligned).length,
  physicalStairLinks:0},applied:false};
}
export function buildB16Report(root){
 const b14=buildB14Report(root);validateB14Report(b14,root);
 const b12=buildB12Report(root);validateB12Report(b12,root);
 const candidates=b14.candidates.map(b=>inspectBuilding(b,b12.candidates.find(c=>c.key===b.key)));
 const total=k=>candidates.reduce((n,c)=>n+c.summary[k],0);
 const report={schema:'minecraftaibuilder-step8b-b16-connectivity-review-v1',status:'OFFLINE_SCHEMATIC_GRAPH_ONLY',
  evidence:{b14ReportSha256:b14.reportSha256,b12ReportSha256:b12.reportSha256,sourceSnapshotPinned:true,runtimeEngineVerified:false},
  totals:{buildings:5,floors:30,doorInterfaces:total('roomInterfaces'),
   originalDisconnectedRooms:total('originalDisconnectedRooms'),trimmedDisconnectedRooms:total('trimmedDisconnectedRooms'),
   originalRoomsWithoutNominalStairPath:total('originalWithoutStairPath'),trimmedRoomsWithoutNominalStairPath:total('trimmedWithoutStairPath'),
   originalCorridorComponents:total('originalCorridorComponents'),trimmedCorridorComponents:total('trimmedCorridorComponents'),
   originalCorridorOutsideSource:total('originalOutsideSource'),trimmedCorridorOutsideSource:total('trimmedOutsideSource'),
   reviewRemovedCells:total('trimmedCellCount'),nominalVerticalLinks:total('nominalVerticalLinks'),verifiedPhysicalStairLinks:0,
   existingOffice02FootprintDifference:123},
  candidates,
  limitations:['CORRIDOR_4_NEIGHBOR_SCHEMATIC_ONLY','ROOM_DOOR_PORTS_NOT_INSTALLED','STAIR_RESERVATION_ADJACENCY_NOT_BUILDABLE_STAIRS',
   'VERTICAL_XZ_ALIGNMENT_NOT_PHYSICAL_TRANSIT','DEAD_END_DEGREE_NOT_FIRE_SAFETY','NO_ACTUAL_WALL_COLLISION_OR_MATERIAL_VERIFICATION',
   'OFFICE02_FOOTPRINT_123_CELLS_UNRESOLVED','ENGINE_RUNTIME_WORLD_COORDINATES_NOT_VERIFIED'],
  physicalVerified:{roomPassages:0,doors:0,stairs:0,egress:0},approval:'NOT_REQUESTED',deploymentGate:'BLOCKED',application:'REVIEW_ONLY_NOT_APPLIED',
  safety:{notPrepared:true,executionAllowed:false,constructionApproved:false,existingWorldModified:false,legacyModified:false,frozenEvidenceModified:false,bridgeContact:false,networkAccess:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 report.reportSha256=hash(report);return report;
}
export function validateB16Report(r,root){
 if(r?.schema!=='minecraftaibuilder-step8b-b16-connectivity-review-v1'||r.status!=='OFFLINE_SCHEMATIC_GRAPH_ONLY'||
  r.deploymentGate!=='BLOCKED'||r.approval!=='NOT_REQUESTED'||r.application!=='REVIEW_ONLY_NOT_APPLIED'||
  r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan?.commandCount!==0||!Array.isArray(r.BuildPlan?.operations)||r.BuildPlan.operations.length!==0||
  r.BuildPlan.worldCoordinates!==null||r.BuildPlan.materialIds?.length!==0||
  r.safety?.notPrepared!==true||['executionAllowed','constructionApproved','existingWorldModified','legacyModified','frozenEvidenceModified','bridgeContact','networkAccess'].some(k=>r.safety[k]!==false)||
  r.evidence?.runtimeEngineVerified!==false||JSON.stringify(r.physicalVerified)!==JSON.stringify({roomPassages:0,doors:0,stairs:0,egress:0})||
  r.totals?.buildings!==5||r.totals?.floors!==30||r.totals?.doorInterfaces!==314||r.totals?.reviewRemovedCells!==18||r.totals?.existingOffice02FootprintDifference!==123||
  r.candidates?.length!==5||r.candidates.some(c=>c.applied!==false||c.levels?.length!==6||c.levels.some(l=>l.original.commandCount!==0||l.trimmed.commandCount!==0||
   l.original.physicalPassabilityVerified!==false||l.trimmed.physicalPassabilityVerified!==false||l.original.actions?.length||l.trimmed.actions?.length||l.original.worldCoordinates!==null||l.trimmed.worldCoordinates!==null||l.original.materialIds?.length||l.trimmed.materialIds?.length))
 )fail('UNSAFE_REPORT');
 const {reportSha256,...rest}=r;
 if(hash(rest)!==reportSha256||hash(buildB16Report(root))!==hash(r))fail('TAMPERED_OR_STALE_REPORT');return true;
}

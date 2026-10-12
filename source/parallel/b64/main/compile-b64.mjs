/** B64: room-rectangle owner map from pinned Step8A concept reviews; never a physical-room assertion. */
import {createHash} from 'node:crypto';
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const bad=x=>{throw Error('B64_'+x)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const key=p=>`${p.x},${p.z}`;
const check=(o,name,kind='reportSha256')=>{
 if(!o||typeof o!=='object'||Array.isArray(o))bad(name+'_OBJECT');
 if(kind&&sha(Object.fromEntries(Object.entries(o).filter(([k])=>k!==kind)))!==o[kind])bad(name+'_DIGEST');
 if(o.BuildPlan?.status!=='NOT_PREPARED'||!Array.isArray(o.BuildPlan.operations)||o.BuildPlan.operations.length||o.BuildPlan.commandCount!==0)bad(name+'_BUILDPLAN');
 if(o.executionAllowed===true||o.constructionApproved===true||o.safety?.executionAllowed===true||o.safety?.constructionApproved===true)bad(name+'_EXECUTION');
};
const regularInt=n=>Number.isSafeInteger(n);
function cells(pts,w,d,id){
 if(!Array.isArray(pts))bad('CELLS_'+id);
 const s=new Set();for(const p of pts){if(!regularInt(p?.x)||!regularInt(p?.z)||p.x<0||p.z<0||p.x>=w||p.z>=d||s.has(key(p)))bad('CELL_'+id);s.add(key(p));}
 return s;
}
function ownerMap(layer,w,d){
 const owner=new Map(),rooms=[],ids=new Set(),portIds=new Set();
 for(const r of layer.rooms){
  if(typeof r.id!=='string'||ids.has(r.id)||r.level!==layer.level||![r.x,r.z,r.width,r.depth].every(regularInt)||r.x<0||r.z<0||r.width<=0||r.depth<=0||r.x+r.width>w||r.z+r.depth>d||
   r.wallThicknessUnverified!==true||r.interiorAndFurnitureDesigned!==false)bad('ROOM_GEOMETRY');
  ids.add(r.id);rooms.push({id:r.id,role:r.role,x:r.x,z:r.z,width:r.width,depth:r.depth,doorCell:{x:r.door.x,z:r.door.z},hallCell:{x:r.door.hallX,z:r.door.hallZ}});
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
   const p=key({x,z});if(owner.has(p))bad('ROOM_OVERLAP');owner.set(p,r.id);
  }
  if(!(r.door.x>=r.x&&r.door.x<r.x+r.width&&r.door.z>=r.z&&r.door.z<r.z+r.depth))bad('DOOR_OUTSIDE_ROOM');
  if(portIds.has(key(r.door)))bad('DUPLICATE_DOOR');portIds.add(key(r.door));
 }
 return {owner,rooms,ids};
}
function boundsGap(p,r){const x=p.x+.5,z=p.z+.5;return Math.hypot(Math.max(r.x-x,0,x-(r.x+r.width)),Math.max(r.z-z,0,z-(r.z+r.depth)));}
function classify(p,f,owner){const v=key(p);return owner.has(v)?'CONCEPT_ROOM':f.corridor.has(v)?'EXISTING_CORRIDOR':f.stair.has(v)?'NOMINAL_STAIR':f.lift.has(v)?'NOMINAL_ELEVATOR':f.mask.has(v)?'UNASSIGNED_CONCEPT_FLOOR':'OUTSIDE_FROZEN_FLOOR';}
export function compileB64(b63,b17,b10,reviews){
 check(b63,'B63');check(b17,'B17');check(b10,'B10');
 if(b63.schema!=='minecraftaibuilder-b63-hypothetical-wall-width-review-v1'||b63.readiness!=='NOT_PREPARED'||b63.deployment!=='BLOCKED'||b63.productionFacadeParity!=='UNVERIFIED'||
 b63.gates?.length!==9||b63.gates.some(g=>g.status!=='BLOCKED')||b63.scans!==0||b63.worldContacts!==0||b63.engineCalls!==0||
 b17.schema!=='minecraftaibuilder-step8b-b17-interior-ir-v1'||b17.physicalValidated!==false||b17.deploymentGate!=='BLOCKED'||b17.safety?.notPrepared!==true||
 b10.schema!=='minecraftaibuilder-step8b-b10-interior-contract-v1'||b10.status!=='STATIC_REVIEW_ONLY_NOT_PREPARED'||
 b63.alternatives?.length!==3||!same(b63.alternatives.map(a=>a.cellCount),[3,4,5]))bad('SOURCE_SCOPE');
 if(!reviews||Object.keys(reviews).sort().join(',')!=='apartment,hotel,office')bad('REVIEW_SCOPE');
 const b10ById=new Map(b10.frozenBuildings.map(b=>[b.key,b]));
 const b17ById=new Map(b17.buildings.map(b=>[b.id,b]));
 const buildings=[];const ownersByFloor=new Map();let roomCellsTotal=0,roomCount=0,sourceConceptDifferenceCells=0,totals={roomOverlapCells:0,roomCorridorOverlapCells:0,roomStairOverlapCells:0,roomElevatorOverlapCells:0,roomOutsideFootprintCells:0,doorMappingsVerified:0};
 for(const program of ['hotel','apartment','office']){
  const review=reviews[program];
  if(review.status==='READY'||review.safety?.notPrepared!==true||review.safety?.constructionApproved!==false||review.safety?.executionAllowed!==false||review.BuildPlan?.status!=='NOT_PREPARED'||review.BuildPlan.operations.length)bad('UNSAFE_REVIEW');
  const expected=program==='office'?3:1;
  if(!Array.isArray(review.candidates)||review.candidates.length!==expected)bad('REVIEW_COUNT');
  for(const c of review.candidates){
   const id=program+'/'+c.id,b10c=b10ById.get(id),b17c=b17ById.get(id),layers=c.detail?.roomsAndCorridors?.floors;
   if(!b10c||!b17c||!Array.isArray(layers)||layers.length!==6||b10c.levels.length!==6||b17c.floors.length!==6||b17c.id!==id||!same(c.concept.BuildPlan.operations,[])||c.concept.BuildPlan.status!=='NOT_PREPARED')bad('CANDIDATE');
   const w=b10c.dimensions.width,d=b10c.dimensions.depth;
   if(b17c.dimensions.width!==w||b17c.dimensions.depth!==d)bad('DIMENSIONS');
   const floors=[];
   for(let i=0;i<6;i++){
    const layer=layers[i],b10f=b10c.levels[i],b17f=b17c.floors[i];
    if(layer.level!==i+1||b10f.level!==i+1||b17f.level!==i+1||b17f.id!==id+'/L'+(i+1)||layer.partitionDisjoint!==true||layer.areaConserved!==true)bad('LEVEL');
    const m=b10f.masks.source;if(typeof m!=='string'||m.length!==w*d||!/^[01]+$/.test(m))bad('MASK');
    const mask=new Set();for(let z=0;z<d;z++)for(let x=0;x<w;x++)if(m[z*w+x]==='1')mask.add(`${x},${z}`);
    const {owner,rooms}=ownerMap(layer,w,d);
    const corridor=cells(layer.corridorCells,w,d,'CORRIDOR'),stair=cells(layer.coreStairCells,w,d,'STAIR'),lift=cells(layer.elevatorCells,w,d,'ELEVATOR');
    if(!same([...corridor].sort(),[...cells(b17f.corridorReservation,w,d,'B17_CORRIDOR')].sort())||
       !same([...stair].sort(),[...cells(b17f.stairReservation,w,d,'B17_STAIR')].sort())||
       !same([...lift].sort(),[...cells(b17f.elevatorReservation,w,d,'B17_ELEVATOR')].sort()))bad('B17_PARITY');
    const doorMap=new Map(b17f.roomDoorInterfaces.map(v=>[v.roomId,v]));
    if(doorMap.size!==rooms.length||b17f.roomDoorInterfaces.length!==rooms.length)bad('DOOR_COUNT');
    for(const r of rooms){
     const v=doorMap.get(r.id);if(!v||!same(v.doorCell,r.doorCell)||!same(v.hallCell,r.hallCell)||v.openingPhysicalVerified!==false)bad('DOOR_PARITY');
     totals.doorMappingsVerified++;
    }
    for(const p of owner.keys()){
     if(!mask.has(p))totals.roomOutsideFootprintCells++;
     if(corridor.has(p))totals.roomCorridorOverlapCells++;
     if(stair.has(p))totals.roomStairOverlapCells++;
     if(lift.has(p))totals.roomElevatorOverlapCells++;
    }
    if(owner.size!==layer.roomArea||rooms.length!==layer.roomCount||mask.size!==b10f.sourceArea||b10f.conceptArea!==layer.footprintArea||owner.size+stair.size+lift.size+corridor.size+layer.unassignedCells!==layer.footprintArea)bad('AREA_PARITY_'+id+'_L'+(i+1));
    sourceConceptDifferenceCells+=b10f.conceptOnlyCells+b10f.sourceOnlyCells;
    roomCellsTotal+=owner.size;roomCount+=rooms.length;
    const frame={width:w,depth:d,mask,corridor,stair,lift,owner,rooms};ownersByFloor.set(id+'/L'+(i+1),frame);
    floors.push({level:i+1,width:w,depth:d,maskRows:Array.from({length:d},(_,z)=>m.slice(z*w,(z+1)*w)),rooms,
     conceptRoomCount:rooms.length,conceptRoomCells:owner.size,originalCorridorCells:corridor.size,stairReservedCells:stair.size,liftReservedCells:lift.size,
     corridorCells:layer.corridorCells,stairCells:layer.coreStairCells,elevatorCells:layer.elevatorCells,
     unassignedConceptFloorCells:layer.unassignedCells,doorInterfacesConceptOnly:true});
   }
   buildings.push({id,program,floors});
  }
 }
 if(buildings.length!==5||sourceConceptDifferenceCells!==123||roomCount!==314||roomCellsTotal!==6462||Object.values(totals).some((v,i)=>i<5&&v!==0)||totals.doorMappingsVerified!==314)bad('CORPUS_METRICS');
 const ap=ownersByFloor.get('apartment/candidate-01/L1');
 const alternatives=b63.alternatives.map(a=>{
  if(a.approved!==false||a.emittable!==false||a.roomOccupancy!=='UNKNOWN'||a.perCellReview.length!==a.cellCount)bad('B63_SCOPE');
  const perCell=a.perCellReview.map(t=>{
   const p=t.cell,k=key(p),category=classify(p,ap,ap.owner);
   const nearest=ap.rooms.map(r=>({roomId:r.id,centerToConceptRoomRectangle:Math.round(boundsGap(p,r)*1e6)/1e6})).sort((v,w)=>v.centerToConceptRoomRectangle-w.centerToConceptRoomRectangle||v.roomId.localeCompare(w.roomId));
   const neighborIds=[...new Set([{x:p.x+1,z:p.z},{x:p.x-1,z:p.z},{x:p.x,z:p.z+1},{x:p.x,z:p.z-1}].map(q=>ap.owner.get(key(q))).filter(Boolean))].sort();
   return {cell:p,conceptualOccupancy:category,conceptRoomOwner:ap.owner.get(k)||null,adjacentConceptRoomIds:neighborIds,nearestConceptRoom:nearest[0]};
  });
  const categories={};for(const x of perCell)categories[x.conceptualOccupancy]=(categories[x.conceptualOccupancy]||0)+1;
  return {id:a.id,addedCells:a.cellCount,conceptualRoomOverlapCells:perCell.filter(x=>x.conceptualOccupancy==='CONCEPT_ROOM').length,
   sourceConceptRoomFootprintVerified:true,productionRoomOccupancyVerified:false,realRoomInterferenceVerified:false,
   sourceConceptFloorMaskVerified:true,cellClassification:categories,perCell,
   nominalElevatorConflictAtWidth1:a.wallModelProfiles.find(p=>p.hypotheticalCenteredWidth===1)?.nominalElevatorOverlapCells.length,
   nominalStairConflictAtWidth1:a.wallModelProfiles.find(p=>p.hypotheticalCenteredWidth===1)?.nominalStairOverlapCells.length,
   realDoorAndStairClearanceVerified:false,approved:false,emittable:false};
 });
 if(alternatives[2].conceptualRoomOverlapCells!==0||alternatives[2].cellClassification.UNASSIGNED_CONCEPT_FLOOR!==5||alternatives[2].nominalElevatorConflictAtWidth1!==0||alternatives[2].nominalStairConflictAtWidth1!==0)bad('ROUTE_EXPECTATION');
 const body={schema:'minecraftaibuilder-b64-concept-room-footprints-v1',kind:'OFFLINE_CONCEPT_ROOM_OWNERSHIP_NOT_PRODUCTION',
 provenance:{b63Sha256:b63.reportSha256,b17Sha256:b17.reportSha256,b10Sha256:b10.reportSha256,
  samples:['apartment','hotel','office'].map(p=>({program:p,sourceReviewSha256:reviews[p].reviewSha256}))},
 scope:{buildings:5,floors:30,rooms:roomCount,uniqueConceptRoomFootprintCells:roomCellsTotal,sourceConceptFootprintDifferenceCells:sourceConceptDifferenceCells,...totals},
 buildings,alternatives,
 findings:{fiveCellStep8AConceptRoomOverlaps:0,fiveCellUnassignedConceptFloorCells:5,
 fiveCellRealRoomOverlap:'UNVERIFIED',B42UpperDoorsUnresolved:60,B43ConceptualChangesApproved:false,
 productionEngineSourceAvailable:false,sourceConceptFootprintNotEquivalentToMinecraftBlockOccupancy:true},
 blockers:['PRODUCTION_ROOM_GEOMETRY_NOT_VERIFIED','STEP8A_CONCEPTUAL_ROOM_RECTANGLES_ONLY',
 'ACTUAL_BLOCK_WIDTH_HEADROOM_AND_ELEVATOR_CLEARANCE_UNVERIFIED','B43_LAYOUT_CHANGES_NOT_APPROVED',
 'PRODUCTION_FACADE_ENGINE_SOURCE_NOT_AVAILABLE'],
 readiness:'NOT_PREPARED',deployment:'BLOCKED',executionAllowed:false,constructionApproved:false,
 productionFacadeParity:'UNVERIFIED',physicalQuality:'UNKNOWN',engineCalls:0,scans:0,worldContacts:0,
 gates:b63.gates.map(g=>({...g})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:sha(body)};
}
export function verifyB64(r,...args){check(r,'B64');if(!same(r,compileB64(...args))||r.gates.length!==9||r.gates.some(x=>x.status!=='BLOCKED')||r.BuildPlan.operations.length!==0)bad('REPLAY');return true;}

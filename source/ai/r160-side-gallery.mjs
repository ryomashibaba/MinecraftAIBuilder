/**
 * R160. A genuinely non-central shared gallery with three usable rooms on
 * one side. Caller/model chooses either west or east gallery. All B143 doors
 * and supported 2-wide source routes are audited before returning source.
 *
 * No fixed genre, no LLM inference, no world connection or construction.
 * Four-room and incompatible relation graphs fail closed, never reduced.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes}
 from './r125-source-routes.mjs';
import {validateR139RoomRelations}
 from './r139-room-relations.mjs';

export const R160_SIDES=Object.freeze(['west-gallery','east-gallery']);
const fail=s=>{throw Error('R160_GALLERY_'+s);};
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const key=(x,y,z)=>[x,y,z].join(',');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const minDepth=7;
const boxes=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
function roomSegments(depth,weights){
 const roomCount=weights.length,available=depth-4-(roomCount-1);
 if(available<roomCount*minDepth)fail('NOT_ENOUGH_SUPPORTED_ROOM_DEPTH');
 let slots=weights.map(()=>minDepth);
 const left=available-roomCount*minDepth;
 for(let i=0;i<left;i++){
  let candidate=0,rank=-Infinity;
  for(let j=0;j<roomCount;j++){
   const score=weights[j]/(slots[j]-minDepth+1);
   if(score>rank){rank=score;candidate=j;}
  }
  slots[candidate]++;
 }
 let next=2;
 return slots.map((len,i)=>{const z=[next,next+len-1];next+=len+(i<roomCount-1?1:0);return z});
}
export function deriveR160SideGalleryTopology(base,intent,{gallerySide='west-gallery'}={}){
 if(!R160_SIDES.includes(gallerySide))fail('INVALID_SIDE');
 validateR139RoomRelations(base,intent);
 if(base?.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
  base?.spatialIRSchema!=='minecraftaibuilder-r134-multi-zone-program-v1'||
  !verifyCompiled(base.design,base.compiled)||
  base.sourceSha256!==base.compiled.sourceSha256||
  base.geometrySha256!==base.compiled.geometrySha256||
  base.program?.length!==1||base.plan.layout?.axis!=='z')
  fail('VERIFIED_Z_SOURCE_REQUIRED');
 const {width:w,depth:d}=base.plan.footprint;
 const zones=base.program[0].zones;
 if(zones.length!==3)fail('THREE_ROOMS_REQUIRED_NOT_SILENTLY_REDUCED');
 if(w<26||w>32||d<27||d>32)fail('ROOM_AND_GALLERY_BOUNDS');
 if(intent.directAdjacencies.length!==1)
  fail('ONE_PHYSICAL_DIRECT_PAIR_REQUIRED');
 const pairs=intent.directAdjacencies[0];
 const byId=new Map(zones.map(z=>[z.id,z]));
 const entryId=intent.entryFacingZoneId;
 const remaining=zones.map(z=>z.id).filter(id=>id!==entryId);
 if(pairs.includes(entryId)){
  const other=pairs.find(id=>id!==entryId);
  remaining.sort((a,b)=>Number(b===other)-Number(a===other));
 }
 const order=[entryId,...remaining];
 const wallX=gallerySide==='west-gallery'?7:w-8;
 const galleryX=gallerySide==='west-gallery'?[2,wallX-1]:[wallX+1,w-3];
 const roomsX=gallerySide==='west-gallery'?[wallX+1,w-3]:[2,wallX-1];
 const xs=roomsX[1]-roomsX[0]+1;
 if(xs<14||galleryX[1]-galleryX[0]+1<4)
  fail('GALLERY_OR_INHABITED_WIDTH');
 const spans=roomSegments(d,order.map(id=>byId.get(id).relativeWeight));
 const roomSources=order.map((id,i)=>({
  ...structuredClone(byId.get(id)),
  range:{x:[...roomsX],z:[...spans[i]]},
  physicalSector:['front-gallery-room','middle-gallery-room','rear-gallery-room'][i],
  actualSourceRoomRangeDerivedByHost:true
 }));
 const design=structuredClone(base.design);
 const originalPlan=JSON.stringify(base.plan);
 const originalDesign=JSON.stringify(base.design);
 design.elements=design.elements.filter(e=>
  !e.id.startsWith('zone-divider-')&&!e.id.startsWith('zone-door-'));
 const wall=base.plan.materials.wall;
 const add=(id,mode,origin,size)=>design.elements.push(
  boxes(id,mode,origin,size,wall));
 add('r160-single-gallery-wall','add',[wallX,2,2],[1,4,d-4]);
 const doors=[];
 for(let i=0;i<roomSources.length;i++){
  const z=spans[i],cutZ=Math.floor((z[0]+z[1])/2)-1;
  add('r160-gallery-room-door-'+i,'cut',[wallX,2,cutZ],[1,3,2]);
  doors.push({id:'r160-gallery-room-door-'+i,zoneId:order[i],
   wallX,cutZ,twoZWideOpening:true,connectsToSideGallery:true});
 }
 const partitions=[];
 for(let i=0;i<roomSources.length-1;i++){
  const z=spans[i][1]+1;
  add('r160-room-partition-'+i,'add',[roomsX[0],2,z],[xs,4,1]);
  partitions.push(z);
 }
 const pairA=order.indexOf(pairs[0]),pairB=order.indexOf(pairs[1]);
 if(Math.abs(pairA-pairB)!==1)
  fail('DIRECT_PAIR_NOT_PHYSICALLY_ADJACENT');
 const directZ=partitions[Math.min(pairA,pairB)];
 const directX=Math.floor((roomsX[0]+roomsX[1])/2)-1;
 add('r160-direct-room-door','cut',[directX,2,directZ],[2,3,1]);
 // Move the actual exterior threshold into the selected front room.
 const entry=design.elements.find(e=>e.id==='exterior-entrance');
 if(!entry||entry.mode!=='cut'||entry.shape!=='box'||entry.size[0]!==2)
  fail('EXTERIOR_ENTRANCE_NOT_FOUND');
 const glazing=design.elements.filter(e=>
  e.id==='window-front-glass'&&e.mode==='add');
 const mid=(roomsX[0]+roomsX[1])/2;
 const doorXs=Array.from({length:xs-1},(_,i)=>roomsX[0]+i)
  .sort((a,b)=>Math.abs(a+.5-mid)-Math.abs(b+.5-mid)||a-b);
 const overlap=(e,x,z)=>e.mode==='add'&&e.shape==='box'&&
  e.origin[2]<=z&&z<e.origin[2]+e.size[2]&&
  e.origin[1]<=4&&e.origin[1]+e.size[1]>2&&
  e.origin[0]<=x+1&&e.origin[0]+e.size[0]>x;
 const doorwayX=doorXs.find(x=>
  !glazing.some(e=>x<=e.origin[0]+e.size[0]-1&&
   x+1>=e.origin[0])&&
  !design.elements.some(e=>overlap(e,x,0)));
 if(doorwayX===undefined)fail('ENTRANCE_WITHOUT_FACADE_CLEARANCE');
 entry.origin=[doorwayX,2,1];
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_COMPILE_MISMATCH');
 const solids=new Set(compiled.primitives.map(p=>key(...p.slice(0,3))));
 const has=(x,y,z)=>solids.has(key(x,y,z));
 const entryRoom=roomSources[0];
 for(let dx=0;dx<2;dx++){
  const x=doorwayX+dx;
  if(!has(x,1,2)||has(x,2,1)||has(x,3,1)||has(x,4,1)||
   has(x,2,2)||has(x,3,2)||has(x,4,2)||
   x<entryRoom.range.x[0]||x>entryRoom.range.x[1])
   fail('FRONT_ROOM_EXTERIOR_THRESHOLD_NOT_REAL');
 }
 for(const z of partitions){
  if(z!==directZ)continue;
  for(let dx=0;dx<2;dx++)for(let dz=-1;dz<=1;dz++){
   const x=directX+dx,zz=z+dz;
   if(!has(x,1,zz))fail('DIRECT_DOOR_FLOOR_NOT_SUPPORTED');
   for(let y=2;y<=4;y++)if(has(x,y,zz))
    fail('DIRECT_DOOR_NOT_CLEAR');
  }
 }
 const program=[{
  ...structuredClone(base.program[0]),splitAxis:'side-gallery-3-real-rooms',
  partitionCount:2,centralSharedSpine:null,
  sharedSideGallery:{side:gallerySide,range:{x:galleryX,z:[2,d-3]},
   standingFloorY:2},
  zones:roomSources
 }];
 const source={...base,design,compiled,program,
  parentSourceSha256:base.sourceSha256,
  parentGeometrySha256:base.geometrySha256,
  parentPlanSha256:base.planSha256,
  planSha256:sha({basePlanSha256:base.planSha256,
   variant:'r160-side-gallery',side:gallerySide,order,
   zones:roomSources.map(z=>({id:z.id,range:z.range})),
   directPair:[...pairs].sort()}),
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  relationIRSchema:intent.schema,relationIntent:structuredClone(intent),
  relationIntentSha256:sha(intent),zoneDoorEvidence:doors,
  directAdjacencyDoorEvidence:[{id:'r160-direct-room-door',
   zoneA:pairs[0],zoneB:pairs[1],origin:[directX,2,directZ],
   size:[2,3,1],directNotViaSharedSideGallery:true}],
  entryFacingZoneEvidence:{zoneId:entryId,
   physicalSector:'front-gallery-room',
   exteriorOpeningOrigin:[doorwayX,2,1],exteriorOpeningSize:[2,3,1],
   exteriorEntranceDirectlyOpensIntoSelectedRoom:true,
   externalTerrainUnverified:true},
  topologyProvenance:'HOST_COMPILED_FROM_EXPLICIT_MODEL_SIDE_GALLERY_INTENT',
  modelSelectedRelationsAuthenticated:false,modelAuthorship:
   'CALLER_SUPPLIED_RELATIONS_NOT_PROVEN_LLM;HOST_GEOMETRY',
  architecturalQuality:'NOT_REVIEWED',aestheticApproved:false,
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
  inGameWalking:'NOT_TESTED',actualPlayerMovementCertified:false};
 const routes=auditR125SourceRoutes(source);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==3||
  !routes.zones.every(z=>z.reachedFromEntrance&&z.reachedTwoWidePadCount>0))
  fail('GALLERY_PHYSICAL_SOURCE_ROUTES_NOT_REAL');
 if(!same(JSON.stringify(base.plan),originalPlan)||
  !same(JSON.stringify(base.design),originalDesign))
  fail('ORIGINAL_BASE_MUTATED');
 return {...source,sourceRouteAudit:routes,
  directAdjacencyVerifiedBySourceDoorVoxels:true,
  r160TopologyEvidence:{side:gallerySide,actualGalleryX:galleryX,
   realRoomRanges:roomSources.map(z=>({id:z.id,range:z.range})),
   actualDirectPair:[...pairs],directDoorZ:directZ,
   comparedToCenterSpine:'NON_CENTRAL_CORRIDOR_ON_ONE_SIDE',
   allThreeRoomsSourceReachable:true,realMinecraftWalking:'NOT_TESTED',
   humanArtReview:'NOT_REVIEWED',constructionPermission:'BLOCKED'},
  zoneLayoutShape:'R160_ONE_SIDE_SHARED_GALLERY_THREE_ROOMS_REAL_3D'};
}

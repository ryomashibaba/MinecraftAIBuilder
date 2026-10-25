/**
 * R139: caller/model-selected spatial intent -> genuine B143 doors and
 * room assignment. No inference from room-purpose words or genre dispatch.
 *
 * Bounded first graph compiler: entry-facing zone and up to two DIRECT
 * adjacency links between rooms on a shared wing. Unrealizable graphs HOLD;
 * reachability through the common spine is NOT mislabelled direct adjacency.
 * Reuses R134 shell, R138 branch wings, R125 route proof and R130 furniture.
 * This program never issues Minecraft commands or lifts safety gates.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
import {deriveR138BranchedTopology} from './r138-branching-topology.mjs';

export const SCHEMA='minecraftaibuilder-r139-room-relations-v1';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=x=>{throw Error('R139_RELATIONS_'+x);};
const exact=(o,fields)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===fields.length&&fields.every(k=>Object.hasOwn(o,k));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const perms=a=>a.length===0?[[]]:a.flatMap((v,i)=>
 perms(a.filter((_,j)=>j!==i)).map(t=>[v,...t]));
const physicalPair=(a,b)=>
 (a==='front-left'&&b==='rear-left')||
 (a==='rear-left'&&b==='front-left')||
 (a==='front-right'&&b==='rear-right')||
 (a==='rear-right'&&b==='front-right');

export function validateR139RoomRelations(base,intent){
 if(!base?.planSha256||!Array.isArray(base.program)||base.program.length!==1||
  !exact(intent,['schema','basePlanSha256','entryFacingZoneId','directAdjacencies'])||
  intent.schema!==SCHEMA||intent.basePlanSha256!==base.planSha256||
  !Array.isArray(intent.directAdjacencies)||
  intent.directAdjacencies.length>2)
  fail('CONTRACT_OR_BASE_PIN');
 const zones=base.program[0].zones;
 const ids=new Set(zones.map(z=>z.id));
 if(ids.size!==zones.length||![3,4].includes(ids.size)||
  !ids.has(intent.entryFacingZoneId))
  fail('INVALID_ENTRY_ZONE');
 const used=new Set();
 for(const pair of intent.directAdjacencies){
  if(!Array.isArray(pair)||pair.length!==2||
   pair[0]===pair[1]||!ids.has(pair[0])||!ids.has(pair[1]))
   fail('INVALID_DIRECT_PAIR');
  // This first bounded compiler supports disjoint direct adjacency pairs.
  // Shared-node chains need a richer geometry layout, never silently relax.
  if(used.has(pair[0])||used.has(pair[1]))
   fail('GRAPH_REQUIRES_RICHER_GEOMETRY');
  used.add(pair[0]);used.add(pair[1]);
 }
 if(zones.length===3&&intent.directAdjacencies.length>1)
  fail('GRAPH_REQUIRES_RICHER_GEOMETRY');
 return true;
}

export function deriveR139RelationalTopology(base,intent){
 validateR139RoomRelations(base,intent);
 const originalPlan=JSON.stringify(base.plan);
 const originalDesign=JSON.stringify(base.design);
 const branched=deriveR138BranchedTopology(base);
 const sourceZones=new Map(base.program[0].zones.map(z=>[z.id,z]));
 const sectors=branched.program[0].zones;
 const zoneIds=base.program[0].zones.map(z=>z.id);
 const valid=perms(zoneIds).filter(ids=>{
  const placement=new Map(ids.map((id,i)=>[id,sectors[i].physicalSector]));
  return ['front-left','front-right','whole-right'].includes(
   placement.get(intent.entryFacingZoneId))&&
   intent.directAdjacencies.every(([a,b])=>
    physicalPair(placement.get(a),placement.get(b)));
 });
 if(!valid.length)fail('GRAPH_CANNOT_FIT_BOUNDED_LAYOUT');
 // Keep the original room ordering when possible; deterministic and
 // entirely independent of the semantic meaning of room names.
 valid.sort((a,b)=>{
  const cost=ids=>ids.reduce((s,id,i)=>s+(zoneIds[i]===id?0:1),0);
  return cost(a)-cost(b)||a.join('|').localeCompare(b.join('|'));
 });
 const assignment=valid[0];
 const program=structuredClone(branched.program);
 program[0].zones=sectors.map((sector,i)=>({
  ...structuredClone(sourceZones.get(assignment[i])),
  range:structuredClone(sector.range),
  physicalSector:sector.physicalSector,
  actualSourceRoomRangeDerivedByHost:true
 }));
 const byId=new Map(program[0].zones.map(z=>[z.id,z]));
 const design=structuredClone(branched.design);
 const {width:w,depth:d}=base.plan.footprint;
 // R142: "entrance-facing" must mean a REAL exterior threshold into the
 // chosen model room, not merely a front-row label. The old R138 central
 // spine entrance is replaced (not left as an invisible second entrance).
 const entryZone=byId.get(intent.entryFacingZoneId);
 const entryRange=entryZone.range;
 const exteriorDoor=design.elements.find(e=>e.id==='exterior-entrance');
 const frontGlazing=design.elements.filter(e=>
  e.id==='window-front-glass'&&e.mode==='add');
 const centerX=(entryRange.x[0]+entryRange.x[1])/2;
 const candidates=Array.from({length:entryRange.x[1]-entryRange.x[0]},
  (_,i)=>entryRange.x[0]+i).sort((a,b)=>
  Math.abs(a+.5-centerX)-Math.abs(b+.5-centerX)||a-b);
 const overlaps=(x,e,z)=>e.mode==='add'&&e.shape==='box'&&
  e.origin[2]<=z&&z<e.origin[2]+e.size[2]&&
  e.origin[1]<=4&&e.origin[1]+e.size[1]>2&&
  e.origin[0]<=x+1&&e.origin[0]+e.size[0]>x;
 // Façade fins at z=0 must not cross a doorway even when the inner
 // threshold has perfect source clearance. This is source geometry, not
 // an assumption about the unknown exterior terrain.
 const entryX=candidates.find(x=>
  !frontGlazing.some(e=>x<=e.origin[0]+e.size[0]-1&&
   x+1>=e.origin[0])&&
  !design.elements.some(e=>overlaps(x,e,0)));
 if(!exteriorDoor||exteriorDoor.shape!=='box'||
  exteriorDoor.mode!=='cut'||exteriorDoor.size[0]!==2||
  exteriorDoor.size[1]<3||exteriorDoor.size[2]!==1||
  entryRange.z[0]!==2||entryX===undefined)
  fail('REAL_ROOM_ENTRANCE_CANNOT_FIT_WITHOUT_FACADE_CONFLICT');
 exteriorDoor.origin=[entryX,2,1];
 const divider=Math.floor(d/2);
 const doors=[];
 for(const [i,[a,b]] of intent.directAdjacencies.entries()){
  const za=byId.get(a),zb=byId.get(b);
  if(!physicalPair(za.physicalSector,zb.physicalSector))
   fail('DIRECT_LINK_MISPLACED');
  const front=za.physicalSector.startsWith('front')?za:zb;
  const rear=front===za?zb:za;
  const x=front.range.x[0]+1;
  if(x+1>front.range.x[1]||x<2||x+1>=w-2)
   fail('DIRECT_OPENING_WITHOUT_TWO_WIDTH');
  const id='r139-direct-room-door-'+i;
  design.elements.push({id,shape:'box',mode:'cut',
   origin:[x,2,divider],size:[2,3,1]});
  doors.push({id,zoneA:a,zoneB:b,frontZoneId:front.id,
   rearZoneId:rear.id,origin:[x,2,divider],size:[2,3,1],
   directNotViaCommonSpine:true});
 }
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_SOURCE_MISMATCH');
 const blocks=new Set(compiled.primitives.map(p=>p.slice(0,3).join(',')));
 const has=(x,y,z)=>blocks.has([x,y,z].join(','));
 // The source doorway is cut into the physically selected room's FRONT
 // perimeter, with continuous supported clear interior threshold.
 const entrance=design.elements.find(e=>e.id==='exterior-entrance');
 for(let dx=0;dx<2;dx++){
  const x=entryX+dx;
  if(!has(x,1,2)||has(x,2,1)||has(x,3,1)||has(x,4,1)||
   has(x,2,2)||has(x,3,2)||has(x,4,2)||
   x<entryRange.x[0]||x>entryRange.x[1])
   fail('SELECTED_ROOM_ENTRANCE_BLOCKED_OR_UNSUPPORTED');
 }
 for(const door of doors){
  const [x,,z]=door.origin;
  for(let dx=0;dx<2;dx++)for(const dz of [-1,0,1]){
   if(!has(x+dx,1,z+dz))fail('DIRECT_DOOR_FLOOR_UNSUPPORTED');
   for(let y=2;y<=4;y++)
    if(has(x+dx,y,z+dz))fail('DIRECT_DOOR_PHYSICALLY_BLOCKED');
  }
 }
 const result={
  ...branched,design,compiled,program,
  relationIRSchema:SCHEMA,
  relationIntent:structuredClone(intent),
  relationIntentSha256:hash(intent),
  parentBranchedSourceSha256:branched.sourceSha256,
  parentBranchedGeometrySha256:branched.geometrySha256,
  originalSourceSha256:base.sourceSha256,
  originalGeometrySha256:base.geometrySha256,
  originalPlanSha256:base.planSha256,
  planSha256:hash({basePlanSha256:base.planSha256,
   spatialIntent:intent,roomSectorAssignment:assignment}),
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  zoneDoorEvidence:branched.zoneDoorEvidence.map((door,i)=>({
   ...door,zoneId:assignment[i]})),
  directAdjacencyDoorEvidence:doors,
  entryFacingZoneEvidence:{
   zoneId:intent.entryFacingZoneId,
   physicalSector:entryZone.physicalSector,
   exteriorOpeningOrigin:[...entrance.origin],
   exteriorOpeningSize:[...entrance.size],
   chosenZoneActualRange:structuredClone(entryRange),
   exteriorEntranceDirectlyOpensIntoSelectedRoom:true,
   interiorThresholdSupportedAndClearInB143Source:true,
   externalTerrainUnverified:true
  },
  modelAuthorship:'CALLER_SUPPLIED_RELATIONS_NOT_PROVEN_LLM;HOST_GEOMETRY',
  topologyProvenance:'HOST_COMPILED_FROM_EXPLICIT_RELATIONS',
  modelSelectedRelationsAuthenticated:false,
  originalQwenRoomIntentUnmodified:zoneIds.every(id=>
   byId.get(id).purpose===sourceZones.get(id).purpose&&
   byId.get(id).relativeWeight===sourceZones.get(id).relativeWeight),
  worldWrites:0,worldContacts:0,
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},
  inGameWalking:'NOT_TESTED',actualPlayerMovementCertified:false,
  architecturalQuality:'NOT_REVIEWED',aestheticApproved:false
 };
 const route=auditR125SourceRoutes(result);
 if(route.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !route.zones.every(z=>z.reachedFromEntrance&&
   z.reachedTwoWidePadCount>0))
  fail('SOURCE_ROUTES_REGRESSED');
 if(JSON.stringify(base.plan)!==originalPlan||
  JSON.stringify(base.design)!==originalDesign||
  !same(zoneIds.slice().sort(),program[0].zones.map(z=>z.id).sort()))
  fail('ORIGINAL_PROGRAM_CHANGED');
 return {...result,sourceRouteAudit:route,
  directAdjacencyVerifiedBySourceDoorVoxels:true,
  zoneLayoutShape:'R139_MODEL_SELECTABLE_ROOM_GRAPH_BOUNDED_WINGS'};
}

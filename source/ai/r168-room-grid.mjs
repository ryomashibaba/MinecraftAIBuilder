/**
 * R168 research-only: four actual room quadrants with DIRECT shared-wall
 * doors, including two model-requested edges sharing the same room.
 * Adds the minimum explicitly HOST-selected circulation links required to
 * reach every room. No class/genre switch, room deletion, fake direct link,
 * model calls, Minecraft IO, or build approvals.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
import {SCHEMA as R139} from './r139-room-relations.mjs';
const err=x=>{throw Error('R168_GRID_'+x);};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const idPair=(a,b)=>[a,b].sort().join('|');
const sectors=['front-left','front-right','rear-left','rear-right'];
const links=[[0,1],[0,2],[1,3],[2,3]];
function permutations(xs){
 if(!xs.length)return [[]];
 return xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(ys=>[x,...ys]));
}
export function deriveR168RoomGridTopology(base,intent){
 if(base?.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
  !verifyCompiled(base.design,base.compiled)||
  base.sourceSha256!==base.compiled.sourceSha256||
  base.geometrySha256!==base.compiled.geometrySha256||
  base.program?.length!==1||base.program[0].zones?.length!==4||
  base.plan?.layout?.axis!=='z')err('FOUR_ROOM_VERIFIED_BASE_REQUIRED');
 const ids=base.program[0].zones.map(z=>z.id),set=new Set(ids);
 if(intent?.schema!==R139||intent.basePlanSha256!==base.planSha256||
  typeof intent.entryFacingZoneId!=='string'||!set.has(intent.entryFacingZoneId)||
  !Array.isArray(intent.directAdjacencies)||intent.directAdjacencies.length<1||
  intent.directAdjacencies.length>2)err('INTENT_CONTRACT');
 const pairs=[],seen=new Set();
 for(const pair of intent.directAdjacencies){
  if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||
   !set.has(pair[0])||!set.has(pair[1])||seen.has(idPair(...pair)))
   err('INVALID_DIRECT_ROOM_PAIR');
  pairs.push([...pair]);seen.add(idPair(...pair));
 }
 const {width:w,depth:d}=base.plan.footprint;
 if(w<24||d<24||w>32||d>32)err('ROOM_MINIMUM_REAL_SIZE');
 const xmid=Math.floor(w/2),zmid=Math.floor(d/2);
 const xs=[[2,xmid-1],[xmid+1,w-3]],zs=[[2,zmid-1],[zmid+1,d-3]];
 const quad=[
  {x:xs[0],z:zs[0]},{x:xs[1],z:zs[0]},
  {x:xs[0],z:zs[1]},{x:xs[1],z:zs[1]}
 ];
 if(quad.some(q=>q.x[1]-q.x[0]+1<8||q.z[1]-q.z[0]+1<8))
  err('ROOM_WITH_TWO_WIDE_ACCESS_TOO_SMALL');
 const available=permutations(ids).filter(assignment=>{
  if(![0,1].includes(assignment.indexOf(intent.entryFacingZoneId)))return false;
  return pairs.every(([a,b])=>links.some(([i,j])=>
   idPair(assignment[i],assignment[j])===idPair(a,b)));
 });
 if(!available.length)err('MODEL_DIRECT_GRAPH_NOT_EMBEDDABLE_AS_FOUR_ROOM_GRID');
 const distance=a=>a.reduce((n,id,i)=>n+(id!==ids[i]?1:0),0);
 available.sort((a,b)=>distance(a)-distance(b)||a.join('|').localeCompare(b.join('|')));
 const assigned=available[0],idx=new Map(assigned.map((id,i)=>[id,i]));
 const edges=pairs.map(([a,b])=>({a,b,fromModel:true}));
 const reach=new Set([intent.entryFacingZoneId]);
 // The actual model pairs define a graph. Preserve each, then add only
 // necessary shared-wall connections to attach disconnected components.
 const components=new Map(ids.map(id=>[id,id]));
 const root=id=>{let cur=id;while(components.get(cur)!==cur)cur=components.get(cur);return cur;};
 const union=(a,b)=>{const ra=root(a),rb=root(b);if(ra!==rb)components.set(rb,ra);};
 for(const p of edges)union(p.a,p.b);
 const extras=[];
 for(const [i,j] of links){
  const a=assigned[i],b=assigned[j];
  if(root(a)!==root(b)){
   extras.push({a,b,fromModel:false});
   union(a,b);
  }
 }
 if(new Set(ids.map(root)).size!==1)err('ALL_FOUR_ROOMS_MUST_CONNECT');
 const original=JSON.stringify(base.design);
 const design=structuredClone(base.design);
 design.elements=design.elements.filter(e=>
  !e.id.startsWith('zone-divider-')&&!e.id.startsWith('zone-door-'));
 const wall=base.plan.materials.wall;
 const add=(id,mode,origin,size)=>design.elements.push({
  id,shape:'box',mode,...(mode==='add'?{material:wall}:{}),origin,size});
 add('r168-partition-x','add',[xmid,2,2],[1,4,d-4]);
 add('r168-partition-z','add',[2,2,zmid],[w-4,4,1]);
 const entrance=design.elements.find(e=>e.id==='exterior-entrance');
 const entryIdx=idx.get(intent.entryFacingZoneId),entryRange=quad[entryIdx];
 const frontGlass=design.elements.filter(e=>e.id==='window-front-glass');
 const candidates=Array.from({length:entryRange.x[1]-entryRange.x[0]},(_,i)=>entryRange.x[0]+i)
  .sort((a,b)=>Math.abs(a-(entryRange.x[0]+entryRange.x[1]-1)/2)-
   Math.abs(b-(entryRange.x[0]+entryRange.x[1]-1)/2)||a-b);
 const entryX=candidates.find(x=>x>=2&&x+1<w-2&&
  !frontGlass.some(e=>x<=e.origin[0]+e.size[0]-1&&
    x+1>=e.origin[0]));
 if(!entrance||entrance.shape!=='box'||entrance.mode!=='cut'||
  entrance.size[0]!==2||entryX===undefined)err('SAFE_FRONT_ENTRY_NOT_POSSIBLE');
 entrance.origin=[entryX,2,1];
 const allEdges=[...edges,...extras],actualDoors=[];
 for(const [k,p] of allEdges.entries()){
  const ai=idx.get(p.a),bi=idx.get(p.b);
  const ra=quad[ai],rb=quad[bi];
  let origin,size;
  if(ra.z[0]===rb.z[0]&&ra.x[0]!==rb.x[0]){
   const z=Math.floor((ra.z[0]+ra.z[1])/2)-1;
   origin=[xmid,2,z];size=[1,3,2];
  }else if(ra.x[0]===rb.x[0]&&ra.z[0]!==rb.z[0]){
   const x=Math.floor((ra.x[0]+ra.x[1])/2)-1;
   origin=[x,2,zmid];size=[2,3,1];
  }else err('EDGE_NOT_DIRECT_SHARED_WALL');
  add('r168-door-'+k,'cut',origin,size);
  actualDoors.push({zoneA:p.a,zoneB:p.b,origin,size,
   requestedDirectlyByModel:p.fromModel,
   hostExtraForNecessaryConnectivity:!p.fromModel});
 }
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||JSON.stringify(base.design)!==original)
  err('SOURCE_OR_PARENT_IMMUTABILITY');
 const byId=new Map(base.program[0].zones.map(z=>[z.id,z]));
 const program=structuredClone(base.program);
 program[0].zones=assigned.map((id,i)=>({
  ...structuredClone(byId.get(id)),
  range:{x:[...quad[i].x],z:[...quad[i].z]},
  physicalSector:sectors[i],actualSourceRoomRangeDerivedByHost:true
 }));
 const derivative={
  ...base,design,compiled,program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  planSha256:hash({basePlanSha256:base.planSha256,
   hostVariant:'r168-grid-research',modelDirectAdjacencies:pairs,
   hostAddedConnectivity:extras,quadAssignment:assigned}),
  relationIntent:structuredClone(intent),
  relationIRSchema:R139,
  modelRequestedDirectDoorEvidence:actualDoors.filter(x=>x.requestedDirectlyByModel),
  hostAdditionalDoorEvidence:actualDoors.filter(x=>x.hostExtraForNecessaryConnectivity),
  topologyProvenance:'HOST_DERIVED_RESEARCH_GRID_OVERRIDES_MODEL_CENTRAL_SPINE',
  r168GridEvidence:{sourceOnly:true,modelExplicitTopologyNotImplemented:true,
   modelDirectPairsPreserved:true,modelRoomCountPreserved:true,
   assignment:assigned,sectors,
   modelRequestedDoorCount:edges.length,hostExtraDoorCount:extras.length,
   actualDoors},
  constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0
 };
 const routes=auditR125SourceRoutes(derivative);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==4||
  !routes.zones.every(x=>x.reachedFromEntrance&&x.reachedTwoWidePadCount>0))
  err('ACTUAL_SOURCE_ROUTES_NOT_CONNECTED');
 // Ensure every mandatory doorway spans a shared physical partition,
 // is transparent in the final voxels, and retains supported floor cells.
 const solids=new Set(compiled.primitives.map(p=>p.slice(0,3).join(',')));
 const has=(x,y,z)=>solids.has([x,y,z].join(','));
 for(const door of actualDoors){
  const [x,,z]=door.origin,[sx,,sz]=door.size;
  for(let dx=0;dx<sx;dx++)for(let dz=0;dz<sz;dz++){
   if(!has(x+dx,1,z+dz))err('DOOR_NO_SUPPORTED_FLOOR');
   for(let y=2;y<=4;y++)if(has(x+dx,y,z+dz))err('MODEL_DIRECT_DOOR_BLOCKED');
  }
 }
 return {...derivative,sourceRouteAudit:routes};
}

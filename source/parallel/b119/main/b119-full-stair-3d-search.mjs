/** B119 — bounded whole-flight + landing + aperture + 2-wide gallery hypothesis. LOCAL, OFFLINE. */
import {straightFlight,intersects} from '../../b113/main/b113-geometry.mjs';
import {transformStairBox} from '../../b114/main/b114-stair-grid-frame.mjs';
import {studyFloorSlab} from '../../b117/main/b117-geometry.mjs';
import {searchB118Exit} from '../../b118/main/b118-exit-alternatives.mjs';

const K=p=>p.x+','+p.z;
const Q=p=>p.x+','+p.y+','+p.z;
const rect=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const card=d=>d&&Number.isInteger(d.dx)&&Number.isInteger(d.dz)&&Math.abs(d.dx)+Math.abs(d.dz)===1;
const cell=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
const shift=(p,d,n)=>({x:p.x+d.dx*n,z:p.z+d.dz*n});
export const FOOTPRINT_LENGTH=7,FOOTPRINT_WIDTH=2;
export function straightModel(origin,ascent,fromLevel,flight=straightFlight()){
 if(!cell(origin)||!card(ascent)||!Number.isInteger(fromLevel)||fromLevel<0)
  throw Error('B119_INVALID_FLIGHT_POSE');
 const frame={origin,ascent,fromLevel};
 const foot=[];
 // Every cell follows the same signed-grid transform as the 3D stair solids.
 // The old raw x/z formula misplaces the second lane under some rotations.
 for(let n=0;n<FOOTPRINT_LENGTH;n++)for(let w=0;w<FOOTPRINT_WIDTH;w++){
  const tile=transformStairBox({x:n,y:0,z:w,width:1,height:1,depth:1},frame);
  if(!Number.isInteger(tile.x)||!Number.isInteger(tile.z)||tile.width!==1||tile.depth!==1)
   throw Error('B119_SIGNED_STAIR_CELL_GRID_MISMATCH');
  foot.push({x:tile.x,z:tile.z});
 }
 const swept=[];
 for(const [i,p] of flight.samples.entries()){
  swept.push({x:p.x-.3,y:p.y,z:p.z-.3,width:.6,height:2,depth:.6});
  if(i){const q=flight.samples[i-1];
   swept.push({x:Math.min(p.x,q.x)-.3,y:Math.min(p.y,q.y),z:Math.min(p.z,q.z)-.3,
    width:Math.abs(p.x-q.x)+.6,height:Math.abs(p.y-q.y)+2,depth:Math.abs(p.z-q.z)+.6});
  }
 }
 const supports=[];
 for(let i=0;i<5;i++)for(const z of [0,1.75])
  supports.push({x:i+1,y:-1,z,width:1,height:i+1,depth:.25});
 return {origin,ascent,fromLevel,footprint:foot,lowerLanding:foot.slice(0,2),
  upperLanding:foot.slice(-2),body:swept.map(b=>transformStairBox(b,frame)),
  treads:flight.solids.map(b=>transformStairBox(b,frame)),
  supports:supports.map(b=>transformStairBox(b,frame)),
  physicalStairStatesCertified:false,worldContacts:0};
}
export function buildB119ProxyIndex(sourceVoxels){
 if(!Array.isArray(sourceVoxels))throw Error('B119_BAD_SOURCE_VOXELS');
 const solids=new Map();
 for(const p of sourceVoxels){
  if(p.kind==='EXTERIOR_PORTAL_VOID_PROXY')continue;
  if(![p.x,p.y,p.z].every(Number.isSafeInteger))throw Error('B119_INVALID_VOXEL');
  solids.set(Q(p),p);
 }
 return solids;
}
function sourceHits(boxes,solidMap){
 const evidence=new Map();
 for(const a of boxes){
  for(let y=Math.floor(a.y);y<Math.ceil(a.y+a.height);y++)
  for(let z=Math.floor(a.z);z<Math.ceil(a.z+a.depth);z++)
  for(let x=Math.floor(a.x);x<Math.ceil(a.x+a.width);x++){
   const v=solidMap.get(x+','+y+','+z);
   if(v&&intersects(a,{x,y,z,width:1,height:1,depth:1}))evidence.set(Q(v),{x,y,z,kind:v.kind});
  }
 }
 return [...evidence.values()].sort((a,b)=>a.y-b.y||a.z-b.z||a.x-b.x);
}
export function inspectB119Pose({design,stair,model,otherModels=[],solidMap,
 walkByLevel,occupiedByLevel,aperturesByLevel,heldSides,forbiddenGalleryChanges=true}){
 const reasons=[],tags=new Set(),add=(code,detail)=>{reasons.push({code,...detail?{detail}:{}});tags.add(code);};
 const {fromLevel,toLevel,coreIndex}=stair;
 const lo=design.plan.floors[fromLevel],hi=design.plan.floors[toLevel];
 if(!lo||!hi||toLevel!==fromLevel+1||!Array.isArray(otherModels)||
 !(solidMap instanceof Map)||!Array.isArray(walkByLevel)||!Array.isArray(occupiedByLevel)||
 !Array.isArray(aperturesByLevel)||!(heldSides instanceof Set)||heldSides.size===0||
 [...heldSides].some(x=>!['LOWER','UPPER'].includes(x)))throw Error('B119_INVALID_EVIDENCE');
 if(model.fromLevel!==fromLevel)throw Error('B119_WRONG_GEOMETRY_LEVEL');
 const originCells=new Set(model.footprint.map(K));
 if(originCells.size!==14)throw Error('B119_BAD_STAIR_FOOTPRINT');
 const core=design.plan.cores[coreIndex];
 if(!core||!model.footprint.some(p=>rect(core,p)))add('STAIR_DISJOINT_FROM_ORIGINAL_CORE');
 for(const level of [fromLevel,toLevel]){
  const floor=design.plan.floors[level];
  const others=design.plan.cores.filter((_,i)=>i!==coreIndex);
  for(const p of model.footprint){
   if(floor.footprintRows[p.z]?.[p.x]!=='1')add('FOOTPRINT_OUTSIDE_SOURCE_FLOOR',{level,point:p});
   else if(floor.rooms.some(r=>rect(r,p)))add('FOOTPRINT_CROSSES_PROTECTED_ROOM',{level,point:p});
   else if(others.some(r=>rect(r,p)))add('FOOTPRINT_CROSSES_OTHER_CORE',{level,point:p});
   else if(occupiedByLevel[level]?.has(K(p)))add('FOOTPRINT_CROSSES_OTHER_STAIR',{level,point:p});
   else if(walkByLevel[level]?.has(K(p)))add('FOOTPRINT_OVERLAPS_SOURCE_OR_STAGED_GALLERY',{level,point:p});
  }
 }
 const hits=sourceHits(model.body,solidMap);
 if(hits.length)add('B105_SOURCE_VOXEL_HEADROOM_OBSTRUCTION',{count:hits.length,examples:hits.slice(0,3)});
 const pair=[];
 for(const other of otherModels){
  if(model.body.some(b=>other.treads?.some(t=>intersects(b,t))||other.supports?.some(t=>intersects(b,t)))||
     [...model.treads,...model.supports].some(t=>other.body?.some(b=>intersects(t,b))))
   pair.push(other.id);
 }
 if(pair.length)add('NEIGHBOR_STAIR_3D_BODY_OR_SUPPORT_CLASH',{stairIndices:pair});
 const slab=studyFloorSlab({fromLevel,toLevel,lowerFloor:lo,upperFloor:hi,
  lowerLanding:model.lowerLanding,upperLanding:model.upperLanding,
  bodyAABBs:model.body,
  otherOpenings:aperturesByLevel[toLevel]??new Set()});
 for(const code of slab.issueCodes){
  if(code==='UPPER_LANDING_BODY_SWEEP_REQUIRES_FINE_STEP_REVIEW')continue;
  add('SLAB_'+code);
 }
 const sides={},entry={LOWER:{level:fromLevel,landing:model.lowerLanding},
  UPPER:{level:toLevel,landing:model.upperLanding}};
 for(const side of ['LOWER','UPPER']){
  const {level,landing}=entry[side],walk=walkByLevel[level];
  if(!(walk instanceof Set))throw Error('B119_WALK_GRAPH_MISSING');
  const occupied=new Set(occupiedByLevel[level]??[]);
  for(const p of model.footprint)occupied.add(K(p));
  const search=searchB118Exit({floor:design.plan.floors[level],
   rooms:design.plan.floors[level].rooms,cores:design.plan.cores,
   stairCells:occupied,apertures:aperturesByLevel[level]??new Set(),
   landing,walk,maxPaths:2});
  sides[side]={status:search.status,concepts:search.candidateCount,
   bestExtraCells:search.candidates[0]?.addedCells.length??null,
   firstBlockerCounts:Object.fromEntries([...new Set(search.examinations.flatMap(e=>e.protectedFailures??[]).map(e=>e.reason))]
    .map(code=>[code,search.examinations.flatMap(e=>e.protectedFailures??[]).filter(e=>e.reason===code).length]))};
  if(!search.candidateCount)add('NO_CONSERVATIVE_TWO_WIDE_'+side+'_EXIT');
 }
 return {status:reasons.length?'NO_ALL_IN_ONE_CONSERVATIVE_DESIGN':'LOCAL_GEOMETRIC_CANDIDATE_ONLY',
  reasons:reasons.slice(0,18),reasonCodes:[...tags].sort(),
  reasonTotal:reasons.length,fromLevel,toLevel,coreIndex,
  proposedOrigin:model.origin,proposedAscent:model.ascent,
  lowerLanding:model.lowerLanding,upperLanding:model.upperLanding,
  sourceFootprintProtected:true,otherFlightsChecked:otherModels.length,
  proposedUpperFloorOpeningCells:slab.conceptualOpeningCells.length,
  retainsUpperLanding2Cells:slab.upperLandingFloorRetained.length===2,
  upperLandingPlayerSweepReview:slab.issueCodes.includes('UPPER_LANDING_BODY_SWEEP_REQUIRES_FINE_STEP_REVIEW'),
  slabBlockingIssues:slab.issueCodes.filter(x=>x!=='UPPER_LANDING_BODY_SWEEP_REQUIRES_FINE_STEP_REVIEW'),
  sides,physicalStairMovementCertified:false,
  realMinecraftBlockStatesAndSupportCertified:false,worldContacts:0,
  noSourceEdits:true};
}
export function searchB119Stair({design,stair,otherModels,solidMap,walkByLevel,
 occupiedByLevel,aperturesByLevel,heldSides,maxShift=3}){
 if(![0,1,2,3].includes(maxShift)||!cell(stair.proposedOrigin)||!card(stair.proposedAscent))
  throw Error('B119_UNBOUNDED_OR_UNVERIFIED_SEARCH');
 const directions=[{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0},{dx:0,dz:-1}],seen=new Set();
 const issues=new Map(),top=[],near=[],count={attempted:0,unobstructed:0};
 for(const ascent of directions){
  // Preserve rough core anchoring by searching around the original stair's core;
  // no best-effort world changes are ever applied.
  for(let dx=-maxShift;dx<=maxShift;dx++)for(let dz=-maxShift;dz<=maxShift;dz++){
   if(Math.abs(dx)+Math.abs(dz)>maxShift)continue;
   const origin={x:stair.proposedOrigin.x+dx,z:stair.proposedOrigin.z+dz};
   const key=K(origin)+'/'+ascent.dx+','+ascent.dz;
   if(seen.has(key))continue;seen.add(key);count.attempted++;
   const model=straightModel(origin,ascent,stair.fromLevel);
   const result=inspectB119Pose({design,stair,model,otherModels,solidMap,
    walkByLevel,occupiedByLevel,aperturesByLevel,heldSides});
   if(!result.reasonCodes.length){count.unobstructed++;top.push(result);}
   else{
    for(const code of result.reasonCodes)issues.set(code,(issues.get(code)??0)+1);
    near.push(result);
   }
  }
 }
 const delta=p=>Math.abs(p.proposedOrigin.x-stair.proposedOrigin.x)+Math.abs(p.proposedOrigin.z-stair.proposedOrigin.z);
 const cmp=(a,b)=>delta(a)-delta(b)||
 (a.proposedAscent.dx===stair.proposedAscent.dx&&a.proposedAscent.dz===stair.proposedAscent.dz?0:1)-
 (b.proposedAscent.dx===stair.proposedAscent.dx&&b.proposedAscent.dz===stair.proposedAscent.dz?0:1)||
 a.proposedUpperFloorOpeningCells-b.proposedUpperFloorOpeningCells||
 a.proposedOrigin.z-b.proposedOrigin.z||a.proposedOrigin.x-b.proposedOrigin.x;
 top.sort(cmp);
 near.sort((a,b)=>a.reasonCodes.length-b.reasonCodes.length||cmp(a,b));
 return {status:top.length?'UNBUILT_WHOLE_FLIGHT_PROXY_CANDIDATES':'REDESIGN_STILL_HELD',
  attempts:count.attempted,conservativeModelClear:count.unobstructed,
  bestUnbuiltCandidates:top.slice(0,3),
  closestRejectedHypotheses:near.slice(0,3).map(r=>({...r,reasons:r.reasons.slice(0,4)})),
  rejectionCounts:Object.fromEntries([...issues].sort(([a],[b])=>a.localeCompare(b))),
  floorAndRoomsImmutable:true,sourceStairsNotMoved:true,physicalMovementCertified:false,
  constructionAllowed:false,worldContacts:0};
}

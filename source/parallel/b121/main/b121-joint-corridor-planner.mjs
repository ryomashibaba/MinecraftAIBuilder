/** B121 — joint STAIR + (only conditional) GALLERY plan, no source modification. */
import {intersects} from '../../b113/main/b113-geometry.mjs';
import {studyFloorSlab} from '../../b117/main/b117-geometry.mjs';
import {searchB118Exit} from '../../b118/main/b118-exit-alternatives.mjs';
import {straightModel} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
const K=p=>p.x+','+p.z;
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const card=d=>d&&Number.isInteger(d.dx)&&Number.isInteger(d.dz)&&Math.abs(d.dx)+Math.abs(d.dz)===1;
const bbox=p=>({x:p.x,y:p.y,z:p.z,width:1,height:1,depth:1});
function hitCount(boxes,solids){
 const seen=new Set();
 for(const b of boxes)for(let y=Math.floor(b.y);y<Math.ceil(b.y+b.height);y++)
 for(let z=Math.floor(b.z);z<Math.ceil(b.z+b.depth);z++)
 for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.width);x++){
  const id=x+','+y+','+z;
  if(solids.has(id)&&intersects(b,bbox({x,y,z})))seen.add(id);
 }
 return seen.size;
}
function validSets(x){
 return Array.isArray(x)&&x.every(v=>v instanceof Set);
}
/** Only B114 pending addition cells are soft. Source and B113 repaired gallery are immutable. */
export function assessB121JointPose({design,stair,model,sourceWalk,stagedWalk,
  otherStairs,otherStairCells,otherOpenings,sourceSolidMap,maxSoftRelocation=12}){
 if(!design?.plan?.floors||!stair||!model||!validSets(sourceWalk)||!validSets(stagedWalk)||
  !validSets(otherStairCells)||!validSets(otherOpenings)||
  !Array.isArray(otherStairs)||!(sourceSolidMap instanceof Map)||
  !Number.isInteger(maxSoftRelocation)||maxSoftRelocation<0||maxSoftRelocation>24)
  throw Error('B121_INVALID_SOURCE_SHAPES');
 const {fromLevel,toLevel,coreIndex}=stair;
 if(toLevel!==fromLevel+1||model.fromLevel!==fromLevel)throw Error('B121_INVALID_FLOOR_RELATION');
 const floors=design.plan.floors,core=design.plan.cores[coreIndex];
 if(!core||!floors[fromLevel]||!floors[toLevel])throw Error('B121_INVALID_CORE');
 const hard=[],record=(code,detail)=>hard.push({code,...(detail?{detail}:{})});
 if(model.discontinuities>0)record('STAIR_SLOPE_CONTINUITY');
 if(new Set(model.footprint.map(K)).size!==model.footprint.length)record('STAIR_FOOTPRINT_DUPLICATE');
 if(!model.footprint.some(p=>inside(core,p)))record('STAIR_LOST_ORIGINAL_CORE');
 const soft=new Map(),foot=new Set(model.footprint.map(K));
 for(const level of [fromLevel,toLevel]){
  const floor=floors[level],others=design.plan.cores.filter((_,i)=>i!==coreIndex);
  if(!floor.rooms||!floor.footprintRows||!(sourceWalk[level] instanceof Set)||
   !(stagedWalk[level] instanceof Set)||!(otherStairCells[level] instanceof Set))
   throw Error('B121_BAD_FLOOR_EVIDENCE');
  for(const p of model.footprint){
   const id=K(p);
   if(floor.footprintRows[p.z]?.[p.x]!=='1')record('FLOOR_MASK_OUTSIDE',{level,id});
   if(floor.rooms.some(r=>inside(r,p)))record('PROTECTED_ROOM',{level,id});
   if(others.some(r=>inside(r,p)))record('OTHER_CORE',{level,id});
   if(otherStairCells[level].has(id))record('OTHER_STAIR_FOOTPRINT',{level,id});
   if(sourceWalk[level].has(id))record('IMMUTABLE_SOURCE_GALLERY',{level,id});
   if(stagedWalk[level].has(id))soft.set(level+':'+id,{level,x:p.x,z:p.z});
  }
 }
 if(hitCount(model.body,sourceSolidMap))record('B105_PLAYER_BODY');
 if(hitCount([...(model.treads??[]),...(model.platform??[]),...(model.supports??[])],sourceSolidMap))
  record('B105_STAIR_AND_SUPPORT');
 const solids=[...(model.treads??[]),...(model.platform??[]),...(model.supports??[])];
 if(otherStairs.some(s=>model.body.some(b=>[...(s.treads??[]),...(s.supports??[])].some(t=>intersects(b,t)))||
  solids.some(t=>(s.body??[]).some(b=>intersects(t,b)))))
  record('OTHER_FLIGHT_3D_INTERFERENCE');
 const slab=studyFloorSlab({fromLevel,toLevel,
  lowerFloor:floors[fromLevel],upperFloor:floors[toLevel],
  lowerLanding:model.lowerLanding,upperLanding:model.upperLanding,
  bodyAABBs:model.body,otherOpenings:otherOpenings[toLevel]??new Set()});
 for(const code of slab.issueCodes){
  if(code==='UPPER_LANDING_BODY_SWEEP_REQUIRES_FINE_STEP_REVIEW')continue;
  record('SLAB_'+code);
 }
 if(soft.size>maxSoftRelocation)record('SOFT_GALLERY_CHANGE_BUDGET_EXCEEDED');
 const paths={};let optimistic=false;
 // Route lookup only after all irrecoverable structural obstacles are excluded.
 if(!hard.length){
  optimistic=true;
  for(const [side,level,landing]of[
   ['LOWER',fromLevel,model.lowerLanding],['UPPER',toLevel,model.upperLanding]]){
   const occupied=new Set(otherStairCells[level]);
   for(const p of model.footprint)occupied.add(K(p));
   const nav=searchB118Exit({floor:floors[level],rooms:floors[level].rooms,
    cores:design.plan.cores,stairCells:occupied,apertures:otherOpenings[level]??new Set(),
    landing,walk:sourceWalk[level],maxPaths:2});
   paths[side]={sourceRootedTwoWideCandidate:nav.candidateCount>0,
    minAdditionalCells:nav.candidates[0]?.addedCells.length??null,
    candidate:nav.candidates[0]??null,reason:nav.status};
   if(!nav.candidateCount)record('UNREACHABLE_IMMUTABLE_SOURCE_GALLERY_'+side);
  }
 }
 const displacements=[...soft.values()].sort((a,b)=>a.level-b.level||a.z-b.z||a.x-b.x);
 const ready=hard.length===0;
 return {status:!ready?'REJECTED_CONSERVATIVE_PROXY':displacements.length?
  'CONDITIONAL_REQUIRES_STAGED_GALLERY_REROUTE':'CONDITIONAL_NO_STAGED_GALLERY_RELOCATION',
  shape:model.kind??'STRAIGHT_HALF_STEP_PROXY',
  firstRise:model.firstRise??null,origin:model.origin,ascent:model.ascent,
  reasonCodes:[...new Set(hard.map(x=>x.code))].sort(),
  failedConditions:hard.length,sourceFloorOpenings:slab.conceptualOpeningCells.length,
  preservesUpperLandingCells:slab.upperLandingFloorRetained.length,
  softGalleryDisplacementCount:soft.size,stagedGalleryCellsForRedesign:displacements,
  paths,sourceRootedRouteSearchAttempted:optimistic,
  stagedNetworkReconnectedCertified:false,
  hypotheticalEditsApplied:false,immutableSourceGalleryChanged:false,
  physicalWalkabilityCertified:false,realStructuralSupportCertified:false,
  constructionAllowed:false,worldContacts:0};
}
export function exploreB121JointDesigns({design,stair,sourceWalk,stagedWalk,otherStairs,
  otherStairCells,otherOpenings,sourceSolidMap,maxShift=3}){
 if(![0,1,2,3].includes(maxShift)||!card(stair?.proposedAscent))
  throw Error('B121_UNBOUNDED_SEARCH');
 const poses=[],reject=new Map();let attempted=0;
 const dirs=[{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0},{dx:0,dz:-1}];
 for(const shape of ['STRAIGHT','U2','U3'])for(const ascent of dirs)
 for(let dx=-maxShift;dx<=maxShift;dx++)for(let dz=-maxShift;dz<=maxShift;dz++){
  if(Math.abs(dx)+Math.abs(dz)>maxShift)continue;
  attempted++;
  const origin={x:stair.proposedOrigin.x+dx,z:stair.proposedOrigin.z+dz};
  const model=shape==='STRAIGHT'?straightModel(origin,ascent,stair.fromLevel):
    buildB120UTurn({origin,ascent,fromLevel:stair.fromLevel,firstRise:shape==='U2'?2:3});
  const s=assessB121JointPose({design,stair,model,sourceWalk,stagedWalk,
   otherStairs,otherStairCells,otherOpenings,sourceSolidMap});
  if(s.status.startsWith('CONDITIONAL_'))poses.push(s);
  else for(const code of s.reasonCodes)reject.set(code,(reject.get(code)??0)+1);
 }
 const score=x=>x.softGalleryDisplacementCount*100+
 (x.paths.LOWER?.minAdditionalCells??99)+(x.paths.UPPER?.minAdditionalCells??99);
 poses.sort((a,b)=>score(a)-score(b)||a.origin.x-b.origin.x||a.origin.z-b.origin.z);
 return {attempted,conditionalTotal:poses.length,
  noStagedChanges:poses.filter(x=>x.softGalleryDisplacementCount===0).length,
  requiresStagedReroute:poses.filter(x=>x.softGalleryDisplacementCount>0).length,
  shortlisted:poses.slice(0,3),
  rejectedByReason:Object.fromEntries([...reject].sort(([a],[b])=>a.localeCompare(b))),
  proposedNewWorldOperations:0,designAndAllSourceGalleriesUnmodified:true,
  allOriginalHeldExitsRemainHeld:true,constructionAllowed:false,worldContacts:0};
}

/** B122: independent full-length corridor + B114 staged-network audit, OFFLINE ONLY. */
const K=p=>p.x+','+p.z;
const S=p=>[p,{x:p.x+1,z:p.z},{x:p.x,z:p.z+1},{x:p.x+1,z:p.z+1}];
const valid=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const ADJ=[[1,0],[-1,0],[0,1],[0,-1]];
const point=id=>{const [x,z]=id.split(',').map(Number);return {x,z};};
const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;
export function auditB122TwoWideNetwork({sourceWalk,stagedWalk,removedStaged=new Set(),extraCells=new Set()}){
 if(![sourceWalk,stagedWalk,removedStaged,extraCells].every(x=>x instanceof Set))
  throw Error('B122_NETWORK_SET_MISSING');
 if([...removedStaged].some(x=>!stagedWalk.has(x)))throw Error('B122_REMOVAL_NOT_STAGED');
 if([...removedStaged].some(x=>sourceWalk.has(x)))throw Error('B122_SOURCE_CELL_REMOVAL_FORBIDDEN');
 const all=new Set([...sourceWalk,...stagedWalk].filter(x=>!removedStaged.has(x)));
 for(const x of extraCells)all.add(x);
 const anchors=new Map();
 for(const id of all){
  const p=point(id);
  if(S(p).every(q=>all.has(K(q))))anchors.set(id,p);
 }
 const starts=[];
 for(const p of anchors.values()){
  const base=S(p).filter(q=>sourceWalk.has(K(q)));
  if(base.some((a,i)=>base.slice(i+1).some(b=>adjacent(a,b))))starts.push(p);
 }
 const seen=new Set(),q=[...starts];
 for(let i=0;i<q.length;i++){
  const p=q[i],id=K(p);if(seen.has(id))continue;seen.add(id);
  for(const [dx,dz]of ADJ){
   const n={x:p.x+dx,z:p.z+dz},key=K(n);
   if(anchors.has(key)&&!seen.has(key))q.push(n);
  }
 }
 const covered=new Set();
 for(const id of seen)for(const c of S(point(id)))covered.add(K(c));
 const stageRemaining=[...stagedWalk].filter(x=>!removedStaged.has(x)&&!sourceWalk.has(x));
 const stageCovered=stageRemaining.filter(x=>covered.has(x));
 return {twoWideAnchors:anchors.size,rootAnchors:starts.length,
  reachableAnchors:seen.size,remainingStagedCells:stageRemaining.length,
  rootReachedStagedCells:stageCovered.length,
  notRootReachedStagedCells:stageRemaining.length-stageCovered.length,
  rootConnectivityProvedForAllOriginalStairs:false,
  networkIsReadOnly:true};
}
export function auditB122FullRoute({candidate,landing,side,level,floor,cores,
 sourceWalk,stagedWalk,removedStaged,otherStairCells=new Set(),
 apertureCells=new Set(),solidVoxels=[],foreignTreads=[],foreignSupports=[]}){
 if(!candidate||!valid(candidate.start)||!valid(candidate.goal)||
 !Array.isArray(candidate.routeFootprint)||!candidate.routeFootprint.every(valid)||
 !Array.isArray(candidate.addedCells)||!candidate.addedCells.every(valid)||
 !Array.isArray(landing)||landing.length!==2||!landing.every(valid)||
 !adjacent(landing[0],landing[1])||
 !['LOWER','UPPER'].includes(side)||!Number.isInteger(level)||level<0||
 !Array.isArray(floor?.footprintRows)||!Array.isArray(floor.rooms)||
 !Array.isArray(cores)||![sourceWalk,stagedWalk,removedStaged,otherStairCells,apertureCells].every(s=>s instanceof Set)||
 !Array.isArray(solidVoxels)||!Array.isArray(foreignTreads)||!Array.isArray(foreignSupports))
 throw Error('B122_INVALID_INPUT');
 const codes=new Set(),notes=[],fail=(code,detail)=>{codes.add(code);if(notes.length<24)notes.push({code,detail});};
 const cells=new Set(candidate.routeFootprint.map(K)),added=new Set(candidate.addedCells.map(K));
 if(cells.size!==candidate.routeFootprint.length)fail('DUPLICATE_ROUTE_CELL');
 if(added.size!==candidate.addedCells.length)fail('DUPLICATE_NEW_CELL');
 if([...added].some(x=>!cells.has(x)))fail('ADDITION_NOT_ON_CORRIDOR');
 const expected=new Set([...cells].filter(x=>!sourceWalk.has(x)));
 if(expected.size!==added.size||[...expected].some(x=>!added.has(x)))
  fail('ADDITIONS_NOT_EXACT_SOURCE_DELTA');
 const normals=landing[0].x===landing[1].x?[[1,0],[-1,0]]:[[0,1],[0,-1]];
 if(!normals.some(([dx,dz])=>{
  const raw=landing.flatMap(p=>[{x:p.x+dx,z:p.z+dz},{x:p.x+2*dx,z:p.z+2*dz}]);
  return candidate.start.x===Math.min(...raw.map(p=>p.x))&&
   candidate.start.z===Math.min(...raw.map(p=>p.z));
 }))fail('CORRIDOR_START_NOT_NEXT_TO_LANDING');
 const anchor=new Map();
 for(const c of candidate.routeFootprint)if(S(c).every(p=>cells.has(K(p))))anchor.set(K(c),c);
 if(!anchor.has(K(candidate.start)))fail('MISSING_START_TWO_WIDE_SQUARE');
 if(!anchor.has(K(candidate.goal)))fail('MISSING_END_TWO_WIDE_SQUARE');
 const seen=new Set(),queue=anchor.has(K(candidate.start))?[candidate.start]:[];
 for(let i=0;i<queue.length;i++){
  const p=queue[i],id=K(p);if(seen.has(id))continue;seen.add(id);
  for(const [dx,dz]of ADJ){const n={x:p.x+dx,z:p.z+dz},key=K(n);
   if(anchor.has(key)&&!seen.has(key))queue.push(n);
  }
 }
 if(!seen.has(K(candidate.goal)))fail('DISCONNECTED_TWO_WIDE_ANCHORS');
 const covered=new Set();
 for(const id of seen)for(const p of S(point(id)))covered.add(K(p));
 if([...cells].some(x=>!covered.has(x)))fail('STRANDED_ROUTE_CELLS');
 const terminal=S(candidate.goal).filter(p=>sourceWalk.has(K(p)));
 if(!terminal.some((a,i)=>terminal.slice(i+1).some(b=>adjacent(a,b))))
  fail('GOAL_NOT_ROOTED_TO_PROTECTED_SOURCE_GALLERY');
 const solids=new Map();
 for(const p of solidVoxels){
  if(p.kind==='EXTERIOR_PORTAL_VOID_PROXY')continue;
  if(![p.x,p.y,p.z].every(Number.isSafeInteger))throw Error('B122_BAD_SOURCE_VOXEL');
  solids.set(p.x+','+p.y+','+p.z,p.kind);
 }
 const boxes=[...foreignTreads,...foreignSupports];
 for(const box of boxes){
  if(![box.x,box.y,box.z,box.width,box.height,box.depth].every(Number.isFinite)||
    [box.width,box.height,box.depth].some(x=>x<=0))throw Error('B122_BAD_FOREIGN_BOX');
 }
 const original=new Set([...sourceWalk]);
 let collisions=0;
 for(const p of candidate.routeFootprint){
  const id=K(p);
  if(floor.footprintRows[p.z]?.[p.x]!=='1')fail('CORRIDOR_OUTSIDE_SOURCE_FLOOR',p);
  if(floor.rooms.some(r=>inside(r,p)))fail('CORRIDOR_OVER_PROTECTED_ROOM',p);
  if(cores.some(r=>inside(r,p)))fail('CORRIDOR_OVER_PROTECTED_CORE',p);
  if(otherStairCells.has(id))fail('CORRIDOR_OVER_OTHER_STAIR',p);
  if(apertureCells.has(id))fail('CORRIDOR_OVER_STAGED_APERTURE',p);
  for(let y=level*5+1;y<=level*5+2;y++){
   if(solids.has(p.x+','+y+','+p.z)){
    collisions++;fail('FULL_CORRIDOR_B105_HEADROOM_CLASH',{x:p.x,y,z:p.z});
   }
  }
  const corridor={x:p.x,y:level*5+1,z:p.z,width:1,height:2,depth:1};
  if(boxes.some(b=>corridor.x<b.x+b.width&&b.x<corridor.x+1&&
   corridor.y<b.y+b.height&&b.y<corridor.y+2&&
   corridor.z<b.z+b.depth&&b.z<corridor.z+1))
   fail('FULL_CORRIDOR_FOREIGN_STAIR_SUPPORT_OR_TREAD_CLASH',p);
 }
 const impact=[...removedStaged].filter(x=>!original.has(x));
 if(impact.some(x=>!stagedWalk.has(x)))fail('RETRACTION_OUTSIDE_B114');
 const baseline=auditB122TwoWideNetwork({sourceWalk,stagedWalk});
 const replaced=auditB122TwoWideNetwork({sourceWalk,stagedWalk,
  removedStaged,extraCells:added});
 const newlyStranded=Math.max(0,replaced.notRootReachedStagedCells-baseline.notRootReachedStagedCells);
 if(newlyStranded)fail('STAGED_NETWORK_NEWLY_UNROOTED',{cells:newlyStranded});
 return {status:codes.size?'HOLD_FULL_ROUTE_REVIEW':'NO_DETECTED_CONFLICT_IN_SCOPED_PROXIES',
  issueCodes:[...codes].sort(),samples:notes,
  floor:level,side,routeFootprintCells:cells.size,
  sourceRootCellsInRoute:[...cells].filter(x=>sourceWalk.has(x)).length,
  newRouteCells:added.size,fullBodyProxyCollisions:collisions,
  removableB114Cells:impact.length,
  baselineNetwork:baseline,replannedNetwork:replaced,
  newlyUnrootedStagedCells:newlyStranded,
  rootToAllOtherStairsCertified:false,
  actualEducationCollisionCertified:false,realFloorSupportCertified:false,
  proposedEditApplied:false,constructionAllowed:false,worldContacts:0};
}

/** B116: read-only LOCAL 3D proxy audit; no Minecraft API or executable placement. */
const k=p=>p.x+','+p.z;
const k3=p=>p.x+','+p.y+','+p.z;
const sq=p=>[p,{x:p.x+1,z:p.z},{x:p.x,z:p.z+1},{x:p.x+1,z:p.z+1}];
const integer=n=>Number.isSafeInteger(n)&&Math.abs(n)<1000000;
const pt=p=>p&&integer(p.x)&&integer(p.z);
const hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height&&a.z<b.z+b.depth&&b.z<a.z+a.depth;
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;

/** Scoped source-proxy evidence ONLY. Does not prove Minecraft traversal. */
export function auditB116Corridor({proposal,level,floor,rooms=[],cores=[],stairMask,existingWalk,sourceVoxels=[],stairAABBs=[],proposedApertures=new Set()}){
 if(!integer(level)||level<0||!floor||!Array.isArray(floor.footprintRows)||!floor.footprintRows.length||
  floor.footprintRows.some(s=>typeof s!=='string'||!/^[01]+$/.test(s))||
  !(stairMask instanceof Set)||!(existingWalk instanceof Set)||!(proposedApertures instanceof Set)||
  !Array.isArray(sourceVoxels)||!Array.isArray(stairAABBs)||!Array.isArray(rooms)||!Array.isArray(cores))
  throw Error('B116_INVALID_SOURCE_INPUTS');
 if(!proposal||proposal.status!=='CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE'||
  !Array.isArray(proposal.fullFootprintCells)||!proposal.fullFootprintCells.every(pt)||
  !Array.isArray(proposal.addedCells)||!proposal.addedCells.every(pt)||
  !pt(proposal.startAnchor)||!pt(proposal.goalAnchor))throw Error('B116_INVALID_PROPOSAL');
 const issues=[],foot=new Set(proposal.fullFootprintCells.map(k)),add=new Set(proposal.addedCells.map(k));
 if(foot.size!==proposal.fullFootprintCells.length)issues.push({code:'DUPLICATE_ROUTE_FOOTPRINT'});
 if(add.size!==proposal.addedCells.length)issues.push({code:'DUPLICATE_ADDED_CELLS'});
 if([...add].some(x=>!foot.has(x)))issues.push({code:'ADDED_CELL_OUTSIDE_ROUTE'});
 const allowed=new Set();
 for(let z=0;z<floor.footprintRows.length;z++)for(let x=0;x<floor.footprintRows[z].length;x++){
  if(floor.footprintRows[z][x]!=='1')continue;
  const p={x,z};
  if(rooms.some(r=>inside(r,p))||cores.some(r=>inside(r,p))||stairMask.has(k(p)))continue;
  allowed.add(k(p));
 }
 for(const p of proposal.fullFootprintCells){
  if(!allowed.has(k(p)))issues.push({code:'SOURCE_MASK_ROOM_CORE_OR_STAIR_CONFLICT',cell:p});
  if(proposedApertures.has(k(p)))issues.push({code:'STAGED_FLOOR_APERTURE_REMOVES_SUPPORT',cell:p});
 }
 const delta=new Set([...foot].filter(x=>!existingWalk.has(x)));
 if(delta.size!==add.size||[...delta].some(x=>!add.has(x)))issues.push({code:'SOURCE_GALLERY_DELTA_MISMATCH'});
 const anchors=new Map();
 for(const p of proposal.fullFootprintCells)if(sq(p).every(q=>foot.has(k(q))))anchors.set(k(p),p);
 const start=k(proposal.startAnchor),goal=k(proposal.goalAnchor);
 if(!anchors.has(start))issues.push({code:'START_TWO_WIDE_SQUARE_MISSING'});
 if(!anchors.has(goal))issues.push({code:'GOAL_TWO_WIDE_SQUARE_MISSING'});
 const seen=new Set(),queue=anchors.has(start)?[proposal.startAnchor]:[];
 for(let i=0;i<queue.length;i++){
  const p=queue[i],id=k(p);if(seen.has(id))continue;seen.add(id);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const q={x:p.x+dx,z:p.z+dz},key=k(q);
   if(anchors.has(key)&&!seen.has(key))queue.push(q);
  }
 }
 if(!seen.has(goal))issues.push({code:'NO_CONTINUOUS_TWO_WIDE_ROUTE'});
 const covered=new Set();
 for(const p of queue)for(const q of sq(p))covered.add(k(q));
 if([...foot].some(x=>!covered.has(x)))issues.push({code:'STRANDED_ROUTE_CELL'});
 const terminal=sq(proposal.goalAnchor).filter(p=>existingWalk.has(k(p)));
 if(!terminal.some((a,i)=>terminal.slice(i+1).some(b=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1)))
  issues.push({code:'GOAL_NOT_CONNECTED_TO_TWO_ADJACENT_SOURCE_GALLERY_CELLS'});
 const source=new Map();
 for(const v of sourceVoxels){
  if(v.kind==='EXTERIOR_PORTAL_VOID_PROXY')continue;
  if(![v.x,v.y,v.z].every(integer))throw Error('B116_BAD_SOURCE_VOXEL');
  const id=k(v);if(!source.has(id))source.set(id,[]);source.get(id).push(v);
 }
 const y=level*5+1;
 for(const p of proposal.fullFootprintCells){
  const body={x:p.x,y,z:p.z,width:1,height:2,depth:1};
  for(const v of source.get(k(p))??[]){
   if(hit(body,{x:v.x,y:v.y,z:v.z,width:1,height:1,depth:1}))
    issues.push({code:'SOURCE_B105_HEADROOM_OCCUPANCY',cell:{x:p.x,y:v.y,z:p.z},kind:v.kind});
  }
  for(const b of stairAABBs){
   if(![b.x,b.y,b.z,b.width,b.height,b.depth].every(Number.isFinite))throw Error('B116_BAD_STAIR_AABB');
   if(hit(body,b))issues.push({code:'STAGED_STAIR_TREAD_OR_LANDING_AABB',cell:{x:p.x,y,z:p.z}});
  }
 }
 const uniq=new Map();
 for(const a of issues)uniq.set(a.code+':'+(a.cell?k3(a.cell):'')+':'+(a.kind??''),a);
 const distinct=[...uniq.values()];
 return {status:distinct.length?'DESIGN_REVIEW_REQUIRED':'NO_CONFLICT_IN_SCOPED_SOURCE_PROXIES',
  issues:distinct,issueCodes:[...new Set(distinct.map(x=>x.code))].sort(),
  testedFootprintCells:foot.size,reachableTwoWideAnchors:seen.size,
  sourceFloorCellsConsidered:allowed.size,stairProxyAABBCount:stairAABBs.length,
  sourceVoxelsConsidered:sourceVoxels.length,scannedBodyHeight:2,
  sourceFloorSupportOnlyConceptual:true,
  unverified:['REAL_FLOOR_SUPPORT','FACADE_REPAIRS_AND_PARTITIONS','STAIR_SUPPORT_PIERS','REAL_BEDROCK_COLLISION_AND_DOORS'],
  actualPhysicalTraversalCertified:false,constructionAllowed:false};
}

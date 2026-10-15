/** B117 source-constrained non-executable local slab and gallery feasibility diagnosis. */
const K=p=>p.x+','+p.z;
const box=p=>({x:p.x,y:p.y,z:p.z,width:1,height:1,depth:1});
const hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height&&a.z<b.z+b.depth&&b.z<a.z+a.depth;
const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;
const square=p=>[p,{x:p.x+1,z:p.z},{x:p.x,z:p.z+1},{x:p.x+1,z:p.z+1}];
const rect=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const card=v=>v&&Number.isInteger(v.dx)&&Number.isInteger(v.dz)&&Math.abs(v.dx)+Math.abs(v.dz)===1;
const validPoint=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
const flatFloor=f=>{
 if(!f||!Array.isArray(f.footprintRows)||!f.footprintRows.length||f.footprintRows.some(s=>typeof s!=='string'||!/^[01]+$/.test(s)))throw Error('B117_FLOOR_MASK_INVALID');
 const allowed=new Set();
 for(let z=0;z<f.footprintRows.length;z++)for(let x=0;x<f.footprintRows[z].length;x++)if(f.footprintRows[z][x]==='1')allowed.add(K({x,z}));
 return allowed;
};
/** Body AABBs are proxies and do not certify Minecraft collisions. */
export function studyFloorSlab({fromLevel,toLevel,lowerFloor,upperFloor,lowerLanding,upperLanding,bodyAABBs,otherOpenings=new Set()}){
 if(!Number.isInteger(fromLevel)||toLevel!==fromLevel+1||fromLevel<0||
  !Array.isArray(lowerLanding)||!Array.isArray(upperLanding)||lowerLanding.length!==2||upperLanding.length!==2||
  !lowerLanding.every(validPoint)||!upperLanding.every(validPoint)||
  !Array.isArray(bodyAABBs)||!bodyAABBs.length||!(otherOpenings instanceof Set))throw Error('B117_STAIR_SLAB_INVALID');
 const lo=flatFloor(lowerFloor),up=flatFloor(upperFloor),y=toLevel*5;
 const touching=new Map();
 for(const b of bodyAABBs){
  if(![b.x,b.y,b.z,b.width,b.height,b.depth].every(Number.isFinite)||b.width<=0||b.height<=0||b.depth<=0)throw Error('B117_STAIR_SWEEP_INVALID');
  if(b.y>=y+1||b.y+b.height<=y)continue;
  for(let z=Math.floor(b.z);z<Math.ceil(b.z+b.depth);z++)for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.width);x++){
   const p={x,y,z};
   if(up.has(K(p))&&hit(b,box(p)))touching.set(K(p),p);
  }
 }
 const touched=[...touching.values()].sort((a,b)=>a.z-b.z||a.x-b.x),landingKeys=new Set(upperLanding.map(K));
 const preserved=touched.filter(p=>landingKeys.has(K(p))),open=touched.filter(p=>!landingKeys.has(K(p)));
 const masks={lowerLandingSupport:lowerLanding.filter(p=>lo.has(K(p))).length,
  upperLandingSupport:upperLanding.filter(p=>up.has(K(p))).length};
 const roomTouches=open.filter(p=>(upperFloor.rooms??[]).some(r=>rect(r,p)));
 const galleryTouches=open.filter(p=>(upperFloor.gallery??[]).some(q=>K(q)===K(p)));
 const foreignOverlaps=open.filter(p=>otherOpenings.has(K(p)));
 const issues=[];
 if(masks.lowerLandingSupport!==2)issues.push('LOWER_LANDING_SOURCE_FLOOR_INCOMPLETE');
 if(masks.upperLandingSupport!==2)issues.push('UPPER_LANDING_SOURCE_FLOOR_INCOMPLETE');
 if(preserved.length)issues.push('UPPER_LANDING_BODY_SWEEP_REQUIRES_FINE_STEP_REVIEW');
 if(roomTouches.length)issues.push('PROPOSED_OPENING_TOUCHES_SOURCE_ROOM');
 if(galleryTouches.length)issues.push('PROPOSED_OPENING_TOUCHES_SOURCE_GALLERY');
 if(foreignOverlaps.length)issues.push('OPENING_OVERLAPS_OTHER_REVIEW_CANDIDATE');
 return {status:issues.length?'HOLD_DESIGN_REVIEW':'CONCEPTUAL_SLAB_MASK_ONLY',issueCodes:issues,
  upperFloorY:y,sourceFloorCells:up.size,bodySweepFloorTouches:touched.length,
  conceptualOpeningCells:open,upperLandingFloorRetained:upperLanding.map(p=>({x:p.x,y,z:p.z})),
  protectedLandingSweepTouches:preserved.length,lowerLandingSupported:masks.lowerLandingSupport,
  upperLandingSupported:masks.upperLandingSupport,roomOpeningConflicts:roomTouches.length,
  galleryOpeningConflicts:galleryTouches.length,foreignOpeningOverlap:foreignOverlaps.length,
  doesNotApplyAnyFloorRemoval:true,sourceFloorMaskUnchanged:true,realSlabSupportCertified:false,
  realMinecraftTraversalCertified:false};
}
export function diagnoseTwoWideExit({floor,landing,ascent,side,stairCells,walk}){
 if(!Array.isArray(landing)||landing.length!==2||!landing.every(validPoint)||!adjacent(landing[0],landing[1])||
  !card(ascent)||!['LOWER','UPPER'].includes(side)||!(stairCells instanceof Set)||!(walk instanceof Set))
  throw Error('B117_GALLERY_INPUT_INVALID');
 const footprint=flatFloor(floor),forward=side==='UPPER'?ascent:{dx:-ascent.dx,dz:-ascent.dz};
 const row=landing.flatMap(p=>[{x:p.x+forward.dx,z:p.z+forward.dz},
  {x:p.x+2*forward.dx,z:p.z+2*forward.dz}]);
 const start={x:Math.min(...row.map(p=>p.x)),z:Math.min(...row.map(p=>p.z))};
 const defects=[],allowed=new Set();
 const rooms=floor.rooms??[],cores=floor.__b117Cores??[];
 for(let z=0;z<floor.footprintRows.length;z++)for(let x=0;x<floor.footprintRows[z].length;x++){
  const p={x,z};if(!footprint.has(K(p)))continue;
  if(rooms.some(r=>rect(r,p))||cores.some(r=>rect(r,p))||stairCells.has(K(p)))continue;
  allowed.add(K(p));
 }
 for(const p of square(start)){
  if(!footprint.has(K(p)))defects.push({cell:p,reason:'NO_SOURCE_FLOOR'});
  else if(rooms.some(r=>rect(r,p)))defects.push({cell:p,reason:'PROTECTED_ROOM'});
  else if(cores.some(r=>rect(r,p)))defects.push({cell:p,reason:'PROTECTED_CORE'});
  else if(stairCells.has(K(p)))defects.push({cell:p,reason:'ACTIVE_STAIR_FOOTPRINT'});
 }
 const anchors=new Map();
 for(let z=0;z<floor.footprintRows.length-1;z++)for(let x=0;x<floor.footprintRows[z].length-1;x++){
  const p={x,z};if(square(p).every(q=>allowed.has(K(q))))anchors.set(K(p),p);
 }
 const visited=new Set(),q=anchors.has(K(start))?[start]:[];
 for(let i=0;i<q.length;i++){
  const p=q[i],id=K(p);if(visited.has(id))continue;visited.add(id);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const t={x:p.x+dx,z:p.z+dz};if(anchors.has(K(t))&&!visited.has(K(t)))q.push(t);
  }
 }
 const terminal=new Set();
 for(const p of anchors.values()){
  const present=square(p).filter(t=>walk.has(K(t)));
  if(present.some((a,i)=>present.slice(i+1).some(b=>adjacent(a,b))))terminal.add(K(p));
 }
 const reach=[...visited].some(x=>terminal.has(x));
 const reason=defects.length?'FIRST_TWO_ROWS_BLOCKED':!reach?'TWO_WIDE_SOURCE_GALLERY_DISCONNECTED':'B114_GENERATION_OR_REPLAY_DISAGREEMENT';
 return {status:'HOLD_DESIGN_REVIEW',reason,initial2x2Anchor:start,
  firstTwoRowsDefects:defects,sourceFloorMaskCells:footprint.size,
  allowed2x2Anchors:anchors.size,reachableAnchors:visited.size,
  sourceGalleryTerminalAnchors:terminal.size,reachesSourceGallery:reach,
  suggestedInvestigation:defects.length?'REDESIGN_STAIR_EXIT_OR_CORE_WITH_OWNER_APPROVAL':
   !reach?'REDESIGN_2_WIDE_GALLERY_MASK_WITHOUT_PROTECTED_ROOM_MOVES':'AUDIT_B114_SOURCE_REPLAY',
  proposedSourceCellChanges:0,doesNotModifyOriginalDesign:true,
  physicalNavigationCertified:false};
}

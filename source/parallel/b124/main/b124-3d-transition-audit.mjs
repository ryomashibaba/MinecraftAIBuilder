/** B124: independent scoped 3D voxel/AABB preflight for B122 2-wide stair-corridor.
 * NO block placement, Education physics certification or physical support claim.
 */
const K=p=>p.x+','+p.z;
const Q=p=>p.x+','+p.y+','+p.z;
const cell=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;
const hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&
 a.y<b.y+b.height&&b.y<a.y+a.height&&a.z<b.z+b.depth&&b.z<a.z+a.depth;
const unit=p=>({x:p.x,y:p.y,z:p.z,width:1,height:1,depth:1});
function checkBox(b){
 if(!b||![b.x,b.y,b.z,b.width,b.height,b.depth].every(Number.isFinite)||
  [b.width,b.height,b.depth].some(n=>n<=0))throw Error('B124_INVALID_AABB');
}
function validFloor(f){
 if(!Array.isArray(f?.footprintRows)||!f.footprintRows.length||
 f.footprintRows.some(row=>typeof row!=='string'||!/^[01]+$/.test(row))||
 !Array.isArray(f.rooms)||!Array.isArray(f.gallery))throw Error('B124_INVALID_SOURCE_FLOOR');
}
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
function pairedSeam(landing,route,stairCells) {
 if(!Array.isArray(landing)||landing.length!==2||!landing.every(cell)||
 !adjacent(landing[0],landing[1]))throw Error('B124_INVALID_TWO_LANE_LANDING');
 const routeSet=new Set(route.map(K));
 const opts=landing.map(p=>[[-1,0],[1,0],[0,-1],[0,1]]
  .map(([dx,dz])=>({x:p.x+dx,z:p.z+dz}))
  .filter(n=>routeSet.has(K(n))&&!stairCells.has(K(n))));
 return opts[0].some(a=>opts[1].some(b=>K(a)!==K(b)&&adjacent(a,b)));
}
export function auditB124StairCorridor3D({model,lowerFloor,upperFloor,
 lowerRoute,upperRoute,sourceVoxels=[],foreignStairSolids=[],
 foreignOpeningCells=new Set()}) {
 if(!model||!Number.isInteger(model.fromLevel)||model.fromLevel<0||
 !Array.isArray(model.footprint)||!model.footprint.every(cell)||
 !Array.isArray(model.lowerLanding)||!Array.isArray(model.upperLanding)||
 !Array.isArray(model.body)||!model.body.length||
 !Array.isArray(model.treads)||!Array.isArray(model.supports)||
 !Array.isArray(model.platform??[])||
 !Array.isArray(lowerRoute)||!Array.isArray(upperRoute)||
 !lowerRoute.length||!upperRoute.length||
 !lowerRoute.every(cell)||!upperRoute.every(cell)||
 !Array.isArray(sourceVoxels)||!Array.isArray(foreignStairSolids)||
 !(foreignOpeningCells instanceof Set))
 throw Error('B124_INVALID_REVIEW_INPUT');
 validFloor(lowerFloor);validFloor(upperFloor);
 const own=[...model.treads,...(model.platform??[]),...model.supports];
 for(const b of [...model.body,...own,...foreignStairSolids])checkBox(b);
 for(const p of sourceVoxels)if(![p.x,p.y,p.z].every(Number.isSafeInteger))
  throw Error('B124_INVALID_B105_VOXEL');
 const staticIndex=new Map(sourceVoxels.filter(v=>v.kind!=='EXTERIOR_PORTAL_VOID_PROXY')
  .map(p=>[Q(p),p]));
 const issues=new Map();
 const sample=(code,p)=>{let v=issues.get(code);
  if(!v){v={code,hits:0,samples:[]};issues.set(code,v);}
  v.hits++;
  if(v.samples.length<12)v.samples.push(p);
 };
 const mask=(f,p)=>f.footprintRows[p.z]?.[p.x]==='1';
 const level=model.fromLevel, upper=level+1, upperY=upper*5;
 const footprint=new Set(model.footprint.map(K));
 const seenSlab=new Map();
 for(const b of model.body) {
  if(b.y>=upperY+1||b.y+b.height<=upperY)continue;
  for(let z=Math.floor(b.z);z<Math.ceil(b.z+b.depth);z++)
   for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.width);x++){
    const p={x,y:upperY,z};
    if(mask(upperFloor,p)&&hit(b,unit(p)))seenSlab.set(K(p),p);
   }
 }
 const landingTop=new Set(model.upperLanding.map(K));
 const upperSlabCuts=[...seenSlab.values()].filter(p=>!landingTop.has(K(p)));
 const landingSweepTouches=[...seenSlab].filter(([id])=>landingTop.has(id)).length;
 for(const p of upperSlabCuts){
  if(upperFloor.rooms.some(r=>inside(r,p)))sample('STAIR_OPENING_OVER_PROTECTED_ROOM',p);
  if(upperFloor.gallery.some(g=>K(g)===K(p)))sample('STAIR_OPENING_OVER_PROTECTED_SOURCE_GALLERY',p);
  if(foreignOpeningCells.has(K(p)))sample('STAIR_OPENING_OVER_OTHER_STAIR_OPENING',p);
 }
 if(model.lowerLanding.some(p=>!mask(lowerFloor,p)))
  sample('LOWER_LANDING_SOURCE_SUPPORT_ABSENT',{landing:model.lowerLanding});
 if(model.upperLanding.some(p=>!mask(upperFloor,p)))
  sample('UPPER_LANDING_SOURCE_SUPPORT_ABSENT',{landing:model.upperLanding});
 const cut=new Set(upperSlabCuts.map(K));
 const staticHits=new Set(),ownHits=new Set(),foreignHits=new Set();
 const scan=(side,floor,route,lvl,landing)=>{
  const seam=pairedSeam(landing,route,footprint);
  if(!seam)sample('NO_ADJACENT_TWO_LANE_CORRIDOR_SEAM',{side,landing});
  const unique=new Set(route.map(K));
  if(unique.size!==route.length)sample('DUPLICATED_CORRIDOR_CELL',{side});
  for(const p of route){
   if(!mask(floor,p))sample('CORRIDOR_SOURCE_FLOOR_ABSENT',{side,...p});
   if(lvl===upper&&cut.has(K(p)))sample('CORRIDOR_OVER_REQUIRED_STAIR_SLAB_OPENING',{side,...p});
   if(lvl===upper&&foreignOpeningCells.has(K(p)))sample('CORRIDOR_OVER_OTHER_STAIR_OPENING',{side,...p});
   const walk={x:p.x,y:lvl*5+1,z:p.z,width:1,height:2,depth:1};
   for(let y=lvl*5+1;y<=lvl*5+2;y++){
    const id=Q({x:p.x,y,z:p.z}),v=staticIndex.get(id);
    if(v&&!staticHits.has(side+':'+id)){
     staticHits.add(side+':'+id);
     sample('CORRIDOR_3D_STATIC_VOXEL_OCCUPIED',{side,x:p.x,y,z:p.z,kind:v.kind});
    }
   }
   if(own.some(b=>hit(walk,b))&&!ownHits.has(side+':'+K(p))){
    ownHits.add(side+':'+K(p));
    sample('CORRIDOR_BODY_OVER_PROPOSED_STAIR_SOLID',{side,...p});
   }
   if(foreignStairSolids.some(b=>hit(walk,b))&&!foreignHits.has(side+':'+K(p))){
    foreignHits.add(side+':'+K(p));
    sample('CORRIDOR_BODY_OVER_FOREIGN_STAIR_SOLID',{side,...p});
   }
  }
  return {side,level:lvl,corridorCells:unique.size,seamTwoLanesAdjacent:seam,
   corridorProxyClearanceHeightBlocks:2,
   actualEducationCollisionCertified:false};
 };
 const sides=[
  scan('LOWER',lowerFloor,lowerRoute,level,model.lowerLanding),
  scan('UPPER',upperFloor,upperRoute,upper,model.upperLanding)];
 return {
  status:issues.size?'HOLD_3D_TRANSITION_REVIEW':'NO_NEW_CONFLICT_IN_SCOPED_3D_PROXIES',
  issueCodes:[...issues.keys()].sort(),findings:[...issues.values()].sort((a,b)=>a.code.localeCompare(b.code)),
  fromLevel:level,toLevel:upper,upperSlabY:upperY,
  stairSweptSourceFloorCells:seenSlab.size,
  conceptualNewUpperOpeningCells:upperSlabCuts.length,
  conceptualOpeningSamples:upperSlabCuts.slice(0,24),
  protectedUpperLandingSweepTouches:landingSweepTouches,
  upperLandingFineStepCollisionReviewNeeded:landingSweepTouches>0,
  lowerAndUpper:sides,
  proposedGeometryApplied:false,worldContacts:0,constructionAllowed:false,
  physicalStairBlockStatesCertified:false,realFloorSupportCertified:false,
  realPlayerStepAndDoorClearanceCertified:false,
  sourceBuildingAndFloorMasksUnchanged:true
 };
}

/**
 * R125 source-only graph: a 2-block-wide x-axis standing pad, with 2-block
 * headroom and an underlying pair of supporting voxels. One horizontal move
 * may change standing height by at most 1. Starts JUST INSIDE the entrance.
 * Optional feature service frontage uses the same source-only graph.
 * This is NOT game physics, jumping, mob pathfinding, or world certification.
 */
import {verifyCompiled} from './b143-building-dsl.mjs';
const err=msg=>{throw Error('R125_ROUTE_'+msg);};
const key=(x,y,z)=>x+','+y+','+z;
export function auditR125SourceRoutes(product,{featureTargets=[]}={}){
 // ArchitecturePlan permits 2 levels x 3 rooms x 3 authored utilities.
 // Audit every permitted utility rather than rejecting the thirteenth.
 if(!Array.isArray(featureTargets)||featureTargets.length>18)
  err('FEATURE_TARGET_CONTRACT');
 if(product?.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
  !product.design||!product.compiled||!Array.isArray(product.program)||
  !verifyCompiled(product.design,product.compiled))err('UNVERIFIED_SOURCE');
 const design=product.design,compiled=product.compiled;
 const {width:w,height:h,depth:d}=design.bounds;
 const occupied=new Set(compiled.primitives.map(p=>key(p[0],p[1],p[2])));
 const has=(x,y,z)=>occupied.has(key(x,y,z));
 const pads=new Map();
 for(let y=1;y<h-1;y++)for(let z=0;z<d;z++)for(let x=0;x<w-1;x++){
  if(has(x,y-1,z)&&has(x+1,y-1,z)&&
   !has(x,y,z)&&!has(x+1,y,z)&&
   !has(x,y+1,z)&&!has(x+1,y+1,z)){
   const id=key(x,y,z);
   pads.set(id,{x,y,z});
  }
 }
 // Explicit doorway required; its interior threshold starts inside the
 // building footprint, not outside where terrain support is unknown.
 const entrance=design.elements.find(e=>e.id==='exterior-entrance'&&
  e.mode==='cut'&&e.shape==='box');
 const issues=[];
 if(!entrance||entrance.size[0]<2||entrance.size[1]<2)
  issues.push('MISSING_VALID_TWO_WIDE_EXTERIOR_CUT');
 const start=entrance?{x:entrance.origin[0],y:entrance.origin[1],
  z:entrance.origin[2]+1}:null;
 if(!start||!pads.has(key(start.x,start.y,start.z)))
  issues.push('INTERIOR_ENTRANCE_THRESHOLD_NOT_CLEAR');
 if(entrance&&
  (has(entrance.origin[0],entrance.origin[1],entrance.origin[2])||
   has(entrance.origin[0]+1,entrance.origin[1],entrance.origin[2])))
  issues.push('ENTRANCE_OPENING_BLOCKED');
 const distances=new Map(),queue=[];
 if(issues.length===0){
  const k=key(start.x,start.y,start.z);
  distances.set(k,0);queue.push(start);
 }
 const steps=[[1,0],[-1,0],[0,1],[0,-1]];
 for(let index=0;index<queue.length;index++){
  const p=queue[index],dist=distances.get(key(p.x,p.y,p.z));
  for(const [dx,dz] of steps)for(const dy of [0,1,-1]){
   const x=p.x+dx,z=p.z+dz,y=p.y+dy,k=key(x,y,z);
   if(pads.has(k)&&!distances.has(k)){
    distances.set(k,dist+1);queue.push(pads.get(k));
   }
  }
 }
 const zones=[];
 for(const level of product.program)for(const zone of level.zones){
  let best=null,bestDistance=Infinity,reachedTwoWidePadCount=0;
  for(const [k,n] of distances){
   const p=pads.get(k);
   if(p.y!==level.standingFloorY||p.x<zone.range.x[0]||
    p.x+1>zone.range.x[1]||p.z<zone.range.z[0]||
    p.z>zone.range.z[1])continue;
   reachedTwoWidePadCount++;
   if(n<bestDistance){bestDistance=n;best=[p.x,p.y,p.z];}
  }
  const reachable=best!==null;
  if(!reachable)issues.push('UNREACHABLE_ZONE_'+zone.id);
  zones.push({id:zone.id,level:level.level,
   standingFloorY:level.standingFloorY,
   reachedFromEntrance:reachable,reachedTwoWidePadCount,
   sourceWitness:best,sourceGraphMoves:reachable?bestDistance:null});
 }
 // Check the upper landing is in the same connected source component as
 // the doorway, not just a geometrically supported isolated upper floor.
 const upper=product.program.length>1?zones.filter(x=>x.level>0):[];
 if(upper.length&&!upper.every(x=>x.reachedFromEntrance))
  issues.push('UPPER_PROGRAM_NOT_CONNECTED_TO_INTERIOR_THRESHOLD');
 // A room being reachable says nothing about its equipment. Optional
 // source-only service-side witnesses require 2-wide supported clear pads
 // immediately adjacent to a proposed item and connected to the entrance.
 // No claim about the player's actual interaction range or game physics.
 const featureAccess=[];
 const zoneMap=new Map(product.program.flatMap(l=>l.zones.map(z=>
  [z.id,{range:z.range,y:l.standingFloorY}])));
 const seenFeatureIds=new Set();
 for(const target of featureTargets){
  const {id,zoneId,origin,size}=target??{};
  if(typeof id!=='string'||!id||seenFeatureIds.has(id)||
   !zoneMap.has(zoneId)||!Array.isArray(origin)||origin.length!==3||
   !origin.every(Number.isSafeInteger)||!Array.isArray(size)||
   size.length!==3||!size.every(n=>Number.isSafeInteger(n)&&n>0))
   err('INVALID_FEATURE_TARGET');
  seenFeatureIds.add(id);
  const {range,y}=zoneMap.get(zoneId),[x0,fy,z0]=origin;
  const [sx,,sz]=size;
  // Optional restriction for source-verified VIEWING WINDOWS. Ordinary
  // furniture feature targets keep exactly the historical any-side rule.
  const requiredSide=target.requiredServiceSide??null;
  if(requiredSide!==null&&!['near','far','left','right'].includes(requiredSide))
   err('INVALID_FEATURE_SERVICE_SIDE');
  let best=null,bestDistance=Infinity,side=null;
  for(const [padId,distance] of distances){
   const pad=pads.get(padId);
   if(pad.y!==y||fy!==y||pad.x<range.x[0]||
    pad.x+1>range.x[1]||pad.z<range.z[0]||
    pad.z>range.z[1])continue;
   const frontX=pad.x>=x0&&pad.x+1<x0+sx;
   const near=frontX&&pad.z===z0-1;
   const far=frontX&&pad.z===z0+sz;
   const left=pad.x+1===x0-1&&pad.z>=z0&&pad.z<z0+sz;
   const right=pad.x===x0+sx&&pad.z>=z0&&pad.z<z0+sz;
   const approach=near?'near':far?'far':left?'left':right?'right':null;
   if(approach!==null&&(requiredSide===null||approach===requiredSide)&&
      distance<bestDistance){
    bestDistance=distance;best=[pad.x,pad.y,pad.z];
    side=approach;
   }
  }
  const reached=best!==null;
  if(!reached)issues.push('UNREACHABLE_FEATURE_SERVICE_'+id);
  featureAccess.push({id,zoneId,sourceServiceSide:side,
   supportedTwoWideServiceWitness:best,
   reachableFromEntrance:reached,
   sourceGraphMoves:reached?bestDistance:null});
 }
 return {
  schema:'r125-two-wide-source-route-audit-v1',
  status:issues.length?'HOLD_SOURCE_ROUTES':'SOURCE_ROUTES_REACH_ALL_ZONES',
  issues,sourceSha256:product.sourceSha256,
  geometrySha256:product.geometrySha256,
  graphDefinition:'2-wide x-axis pads, 2-air headroom, horizontal neighbor with dy<=1',
  verifiedPadCount:pads.size,reachedPadCount:distances.size,
  sourceInteriorEntrance:start,zones,featureAccess,
  externalTerrainNotChecked:true,
  sourceGraphOnly:true,
  stairsGamePhysicsUnverified:true,
  continuousRealPlayerPathCertified:false,
  worldCoordinates:null,worldWrites:0
 };
}

/**
 * SOURCE-only visitor audit: two-wide supported B143 movement pads excluding
 * the original model's staff room footprints. It does not change the plan,
 * repair the building, verify Minecraft walking, or infer privacy by genre.
 */
export function auditR125VisitorRoutes(product,plan){
 if(product?.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
   !product.design||!product.compiled||!Array.isArray(product.program)||
   !verifyCompiled(product.design,product.compiled)||
   !Array.isArray(plan?.levels)||plan.levels.length!==product.program.length)
  err('VISITOR_INPUT');
 const all=plan.levels.flatMap(level=>level.spaces);
 const common={sourceOnly:true,modelCalls:0,worldWrites:0,
  originalEdited:false,realMinecraftWalking:'NOT_TESTED',
  artStatus:'NOT_REVIEWED'};
 if(!all.some(s=>s.access!==undefined))
  return {...common,status:'NOT_DECLARED_LEGACY',blocked:[]};
 if(all.some(s=>!['public','shared','staff'].includes(s.access)))
  return {...common,status:'HOLD_INCOMPLETE_ACCESS',blocked:[]};
 const access=new Map(all.map(s=>[s.id,s.access]));
 const zones=product.program.flatMap(l=>l.zones.map(z=>({
  ...z,standingFloorY:l.standingFloorY,access:access.get(z.id)})));
 if(zones.length!==all.length||zones.some(z=>!access.has(z.id)))
  err('VISITOR_ROOM_MISMATCH');
 const staff=zones.filter(z=>z.access==='staff');
 const visitor=zones.filter(z=>z.access!=='staff');
 if(visitor.length===0)return {...common,status:'NO_VISITOR_ROOMS_AUTHORED',
  visitorRooms:0,staffRooms:staff.length,blocked:[]};
 const solids=new Set(product.compiled.primitives.map(p=>key(p[0],p[1],p[2])));
 const has=(x,y,z)=>solids.has(key(x,y,z));
 const {width:w,height:h,depth:d}=product.design.bounds;
 const pads=new Map();
 for(let y=1;y<h-1;y++)for(let z=0;z<d;z++)for(let x=0;x<w-1;x++){
  if(!has(x,y-1,z)||!has(x+1,y-1,z)||
     has(x,y,z)||has(x+1,y,z)||has(x,y+1,z)||has(x+1,y+1,z))
   continue;
  if(staff.some(s=>s.standingFloorY===y&&z>=s.range.z[0]&&
    z<=s.range.z[1]&&x<=s.range.x[1]&&x+1>=s.range.x[0]))
   continue;
  pads.set(key(x,y,z),{x,y,z});
 }
 const entry=product.design.elements.find(e=>e.id==='exterior-entrance'&&
  e.mode==='cut'&&e.shape==='box'&&e.size[0]>=2&&e.size[1]>=2);
 const root=entry?key(entry.origin[0],entry.origin[1],entry.origin[2]+1):null;
 const queue=[],distance=new Map();
 if(root&&pads.has(root)){queue.push(pads.get(root));distance.set(root,0);}
 for(let i=0;i<queue.length;i++){
  const p=queue[i],dist=distance.get(key(p.x,p.y,p.z));
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])
   for(const dy of [0,1,-1]){
    const k=key(p.x+dx,p.y+dy,p.z+dz);
    if(pads.has(k)&&!distance.has(k)){
     distance.set(k,dist+1);queue.push(pads.get(k));
    }
   }
 }
 const witnesses=visitor.map(z=>{
  let best=null,steps=Infinity;
  for(const [k,d] of distance){
   const p=pads.get(k);
   if(p.y!==z.standingFloorY||p.x<z.range.x[0]||
     p.x+1>z.range.x[1]||p.z<z.range.z[0]||
     p.z>z.range.z[1]||d>=steps)continue;
   best=[p.x,p.y,p.z];steps=d;
  }
  return {id:z.id,access:z.access,reached:best!==null,
   sourceWitness:best,sourceGraphMoves:best===null?null:steps};
 });
 const blocked=witnesses.filter(w=>!w.reached).map(w=>w.id);
 return {...common,status:blocked.length?'HOLD_VISITOR_STAFF_SEPARATION':
  'SOURCE_VISITOR_ROUTES_AVOID_STAFF',
  visitorRooms:visitor.length,staffRooms:staff.length,
  blocked,witnesses,sourceSha256:product.sourceSha256,
  geometrySha256:product.geometrySha256,
  modelAuthoredRoomRolesOnly:true,physicalVisitorWalkingNotCertified:true};
}

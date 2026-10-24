/**
 * R125 source-only graph: a 2-block-wide x-axis standing pad, with 2-block
 * headroom and an underlying pair of supporting voxels. One horizontal move
 * may change standing height by at most 1. Starts JUST INSIDE the entrance.
 * This is NOT game physics, jumping, mob pathfinding, or world certification.
 */
import {verifyCompiled} from './b143-building-dsl.mjs';
const err=msg=>{throw Error('R125_ROUTE_'+msg);};
const key=(x,y,z)=>x+','+y+','+z;
export function auditR125SourceRoutes(product){
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
  let best=null,bestDistance=Infinity;
  for(const [k,n] of distances){
   const p=pads.get(k);
   if(p.y!==level.standingFloorY||p.x<zone.range.x[0]||
    p.x+1>zone.range.x[1]||p.z<zone.range.z[0]||
    p.z>zone.range.z[1])continue;
   if(n<bestDistance){bestDistance=n;best=[p.x,p.y,p.z];}
  }
  const reachable=best!==null;
  if(!reachable)issues.push('UNREACHABLE_ZONE_'+zone.id);
  zones.push({id:zone.id,level:level.level,
   standingFloorY:level.standingFloorY,
   reachedFromEntrance:reachable,
   sourceWitness:best,sourceGraphMoves:reachable?bestDistance:null});
 }
 // Check the upper landing is in the same connected source component as
 // the doorway, not just a geometrically supported isolated upper floor.
 const upper=product.program.length>1?zones.filter(x=>x.level>0):[];
 if(upper.length&&!upper.every(x=>x.reachedFromEntrance))
  issues.push('UPPER_PROGRAM_NOT_CONNECTED_TO_INTERIOR_THRESHOLD');
 return {
  schema:'r125-two-wide-source-route-audit-v1',
  status:issues.length?'HOLD_SOURCE_ROUTES':'SOURCE_ROUTES_REACH_ALL_ZONES',
  issues,sourceSha256:product.sourceSha256,
  geometrySha256:product.geometrySha256,
  graphDefinition:'2-wide x-axis pads, 2-air headroom, horizontal neighbor with dy<=1',
  verifiedPadCount:pads.size,reachedPadCount:distances.size,
  sourceInteriorEntrance:start,zones,
  externalTerrainNotChecked:true,
  sourceGraphOnly:true,
  stairsGamePhysicsUnverified:true,
  continuousRealPlayerPathCertified:false,
  worldCoordinates:null,worldWrites:0
 };
}

/**
 * R190-AU — genuinely obligatory open-air civic sequence.
 * Unlike reachability of independently placed anchors, the source walkable
 * path from entrance to destination MUST cross the authored open-sky forum.
 * All voxels come from verified B143 source. Never edit source to make it pass.
 */
import {R190AT_SCHEMA,reviewR190ATZones} from './r190at-functional-zones.mjs';
export const R190AU_SCHEMA='minecraftaibuilder-r190au-mandatory-civic-route-v1';
const fail=x=>{throw Error('R190AU_'+x);};
const ok=(v,x)=>{if(!v)fail(x);};
const keys=(v,k)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===k.length&&k.every(s=>Object.hasOwn(v,s));
const K=(x,z)=>x+','+z,cell=(x,y,z)=>x+','+y+','+z;
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,art:'ART_HOLD'});
const flood=(pads,origin,excluded)=>{
 const start=K(origin[0],origin[1]),visited=new Set(),queue=[],parents=new Map();
 if(!pads.has(start)||excluded.has(start))return {visited,parents};
 visited.add(start);queue.push(origin);
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,nz=z+dz,key=K(nx,nz);
   if(pads.has(key)&&!excluded.has(key)&&!visited.has(key)){
    visited.add(key);parents.set(key,K(x,z));queue.push([nx,nz]);
   }
  }
 }
 return {visited,parents};
};
const reconstruct=(destination,origin,parents)=>{
 let k=K(destination[0],destination[1]),first=K(origin[0],origin[1]);
 const route=[k];let count=0;
 while(k!==first){
  if(!parents.has(k)||count++>10000)fail('PATH_RECONSTRUCTION');
  k=parents.get(k);route.push(k);
 }
 route.reverse();return route.map(s=>s.split(',').map(Number));
};
export function reviewR190AUMandatoryForum(raw){
 ok(keys(raw,['schema','design','sequence'])&&raw.schema===R190AU_SCHEMA,
  'TOP_LEVEL');
 const q=structuredClone(raw);
 ok(q.design?.schema===R190AT_SCHEMA&&
  keys(q.sequence,['arrival','forum','destination']),'SEQUENCE_FIELDS');
 const ids=[q.sequence.arrival,q.sequence.forum,q.sequence.destination];
 ok(ids.every(x=>typeof x==='string')&&new Set(ids).size===3,'ANCHOR_IDENTITIES');
 const anchors=new Map(q.design.parti.programAnchors.map(a=>[a.id,a]));
 const a=ids.map(id=>anchors.get(id));ok(a.every(Boolean),'ANCHOR_NOT_DEFINED');
 const zones=q.design.functionalZones.filter(z=>z.kind==='open-sky');
 ok(zones.length===1&&zones[0].anchorId===ids[1],'FORUM_ZONE_ANCHOR');
 const sky=q.design.parti.voids.find(v=>v.role==='open-sky')?.geometry;
 ok(sky?.shape==='box','AUTHOR_OPEN_SKY_REQUIRED');
 const z=zones[0];const [sx,,sz]=sky.origin,[sw,,sd]=sky.size;
 ok(z.origin[0]===sx&&z.origin[1]===sz&&
    z.size[0]===sw&&z.size[1]===sd,'FORUM_ZONE_NOT_ENTIRE_AUTHORED_SKY');
 ok(a[0].x+1<sx&&a[2].x>=sx+sw,'WEST_TO_EAST_SEQUENCING');
 const study=reviewR190ATZones(q.design);
 const occupied=new Set(study.source.compiled.primitives.map(v=>cell(v[0],v[1],v[2])));
 const pads=new Set(),forumPads=new Set(),footprints=new Set();
 for(let x=0;x<q.design.parti.site.width-1;x++)
  for(let zz=0;zz<q.design.parti.site.depth-1;zz++){
   let valid=true;
   for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
    const X=x+dx,Z=zz+dz;
    if(!occupied.has(cell(X,0,Z))||!occupied.has(cell(X,1,Z))||
      occupied.has(cell(X,2,Z))||occupied.has(cell(X,3,Z)))valid=false;
   }
   if(valid){
    const key=K(x,zz);pads.add(key);
    if(x>=sx&&x+1<sx+sw&&zz>=sz&&zz+1<sz+sd)forumPads.add(key);
   }
  }
 const entry=[a[0].x,a[0].z],civic=[a[1].x,a[1].z],
   end=[a[2].x,a[2].z];
 ok(pads.has(K(...entry))&&pads.has(K(...civic))&&
   pads.has(K(...end)),'AUTHOR_ANCHOR_NOT_WALKABLE');
 const complete=flood(pads,entry,new Set());
 ok(complete.visited.has(K(...end)),'DESTINATION_NOT_REACHABLE');
 const shortest=reconstruct(end,entry,complete.parents);
 const courtyardSteps=shortest.filter(p=>forumPads.has(K(...p))).length;
 ok(courtyardSteps>0,'DIRECT_WITNESS_AVOIDS_FORUM');
 const avoidance=flood(pads,entry,forumPads);
 ok(!avoidance.visited.has(K(...end)),'FORUM_HAS_WALKABLE_BYPASS');
 const impossibleWithoutForum=true;
 ok(complete.visited.has(K(...civic)),'CIVIC_ANCHOR_NOT_IN_CONNECTED_WALK');
 ok(study.structure.detachedVoxelCount===0&&
    study.source.audit.allAnchorsReachable===true,'STRUCTURE_OR_ROUTE_FAILED');
 const relief=q.design.parti.voids.filter(v=>v.role==='spatial-relief');
 const realOps=new Map(study.source.compiled.stats.designOperations.map(x=>[x.element,x]));
 ok(relief.length>=2&&relief.every(v=>realOps.get(v.geometry.id)?.removed>=8),
   'AUTHORED_FLOOR_RELIEF_HAS_NO_EFFECT');
 return {schema:'minecraftaibuilder-r190au-mandatory-civic-review-v1',
  input:q,source:study,
  routeAudit:{
   actualB143GeometrySha256:study.source.compiled.geometrySha256,
   sourceWalkableTwoWidePads:pads.size,
   actualForumWalkablePads:forumPads.size,
   anchorIds:ids,
   sourceRouteWitness:shortest,
   shortestWitnessSteps:shortest.length-1,
   shortestWitnessForumPadSteps:courtyardSteps,
   bypassReachableWithoutSky:false,
   everyTwoWideGroundRouteRequiresSky:true,
   proof:'BFS_NO_ALTERNATE_PATH_AFTER_EXCLUDING_AUTHOR_SKY_PADS',
   sourceFullySupported:true,
   sourceHeadClearanceLayers:[2,3],
   minecraftPlayerWalk:'NOT_TESTED',
   architecturalExperience:'NOT_CERTIFIED'
  },
  noAutomaticGeometryRepairs:true,
  modelCallsByReview:0,...safety()};
}

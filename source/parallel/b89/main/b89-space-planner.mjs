/** B89 deterministic offline room/corridor zoning redraft. NO executors / world positions. */
import {key,maskHasFloor} from '../../b79/main/compile-b79.mjs';
import {corridorNetwork,walkable} from '../../b88/main/compile-b88.mjs';
const DIRS=[{x:0,z:-1},{x:1,z:0},{x:0,z:1},{x:-1,z:0}];
const site=p=>typeof p==='string'?p:key(p);
const contains=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const cells=r=>{const a=[];for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)a.push({x,z});return a;};
const coord=k=>{const [x,z]=k.split(',').map(Number);return {x,z}};
const move=(p,d)=>({x:p.x+d.x,z:p.z+d.z});
const sorted=a=>[...a].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
const blank=()=>({solids:new Set(),reserved:new Set(),protectedSites:new Set()});
export function optionsForRoom(room,shape,{maxShift=3,minRatio=.75,maxRatio=1.33}={}){
 const options=[],targetArea=room.width*room.depth;
 for(let dw=-2;dw<=2;dw++)for(let dd=-2;dd<=2;dd++)for(let ox=-maxShift;ox<=maxShift;ox++)for(let oz=-maxShift;oz<=maxShift;oz++){
  const x=room.x+ox,z=room.z+oz,width=room.width+dw,depth=room.depth+dd,area=width*depth;
  if(width<2||depth<2||area<targetArea*minRatio||area>targetArea*maxRatio)continue;
  if(x===room.x&&z===room.z&&width===room.width&&depth===room.depth)continue;
  options.push({...room,x,z,width,depth,areaRatio:area/targetArea,changes:[ox,oz,dw,dd]});
 }
 return options.sort((a,b)=>b.areaRatio-a.areaRatio||Math.abs(a.changes[0])+Math.abs(a.changes[1])-Math.abs(b.changes[0])-Math.abs(b.changes[1])||a.z-b.z||a.x-b.x||a.width-b.width||a.depth-b.depth);
}
/** NEVER move a room into others' ownership, frozen proposals, stairs or beyond approved floor mask. */
export function relocationFeasibility(original,next,shape,fixed,otherRooms,{minRatio=.75,idx=null}={}){
 const area=next.width*next.depth/(original.width*original.depth);
 if(!Number.isFinite(area)||area<minRatio||next.width<2||next.depth<2)return {ok:false,why:'ROOM_AREA_OR_SHAPE'};
 const vertical=new Set([...shape.conceptReservations.stairs,...shape.conceptReservations.elevators].map(key));
 const protectedVoxel2D=new Set([...fixed.solids,...fixed.reserved].map(v=>{const [x,,z]=v.split(',');return `${x},${z}`}));
 const occupiedNominal=new Set(shape.conceptReservations.corridors.map(key));
 const removed=[];
 for(const p of cells(next)){
  const k=key(p),old=contains(original,p);
  if(!maskHasFloor(shape.floorMaskRows,p))return {ok:false,why:'OUTSIDE_FLOOR'};
  if(otherRooms.some(r=>contains(r,p)))return {ok:false,why:'OTHER_ROOM_OWNERSHIP'};
  if(vertical.has(k))return {ok:false,why:'VERTICAL_SHAFT_RESERVATION'};
  if(!old&&(fixed.protectedSites.has(k)||protectedVoxel2D.has(k)))return {ok:false,why:'FROZEN_OTHER_ROOM_CLAIM'};
  if(!old&&idx){const base=(shape.level-1)*5;for(const y of [base+1,base+2])if(idx.final.get(`${p.x},${y},${p.z}`)?.occupied)return {ok:false,why:'PRODUCTION_WALKSPACE_OCCUPIED'};}
  if(occupiedNominal.has(k))removed.push(p);
 }
 return {ok:true,areaRatio:area,removedCorridors:removed};
}
function buildShape(shape,room,added=[]){const prohibited=new Set(cells(room).map(key));
 const included=new Map([...shape.conceptReservations.corridors,...added].filter(p=>!prohibited.has(key(p))).map(p=>[key(p),p]));
 return {...shape,conceptReservations:{...shape.conceptReservations,corridors:[...included.values()]}};
}
/** Restore original *nominal* connectivity after room moves. Every added detour is pinned-voxel clear at two heights.
 * This topology audit does NOT certify corridor width, egress, stairs, exterior doors or clearance of nominal corridors. */
export function reconcileNominalCorridors({shape,relocated,idx,fixed,otherRooms,maxDetourCells=12}){
 const baseline=corridorNetwork(shape),start=buildShape(shape,relocated);let mutable=start;
 const oldMap=baseline.bySite;
 const removed=shape.conceptReservations.corridors.filter(p=>contains(relocated,p));
 // Never consume a vertical access adjacency cell: cannot silently revoke an original stair/elevator anchor.
 const vertical=[...shape.conceptReservations.stairs,...shape.conceptReservations.elevators];
 if(removed.some(p=>vertical.some(v=>Math.abs(p.x-v.x)+Math.abs(p.z-v.z)===1)))
  return {ok:false,reason:'VERTICAL_CORE_ANCHOR_REMOVED',removed};
 const detours=[],add=new Set(),corridorWalkable=p=>!contains(relocated,p)&&walkable(p,shape.level,shape,idx,fixed,otherRooms);
 for(let attempts=0;attempts<=maxDetourCells;attempts++){
  const current=corridorNetwork(mutable),grouped=new Map();
  for(const [k,origin] of oldMap){const now=current.bySite.get(k);if(now===undefined)continue;
   const arr=grouped.get(origin)||new Set();arr.add(now);grouped.set(origin,arr);
  }
  let toJoin=null;
  for(const [origin,cids] of [...grouped.entries()].sort((a,b)=>a[0]-b[0]))if(cids.size>1){toJoin={origin,cids:[...cids].sort((a,b)=>a-b)};break;}
  if(!toJoin)return {ok:true,reason:null,removed,detours,updated:mutable,fragmentationFixed:detours.length>0,
   initialComponents:baseline.components.length,finalComponents:current.components.length};
  if(add.size>=maxDetourCells)break;
  const ids=toJoin.cids,source=current.components.find(c=>c.id===ids[0]);
  const targets=new Set(current.components.filter(c=>ids.slice(1).includes(c.id)).flatMap(c=>c.sites.map(key)));
  // Reach through ONLY new physically empty corridor cells; original nominal path sites are part of established components.
  const queue=sorted(source.sites.map(key)).map(k=>({p:coord(k),newRoute:[]}));
  const visited=new Set(queue.map(n=>key(n.p)));let solution=null;
  for(let i=0;i<queue.length;i++){
   const node=queue[i];if(targets.has(key(node.p))){solution=node.newRoute;break;}
   if(node.newRoute.length>=maxDetourCells-add.size)continue;
   for(const d of DIRS){const p=move(node.p,d),k=key(p);
    if(visited.has(k)||contains(relocated,p))continue;
    const known=current.bySite.has(k);
    if(!known&&!corridorWalkable(p))continue;
    visited.add(k);queue.push({p,newRoute:known?node.newRoute:[...node.newRoute,p]});
   }
  }
  if(solution===null||solution.length===0)break;
  for(const p of solution){const k=key(p);if(!add.has(k)){detours.push(p);add.add(k);}}
  mutable=buildShape(shape,relocated,detours);
 }
 return {ok:false,reason:'ORIGINAL_NOMINAL_CORRIDOR_COMPONENT_FRAGMENTED',removed,detours};
}
/** Fails closed on invalid geometry or frozen claims; no Minecraft commands. */
export function validateRedesignIntent(v,{minRatio=.75}={}){
 if(!v||v.executionAllowed!==false||v.operations?.length||v.worldCoordinates!==null||v.approval!=='REVIEW_ONLY')return ['EXECUTION_CONTRACT'];
 if(!v.originalRoom||!v.proposedRoom||v.proposedRoom.width*v.proposedRoom.depth<v.originalRoom.width*v.originalRoom.depth*minRatio)return ['INSUFFICIENT_ROOM_AREA'];
 if(v.productionEditsRequested!==0||v.glassEditsRequested!==0||v.earlierProposalEditsRequested!==0)return ['FROZEN_PRODUCTION_OR_PRIOR_PROPOSAL_EDIT'];
 if(!v.corridorTopology?.preservesOriginalComponents)return ['CORRIDOR_COMPONENT_NOT_PRESERVED'];
 if(!v.clearance?.twoHighPinnedBlockClear||!v.clearance?.doorFrameChecked)return ['BLOCK_CLEARANCE_UNVERIFIED'];
 return [];
}
/** Exact pinned production contacts in the NEW portion of a conceptual room rectangle, read-only. */
export function productionFootprintContacts(original,next,shape,idx){
 const out=[],y0=(shape.level-1)*5;
 for(const p of cells(next))if(!contains(original,p))for(const y of [y0+1,y0+2]){
  const s=idx.final.get(`${p.x},${y},${p.z}`);
  if(s?.occupied)out.push({x:p.x,y,z:p.z,role:s.role,block:s.block,phase:s.phase??null,operationIndex:s.operationIndex});
 }
 return out;
}
export function classifyIntervention(contact){
 if(!contact||typeof contact.block!=='string')return 'UNKNOWN_HOLD';
 if(['primaryWall','structural','foundation'].includes(contact.role))return 'STRUCTURAL_HOLD';
 if(['glass','glazing','frame','window'].includes(contact.role)||contact.block.includes('glass'))return 'GLAZING_HOLD';
 if(['secondaryWall','partition'].includes(contact.role))return 'SECONDARY_PARTITION_REDESIGN_HOLD';
 return 'OTHER_PRODUCTION_BLOCK_HOLD';
}

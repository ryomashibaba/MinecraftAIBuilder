/** B97 isolated architectural co-design: 2-wide connected public gallery, independently retiled rooms.
 * Geometry is a NEW BUILDING CONCEPT, not a block patch, not a Minecraft command/BuildPlan.
 */
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
export const k=p=>`${p.x},${p.z}`;
const pt=s=>{const [x,z]=s.split(',').map(Number);return {x,z};};
export const rect=r=>Array.from({length:r.width*r.depth},(_,i)=>({x:r.x+i%r.width,z:r.z+Math.floor(i/r.width)}));
const maskOf=s=>new Set(s.floorMaskRows.flatMap((row,z)=>[...row].flatMap((a,x)=>a==='1'?[`${x},${z}`]:[])));
const area=r=>r.width*r.depth;
const taxi=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const subset=(keys,set)=>keys.every(x=>set.has(x));
const isFullSquare=(x,z,allowed)=>allowed.has(`${x},${z}`)&&allowed.has(`${x+1},${z}`)&&allowed.has(`${x},${z+1}`)&&allowed.has(`${x+1},${z+1}`);
const sq=xz=>{const {x,z}=typeof xz==='string'?pt(xz):xz;return [`${x},${z}`,`${x+1},${z}`,`${x},${z+1}`,`${x+1},${z+1}`];};
const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;
const mandatory=s=>new Set([...s.conceptReservations.stairs,...s.conceptReservations.elevators].map(k));
const origEdge=(r,mask)=>rect(r).filter(p=>dirs.some(([dx,dz])=>!mask.has(`${p.x+dx},${p.z+dz}`))).length;
function contiguousBay(room,network){
 const gates=[];
 for(const side of ['N','S','W','E']){
  const line=side==='N'||side==='S'?Array.from({length:room.width},(_,i)=>({x:room.x+i,z:side==='N'?room.z:room.z+room.depth-1})):
   Array.from({length:room.depth},(_,i)=>({x:side==='W'?room.x:room.x+room.width-1,z:room.z+i}));
  const out=side==='N'?[0,-1]:side==='S'?[0,1]:side==='W'?[-1,0]:[1,0];
  const contacts=line.map(p=>network.has(`${p.x+out[0]},${p.z+out[1]}`));
  for(let i=0;i<contacts.length;i++)if(contacts[i]){
   const lateral=(i>0&&contacts[i-1])||(i+1<contacts.length&&contacts[i+1]);
   gates.push({side,roomCell:line[i],hallCell:{x:line[i].x+out[0],z:line[i].z+out[1]},
     pairedCorridorFrontage:lateral,neighborOnSide:contacts.filter(Boolean).length});
  }
 }
 gates.sort((a,b)=>Number(b.pairedCorridorFrontage)-Number(a.pairedCorridorFrontage)||b.neighborOnSide-a.neighborOnSide||a.side.localeCompare(b.side));
 return gates[0]??null;
}
/** Derive likely gallery axes from gaps between legacy room rows/columns, not by hardcoded building coordinates. */
export function corridorBands(section,axis,{maximum=3}={}){
 const original=section.conceptRooms,rows=section.floorMaskRows,h=rows.length,w=rows[0].length;
 const n=axis==='H'?h:w,m=axis==='H'?w:h,band=[];
 for(let c=2;c<n-2;c++){
  const occupiedLine=(t)=>{
   let hits=0,possible=0;
   for(let i=1;i<m-1;i++){
    const p=axis==='H'?{x:i,z:t}:{x:t,z:i};
    if(rows[p.z]?.[p.x]==='1'){possible++;if(original.some(r=>inside(r,p)))hits++;}
   }
   return {hits,possible};
  };
  const a=occupiedLine(c),left=occupiedLine(c-1),right=occupiedLine(c+1);
  if(a.possible<Math.max(5,m*.6))continue;
  if(a.hits>m*.23||Math.max(left.hits,right.hits)<3)continue;
  const orientation=left.hits<=right.hits?{start:c-1,side:'previous'}:{start:c,side:'next'};
  const lo=occupiedLine(orientation.start),hi=occupiedLine(orientation.start+1);
  band.push({axis,start:orientation.start,separator:c,displacedOriginalCells:lo.hits+hi.hits,
   neighborRooms:original.filter(r=>axis==='H'?(r.z+r.depth===c||r.z===c+1):(r.x+r.width===c||r.x===c+1)).length,
   width:2});
 }
 band.sort((a,b)=>a.displacedOriginalCells-b.displacedOriginalCells||b.neighborRooms-a.neighborRooms||a.start-b.start);
 const selected=[];
 for(const x of band)if(selected.every(y=>Math.abs(x.start-y.start)>=4)){
  selected.push(x);if(selected.length>=maximum)break;
 }
 return selected.sort((a,b)=>a.start-b.start);
}
function bandKeys(section,band){
 const rows=section.floorMaskRows,h=rows.length,w=rows[0].length,keys=[];
 if(band.axis==='H')for(let z=band.start;z<band.start+2;z++)for(let x=0;x<w;x++)if(rows[z]?.[x]==='1')keys.push(`${x},${z}`);
 if(band.axis==='V')for(let x=band.start;x<band.start+2;x++)for(let z=0;z<h;z++)if(rows[z]?.[x]==='1')keys.push(`${x},${z}`);
 return keys;
}
/** Connected 2x2 anchor path; every step shares 2 cells with adjacent anchor. */
export function twoWideReachable(network,legal){
 const squareAnchors=new Set();const queue=[];
 for(const key of network){const p=pt(key);for(const [dx,dz] of [[0,0],[-1,0],[0,-1],[-1,-1]]){
  const ax=p.x+dx,az=p.z+dz,ak=`${ax},${az}`;
  if(!squareAnchors.has(ak)&&isFullSquare(ax,az,network)&&isFullSquare(ax,az,legal)){squareAnchors.add(ak);queue.push(ak);}
 }}
 const visited=new Set();const ordered=[];
 while(queue.length){const t=queue.shift();if(visited.has(t))continue;visited.add(t);ordered.push(t);
  const p=pt(t);for(const [dx,dz] of dirs){const next=`${p.x+dx},${p.z+dz}`;
   if(squareAnchors.has(next)&&!visited.has(next))queue.push(next);}
 }
 // Return ALL 2x2 components. Caller selects component connected to the B96 route.
 return {allAnchors:squareAnchors,components:(()=>{const rest=new Set(squareAnchors),res=[];while(rest.size){const seed=rest.values().next().value,Q=[seed],group=[];rest.delete(seed);while(Q.length){const t=Q.pop();group.push(t);const p=pt(t);for(const [dx,dz] of dirs){const q=`${p.x+dx},${p.z+dz}`;if(rest.delete(q))Q.push(q);}}res.push(group);}return res;})()};
}
function connectedNetwork(network,base,legal){
 const {components}=twoWideReachable(network,legal),baseAnchors=new Set();
 for(const z of base){const p=pt(z);for(const [dx,dz] of [[0,0],[-1,0],[0,-1],[-1,-1]])if(subset(sq({x:p.x+dx,z:p.z+dz}),base))baseAnchors.add(`${p.x+dx},${p.z+dz}`);}
 const anchors=components.filter(c=>c.some(x=>baseAnchors.has(x))).flat();
 return {anchors,newSites:new Set(anchors.flatMap(sq)),componentCount:components.length};
}
/** Add a minimal-width bridge through a new-building floor, with a bounded disruption budget.
 * Uses 2x2 anchor graph; no legacy walls/blocks are edited. */
function connectBand(section,network,target,base,legal,{budget=18}={}){
 const current=connectedNetwork(network,base,legal),targets=new Set();
 for(const x of target){const p=pt(x);for(const [dx,dz] of [[0,0],[-1,0],[0,-1],[-1,-1]]){
  const a={x:p.x+dx,z:p.z+dz};if(subset(sq(a),target)&&subset(sq(a),legal))targets.add(k(a));
 }}
 if(!targets.size)return {sites:network,bridgeAdded:0,connected:false};
 if(current.anchors.some(a=>targets.has(a)))return {sites:network,bridgeAdded:0,connected:true};
 const occupancies=new Set(section.conceptRooms.flatMap(r=>rect(r).map(k))),starts=current.anchors;
 const best=new Map(),prev=new Map(),queue=[];
 for(const a of starts){best.set(a,0);queue.push([0,a]);prev.set(a,null);}
 let found=null;
 // Bounded Dijkstra; small floor masks. 2x2 squares never pass through original stairs or lift.
 while(queue.length){queue.sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1]));const [cost,loc]=queue.shift();if(best.get(loc)!==cost)continue;
  if(targets.has(loc)){found=loc;break;}
  const p=pt(loc);for(const [dx,dz] of dirs){const next={x:p.x+dx,z:p.z+dz},nk=k(next),cells=sq(next);
   if(!subset(cells,legal))continue;
   const extra=cells.filter(t=>!network.has(t));const inc=extra.reduce((n,t)=>n+(occupancies.has(t)?4:1),0);
   const score=cost+inc;if(score>budget*5||score>=(best.get(nk)??Infinity))continue;
   best.set(nk,score);prev.set(nk,loc);queue.push([score,nk]);
  }
 }
 if(!found)return {sites:network,bridgeAdded:0,connected:false};
 const added=new Set(network),seen=new Set();for(let q=found;q!==null;q=prev.get(q)){
  if(seen.has(q))throw Error('B97_BRIDGE_PARENT_CYCLE');seen.add(q);for(const x of sq(q))added.add(x);
 }
 const bridgeAdded=added.size-network.size;
 if(bridgeAdded>budget)return {sites:network,bridgeAdded:0,connected:false};
 return {sites:added,bridgeAdded,connected:true};
}
/** Rebuild a room-safe in-footprint 2-wide connection to the nominal stair reservation.
 * B96 had two local routes touching stair cells. B97 never treats those cells as public hallway.
 */
export function safeCoreToStairLink(section,core,{budget=4500}={}){
 const mask=maskOf(section),stairs=new Set(section.conceptReservations.stairs.map(k));
 const legal=new Set([...mask].filter(x=>!mandatory(section).has(x)&&!rect(core).some(p=>k(p)===x)));
 const occupied=new Set(section.conceptRooms.flatMap(r=>rect(r).map(k)));
 const w=section.floorMaskRows[0].length,h=section.floorMaskRows.length;
 const candidates=[];for(let z=0;z<h-1;z++)for(let x=0;x<w-1;x++)if(isFullSquare(x,z,legal))candidates.push({x,z});
 const touchesArea=(square,ref)=>square.some(v=>ref.some(q=>adjacent(pt(v),q)));
 const cores=rect(core),stairCells=section.conceptReservations.stairs;
 const seeds=candidates.filter(c=>touchesArea(sq(c),cores)).map(k),targets=new Set(candidates.filter(c=>touchesArea(sq(c),stairCells)).map(k));
 const best=new Map(),prev=new Map(),queue=[];
 for(const p of seeds){best.set(p,0);prev.set(p,null);queue.push([0,p]);}
 let end=null,visits=0;
 while(queue.length&&visits++<budget){queue.sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1]));const [cost,where]=queue.shift();if(best.get(where)!==cost)continue;
  if(targets.has(where)){end=where;break;}
  const c=pt(where);for(const [dx,dz] of dirs){const nx=c.x+dx,nz=c.z+dz,next=`${nx},${nz}`;if(!isFullSquare(nx,nz,legal))continue;
   const inc=1+sq({x:nx,z:nz}).filter(x=>!sq(c).includes(x)).reduce((n,x)=>n+(occupied.has(x)?5:0),0);
   const tentative=cost+inc;if(tentative<(best.get(next)??Infinity)){
    best.set(next,tentative);prev.set(next,where);queue.push([tentative,next]);}
  }
 }
 if(!end)return {connected:false,sites:[],anchors:[],reason:'NO_STAIR_CONNECTED_TWO_WIDE_FREE_ROUTE'};
 const anchors=[];for(let q=end;q!==null;q=prev.get(q))anchors.push(q);anchors.reverse();
 const sites=[...new Set(anchors.flatMap(sq))].map(pt);
 return {connected:true,sites,anchors,score:best.get(end),legacyRoomCellsRepurposed:sites.filter(p=>occupied.has(k(p))).length,
  stairCellsReassigned:0,connectionOnlyNotEgress:true};
}
function makeGallery(section,priorFloor,profile){
 const mask=maskOf(section),coreKeys=new Set(rect(priorFloor.core).map(k)),blocked=mandatory(section);
 const legal=new Set([...mask].filter(x=>!blocked.has(x)&&!coreKeys.has(x)));
 const previousB96RouteOverlap=priorFloor.route.sites.filter(p=>mandatory(section).has(k(p))).length;
 const safeLink=safeCoreToStairLink(section,priorFloor.core);
 if(!safeLink.connected)return {network:new Set(),base:new Set(),legal,bands:[],bridges:0,
  safeLink,previousB96RouteOverlap,galleryCellCount:0,newGalleryCells:0,unconnectedComponentsDropped:0};
 const base=new Set(safeLink.sites.map(k));if(!subset([...base],legal))throw Error('B97_BASE_ROUTE_INVALID');
 let network=new Set(base),bridges=0;
 const horizontal=corridorBands(section,'H',{maximum:profile.maxH??3}),vertical=corridorBands(section,'V',{maximum:profile.maxV??3});
 const bands=profile.axis==='H'?horizontal:profile.axis==='V'?vertical:
  profile.axis==='HV'?[...horizontal,...vertical.slice(0,1)]:[...vertical,...horizontal.slice(0,1)];
 const included=[];
 for(const band of bands){
  const desired=new Set(bandKeys(section,band).filter(x=>legal.has(x)));
  const proposed=new Set([...network,...desired]);let cc=connectedNetwork(proposed,base,legal);
  if(desired.size&&!([...desired].some(x=>cc.newSites.has(x)))){
   const bridge=connectBand(section,proposed,desired,base,legal,{budget:profile.bridgeBudget??18});
   if(bridge.connected){network=bridge.sites;bridges+=bridge.bridgeAdded;}else{included.push({...band,connected:false,reason:'NO_BOUNDED_TWO_WIDE_BRIDGE'});continue;}
  }else network=proposed;
  cc=connectedNetwork(network,base,legal);
  const connectedCells=[...desired].filter(x=>cc.newSites.has(x));
  included.push({...band,connected:connectedCells.length>0,twoWideConnectedBandSites:connectedCells.length});
 }
 const selected=connectedNetwork(network,base,legal);return {network:selected.newSites,base,legal,bands:included,bridges,safeLink,previousB96RouteOverlap,
   galleryCellCount:selected.newSites.size,newGalleryCells:selected.newSites.size-base.size,unconnectedComponentsDropped:selected.componentCount-1};
}
function tryRoomFits(r,mask,occupied){return rect(r).every(p=>mask.has(k(p))&&!occupied.has(k(p)));}
function roomOptions(original,mask,occupied,gallery,{minAreaRatio=0.75,searchRadius=4}={}){
 const needed=Math.ceil(area(original)*minAreaRatio),options=[];
 for(const rotated of [false,true]){
  const w=rotated?original.depth:original.width,d=rotated?original.width:original.depth;
  for(let hh=d;hh>=Math.max(2,d-2);hh--)for(let ww=w;ww>=Math.max(2,w-2);ww--){
   if(ww*hh<needed)continue;
   for(let dz=-searchRadius;dz<=searchRadius;dz++)for(let dx=-searchRadius;dx<=searchRadius;dx++){
    const r={x:original.x+dx,z:original.z+dz,width:ww,depth:hh};if(!tryRoomFits(r,mask,occupied))continue;
    const gate=contiguousBay(r,gallery);const frontage=gate?.pairedCorridorFrontage?1:0;
    const delta=taxi({x:r.x,z:r.z},original),lost=area(original)-area(r);
    const daylightBefore=origEdge(original,mask),daylightAfter=origEdge(r,mask);
    const daylightRisk=daylightBefore>0&&daylightAfter===0;
    const score=(gate?0:80)+(frontage?0:15)+delta*3+lost*4+(rotated?1:0)+(daylightRisk?45:0);
    options.push({r,gate,frontage,score,delta,lost,daylightRisk,ratio:area(r)/area(original)});
   }
  }
 }
 options.sort((a,b)=>a.score-b.score||b.ratio-a.ratio||a.r.z-b.r.z||a.r.x-b.r.x);return options;
}
function rezoneRooms(section,priorFloor,gallery,profile){
 const mask=maskOf(section),reserved=new Set([...gallery.network,...rect(priorFloor.core).map(k),...mandatory(section)]);
 const old=section.conceptRooms,rooms=[];const pending=[];
 // Reserve unchanged rooms that remain directly connected first: minimize destruction of high-quality prior bedrooms.
 for(const orig of old){
  const unchanged=tryRoomFits(orig,mask,reserved)?contiguousBay(orig,gallery.network):null;
  if(unchanged?.pairedCorridorFrontage){rect(orig).forEach(p=>reserved.add(k(p)));rooms.push({roomId:orig.id,room:{...orig},original:{...orig},retentionRatio:1,
    frontage:unchanged,relocation:'UNCHANGED_WITH_TWO_CELL_GALLERY_FRONTAGE',daylightProxyRisk:false});
  }else pending.push(orig);
 }
 // Favor small constrained rooms first; all rooms are concepts in a hypothetical new building.
 pending.sort((a,b)=>area(a)-area(b)||a.id.localeCompare(b.id));
 for(const orig of pending){const choices=roomOptions(orig,mask,reserved,gallery.network,{searchRadius:profile.radius??4}),chosen=choices[0];
  if(!chosen){rooms.push({roomId:orig.id,room:null,original:{...orig},retentionRatio:0,frontage:null,
   relocation:'NO_GEOMETRIC_ALLOCATION_ABOVE_75_PERCENT',daylightProxyRisk:origEdge(orig,mask)>0});continue;}
  rect(chosen.r).forEach(p=>reserved.add(k(p)));
  rooms.push({roomId:orig.id,room:chosen.r,original:{...orig},retentionRatio:chosen.ratio,frontage:chosen.gate,
   relocation:chosen.delta||chosen.lost?'RELOCATED_OR_RESIZED':'UNCHANGED_BUT_ACCESS_INCOMPLETE',
   daylightProxyRisk:chosen.daylightRisk,alternativePositionsConsidered:choices.length});
 }
 rooms.sort((a,b)=>a.roomId.localeCompare(b.roomId));
 const allocated=rooms.filter(r=>r.room),twoCell=allocated.filter(r=>r.frontage?.pairedCorridorFrontage),oneCell=allocated.filter(r=>r.frontage&&!r.frontage.pairedCorridorFrontage);
 return {rooms,stats:{nominalRooms:old.length,allocatedRooms:allocated.length,unallocatedRooms:old.length-allocated.length,
  roomsWithTwoCellGalleryFrontage:twoCell.length,roomsWithOnlyOneCellGalleryFrontage:oneCell.length,roomsWithoutGalleryFrontage:allocated.filter(r=>!r.frontage).length,
  retainedVirtualArea:allocated.reduce((n,r)=>n+area(r.room),0),nominalArea:old.reduce((n,r)=>n+area(r),0),
  roomsWithDaylightProxyRisk:rooms.filter(r=>r.daylightProxyRisk).length,roomsWithUnchangedFootprint:rooms.filter(r=>r.room&&JSON.stringify(r.room)===JSON.stringify(r.original)).length}};
}
export function buildGalleryCoDesign(section,priorFloor,profile={axis:'H',maxH:3,maxV:3,bridgeBudget:18,radius:4}){
 const gal=makeGallery(section,priorFloor,profile),zoning=rezoneRooms(section,priorFloor,gal,profile);
 const origin=k(priorFloor.core),rows=section.floorMaskRows;
 return {sectionId:section.id,level:section.level,profile:profile.axis,core:priorFloor.core,
  floorMaskRows:rows,coreStairLink:gal.safeLink,correctedB96StairOverlapCells:gal.previousB96RouteOverlap,coreRouteSites:[...gal.base].map(pt),gallerySites:[...gal.network].sort().map(pt),
  galleryBands:gal.bands,bridgeAddedCells:gal.bridges,connectedGalleryCells:gal.galleryCellCount,addedGalleryCells:gal.newGalleryCells,
  discardedDisconnectedComponents:gal.unconnectedComponentsDropped,rooms:zoning.rooms,
  virtualReference:{stairs:section.conceptReservations.stairs,elevators:section.conceptReservations.elevators},
  stats:{...zoning.stats,connectedTwoWideGallery:true,coreContinuityAcrossFloors:'B96_ALIGNED_3x3_OR_3x4_VIRTUAL',
   structuralOrEgressCertification:false,realWorldBlockCommands:0},
  status:'UNAPPROVED_INDEPENDENT_NEW_BUILDING_LAYOUT'};
}
export function verifyGalleryFloor(f){
 if(f.status!=='UNAPPROVED_INDEPENDENT_NEW_BUILDING_LAYOUT'||f.stats.realWorldBlockCommands!==0||f.stats.structuralOrEgressCertification!==false)return false;
 const mask=maskOf(f),base=new Set(f.coreRouteSites.map(k)),gallery=new Set(f.gallerySites.map(k)),blocked=new Set([...rect(f.core).map(k),...f.virtualReference.stairs.map(k),...f.virtualReference.elevators.map(k)]);
 if(f.coreStairLink.connected!==true||f.coreStairLink.stairCellsReassigned!==0)return false;
 if(!subset([...gallery],mask)||!subset([...base],gallery)||[...gallery].some(x=>blocked.has(x)))return false;
 const cc=connectedNetwork(gallery,base,new Set([...mask].filter(x=>!blocked.has(x))));
 if(cc.newSites.size!==gallery.size)return false;
 const occupied=new Set([...gallery,...rect(f.core).map(k),...f.virtualReference.stairs.map(k),...f.virtualReference.elevators.map(k)]);
 for(const r of f.rooms){if(!r.room)continue;if(area(r.room)/area(r.original)<.75-1e-9)return false;
  for(const p of rect(r.room)){const x=k(p);if(!mask.has(x)||occupied.has(x))return false;occupied.add(x);}
  const gate=contiguousBay(r.room,gallery);if(JSON.stringify(gate)!==JSON.stringify(r.frontage))return false;
 }
 const s=f.stats;return s.nominalRooms===f.rooms.length&&s.allocatedRooms===f.rooms.filter(r=>r.room).length&&
  s.roomsWithTwoCellGalleryFrontage===f.rooms.filter(r=>r.room&&r.frontage?.pairedCorridorFrontage).length&&s.allocatedRooms+s.unallocatedRooms===s.nominalRooms;
}
export function summarizeGalleryFloors(floors){
 const total=(f)=>floors.reduce((n,x)=>n+x.stats[f],0);
 return {virtualFloorCount:floors.length,nominalRooms:total('nominalRooms'),allocatedRooms:total('allocatedRooms'),
  unallocatedRooms:total('unallocatedRooms'),connectedTwoCellDoorwayFrontageRooms:total('roomsWithTwoCellGalleryFrontage'),
  oneCellFrontageOnlyRooms:total('roomsWithOnlyOneCellGalleryFrontage'),unconnectedFrontageRooms:total('roomsWithoutGalleryFrontage'),
  nominalRoomArea:total('nominalArea'),retainedVirtualArea:total('retainedVirtualArea'),
  retentionRatio:total('nominalArea')?total('retainedVirtualArea')/total('nominalArea'):1,
  windowDaylightProxyRisks:total('roomsWithDaylightProxyRisk'),connectedGalleryArea: floors.reduce((n,f)=>n+f.connectedGalleryCells,0),
  roomsWithUnchangedFootprint:total('roomsWithUnchangedFootprint')};
}

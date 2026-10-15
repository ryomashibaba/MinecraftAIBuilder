/** Additive, imaginary 2-wide gallery repair. Never changes B104/B105 source geometry. */
import {K,neighbors,reachable} from './b113-geometry.mjs';
const square=a=>[{x:a.x,z:a.z},{x:a.x+1,z:a.z},{x:a.x,z:a.z+1},{x:a.x+1,z:a.z+1}];
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
export function repairGallery(f,cores,doors){
 const forbidden=p=>[...f.rooms,...cores].some(r=>inside(r,p));
 const anchors=new Map();
 for(let z=0;z<f.footprintRows.length-1;z++)for(let x=0;x<f.footprintRows[z].length-1;x++){
  const a={x,z};if(square(a).every(p=>f.footprintRows[p.z]?.[p.x]==='1'&&!forbidden(p)))anchors.set(K(a),a);
 }
 const componentSize=new Map();
 for(const a of anchors.values())if(!componentSize.has(K(a))){
  const set=reachable(a,new Set(anchors.keys()));
  const count=doors.filter(d=>[...set].some(k=>square(anchors.get(k)).some(p=>K(p)===K(d.externalGalleryCell)))).length;
  for(const k of set)componentSize.set(k,count);
 }
 const touching=[...anchors.values()].filter(a=>square(a).some(p=>neighbors(p).some(n=>inside(cores[0],n))));
 touching.sort((a,b)=>componentSize.get(K(b))-componentSize.get(K(a))||a.z-b.z||a.x-b.x);
 const root=f.level===0?f.exits[0]?.anchor:touching[0];
 const prev=new Map(),queue=[];
 if(root&&anchors.has(K(root))){prev.set(K(root),null);queue.push(root);}
 for(let i=0;i<queue.length;i++)for(const n of neighbors(queue[i]))if(anchors.has(K(n))&&!prev.has(K(n))){prev.set(K(n),K(queue[i]));queue.push(n);}
 const selected=new Set(),trace=a=>{let k=K(a);while(k!==null&&!selected.has(k)){selected.add(k);k=prev.get(k)??null;}};
 const targets=[...f.gallery,...doors.map(d=>d.externalGalleryCell),
  ...f.exits.flatMap(e=>e.edge),...f.coreRoutes.map(c=>c.anchor)].filter(Boolean);
 const unresolved=[];
 for(const p of targets){
  const a=queue.find(a=>square(a).some(c=>K(c)===K(p)));
  if(a)trace(a);else unresolved.push(p);
 }
 const combined=new Map(f.gallery.map(p=>[K(p),p]));
 for(const k of selected)for(const p of square(anchors.get(k)))combined.set(K(p),p);
 const repaired=[...combined.values()],originalSet=new Set(f.gallery.map(K)),allowed=new Set(repaired.map(K));
 const seed=f.level===0?f.exits[0]?.edge[0]:root;
 const seen=seed?reachable(seed,allowed):new Set();
 return {kind:'OFFLINE_ADDITIVE_TWO_WIDE_GALLERY_OVERLAY',level:f.level,
  sourceGalleryCells:f.gallery.length,addedCells:repaired.filter(p=>!originalSet.has(K(p))),
  sourceCellsPreserved:true,roomsMoved:false,coresMoved:false,
  sourceCoreRouteAnchor:f.coreRoutes[0]?.anchor??null,proposedRouteAnchor:root??null,
  primaryCoreInterfaceNeedsReview:f.level>0&&K(root??{})!==K(f.coreRoutes[0]?.anchor??{}),
  unresolvedTargetCount:unresolved.length,roomConnections:doors.filter(d=>seen.has(K(d.externalGalleryCell))).length,
  galleryCells:allowed.size,reachableGalleryCells:seen.size,
  allNewCellsOutsideRoomsAndCores:repaired.filter(p=>!originalSet.has(K(p))).every(p=>!forbidden(p)),
  stairIntegration:'UNVERIFIED',appliedToSource:false,executionAllowed:false};
}

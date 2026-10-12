/** B103 Education-first, concept-only adaptive circulation and 3D cross-floor clearance.
 * No Minecraft or world APIs, commands, transports or block placement.
 */
const k=(x,z)=>x+','+z,vk=(x,y,z)=>x+','+y+','+z;
const D=[[1,0],[0,1],[-1,0],[0,-1]];
const cells=r=>{const a=[];for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)a.push({x,z});return a;};
const inside=(r,x,z)=>x>=r.x&&x<r.x+r.width&&z>=r.z&&z<r.z+r.depth;
const overlap=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.z<b.z+b.depth&&b.z<a.z+a.depth;
const at=(rows,x,z)=>rows[z]?.[x]==='1';
const order=(a,b)=>a.z-b.z||a.x-b.x;
const safe=o=>o?.constructionApproved===false&&o.worldCoordinates===null&&
 (!o.blockOperations||Array.isArray(o.blockOperations)&&o.blockOperations.length===0)&&
 (!o.BuildPlan||o.BuildPlan.operations?.length===0&&o.BuildPlan.commandCount===0&&o.BuildPlan.worldCoordinates===null);
function check(c,l){
 if(!c?.id||c.id!==l?.candidateId||!safe(c)||!safe(l)||!Array.isArray(c.floors)||
 c.floors.length!==l.floors?.length||!c.floors.length)throw Error('B103_UNSAFE_INPUT');
 for(let i=0;i<l.floors.length;i++){
  const f=l.floors[i],src=c.floors[i],used=new Set();
  if(f.level!==i||src.level!==i||JSON.stringify(f.footprintRows)!==JSON.stringify(src.footprintRows)||
   JSON.stringify(f.core)!==JSON.stringify(c.core))throw Error('B103_BAD_FLOOR');
  for(const r of f.rooms){
   if(!r.id||!r.conceptualDoorOpening||r.width<4||r.depth<4||
    ![r.x,r.z,r.width,r.depth].every(Number.isInteger)||r.netInteriorArea!==(r.width-2)*(r.depth-2))
    throw Error('B103_INVALID_ROOM');
   for(const p of cells(r)){
    const id=k(p.x,p.z);
    if(!at(f.footprintRows,p.x,p.z)||used.has(id)||inside(c.core,p.x,p.z))throw Error('B103_ROOM_COLLISION');
    used.add(id);
   }
   const d=r.conceptualDoorOpening;
   if(!inside(r,d.x,d.z)||Math.abs(d.outside.x-d.x)+Math.abs(d.outside.z-d.z)!==1||
    inside(r,d.outside.x,d.outside.z)||!at(f.footprintRows,d.outside.x,d.outside.z))
    throw Error('B103_INVALID_DOOR');
  }
 }
}
function externalVoid(rows){
 const w=rows[0].length,h=rows.length,q=[{x:-1,z:-1}],seen=new Set([k(-1,-1)]);
 for(let i=0;i<q.length;i++)for(const [dx,dz]of D){
  const x=q[i].x+dx,z=q[i].z+dz,key=k(x,z);
  if(x< -1||z< -1||x>w||z>h||at(rows,x,z)||seen.has(key))continue;
  seen.add(key);q.push({x,z});
 }
 return seen;
}
function extraCores(c,l){
 const primary=c.core,rest=[],rows=l.floors[0].footprintRows;
 for(let z=1;z<rows.length-3;z++)for(let x=1;x<rows[0].length-3;x++){
  const r={x,z,width:3,depth:3};
  if(overlap(r,primary)||Math.abs(x-primary.x)+Math.abs(z-primary.z)<9)continue;
  if(l.floors.some(f=>cells(r).some(p=>!at(f.footprintRows,p.x,p.z)||
   f.rooms.some(room=>inside(room,p.x,p.z)))))continue;
  rest.push(r);
 }
 return rest.sort((a,b)=>
  Math.abs(b.x-primary.x)+Math.abs(b.z-primary.z)-Math.abs(a.x-primary.x)-Math.abs(a.z-primary.z)||order(a,b)
 ).slice(0,28);
}
const sq=a=>[{x:a.x,z:a.z},{x:a.x+1,z:a.z},{x:a.x,z:a.z+1},{x:a.x+1,z:a.z+1}];
const touches=(a,c)=>sq(a).some(p=>cells(c).some(q=>Math.abs(p.x-q.x)+Math.abs(p.z-q.z)===1));
function route(f,cores){
 const rows=f.footprintRows,blocked=new Set();
 for(const r of [...f.rooms,...cores])for(const p of cells(r))blocked.add(k(p.x,p.z));
 const free=new Set();
 for(let z=0;z<rows.length;z++)for(let x=0;x<rows[z].length;x++)
  if(at(rows,x,z)&&!blocked.has(k(x,z)))free.add(k(x,z));
 const anchors=new Map();
 for(let z=0;z<rows.length-1;z++)for(let x=0;x<rows[z].length-1;x++){
  const a={x,z};if(sq(a).every(p=>free.has(k(p.x,p.z))))anchors.set(k(x,z),a);
 }
 const q=[...anchors.values()].filter(a=>touches(a,cores[0]));
 const dist=new Map(q.map(a=>[k(a.x,a.z),0])),prev=new Map(q.map(a=>[k(a.x,a.z),null]));
 for(let i=0;i<q.length;i++)for(const [dx,dz]of D){
  const p=q[i],id=k(p.x+dx,p.z+dz);
  if(anchors.has(id)&&!dist.has(id)){dist.set(id,dist.get(k(p.x,p.z))+1);prev.set(id,k(p.x,p.z));q.push(anchors.get(id));}
 }
 const choose=pred=>[...anchors.values()].filter(a=>dist.has(k(a.x,a.z))&&pred(a)).sort((a,b)=>
  dist.get(k(a.x,a.z))-dist.get(k(b.x,b.z))||order(a,b))[0]??null;
 const selected=new Set(),trace=a=>{
  if(!a)return;let id=k(a.x,a.z);
  while(id!==null&&!selected.has(id)){selected.add(id);id=prev.get(id)??null;}
 };
 const coreRoutes=cores.map((c,index)=>{const a=choose(p=>touches(p,c));trace(a);return {index,connected:!!a,anchor:a};});
 const roomRoutes=f.rooms.map(r=>{
  const d=r.conceptualDoorOpening,a=choose(p=>sq(p).some(t=>t.x===d.outside.x&&t.z===d.outside.z));
  trace(a);return {roomId:r.id,connected:!!a,doorOutside:d.outside,anchor:a};
 });
 const possibilities=[];
 if(f.level===0){
  const outside=externalVoid(rows);
  for(const a of anchors.values()){
   if(!dist.has(k(a.x,a.z)))continue;
   for(const s of [
    {side:'N',edge:[{x:a.x,z:a.z},{x:a.x+1,z:a.z}],dx:0,dz:-1},
    {side:'S',edge:[{x:a.x,z:a.z+1},{x:a.x+1,z:a.z+1}],dx:0,dz:1},
    {side:'W',edge:[{x:a.x,z:a.z},{x:a.x,z:a.z+1}],dx:-1,dz:0},
    {side:'E',edge:[{x:a.x+1,z:a.z},{x:a.x+1,z:a.z+1}],dx:1,dz:0}])
    if(s.edge.every(p=>outside.has(k(p.x+s.dx,p.z+s.dz))))
     possibilities.push({anchor:a,side:s.side,edge:s.edge});
  }
 }
 possibilities.sort((a,b)=>dist.get(k(a.anchor.x,a.anchor.z))-dist.get(k(b.anchor.x,b.anchor.z))||order(a.anchor,b.anchor));
 const exits=[];
 if(possibilities.length){
  exits.push(possibilities[0]);
  const far=possibilities.slice(1).sort((a,b)=>{
   const d=p=>Math.abs(p.anchor.x-exits[0].anchor.x)+Math.abs(p.anchor.z-exits[0].anchor.z);
   return d(b)-d(a)||order(a.anchor,b.anchor);
  })[0];
  if(far&&Math.abs(far.anchor.x-exits[0].anchor.x)+Math.abs(far.anchor.z-exits[0].anchor.z)>=4)exits.push(far);
 }
 for(const e of exits)trace(e.anchor);
 const gallery=new Map();
 for(const id of selected)for(const p of sq(anchors.get(id)))gallery.set(k(p.x,p.z),p);
 return {level:f.level,rooms:f.rooms,cores,footprintRows:rows,gallery:[...gallery.values()].sort(order),
  roomRoutes,coreRoutes,exits,reachableRoomCount:roomRoutes.filter(r=>r.connected).length,
  unreachableRoomCount:roomRoutes.filter(r=>!r.connected).length,
  anchorCount:anchors.size,selectedAnchorCount:selected.size,
  originalB100GalleryCells:f.gallery.length,regeneratedCorridorCells:gallery.size,
  actualDoorsCertified:false,physicalStairsCertified:false,realEgressCertified:false};
}
/** A new route graph, not a copy of B100 gallery. Room positions still depend on B102's legacy-gallery-constrained placement. */
export function planB103(candidate,layout){
 check(candidate,layout);
 const primary=structuredClone(candidate.core);
 const evaluate=secondary=>{
  const cores=secondary?[primary,secondary]:[primary],floors=layout.floors.map(f=>route(f,cores));
  const gaps=floors.reduce((n,f)=>n+f.unreachableRoomCount+f.coreRoutes.filter(r=>!r.connected).length,0);
  return {cores,floors,gaps};
 };
 let result=evaluate(null);
 for(const c of extraCores(candidate,layout)){
  const proposal=evaluate(c);
  if(proposal.gaps===0){result=proposal;break;}
 }
 const connected=result.floors.reduce((n,f)=>n+f.reachableRoomCount,0);
 return {schema:'minecraftaibuilder-b103-adaptive-circulation-v1',candidateId:candidate.id,typology:candidate.typology,
  inputPlacedRooms:layout.placed,inputRequestedRooms:layout.requested,cores:result.cores,floors:result.floors,
  summary:{coreCount:result.cores.length,stackableSecondaryCore:result.cores.length>1,
   connectedRooms:connected,disconnectedRooms:layout.placed-connected,
   exteriorGroundPortalCandidates:result.floors[0].exits.length,
   regeneratedGalleryCells:result.floors.reduce((n,f)=>n+f.gallery.length,0),
   baselineGalleryCells:result.floors.reduce((n,f)=>n+f.originalB100GalleryCells,0),
   stairFlightCount:result.cores.length*(result.floors.length-1)},
  status:result.gaps===0&&connected===layout.placed?'CONCEPTUAL_2WIDE_GRAPH_CONNECTED':'NEEDS_CIRCULATION_REDESIGN',
  parentRoomsUnmodified:true,conceptOnly:true,realEgressCertified:false,physicalStairsCertified:false,
  roofCertified:false,structuralSupportCertified:false,interiorFinishedRooms:0,
  blockOperations:[],worldCoordinates:null,worldContacts:0,constructionApproved:false};
}
/** Whole-building local 3D: floors y=5*level, ceilings at +4, stairs as unverified 5-riser proxies. */
export function auditB103(plan){
 if(plan?.schema!=='minecraftaibuilder-b103-adaptive-circulation-v1'||!safe(plan)||
 !plan.floors?.length||!plan.cores?.length)throw Error('B103_UNSAFE_AUDIT_INPUT');
 const vox=new Map(),collisions=[],roomAirIssues=[],stairIssues=[];
 const put=(x,y,z,type,owner)=>{
  const id=vk(x,y,z),prior=vox.get(id);
  if(prior&&(prior.type!==type||prior.owner!==owner))collisions.push({id,prior,next:{type,owner}});
  else if(!prior)vox.set(id,{type,owner});
 };
 for(const f of plan.floors){
  const base=f.level*5;
  for(const p of f.gallery){
   put(p.x,base,p.z,'FLOOR','GALLERY_L'+f.level);
   for(let y=1;y<=3;y++)put(p.x,base+y,p.z,'AIR','GALLERY_L'+f.level);
   put(p.x,base+4,p.z,'CEILING','GALLERY_L'+f.level);
  }
  for(const r of f.rooms){
   const d=r.conceptualDoorOpening;
   for(const p of cells(r)){
    const border=p.x===r.x||p.x===r.x+r.width-1||p.z===r.z||p.z===r.z+r.depth-1;
    put(p.x,base,p.z,'FLOOR',r.id+'@L'+f.level);
    put(p.x,base+4,p.z,'CEILING',r.id+'@L'+f.level);
    for(let y=1;y<=3;y++)put(p.x,base+y,p.z,
     border&&!(p.x===d.x&&p.z===d.z&&y<=2)?'WALL':'AIR',r.id+'@L'+f.level);
   }
  }
 }
 const ring=[{x:0,z:0},{x:1,z:0},{x:2,z:0},{x:2,z:1},{x:2,z:2},{x:1,z:2}];
 for(let ci=0;ci<plan.cores.length;ci++)for(let l=0;l<plan.floors.length-1;l++)
  for(let i=0;i<ring.length;i++)put(plan.cores[ci].x+ring[i].x,l*5+1+i,plan.cores[ci].z+ring[i].z,
   'STAIR_TREAD_PROXY','CORE'+ci);
 for(const f of plan.floors){
  const base=f.level*5,dirs={N:[0,1],S:[0,-1],W:[1,0],E:[-1,0]};
  for(const r of f.rooms){
   const d=r.conceptualDoorOpening,[dx,dz]=dirs[d.side]??[0,0];
   const pos=[{x:d.x,z:d.z},{x:d.outside.x,z:d.outside.z},{x:d.x+dx,z:d.z+dz}];
   if(pos.some(p=>![1,2].every(h=>vox.get(vk(p.x,base+h,p.z))?.type==='AIR')))
    roomAirIssues.push({level:f.level,roomId:r.id,reason:'DOOR_OR_CORRIDOR_2_HIGH_BLOCKED'});
  }
 }
 for(let ci=0;ci<plan.cores.length;ci++)for(let l=0;l<plan.floors.length-1;l++)
  for(let i=0;i<ring.length;i++){
   const p=ring[i],x=plan.cores[ci].x+p.x,z=plan.cores[ci].z+p.z,y=l*5+1+i;
   if(vox.get(vk(x,y,z))?.type!=='STAIR_TREAD_PROXY'||
    [1,2].some(h=>{const t=vox.get(vk(x,y+h,z));return t&&t.type!=='AIR';}))
    stairIssues.push({core:ci,level:l,step:i,reason:'STAIR_HEADROOM_BLOCKED'});
  }
 return {schema:'minecraftaibuilder-b103-global-voxel-audit-v1',voxelCount:vox.size,
  solidAirCollisions:collisions.length,collisions,doorway2HighViolations:roomAirIssues.length,roomAirIssues,
  spiralProxyClearanceViolations:stairIssues.length,stairIssues,
  stepProxyCount:[...vox.values()].filter(t=>t.type==='STAIR_TREAD_PROXY').length,
  roofAndLoadPathsCertified:false,physicalStairsCertified:false,egressCertified:false,
  bedrockBlockStatesCertified:0,worldContacts:0,constructionApproved:false};
}
export function previewEducationPalette(a){
 if(a?.schema!=='minecraftaibuilder-b103-global-voxel-audit-v1'||a.constructionApproved!==false||
 a.worldContacts!==0)throw Error('B103_UNSAFE_PALETTE');
 return {edition:'MINECRAFT_EDUCATION',mode:'READ_ONLY_SYMBOLIC_PREVIEW',
  hypotheticalNames:{FLOOR:'minecraft:stone',WALL:'minecraft:stone',CEILING:'minecraft:stone',AIR:'minecraft:air'},
  unmappedTypes:['STAIR_TREAD_PROXY','PHYSICAL_DOOR','HINGE','BLOCK_STATES'],
  validatedEducationBlockStates:0,requiresVersionPinnedEducationRegistry:true,worldContacts:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null},
  constructionApproved:false,executionAllowed:false};
}
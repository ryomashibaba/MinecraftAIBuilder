/** B102: constraint-guided independent room-envelope synthesis with sparse voxel section.
 * Concept-only, Minecraft Education first. NO world IO, material adapter or block commands.
 */
import {normalizeProgramme} from '../../b101/main/b101-programme-route.mjs';
const key=(x,z)=>x+','+z;
const at=(rows,x,z)=>rows[z]?.[x]==='1';
const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
const rectCells=r=>{const out=[];for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)out.push({x,z});return out;};
const has=(r,x,z)=>x>=r.x&&x<r.x+r.width&&z>=r.z&&z<r.z+r.depth;
function coreAccess(f){
 const set=new Set(f.gallery.map(p=>key(p.x,p.z))),anchors=new Map();
 for(const p of f.gallery)if([[0,0],[0,1],[1,0],[1,1]].every(([dx,dz])=>set.has(key(p.x+dx,p.z+dz))))
  anchors.set(key(p.x,p.z),p);
 const coreCells=rectCells(f.core),adj=p=>coreCells.some(q=>Math.abs(q.x-p.x)+Math.abs(q.z-p.z)===1);
 const queue=[...anchors.values()].filter(p=>[[0,0],[0,1],[1,0],[1,1]].some(([dx,dz])=>adj({x:p.x+dx,z:p.z+dz})));
 const reached=new Set(queue.map(p=>key(p.x,p.z)));
 for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dz]of dirs){
  const id=key(p.x+dx,p.z+dz);if(anchors.has(id)&&!reached.has(id)){reached.add(id);queue.push(anchors.get(id));}
 }}
 const reachable=new Set();
 for(const id of reached){const p=anchors.get(id);for(const [dx,dz]of [[0,0],[1,0],[0,1],[1,1]])reachable.add(key(p.x+dx,p.z+dz));}
 return {gallery:set,reachable,anchors:reached,coreApproaches:queue.length};
}
function entrance(r,route){
 const g=route.gallery,a=route.reachable,bays=[];
 const pair=(x,z,dx,dz,x2,z2,side)=>{
  const p=key(x+dx,z+dz),q=key(x2+dx,z2+dz);
  if(!g.has(p)||!g.has(q)||!a.has(p)||!a.has(q))return;
  // A doorway cut at a corner is not useful: its next interior cell would still be a perimeter wall.
  // Select the one cell of this paired frontage whose inward neighbour is CLEAR interior.
  const inner=[{x,z},{x:x2,z:z2}].find(p=>{
   const a={x:p.x-dx,z:p.z-dz};
   return a.x>r.x&&a.x<r.x+r.width-1&&a.z>r.z&&a.z<r.z+r.depth-1;
  });
  if(!inner)return;
  bays.push({x:inner.x,z:inner.z,side,outside:{x:inner.x+dx,z:inner.z+dz},
   pairedOutside:{x:x2+dx,z:z2+dz}});
 };
 for(let x=r.x;x<r.x+r.width-1;x++){
  pair(x,r.z,0,-1,x+1,r.z,'N');
  pair(x,r.z+r.depth-1,0,1,x+1,r.z+r.depth-1,'S');
 }
 for(let z=r.z;z<r.z+r.depth-1;z++){
  pair(r.x,z,-1,0,r.x,z+1,'W');
  pair(r.x+r.width-1,z,1,0,r.x+r.width-1,z+1,'E');
 }
 return bays;
}
function exposure(r,rows){
 let n=0;for(const p of rectCells(r))for(const [dx,dz]of dirs)
  if(!has(r,p.x+dx,p.z+dz)&&!at(rows,p.x+dx,p.z+dz))n++;
 return n;
}
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.z<b.z+b.depth&&a.z+a.depth>b.z;
/** Candidate dimensions include ONE solid boundary block on each side.
 * minAreaCells is the unoccupied room interior, not a deceptive gross rectangle area.
 */
function dimensions(minArea,maxSpan){
 const out=[];for(let w=4;w<=maxSpan;w++)for(let d=4;d<=maxSpan;d++){
  if((w-2)*(d-2)>=minArea)out.push({w,d,net:(w-2)*(d-2)});
 }
 return out.sort((a,b)=>a.net-b.net||a.w*a.d-b.w*b.d||a.w-b.w||a.d-b.d);
}
function generatePool(f,req,route,maxSpan=12){
 const rows=f.footprintRows,w=rows[0].length,h=rows.length,g=route.gallery,core=new Set(rectCells(f.core).map(p=>key(p.x,p.z))),options=[];
 if(req.allowedLevels!==null&&!req.allowedLevels.includes(f.level))return [];
 for(const size of dimensions(req.minAreaCells,maxSpan)){
  for(let z=0;z<=h-size.d;z++)for(let x=0;x<=w-size.w;x++){
   const r={x,z,width:size.w,depth:size.d};let valid=true;
   for(let dz=0;dz<size.d&&valid;dz++)for(let dx=0;dx<size.w;dx++){
    const k=key(x+dx,z+dz);if(rows[z+dz]?.[x+dx]!=='1'||g.has(k)||core.has(k)){valid=false;break;}
   }
   if(!valid)continue;
   const bays=entrance(r,route),ext=exposure(r,rows);
   if(req.requireTwoWideFrontage&&!bays.length||ext<req.minExteriorEdgesProxy)continue;
   options.push({...r,netArea:size.net,exposureProxy:ext,bays});
  }
 }
 return options.sort((a,b)=>a.netArea-b.netArea||a.width*a.depth-b.width*b.depth||b.exposureProxy-a.exposureProxy||
  a.z-b.z||a.x-b.x);
}
/** Greedy bounded layout synthesis. Unfilled requirements remain failures, NEVER auto-passed. */
export function synthesizeRooms(candidate,rawProgramme,{maxRoomSpan=12}={}){
 if(!candidate?.id||!Array.isArray(candidate.floors)||!candidate.floors.length||!candidate.core)throw Error('B102_BAD_CANDIDATE');
 if(!Number.isInteger(maxRoomSpan)||maxRoomSpan<4||maxRoomSpan>20)throw Error('B102_BAD_SPAN');
 const requests=normalizeProgramme(rawProgramme);
 const floors=candidate.floors.map(f=>({level:f.level,footprintRows:f.footprintRows,core:f.core,gallery:f.gallery,
  route:coreAccess(f),rooms:[]}));
 const pool=new Map(),pending=[];
 for(const req of requests){
  const candidates=floors.map(f=>generatePool(f,req,f.route,maxRoomSpan));
  pool.set(req.purpose,candidates);
  for(let i=1;i<=req.count;i++)pending.push({req,unit:i,totalOptions:candidates.reduce((n,a)=>n+a.length,0)});
 }
 pending.sort((a,b)=>a.totalOptions-b.totalOptions||b.req.minAreaCells-a.req.minAreaCells||a.req.purpose.localeCompare(b.req.purpose)||a.unit-b.unit);
 const failed=[];
 for(const job of pending){
  let best=null,score=Infinity;
  for(let fi=0;fi<floors.length;fi++){
   const f=floors[fi],options=pool.get(job.req.purpose)[fi];
   for(const r of options){
    if(f.rooms.some(x=>overlaps(r,x)))continue;
    // A deterministic score: avoid gross-area waste; spread levels; keep some facades available.
    const s=(r.netArea-job.req.minAreaCells)*100+(r.width*r.depth)*2+
      f.rooms.length*40+(job.req.minExteriorEdgesProxy?0:Math.min(30,r.exposureProxy))+
      ((fi*17+r.x*11+r.z*7+candidate.variant*5)%13)*0.001;
    if(s<score){score=s;best={fi,rect:r};}
   }
  }
  if(!best){failed.push({purpose:job.req.purpose,unit:job.unit,reason:job.totalOptions===0?'NO_GEOMETRIC_CANDIDATE':'NO_NONOVERLAPPING_CANDIDATE'});continue;}
  const f=floors[best.fi],r=best.rect,door=r.bays[0]??null;
  const room={id:'S'+String(f.rooms.length+1).padStart(3,'0'),purpose:job.req.purpose,unit:job.unit,
   x:r.x,z:r.z,width:r.width,depth:r.depth,netInteriorArea:r.netArea,minimumArea:job.req.minAreaCells,
   conceptualDoorOpening:door,exteriorExposureProxy:r.exposureProxy,wallHeight:3,
   realBedrockDoorInstalled:false,voxelBlockStateCertified:false};
  f.rooms.push(room);
 }
 const outcomes=requests.map(r=>{const fulfilled=floors.reduce((n,f)=>n+f.rooms.filter(x=>x.purpose===r.purpose).length,0);
  return {purpose:r.purpose,requested:r.count,fulfilled,missing:r.count-fulfilled};});
 return {candidateId:candidate.id,requested:requests.reduce((n,x)=>n+x.count,0),
  placed:floors.reduce((n,f)=>n+f.rooms.length,0),unmet:outcomes.filter(x=>x.missing>0),failed,
  status:failed.length?'HARD_REQUIREMENTS_UNMET':'CONCEPTUAL_ENVELOPES_FIT_PROGRAMME',
  floors:floors.map(({route,...f})=>f),underlyingB100Unmodified:true,
  requiresPhysicalWorldValidation:true,constructionApproved:false,worldCoordinates:null,blockOperations:[]};
}
/** Explicit sparse 3D voxel section for each room + gallery, with local floor y=0, wall/air y=1..3.
 * Perimeter walls are ONE FULL CELL thick; a 1-cell × 2-block opening is carved on gallery side.
 * A concept-only aperture is NOT an installed hinge door. No Minecraft block IDs are emitted.
 */
export function voxelAudit(layout){
 if(!layout?.floors||layout.constructionApproved!==false||layout.blockOperations?.length)throw Error('B102_UNSAFE_VOXEL_INPUT');
 const audits=[],collisions=[];
 for(const f of layout.floors){
  const vox=new Map(),put=(x,y,z,type,owner)=>{
   const id=x+','+y+','+z,prev=vox.get(id);
   if(prev&&(prev.type!==type||prev.owner!==owner))collisions.push({level:f.level,id,prev:prev.type,next:type,owner,previousOwner:prev.owner});
   else if(!prev)vox.set(id,{type,owner});
  };
  for(const p of f.gallery){put(p.x,0,p.z,'FLOOR','GALLERY');
   for(let y=1;y<=3;y++)put(p.x,y,p.z,'AIR','GALLERY');
  }
  for(const r of f.rooms){
   const d=r.conceptualDoorOpening;
   for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
    const border=x===r.x||z===r.z||x===r.x+r.width-1||z===r.z+r.depth-1;
    put(x,0,z,'FLOOR',r.id);put(x,4,z,'CEILING',r.id);
    for(let y=1;y<=3;y++){
     const aperture=d&&x===d.x&&z===d.z&&y<=2;
     put(x,y,z,border&&!aperture?'WALL':'AIR',r.id);
    }
   }
  }
  let doors=0,headroom=0,interiorAir=0,unreachable=[];
  for(const r of f.rooms){
   const d=r.conceptualDoorOpening,inside={x:r.x+1,z:r.z+1};
   if(!d){unreachable.push({roomId:r.id,reason:'NO_PORTAL'});continue;}
   const insideOfDoor=d.side==='N'?{x:d.x,z:d.z+1}:d.side==='S'?{x:d.x,z:d.z-1}:
    d.side==='W'?{x:d.x+1,z:d.z}:{x:d.x-1,z:d.z};
   const air=(p,y)=>vox.get(p.x+','+y+','+p.z)?.type==='AIR';
   const validDoor=[1,2].every(y=>air(d,y)&&air(insideOfDoor,y)&&air(d.outside,y));
   if(validDoor){doors++;headroom++;}else unreachable.push({roomId:r.id,reason:'BLOCKED_VOXEL_APERTURE'});
   for(let z=r.z+1;z<r.z+r.depth-1;z++)for(let x=r.x+1;x<r.x+r.width-1;x++){
    if(air({x,z},1)&&air({x,z},2))interiorAir++;
   }
   if(r.netInteriorArea!==(r.width-2)*(r.depth-2))unreachable.push({roomId:r.id,reason:'INVALID_NET_AREA'});
  }
  audits.push({level:f.level,rooms:f.rooms.length,voxelAperturesWith2BlockAir:doors,
   apertureHeadroomPass:headroom,netInteriorAirFootprintCells:interiorAir,
   unresolved:unreachable,voxelTypes:{floor:[...vox.values()].filter(v=>v.type==='FLOOR').length,
    wall:[...vox.values()].filter(v=>v.type==='WALL').length,
    air:[...vox.values()].filter(v=>v.type==='AIR').length,
    ceiling:[...vox.values()].filter(v=>v.type==='CEILING').length},
   realMinecraftDoorVerified:false,realStairVerified:false,exteriorEgressVerified:false});
 }
 return {floors:audits,collisions,conflictCount:collisions.length,conceptualDoors:audits.reduce((n,f)=>n+f.voxelAperturesWith2BlockAir,0),
  successful2BlockAirOpenings:audits.reduce((n,f)=>n+f.apertureHeadroomPass,0),
  actualBedrockDoorCommands:0,actualBlockStatesValidated:0,realVerticalCirculationVerified:false,
  structuralLoadsVerified:false,roofWatertightVerified:false,worldContacts:0,constructionApproved:false};
}

/** B101: immutable B100 concept overlay, OFFLINE ONLY. NO Minecraft transport or blocks. */
const k=(x,z)=>x+','+z;
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const okInt=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const roomNames='客室|住戸|執務室|会議室|閲覧室|書庫|居間|寝室|書斎|学習室|ロビー|ラウンジ|共用室';

export function normalizeProgramme(list){
 if(!Array.isArray(list)||list.length>30)throw Error('B101_BAD_PROGRAMME');
 const seen=new Set();let total=0;
 return list.map(e=>{
  if(!e||typeof e.purpose!=='string'||!e.purpose.trim()||e.purpose.length>60||/[^-\p{L}\p{N}_ ]/u.test(e.purpose))throw Error('B101_BAD_PURPOSE');
  if(seen.has(e.purpose))throw Error('B101_DUPLICATE_PURPOSE');seen.add(e.purpose);
  const count=e.count,area=e.minAreaCells??1,ext=e.minExteriorEdgesProxy??0;
  if(!okInt(count,1,150)||!okInt(area,1,2000)||!okInt(ext,0,100))throw Error('B101_BAD_ROOM_CONSTRAINT');
  total+=count;if(total>250)throw Error('B101_TOO_MANY_ROOMS');
  if(e.requireTwoWideFrontage!==undefined&&typeof e.requireTwoWideFrontage!=='boolean')throw Error('B101_BAD_FRONTAGE_FLAG');
  const levels=e.allowedLevels??null;
  if(levels!==null&&(!Array.isArray(levels)||!levels.length||levels.length>20||new Set(levels).size!==levels.length||levels.some(x=>!okInt(x,0,100))))throw Error('B101_BAD_LEVELS');
  return {purpose:e.purpose,count,minAreaCells:area,requireTwoWideFrontage:e.requireTwoWideFrontage!==false,minExteriorEdgesProxy:ext,allowedLevels:levels===null?null:[...levels].sort((a,b)=>a-b)};
 });
}
/** Limited numerical grammar; unmatched numeric phrases remain explicitly unresolved. */
export function parseProgrammeJapanese(instruction){
 if(typeof instruction!=='string'||!instruction.trim()||instruction.length>1500)throw Error('B101_BAD_INSTRUCTION');
 let rest=instruction.replace(/[0-9一二三四五六七八九十]+階建て/g,' ');
 const countRe=new RegExp('('+roomNames+')\\s*(?:を|が|は)?\\s*(\\d{1,3})\\s*(?:室|部屋|つ)','g');
 const areaRe=new RegExp('('+roomNames+')\\s*(?:の|は|を)?\\s*(?:最低|最小)?\\s*(?:面積|広さ)\\s*(?:は|を)?\\s*(\\d{1,4})\\s*(?:ブロック|セル|マス)(?:以上)?','g');
 const byPurpose=new Map(),warnings=[];
 rest=rest.replace(countRe,(_,name,number)=>{if(byPurpose.has(name))throw Error('B101_DUPLICATE_PURPOSE_QUANTITY');byPurpose.set(name,{purpose:name,count:Number(number),minAreaCells:1});return ' ';});
 rest=rest.replace(areaRe,(_,name,number)=>{if(!byPurpose.has(name))warnings.push('AREA_WITHOUT_COUNT:'+name);else byPurpose.get(name).minAreaCells=Number(number);return ' ';});
 const unknownNumberClauses=rest.split(/[。．、，;；\n]/).map(x=>x.trim()).filter(x=>/[0-9０-９]/.test(x));
 if(unknownNumberClauses.length)warnings.push('UNKNOWN_NUMERIC_CONSTRAINT');
 return {requirements:normalizeProgramme([...byPurpose.values()]),unknownNumberClauses,warnings,originalInstruction:instruction,
  semanticCoverage:'EXPLICIT_ROOM_COUNTS_AND_AREAS_ONLY',humanReviewRequired:true};
}
/** Maximum-cardinality room assignment, NEVER a new geometry or Minecraft operation. */
export function allocateProgramme(candidate,input){
 if(!candidate?.id||!Array.isArray(candidate.floors))throw Error('B101_BAD_CANDIDATE');
 const requirements=normalizeProgramme(input);
 const rooms=candidate.floors.flatMap(f=>f.rooms.map(r=>({ref:candidate.id+'/L'+(f.level+1)+'/'+r.id,level:f.level,
  oldPurpose:r.purpose,areaCells:r.width*r.depth,frontage:(r.nominalDoorBays??[]).length>0,
  exposure:r.externalExposureProxyEdges??0}))).sort((a,b)=>a.level-b.level||a.ref.localeCompare(b.ref));
 const units=[];for(const req of requirements)for(let n=1;n<=req.count;n++)units.push({req,unitNo:n});
 const eligible=(req,r)=>r.areaCells>=req.minAreaCells&&(!req.requireTwoWideFrontage||r.frontage)&&
  r.exposure>=req.minExteriorEdgesProxy&&(req.allowedLevels===null||req.allowedLevels.includes(r.level));
 const edges=units.map(u=>rooms.map((r,i)=>({...r,index:i})).filter(r=>eligible(u.req,r)).sort((a,b)=>
  Number(b.oldPurpose===u.req.purpose)-Number(a.oldPurpose===u.req.purpose)||a.areaCells-b.areaCells||a.level-b.level||a.ref.localeCompare(b.ref)).map(r=>r.index));
 const owners=new Array(rooms.length).fill(-1);
 const match=(u,seen)=>{for(const i of edges[u]){if(seen.has(i))continue;seen.add(i);
  if(owners[i]===-1||match(owners[i],seen)){owners[i]=u;return true;}}return false;};
 const order=units.map((_,i)=>i).sort((a,b)=>edges[a].length-edges[b].length||units[b].req.minAreaCells-units[a].req.minAreaCells||a-b);
 for(const u of order)match(u,new Set());
 const matches=new Map(owners.flatMap((u,i)=>u<0?[]:[[u,rooms[i]]]));
 const assignments=units.flatMap((u,i)=>matches.has(i)?[{
  purpose:u.req.purpose,unitNo:u.unitNo,roomRef:matches.get(i).ref,level:matches.get(i).level,
  areaCells:matches.get(i).areaCells,priorPurpose:matches.get(i).oldPurpose,
  hypotheticalRetag:matches.get(i).oldPurpose!==u.req.purpose
 }]:[]);
 const unmet=requirements.map(req=>{const assigned=assignments.filter(a=>a.purpose===req.purpose).length;
  const available=rooms.filter(r=>eligible(req,r)).length;
  return {purpose:req.purpose,requested:req.count,assigned,missing:req.count-assigned,
   eligibleExistingVolumes:available,reason:assigned===req.count?'SATISFIED':available===0?'NO_ELIGIBLE_VOLUME':'INSUFFICIENT_DISTINCT_VOLUMES'};}).filter(x=>x.missing>0);
 return {requirements,requested:units.length,allocated:assignments.length,assignments,unmet,
  status:unmet.length?'HARD_CONSTRAINTS_UNMET':'CONCEPTUAL_VOLUMES_FIT_PROGRAMME',
  conceptOnly:true,physicalDoorsVerified:false,physicalEgressVerified:false,constructionApproved:false,
  B100SourceMutated:false};
}
const cells2=(x,z)=>[{x,z},{x:x+1,z},{x,z:z+1},{x:x+1,z:z+1}];
const rectCells=r=>{const out=[];for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)out.push({x,z});return out;};
const portalCells=b=>b.along==='x'?[{x:b.x,z:b.z+b.direction},{x:b.x+1,z:b.z+b.direction}]:
 b.along==='z'?[{x:b.x+b.direction,z:b.z},{x:b.x+b.direction,z:b.z+1}]:[];
function exteriorVoid(rows){
 const seen=new Set(),queue=[],h=rows.length,w=rows[0].length;
 const add=(x,z)=>{const key=k(x,z);if(x>=0&&z>=0&&x<w&&z<h&&rows[z][x]==='0'&&!seen.has(key)){seen.add(key);queue.push({x,z});}};
 for(let x=0;x<w;x++){add(x,0);add(x,h-1);}for(let z=0;z<h;z++){add(0,z);add(w-1,z);}
 for(let i=0;i<queue.length;i++)for(const [dx,dz] of dirs)add(queue[i].x+dx,queue[i].z+dz);
 return seen;
}
/** B100's cell connectivity is insufficient for width 2. Use adjacent 2x2 anchors. */
function routeFloor(f,core){
 const g=new Set(f.gallery.map(p=>k(p.x,p.z)));
 const anchors=new Map();for(const p of f.gallery){
  if(cells2(p.x,p.z).every(q=>g.has(k(q.x,q.z))))anchors.set(k(p.x,p.z),{x:p.x,z:p.z});
 }
 const cs=rectCells(core),touch=p=>cs.some(c=>Math.abs(c.x-p.x)+Math.abs(c.z-p.z)===1);
 const starts=[...anchors.values()].filter(a=>cells2(a.x,a.z).some(touch));
 const hops=new Map(),queue=[];for(const a of starts){hops.set(k(a.x,a.z),0);queue.push(a);}
 for(let i=0;i<queue.length;i++){const a=queue[i];for(const [dx,dz] of dirs){
  const key=k(a.x+dx,a.z+dz);
  if(anchors.has(key)&&!hops.has(key)){hops.set(key,hops.get(k(a.x,a.z))+1);queue.push(anchors.get(key));}
 }}
 const roomRoutes=f.rooms.map(r=>{
  let steps=Infinity,matchingAnchors=0;
  for(const bay of r.nominalDoorBays??[]){
   const needed=portalCells(bay);
   for(const a of anchors.values()){
    const inAnchor=new Set(cells2(a.x,a.z).map(p=>k(p.x,p.z)));
    if(needed.length!==2||!needed.every(p=>inAnchor.has(k(p.x,p.z))))continue;
    matchingAnchors++;
    if(hops.has(k(a.x,a.z)))steps=Math.min(steps,hops.get(k(a.x,a.z)));
   }
  }
  return {roomId:r.id,conceptualTwoWidePortalAnchors:matchingAnchors,
   nominalConnectedToCore:Number.isFinite(steps),minimum2x2AnchorHops:Number.isFinite(steps)?steps:null,
   unresolvedReason:Number.isFinite(steps)?null:matchingAnchors===0?'NO_TWO_WIDE_PORTAL':'PORTAL_DISCONNECTED_FROM_CORE',
   actualDoorCertified:false};
 });
 const outside=exteriorVoid(f.footprintRows),portals=[];
 if(f.level===0)for(const a of anchors.values()){
  const dist=hops.get(k(a.x,a.z));if(dist===undefined)continue;
  const pairs=[
   {side:'N',edge:[{x:a.x,z:a.z},{x:a.x+1,z:a.z}],dx:0,dz:-1},
   {side:'S',edge:[{x:a.x,z:a.z+1},{x:a.x+1,z:a.z+1}],dx:0,dz:1},
   {side:'W',edge:[{x:a.x,z:a.z},{x:a.x,z:a.z+1}],dx:-1,dz:0},
   {side:'E',edge:[{x:a.x+1,z:a.z},{x:a.x+1,z:a.z+1}],dx:1,dz:0}
  ];
  for(const p of pairs)if(p.edge.every(q=>outside.has(k(q.x+p.dx,q.z+p.dz))))
   portals.push({x:a.x,z:a.z,side:p.side,nominalCoreHops:dist});
 }
 return {level:f.level,roomRoutes,conceptualRooms:f.rooms.length,
  nominalRoutedRooms:roomRoutes.filter(x=>x.nominalConnectedToCore).length,
  nominalUnreachableRooms:roomRoutes.filter(x=>!x.nominalConnectedToCore).length,
  twoWideAnchors:anchors.size,coreApproachAnchors:starts.length,unreachableTwoWideAnchors:anchors.size-hops.size,
  potentialExteriorGroundPortals:portals.length,portalExamples:portals.slice(0,6),
  actualDoorCertified:false,actual2BlockHeadroomVerified:false,actualStairsCertified:false,actualExitCertified:false};
}
/** Not a real exit, stair, roof, structural or headroom certificate. */
export function auditCandidateRoutes(candidate){
 if(!candidate?.id||!candidate.core||!candidate.floors?.length)throw Error('B101_INVALID_ROUTE_CANDIDATE');
 const floors=candidate.floors.map(f=>routeFloor(f,candidate.core));
 const all=floors.reduce((n,f)=>n+f.conceptualRooms,0),routed=floors.reduce((n,f)=>n+f.nominalRoutedRooms,0);
 return {candidateId:candidate.id,floors,conceptualRooms:all,nominal2DWideCorePaths:routed,nominalUnreachableRooms:all-routed,
  potentialGroundExitSites:floors[0].potentialExteriorGroundPortals,
  verticalCoreLocationAligned:candidate.floors.every(f=>JSON.stringify(f.core)===JSON.stringify(candidate.core)),
  actualDoorCertified:false,actual2BlockHeadroomVerified:false,actualVerticalTravelCertified:false,
  actualExteriorExitCertified:false,realEgressCertified:false,constructionApproved:false,worldContacts:0};
}

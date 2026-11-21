/** R190-CD: independent, fail-closed voxel-first review of artist/LLM designs.
 * No geometry generation, no inference of entrances, no automatic repairs or approval.
 * Pure observations apply equally to authored prototypes and future BO provider outputs.
 */
import {createHash} from 'node:crypto';
export const R190CD_SCHEMA='minecraftaibuilder-r190cd-independent-integrated-quality-gate-v1';
const hash=v=>createHash('sha256').update(v).digest('hex');
const bad=(what)=>{throw Error('R190CD_'+what)};
const int=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const polygonInside=(x,z,p)=>{
 let inside=false;
 for(let i=0,j=p.length-1;i<p.length;j=i++){
  const a=p[i],b=p[j];
  if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
};
export function auditR190CD({sourceRaw,compiled,bounds,programs,entrances=[],routeNodes=[],origin}={}){
 if(!(sourceRaw instanceof Uint8Array)||sourceRaw.length<5||sourceRaw.length>250000)bad('SOURCE_BYTES');
 if(!compiled?.designOnly||!Array.isArray(compiled.primitives)||typeof origin!=='string'||
    origin.length<8||origin.length>160)bad('SOURCE');
 const [w,h,d]=[bounds?.width,bounds?.height,bounds?.depth];
 if(!int(w,8,128)||!int(h,8,128)||!int(d,8,128)||w*h*d>850000)bad('BOUNDS');
 if(!Array.isArray(programs)||programs.length===0||programs.length>32||
    !Array.isArray(entrances)||entrances.length>12||
    !Array.isArray(routeNodes)||routeNodes.length>400)bad('PROGRAM');
 const primitiveVoxelSha256=hash(JSON.stringify(compiled.primitives));
 if(compiled.geometryHashKind==='B143_DESIGN_AND_VOXELS'){
  if(!compiled.b143Design||
   compiled.geometrySha256!==hash(JSON.stringify({
    design:compiled.b143Design,primitives:compiled.primitives
   })))bad('B143_GEOMETRY_SHA');
 }else if(compiled.geometryHashKind===undefined){
  if(compiled.geometrySha256!==primitiveVoxelSha256)bad('GEOMETRY_SHA');
 }else bad('GEOMETRY_HASH_KIND');
 if(compiled.bounds&&(JSON.stringify(compiled.bounds)!==JSON.stringify(bounds)))bad('BOUND_PROVENANCE');
 const volume=w*h*d,wh=w*d,surface=new Uint8Array(volume),idx=(x,y,z)=>(y*d+z)*w+x;
 for(const p of compiled.primitives){
  if(!Array.isArray(p)||p.length<4||p.length>6||
     p.slice(0,3).some((v,i)=>!int(v,0,[w-1,h-1,d-1][i]))||
     !int(p[3],0,99))bad('FINAL_VOXEL');
  const k=idx(p[0],p[1],p[2]);
  if(surface[k])bad('DUPLICATE_FINAL_VOXEL');
  surface[k]=1;
 }
 function stand(x,y,z){
  if(!int(x,0,w-2)||!int(y,1,h-3)||!int(z,0,d-2))return false;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   if(!surface[idx(x+dx,y-1,z+dz)])return false;
   for(let dy=0;dy<3;dy++)if(surface[idx(x+dx,y+dy,z+dz)])return false;
  }return true;
 }
 const stands=new Uint8Array(volume);
 for(const q of compiled.primitives){
  const y=q[1]+1,x=q[0],z=q[2];
  for(let dx=-1;dx<=0;dx++)for(let dz=-1;dz<=0;dz++){
   const ax=x+dx,az=z+dz;
   if(stand(ax,y,az))stands[idx(ax,y,az)]=1;
  }
 }
 const distance=new Int32Array(volume).fill(-1),q=new Int32Array(volume);
 let end=0,at=0;
 const uniqueEntrances=new Set();
 const entrancesAudit=entrances.map((v,i)=>{
  if(!Array.isArray(v)||v.length!==3||v.some((n,j)=>!int(n,0,[w-1,h-1,d-1][j])))bad('ENTRANCE');
  const key=v.join(',');
  if(uniqueEntrances.has(key))bad('DUPLICATE_ENTRANCE');
  uniqueEntrances.add(key);
  return {id:'entry-'+i,point:v,authorSupplied:true,standable:stand(...v),
   exteriorHorizontalAirConnected:false,conservativeReachableAnchors:0,
   groundOutsideSupport:'NOT_TESTED'};
 });
 // At each nominated standing elevation, flood only *horizontal* 2x2x3 air
 // from the bounds boundary. A shaft open at the roof cannot fake a doorway.
 for(const entry of entrancesAudit){
  const y=entry.point[1];
  const airAt=(x,z)=>{
   if(x<0||z<0||x>=w-1||z>=d-1||y<0||y+2>=h)return false;
   for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++)
    for(let t=0;t<3;t++)if(surface[idx(x+dx,y+t,z+dz)])return false;
   return true;
  };
  const visited=new Uint8Array(w*d);
  const queue=new Int32Array(w*d),index2=(x,z)=>z*w+x;
  let b=0,f=0;
  for(let z=0;z<d-1;z++)for(let x=0;x<w-1;x++){
   if(x!==0&&z!==0&&x!==w-2&&z!==d-2)continue;
   if(airAt(x,z)&&!visited[index2(x,z)]){
    const k=index2(x,z);visited[k]=1;queue[b++]=k;
   }
  }
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  while(f<b){
   const k=queue[f++],x=k%w,z=Math.floor(k/w);
   for(const [dx,dz] of dirs){
    const xx=x+dx,zz=z+dz;
    if(!airAt(xx,zz))continue;
    const t=index2(xx,zz);
    if(!visited[t]){visited[t]=1;queue[b++]=t;}
   }
  }
  entry.exteriorHorizontalAirConnected=visited[index2(entry.point[0],entry.point[2])]===1;
  entry.horizontalExteriorAirAnchorCount=b;
 }
 // A conservative 2x2-support + 3-air route. No author shortcut and no
 // diagonal two-cell riser acceptance. Only entrances with BOTH supported
 // standing room and an independently observed horizontal exterior air path
 // seed the route; a sealed author entrance cannot grant interior reachability.
 for(const entry of entrancesAudit){
  if(!entry.standable||!entry.exteriorHorizontalAirConnected)continue;
  const [x,y,z]=entry.point,i=idx(x,y,z);
  if(distance[i]===-1){distance[i]=0;q[end++]=i;}
 }
 const dir=[[1,0],[-1,0],[0,1],[0,-1]];
 while(at<end){
  const old=q[at++],x=old%w,z=Math.floor(old/w)%d,y=Math.floor(old/wh);
  for(const [dx,dz] of dir)for(const dy of [0,1,-1]){
   const nx=x+dx,ny=y+dy,nz=z+dz;
   if(nx<0||nz<0||ny<1||nx>=w-1||nz>=d-1||ny>h-3)continue;
   const k=idx(nx,ny,nz);
   if(distance[k]!==-1||!stands[k])continue;
   if(dy===1){
    let roofBlocked=false;
    for(let a=0;a<2;a++)for(let b=0;b<2;b++)
     if(y+3>=h||surface[idx(x+a,y+3,z+b)])roofBlocked=true;
    if(roofBlocked)continue;
   }
   distance[k]=distance[old]+1;q[end++]=k;
  }
 }
 for(const entry of entrancesAudit){
  // This number is a UNION count, not a falsely certified individual path.
  const eligible=entry.standable&&entry.exteriorHorizontalAirConnected;
  entry.conservativeReachableAnchors=eligible?end:0;
  entry.conservativeReachableAnchorsScope=eligible?
   'UNION_ACROSS_ELIGIBLE_AUTHOR_ENTRANCES':'NOT_AN_ELIGIBLE_EXTERIOR_ROUTE_SEED';
 }
 const ids=new Set();
 const spaces=programs.map(p=>{
  if(!p||typeof p.id!=='string'||p.id.length<2||p.id.length>80||ids.has(p.id)||
    typeof p.purpose!=='string'||p.purpose.length<3||p.purpose.length>250||
    !int(p.floorY,0,h-4)||!Array.isArray(p.polygon)||p.polygon.length<3||
    p.polygon.length>24||p.polygon.some(pt=>!Array.isArray(pt)||pt.length!==2||
    pt.some((n,i)=>typeof n!=='number'||!Number.isFinite(n)||n<0||
     n>[w,d][i])))bad('PROGRAM_FIELDS');
  ids.add(p.id);
  const px=p.polygon,minx=Math.max(0,Math.floor(Math.min(...px.map(v=>v[0])))),
   maxx=Math.min(w-1,Math.ceil(Math.max(...px.map(v=>v[0])))),
   minz=Math.max(0,Math.floor(Math.min(...px.map(v=>v[1])))),
   maxz=Math.min(d-1,Math.ceil(Math.max(...px.map(v=>v[1]))));
  const fy=p.floorY;
  let requested=0,supportedClear=0,missingFloor=0,blockedAir=0,
   twoWideStandable=0,twoWideReachable=0;
  for(let x=minx;x<=maxx;x++)for(let z=minz;z<=maxz;z++){
   if(!polygonInside(x+.5,z+.5,px))continue;
   requested++;
   if(!surface[idx(x,fy,z)])missingFloor++;
   else if([1,2,3].some(t=>surface[idx(x,fy+t,z)]))blockedAir++;
   else supportedClear++;
   if(stand(x,fy+1,z)){
    twoWideStandable++;
    if(distance[idx(x,fy+1,z)]>=0)twoWideReachable++;
   }
  }
  if(requested===0)bad('EMPTY_PROGRAM_POLYGON');
  return {id:p.id,sourceDeclaredPurpose:p.purpose,
   purposeIsPhysicalProof:false,floorY:fy,requestedCells:requested,
   supportedClearCells:supportedClear,missingFloorCells:missingFloor,
   blockedHeadroomCells:blockedAir,
   supportedClearFraction:Number((supportedClear/requested).toFixed(4)),
   conservativeTwoWideStandable:twoWideStandable,
   conservativeTwoWideReachable:twoWideReachable,
   actualMcWalking:'NOT_TESTED',occupancy:'AUTHOR_LABEL_NOT_FUNCTIONAL_CERTIFICATION'};
 });
 const routeFootprints=routeNodes.map((node,i)=>{
  if(!Array.isArray(node)||node.length!==3||
   node.some((n,j)=>!int(n,0,[w-1,h-1,d-1][j])))bad('ROUTE_NODE');
  const [x,y,z]=node;
  if(i===0)return {index:0,point:node,standable:stand(x,y,z),
    conservativeTransitionFromPrior:'FIRST_NODE'};
  const prev=routeNodes[i-1],horizontal=Math.abs(x-prev[0])+Math.abs(z-prev[2]),
  dy=y-prev[1],plausible=(dy===0&&horizontal===1)||
   (Math.abs(dy)===1&&horizontal===1);
  return {index:i,point:node,standable:stand(x,y,z),
   conservativeTransitionFromPrior:plausible?'GEOMETRICALLY_PLAUSIBLE':'NOT_CONSERVATIVE_STEP1'};
 });
 const reasons=[];
 if(!entrancesAudit.length)reasons.push('MISSING_AUTHOR_ENTRANCE');
 if(entrancesAudit.length&&!entrancesAudit.some(q=>q.standable))reasons.push('NO_STANDABLE_AUTHOR_ENTRANCE');
 if(entrancesAudit.length&&!entrancesAudit.some(q=>q.standable&&q.exteriorHorizontalAirConnected))
  reasons.push('NO_CLEAR_AIR_CONNECTION_TO_EXTERIOR');
 if(!end)reasons.push('NO_SUPPORTED_CONSERVATIVE_WALK_ROUTE');
 for(const s of spaces){
  if(s.supportedClearCells===0)reasons.push('PROGRAM_HAS_ZERO_SUPPORTED_CLEAR:'+s.id);
  if(s.conservativeTwoWideReachable===0)reasons.push('PROGRAM_UNREACHABLE_FROM_AUTHOR_ENTRANCE:'+s.id);
 }
 if(routeFootprints.some(q=>q.conservativeTransitionFromPrior==='NOT_CONSERVATIVE_STEP1'))
  reasons.push('AUTHOR_ROUTE_HAS_NON_CONSERVATIVE_TWO_CELL_RISERS');
 reasons.push('HUMAN_ART_REVIEW_REQUIRED');
 reasons.push('REAL_MINECRAFT_AND_STRUCTURE_UNTESTED');
 const wMin=Math.min(...compiled.primitives.map(v=>v[0])),
  wMax=Math.max(...compiled.primitives.map(v=>v[0])),
  zMin=Math.min(...compiled.primitives.map(v=>v[2])),
  zMax=Math.max(...compiled.primitives.map(v=>v[2])),
  yMin=Math.min(...compiled.primitives.map(v=>v[1])),
  yMax=Math.max(...compiled.primitives.map(v=>v[1]));
 return {schema:R190CD_SCHEMA,origin,rawSourceSha256:hash(sourceRaw),
  geometrySha256:compiled.geometrySha256,primitiveVoxelSha256,voxelCount:compiled.primitives.length,
  bounds,observedOccupiedExtent:{x:[wMin,wMax],y:[yMin,yMax],z:[zMin,zMax]},
  methodology:'REAL_VOXELS_NO_GEOMETRY_REPAIR_OR_MODEL_RESPONSE',
  entrances:entrancesAudit,programs:spaces,
  conservative2x2ReachableAnchors:end,
  authorRoute:{nodes:routeNodes.length,supportedNodes:routeFootprints.filter(q=>q.standable).length,
   nonConservativeTransitions:routeFootprints.filter(q=>
    q.conservativeTransitionFromPrior==='NOT_CONSERVATIVE_STEP1').length,
   contract:'AUTHOR_ROUTE_EDGE_IS_NOT_MINECRAFT_PHYSICS'},
  findings:reasons,sourceTechnicalStatus:'MEASURED_NO_ACCEPTANCE_CLAIM',
  physicalProgramGate:'HOLD_PROVABLE_FUNCTION_REQUIRED',
  entranceAndRouteGate:'HOLD_EXTERNAL_ENTRY_AND_MC_WALKING_REQUIRED',
  artGate:'ART_HOLD_REQUIRES_REAL_MULTI_VIEW_HUMAN',
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
  modelCalls:0,officialArtAdoptions:0,constructionApproved:false,
  executionAllowed:false,
  realMinecraftWalkability:'NOT_TESTED',structure:'NOT_TESTED'};
}

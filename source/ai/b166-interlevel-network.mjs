/**
 * B166 — genuine inter-level network proof from compiled B165 voxel cells.
 *
 * Three DIFFERENT certificates, not falsely conflated:
 * (1) unchanged lower level B152 2x2 flat support/headroom, 127 moves.
 * (2) north/south 1x1 discrete grid paths from Y19 to Y26 with cardinal
 *     one-cell movement, <=1 riser height, and 2-cell headroom.
 * (3) north/south full 2x2 supported upper mezzanine horizontal regions Y26,
 *     with automatically discovered remote destinations and B152 route replay.
 *
 * Cannot certify continuous physics for a 2x2-size body on those stairs,
 * structure, handrails, actual entity collision or construction.
 */
import {createHash} from 'node:crypto';
import {validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {analyzeFootprint,verifyFootprint} from './b152-footprint-review.mjs';
import {createOrbitalInteriors,verifyOrbitalInteriors} from './b165-orbital-interiors.mjs';
export const SCHEMA='minecraftaibuilder-b166-two-level-network-v1';
const assert=(v,name)=>{if(!v)throw Error('B166_'+name)};
const key=(x,y,z)=>x+','+y+','+z;
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
const S={north:{entry:[30,19,15],top:[30,26,30],x:30,zmin:14,zmax:33},
 south:{entry:[79,19,73],top:[79,26,88],x:79,zmin:72,zmax:91}};
const box=(id,origin,size,material='metal')=>({id,shape:'box',mode:'add',material,origin,size});
export function navigationArchitecture(){
 // B165 has 158 of 160 allowed DSL elements. Open one real Y26-27
 // south dome / internal fascia passage without removing supported Y25 floor.
 // The second (and final) element is a substantial overhead portal.
 return [
  {id:'b166-south-upper-dome-passage',shape:'box',mode:'cut',
   origin:[70,26,80],size:[13,2,11]},
  box('b166-south-overlook-portal',[70,31,79],[13,3,3],'accent')
 ];
}

function readSolids(scene){
 const data=new Set(scene.primitives.map(p=>key(p[0],p[1],p[2])));
 const solid=(x,y,z)=>data.has(key(x,y,z));
 const standing=(x,y,z,width,depth)=>{
  if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(z))return false;
  if(x<0||y<1||z<0||x+width>90||z+depth>96||y+1>=54)return false;
  for(let dx=0;dx<width;dx++)for(let dz=0;dz<depth;dz++)
   if(!solid(x+dx,y-1,z+dz)||solid(x+dx,y,z+dz)||
    solid(x+dx,y+1,z+dz))return false;
  return true;
 };
 return {data,solid,standing};
}
function reverseChain(parent,last,start){
 const path=[];let at=last;
 while(at){path.push(at.split(',').map(Number));if(at===start)break;at=parent.get(at)}
 path.reverse();
 assert(path.length&&key(...path[0])===start,'PATH_RECONSTRUCT');
 return path;
}
function stairGridPath(solid,wing){
 const cfg=S[wing],origin=key(...cfg.entry),goal=key(...cfg.top),
  parent=new Map(),queue=[cfg.entry],visited=new Set([origin]);
 assert(solid.standing(...cfg.entry,1,1)&&solid.standing(...cfg.top,1,1),
  'FLIGHT_ENDPOINT_STANDING_'+wing);
 for(let index=0;index<queue.length;index++){
  const [x,y,z]=queue[index],here=key(x,y,z);
  if(here===goal)break;
  for(const [dx,dz] of dirs)for(const rise of [0,1,-1]){
   const nx=x+dx,ny=y+rise,nz=z+dz;
   if(nx<cfg.x||nx>cfg.x+1||nz<cfg.zmin||nz>cfg.zmax||
    ny<19||ny>26||!solid.standing(nx,ny,nz,1,1))continue;
   const next=key(nx,ny,nz);
   if(visited.has(next))continue;
   visited.add(next);parent.set(next,here);queue.push([nx,ny,nz]);
  }
 }
 assert(visited.has(goal),'STAIR_NOT_CONNECTED_GRID_'+wing);
 const path=reverseChain(parent,goal,origin);
 let rises=0,maxStep=0;
 for(let i=1;i<path.length;i++){
  const [x,y,z]=path[i],[ox,oy,oz]=path[i-1];
  assert(Math.abs(x-ox)+Math.abs(z-oz)===1&&Math.abs(y-oy)<=1,
   'STAIR_EDGE_INVALID_'+wing);
  rises+=Math.max(0,y-oy);maxStep=Math.max(maxStep,Math.abs(y-oy));
 }
 return {wing,bodyFootprint:[1,1],headroom:2,
  entry:cfg.entry,top:cfg.top,path,
  horizontalSteps:path.length-1,netHeightGain:cfg.top[1]-cfg.entry[1],
  totalUpwardRisers:rises,maxRise:maxStep,visitedNodes:visited.size,
  discreteGridOnly:true};
}
function upperRegion(scene,solid,wing){
 const cfg=S[wing],start=cfg.top,y=start[1],
  startKey=key(...start),queue=[start],seen=new Set([startKey]),
  parent=new Map();
 assert(solid.standing(...start,2,2),'UPPER_ENTRY_INVALID_'+wing);
 const bounds=scene.bounds;
 for(let index=0;index<queue.length;index++){
  const [x,,z]=queue[index];
  for(const [dx,dz] of dirs){
   const nx=x+dx,nz=z+dz,k=key(nx,y,nz);
   if(nx<bounds.minX||nx>bounds.maxX||nz<bounds.minZ||
    nz>bounds.maxZ||seen.has(k)||!solid.standing(nx,y,nz,2,2))continue;
   seen.add(k);parent.set(k,key(x,y,z));queue.push([nx,y,nz]);
  }
 }
 // Reproducible farthest reachable upper platform, with no manually chosen
 // destination and no falsely inferred join to distant disconnected platforms.
 const last=queue.at(-1),distance=queue.length?
  reverseChain(parent,key(...last),startKey).length-1:0;
 console.log('B166_UPPER_PLATFORM_DIAGNOSTICS',JSON.stringify({wing,origin:start,destination:last,distance,anchors:seen.size,preview:queue.slice(0,10)}));
 assert(distance>=8&&seen.size>=30,'UPPER_PLATFORM_TOO_SMALL_'+wing);
 const args={start,destinations:[{id:'farthest-upper',at:last}],
  width:2,depth:2,headroom:2};
 const proof=analyzeFootprint(scene,args);
 assert(verifyFootprint(scene,args,proof)&&
  proof.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  proof.targets[0].steps===distance&&
  proof.targets[0].path.every(p=>p[1]===y),
  'UPPER_CROSS_CHECK_FAILED_'+wing);
 return {wing,bodyFootprint:[2,2],height:y,origin:start,
  destination:last,flatMoves:distance,reachableAnchors:seen.size,
  routeProofSha256:proof.sha256,route:proof,allCellsChecked:true};
}
export function buildInterlevelNetwork(original){
 validateDesign(original);
 const initial=JSON.stringify(original);
 const before=createOrbitalInteriors(original);
 assert(verifyOrbitalInteriors(original,before.report),'PARENT_UNVERIFIED');
 const added=navigationArchitecture();
 const finished={...structuredClone(before.model),
  id:'doppler-orbital-crown-navigation-network',
  title:'DOPPLER ORBITAL CROWN — 南北吹抜け階段と展望回廊ネットワーク',
  brief:'南北両翼の階段には1×1実ブロック接地経路を、上階には2×2踏面・頭上空間を使った平面動線を独立して証明した、多層宇宙港内部の完成候補。プレイヤー実機動作と構造安全は未認証。',
  elements:[...structuredClone(before.model.elements),...added]};
 assert(equal(finished.elements.slice(0,before.model.elements.length),
  before.model.elements),'PREDECESSOR_CHANGED');
 validateDesign(finished);
 const compiled=compileDesign(finished);
 assert(verifyCompiled(finished,compiled)&&
  compiled.geometrySha256!==before.compiled.geometrySha256,
  'ARCHITECTURE_NOT_ACTUALLY_ADDED');
 const vox=readSolids(compiled);
 const stairs=['north','south'].map(wing=>stairGridPath(vox,wing));
 const upper=['north','south'].map(wing=>upperRegion(compiled,vox,wing));
 const args={start:[24,19,20],destinations:[{id:'terminal',at:[67,19,78]}],
  width:2,depth:2,headroom:2};
 const low=analyzeFootprint(compiled,args);
 assert(verifyFootprint(compiled,args,low)&&
  low.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  low.targets[0].steps===127&&
  equal(low.targets[0].path,before.lower.targets[0].path),
  'LOWER_ROUTE_REGRESSION');
 const priorVox=new Set(before.compiled.primitives.map(p=>key(p[0],p[1],p[2])));
 const newVox=compiled.primitives.filter(p=>!priorVox.has(key(p[0],p[1],p[2])));
 const lowBody=new Set();
 for(const p of before.lower.targets[0].path)
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++)
   for(let i=0;i<2;i++)lowBody.add(key(p[0]+dx,p[1]+i,p[2]+dz));
 const corrupted=newVox.filter(p=>lowBody.has(key(p[0],p[1],p[2])));
 const core={
  schema:SCHEMA,id:finished.id,
  sourceSha256:before.compiled.sourceSha256,
  sourceGeometrySha256:before.compiled.geometrySha256,
  afterSourceSha256:compiled.sourceSha256,
  afterGeometrySha256:compiled.geometrySha256,
  originalInteriorProofSha256:before.report.sha256,
  lowerRouteProofSha256:low.sha256,
  addedElements:added.length,
  newlyOccupiedCells:newVox.length,
  originalLowerMoves:127,
  changedLowerRouteBodyCells:corrupted.length,
  stairGridPaths:stairs,
  upperFlatPlatforms:upper.map(({route,...rest})=>rest),
  upperFlatRouteProofHashes:upper.map(x=>x.route.sha256),
  stairActorFootprint:[1,1],
  upperActorFootprint:[2,2],
  physicalActorMovementCertified:false,
  mixedFootprintWholeJourneyCertified:false,
  stairLanding2x2PhysicalTraversalCertified:false,
  upperMezzanineContinuityCertified:true,
  geometryOnly:true,
  structuralStrengthCertified:false,fallSafetyCertified:false,
  constructionApproved:false,worldContacts:0,worldCoordinates:null,
  readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 assert(added.length===2&&newVox.length>=80&&
  corrupted.length===0&&stairs.every(s=>s.netHeightGain===7&&
   s.maxRise===1&&s.horizontalSteps>=8)&&
  upper.every(s=>s.flatMoves>=8)&&JSON.stringify(original)===initial,
  'NOT_MEANINGFUL_NETWORK');
 return {before,finished,compiled,stairs,upper,low,
  report:{...core,sha256:sha(core)}};
}
export function verifyInterlevelNetwork(original,report){
 try{
  const r=buildInterlevelNetwork(original);
  return equal(report,r.report)&&
   report.constructionApproved===false&&
   report.gates.length===9&&report.gates.every(x=>x==='BLOCKED')&&
   report.BuildPlan.operations.length===0;
 }catch{return false}
}

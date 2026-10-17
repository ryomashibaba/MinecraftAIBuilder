/**
 * B161 — reusable deterministic A* route search across local skyport voxels.
 *
 * Unlike B160, this planner has NO predetermined count/order of segments,
 * obstacle coordinates, or hand-authored bend grid. It searches all directions,
 * with a turn penalty and strict ORIGINAL-solid body/head clearance. Generates
 * floor as joined boxes, recompiles, and verifies 2x2 occupied-cell movement
 * after architectural decoration. Every output is DESIGN-ONLY.
 */
import {createHash} from 'node:crypto';
import {validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {analyzeFootprint,verifyFootprint} from './b152-footprint-review.mjs';
import {DOPPLER_ROUTE} from './b160-multiturn-router.mjs';
export const SCHEMA='minecraftaibuilder-b161-a-star-skybridge-v1';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const assert=(v,msg)=>{if(!v)throw Error('B161_'+msg);};
const K=(x,z)=>x+','+z;
const box=(id,origin,size,material='concrete')=>
 ({id,shape:'box',mode:'add',material,origin,size});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
const safePoint=a=>Array.isArray(a)&&a.length===3&&
 a.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=127);
export const DEFAULT_ROUTE=Object.freeze({
 start:[24,19,20],goal:[67,19,78],corridorWidth:4,
 footprintWidth:2,footprintDepth:2,
 maxNodes:45000,turnPenalty:12,maxBends:14
});
class Heap{
 constructor(){this.a=[]}
 push(v){const a=this.a;let i=a.length;a.push(v);
  while(i>0){let p=(i-1)>>1;if(a[p][0]<=v[0])break;a[i]=a[p];i=p}
  a[i]=v;
 }
 pop(){const a=this.a,first=a[0],end=a.pop();if(a.length){
  let i=0;while(i*2+1<a.length){let c=i*2+1;
   if(c+1<a.length&&a[c+1][0]<a[c][0])c++;
   if(end[0]<=a[c][0])break;a[i]=a[c];i=c;
  }a[i]=end;
 }return first}
 get size(){return this.a.length}
}
function validateParams(d,p){
 validateDesign(d);
 assert(d.designOnly===true&&p&&safePoint(p.start)&&safePoint(p.goal)&&
  p.start[1]===p.goal[1]&&p.start[1]>=4&&
  !(p.start[0]===p.goal[0]&&p.start[2]===p.goal[2])&&
  Number.isSafeInteger(p.corridorWidth)&&p.corridorWidth>=2&&p.corridorWidth<=8&&
  Number.isSafeInteger(p.footprintWidth)&&p.footprintWidth>=2&&p.footprintWidth<=4&&
  Number.isSafeInteger(p.footprintDepth)&&p.footprintDepth>=2&&p.footprintDepth<=4&&
  p.corridorWidth>=Math.max(p.footprintWidth,p.footprintDepth)&&
  Number.isSafeInteger(p.maxNodes)&&p.maxNodes>=100&&p.maxNodes<=65000&&
  Number.isSafeInteger(p.turnPenalty)&&p.turnPenalty>=0&&p.turnPenalty<=40&&
  Number.isSafeInteger(p.maxBends)&&p.maxBends>=1&&p.maxBends<=30&&
  p.start[0]<d.bounds.width&&p.goal[0]<d.bounds.width&&
  p.start[2]<d.bounds.depth&&p.goal[2]<d.bounds.depth,
  'PARAMETERS');
}
function fullRoute(scene,p){
 const args={start:p.start,destinations:[{id:'target',at:p.goal}],
  width:p.footprintWidth,depth:p.footprintDepth,headroom:2};
 const r=analyzeFootprint(scene,args);
 assert(verifyFootprint(scene,args,r),'ROUTE_REPLAY_FAILED');
 return r;
}
function makeBlockedGrid(scene,w,h,standingY){
 const data=new Uint8Array(w*h),at=(x,z)=>z*w+x;
 for(const [x,y,z] of scene.primitives)
  if(y===standingY||y===standingY+1)data[at(x,z)]=1;
 // 2D summed-area table for guaranteed entire corridor width clearance.
 const sum=new Uint32Array((w+1)*(h+1)),cols=w+1;
 for(let z=0;z<h;z++)for(let x=0;x<w;x++){
  sum[(z+1)*cols+(x+1)]=data[at(x,z)]+sum[z*cols+x+1]+
   sum[(z+1)*cols+x]-sum[z*cols+x];
 }
 return {full:(x,z,size)=>{
   const left=Math.floor((size-1)/2),minX=x-left,minZ=z-left;
   const maxX=minX+size,maxZ=minZ+size;
   if(minX<0||minZ<0||maxX>w||maxZ>h)return false;
   return sum[maxZ*cols+maxX]-sum[minZ*cols+maxX]-
    sum[maxZ*cols+minX]+sum[minZ*cols+minX]===0;
 },occupiedCells:data.reduce((n,v)=>n+v,0)};
}
function astar(clear,start,goal,width,height,p){
 const priority=new Heap(),states=new Map(),parent=new Map();
 const id=(x,z,dir)=>x+','+z+','+dir;
 const from=id(start[0],start[1],4);
 const h=(x,z)=>10*(Math.abs(goal[0]-x)+Math.abs(goal[1]-z));
 states.set(from,0);priority.push([h(...start),0,start[0],start[1],4,from]);
 let expanded=0,final=null;
 while(priority.size){
  const item=priority.pop(),[score,cost,x,z,prior,id0]=item;
  if(cost!==states.get(id0))continue;
  expanded++;assert(expanded<=p.maxNodes,'NODE_BUDGET');
  if(x===goal[0]&&z===goal[1]){final=id0;break;}
  for(let dir=0;dir<4;dir++){
   const [dx,dz]=dirs[dir],nx=x+dx,nz=z+dz;
   if(nx<0||nz<0||nx>=width||nz>=height||!clear(nx,nz))continue;
   const additional=10+(prior===4||prior===dir?0:p.turnPenalty),
    total=cost+additional,kk=id(nx,nz,dir);
   if(total>= (states.get(kk)??Infinity))continue;
   states.set(kk,total);parent.set(kk,id0);
   priority.push([total+h(nx,nz),total,nx,nz,dir,kk]);
  }
 }
 assert(final!==null,'NO_CLEAR_ADAPTIVE_PATH');
 const path=[];let step=final;
 while(step){const [x,z]=step.split(',').map(Number);path.push([x,z]);step=parent.get(step)}
 path.reverse();assert(equal(path[0],start)&&equal(path.at(-1),goal),'PATH_INTEGRITY');
 const waypoints=[path[0]];let turns=0;
 for(let i=2;i<path.length;i++){
  const a=path[i-2],b=path[i-1],c=path[i],
   old=[b[0]-a[0],b[1]-a[1]],now=[c[0]-b[0],c[1]-b[1]];
  if(!equal(old,now)){waypoints.push(b);turns++;}
 }
 waypoints.push(path.at(-1));
 return {path,waypoints,turns,expanded,examinedStates:states.size,
  weightedCost:states.get(final)};
}
function corridorFromWaypoints(points,p){
 const size=p.corridorWidth,pad=Math.floor((size-1)/2),
  y=p.start[1]-2,segments=[];
 for(let i=1;i<points.length;i++){
  const [ax,az]=points[i-1],[bx,bz]=points[i];
  assert(ax===bx||az===bz,'NON_ORTHOGONAL');
  const id='b161-deck-'+String(i).padStart(2,'0');
  segments.push(ax===bx?
   box(id,[ax-pad,y,Math.min(az,bz)-pad],
    [size,2,Math.abs(bz-az)+size]):
   box(id,[Math.min(ax,bx)-pad,y,az-pad],
    [Math.abs(bx-ax)+size,2,size]));
 }
 assert(segments.length>=1&&segments.length<=32,'TOO_MANY_PARTS');
 return segments;
}
function finishDecks(parts,p,baseY){
 const shape=[],y=p.start[1],base=p.start[1]-2;
 for(let i=0;i<parts.length;i++){
  const e=parts[i],[x,,z]=e.origin,[sx,,sz]=e.size,alongX=sx>sz;
  const long=alongX?sx:sz,short=alongX?sz:sx,trim=5,span=long-2*trim;
  if(span<6||short<2)continue; // don't crowd corners or termini
  const tag='b161-f'+String(i).padStart(2,'0');
  // Keep physical walkable body free; outer side trusses at/below deck and
  // glass guards intentionally outside the path footprint, not certification.
  for(const side of [0,1]){
   const edge=alongX?[x+trim,y,z+(side?sz:-1)]:
    [x+(side?sx:-1),y,z+trim];
   shape.push(box(tag+'-glass-'+side,edge,
    alongX?[span,2,1]:[1,2,span],'glass'));
   shape.push(box(tag+'-light-'+side,
    [edge[0]+(alongX?2:0),y+2,edge[2]+(alongX?0:2)],
    alongX?[span-4,1,1]:[1,1,span-4],'glow'));
   shape.push(box(tag+'-lowerbeam-'+side,
    alongX?[x+trim,base-1,z+(side?sz-1:0)]:
     [x+(side?sx-1:0),base-1,z+trim],
    alongX?[span,1,1]:[1,1,span],'metal'));
  }
  shape.push(box(tag+'-pier',
   [x+Math.floor(sx/2),baseY,z+Math.floor(sz/2)],
   [2,base-baseY,2],'metal'));
  shape.push(box(tag+'-overhead',
   alongX?[x+Math.floor(sx/2),y+6,z-1]:
    [x-1,y+6,z+Math.floor(sz/2)],
   alongX?[1,1,sz+2]:[sx+2,1,1],'accent'));
 }
 return shape;
}
export function planAdaptiveSkybridge(design,params=DEFAULT_ROUTE,{supportBaseY=6}={}){
 validateParams(design,params);
 assert(Number.isSafeInteger(supportBaseY)&&supportBaseY>=0&&
  supportBaseY<params.start[1]-3,'SUPPORT_SETTING');
 const source=compileDesign(design);
 assert(verifyCompiled(design,source)&&source.designOnly===true&&
  source.readiness==='NOT_PREPARED'&&source.worldContacts===0&&
  source.BuildPlan.operations.length===0,'SOURCE_UNSAFE');
 const before=fullRoute(source,params);
 assert(before.targets[0].status==='FOOTPRINT_UNREACHABLE','SOURCE_ALREADY_CONNECTED');
 const area=makeBlockedGrid(source,design.bounds.width,design.bounds.depth,
  params.start[1]);
 const originalStart=[params.start[0],params.start[2]],
  originalGoal=[params.goal[0],params.goal[2]];
 assert(area.full(...originalStart,params.corridorWidth)&&
  area.full(...originalGoal,params.corridorWidth),'ENDPOINT_CLEARANCE');
 const search=astar((x,z)=>area.full(x,z,params.corridorWidth),
  originalStart,originalGoal,design.bounds.width,design.bounds.depth,params);
 assert(search.turns<=params.maxBends,'BEND_BUDGET');
 const floors=corridorFromWaypoints(search.waypoints,params);
 const candidate={...structuredClone(design),
  id:'doppler-switchback-b161-adaptive-floor',
  title:'DOPPLER — 適応経路探索で作られた回廊床',
  brief:'局所全セルの障害物体積から経路を探索し、通行空間と支持床を検証した自動候補。施工・強度・実機プレイヤー物理は未認証。',
  elements:[...structuredClone(design.elements),...floors]};
 validateDesign(candidate);
 assert(equal(candidate.elements.slice(0,design.elements.length),
  design.elements),'SOURCE_ELEMENTS_CHANGED');
 const floorScene=compileDesign(candidate);
 assert(verifyCompiled(candidate,floorScene),'FLOOR_COMPILE');
 const floorRoute=fullRoute(floorScene,params);
 assert(floorRoute.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY',
  'FLOOR_NOT_TRAVERSABLE');
 const finishing=finishDecks(floors,params,supportBaseY);
 assert(finishing.length>=4,'NO_ARCHITECTURAL_COMPONENTS');
 const finished={...structuredClone(candidate),
  id:'doppler-switchback-terminal-adaptive-r2',
  title:'DOPPLER — 最短候補探索による適応空中回廊 R2',
  brief:'障害物を避ける複数回曲がる自動回廊。全セル通路と頭上空間を確認した設計案。橋梁強度・転落防止・Minecraft実機衝突・施工は未認証。',
  elements:[...structuredClone(candidate.elements),...finishing]};
 validateDesign(finished);
 const finalScene=compileDesign(finished);
 assert(verifyCompiled(finished,finalScene)&&
  finalScene.geometrySha256!==floorScene.geometrySha256,'FINISH_NOT_VISIBLE');
 const finalRoute=fullRoute(finalScene,params);
 assert(finalRoute.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  finalRoute.targets[0].path.every(a=>a[1]===params.start[1]),'FINISH_BROKE_BODY_ROUTE');
 const report={schema:SCHEMA,
  sourceSha256:source.sourceSha256,
  sourceGeometrySha256:source.geometrySha256,
  initialProofSha256:before.sha256,
  generatedFloorSha256:floorScene.sourceSha256,
  generatedFloorGeometrySha256:floorScene.geometrySha256,
  finishedSourceSha256:finalScene.sourceSha256,
  finishedGeometrySha256:finalScene.geometrySha256,
  floorRouteProofSha256:floorRoute.sha256,
  finalRouteProofSha256:finalRoute.sha256,
  searchExpansionCount:search.expanded,searchStates:search.examinedStates,
  searchWeightedCost:search.weightedCost,
  centerlineSteps:search.path.length-1,
  centerlineTurns:search.turns,
  corridorSegments:floors.length,
  final2x2FlatMoves:finalRoute.targets[0].steps,
  corridorWidth:params.corridorWidth,
  sourceAtStandingLevel:area.occupiedCells,
  finishingElementCount:finishing.length,
  dynamicWaypoints:search.waypoints,
  originalDesignUnmodified:true,geometryProofOnly:true,
  structuralStrengthCertified:false,fallProtectionCertified:false,
  playerCollisionCertified:false,constructionApproved:false,
  readiness:'NOT_PREPARED',worldContacts:0,worldCoordinates:null,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 return {source,before,search,floors,candidate,floorScene,floorRoute,
  finished,finalScene,finalRoute,finishing,
  report:{...report,sha256:sha(report)}};
}
export function verifyAdaptiveSkybridge(design,params,report){
 try{
  const expected=planAdaptiveSkybridge(design,params);
  return equal(report,expected.report)&&
   report.constructionApproved===false&&report.gates?.length===9&&
   report.gates.every(x=>x==='BLOCKED')&&
   report.BuildPlan?.operations?.length===0;
 }catch{return false;}
}

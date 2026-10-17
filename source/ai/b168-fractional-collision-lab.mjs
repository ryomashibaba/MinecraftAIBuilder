/**
 * B168 — experiment-only fractional AABB / step-up collision laboratory.
 *
 * Every collidable part is a local axis-aligned solid with fractional Y,
 * independent of Minecraft block registry or runtime entity behaviour.
 * A "pass" means ONLY that the specified simplified lift-first, sample-
 * swept, partial-foot-contact model found a collision-free path. Never
 * silently upgrade that result into actual Minecraft traversal permission.
 *
 * Evaluates both synthetic positive and negative fixtures and real B166
 * FULL-CUBE stair voxels. B166 never supplies half-height Minecraft blocks;
 * virtual half-slabs exist ONLY inside controlled fixtures.
 */
import {createHash} from 'node:crypto';
import {buildInterlevelNetwork,verifyInterlevelNetwork} from './b166-interlevel-network.mjs';
export const SCHEMA='minecraftaibuilder-b168-fractional-collision-v1';
const EPS=1e-7;
const assert=(x,code)=>{if(!x)throw Error('B168_'+code)};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const H=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const Q=x=>Math.round(x*2)/2;
const key=(a)=>a.map(v=>Math.round(v*2)).join(',');
const dirs=[[.5,0],[-.5,0],[0,.5],[0,-.5]];
function overlaps(a,b){return a[0]<b[1]-EPS&&b[0]<a[1]-EPS}
const overlapLength=(a,b)=>Math.max(0,Math.min(a[1],b[1])-Math.max(a[0],b[0]));
const box=(x0,y0,z0,x1,y1,z1)=>[x0,y0,z0,x1,y1,z1];
const validBox=b=>Array.isArray(b)&&b.length===6&&b.every(n=>Number.isFinite(n)&&
 Math.abs(n*2-Math.round(n*2))<EPS)&&
 b[0]<b[3]&&b[1]<b[4]&&b[2]<b[5];
export function createCollisionWorld(boxes,{region}={}){
 assert(Array.isArray(boxes)&&boxes.length>=1&&boxes.length<=32000&&
  boxes.every(validBox),'INVALID_BOXES');
 assert(region&&Array.isArray(region.x)&&Array.isArray(region.z)&&
  Array.isArray(region.y)&&[...region.x,...region.z,...region.y]
    .every(Number.isFinite)&&
  region.x[0]<region.x[1]&&region.z[0]<region.z[1]&&
  region.y[0]<region.y[1],'INVALID_REGION');
 const solids=boxes.map(b=>[...b]);
 // Hash only immutable data, never expose a mutable index as a proof.
 const proofHash=H({solids,region});
 const bins=new Map();
 for(let i=0;i<solids.length;i++){
  const b=solids[i];
  for(let x=Math.floor(b[0]);x<Math.ceil(b[3]);x++)
   for(let z=Math.floor(b[2]);z<Math.ceil(b[5]);z++){
    const k=x+','+z;if(!bins.has(k))bins.set(k,[]);
    bins.get(k).push(i);
   }
 }
 const query=(x,z,w,d)=>{
  const ix=new Set();
  for(let bx=Math.floor(x);bx<Math.ceil(x+w);bx++)
   for(let bz=Math.floor(z);bz<Math.ceil(z+d);bz++)
    for(const i of bins.get(bx+','+bz)||[])ix.add(i);
  return [...ix].map(i=>solids[i]);
 };
 return {boxes:solids,region,proofHash,query};
}
function collision(world,x,y,z,profile){
 const {width,depth,height}=profile;
 for(const b of world.query(x,z,width,depth))
  if(overlapLength([x,x+width],[b[0],b[3]])>EPS&&
   overlapLength([z,z+depth],[b[2],b[5]])>EPS&&
   overlapLength([y,y+height],[b[1],b[4]])>EPS)return true;
 return false;
}
function support(world,x,y,z,profile){
 let area=0;
 for(const b of world.query(x,z,profile.width,profile.depth))
  if(Math.abs(y-b[4])<EPS)
   area+=overlapLength([x,x+profile.width],[b[0],b[3]])*
    overlapLength([z,z+profile.depth],[b[2],b[5]]);
 return Math.min(1,area/(profile.width*profile.depth));
}
function legal(world,x,y,z,p){
 const r=world.region;
 return x>=r.x[0]-EPS&&z>=r.z[0]-EPS&&
  x+p.width<=r.x[1]+EPS&&z+p.depth<=r.z[1]+EPS&&
  y>=r.y[0]-EPS&&y+p.height<=r.y[1]+EPS&&
  support(world,x,y,z,p)+EPS>=p.minimumSupportFraction&&
  !collision(world,x,y,z,p);
}
function surfaces(world,x,z,p){
 const found=new Set();
 for(const b of world.query(x,z,p.width,p.depth))found.add(b[4]);
 return [...found].sort((a,b)=>a-b);
}
function safeTransition(world,a,b,p){
 const [x,y,z]=a,[nx,ny,nz]=b;
 if(Math.abs(nx-x)+Math.abs(nz-z)>.5+EPS||
  Math.abs(nx-x)+Math.abs(nz-z)<.5-EPS)return false;
 if(ny>y+p.maxStepHeight+EPS||y>ny+p.maxDrop+EPS)return false;
 // Lift-first for an ascent. Translating at maximum height prevents
 // tunnelling through a vertical wall if a collision occurs in the sweep.
 const high=Math.max(y,ny);
 if(collision(world,x,high,z,p))return false;
 for(let s=0;s<=4;s++){
  const t=s/4,tx=x+(nx-x)*t,tz=z+(nz-z)*t;
  if(collision(world,tx,high,tz,p))return false;
 }
 if(collision(world,nx,ny,nz,p))return false;
 return true;
}
export function planFractionalWalk(world,start,goal,profile={}){
 const p={width:profile.width??2,depth:profile.depth??2,
  height:profile.height??1.8,
  maxStepHeight:profile.maxStepHeight??.5,
  maxDrop:profile.maxDrop??1,
  minimumSupportFraction:profile.minimumSupportFraction??.125,
  maxNodes:profile.maxNodes??15000};
 assert([p.width,p.depth,p.height,p.maxStepHeight,p.maxDrop,
  p.minimumSupportFraction,p.maxNodes].every(Number.isFinite)&&
  p.width>=.5&&p.depth>=.5&&p.height>=.5&&
  p.width<=3&&p.depth<=3&&p.height<=3&&
  p.maxStepHeight>=0&&p.maxStepHeight<=1&&
  p.maxDrop>=0&&p.maxDrop<=2&&
  p.minimumSupportFraction>0&&p.minimumSupportFraction<=1&&
  Number.isSafeInteger(p.maxNodes)&&p.maxNodes>=1&&p.maxNodes<=200000,
  'INVALID_PROFILE');
 assert([start,goal].every(a=>Array.isArray(a)&&a.length===3&&
  a.every(n=>Number.isFinite(n)&&Math.abs(n*2-Math.round(n*2))<EPS)),
  'INVALID_ENDPOINTS');
 const basis={sourceGeometrySha256:world.proofHash,start,goal,profile:p};
 if(!legal(world,...start,p)||!legal(world,...goal,p)){
  const result={schema:SCHEMA,...basis,status:'INVALID_ENDPOINT_SUPPORT_OR_HEADROOM',
   reachable:false,moves:null,path:[],visited:0,physicsCertified:false,
   actualMinecraftCollisionCertified:false,
   wholeBodySupportCertified:false};
  return {...result,sha256:H(result)};
 }
 const origin=key(start),destination=key(goal),queue=[start],
  previous=new Map(),visited=new Set([origin]);
 let found=false,limit=false;
 for(let head=0;head<queue.length;head++){
  if(head>=p.maxNodes){limit=true;break;}
  const [x,y,z]=queue[head],old=key(queue[head]);
  if(old===destination){found=true;break;}
  for(const [dx,dz] of dirs){
   const nx=Q(x+dx),nz=Q(z+dz);
   if(nx<world.region.x[0]-EPS||nz<world.region.z[0]-EPS||
    nx+p.width>world.region.x[1]+EPS||
    nz+p.depth>world.region.z[1]+EPS)continue;
   for(const h of surfaces(world,nx,nz,p)){
    if(Math.abs(h*2-Math.round(h*2))>EPS)continue;
    const next=[nx,h,nz],k=key(next);
    if(visited.has(k)||!legal(world,...next,p)||
     !safeTransition(world,[x,y,z],next,p))continue;
    visited.add(k);previous.set(k,old);queue.push(next);
   }
  }
 }
 const path=[];
 if(found){
  let current=destination;
  while(current){
   path.push(current.split(',').map(n=>Number(n)/2));
   if(current===origin)break;
   current=previous.get(current);assert(current,'BROKEN_PATH');
  }
  path.reverse();assert(equal(path[0],start)&&
   equal(path.at(-1),goal),'PATH_ENDPOINT_INTEGRITY');
  for(let i=1;i<path.length;i++)assert(
   legal(world,...path[i],p)&&
   safeTransition(world,path[i-1],path[i],p),'PATH_REPLAY');
 }
 const report={schema:SCHEMA,...basis,
  status:found?'PASS_SIMPLIFIED_AABB_ONLY':limit?'UNKNOWN_SEARCH_BUDGET':
   'NO_SIMPLIFIED_AABB_ROUTE',
  reachable:found,moves:found?path.length-1:null,path,
  visited:queue.length,physicsCertified:false,
  actualMinecraftCollisionCertified:false,wholeBodySupportCertified:false};
 return {...report,sha256:H(report)};
}
export function createFixture(kind){
 assert(['half-step','full-step','low-ceiling','no-floor','lateral-wall']
  .includes(kind),'FIXTURE_KIND');
 const blocks=[];
 for(let x=0;x<4;x++)for(let z=0;z<9;z++)
  blocks.push(box(x,0,z,x+1,1,z+1));
 if(kind!=='no-floor'){
  const h=kind==='full-step'?1:.5;
  for(let x=0;x<4;x++)for(let z=3;z<9;z++)
   blocks.push(box(x,1,z,x+1,1+h,z+1));
 }
 if(kind==='no-floor'){
  // Unsupported destination even though the input region is traversable.
  for(let x=0;x<4;x++)for(let z=7;z<9;z++)
   blocks.push(box(x,3,z,x+1,4,z+1));
 }
 if(kind==='low-ceiling'){
  for(let x=0;x<4;x++)for(let z=3;z<9;z++)
   blocks.push(box(x,3,z,x+1,3.5,z+1));
 }
 if(kind==='lateral-wall'){
  for(let x=0;x<4;x++)for(let y=1;y<4;y++)
   blocks.push(box(x,y,2,x+1,y+1,2.5));
 }
 const world=createCollisionWorld(blocks,{region:{x:[0,4],z:[0,9],y:[0,6]}});
 const goal=[1,kind==='full-step'?2:kind==='no-floor'?1:1.5,5];
 return {kind,world,start:[1,1,0],goal};
}
export function actualStairRegion(scene,wing){
 assert(['north','south'].includes(wing),'UNKNOWN_WING');
 const isNorth=wing==='north';
 const x=isNorth?30:79,z=isNorth?15:73;
 const reg={x:[x-1,x+5],z:[z-1,z+21],y:[17,30]};
 const solids=scene.primitives.filter(p=>p[0]>=reg.x[0]&&
  p[0]<reg.x[1]&&p[2]>=reg.z[0]&&p[2]<reg.z[1]&&
  p[1]>=reg.y[0]&&p[1]<reg.y[1]).map(
   p=>box(p[0],p[1],p[2],p[0]+1,p[1]+1,p[2]+1));
 return {wing,world:createCollisionWorld(solids,{region:reg}),
  start:[x,19,z],goal:[x,26,z+15]};
}
export function runCollisionLab(original){
 const originalString=JSON.stringify(original);
 const parent=buildInterlevelNetwork(original);
 assert(verifyInterlevelNetwork(original,parent.report),'UNVERIFIED_PARENT');
 const fixtureSpecs=['half-step','full-step','low-ceiling','lateral-wall'];
 const fixtureResults=fixtureSpecs.map(kind=>{
  const fx=createFixture(kind);
  const small=planFractionalWalk(fx.world,fx.start,fx.goal);
  return {id:kind,status:small.status,reachable:small.reachable,
   moves:small.moves,geometrySha256:fx.world.proofHash,
   reportSha256:small.sha256,visited:small.visited};
 });
 assert(fixtureResults[0].reachable===true&&
  fixtureResults[1].reachable===false&&
  fixtureResults[2].reachable===false&&
  fixtureResults[3].reachable===false,
  'CONTROL_FIXTURES_INVALID');
 const stairs=['north','south'].map(wing=>{
  const r=actualStairRegion(parent.compiled,wing);
  const narrow=planFractionalWalk(r.world,r.start,r.goal,{
   width:1,depth:1,maxStepHeight:1});
  const wideHalf=planFractionalWalk(r.world,r.start,r.goal,{
   width:2,depth:2,maxStepHeight:.5});
  const wideFull=planFractionalWalk(r.world,r.start,r.goal,{
   width:2,depth:2,maxStepHeight:1});
  return {wing,worldSourceGeometrySha256:parent.compiled.geometrySha256,
   regionBoxes:r.world.boxes.length,
   narrow1x1Step1Status:narrow.status,
   wide2x2StepHalfStatus:wideHalf.status,
   wide2x2Step1Status:wideFull.status,
   stepHalf2x2Reachable:wideHalf.reachable,
   step1x1Reachable:narrow.reachable,
   step1Width2Reachable:wideFull.reachable,
   modelApproximatesMinecraftCollision:false,
   syntheticHalfSlabWasWrittenToSource:false};
 });
 assert(equal(JSON.stringify(original),JSON.stringify(JSON.parse(originalString)))&&
  parent.report.constructionApproved===false,'MUTATION_OR_WORLD_WRITE');
 const core={schema:SCHEMA,sceneSha256:parent.compiled.sourceSha256,
  geometrySha256:parent.compiled.geometrySha256,
  inheritedB166ProofSha256:parent.report.sha256,
  fixtureResults,actualStairs:stairs,
  supportSemantics:'minimum surface contact; not whole footprint support or game physics',
  transitionSemantics:'sampled collision AABB lift-first translation at half-unit anchors',
  halfSlabFixturesOnly:true,originalB166ModelUnchanged:true,
  minecraftHalfBlockShapesLoaded:false,
  actualMinecraftCollisionCertified:false,
  exactMovementPhysicsCertified:false,
  constructionApproved:false,worldContacts:0,worldCoordinates:null,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}};
 return {parent,report:{...core,sha256:H(core)}};
}
export function verifyCollisionLab(original,report){
 try{
  const expected=runCollisionLab(original).report;
  return equal(expected,report)&&report.constructionApproved===false&&
   report.gates.length===9&&report.gates.every(x=>x==='BLOCKED')&&
   report.BuildPlan.operations.length===0;
 }catch{return false;}
}

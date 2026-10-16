/**
 * B150 — conservative, edition-neutral change-of-level route PROPOSALS.
 * This is not Minecraft Education collision physics or a pathfinding bot.
 * A 1-voxel vertical transition is explicitly NOT certified as a staircase.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-b150-vertical-candidates-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const good=(condition,label)=>{if(!condition)throw Error('B150_'+label);};
const pt=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=128);
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
/** Stable min-heap used instead of O(n²) shortest path scans. */
class MinHeap{
 constructor(){this.a=[];}
 push(v){const a=this.a;let i=a.length;a.push(v);while(i>0){const j=(i-1)>>1;if(a[j][0]<=v[0])break;a[i]=a[j];i=j;}a[i]=v;}
 pop(){const a=this.a,root=a[0],v=a.pop();if(a.length){let i=0;while(2*i+1<a.length){let j=2*i+1;if(j+1<a.length&&a[j+1][0]<a[j][0])j++;if(a[j][0]>=v[0])break;a[i]=a[j];i=j;}a[i]=v;}return root;}
 get size(){return this.a.length;}
}
export function analyzeVerticalCandidates(scene,{entrance,destinations,maxNodes=160000}={}){
 good(scene?.designOnly===true&&scene?.readiness==='NOT_PREPARED'&&
  scene?.worldContacts===0&&scene?.worldCoordinates===null&&
  scene?.BuildPlan?.operations?.length===0&&
  /^[a-f0-9]{64}$/.test(scene.sourceSha256||'')&&
  /^[a-f0-9]{64}$/.test(scene.geometrySha256||'')&&
  Array.isArray(scene.primitives)&&scene.primitives.length>0&&scene.primitives.length<=160000,
  'UNSAFE_GEOMETRY');
 good(pt(entrance)&&Array.isArray(destinations)&&destinations.length>=1&&
  destinations.length<=12&&destinations.every(x=>x&&typeof x.id==='string'&&
   /^[a-z][a-z0-9-]{1,39}$/.test(x.id)&&pt(x.at))&&
  new Set(destinations.map(x=>x.id)).size===destinations.length,'BAD_TARGETS');
 good(Number.isSafeInteger(maxNodes)&&maxNodes>0&&maxNodes<=160000,'INVALID_LIMIT');
 const solids=new Set();
 for(const p of scene.primitives){
  good(Array.isArray(p)&&p.length===5&&p.slice(0,3).every(Number.isSafeInteger),
   'MALFORMED_VOXELS');
  const id=K(p[0],p[1],p[2]);good(!solids.has(id),'DUPLICATE_VOXEL');solids.add(id);
 }
 const standing=new Map();
 for(const p of scene.primitives){
  const [x,y,z]=p,fy=y+1;
  if(fy+1>=128||solids.has(K(x,fy,z))||solids.has(K(x,fy+1,z)))continue;
  standing.set(K(x,fy,z),[x,fy,z]);
 }
 const start=K(...entrance),dist=new Map(),prev=new Map(),heap=new MinHeap();
 if(standing.has(start)){dist.set(start,0);heap.push([0,start]);}
 let expanded=0,limited=false,stepEdgeCandidates=0;
 // Every vertical edge is a candidate ONLY, and has 200001 cost vs 1 for
 // level walking. Thus a route minimizes unverified jumps first.
 while(heap.size){
  const [cost,k]=heap.pop();if(dist.get(k)!==cost)continue;
  if(expanded>=maxNodes){limited=true;break;}
  expanded++;
  const [x,y,z]=standing.get(k);
  for(const [dx,dz] of dirs)for(const dy of [0,1,-1]){
   const v=K(x+dx,y+dy,z+dz);
   if(!standing.has(v))continue;
   if(dy!==0)stepEdgeCandidates++;
   const weight=dy===0?1:200001;
   const score=cost+weight;
   if(!dist.has(v)||score<dist.get(v)){
    dist.set(v,score);prev.set(v,{from:k,dy});heap.push([score,v]);
   }
  }
 }
 const routes=destinations.map(t=>{
  const goal=K(...t.at),walkable=standing.has(goal);
  let status=!standing.has(start)?'INVALID_ENTRANCE':!walkable?'INVALID_DESTINATION':
   !dist.has(goal)?limited?'UNKNOWN_SEARCH_LIMIT':'UNREACHABLE':'';
  const path=[],stepTransitions=[];
  if(!status){
   let cur=goal;
   for(let i=0;i<=standing.size;i++){
    path.push(standing.get(cur));
    if(cur===start)break;
    const link=prev.get(cur);
    good(link,'BROKEN_PREDECESSOR');
    if(link.dy!==0)stepTransitions.push({from:standing.get(link.from),to:standing.get(cur),
     rise:link.dy,verifiedMinecraftMotion:false});
    cur=link.from;
   }
   path.reverse();stepTransitions.reverse();
   good(JSON.stringify(path[0])===JSON.stringify(entrance),'PATH_ORIGIN');
   status=stepTransitions.length?'STEP_CANDIDATE_ONLY':'PASS_FLAT_GEOMETRY';
  }
  return {id:t.id,at:t.at,status,standingDestination:walkable,
   moveCount:path.length?path.length-1:null,stepCandidateCount:stepTransitions.length,
   path,stepTransitions,stairsCertified:false,physicalMovementCertified:false};
 });
 const report={
  schema:SCHEMA,sourceSha256:scene.sourceSha256,geometrySha256:scene.geometrySha256,
  entrance,standingCellCount:standing.size,expandedNodes:expanded,
  consideredStepEdges:stepEdgeCandidates,searchLimited:limited,routes,
  explanation:'Flat paths are geometric only. Every +/-1 height transition requires a future explicit Minecraft movement/step/stair validation.',
  geometryOnly:true,stairsCertified:false,physicalMovementCertified:false,
  constructionApproved:false,readiness:'NOT_PREPARED',worldContacts:0,
  worldCoordinates:null,BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')
 };
 return {...report,sha256:sha(report)};
}
export function verifyVerticalCandidates(scene,parameters,report){
 try{
  return JSON.stringify(analyzeVerticalCandidates(scene,parameters))===JSON.stringify(report)&&
   report.constructionApproved===false&&report.stairsCertified===false&&
   report.gates.length===9&&report.gates.every(x=>x==='BLOCKED')&&
   report.BuildPlan.operations.length===0;
 }catch{return false;}
}

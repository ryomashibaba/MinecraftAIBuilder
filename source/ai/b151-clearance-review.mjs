/**
 * B151 generic local-space diagnostics for corridor cross-section width and
 * flat connected floor clusters. It does not assign Minecraft block identities,
 * certify stair physics, infer enclosed rooms, or produce BuildPlan operations.
 */
import {createHash} from 'node:crypto';
import {verifyVerticalCandidates} from './b150-vertical-candidates.mjs';
export const SCHEMA='minecraftaibuilder-b151-clearance-v1';
const K=(x,y,z)=>x+','+y+','+z;
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const ok=(c,s)=>{if(!c)throw Error('B151_'+s);};
const cardinal=[[1,0],[-1,0],[0,1],[0,-1]];
export function analyzeClearance(scene,verticalReport,{minWidth=4,maxWidth=24}={}){
 ok(scene?.designOnly===true&&scene?.readiness==='NOT_PREPARED'&&
  scene?.worldContacts===0&&scene?.worldCoordinates===null&&
  scene?.BuildPlan?.operations?.length===0&&
  Array.isArray(scene.primitives)&&scene.primitives.length>0&&scene.primitives.length<=160000&&
  /^[0-9a-f]{64}$/.test(scene.geometrySha256||''),'INVALID_SCENE');
 ok(Number.isSafeInteger(minWidth)&&minWidth>=1&&minWidth<=16&&
  Number.isSafeInteger(maxWidth)&&maxWidth>=minWidth&&maxWidth<=32,
  'WIDTH_PARAMETERS');
 ok(verticalReport?.geometrySha256===scene.geometrySha256&&
  verticalReport?.sourceSha256===scene.sourceSha256&&
  verticalReport?.schema==='minecraftaibuilder-b150-vertical-candidates-v1'&&
  verticalReport?.constructionApproved===false&&verticalReport?.stairsCertified===false&&
  verticalReport?.BuildPlan?.operations?.length===0&&
  verticalReport?.gates?.length===9&&verticalReport.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(verticalReport.routes)&&
  verifyVerticalCandidates(scene,{
   entrance:verticalReport.entrance,
   destinations:verticalReport.routes.map(r=>({id:r.id,at:r.at}))
  },verticalReport),'INVALID_VERTICAL_SOURCE');
 const solids=new Set();
 for(const p of scene.primitives){
  ok(Array.isArray(p)&&p.length===5&&p.slice(0,3).every(Number.isSafeInteger),
   'INVALID_PRIMITIVE');
  const key=K(...p.slice(0,3));ok(!solids.has(key),'DUPLICATE_PRIMITIVE');solids.add(key);
 }
 const standing=new Map();
 for(const s of scene.primitives){
  const [x,y,z]=s;
  if(y+2>=128||solids.has(K(x,y+1,z))||solids.has(K(x,y+2,z)))continue;
  standing.set(K(x,y+1,z),[x,y+1,z]);
 }
 // Connected components are flat floor-space islands, NOT necessarily rooms.
 const unseen=new Set(standing.keys()),components=[];
 while(unseen.size){
  const seed=unseen.values().next().value,queue=[seed];unseen.delete(seed);
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<queue.length;i++){
   const [x,y,z]=standing.get(queue[i]);
   for(const [j,v] of [x,y,z].entries()){
    if(v<lo[j])lo[j]=v;if(v>hi[j])hi[j]=v;
   }
   for(const [dx,dz] of cardinal){
    const n=K(x+dx,y,z+dz);
    if(unseen.delete(n))queue.push(n);
   }
  }
  components.push({size:queue.length,min:lo,max:hi,containsEntrance:queue.includes(K(...verticalReport.entrance))});
 }
 components.sort((a,b)=>b.size-a.size||a.min[1]-b.min[1]||a.min[2]-b.min[2]||a.min[0]-b.min[0]);
 const entry=components.find(c=>c.containsEntrance);
 function transverseWidth(p,axis){
  const [x,y,z]=p;let width=1;
  for(const delta of [-1,1])
   for(let d=1;d<maxWidth;d++){
    const q=axis==='x'?K(x+d*delta,y,z):K(x,y,z+d*delta);
    if(!standing.has(q))break;
    width++;
   }
  return Math.min(maxWidth,width);
 }
 const routeSummaries=verticalReport.routes.map(r=>{
  const path=r.path||[],samples=[];
  for(let i=0;i<path.length;i++){
   const p=path[i],last=path[i-1],next=path[i+1];
   const moves=[];
   for(const neighbor of [last,next]){
    if(!neighbor)continue;
    const dx=neighbor[0]-p[0],dz=neighbor[2]-p[2];
    if(dx!==0&&dz===0)moves.push('z');
    else if(dz!==0&&dx===0)moves.push('x');
   }
   const axes=moves.length?[...new Set(moves)]:['x','z'];
   const clearWidth=Math.min(...axes.map(axis=>transverseWidth(p,axis)));
   samples.push({at:p,clearWidth,limitedTo:maxWidth});
  }
  const narrow=samples.filter(s=>s.clearWidth<minWidth);
  const result={id:r.id,status:r.status,
   minCrossSectionWidth:samples.length?Math.min(...samples.map(s=>s.clearWidth)):null,
   requestedMinWidth:minWidth,measuredPoints:samples.length,
   narrowPointCount:narrow.length,
   narrowWitnesses:narrow.slice(0,40),
   routeSamples:samples,
   widthStatus:!samples.length?'NO_ROUTE':
    narrow.length?'BELOW_REQUESTED_WIDTH':'PASS_WIDTH_GEOMETRY',
   stairsCertified:false,realWorldMovementCertified:false};
  return result;
 });
 const payload={schema:SCHEMA,sourceSha256:scene.sourceSha256,
  geometrySha256:scene.geometrySha256,verticalProofSha256:verticalReport.sha256,
  minWidth,maxWidth,standingCells:standing.size,flatComponentCount:components.length,
  originFlatReachableCells:entry?.size||0,otherFlatCells:standing.size-(entry?.size||0),
  largestFlatComponents:components.slice(0,10),routes:routeSummaries,
  interpretation:'Cross-sectional width perpendicular to the route, in local voxels with floor support and two empty cells. Does not prove swept clearance, safe turning, actual staircase motion, structural load, or enclosed rooms.',
  geometryOnly:true,stairsCertified:false,realWorldMovementCertified:false,
  constructionApproved:false,readiness:'NOT_PREPARED',
  worldContacts:0,worldCoordinates:null,BuildPlan:{operations:[]},
  gates:Array(9).fill('BLOCKED')};
 return {...payload,sha256:sha(payload)};
}
export function verifyClearance(scene,vertical,opts,report){
 try{
  const expected=analyzeClearance(scene,vertical,opts);
  return JSON.stringify(expected)===JSON.stringify(report)&&
   report.constructionApproved===false&&report.stairsCertified===false&&
   report.BuildPlan.operations.length===0&&report.gates.every(g=>g==='BLOCKED');
 }catch{return false;}
}

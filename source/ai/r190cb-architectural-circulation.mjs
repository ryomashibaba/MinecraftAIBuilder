/** R190-CB: authored architectural body + author-explicit riser/landing itinerary.
 * SOURCE study only, no generation from fixed building category or Minecraft access.
 * Explicit recorded itinerary may cut only designated channels; no inferred connections.
 */
import {createHash} from 'node:crypto';
import {compileR190CA} from './r190ca-authored-space-mass.mjs';
export const SCHEMA='minecraftaibuilder-r190cb-explicit-stair-space-v1';
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=(ok,why)=>{if(!ok)throw Error('R190CB_'+why)};
const exact=(x,keys)=>x&&!Array.isArray(x)&&typeof x==='object'&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const num=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
function inside(x,z,poly){
 let v=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])v=!v;
 }return v;
}
export function compileR190CB(raw){
 const bytes=typeof raw==='string'?Buffer.from(raw,'utf8'):raw;
 fail(bytes instanceof Uint8Array&&bytes.length>500&&bytes.length<180000,'RAW');
 let data;try{data=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(bytes))}
 catch{throw Error('R190CB_JSON')}
 fail(exact(data,['schema','id','title','originalBriefSha256','architecture','circulation','designOnly'])&&
  data.schema===SCHEMA&&data.designOnly===true,'FORMAT');
 fail(/^[a-z][a-z0-9-]{3,50}$/.test(data.id)&&
 typeof data.title==='string'&&data.title.length>=10&&data.title.length<=130,'ID');
 fail(/^[a-f0-9]{64}$/.test(data.originalBriefSha256)&&
 data.architecture.originalBriefSha256===data.originalBriefSha256,'BRIEF');
 const a=compileR190CA(Buffer.from(JSON.stringify(data.architecture)));
 fail(exact(data.circulation,['type','nodes','authorPurpose'])&&
  data.circulation.type==='AUTHOR_EXPLICIT_RISER_AND_LANDING'&&
  typeof data.circulation.authorPurpose==='string'&&data.circulation.authorPurpose.length>=30,'CIRCULATION');
 const nodes=data.circulation.nodes;
 fail(Array.isArray(nodes)&&nodes.length>=14&&nodes.length<=320,'NODE_COUNT');
 const {width:w,height:h,depth:d}=a.bounds;
 const unique=new Set();
 for(let i=0;i<nodes.length;i++){
  const n=nodes[i];
  fail(Array.isArray(n)&&n.length===3&&num(n[0],1,w-3)&&num(n[1],3,h-4)&&
    num(n[2],1,d-3),'NODE_BOUNDS');
  fail(!unique.has(n.join(',')),'DUPLICATE_NODE');
  unique.add(n.join(','));
  if(i){
   const old=nodes[i-1],dx=Math.abs(n[0]-old[0]),dy=n[1]-old[1],
    dz=Math.abs(n[2]-old[2]);
   const horizontal=(dy===0&&dx+dz===1),riser=(dy===1&&dx+dz===2&&
     (dx===0||dz===0));
   fail(horizontal||riser,'UNSUPPORTED_TRANSITION');
  }
 }
 const k=(x,y,z)=>(y*d+z)*w+x;
 const source=new Map(a.primitives.map(([x,y,z,m])=>[k(x,y,z),m]));
 const supports=new Map(),air=new Set();
 for(const [x,y,z] of nodes)for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
  supports.set(k(x+dx,y-1,z+dz),0);
  for(let off=0;off<3;off++)air.add(k(x+dx,y+off,z+dz));
 }
 for(const idx of supports.keys())fail(!air.has(idx),'OVERLAPPING_STAIR_CLEARANCE');
 // Author has explicitly specified every corridor and landing footstep. No guessed stairs.
 for(const idx of air)source.delete(idx);
 for(const [idx,material] of supports)source.set(idx,material);
 const protectedVoidResults=data.architecture.protectedVoids.map(q=>{
  let occupied=0,checked=0;
  for(let y=q.origin[1];y<q.origin[1]+q.size[1];y++)
   for(let z=q.origin[2];z<q.origin[2]+q.size[2];z++)
    for(let x=q.origin[0];x<q.origin[0]+q.size[0];x++){
     checked++;if(source.has(k(x,y,z)))occupied++;
    }
  return {id:q.id,checked,occupied,pass:occupied===0};
 });
 fail(protectedVoidResults.every(q=>q.pass),'PROTECTED_VOID');
 const programMetrics=data.architecture.programs.map(q=>{
  let total=0,clear=0,noFloor=0,blocked=0;
  const px=q.polygon,loX=Math.floor(Math.min(...px.map(p=>p[0]))),
   hiX=Math.ceil(Math.max(...px.map(p=>p[0]))),
   loZ=Math.floor(Math.min(...px.map(p=>p[1]))),hiZ=Math.ceil(Math.max(...px.map(p=>p[1])));
  for(let x=loX;x<=hiX;x++)for(let z=loZ;z<=hiZ;z++){
   if(!inside(x+.5,z+.5,px))continue;total++;
   if(!source.has(k(x,q.floorY,z))){noFloor++;continue;}
   if([1,2,3].some(off=>source.has(k(x,q.floorY+off,z)))){blocked++;continue;}
   clear++;
  }
  return {id:q.id,purpose:q.purpose,floorY:q.floorY,
   requestedCells:total,supportedClearCells:clear,unsupportedCells:noFloor,
   blockedCells:blocked,supportedClearFraction:total?Number((clear/total).toFixed(4)):0};
 });
 const final=[...source.entries()].sort(([a],[b])=>a-b).map(([idx,material])=>{
  const x=idx%w,z=Math.floor(idx/w)%d,y=Math.floor(idx/(w*d));
  return [x,y,z,material,Math.floor(y/5)];
 });
 fail(final.length<=230000,'VOXEL_LIMIT');
 const validStairNodes=nodes.map(([x,y,z])=>{
  let support=true,clear=true;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   support&&=source.has(k(x+dx,y-1,z+dz));
   for(let i=0;i<3;i++)clear&&=!source.has(k(x+dx,y+i,z+dz));
  }
  return {x,y,z,supported:support,headClear:clear};
 });
 fail(validStairNodes.every(q=>q.supported&&q.headClear),'STAIR_HEADROOM_OR_FLOOR');
 const authorNodesHash=hash(JSON.stringify(nodes));
 return {
  schema:'minecraftaibuilder-r190cb-authored-stair-voxels-v1',
  authorship:'CHAT_AUTHOR_SOURCE_NOT_MODEL_INFERENCE',
  originalRawSha256:hash(bytes),sourceSha256:a.sourceSha256,
  sourceGeometrySha256:a.geometrySha256,geometrySha256:hash(JSON.stringify(final)),
  materialNames:a.materialNames,bounds:a.bounds,primitives:final,
  metrics:{baseVoxels:a.primitives.length,finalVoxels:final.length,
   supportCells:supports.size,headClearanceCells:air.size,
   authoredNodeCount:nodes.length,authoredNodeSHA256:authorNodesHash,
   firstNode:nodes[0],lastNode:nodes.at(-1),
   validStairNodes:validStairNodes.length,protectedVoidResults,programMetrics,
   routeGraph:'AUTHOR_EXPLICIT_STAIR_EDGES_NOT_INDEPENDENT_GAMEPLAY_PATH',
   stairEdges: nodes.length-1},
  designOnly:true,readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,modelCalls:0,
  networkRequests:0,constructionApproved:false,executionAllowed:false,
  functionGate:'HOLD_AUTHOR_ROUTE_PROXY_ONLY',structuralGate:'NOT_TESTED',
  artGate:'ART_HOLD_AWAITING_VISUAL_REVIEW',officialArtAdoptions:0
 };
}

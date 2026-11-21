/**
 * Independent R125 V4D opt-in: AUTHOR selects an architectural room graph,
 * sky-open civic nodes, real doors, roof sections, windows and room fixtures.
 * HOST compiles exact B143 cells and source-only circulation witnesses.
 * No model calls, Minecraft commands, templates by building genre, or writes.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
export const SCHEMA='minecraftaibuilder-r125-v4d-authored-spatial-graph-v1';
const fail=s=>{throw Error('R125_V4D_GRAPH_'+s);};
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const exact=(o,ks)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===ks.slice().sort().join('|');
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,34}$/.test(s);
const prose=s=>typeof s==='string'&&s.length>=3&&s.length<=150&&!/[\u0000-\u001f<>]/.test(s);
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const maxX=n=>n.x+n.width-1,maxZ=n=>n.z+n.depth-1;
const K=(x,y,z)=>x+','+y+','+z;
const opposite=s=>({east:'west',west:'east',north:'south',south:'north'})[s];
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
function roofProfile(n){
 if(n.kind==='sky')return null;
 const p=n.roof,len=p.axis==='x'?n.width:n.depth,mid=Math.round((len-1)*p.peakPercent/100);
 return Array.from({length:len},(_,i)=>Math.round(
  p.type==='shed'?p.eaveY+(p.peakY-p.eaveY)*i/(len-1):
  i<=mid?p.eaveY+(p.peakY-p.eaveY)*i/mid:
  p.eaveY+(p.peakY-p.eaveY)*(len-1-i)/(len-1-mid)));
}
function contact(a,b,side){
 const eastWest=side==='east'||side==='west';
 const touches=side==='east'?maxX(a)===b.x:side==='west'?a.x===maxX(b):
  side==='south'?maxZ(a)===b.z:a.z===maxZ(b);
 const lower=eastWest?Math.max(a.z,b.z):Math.max(a.x,b.x);
 const higher=eastWest?Math.min(maxZ(a),maxZ(b)):Math.min(maxX(a),maxX(b));
 return {touches,lower,higher,span:higher-lower+1};
}
function overlap(a,b){
 return {x:Math.min(maxX(a),maxX(b))-Math.max(a.x,b.x)+1,
  z:Math.min(maxZ(a),maxZ(b))-Math.max(a.z,b.z)+1};
}
export function validateAuthoredGraph(plan){
 if(!exact(plan,['schema','id','title','brief','materials',
  'nodes','links','entry','windows','fixtures'])||
  plan.schema!==SCHEMA||!slug(plan.id)||!prose(plan.title)||!prose(plan.brief)||
  !exact(plan.materials,['floor','wall','roof','public'])||
  !['stone','wood','concrete'].includes(plan.materials.floor)||
  !['stone','wood','concrete','metal'].includes(plan.materials.wall)||
  !['stone','wood','concrete','metal'].includes(plan.materials.roof)||
  !['stone','concrete','accent'].includes(plan.materials.public))
  fail('PLAN_CONTRACT');
 const nodes=plan.nodes;
 if(!Array.isArray(nodes)||nodes.length<3||nodes.length>5||
  !Array.isArray(plan.links)||plan.links.length<nodes.length-1||plan.links.length>7||
  !Array.isArray(plan.windows)||plan.windows.length>8||
  !Array.isArray(plan.fixtures)||plan.fixtures.length>7)fail('COUNTS');
 const byId=new Map();let sky=0,covered=0;
 for(const n of nodes){
  if(!exact(n,['id','purpose','kind','x','z','width','depth','roof'])||
   !slug(n.id)||byId.has(n.id)||!prose(n.purpose)||
   !['covered','sky'].includes(n.kind)||
   !int(n.x,6,100)||!int(n.z,15,100)||
   !int(n.width,18,30)||!int(n.depth,18,30)||
   maxX(n)>119||maxZ(n)>119)fail('NODE');
  byId.set(n.id,n);
  if(n.kind==='sky'){
   if(n.roof!==null)fail('OPEN_NODE_HAS_ROOF');
   sky++;
  }else{
   covered++;const r=n.roof;
   if(!exact(r,['axis','type','eaveY','peakY','peakPercent'])||
    !['x','z'].includes(r.axis)||!['shed','ridge'].includes(r.type)||
    !int(r.eaveY,10,15)||!int(r.peakY,r.eaveY+3,23)||
    !int(r.peakPercent,35,65)||
    roofProfile(n).some((y,i,a)=>i&&Math.abs(y-a[i-1])>1))
    fail('ROOF');
  }
 }
 if(nodes[0].kind!=='covered'||!sky||covered<2)
  fail('COVERED_AND_PUBLIC_SPACES');
 const byEdge=new Set(),linkedSides=new Set(),adj=new Map(nodes.map(n=>[n.id,new Set()]));
 const portals=[];
 for(const l of plan.links){
  if(!exact(l,['from','to','side','offset'])||
   l.from===l.to||!byId.has(l.from)||!byId.has(l.to)||
   !['east','west','north','south'].includes(l.side))fail('LINK_CONTRACT');
  const id=[l.from,l.to].sort().join('--');
  if(byEdge.has(id))fail('DUPLICATE_LINK');byEdge.add(id);
  const a=byId.get(l.from),b=byId.get(l.to),c=contact(a,b,l.side);
  if(!c.touches||c.span<7||!int(l.offset,2,c.span-4))
   fail('LINK_GEOMETRY');
  linkedSides.add(l.from+'-'+l.side);
  linkedSides.add(l.to+'-'+opposite(l.side));
  adj.get(l.from).add(l.to);adj.get(l.to).add(l.from);
  const wall=l.side==='east'?maxX(a):l.side==='west'?a.x:
   l.side==='south'?maxZ(a):a.z;
  portals.push({...l,wall,along:c.lower+l.offset});
 }
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  const a=nodes[i],b=nodes[j],v=overlap(a,b);
  if(v.x>1&&v.z>1)fail('SOLID_FOOTPRINT_OVERLAP');
  if(((v.x===1&&v.z>=6)||(v.z===1&&v.x>=6))&&
   !byEdge.has([a.id,b.id].sort().join('--')))
   fail('UNDECLARED_SHARED_BOUNDARY');
 }
 const seen=new Set([nodes[0].id]),queue=[nodes[0].id];
 for(let i=0;i<queue.length;i++)for(const x of adj.get(queue[i]))
  if(!seen.has(x)){seen.add(x);queue.push(x);}
 if(seen.size!==nodes.length)fail('GRAPH_DISCONNECTED');
 const entry=plan.entry,root=nodes[0];
 if(!exact(entry,['nodeId','offset','plazaWidth','plazaDepth','canopyDepth'])||
  entry.nodeId!==root.id||!int(entry.offset,3,root.width-5)||
  !int(entry.plazaWidth,12,18)||!int(entry.plazaDepth,8,13)||
  !int(entry.canopyDepth,3,6)||root.z-entry.plazaDepth<2||
  linkedSides.has(root.id+'-north'))fail('ENTRY');
 const entryX=root.x+entry.offset;
 const plaza={x:entryX-Math.floor(entry.plazaWidth/2)+1,
  z:root.z-entry.plazaDepth,width:entry.plazaWidth,depth:entry.plazaDepth};
 if(plaza.x<1||maxX(plaza)>=124)fail('PLAZA_BOUNDS');
 for(const n of nodes){
  const a=overlap(plaza,n);
  if(a.x>0&&a.z>0)fail('PUBLIC_PLAZA_COLLISION');
 }
 const windowIDs=new Set();
 for(const w of plan.windows){
  if(!exact(w,['id','nodeId','side','offset','span','sillY','height'])||
   !slug(w.id)||windowIDs.has(w.id)||!byId.has(w.nodeId)||
   !['east','west','north','south'].includes(w.side)||
   byId.get(w.nodeId).kind!=='covered'||
   linkedSides.has(w.nodeId+'-'+w.side)||
   !int(w.sillY,4,6)||!int(w.height,2,4)||
   w.sillY+w.height>=byId.get(w.nodeId).roof.eaveY)
   fail('WINDOW');
  const n=byId.get(w.nodeId),len=['east','west'].includes(w.side)?n.depth:n.width;
  if(!int(w.span,5,10)||!int(w.offset,2,len-w.span-2))
   fail('WINDOW_SIZE');
  if(n.id===root.id&&w.side==='north'&&
   w.offset<=entry.offset+1&&w.offset+w.span-1>=entry.offset)
   fail('WINDOW_BLOCKS_ENTRANCE');
  windowIDs.add(w.id);
 }
 const fIds=new Set();
 for(const f of plan.fixtures){
  if(!exact(f,['id','nodeId','purpose','offsetX','offsetZ',
    'width','depth','height','material'])||
   !slug(f.id)||fIds.has(f.id)||!byId.has(f.nodeId)||
   !prose(f.purpose)||!int(f.width,2,5)||!int(f.depth,2,5)||
   !int(f.height,1,3)||
   !['stone','wood','concrete','metal','accent'].includes(f.material))
   fail('FEATURE');
  const n=byId.get(f.nodeId);
  if(!int(f.offsetX,3,n.width-f.width-3)||
   !int(f.offsetZ,3,n.depth-f.depth-3))fail('FEATURE_BOUNDS');
  fIds.add(f.id);
 }
 if(plan.fixtures.filter(f=>byId.get(f.nodeId).kind==='covered').length<2)
  fail('INSUFFICIENT_FUNCTIONAL_AUTHORSHIP');
 return {byId,adj,portals,plaza,entryX};
}
function addRoof(el,n,i,mat){
 const heights=roofProfile(n),axis=n.roof.axis;let a=0;
 for(let k=1;k<=heights.length;k++){
  if(k<heights.length&&heights[k]===heights[a])continue;
  const w=k-a,pos=axis==='x'?n.x+a:n.z+a;
  el.push(box('n'+i+'-roof-'+a,'add',
   axis==='x'?[pos,heights[a]-1,n.z]:[n.x,heights[a]-1,pos],
   axis==='x'?[w,2,n.depth]:[n.width,2,w],mat));
  a=k;
 }
}
export function compileAuthoredGraph(value){
 const plan=structuredClone(value),v=validateAuthoredGraph(plan),el=[],mat=plan.materials;
 for(const [i,n] of plan.nodes.entries()){
  el.push(box('n'+i+'-floor','add',[n.x,1,n.z],[n.width,1,n.depth],
   n.kind==='sky'?mat.public:mat.floor));
  if(n.kind==='sky')continue;
  const h=n.roof.eaveY-2;
  el.push(
   box('n'+i+'-west','add',[n.x,2,n.z],[1,h,n.depth],mat.wall),
   box('n'+i+'-east','add',[maxX(n),2,n.z],[1,h,n.depth],mat.wall),
   box('n'+i+'-north','add',[n.x+1,2,n.z],[n.width-2,h,1],mat.wall),
   box('n'+i+'-south','add',[n.x+1,2,maxZ(n)],[n.width-2,h,1],mat.wall)
  );
  addRoof(el,n,i,mat.roof);
 }
 const root=plan.nodes[0],e=plan.entry;
 el.push(box('outside-public-approach','add',
  [v.plaza.x,1,v.plaza.z],[v.plaza.width,1,v.plaza.depth],mat.public));
 el.push(box('public-entry-canopy','add',[v.entryX-3,9,root.z-e.canopyDepth],
  [8,1,e.canopyDepth+2],mat.roof));
 for(const [i,w] of plan.windows.entries()){
  const n=v.byId.get(w.nodeId);
  const location=['east','west'].includes(w.side)?
   [w.side==='west'?n.x:maxX(n),w.sillY,n.z+w.offset]:
   [n.x+w.offset,w.sillY,w.side==='north'?n.z:maxZ(n)];
  const size=['east','west'].includes(w.side)?[1,w.height,w.span]:[w.span,w.height,1];
  el.push(box('window-cut-'+i,'cut',location,size),
   box('window-glass-'+i,'add',location,size,'glass'));
 }
 const features=[];
 for(const [i,f] of plan.fixtures.entries()){
  const n=v.byId.get(f.nodeId),origin=[n.x+f.offsetX,2,n.z+f.offsetZ],
   size=[f.width,f.height,f.depth];
  el.push(box('room-function-'+i,'add',origin,size,f.material));
  features.push({id:f.id,zoneId:n.id,origin,size});
 }
 const portals=[];
 for(const [i,l] of v.portals.entries()){
  const eastWest=l.side==='east'||l.side==='west';
  const origin=eastWest?[l.wall,2,l.along]:[l.along,2,l.wall],
   size=eastWest?[1,5,2]:[2,5,1];
  el.push(box('link-portal-'+i,'cut',origin,size));
  portals.push({from:l.from,to:l.to,origin,size});
 }
 el.push(box('exterior-entrance','cut',[v.entryX,2,root.z],[2,5,1]));
 if(el.length>160)fail('B143_ELEMENT_BUDGET_'+el.length);
 const h=Math.max(11,...plan.nodes.filter(n=>n.roof).map(n=>n.roof.peakY))+5;
 const design={schema:B143,id:plan.id,title:plan.title,brief:plan.brief,
  bounds:{width:Math.max(...plan.nodes.map(maxX),maxX(v.plaza))+4,height:h,
   depth:Math.max(...plan.nodes.map(maxZ))+4},
  elements:el,designOnly:true};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_DRIFT');
 const filled=new Map(compiled.primitives.map(a=>[K(a[0],a[1],a[2]),a[3]]));
 const has=(x,y,z)=>filled.has(K(x,y,z));
 let roofs=0,publicSky=0,portalsChecked=0;
 for(const n of plan.nodes){
  if(n.kind==='covered'){
   const heights=roofProfile(n),axis=n.roof.axis;
   for(let i=0;i<heights.length;i++)
    for(let j=0;j<(axis==='x'?n.depth:n.width);j++){
     const x=axis==='x'?n.x+i:n.x+j,z=axis==='x'?n.z+j:n.z+i;
     if(!has(x,heights[i],z)||!has(x,heights[i]-1,z))
      fail('REAL_ROOF_CONTINUITY_'+n.id);
     roofs++;
    }
  }else{
   for(let x=n.x+2;x<maxX(n)-1;x++)for(let z=n.z+2;z<maxZ(n)-1;z++){
    if(!has(x,1,z))fail('REAL_PUBLIC_FLOOR_'+n.id);
    let clear=true;
    for(let y=2;y<h;y++)if(has(x,y,z)){clear=false;break;}
    if(clear)publicSky++;
   }
  }
 }
 if(publicSky<100)fail('SKY_VOID_NOT_USABLE');
 for(const p of portals){
  const [x,y,z]=p.origin,[sx,sy,sz]=p.size;
  for(let xx=x;xx<x+sx;xx++)for(let zz=z;zz<z+sz;zz++){
   if(!has(xx,1,zz))fail('PHYSICAL_LINK_SUPPORT');
   for(let yy=y;yy<y+sy;yy++)if(has(xx,yy,zz))
    fail('PHYSICAL_LINK_OBSTRUCTED');
   portalsChecked++;
  }
 }
 for(let x=v.entryX;x<v.entryX+2;x++)
  for(let z=v.plaza.z;z<=root.z+1;z++)
   if(!has(x,1,z)||has(x,2,z)||has(x,3,z))
    fail('EXTERIOR_ENTRANCE_INACCESSIBLE');
 const glass=compiled.primitives.filter(c=>c[3]===MATERIALS.indexOf('glass')).length;
 if(plan.windows.length&&glass<plan.windows.length*10)
  fail('PHYSICAL_WINDOWS_NOT_PRESENT');
 const program=[{level:0,standingFloorY:2,zones:plan.nodes.map(n=>({
  id:n.id,purpose:n.purpose,range:{x:[n.x+1,maxX(n)-1],z:[n.z+1,maxZ(n)-1]}
 }))}];
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 },{featureTargets:features});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==plan.nodes.length||
  routes.zones.some(x=>!x.reachedFromEntrance)||
  routes.featureAccess.length!==features.length||
  routes.featureAccess.some(f=>!f.reachableFromEntrance))
  fail('FUNCTIONAL_TWO_WIDE_ACCESS_HOLD');
 const degrees=Object.values(Object.fromEntries([...v.adj].map(([k,ns])=>[k,ns.size])))
  .sort((a,b)=>a-b);
 return {
  schema:'r125-v4d-author-graph-source-result-v1',authorIR:plan,
  originalPlanSha256:sha(plan),design,compiled,program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  sourceRoutes:routes,
  sourceProof:{
   authoredNodeCount:plan.nodes.length,
   coveredRooms:plan.nodes.filter(n=>n.kind==='covered').length,
   skyPublicRooms:plan.nodes.filter(n=>n.kind==='sky').length,
   authoredEdges:plan.links.map(l=>[l.from,l.to,l.side]),
   degreeSignature:degrees.join('-'),
   cycleRank:plan.links.length-plan.nodes.length+1,
   physicalPortalCount:portals.length,verifiedPortalFloorCells:portalsChecked,
   roofTwoLayerCellsVerified:roofs,
   supportedOpenSkyPadCandidates:publicSky,
   genuineGlassVoxels:glass,authoredFeatureCount:features.length,
   accessibleServiceFeatures:routes.featureAccess.length,
   b143ElementCount:el.length,
   structuralLoads:'NOT_TESTED',weatherProofing:'NOT_TESTED',
   externalTerrain:'NOT_TESTED',actualMinecraftWalking:'NOT_TESTED'
  },
  provenance:'THREE_SEPARATE_SYNTHETIC_AUTHOR_INPUTS_NOT_REAL_LLM',
  realModelAuthorship:'NOT_ATTESTED',architecturalArt:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0
 };
}

/**
 * R125 V4B (opt-in): author-owned site massing, courtyard and public arrival.
 * No genre templates, model request, arbitrary code, MakeCode or world writes.
 * This is separate from frozen V1/V2/V3/V4A and is SOURCE/ART-HOLD only.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,verifyCompiled,MATERIALS}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

export const SITE_SCHEMA='minecraftaibuilder-r125-authored-site-v4b';
const fail=s=>{throw Error('R125_V4B_'+s)};
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,ks)=>obj(v)&&Object.keys(v).sort().join('|')===ks.slice().sort().join('|');
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const slug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(v);
const prose=v=>typeof v==='string'&&v.length>=3&&v.length<=500&&!/[<>]/.test(v);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const maxX=m=>m.x+m.width-1;
const maxZ=m=>m.z+m.depth-1;
const common=(a,b,axis)=>axis==='x'?
 [Math.max(a.x,b.x),Math.min(maxX(a),maxX(b))]:
 [Math.max(a.z,b.z),Math.min(maxZ(a),maxZ(b))];
const width=a=>a[1]-a[0]+1;
const overlap=(a,b)=>a[0]<=b[1]&&b[0]<=a[1];
const intersects=(a,b)=>a.origin.every((n,i)=>n<b.origin[i]+b.size[i]&&b.origin[i]<n+a.size[i]);
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
const key=(x,y,z)=>x+','+y+','+z;

export function validateAuthoredSiteV4B(plan){
 if(!exact(plan,['schema','id','title','brief','materials','masses','links','approach','court','glazing'])||
  plan.schema!==SITE_SCHEMA||!slug(plan.id)||!prose(plan.title)||!prose(plan.brief)||
  !exact(plan.materials,['floor','wall','roof'])||
  !['wood','stone','concrete'].includes(plan.materials.floor)||
  !['concrete','stone','wood','metal'].includes(plan.materials.wall)||
  !['metal','stone','wood','concrete'].includes(plan.materials.roof))fail('PLAN_CONTRACT');
 if(!Array.isArray(plan.masses)||plan.masses.length<2||plan.masses.length>4||
  !Array.isArray(plan.links)||plan.links.length!==plan.masses.length-1||
  !Array.isArray(plan.glazing)||plan.glazing.length<1||plan.glazing.length>8)
  fail('COLLECTION_LIMITS');
 const byId=new Map();
 for(const [i,m] of plan.masses.entries()){
  if(!exact(m,['id','purpose','x','z','width','depth','roofY'])||
   !slug(m.id)||byId.has(m.id)||!prose(m.purpose)||
   !int(m.x,2,95)||!int(m.z,2,95)||!int(m.width,8,22)||
   !int(m.depth,8,22)||!int(m.roofY,7,14)||
   maxX(m)>122||maxZ(m)>122)fail('MASS_CONTRACT');
  for(const other of byId.values()){
   const a=common(m,other,'x'),b=common(m,other,'z');
   if(width(a)>1&&width(b)>1)fail('MASS_OVERLAP_'+m.id);
  }
  byId.set(m.id,{...m,index:i});
 }
 const connections=[];
 for(const [i,l] of plan.links.entries()){
  if(!exact(l,['from','to','side','doorOffset'])||
   l.to!==plan.masses[i+1].id||!byId.has(l.from)||
   byId.get(l.from).index>=i+1||
   !['east','west','north','south'].includes(l.side))fail('LINK_AUTHORSHIP');
  const parent=byId.get(l.from),child=byId.get(l.to),
   axis=['east','west'].includes(l.side)?'z':'x',
   segment=common(parent,child,axis);
  const wall=axis==='z'?(l.side==='east'?maxX(parent):parent.x):
   (l.side==='south'?maxZ(parent):parent.z);
  const touching= l.side==='east'?maxX(parent)===child.x:
   l.side==='west'?parent.x===maxX(child):
   l.side==='south'?maxZ(parent)===child.z:parent.z===maxZ(child);
  if(!touching||width(segment)<4||!int(l.doorOffset,1,width(segment)-3))
   fail('LINK_NO_VALID_TWO_WIDE_JOINT_'+l.to);
  connections.push({axis,wall,along:segment[0]+l.doorOffset,from:l.from,to:l.to});
 }
 // A one-cell shared wall is legal ONLY if this exact joint is model-authored.
 for(let i=0;i<plan.masses.length;i++)for(let j=i+1;j<plan.masses.length;j++){
  const a=plan.masses[i],b=plan.masses[j],cx=common(a,b,'x'),cz=common(a,b,'z');
  if(width(cx)>0&&width(cz)>0&&!connections.some(l=>
   (l.from===a.id&&l.to===b.id)||(l.from===b.id&&l.to===a.id)))
   fail('UNDECLARED_SHARED_WALL');
 }
 const root=plan.masses[0],a=plan.approach,c=plan.court;
 if(!exact(a,['massId','offset','width','depth'])||a.massId!==root.id||
  !int(a.offset,2,root.width-6)||!int(a.width,4,8)||
  a.offset+a.width>root.width-2||!int(a.depth,2,3))
  fail('PUBLIC_APPROACH_CONTRACT');
 if(!exact(c,['massId','offsetX','offsetZ','width','depth','doorSide'])||
  c.massId!==root.id||!int(c.offsetX,3,root.width-7)||
  !int(c.width,4,8)||c.offsetX+c.width>root.width-3||
  !int(c.offsetZ,a.depth+2,root.depth-5)||
  !int(c.depth,3,6)||c.offsetZ+c.depth>root.depth-2||
  !['north','south'].includes(c.doorSide))
  fail('COURT_CONTRACT');
 // Approach is excavated from the street edge, court is an entirely separate
 // sky opening. Neither may cut another authored mass or an explicit joint.
 const footprints=[
  {name:'APPROACH',x:root.x+a.offset,z:root.z,width:a.width,depth:a.depth+1},
  {name:'COURT',x:root.x+c.offsetX,z:root.z+c.offsetZ,width:c.width,depth:c.depth}
 ];
 for(const f of footprints){
  for(const m of plan.masses.slice(1))
   if(overlap([f.x,f.x+f.width-1],[m.x,maxX(m)])&&
     overlap([f.z,f.z+f.depth-1],[m.z,maxZ(m)]))
    fail(f.name+'_INTERSECTS_OTHER_MASS');
 }
 const entryX=root.x+a.offset+1, entryZ=root.z+a.depth;
 const doorCuts=[box('exterior-entrance','cut',[entryX,2,entryZ],[2,3,1]),
  ...connections.map((l,i)=>box('joint-'+i,'cut',
   l.axis==='z'?[l.wall,2,l.along]:[l.along,2,l.wall],
   l.axis==='z'?[1,3,2]:[2,3,1]))];
 for(const d of doorCuts.slice(1))if(intersects(d,doorCuts[0]))fail('ENTRY_JOINT_CONFLICT');
 const glazed=[];
 for(const [i,g] of plan.glazing.entries()){
  if(!exact(g,['massId','side','offset','width'])||!byId.has(g.massId)||
   !['north','south','east','west'].includes(g.side)||
   !int(g.width,2,4))fail('GLAZING_CONTRACT');
  const m=byId.get(g.massId),alongX=['north','south'].includes(g.side),len=alongX?m.width:m.depth;
  if(!int(g.offset,2,len-g.width-2))fail('GLAZING_OFFSET');
  const x=alongX?m.x+g.offset:g.side==='west'?m.x:maxX(m),
   z=alongX?(g.side==='north'?m.z:maxZ(m)):m.z+g.offset;
  const cut=box('glass-cut-'+i,'cut',[x,3,z],alongX?[g.width,2,1]:[1,2,g.width]);
  if(plan.masses.some(other=>other.id!==m.id&&
   overlap([x,x+cut.size[0]-1],[other.x,maxX(other)])&&
   overlap([z,z+cut.size[2]-1],[other.z,maxZ(other)])))
   fail('NOT_EXTERIOR_GLASS_'+i);
  if(doorCuts.some(d=>intersects(d,cut)))fail('GLASS_OVER_DOOR_'+i);
  const approachCut=box('check','cut',
   [root.x+a.offset,1,root.z],[a.width,root.roofY,a.depth+1]);
  const courtCut=box('check','cut',
   [root.x+c.offsetX,2,root.z+c.offsetZ],[c.width,root.roofY-1,c.depth]);
  if(intersects(approachCut,cut)||intersects(courtCut,cut))
   fail('GLASS_OVER_PUBLIC_VOID_'+i);
  if(glazed.some(w=>intersects(w,cut)))fail('GLASS_OVERLAP_'+i);
  glazed.push(cut);
 }
 return {root,connections,doorCuts,glazed};
}

export function compileAuthoredSiteV4B(originalPlan){
 const plan=structuredClone(originalPlan);
 const v=validateAuthoredSiteV4B(plan),root=v.root,a=plan.approach,c=plan.court;
 const mat=plan.materials,elements=[];
 for(const [i,m] of plan.masses.entries()){
  const id='mass-'+i;
  elements.push(
   box(id+'-floor','add',[m.x,1,m.z],[m.width,1,m.depth],mat.floor),
   box(id+'-west','add',[m.x,2,m.z],[1,m.roofY-2,m.depth],mat.wall),
   box(id+'-east','add',[maxX(m),2,m.z],[1,m.roofY-2,m.depth],mat.wall),
   box(id+'-north','add',[m.x+1,2,m.z],[m.width-2,m.roofY-2,1],mat.wall),
   box(id+'-south','add',[m.x+1,2,maxZ(m)],[m.width-2,m.roofY-2,1],mat.wall),
   box(id+'-roof','add',[m.x,m.roofY,m.z],[m.width,1,m.depth],mat.roof)
  );
 }
 const ax=root.x+a.offset,az=root.z,cx=root.x+c.offsetX,cz=root.z+c.offsetZ;
 elements.push(
  // True roof opening and removed street-side wall, not a painted entrance.
  box('v4b-arrival-excavate','cut',[ax,1,az],[a.width,root.roofY,a.depth]),
  box('v4b-arrival-paving','add',[ax,1,az],[a.width,1,a.depth],mat.floor),
  box('v4b-arrival-left','add',[ax,2,az],[1,root.roofY-2,a.depth+1],mat.wall),
  box('v4b-arrival-right','add',[ax+a.width-1,2,az],
   [1,root.roofY-2,a.depth+1],mat.wall),
  box('v4b-arrival-back','add',[ax,2,az+a.depth],
   [a.width,root.roofY-2,1],mat.wall),
  box('v4b-court-sky','cut',[cx,root.roofY,cz],[c.width,1,c.depth]),
  box('v4b-court-west','add',[cx,2,cz],[1,root.roofY-2,c.depth],mat.wall),
  box('v4b-court-east','add',[cx+c.width-1,2,cz],
   [1,root.roofY-2,c.depth],mat.wall),
  box('v4b-court-north','add',[cx+1,2,cz],
   [c.width-2,root.roofY-2,1],mat.wall),
  box('v4b-court-south','add',[cx+1,2,cz+c.depth-1],
   [c.width-2,root.roofY-2,1],mat.wall),
  box('v4b-court-access','cut',
   [cx+1,2,c.doorSide==='north'?cz:cz+c.depth-1],[2,3,1])
 );
 elements.push(...v.doorCuts);
 for(const g of v.glazed)elements.push(g);
 for(const [i,g] of v.glazed.entries())elements.push(
  box('glass-fill-'+i,'add',g.origin,g.size,'glass'));
 if(elements.length>160)fail('ELEMENT_BUDGET');
 const bounds={width:Math.max(...plan.masses.map(maxX))+3,
  height:Math.max(...plan.masses.map(m=>m.roofY))+3,
  depth:Math.max(...plan.masses.map(maxZ))+3};
 const design={schema:B143,id:plan.id,title:plan.title,brief:plan.brief,
  bounds,elements,designOnly:true};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('VERIFIED_B143_DRIFT');
 const cells=new Map(compiled.primitives.map(p=>[key(p[0],p[1],p[2]),p[3]]));
 const has=(x,y,z)=>cells.has(key(x,y,z));
 for(let dx=1;dx<a.width-1;dx++)for(let dz=0;dz<a.depth;dz++){
  const x=ax+dx,z=az+dz;
  if(!has(x,1,z))fail('ARRIVAL_UNSUPPORTED');
  for(let y=2;y<=root.roofY;y++)if(has(x,y,z))fail('ARRIVAL_SKY_BLOCKED');
 }
 for(let dx=1;dx<c.width-1;dx++)for(let dz=1;dz<c.depth-1;dz++){
  const x=cx+dx,z=cz+dz;
  if(!has(x,1,z))fail('COURT_UNSUPPORTED');
  for(let y=2;y<=root.roofY;y++)if(has(x,y,z))fail('COURT_SKY_BLOCKED');
 }
 // Verify the sky court really has full-height boundary walls, apart from
 // the exact author-selected two-wide public gateway.
 for(let dz=0;dz<c.depth;dz++)for(const x of [cx,cx+c.width-1])
  for(let y=2;y<root.roofY;y++)
   if(!has(x,y,cz+dz))fail('COURT_RETURN_WALL_MISSING');
 for(const z of [cz,cz+c.depth-1])for(let dx=1;dx<c.width-1;dx++)
  for(let y=2;y<root.roofY;y++){
   const gate=z===(c.doorSide==='north'?cz:cz+c.depth-1)&&
    dx<=2&&y<=4;
   if(!gate&&!has(cx+dx,y,z))fail('COURT_PERIMETER_NOT_SEALED');
  }
 for(const d of [
  ...v.doorCuts,
  elements.find(e=>e.id==='v4b-court-access')]){
  const [x,y,z]=d.origin,[sx,sy,sz]=d.size;
  for(let dx=0;dx<sx;dx++)for(let dz=0;dz<sz;dz++){
   if(!has(x+dx,1,z+dz))fail('DOORWAY_UNSUPPORTED_'+d.id);
   for(let dy=0;dy<sy;dy++)
    if(has(x+dx,y+dy,z+dz))fail('DOORWAY_VOXEL_BLOCKED_'+d.id);
  }
 }
 const glassIndex=MATERIALS.indexOf('glass');
 for(const g of v.glazed){
  const [x,y,z]=g.origin,[sx,sy,sz]=g.size;
  for(let dx=0;dx<sx;dx++)for(let dy=0;dy<sy;dy++)for(let dz=0;dz<sz;dz++)
   if(cells.get(key(x+dx,y+dy,z+dz))!==glassIndex)
    fail('GLASS_SOURCE_MISSING_'+g.id);
 }
 const program=[{level:0,standingFloorY:2,zones:[
  ...plan.masses.map(m=>({id:m.id,purpose:m.purpose,
   range:{x:[m.x+1,maxX(m)-1],z:[m.z+1,maxZ(m)-1]}})),
  {id:'v4b-outdoor-court',purpose:'Author-selected open-air public courtyard',
   range:{x:[cx+1,cx+c.width-2],z:[cz+1,cz+c.depth-2]}}
 ]}];
 const transport={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256};
 const routes=auditR125SourceRoutes(transport);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==plan.masses.length+1||
  routes.zones.some(z=>!z.reachedFromEntrance))
  fail('SOURCE_TWO_WIDE_CIRCULATION_HOLD');
 return {schema:'r125-v4b-authored-site-source-only-v1',
  originalPlan:plan,originalPlanSha256:hash(plan),
  design,compiled,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,sourceRoutes:routes,
  sourceProof:{authorOwnedMassing:true,authorOwnedCourtyard:true,
   massCount:plan.masses.length,skyCourtCells:(c.width-2)*(c.depth-2),
   supportedArrivalCells:(a.width-2)*a.depth,
   verifiedNewExteriorGlazing:v.glazed.length,
   preservedArrivalAndCourt:routes.zones.every(z=>z.reachedFromEntrance),
   externalTerrainVerified:false,realMinecraftWalkable:'NOT_TESTED'},
  authorship:'CALLER_SUPPLIED_AUTHOR_DATA_NOT_REAL_QWEN_VERIFIED',
  architecturalArt:'NOT_REVIEWED',minecraftExecution:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED')};
}

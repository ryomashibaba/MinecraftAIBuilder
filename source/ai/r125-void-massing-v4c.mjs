/**
 * R125 V4C: independent author-owned building massing with a usable
 * open-sky courtyard AND a separate public forecourt.
 * No genre-based geometry, model calls, world coordinates or Minecraft writes.
 * This is NOT a revision of the frozen V1-V4B raw/model/geometry evidence.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

export const V4C_SCHEMA='minecraftaibuilder-r125-author-void-massing-v4c';
const fail=s=>{throw Error('R125_V4C_'+s)};
const exact=(o,ks)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===ks.slice().sort().join('|');
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const slug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(v);
const prose=v=>typeof v==='string'&&v.length>=3&&v.length<=500&&!/[<>]/.test(v);
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const endX=r=>r.x+r.width-1, endZ=r=>r.z+r.depth-1;
const common=(a,b,axis)=>axis==='x'?
 [Math.max(a.x,b.x),Math.min(endX(a),endX(b))]:
 [Math.max(a.z,b.z),Math.min(endZ(a),endZ(b))];
const span=s=>s[1]-s[0]+1;
const intersect=(a,b)=>span(common(a,b,'x'))>0&&span(common(a,b,'z'))>0;
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
const K=(x,y,z)=>x+','+y+','+z;

export function validateVoidMassingV4C(p){
 if(!exact(p,['schema','id','title','brief','materials','masses','links','entry','court','plaza'])||
  p.schema!==V4C_SCHEMA||!slug(p.id)||!prose(p.title)||!prose(p.brief)||
  !exact(p.materials,['floor','wall','roof','plaza'])||
  !['stone','wood','concrete'].includes(p.materials.floor)||
  !['stone','wood','concrete','metal'].includes(p.materials.wall)||
  !['stone','wood','concrete','metal'].includes(p.materials.roof)||
  !['stone','concrete','accent'].includes(p.materials.plaza))fail('PLAN_CONTRACT');
 if(!Array.isArray(p.masses)||p.masses.length<2||p.masses.length>5||
  !Array.isArray(p.links)||p.links.length!==p.masses.length-1)
  fail('MASS_COUNT');
 const byId=new Map();
 for(const [i,m] of p.masses.entries()){
  if(!exact(m,['id','purpose','x','z','width','depth','roofY'])||
   !slug(m.id)||byId.has(m.id)||!prose(m.purpose)||
   !int(m.x,2,96)||!int(m.z,2,96)||!int(m.width,i===0?28:8,36)||
   !int(m.depth,i===0?26:8,36)||!int(m.roofY,7,16)||
   endX(m)>122||endZ(m)>122)fail('MASS_CONTRACT');
  for(const prev of byId.values())
   if(span(common(m,prev,'x'))>1&&span(common(m,prev,'z'))>1)
    fail('MASS_FLOOR_OVERLAP');
  byId.set(m.id,{...m,index:i});
 }
 const joins=[];
 for(const [i,l] of p.links.entries()){
  if(!exact(l,['from','to','side','offset'])||
   l.to!==p.masses[i+1].id||!byId.has(l.from)||
   byId.get(l.from).index>i||
   !['east','west','north','south'].includes(l.side))
   fail('LINK_CONTRACT');
  const a=byId.get(l.from),b=byId.get(l.to),
   axis=['east','west'].includes(l.side)?'z':'x',
   segment=common(a,b,axis),
   touching=l.side==='east'?endX(a)===b.x:
    l.side==='west'?a.x===endX(b):
    l.side==='south'?endZ(a)===b.z:a.z===endZ(b);
  if(!touching||span(segment)<5||!int(l.offset,1,span(segment)-3))
   fail('JOINT_GEOMETRY');
  joins.push({axis,wall:axis==='z'?
   (l.side==='east'?endX(a):a.x):
   (l.side==='south'?endZ(a):a.z),
   along:segment[0]+l.offset,from:l.from,to:l.to});
 }
 // Shared one-voxel wall must be an explicitly authored link, never
 // an accidental hidden adjacency that the host silently opens.
 for(let i=0;i<p.masses.length;i++)for(let j=i+1;j<p.masses.length;j++){
  const a=p.masses[i],b=p.masses[j];
  if(intersect(a,b)&&!joins.some(l=>l.from===a.id&&l.to===b.id))
   fail('UNDECLARED_MASS_CONTACT');
 }
 const root=p.masses[0],e=p.entry,c=p.court,q=p.plaza;
 if(!exact(e,['massId','side','offset'])||e.massId!==root.id||
  e.side!=='north'||!int(e.offset,2,root.width-4))
  fail('ENTRY_CONTRACT');
 const entryX=root.x+e.offset;
 if(!exact(c,['ownerId','purpose','offsetX','offsetZ','width','depth','gateSide','gateOffset'])||
  c.ownerId!==root.id||!prose(c.purpose)||
  !int(c.width,9,18)||!int(c.depth,9,18)||
  !int(c.offsetX,3,root.width-c.width-3)||
  !int(c.offsetZ,4,root.depth-c.depth-3)||
  !['north','south'].includes(c.gateSide)||
  !int(c.gateOffset,2,c.width-4))
  fail('COURT_CONTRACT');
 if((c.width-2)*(c.depth-2)<49)fail('COURT_TOO_SMALL');
 const court={x:root.x+c.offsetX,z:root.z+c.offsetZ,
  width:c.width,depth:c.depth};
 for(const m of p.masses.slice(1))if(intersect(court,m))
  fail('COURT_COLLIDES_WITH_MASS');
 if(!exact(q,['x','depth','width','purpose'])||!prose(q.purpose)||
  !int(q.x,0,110)||!int(q.width,10,22)||!int(q.depth,6,16)||
  root.z-q.depth<1||q.x>entryX-1||q.x+q.width-1<entryX+2)
  fail('PLAZA_CONTRACT');
 const plaza={x:q.x,z:root.z-q.depth,width:q.width,depth:q.depth};
 for(const m of p.masses)if(intersect(plaza,m))
  fail('PLAZA_COLLIDES_WITH_MASS');
 const jointCuts=joins.map((l,i)=>box('joint-'+i,'cut',
  l.axis==='z'?[l.wall,2,l.along]:[l.along,2,l.wall],
  l.axis==='z'?[1,3,2]:[2,3,1]));
 const exterior=box('exterior-entrance','cut',[entryX,2,root.z],[2,3,1]);
 const gate=box('v4c-court-gate','cut',
  [court.x+c.gateOffset,2,c.gateSide==='north'?court.z:endZ(court)],
  [2,3,1]);
 const intersects3D=(a,b)=>a.origin.every((v,i)=>
  v<=b.origin[i]+b.size[i]-1&&b.origin[i]<=v+a.size[i]-1);
 if(jointCuts.some(j=>intersects3D(j,exterior)||intersects3D(j,gate))||
  intersects3D(gate,exterior))fail('OPENING_CONFLICT');
 return {root,court,plaza,entryX,joins,jointCuts,exterior,gate};
}

export function compileVoidMassingV4C(value){
 const plan=structuredClone(value),v=validateVoidMassingV4C(plan);
 const {root,court,plaza,entryX}=v, mat=plan.materials,el=[];
 for(const [i,m] of plan.masses.entries()){
  const id='mass-'+i;
  el.push(
   box(id+'-floor','add',[m.x,1,m.z],[m.width,1,m.depth],mat.floor),
   box(id+'-west','add',[m.x,2,m.z],[1,m.roofY-2,m.depth],mat.wall),
   box(id+'-east','add',[endX(m),2,m.z],[1,m.roofY-2,m.depth],mat.wall),
   box(id+'-north','add',[m.x+1,2,m.z],[m.width-2,m.roofY-2,1],mat.wall),
   box(id+'-south','add',[m.x+1,2,endZ(m)],[m.width-2,m.roofY-2,1],mat.wall),
   box(id+'-roof','add',[m.x,m.roofY,m.z],[m.width,1,m.depth],mat.roof)
  );
 }
 const c=plan.court;
 // Model-authored genuinely large sky-open courtyard: remove the roof,
 // build inner perimeter walls, and cut exactly one author-selected gate.
 el.push(
  box('v4c-court-open-roof','cut',[court.x,root.roofY,court.z],
   [court.width,1,court.depth]),
  box('v4c-court-west','add',[court.x,2,court.z],
   [1,root.roofY-2,court.depth],mat.wall),
  box('v4c-court-east','add',[endX(court),2,court.z],
   [1,root.roofY-2,court.depth],mat.wall),
  box('v4c-court-north','add',[court.x+1,2,court.z],
   [court.width-2,root.roofY-2,1],mat.wall),
  box('v4c-court-south','add',[court.x+1,2,endZ(court)],
   [court.width-2,root.roofY-2,1],mat.wall),
  // Real outdoor supported public paving instead of a tiny roof puncture.
  box('v4c-forecourt','add',[plaza.x,1,plaza.z],
   [plaza.width,1,plaza.depth],mat.plaza),
  v.gate,v.exterior,...v.jointCuts
 );
 if(el.length>160)fail('B143_ELEMENT_BUDGET');
 const width=Math.max(...plan.masses.map(endX),plaza.x+plaza.width-1)+3,
  depth=Math.max(...plan.masses.map(endZ))+3,
  height=Math.max(...plan.masses.map(m=>m.roofY))+3;
 const design={schema:B143,id:plan.id,title:plan.title,brief:plan.brief,
  bounds:{width,height,depth},elements:el,designOnly:true};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_DRIFT');
 const filled=new Set(compiled.primitives.map(p=>K(p[0],p[1],p[2])));
 const has=(x,y,z)=>filled.has(K(x,y,z));
 let verifiedCourt=0,verifiedPlaza=0;
 for(let x=court.x+1;x<endX(court);x++)
  for(let z=court.z+1;z<endZ(court);z++){
   if(!has(x,1,z))fail('COURT_UNSUPPORTED');
   for(let y=2;y<=root.roofY;y++)
    if(has(x,y,z))fail('COURT_NOT_OPEN_TO_SKY');
   verifiedCourt++;
  }
 for(let x=plaza.x;x<=endX(plaza);x++)
  for(let z=plaza.z;z<=endZ(plaza);z++){
   if(!has(x,1,z)||has(x,2,z)||has(x,3,z))
    fail('PUBLIC_FORECOURT_NOT_WALKABLE');
   verifiedPlaza++;
  }
 for(let z=court.z;z<=endZ(court);z++)
  for(const x of [court.x,endX(court)])
   for(let y=2;y<root.roofY;y++)if(!has(x,y,z))
    fail('COURT_SIDE_WALL_GAP');
 for(let x=court.x+1;x<endX(court);x++)
  for(const z of [court.z,endZ(court)])
   for(let y=2;y<root.roofY;y++){
    const opening=z===(c.gateSide==='north'?court.z:endZ(court))&&
     x>=v.gate.origin[0]&&x<v.gate.origin[0]+2&&y<=4;
    if(!opening&&!has(x,y,z))fail('COURT_PERIMETER_WALL_GAP');
   }
 for(const door of [v.exterior,v.gate,...v.jointCuts]){
  const [dx,dy,dz]=door.origin,[sx,sy,sz]=door.size;
  for(let x=dx;x<dx+sx;x++)for(let z=dz;z<dz+sz;z++){
   if(!has(x,1,z))fail('DOOR_WITHOUT_FLOOR_'+door.id);
   for(let y=dy;y<dy+sy;y++)if(has(x,y,z))
    fail('DOOR_VOXEL_BLOCKED_'+door.id);
  }
 }
 // Verify the supported outside-to-inside public threshold; this does
 // NOT claim the actual Minecraft exterior terrain is safe.
 for(let x=entryX;x<entryX+2;x++)
  for(let z=plaza.z;z<=root.z+1;z++){
   if(!has(x,1,z)||has(x,2,z)||has(x,3,z))
    fail('PUBLIC_ENTRY_APPROACH_BLOCKED');
  }
 const program=[{level:0,standingFloorY:2,zones:[
  ...plan.masses.map(m=>({id:m.id,purpose:m.purpose,
   range:{x:[m.x+1,endX(m)-1],z:[m.z+1,endZ(m)-1]}})),
  {id:'outdoor-court',purpose:c.purpose,
   range:{x:[court.x+1,endX(court)-1],z:[court.z+1,endZ(court)-1]}}
 ]}];
 const evidence={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256};
 const routes=auditR125SourceRoutes(evidence);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==plan.masses.length+1||
  routes.zones.some(z=>!z.reachedFromEntrance))
  fail('REAL_TWO_WIDE_SOURCE_ROUTE_HOLD');
 return {schema:'r125-v4c-authored-void-massing-source-study-v1',
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  originalPlanSha256:sha(plan),design,compiled,program,sourceRoutes:routes,
  authorIR:plan,authorIsRealModel:'NOT_ATTESTED',
  sourceProof:{massCount:plan.masses.length,
   fullHeightCourtyardInteriorCells:verifiedCourt,
   supportedPublicForecourtCells:verifiedPlaza,
   authoredAdjacency:plan.links.map(l=>[l.from,l.to,l.side]),
   genuinelyDistinctAuthoredTopology:'NOT_CERTIFIED_BY_HASH',
   exteriorTerrain:'NOT_TESTED',sourceTwoWideRoutes:true},
  architecturalArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0};
}
